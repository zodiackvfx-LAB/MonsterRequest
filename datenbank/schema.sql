-- =========================================================================
-- MonsterQuest - Datenbank fuer die Spielstaende
-- =========================================================================
-- Diesen Text einmal komplett in den SQL-Editor von Supabase einfuegen und
-- ausfuehren. Schritt fuer Schritt erklaert: datenbank/ANLEITUNG.md
--
-- GRUNDGEDANKE
-- Das Spiel hat keine Anmeldung. Jeder Browser wuerfelt sich beim ersten
-- Start eine lange Zufallszahl aus (eine UUID) und merkt sie sich. Diese
-- Nummer IST der Schluessel zum eigenen Spielstand: Wer sie kennt, darf ihn
-- lesen und ueberschreiben. Sie ist 122 Bit lang - die raet niemand.
--
-- Deshalb darf der oeffentliche Schluessel der Seite (der anon key, der im
-- Spielcode steht und fuer jeden sichtbar ist) NICHT einfach die Tabelle
-- lesen duerfen. Sonst koennte jeder alle Spielstaende herunterladen.
-- Loesung: Die Tabellen sind komplett gesperrt (RLS ohne Regeln). Nach
-- aussen gibt es nur vier Funktionen, und jede verlangt die Nummer.
-- =========================================================================


-- -------------------------------------------------------------------------
-- 1. Die Tabellen
-- -------------------------------------------------------------------------

create table if not exists public.spielstaende (
  id            uuid        primary key,
  daten         jsonb       not null,
  erstellt_am   timestamptz not null default now(),
  gespeichert_am timestamptz not null default now(),
  speicherungen integer     not null default 1
);

-- Fuer die Bestenliste und die Uebersicht: nach Aenderung sortieren.
create index if not exists spielstaende_gespeichert_idx
  on public.spielstaende (gespeichert_am desc);

-- Kurze Codes, um einen Spielstand auf ein anderes Geraet zu holen.
-- Sie leben nur 30 Minuten - ein 8-Zeichen-Code waere sonst zu kurz.
create table if not exists public.uebertragungscodes (
  code          text        primary key,
  spielstand_id uuid        not null references public.spielstaende (id) on delete cascade,
  gueltig_bis   timestamptz not null
);

create index if not exists uebertragungscodes_gueltig_idx
  on public.uebertragungscodes (gueltig_bis);


-- -------------------------------------------------------------------------
-- 2. Zugriff dichtmachen
-- -------------------------------------------------------------------------
-- RLS an, aber KEINE Regeln: Damit kommt von aussen niemand direkt an die
-- Tabellen. Der Weg fuehrt nur ueber die Funktionen weiter unten.

alter table public.spielstaende      enable row level security;
alter table public.uebertragungscodes enable row level security;

revoke all on table public.spielstaende      from anon, authenticated;
revoke all on table public.uebertragungscodes from anon, authenticated;


-- -------------------------------------------------------------------------
-- 3. Kleine Helfer
-- -------------------------------------------------------------------------

-- Holt eine Zahl aus dem Spielstand, ohne bei Unsinn abzustuerzen.
-- Gebraucht fuer die Uebersicht - ein kaputter Wert darf sie nicht kippen.
create or replace function public.mq_zahl(p_daten jsonb, variadic p_pfad text[])
returns numeric
language plpgsql
immutable
as $$
declare
  v_text text;
begin
  v_text := p_daten #>> p_pfad;
  if v_text is null or v_text !~ '^-?[0-9]+(\.[0-9]+)?$' then
    return null;
  end if;
  return v_text::numeric;
end;
$$;


-- -------------------------------------------------------------------------
-- 4. Die vier Funktionen, die das Spiel aufruft
-- -------------------------------------------------------------------------
-- SECURITY DEFINER heisst: Die Funktion laeuft mit den Rechten ihres
-- Besitzers und darf deshalb an die gesperrten Tabellen. Das search_path
-- wird festgenagelt, damit niemand die Funktion auf fremde Tabellen
-- umbiegen kann.

-- --- speichern -----------------------------------------------------------
create or replace function public.mq_speichern(p_id uuid, p_daten jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_zeit timestamptz;
begin
  if p_id is null then
    raise exception 'Keine Spielernummer angegeben';
  end if;

  -- Nur ein Objekt, und nicht groesser als 64 KB. Ohne diese Bremse koennte
  -- jemand die Datenbank mit Muell vollschreiben.
  if jsonb_typeof(p_daten) is distinct from 'object' then
    raise exception 'Spielstand muss ein Objekt sein';
  end if;
  if pg_column_size(p_daten) > 65536 then
    raise exception 'Spielstand ist zu gross';
  end if;

  insert into public.spielstaende as s (id, daten)
       values (p_id, p_daten)
  on conflict (id) do update
     set daten          = excluded.daten,
         gespeichert_am = now(),
         speicherungen  = s.speicherungen + 1
  returning gespeichert_am into v_zeit;

  return v_zeit;
end;
$$;

-- --- laden ---------------------------------------------------------------
create or replace function public.mq_laden(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select daten from public.spielstaende where id = p_id;
$$;

-- --- Code erstellen ------------------------------------------------------
create or replace function public.mq_code_erstellen(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- Ohne I, O, 0 und 1 - die verwechselt man beim Abtippen.
  v_zeichen constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code text;
  v_versuch integer := 0;
begin
  if not exists (select 1 from public.spielstaende where id = p_id) then
    raise exception 'Zu dieser Spielernummer gibt es keinen Spielstand';
  end if;

  -- Abgelaufene Codes mitnehmen, damit die Tabelle klein bleibt.
  delete from public.uebertragungscodes where gueltig_bis < now();

  -- Ein Spieler hat immer nur einen offenen Code.
  delete from public.uebertragungscodes where spielstand_id = p_id;

  loop
    v_versuch := v_versuch + 1;
    if v_versuch > 20 then
      raise exception 'Kein freier Code gefunden';
    end if;

    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_zeichen, 1 + floor(random() * length(v_zeichen))::int, 1);
    end loop;

    begin
      insert into public.uebertragungscodes (code, spielstand_id, gueltig_bis)
           values (v_code, p_id, now() + interval '30 minutes');
      return v_code;
    exception when unique_violation then
      -- Code war schon vergeben: noch einmal wuerfeln.
    end;
  end loop;
end;
$$;

-- --- Code einloesen ------------------------------------------------------
create or replace function public.mq_code_einloesen(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_daten jsonb;
begin
  select c.spielstand_id into v_id
    from public.uebertragungscodes c
   where c.code = upper(trim(p_code))
     and c.gueltig_bis >= now();

  if v_id is null then
    return null;
  end if;

  -- Ein Code gilt genau einmal.
  delete from public.uebertragungscodes where code = upper(trim(p_code));

  select s.daten into v_daten from public.spielstaende s where s.id = v_id;

  return jsonb_build_object('id', v_id, 'daten', v_daten);
end;
$$;


-- -------------------------------------------------------------------------
-- 5. Wer darf die Funktionen aufrufen
-- -------------------------------------------------------------------------

revoke all on function public.mq_speichern(uuid, jsonb)      from public;
revoke all on function public.mq_laden(uuid)                 from public;
revoke all on function public.mq_code_erstellen(uuid)        from public;
revoke all on function public.mq_code_einloesen(text)        from public;

grant execute on function public.mq_speichern(uuid, jsonb)   to anon, authenticated;
grant execute on function public.mq_laden(uuid)              to anon, authenticated;
grant execute on function public.mq_code_erstellen(uuid)     to anon, authenticated;
grant execute on function public.mq_code_einloesen(text)     to anon, authenticated;


-- -------------------------------------------------------------------------
-- 6. Uebersicht fuer dich
-- -------------------------------------------------------------------------
-- Diese Ansicht ist nur fuer den Table Editor in Supabase gedacht. Sie liest
-- die wichtigsten Werte aus dem Spielstand heraus, damit du nicht jedes Mal
-- JSON lesen musst. Von aussen ist sie nicht erreichbar.

create or replace view public.spielstaende_uebersicht as
  select
    s.id,
    -- Der vom Spieler gewaehlte Name. Steht er nicht im Spielstand, bleibt
    -- die Spalte leer und du siehst weiterhin die id.
    nullif(s.daten ->> 'name', '') as name,
    public.mq_zahl(s.daten, 'characters', 'timo', 'level')::int as level,
    public.mq_zahl(s.daten, 'coins')::int                       as muenzen,
    public.mq_zahl(s.daten, 'unlockedWorld')::int               as welt,
    -- Der Umweg ueber jsonb_typeof ist noetig: jsonb_array_length stuerzt ab,
    -- wenn dort aus irgendeinem Grund kein Feld steht.
    case when jsonb_typeof(s.daten -> 'clearedLevels') = 'array'
         then jsonb_array_length(s.daten -> 'clearedLevels')
         else 0
    end as geschaffte_kaempfe,
    s.speicherungen,
    s.erstellt_am,
    s.gespeichert_am
  from public.spielstaende s
  order by s.gespeichert_am desc;

revoke all on public.spielstaende_uebersicht from anon, authenticated;
