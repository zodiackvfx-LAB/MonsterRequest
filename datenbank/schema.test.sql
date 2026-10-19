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
  v_c constant uuid := '00000000-0000-4000-8000-0000000000c3';
  v_d constant uuid := '00000000-0000-4000-8000-0000000000d4';
  v_liste jsonb;
  v_code text;
  v_wert text;
  v_ok boolean;
  -- Freunde
  v_f1 constant uuid := '00000000-0000-4000-8000-0000000000f1';
  v_f2 constant uuid := '00000000-0000-4000-8000-0000000000f2';
  v_f3 constant uuid := '00000000-0000-4000-8000-0000000000f3';
  v_k1 text;
  v_k2 text;
  v_k3 text;
  v_r jsonb;
  v_t text;
  v_e uuid;
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
    '{"revision":7,"name":"Timo123","coins":3450,"unlockedWorld":3,
      "clearedLevels":["1-1","1-2","2-1"],"characters":{"timo":{"level":6}}}'::jsonb);
  select (name = 'Timo123' and level = 6 and muenzen = 3450 and welt = 3 and geschaffte_kaempfe = 3)
    into v_ok from public.spielstaende_uebersicht where id = v_b;
  if v_ok then v_gut := v_gut + 1; raise notice 'ok   Die Uebersicht liest Name und Werte richtig';
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
  raise notice '--- Rangliste ---';
  -- Die Testspieler bekommen so viele Trophaeen, dass sie auch in einer
  -- Datenbank mit echten Spielern ganz oben stehen.
  perform public.mq_speichern(v_a, '{"name":"Ranglisten-Test-Spieler-A","trophaeen":100000}'::jsonb);
  perform public.mq_speichern(v_b, '{"name":"   ","trophaeen":99999}'::jsonb);
  perform public.mq_speichern(v_c, '{"name":"Versteckt","trophaeen":99999,"settings":{"rangliste":false}}'::jsonb);
  perform public.mq_speichern(v_d, '{"name":"Kaputt","trophaeen":"viele"}'::jsonb);
  set local role anon;

  v_liste := public.mq_rangliste(v_b, 5);
  if v_liste -> 'spitze' -> 0 ->> 'name' = 'Ranglisten-Test-' and (v_liste -> 'spitze' -> 0 ->> 'trophaeen')::int = 100000 then
    v_gut := v_gut + 1; raise notice 'ok   Platz 1 hat die meisten Trophaeen, Name auf 16 Zeichen gekuerzt';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Platz 1 stimmt nicht: %', v_liste -> 'spitze' -> 0;
  end if;

  if (v_liste -> 'ich' ->> 'platz')::int = 2 and (v_liste -> 'spitze' -> 1 ->> 'ich')::boolean
     and v_liste -> 'spitze' -> 1 ->> 'name' = 'Spieler' then
    v_gut := v_gut + 1; raise notice 'ok   Eigener Platz wird erkannt, leerer Name wird "Spieler"';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Eigener Platz falsch: %', v_liste -> 'ich';
  end if;

  if v_liste::text not like '%' || v_a::text || '%' and v_liste::text not like '%' || v_b::text || '%'
     and v_liste::text not like '%Versteckt%' and v_liste::text not like '%Kaputt%' then
    v_gut := v_gut + 1; raise notice 'ok   Keine Spielernummern, Versteckte und Kaputte fehlen';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Rangliste verraet zu viel: %', v_liste;
  end if;

  if public.mq_rangliste(v_c, 5) -> 'ich' = 'null'::jsonb or public.mq_rangliste(v_c, 5) -> 'ich' is null then
    v_gut := v_gut + 1; raise notice 'ok   Wer sich ausblendet, hat keinen Platz';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Ausgeblendeter Spieler hat einen Platz';
  end if;

  if jsonb_array_length(public.mq_rangliste(v_a, 1000) -> 'spitze') <= 100
     and jsonb_array_length(public.mq_rangliste(v_a, 1) -> 'spitze') = 1 then
    v_gut := v_gut + 1; raise notice 'ok   Hoechstens 100 Eintraege, auf Wunsch weniger';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Die Laenge der Rangliste stimmt nicht';
  end if;
  reset role;

  -- ---------------------------------------------------------------- --
  raise notice '--- 2v2: Belohnung genau einmal ---';
  set local role anon;

  if public.mq_duell_belohnung(v_a, 'testlobby01-match0001', '{"ergebnis":"sieg"}'::jsonb) then
    v_gut := v_gut + 1; raise notice 'ok   Erste Meldung eines Matches wird angenommen';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Erste Meldung wurde abgelehnt';
  end if;

  if not public.mq_duell_belohnung(v_a, 'testlobby01-match0001', '{}'::jsonb) then
    v_gut := v_gut + 1; raise notice 'ok   Dasselbe Match gibt es kein zweites Mal';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Dasselbe Match wurde zweimal belohnt';
  end if;

  if public.mq_duell_belohnung(v_b, 'testlobby01-match0001', '{}'::jsonb) then
    v_gut := v_gut + 1; raise notice 'ok   Der Teamkamerad bekommt seine eigene Belohnung';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Der Teamkamerad wurde abgelehnt';
  end if;

  begin
    perform public.mq_duell_belohnung(v_a, 'DROP TABLE x;', '{}'::jsonb);
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Eine unsinnige Match-Kennung wurde angenommen';
  exception when others then
    v_gut := v_gut + 1; raise notice 'ok   Unsinnige Match-Kennungen werden abgelehnt';
  end;

  begin
    execute 'select count(*) from public.duell_belohnungen';
    v_schlecht := v_schlecht + 1; raise notice 'FEHL anon darf die 2v2-Tabelle lesen';
  exception when insufficient_privilege then
    v_gut := v_gut + 1; raise notice 'ok   anon kann die 2v2-Tabelle nicht lesen';
  end;
  reset role;

  delete from public.duell_belohnungen where spieler_id in (v_a, v_b, v_c, v_d);

  -- ---------------------------------------------------------------- --
  raise notice '--- Freunde ---';
  set local role anon;

  perform public.mq_speichern(v_f1, '{"name":"Timo123","aktiveFigur":"timo","characters":{"timo":{"level":7}},"activeSkin":{"timo":"skin-cowboy"}}'::jsonb);
  perform public.mq_speichern(v_f2, '{"name":"Rocco99","aktiveFigur":"rocco","characters":{"rocco":{"level":3}}}'::jsonb);
  perform public.mq_speichern(v_f3, '{"name":"Dritte"}'::jsonb);

  v_r := public.mq_freunde(v_f1, 'online');
  v_k1 := v_r ->> 'kennung';
  v_k2 := public.mq_freunde(v_f2, 'online') ->> 'kennung';
  v_k3 := public.mq_freunde(v_f3, null) ->> 'kennung';
  if v_k1 ~ '^MQ-[0-9]{5}$' and v_k1 <> v_k2 and public.mq_freunde(v_f1) ->> 'kennung' = v_k1 then
    v_gut := v_gut + 1; raise notice 'ok   Jeder bekommt eine feste Freundes-ID (%)', v_k1;
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Freundes-ID fehlt oder aendert sich';
  end if;

  begin
    perform public.mq_freunde('00000000-0000-4000-8000-00000000ffff', 'online');
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Ohne Spielstand gibt es trotzdem Freunde';
  exception when others then
    v_gut := v_gut + 1; raise notice 'ok   Ohne Spielstand keine Freundesliste';
  end;

  v_r := public.mq_freund_suchen(v_f1, lower(v_k2));
  if v_r ->> 'name' = 'Rocco99' and (v_r ->> 'level')::int = 3 and v_r ->> 'figur' = 'rocco'
     and not (v_r ? 'id') and v_r::text not like '%' || v_f2::text || '%' then
    v_gut := v_gut + 1; raise notice 'ok   Suche zeigt Name, Figur, Level - aber keine Spielernummer';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Suche liefert falsche Daten: %', v_r;
  end if;
  if public.mq_freund_suchen(v_f1, 'MQ-00000') is null then
    v_gut := v_gut + 1; raise notice 'ok   Unbekannte Freundes-ID findet niemanden';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Unbekannte Freundes-ID findet jemanden';
  end if;

  if public.mq_anfrage_senden(v_f1, v_k1) = 'selbst' then
    v_gut := v_gut + 1; raise notice 'ok   Keine Anfrage an sich selbst';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Anfrage an sich selbst ging durch';
  end if;

  v_t := public.mq_anfrage_senden(v_f1, v_k2);
  if v_t = 'gesendet' and public.mq_anfrage_senden(v_f1, v_k2) = 'schon_gesendet'
     and public.mq_anfrage_senden(v_f2, v_k1) = 'gegenanfrage' then
    v_gut := v_gut + 1; raise notice 'ok   Keine doppelten Anfragen, auch nicht in Gegenrichtung';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Doppelte Anfrage moeglich (%)', v_t;
  end if;

  if jsonb_array_length(public.mq_freunde(v_f1) -> 'freunde') = 0
     and jsonb_array_length(public.mq_freunde(v_f1) -> 'gesendet') = 1
     and public.mq_freunde(v_f2) -> 'erhalten' -> 0 ->> 'name' = 'Timo123' then
    v_gut := v_gut + 1; raise notice 'ok   Eine Anfrage ist noch keine Freundschaft';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Anfrage hat schon eine Freundschaft erzeugt';
  end if;

  if not public.mq_anfrage_antworten(v_f1, v_k2, true) and not public.mq_anfrage_antworten(v_f3, v_k1, true)
     and jsonb_array_length(public.mq_freunde(v_f1) -> 'freunde') = 0 then
    v_gut := v_gut + 1; raise notice 'ok   Nur der Empfaenger kann eine Anfrage annehmen';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Fremde konnten eine Anfrage annehmen';
  end if;

  if public.mq_anfrage_antworten(v_f2, v_k1, true)
     and public.mq_freunde(v_f1) -> 'freunde' -> 0 ->> 'name' = 'Rocco99'
     and public.mq_freunde(v_f2) -> 'freunde' -> 0 ->> 'skin' = 'skin-cowboy'
     and public.mq_freunde(v_f2) -> 'freunde' -> 0 ->> 'status' = 'online'
     and jsonb_array_length(public.mq_freunde(v_f2) -> 'erhalten') = 0 then
    v_gut := v_gut + 1; raise notice 'ok   Annehmen macht beide zu Freunden (mit Skin und Onlinestatus)';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Annehmen hat nicht geklappt: %', public.mq_freunde(v_f2);
  end if;

  if public.mq_anfrage_senden(v_f2, v_k1) = 'schon_freunde' and not public.mq_anfrage_antworten(v_f2, v_k1, true) then
    v_gut := v_gut + 1; raise notice 'ok   Keine doppelte Freundschaft';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Doppelte Freundschaft moeglich';
  end if;

  perform public.mq_anfrage_senden(v_f3, v_k1);
  if public.mq_anfrage_antworten(v_f1, v_k3, false)
     and jsonb_array_length(public.mq_freunde(v_f1) -> 'erhalten') = 0
     and jsonb_array_length(public.mq_freunde(v_f1) -> 'freunde') = 1
     and public.mq_anfrage_senden(v_f3, v_k1) = 'gesendet'
     and public.mq_anfrage_zurueckziehen(v_f3, v_k1)
     and jsonb_array_length(public.mq_freunde(v_f3) -> 'gesendet') = 0 then
    v_gut := v_gut + 1; raise notice 'ok   Ablehnen und Zurueckziehen loeschen die Anfrage';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Ablehnen oder Zurueckziehen ging nicht';
  end if;

  -- 2v2-Einladungen
  if public.mq_einladung_senden(v_f3, v_k1, 'ABC234') = 'kein_freund' then
    v_gut := v_gut + 1; raise notice 'ok   2v2-Einladungen nur an Freunde';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Einladung an Nicht-Freund ging durch';
  end if;

  begin
    perform public.mq_einladung_senden(v_f1, v_k2, 'x''; drop');
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Unsinniger Lobby-Code angenommen';
  exception when others then
    v_gut := v_gut + 1; raise notice 'ok   Unsinnige Lobby-Codes werden abgelehnt';
  end;

  perform public.mq_einladung_senden(v_f1, v_k2, 'ABC234');
  perform public.mq_einladung_senden(v_f1, v_k2, 'ABC234');
  v_r := public.mq_freunde(v_f2) -> 'einladungen';
  v_e := (v_r -> 0 ->> 'id')::uuid;
  if jsonb_array_length(v_r) = 1 and v_r -> 0 ->> 'code' = 'ABC234' and v_r -> 0 ->> 'name' = 'Timo123'
     and (v_r -> 0 ->> 'sekunden')::int between 250 and 300 then
    v_gut := v_gut + 1; raise notice 'ok   Einladung kommt an (einmal, mit Code und Ablaufzeit)';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Einladung kam falsch an: %', v_r;
  end if;

  if public.mq_einladung_antworten(v_f3, v_e, true) is null
     and public.mq_einladung_antworten(v_f2, v_e, true) = 'ABC234'
     and public.mq_einladung_antworten(v_f2, v_e, true) is null then
    v_gut := v_gut + 1; raise notice 'ok   Nur der Eingeladene nimmt an - und nur einmal';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Einladung mehrfach oder von Fremden angenommen';
  end if;

  v_r := public.mq_freunde(v_f1) -> 'antworten';
  if jsonb_array_length(v_r) = 1 and (v_r -> 0 ->> 'angenommen')::boolean
     and jsonb_array_length(public.mq_freunde(v_f1) -> 'antworten') = 0 then
    v_gut := v_gut + 1; raise notice 'ok   Der Gastgeber erfaehrt die Antwort genau einmal';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Antwort kam nicht oder doppelt: %', v_r;
  end if;

  perform public.mq_einladung_senden(v_f1, v_k2, 'XYZ789');
  v_e := (public.mq_freunde(v_f2) -> 'einladungen' -> 0 ->> 'id')::uuid;
  if public.mq_einladung_antworten(v_f2, v_e, false) = 'abgelehnt'
     and public.mq_freunde(v_f1) -> 'antworten' -> 0 ->> 'angenommen' = 'false' then
    v_gut := v_gut + 1; raise notice 'ok   Ablehnen wird dem Gastgeber gemeldet';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Ablehnen kam nicht an';
  end if;

  perform public.mq_einladung_senden(v_f1, v_k2, 'XYZ789');
  reset role;
  update public.duell_einladungen set gueltig_bis = now() - interval '1 second' where von = v_f1;
  set local role anon;
  if jsonb_array_length(public.mq_freunde(v_f2) -> 'einladungen') = 0 then
    v_gut := v_gut + 1; raise notice 'ok   Abgelaufene Einladungen verschwinden';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Abgelaufene Einladung noch da';
  end if;

  perform public.mq_einladung_senden(v_f1, v_k2, 'XYZ789');
  if not public.mq_freund_entfernen(v_f3, v_k1)
     and public.mq_freund_entfernen(v_f2, v_k1)
     and jsonb_array_length(public.mq_freunde(v_f1) -> 'freunde') = 0
     and jsonb_array_length(public.mq_freunde(v_f2) -> 'einladungen') = 0
     and not public.mq_freund_entfernen(v_f2, v_k1) then
    v_gut := v_gut + 1; raise notice 'ok   Entfernen beendet die Freundschaft fuer beide (und nur die eigene)';
  else
    v_schlecht := v_schlecht + 1; raise notice 'FEHL Entfernen ging nicht';
  end if;

  begin
    perform public.mq_id_von(v_k1);
    v_schlecht := v_schlecht + 1; raise notice 'FEHL anon kann zu einer Freundes-ID die Spielernummer holen';
  exception when insufficient_privilege then
    v_gut := v_gut + 1; raise notice 'ok   anon bekommt zu einer Freundes-ID nie die Spielernummer';
  end;

  begin
    perform public.mq_kennung(v_f1);
    v_schlecht := v_schlecht + 1; raise notice 'FEHL anon darf die Helfer aufrufen';
  exception when insufficient_privilege then
    v_gut := v_gut + 1; raise notice 'ok   anon darf die Helfer nicht aufrufen';
  end;

  begin
    execute 'select count(*) from public.freundschaften';
    v_schlecht := v_schlecht + 1; raise notice 'FEHL anon darf die Freundes-Tabellen lesen';
  exception when insufficient_privilege then
    v_gut := v_gut + 1; raise notice 'ok   anon kann die Freundes-Tabellen nicht lesen';
  end;
  begin
    execute 'insert into public.freundschaften (spieler_a, spieler_b) values (gen_random_uuid(), gen_random_uuid())';
    v_schlecht := v_schlecht + 1; raise notice 'FEHL anon darf Freundschaften eintragen';
  exception when insufficient_privilege then
    v_gut := v_gut + 1; raise notice 'ok   anon kann keine Freundschaften eintragen';
  end;
  reset role;

  delete from public.spielstaende where id in (v_f1, v_f2, v_f3);

  -- ---------------------------------------------------------------- --
  delete from public.spielstaende where id in (v_a, v_b, v_c, v_d);

  raise notice '';
  raise notice '% bestanden, % fehlgeschlagen', v_gut, v_schlecht;
  if v_schlecht > 0 then
    raise exception '% Pruefungen fehlgeschlagen', v_schlecht;
  end if;
end;
$$;
