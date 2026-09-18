-- =========================================================================
-- Prueft datenbank/schema.sql
-- =========================================================================
-- Erst schema.sql einspielen, dann diese Datei. In Supabase geht beides im
-- SQL-Editor; die Ergebnisse stehen danach unten unter "Messages".
--
--     psql -f datenbank/schema.sql
--     psql -f datenbank/schema.test.sql
--
-- Jede Zeile beginnt mit "ok" oder "FEHL". Am Ende steht die Summe.
-- Die Testdaten werden hinterher wieder geloescht.
-- =========================================================================

do $$
declare
  v_gut integer := 0;
  v_schlecht integer := 0;
  v_a constant uuid := '00000000-0000-4000-8000-0000000000a1';
  v_b constant uuid := '00000000-0000-4000-8000-0000000000b2';
  v_code text;
  v_wert text;
  v_ok boolean;
begin
  -- ---------------------------------------------------------------- --
  raise notice '--- Zugriff von aussen ---';

  set local role anon;

  begin
    execute 'select count(*) from public.spielstaende';
    v_schlecht := v_schlecht + 1;
    raise notice 'FEHL anon darf die Tabelle lesen - das darf nicht sein';
  exception when insufficient_privilege then
    v_gut := v_gut + 1;
    raise notice 'ok   anon kann die Tabelle nicht lesen';
  end;

  begin
    execute 'insert into public.spielstaende (id, daten) values (gen_random_uuid(), ''{}''::jsonb)';
    v_schlecht := v_schlecht + 1;
    raise notice 'FEHL anon darf in die Tabelle schreiben - das darf nicht sein';
  exception when insufficient_privilege then
    v_gut := v_gut + 1;
    raise notice 'ok   anon kann nicht in die Tabelle schreiben';
  end;

  begin
    execute 'select count(*) from public.spielstaende_uebersicht';
    v_schlecht := v_schlecht + 1;
    raise notice 'FEHL anon darf die Uebersicht lesen - das darf nicht sein';
  exception when insufficient_privilege then
    v_gut := v_gut + 1;
    raise notice 'ok   anon kann die Uebersicht nicht lesen';
  end;

  -- ---------------------------------------------------------------- --
  raise notice '--- Speichern und Laden ---';

  perform public.mq_speichern(v_a, '{"revision":1,"coins":120,"unlockedWorld":2}'::jsonb);
  v_wert := public.mq_laden(v_a) ->> 'coins';
  if v_wert = '120' then v_gut := v_gut + 1; raise notice 'ok   Spielstand kommt zurueck';
  else v_schlecht := v_schlecht + 1; raise notice 'FEHL Spielstand kommt nicht zurueck (%)', v_wert; end if;

  perform public.mq_speichern(v_a, '{"revision":2,"coins":300}'::jsonb);
  v_wert := public.mq_laden(v_a) ->> 'coins';
  if v_wert = '300' then v_gut := v_gut + 1; raise notice 'ok   Ein neuer Stand ersetzt den alten';
  else v_schlecht := v_schlecht + 1; raise notice 'FEHL Der alte Stand blieb stehen (%)', v_wert; end if;

  if public.mq_laden(v_b) is null then v_gut := v_gut + 1; raise notice 'ok   Fremde Nummer liefert nichts';
  else v_schlecht := v_schlecht + 1; raise notice 'FEHL Fremde Nummer liefert etwas'; end if;

  begin
    perform public.mq_speichern(v_a, '[1,2,3]'::jsonb);
    v_schlecht := v_schlecht + 1;
    raise notice 'FEHL Eine Liste wurde als Spielstand angenommen';
  exception when others then
    v_gut := v_gut + 1;
    raise notice 'ok   Nur Objekte werden angenommen';
  end;

  begin
    perform public.mq_speichern(v_a, jsonb_build_object('muell', repeat('x', 70000)));
    v_schlecht := v_schlecht + 1;
    raise notice 'FEHL Ein zu grosser Spielstand wurde angenommen';
  exception when others then
    v_gut := v_gut + 1;
    raise notice 'ok   Zu grosse Spielstaende werden abgelehnt';
  end;

  -- ---------------------------------------------------------------- --
  raise notice '--- Uebertragungscode ---';

  v_code := public.mq_code_erstellen(v_a);
  if length(v_code) = 8 and v_code !~ '[IO01]' then
    v_gut := v_gut + 1; raise notice 'ok   Code hat 8 gut lesbare Zeichen (%)', v_code;
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Code sieht falsch aus (%)', v_code;
  end if;

  if (public.mq_code_einloesen(v_code) ->> 'id')::uuid = v_a then
    v_gut := v_gut + 1; raise notice 'ok   Code gibt den Spielstand heraus';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Code gibt den falschen Spielstand heraus';
  end if;

  if public.mq_code_einloesen(v_code) is null then
    v_gut := v_gut + 1; raise notice 'ok   Derselbe Code geht kein zweites Mal';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Der Code liess sich zweimal einloesen';
  end if;

  v_code := public.mq_code_erstellen(v_a);
  if public.mq_code_einloesen(lower(v_code)) is not null then
    v_gut := v_gut + 1; raise notice 'ok   Kleinbuchstaben werden erkannt';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Kleingeschriebener Code wurde abgelehnt';
  end if;

  if public.mq_code_einloesen('ZZZZZZZZ') is null then
    v_gut := v_gut + 1; raise notice 'ok   Erfundener Code ergibt nichts';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Erfundener Code hat etwas geliefert'; end if;

  begin
    perform public.mq_code_erstellen(v_b);
    v_schlecht := v_schlecht + 1;
    raise notice 'FEHL Code fuer eine unbekannte Nummer wurde erstellt';
  exception when others then
    v_gut := v_gut + 1;
    raise notice 'ok   Ohne Spielstand gibt es keinen Code';
  end;

  -- Abgelaufene Codes: dafuer braucht es wieder die Rechte des Besitzers.
  v_code := public.mq_code_erstellen(v_a);
  reset role;
  update public.uebertragungscodes set gueltig_bis = now() - interval '1 minute' where code = v_code;
  set local role anon;
  if public.mq_code_einloesen(v_code) is null then
    v_gut := v_gut + 1; raise notice 'ok   Abgelaufene Codes gelten nicht mehr';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Ein abgelaufener Code wurde angenommen';
  end if;

  -- ---------------------------------------------------------------- --
  raise notice '--- Uebersicht ---';
  reset role;

  perform public.mq_speichern(v_b,
    '{"revision":7,"coins":3450,"unlockedWorld":3,"clearedLevels":["1-1","1-2","2-1"],
      "characters":{"timo":{"level":6}}}'::jsonb);
  select (level = 6 and muenzen = 3450 and welt = 3 and geschaffte_kaempfe = 3)
    into v_ok from public.spielstaende_uebersicht where id = v_b;
  if v_ok then v_gut := v_gut + 1; raise notice 'ok   Die Uebersicht liest die Werte richtig';
  else v_schlecht := v_schlecht + 1; raise notice 'FEHL Die Uebersicht zeigt falsche Werte'; end if;

  -- Ein kaputter Spielstand darf die Uebersicht nicht umwerfen.
  perform public.mq_speichern(v_a,
    '{"coins":"viele","clearedLevels":"kaputt","characters":{"timo":{"level":null}}}'::jsonb);
  begin
    perform count(*) from public.spielstaende_uebersicht;
    v_gut := v_gut + 1;
    raise notice 'ok   Kaputte Werte werfen die Uebersicht nicht um';
  exception when others then
    v_schlecht := v_schlecht + 1;
    raise notice 'FEHL Die Uebersicht ist an kaputten Werten gescheitert: %', sqlerrm;
  end;

  -- ---------------------------------------------------------------- --
  delete from public.spielstaende where id in (v_a, v_b);

  raise notice '';
  raise notice '% bestanden, % fehlgeschlagen', v_gut, v_schlecht;
  if v_schlecht > 0 then
    raise exception '% Pruefungen fehlgeschlagen', v_schlecht;
  end if;
end;
$$;
