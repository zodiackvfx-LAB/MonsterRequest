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
-- aussen gibt es nur wenige Funktionen, und jede verlangt die Nummer.
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
-- 4. Die Funktionen, die das Spiel aufruft
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


-- --- Rangliste -----------------------------------------------------------
-- Die besten Spieler nach Trophaeen, dazu der eigene Platz. Heraus kommen
-- nur Name, Trophaeen und Platz - keine Spielernummern. Ob eine Zeile die
-- eigene ist, steht als ja/nein dabei.
--
-- Wer in den Einstellungen "In der Rangliste zeigen" ausschaltet
-- (settings.rangliste = false), taucht nicht auf. Ohne Trophaeen auch nicht.
-- Gleich viele Trophaeen = gleicher Platz; wer sie zuerst hatte, steht oben.
create or replace function public.mq_rangliste(p_id uuid, p_anzahl integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with liste as (
    select s.id,
           -- Name: hoechstens 16 Zeichen, leer wird "Spieler".
           left(coalesce(nullif(btrim(s.daten ->> 'name'), ''), 'Spieler'), 16) as name,
           -- Unsinn (Text, negativ, riesig) darf die Liste nicht kippen.
           least(greatest(coalesce(public.mq_zahl(s.daten, 'trophaeen'), 0), 0), 100000)::int as trophaeen,
           s.gespeichert_am
      from public.spielstaende s
     where coalesce(s.daten #>> '{settings,rangliste}', 'true') <> 'false'
  ),
  rang as (
    select l.*,
           rank()       over (order by l.trophaeen desc)                    as platz,
           row_number() over (order by l.trophaeen desc, l.gespeichert_am)  as nr
      from liste l
     where l.trophaeen > 0
  )
  select jsonb_build_object(
    'spitze', coalesce(
      (select jsonb_agg(
                jsonb_build_object('platz', r.platz, 'name', r.name,
                                   'trophaeen', r.trophaeen, 'ich', r.id = p_id)
                order by r.nr)
         from rang r
        where r.nr <= least(greatest(coalesce(p_anzahl, 50), 1), 100)),
      '[]'::jsonb),
    'ich', (select jsonb_build_object('platz', r.platz, 'trophaeen', r.trophaeen)
              from rang r where r.id = p_id),
    'spieler', (select count(*) from rang)
  );
$$;


-- --- 2v2 Monster-Duell: jede Belohnung genau einmal ---------------------
-- Nach einem 2v2-Kampf meldet jedes Geraet: "Ich hole mir die Belohnung fuer
-- dieses Match." Jedes Paar aus Match und Spieler wird nur EINMAL
-- angenommen - ein zweites Geraet mit demselben Spielstand oder ein
-- erneutes Verbinden bekommt dieselbe Belohnung nicht noch einmal.
-- Antwort: true = zum ersten Mal, false = gab es schon.
--
-- Die Tabelle merkt sich nur Match-Kennung, Spielernummer und ein paar
-- Eckdaten (Ergebnis, Welt, Schwierigkeit). Eintraege, die aelter als 30
-- Tage sind, werden beim naechsten Aufruf geloescht.

create table if not exists public.duell_belohnungen (
  match_id    text        not null,
  spieler_id  uuid        not null,
  daten       jsonb       not null default '{}'::jsonb,
  erstellt_am timestamptz not null default now(),
  primary key (match_id, spieler_id)
);

create index if not exists duell_belohnungen_spieler_idx
  on public.duell_belohnungen (spieler_id, erstellt_am desc);
create index if not exists duell_belohnungen_alter_idx
  on public.duell_belohnungen (erstellt_am);

alter table public.duell_belohnungen enable row level security;
revoke all on table public.duell_belohnungen from anon, authenticated;

create or replace function public.mq_duell_belohnung(p_id uuid, p_match text, p_daten jsonb default '{}'::jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_neu integer;
begin
  if p_id is null then
    raise exception 'Keine Spielernummer angegeben';
  end if;
  -- Match-Kennungen baut das Spiel aus Kleinbuchstaben, Ziffern und "-".
  if p_match is null or p_match !~ '^[a-z0-9-]{8,80}$' then
    raise exception 'Ungueltige Match-Kennung';
  end if;
  if jsonb_typeof(coalesce(p_daten, '{}'::jsonb)) is distinct from 'object'
     or pg_column_size(p_daten) > 2048 then
    raise exception 'Ungueltige Match-Daten';
  end if;

  delete from public.duell_belohnungen where erstellt_am < now() - interval '30 days';

  -- Bremse gegen Massen-Anfragen: hoechstens 200 Belohnungen pro Tag.
  if (select count(*) from public.duell_belohnungen
       where spieler_id = p_id and erstellt_am > now() - interval '1 day') >= 200 then
    return false;
  end if;

  insert into public.duell_belohnungen (match_id, spieler_id, daten)
       values (p_match, p_id, coalesce(p_daten, '{}'::jsonb))
  on conflict (match_id, spieler_id) do nothing;
  get diagnostics v_neu = row_count;
  return v_neu = 1;
end;
$$;


-- --- Freunde -------------------------------------------------------------
-- Jeder Spieler bekommt eine Freundes-ID wie "MQ-58291". Sie ist NUR zum
-- Suchen da und ersetzt die Spielernummer nie: Wer eine Freundes-ID kennt,
-- kann damit weder einen Spielstand laden noch irgendetwas aendern. Alles,
-- was etwas veraendert, verlangt weiterhin die eigene (geheime) Nummer -
-- und aendert nur Eintraege, an denen dieser Spieler selbst beteiligt ist.
--
--   freundes_ids     - Spielernummer -> Freundes-ID (bleibt fuer immer gleich)
--   freundschaften   - ein Paar, kleinere Nummer immer zuerst: so kann es
--                      dieselbe Freundschaft gar nicht zweimal geben
--   freundesanfragen - von -> an; erst "annehmen" macht daraus eine
--                      Freundschaft
--   duell_einladungen- "Komm in meine 2v2-Lobby" mit dem Lobby-Code;
--                      gilt nur wenige Minuten und genau einmal
--   anwesenheit      - wann ein Spieler zuletzt da war (fuer 🟢 / 🟡 / ⚫)

create table if not exists public.freundes_ids (
  spieler_id uuid primary key references public.spielstaende (id) on delete cascade,
  kennung    text not null unique check (kennung ~ '^MQ-[0-9]{5,7}$')
);

create table if not exists public.freundschaften (
  spieler_a   uuid not null references public.spielstaende (id) on delete cascade,
  spieler_b   uuid not null references public.spielstaende (id) on delete cascade,
  erstellt_am timestamptz not null default now(),
  primary key (spieler_a, spieler_b),
  check (spieler_a < spieler_b)
);
create index if not exists freundschaften_b_idx on public.freundschaften (spieler_b);

create table if not exists public.freundesanfragen (
  von         uuid not null references public.spielstaende (id) on delete cascade,
  an          uuid not null references public.spielstaende (id) on delete cascade,
  erstellt_am timestamptz not null default now(),
  primary key (von, an),
  check (von <> an)
);
create index if not exists freundesanfragen_an_idx on public.freundesanfragen (an);

create table if not exists public.duell_einladungen (
  id          uuid        primary key default gen_random_uuid(),
  von         uuid        not null references public.spielstaende (id) on delete cascade,
  an          uuid        not null references public.spielstaende (id) on delete cascade,
  code        text        not null check (code ~ '^[A-Z0-9]{6}$'),
  erstellt_am timestamptz not null default now(),
  gueltig_bis timestamptz not null,
  -- 'offen' | 'angenommen' | 'abgelehnt'
  antwort     text        not null default 'offen' check (antwort in ('offen', 'angenommen', 'abgelehnt')),
  -- Hat der Einladende die Antwort schon gesehen?
  gemeldet    boolean     not null default false,
  check (von <> an)
);
create index if not exists duell_einladungen_an_idx on public.duell_einladungen (an, antwort);
create index if not exists duell_einladungen_von_idx on public.duell_einladungen (von, erstellt_am desc);

create table if not exists public.anwesenheit (
  spieler_id uuid        primary key references public.spielstaende (id) on delete cascade,
  zustand    text        not null default 'online' check (zustand in ('online', 'kampf')),
  zuletzt    timestamptz not null default now()
);

alter table public.freundes_ids      enable row level security;
alter table public.freundschaften    enable row level security;
alter table public.freundesanfragen  enable row level security;
alter table public.duell_einladungen enable row level security;
alter table public.anwesenheit       enable row level security;

revoke all on table public.freundes_ids      from anon, authenticated;
revoke all on table public.freundschaften    from anon, authenticated;
revoke all on table public.freundesanfragen  from anon, authenticated;
revoke all on table public.duell_einladungen from anon, authenticated;
revoke all on table public.anwesenheit       from anon, authenticated;

-- Helfer (von aussen NICHT aufrufbar): Gibt es den Spieler? Sonst Abbruch.
create or replace function public.mq_spieler_pruefen(p_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_id is null or not exists (select 1 from public.spielstaende where id = p_id) then
    raise exception 'kein_spielstand';
  end if;
end;
$$;

-- Helfer: die Freundes-ID eines Spielers - beim ersten Mal ausgewuerfelt.
create or replace function public.mq_kennung(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kennung text;
  v_versuch integer := 0;
begin
  select kennung into v_kennung from public.freundes_ids where spieler_id = p_id;
  if v_kennung is not null then
    return v_kennung;
  end if;
  loop
    v_versuch := v_versuch + 1;
    -- Erst fuenfstellig wie "MQ-58291"; wird es eng, laengere Nummern.
    if v_versuch <= 30 then
      v_kennung := 'MQ-' || (10000 + floor(random() * 90000))::int;
    elsif v_versuch <= 60 then
      v_kennung := 'MQ-' || (1000000 + floor(random() * 9000000))::int;
    else
      raise exception 'Keine freie Freundes-ID gefunden';
    end if;
    begin
      insert into public.freundes_ids (spieler_id, kennung) values (p_id, v_kennung);
      return v_kennung;
    exception when unique_violation then
      -- Zwei gleichzeitige Aufrufe fuer denselben Spieler: der andere war schneller.
      select kennung into v_kennung from public.freundes_ids where spieler_id = p_id;
      if v_kennung is not null then
        return v_kennung;
      end if;
    end;
  end loop;
end;
$$;

-- Helfer: Spielernummer zu einer Freundes-ID (oder null). Nur intern -
-- nach aussen geht nie eine Spielernummer.
create or replace function public.mq_id_von(p_kennung text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select spieler_id from public.freundes_ids
   where kennung = upper(regexp_replace(coalesce(p_kennung, ''), '\s', '', 'g'));
$$;

-- Helfer: was andere ueber einen Spieler sehen duerfen - Freundes-ID, Name,
-- Figur, deren Level und Skin. Nicht mehr.
create or replace function public.mq_profil(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
           'kennung', f.kennung,
           'name', left(coalesce(nullif(btrim(s.daten ->> 'name'), ''), 'Spieler'), 16),
           'figur', left(coalesce(s.daten ->> 'aktiveFigur', 'timo'), 20),
           'level', least(greatest(coalesce(
                      public.mq_zahl(s.daten, 'characters', coalesce(s.daten ->> 'aktiveFigur', 'timo'), 'level'), 1), 1), 999)::int,
           'skin', left(s.daten -> 'activeSkin' ->> coalesce(s.daten ->> 'aktiveFigur', 'timo'), 60))
    from public.spielstaende s
    join public.freundes_ids f on f.spieler_id = s.id
   where s.id = p_id;
$$;

-- Helfer: sind die beiden befreundet?
create or replace function public.mq_befreundet(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.freundschaften
                  where spieler_a = least(p_a, p_b) and spieler_b = greatest(p_a, p_b));
$$;

-- --- Alles auf einmal: Freunde, Anfragen, Einladungen -------------------
-- Das Spiel ruft das regelmaessig auf, solange es offen ist. Dabei wird
-- auch "ich bin da" vermerkt (p_zustand: 'online' oder 'kampf'; null =
-- nichts vermerken). Online gilt, wer sich in den letzten 90 Sekunden
-- gemeldet hat.
create or replace function public.mq_freunde(p_id uuid, p_zustand text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ergebnis jsonb;
  v_antworten jsonb;
begin
  perform public.mq_spieler_pruefen(p_id);
  perform public.mq_kennung(p_id);

  if p_zustand in ('online', 'kampf') then
    insert into public.anwesenheit (spieler_id, zustand, zuletzt)
         values (p_id, p_zustand, now())
    on conflict (spieler_id) do update set zustand = excluded.zustand, zuletzt = now();
  end if;

  -- Alte Einladungen wegraeumen, damit die Tabelle klein bleibt.
  delete from public.duell_einladungen where gueltig_bis < now() - interval '1 day';

  -- Antworten auf eigene Einladungen: genau einmal melden.
  with gemeldet as (
    update public.duell_einladungen e
       set gemeldet = true
     where e.von = p_id and e.antwort <> 'offen' and not e.gemeldet
    returning e.an, e.antwort
  )
  select coalesce(jsonb_agg(public.mq_profil(g.an) || jsonb_build_object('angenommen', g.antwort = 'angenommen')), '[]'::jsonb)
    into v_antworten
    from gemeldet g;

  select jsonb_build_object(
    'kennung', public.mq_kennung(p_id),
    'freunde', coalesce((
      select jsonb_agg(public.mq_profil(x.freund) || jsonb_build_object(
               'status', case
                 when a.zuletzt is null or a.zuletzt < now() - interval '90 seconds' then 'offline'
                 when a.zustand = 'kampf' then 'kampf'
                 else 'online' end))
        from (select case when spieler_a = p_id then spieler_b else spieler_a end as freund
                from public.freundschaften
               where spieler_a = p_id or spieler_b = p_id) x
        left join public.anwesenheit a on a.spieler_id = x.freund
    ), '[]'::jsonb),
    'erhalten', coalesce((
      select jsonb_agg(public.mq_profil(r.von) order by r.erstellt_am desc)
        from public.freundesanfragen r where r.an = p_id
    ), '[]'::jsonb),
    'gesendet', coalesce((
      select jsonb_agg(public.mq_profil(r.an) order by r.erstellt_am desc)
        from public.freundesanfragen r where r.von = p_id
    ), '[]'::jsonb),
    'einladungen', coalesce((
      select jsonb_agg(public.mq_profil(e.von) || jsonb_build_object(
               'id', e.id, 'code', e.code,
               'sekunden', greatest(0, floor(extract(epoch from e.gueltig_bis - now())))::int)
             order by e.erstellt_am desc)
        from public.duell_einladungen e
       where e.an = p_id and e.antwort = 'offen' and e.gueltig_bis > now()
         and public.mq_befreundet(e.von, p_id)
    ), '[]'::jsonb),
    'antworten', v_antworten
  ) into v_ergebnis;

  return v_ergebnis;
end;
$$;

-- --- Freund suchen ---------------------------------------------------------
-- Antwort: das oeffentliche Profil oder null.
create or replace function public.mq_freund_suchen(p_id uuid, p_kennung text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_freund uuid;
begin
  perform public.mq_spieler_pruefen(p_id);
  v_freund := public.mq_id_von(p_kennung);
  if v_freund is null then
    return null;
  end if;
  return public.mq_profil(v_freund) || jsonb_build_object(
    'ich', v_freund = p_id,
    'freund', public.mq_befreundet(p_id, v_freund),
    'gesendet', exists (select 1 from public.freundesanfragen where von = p_id and an = v_freund),
    'erhalten', exists (select 1 from public.freundesanfragen where von = v_freund and an = p_id));
end;
$$;

-- --- Freundschaftsanfrage senden -------------------------------------------
-- Antwort (Text): 'gesendet', 'unbekannt', 'selbst', 'schon_freunde',
-- 'schon_gesendet', 'gegenanfrage' (der andere hat schon gefragt - bitte
-- dessen Anfrage annehmen), 'zu_viele'.
create or replace function public.mq_anfrage_senden(p_id uuid, p_kennung text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_freund uuid;
begin
  perform public.mq_spieler_pruefen(p_id);
  perform public.mq_kennung(p_id);
  v_freund := public.mq_id_von(p_kennung);
  if v_freund is null then return 'unbekannt'; end if;
  if v_freund = p_id then return 'selbst'; end if;
  if public.mq_befreundet(p_id, v_freund) then return 'schon_freunde'; end if;
  if exists (select 1 from public.freundesanfragen where von = v_freund and an = p_id) then
    return 'gegenanfrage';
  end if;
  if exists (select 1 from public.freundesanfragen where von = p_id and an = v_freund) then
    return 'schon_gesendet';
  end if;
  -- Bremsen gegen Massen-Anfragen.
  if (select count(*) from public.freundesanfragen where von = p_id) >= 30
     or (select count(*) from public.freundschaften where spieler_a = p_id or spieler_b = p_id) >= 100 then
    return 'zu_viele';
  end if;

  insert into public.freundesanfragen (von, an) values (p_id, v_freund)
  on conflict do nothing;
  return 'gesendet';
end;
$$;

-- --- Anfrage annehmen oder ablehnen ----------------------------------------
-- Nur Anfragen, die AN diesen Spieler gingen. Antwort: true = erledigt,
-- false = keine solche Anfrage (mehr).
create or replace function public.mq_anfrage_antworten(p_id uuid, p_kennung text, p_annehmen boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_freund uuid;
  v_weg integer;
begin
  perform public.mq_spieler_pruefen(p_id);
  v_freund := public.mq_id_von(p_kennung);
  if v_freund is null then return false; end if;

  delete from public.freundesanfragen where von = v_freund and an = p_id;
  get diagnostics v_weg = row_count;
  if v_weg = 0 then return false; end if;

  if coalesce(p_annehmen, false) then
    insert into public.freundschaften (spieler_a, spieler_b)
         values (least(p_id, v_freund), greatest(p_id, v_freund))
    on conflict do nothing;
    -- Eine eigene Anfrage in die andere Richtung ist damit erledigt.
    delete from public.freundesanfragen where von = p_id and an = v_freund;
  end if;
  return true;
end;
$$;

-- --- Eigene Anfrage zurueckziehen ------------------------------------------
create or replace function public.mq_anfrage_zurueckziehen(p_id uuid, p_kennung text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_weg integer;
begin
  perform public.mq_spieler_pruefen(p_id);
  delete from public.freundesanfragen where von = p_id and an = public.mq_id_von(p_kennung);
  get diagnostics v_weg = row_count;
  return v_weg > 0;
end;
$$;

-- --- Freund entfernen --------------------------------------------------------
-- Loescht nur die Freundschaft, an der dieser Spieler selbst beteiligt ist,
-- und offene 2v2-Einladungen zwischen beiden.
create or replace function public.mq_freund_entfernen(p_id uuid, p_kennung text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_freund uuid;
  v_weg integer;
begin
  perform public.mq_spieler_pruefen(p_id);
  v_freund := public.mq_id_von(p_kennung);
  if v_freund is null then return false; end if;
  delete from public.freundschaften
   where spieler_a = least(p_id, v_freund) and spieler_b = greatest(p_id, v_freund);
  get diagnostics v_weg = row_count;
  delete from public.duell_einladungen
   where antwort = 'offen' and ((von = p_id and an = v_freund) or (von = v_freund and an = p_id));
  return v_weg > 0;
end;
$$;

-- --- 2v2-Einladung senden ----------------------------------------------------
-- Nur an Freunde. Die Einladung traegt den Code der eigenen 2v2-Lobby und
-- gilt 5 Minuten. Eine neue Einladung an denselben Freund ersetzt die alte;
-- Einladungen in eine fruehere Lobby desselben Gastgebers verfallen.
-- Antwort: 'gesendet', 'kein_freund', 'zu_viele'.
create or replace function public.mq_einladung_senden(p_id uuid, p_kennung text, p_code text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_freund uuid;
begin
  perform public.mq_spieler_pruefen(p_id);
  if p_code is null or p_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'Ungueltiger Lobby-Code';
  end if;
  v_freund := public.mq_id_von(p_kennung);
  if v_freund is null or not public.mq_befreundet(p_id, v_freund) then
    return 'kein_freund';
  end if;
  if (select count(*) from public.duell_einladungen
       where von = p_id and erstellt_am > now() - interval '10 minutes') >= 30 then
    return 'zu_viele';
  end if;

  delete from public.duell_einladungen
   where von = p_id and antwort = 'offen' and (an = v_freund or code <> p_code);
  insert into public.duell_einladungen (von, an, code, gueltig_bis)
       values (p_id, v_freund, p_code, now() + interval '5 minutes');
  return 'gesendet';
end;
$$;

-- --- 2v2-Einladung annehmen oder ablehnen -------------------------------------
-- Nur Einladungen AN diesen Spieler, nur offene und nur, solange sie gelten.
-- Jede Einladung laesst sich genau einmal beantworten.
-- Antwort: beim Annehmen der Lobby-Code, beim Ablehnen 'abgelehnt',
-- null = gibt es nicht (mehr) oder abgelaufen.
create or replace function public.mq_einladung_antworten(p_id uuid, p_einladung uuid, p_annehmen boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
begin
  perform public.mq_spieler_pruefen(p_id);
  update public.duell_einladungen
     set antwort = case when coalesce(p_annehmen, false) then 'angenommen' else 'abgelehnt' end
   where id = p_einladung and an = p_id and antwort = 'offen' and gueltig_bis > now()
     and public.mq_befreundet(von, p_id)
  returning code into v_code;
  if v_code is null then return null; end if;
  if not coalesce(p_annehmen, false) then return 'abgelehnt'; end if;
  -- Wer eine Einladung annimmt, braucht die anderen offenen nicht mehr.
  update public.duell_einladungen set antwort = 'abgelehnt'
   where an = p_id and antwort = 'offen' and id <> p_einladung;
  return v_code;
end;
$$;


-- -------------------------------------------------------------------------
-- 5. Wer darf die Funktionen aufrufen
-- -------------------------------------------------------------------------

revoke all on function public.mq_speichern(uuid, jsonb)      from public;
revoke all on function public.mq_laden(uuid)                 from public;
revoke all on function public.mq_code_erstellen(uuid)        from public;
revoke all on function public.mq_code_einloesen(text)        from public;
revoke all on function public.mq_rangliste(uuid, integer)    from public;
revoke all on function public.mq_duell_belohnung(uuid, text, jsonb) from public;

grant execute on function public.mq_speichern(uuid, jsonb)   to anon, authenticated;
grant execute on function public.mq_laden(uuid)              to anon, authenticated;
grant execute on function public.mq_code_erstellen(uuid)     to anon, authenticated;
grant execute on function public.mq_code_einloesen(text)     to anon, authenticated;
grant execute on function public.mq_rangliste(uuid, integer) to anon, authenticated;
grant execute on function public.mq_duell_belohnung(uuid, text, jsonb) to anon, authenticated;

-- Freunde. Die Helfer (mq_kennung, mq_id_von, mq_profil, ...) bleiben
-- gesperrt - auch fuer anon ausdruecklich, denn Supabase gibt neuen
-- Funktionen sonst von selbst das Aufrufrecht. mq_id_von wuerde sonst zu
-- einer Freundes-ID die geheime Spielernummer verraten.
revoke all on function public.mq_spieler_pruefen(uuid) from public, anon, authenticated;
revoke all on function public.mq_kennung(uuid) from public, anon, authenticated;
revoke all on function public.mq_id_von(text) from public, anon, authenticated;
revoke all on function public.mq_profil(uuid) from public, anon, authenticated;
revoke all on function public.mq_befreundet(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mq_freunde(uuid, text) from public;
revoke all on function public.mq_freund_suchen(uuid, text) from public;
revoke all on function public.mq_anfrage_senden(uuid, text) from public;
revoke all on function public.mq_anfrage_antworten(uuid, text, boolean) from public;
revoke all on function public.mq_anfrage_zurueckziehen(uuid, text) from public;
revoke all on function public.mq_freund_entfernen(uuid, text) from public;
revoke all on function public.mq_einladung_senden(uuid, text, text) from public;
revoke all on function public.mq_einladung_antworten(uuid, uuid, boolean) from public;
grant execute on function public.mq_freunde(uuid, text) to anon, authenticated;
grant execute on function public.mq_freund_suchen(uuid, text) to anon, authenticated;
grant execute on function public.mq_anfrage_senden(uuid, text) to anon, authenticated;
grant execute on function public.mq_anfrage_antworten(uuid, text, boolean) to anon, authenticated;
grant execute on function public.mq_anfrage_zurueckziehen(uuid, text) to anon, authenticated;
grant execute on function public.mq_freund_entfernen(uuid, text) to anon, authenticated;
grant execute on function public.mq_einladung_senden(uuid, text, text) to anon, authenticated;
grant execute on function public.mq_einladung_antworten(uuid, uuid, boolean) to anon, authenticated;


-- -------------------------------------------------------------------------
-- 6. Uebersicht fuer dich
-- -------------------------------------------------------------------------
-- Diese Ansicht ist nur fuer den Table Editor in Supabase gedacht. Sie liest
-- die wichtigsten Werte aus dem Spielstand heraus, damit du nicht jedes Mal
-- JSON lesen musst. Von aussen ist sie nicht erreichbar.

-- Erst die alte Ansicht wegwerfen: Ältere Fassungen hatten andere Spalten,
-- und "create or replace view" darf Spalten nicht umbenennen. Eine Ansicht
-- speichert keine Daten - die Spielstände bleiben unberührt.
drop view if exists public.spielstaende_uebersicht;

create view public.spielstaende_uebersicht as
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
    s.gespeichert_am,
    public.mq_zahl(s.daten, 'trophaeen')::int as trophaeen
  from public.spielstaende s
  order by s.gespeichert_am desc;

revoke all on public.spielstaende_uebersicht from anon, authenticated;
