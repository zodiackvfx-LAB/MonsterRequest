# MonsterQuest

Ein 2D-Mobile-Game im Browser: Cartoon-Monster-RPG mit Weltkarte und
taktischem Echtzeit-Kampfsystem. Gebaut mit reinem HTML, CSS und JavaScript –
ohne Framework, ohne Build-Schritt.

**Stand:** 12 Welten mit je 12 Kämpfen (144 Kämpfe), zwei Spielfiguren (Timo und Rocco),
2v2 Monster-Duell (online zu zweit oder solo mit KI-Partner),
Endlos-Arena, Tägliche Herausforderung, Boss-Rush, Zeitangriff, Truhenplätze,
Trophäen mit Rangliste, Shop, Tagesaufgaben, Erfolge und Spielstand-Übertragung.

---

## Spiel starten

Das Spiel nutzt ES-Module. Die funktionieren aus Sicherheitsgründen **nicht**,
wenn du `index.html` einfach doppelklickst – du brauchst einen Webserver.

**Am Computer:**

```bash
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

**Als einzelne Datei (ohne Webserver):** `dist/MonsterQuest.html` enthält
das komplette Spiel – Code, Grafiken und Schrift – in einer Datei. Einfach
doppelklicken oder verschicken. Sie wird aus dem Projekt erzeugt:

```bash
node werkzeuge/eine-datei-bauen.mjs
```

Weiterentwickelt wird wie bisher in `js/`, `css/` und `bilder/`; danach neu
bauen. In der Einzeldatei fehlt nur die Installation als App (Service
Worker). Achtung: Der Browser speichert den Spielstand je Adresse – die
Einzeldatei hat also einen eigenen Spielstand, getrennt von der Web-Version.

**Nur mit iPad/iPhone:** Repository auf GitHub öffentlich stellen und unter
*Settings → Pages* den Branch veröffentlichen. Danach läuft das Spiel über eine
feste Adresse, und über *Teilen → Zum Home-Bildschirm* bekommst du ein
App-Symbol; das Spiel startet dann im Vollbild ohne Safari-Leiste.

---

## Projektstruktur

```
index.html              Einstiegspunkt, Mobile-Meta-Tags, leerer #app-Container
werkstatt.html          Skin-Studio: eigene Outfits für Timo (js/werkstatt.js)

css/
  base.css              Schrift, Farben, Grundlayout   ← Farben zentral ändern
  scenery.css           Kulissen: Himmel, Wolken, Berge, Hügel, Boden
  ui.css                Bausteine: Logo, Buttons, Panels, Balken, Karten
  screens.css           Aufbau der einzelnen Bildschirme
  erlebnis.css          Pause, Ergebnisfenster, Kampf-Intros, Auftritte,
                        Kartenrahmen, Wetter, Tageszeit, Weltkarten-Teilchen
  weltkarte.css         Weltkarte: Stationen, Lichtpfad, Kopfleiste,
                        Kampfkarte und alle Bewegungen auf der Karte
  shop.css              Shop: Nachtmarkt, Schild, Reiter, Goldrahmen,
                        Truhen auf Steinsockeln, Studio und Besitz

fonts/                  Spielschrift Fredoka (lokal, kein externer Aufruf)

datenbank/              Spielstände auf einem Server – siehe ANLEITUNG.md
  schema.sql            Tabellen und Funktionen, einmal in Supabase einfügen
  schema.test.sql       Prüft schema.sql nach dem Einspielen

werkzeuge/              Hilfsskripte, die nicht zum Spiel gehören
  logo-bauen.py         Erzeugt die Logo-Pfade aus der Schrift
  timo-skins-bauen.py   Baut Timos Outfits (Kleidung + Hut) für alle Posen
  test-datenbank.mjs    Spiel mit Datenbank zum Ausprobieren, ohne Konto

js/
  main.js               Startet das Spiel, registriert alle Bildschirme

  data/                 NUR Daten – hier balancierst du das Spiel
    attacks.js          Katalog aller Attacken (Kosten, Schaden, Heilung, Schild)
    monsters.js         Spielermonster und Gegner samt Decks
    levels.js           Level der Weltkarte inkl. Position auf der Karte
    kraefte.js          Boss-Kräfte – je Welt eine, beim Boss-Sieg freigeschaltet
    karten.js           Karten-Level: Kopien je Level, Stärke je Level
    spielmodi.js        Spielmodi im Auswahlfenster (z. B. Endlos-Arena)
    modi.js             Werte der Kampf-Modi (Herausforderung, Boss-Rush,
                        Zeitangriff) und welche Gegner kommen
    shop.js             Truhen, Truhenplätze, Gratis-Truhen mit Uhr
    studio-teile.js     Hüte und Muster fürs Skin-Studio: Seltenheit und Preis
    trophaeen.js        Trophäen je Sieg und die 8 Ligen
    duell.js            2v2: ALLE Werte (Kombo, Rollen, Paare je Welt, Grade, Belohnung)
    weltkarten.js       Aussehen der Weltkarte je Welt (Farben, Bäume,
                        Fluss, See, Ruinen, Effekte)

  core/                 NUR Logik – kennt kein HTML
    screens.js          Bildschirmverwaltung
    state.js            Fortschritt, Sterne, Münzen, Einstellungen, Speichern
    cloud.js            Leitung zur Datenbank (Spielernummer, Senden, Codes)
    sync.js             Bringt Browser und Datenbank beim Start zusammen
    deck.js             8-Karten-Deck, Hand mit 4 Karten, Nachziehen
    sortierung.js       Sortierung der Karten im Deckmenü (nur Anzeige)
    fighter.js          Ein Kämpfer: XP, Deck, Hand, Schaden, Schild
    battle.js           Kampfablauf, Zeitsteuerung, Gegner-KI
    modi.js             Regeln der Kampf-Modi: wer darf, was gibt es
    truhenplaetze.js    Die 4 Truhenplätze: Freischalten, Sofort-Öffnen
    zeittruhen.js       Tägliche Gratis-Truhen (Holz und Gold, je einmal am Tag)
    trophaeen.js        Trophäen gewinnen und verlieren
    duell.js            2v2: Kampfregeln (Ziele, Kombo, Kampfunfähig, Rollen)
    duell-ki.js         2v2: KI der Gegner und der KI-Partnerin
    duell-aufbau.js     2v2: Profile prüfen, Gegner aufstellen, Team-Ausgleich
    duell-sitzung.js    2v2: Lobby und Match (solo, Gastgeber, Gast)
    freunde.js          Freunde: Liste, Anfragen, 2v2-Einladungen, Onlinestatus
    duell-belohnung.js  2v2: Belohnungen genau einmal
    netz.js             Echtzeit-Leitung (Supabase Realtime / Tabs / Tests)
    zufall.js           Wiederholbarer Zufall aus einem Startwert

  ui/                   Bausteine, die mehrere Bildschirme nutzen
    scenery.js          Baut die Hintergrund-Kulisse
    hud.js              Spielerleiste, Kopfzeile, Sterne
    kampfintro.js       Intro vor dem Kampf, Auftritte, Bewegung je Gegnerform
    umgebung.js         Arena-Varianten, Tageszeit, Wetter, kleine Tiere
    truhen.js           Die gezeichneten Truhen (Holz, Silber, Gold, Boss)
    shop-deko.js        Ausstattung des Shops: Nachtmarkt, Schild mit Lorbeer,
                        Eckverzierungen, Steinsockel, Reiter-Bildchen
    truhe-oeffnen.js    Die Öffnungs-Animation (Landen auf dem Zauberkreis,
                        Rütteln, Druckwelle und Lichtsäule, Beute fliegt
                        heraus, Zähler an der Truhe)
    weltkarte/          Die Weltkarte (siehe "Die Weltkarte" unten)
      layout.js         plant Stationen, Weg, Fluss, Brücke, See, Verzierung
      zeichnen.js       zeichnet Himmel, Berge, Wiese, Wasser, Bäume ... (SVG)
      station.js        die steinernen Kampfplattformen
      leben.js          alles, was sich bewegt, und die Parallaxe
      rahmen.js         Kopfleiste und Kampfkarte unten
      karte.js          setzt alle Ebenen zur scrollbaren Karte zusammen
      geometrie.js      Rechenhilfen (Kurven, Abstände, Würfel)

  screens/              NUR Darstellung – baut HTML, reagiert auf Tipps
    lobby.js            Lobby wie bei Clash Royale: Seiten zum Wischen und
                        die Leiste unten (Shop, Figur, Deck, Start, Welten,
                        Sammlung, Optionen)
    start.js            Startbildschirm (die mittlere Seite der Lobby)
    map.js              Weltkarte (verbindet Spielstand und js/ui/weltkarte/)
    battle.js           Kampfbildschirm
    monster.js          Monsterübersicht
    deck.js             Deckübersicht
    collection.js       Sammlung aller Kreaturen
    settings.js         Einstellungen
    duell-lobby.js      2v2-Lobby (Code, Team, Welt, Schwierigkeit, Bereit)
    freunde.js          👥 Freunde: Freundes-ID, Liste, Anfragen, Hinzufügen
    duell.js            2v2-Arena (vier Figuren, Ziele, Hand, Ergebnis)
```

**Die wichtigste Regel dieses Projekts:** Daten (`data/`), Logik (`core/`) und
Darstellung (`screens/`) bleiben getrennt. Die Kampf-Engine weiß nicht, wie ein
Kampf aussieht – der Kampfbildschirm kennt keine Kampfregeln.

---

## Die Welten

| Nr. | Welt | Boss | Boss-Kraft |
|---|---|---|---|
| 1 | 🌿 Grünes Tal | Borkenwächter | Rindenpanzer |
| 2 | 💎 Kristallhöhlen | Kristallgolem | Prismabrecher |
| 3 | 🌋 Vulkanlande | Schlackenfürst | Inferno |
| 4 | ❄️ Eisgebirge | Frostherrscher | Frostbann |
| 5 | 🌙 Schattenreich | Schattenmagier | Seelenraub |
| 6 | 🏜️ Wüstenreich | Dünenkönig | Sandsturm |
| 7 | 🌤️ Himmelsinseln | Sturmfürst | Gewittersturm |
| 8 | 🐠 Korallenriff | Tiefenkraken | Strudelfalle |
| 9 | 🕯️ Spukmoor | Moorhexe | Irrlichtfluch |
| 10 | ⚙️ Uhrwerkstadt | Zahnradkoloss | Stahlpanzer |
| 11 | 🍭 Zuckerland | Karamellkönigin | Zuckerrausch |
| 12 | 🌌 Sternenwelt | Sternenkaiser | Supernova |

**Monster-Designs:** Welt 1–6 nutzen die ersten 8 Grundformen (Klecks,
Vierbeiner, Flügler, Gestalt, Schlange, Golem, Käfer, Geist). **Ab Welt 7**
haben die Gegner 13 neue, ausführlichere Formen, passend zu ihrem Namen:

| Form | Beispiele |
|---|---|
| Qualle | Himmelsqualle, Quallenglimmer, Lichtqualle |
| Fisch | Clownfischchen, Kugelfisch, Hammerhai, Nebelwal |
| Vogel | Flatterfink, Gruselrabe, Uhrwerkeule |
| Krabbe | Donnerkralle, Krabbenkrieger, Kolbenkrabbe |
| Roboter | Schraubenwicht, Turmwächter, Satellitenkäfer |
| Stern | Seesternchen, Lebkuchenriese, Sternschnuppe |
| Bär | Moorwolf, Ambossbär, Gummibärchen, Sternbildbär |
| Hase | Federmaus, Bonbonwicht, Mondhase, Astrofuchs |
| Flamme | Windgeist, Irrlichtchen, Kirschbombe |
| Wurm | Himmelsschlange, Muränenbiss, Kometenwurm |
| Kugelkäfer | Blitzkäfer, Zahnradkäfer, Keksmonster |
| Wolke | Wolkengnubbel, Schlammgolem, Watteschaf |
| Drachling | Federdrache, Seepferdritter, Galaxiendrache |

Jeder Boss ab Welt 7 hat eine eigene Form: Sturmriese (Sturmfürst), Krake
(Tiefenkraken), Hexe (Moorhexe), Koloss (Zahnradkoloss), Königin
(Karamellkönigin) und Kaiser (Sternenkaiser). Die Form steht beim Gegner in
`js/data/worlds.js` (`form`, optional `zusatz`), gezeichnet sind sie in
`js/ui/sprite.js`, ihre Bewegung im Kampf steht in `js/ui/kampfintro.js`.

Jede Welt ist stärker als die davor. Ab Welt 8 braucht man gelevelte Karten,
Aufwertungen und eine gute Boss-Kraft (grob: Welt 12 ab Charakter-Level 25–30
und Karten-Level 8–9). Neue Welt = ein Eintrag in `js/data/worlds.js`, dazu
Boss-Kraft (`js/data/kraefte.js`), Musik (`js/data/musik.js`), Kampfstimmung
(`STIMMUNGEN` in `js/ui/umgebung.js`), Teilchen auf der Karte
(`WELT_TEILCHEN` in `js/ui/effekte.js`) und optional eine eigene Kulisse
(`.region--…` in `css/scenery.css`). Die Weltkarte entsteht automatisch aus
den Farben der Welt; eine eigene, ausgearbeitete Karte bekommt sie über
`js/data/weltkarten.js` (siehe „Die Weltkarte“).

## Die Weltkarte

Die Kämpfe einer Welt liegen auf einer lebendigen, senkrecht scrollbaren
Landschaft: unten Kampf 1, oben der Boss vor einem Bergpanorama. Ein
goldener Lichtpfad verbindet die Stationen; bis zum nächsten offenen Kampf
leuchtet er und Lichtpunkte wandern darauf entlang.

* **Stationen** sind steinerne Plattformen mit goldenem Band:
  geschafft = grünes Emblem mit Haken und drei Sternen (gold erreicht, grau
  fehlend), offen = goldenes Emblem mit Schwertern und pulsierendem Ring,
  gesperrt = dunkler Stein mit Schloss. Auf dem Boss-Sockel steht der Boss
  selbst (gesperrt nur als Schatten). Antippen lässt die Plattform hüpfen;
  neue Sterne und frisch freigeschaltete Kämpfe werden kurz gefeiert.
* **Grünes Tal** ist voll ausgestaltet: Wasserfall an einer Felskante, ein
  Fluss mit Steinbrücke, ein See mit Seerosen, Ruinen und Steintore,
  Laub- und Blütenbäume, Blumenwiesen, Zäune, Laternen und eine Fahne.
* **Bewegung:** fließendes Wasser, Gischt, ziehende Wolken und ihre
  Schatten, wiegendes Gras, Schmetterlinge, fallende Blüten, Glitzer,
  flackernde Laternen. Beim Scrollen bewegen sich Berge langsamer und die
  Zweige am Rand schneller als die Karte (Parallaxe).
* **Kopfleiste:** Figur mit Level, Sterne der Welt, Trophäen (Tipp öffnet
  die Rangliste), Münzen (Plus öffnet den Shop), Welten-Knopf, Weltname.
  Eine Energieanzeige gibt es nicht.
* **Kampfkarte unten:** der gewählte Gegner (der Boss mit Krone) mit
  Lebenspunkten und Belohnung - alles aus den Spieldaten.

**Leistung:** Die stehende Landschaft wird einmal als Bild gerastert (in
Streifen, damit iPhones kein Riesenbild halten müssen); bewegt wird fast
nur über `transform` und `opacity`. Ruckelt es beim Öffnen, schaltet die
Karte selbst auf weniger Effekte. Mit „Animationen aus“ oder „Weniger
Bewegung“ am Gerät steht alles still.

**Eigene Karte für eine Welt:** In `js/data/weltkarten.js` unter `KARTEN`
einen Eintrag für die Welt ergänzen (Farben, Baumform, welche Dinge mit
welcher Dichte, welche Effekte). Ohne Eintrag leitet sich die Karte aus den
Farben in `js/data/worlds.js` und einer Vorlage zur Kulisse ab
(`VORLAGEN`: Vulkan mit Lavafluss, Eis mit Tannen, Wüste mit Kakteen ...).
Die Grafiken sind selbst gezeichnet (SVG im Code) - es werden keine fremden
Bilder verwendet.

## Spielregeln

**Für beide Seiten gleich – Spieler und Gegner kämpfen nach denselben Regeln:**

* Jeder Kämpfer besitzt ein Deck aus **genau 8 Attacken**.
* Im Kampf liegen immer **4 Attacken auf der Hand**.
* Eine benutzte Attacke verschwindet und wird **sofort nachgezogen** – die
  neue Karte landet auf dem frei gewordenen Platz.
* Ist der Nachziehstapel leer, wird der Ablagestapel neu gemischt.
* Jeder Kämpfer hat **maximal 10 XP** und bekommt **1 XP pro Sekunde**.
  XP steigen nie über 10 und fallen nie unter 0.
* Jede Attacke kostet XP und kann nur gespielt werden, wenn die XP reichen.

**Der einzige Unterschied ist, wer entscheidet:** Du per Tipp auf eine Karte,
der Gegner per KI (`chooseCard` in `js/core/battle.js`). Die **rote XP-Leiste**
beim Gegner zeigt dir, wann bei ihm ein großer Schlag kommt.

**Nach dem Kampf:** Sterne je nach verbliebenen Lebenspunkten (3 Sterne ab 70 %),
Münzen als Belohnung, und das nächste Level wird freigeschaltet.
**Jeder 2. Sieg** im Abenteuer bringt zusätzlich eine Holztruhe gratis
(Niederlagen und die Endlos-Arena zählen nicht mit). Gewonnene Truhen (auch
die Bosstruhe) werden nicht sofort geöffnet: Sie kommen in einen der
**4 Truhenplätze** unter „Spiel starten“ und werden dort freigeschaltet
(Holz 15 Min, Silber und Boss 1 Std, Gold 3 Std – immer nur eine gleichzeitig)
oder sofort mit Münzen geöffnet. Siege bringen außerdem **Trophäen** für
Liga und Rangliste (Tipp auf den Pokal oben).

**Schutz der Rangliste:** Trophäen rechnet das Gerät aus – wer sich im
Browser selbst welche einträgt, soll damit nicht nach oben kommen. Die
Datenbank führt deshalb je Spieler ein **Trophäen-Guthaben** mit
(`mq_speichern` in `datenbank/schema.sql`): Ein zum ersten Mal geschafftes
Level bringt genau seine Trophäen (jedes Level nur einmal), jeder weitere
Sieg 4 – aber höchstens ein Sieg alle 10 Sekunden. Die Rangliste zeigt das
Kleinere aus Spielstand und Guthaben. Für ehrliche Spieler ändert sich
nichts; der Spielstand selbst bleibt unverändert.

**Namensfilter:** Spielernamen sieht jeder (Rangliste, Freunde, Einladungen,
2v2). Schimpfwörter werden schon bei der Eingabe abgelehnt, und wer die
Eingabe umgeht, erscheint bei anderen als „Spieler“. Erkannt werden auch
Tricks wie „F1ck“, „Fuuuck“ oder „F-i-c-k“. Die Wortlisten stehen in
`js/data/namensfilter.js` und – gleich – in `datenbank/schema.sql`
(`mq_name_erlaubt`); ein Test prüft, dass beide übereinstimmen.

**Spielmodi** (Knopf „Modi“ neben „Spiel starten“):

| Modus | Worum es geht | Belohnung |
|---|---|---|
| 🎯 Tägliche Herausforderung | Jeden Tag ein anderer Gegner aus der höchsten Welt mit einem Kniff (zäh, wild, flink, gepanzert, Riese) | Silbertruhe beim ersten Sieg des Tages |
| 🏟️ Endlos-Arena | Gegner um Gegner, jede 5. Runde ein Boss | Bestwert |
| 👑 Boss-Rush | Alle besiegten Bosse hintereinander, dazwischen 30 % Heilung | einmal am Tag: Goldtruhe (ab 3 Bossen), sonst Silbertruhe |
| ⏱️ Zeitangriff | Drei Gegner der höchsten Welt so schnell wie möglich | Holztruhe für jede neue Bestzeit |

Die Werte stehen in `js/data/modi.js`. Gewonnene Truhen kommen in die
Truhenplätze; sind alle belegt, warten sie, bis einer frei wird.

---

## 2v2 – Monster-Duell

Zwei Spieler (**Team Blau**) kämpfen gemeinsam gegen zwei KI-Monster
(**Team Rot**). Zu finden im Modi-Menü ganz oben (große Karte mit beiden
Teams). Es gibt zwei Varianten:

* **Online mit einem Freund:** Spieler 1 erstellt eine Lobby und bekommt einen
  6-stelligen **Einladungscode** (kopieren/teilen), Spieler 2 gibt ihn ein.
* **Solo mit KI-Partner:** Eine verbündete KI übernimmt Spieler 2 – das geht
  auch **komplett offline**.

**Lobby:** beide Spieler mit Figur, Level, Boss-Kraft, Deck und
Bereit-Anzeige. Jeder wählt nur seine eigene Figur (Timo/Rocco), sein Deck
(„Deck bearbeiten“ führt ins normale Deckmenü und per Knopf zurück) und seine
Boss-Kraft. Spieler 1 wählt Welt, Gegnerteam (drei Paare je Welt oder
**Boss-Duell**, wenn einer den Boss schon besiegt hat) und Schwierigkeit.
Der Kampf startet erst, wenn beide „Bereit“ sind.

**Regeln im Kampf** – dieselben Grundregeln wie im Abenteuer, für jeden
Spieler getrennt:

* eigenes 8-Karten-Deck, 4 Karten auf der Hand, **eigene Energie** (max. 10,
  1 pro Sekunde) – niemand kann die Energie des anderen ausgeben
* **Ziele ohne Extra-Menü:** Tippe einen Gegner an (🎯) – dorthin gehen deine
  Angriffe. Tippe dich oder deinen Teamkameraden an (💚) – dorthin gehen
  Heilung und Schild. Jede Karte zeigt ihr Ziel: 🎯 ein Gegner, 🌊 beide
  Gegner (Druckwelle, Felslawine, Donnerwelle, Sternenregen; je 60 %),
  💚 Verbündeter. Urknall trifft die ganze Arena.
* **Team-Kombo:** Trefft ihr denselben Gegner innerhalb von 2 Sekunden, gibt
  es 10 % Bonus auf den zweiten Treffer, danach 8 Sekunden Pause fürs Team.
  Gift, Brand und der Bonus selbst lösen nie eine Kombo aus.
* **Kampfunfähig:** Wer auf 0 LP fällt, ist bis zum Kampfende raus – der
  andere kämpft allein weiter. Fallen beide, ist der Kampf verloren.
* **Team-Signale** (💬): „Greif links an!“, „Greif rechts an!“, „Ich brauche
  Hilfe!“, „Team-Kombo!“, „Guter Angriff!“ – die KI-Partnerin hört darauf.

**Die Gegner** behalten ihr Deck aus ihrer Welt und bekommen eine **Rolle**
mit Fähigkeiten, die echte Energie kosten: Angreifer (Wutschlag), Verteidiger
(Schutzwall für den Partner, Schildstoß zum Unterbrechen), Magier
(Elementarwelle mit dem Element der Welt: Gift, Brand, Verlangsamung,
Schwächung oder Energieentzug), Unterstützer (Heilung, Stärkung, Fluch),
Boss (Boss-Kraft, ab 50 % LP **Phase 2** mit Bosszorn) und Untergebener.
Große Angriffe werden **angekündigt** (rote Leiste, Ziel wird angezeigt) und
lassen sich mit einer Karte ab 5 Energie oder einer Betäubung unterbrechen.
Die KI sieht nur, was auf dem Bildschirm steht (keine Spielerhände), und wird
mit dem Schwierigkeitsgrad **klüger, nicht nur zäher**:

| Grad | Was die KI anders macht |
|---|---|
| 🍀 Einfach | langsam, oft danebengegriffen, keine Teamtaktik |
| ⚔️ Normal | beschützt den Partner, nutzt Schwächen |
| 🔥 Schwer | Kombos, Unterbrechungen, bessere Zielwahl |
| 💀 Albtraum | gemeinsames Fokusziel, kaum Fehler, schnellere Reaktion |

**Fair für zwei:** Keine Dauerbetäubung (nach einer Sperre 4 s Schutz), keine
endlose Gegnerheilung (jede Heilung schwächer, höchstens 50 % der LP), keine
unvermeidbaren Spezialangriffe, keine Energie aus dem Nichts. Der
**Team-Ausgleich** vergleicht die Kampfkraft des Teams (Level, Aufwertungen,
Karten-Level, Boss-Kraft) mit der Stärke der Welt; ist das Team stärker,
teilen die Gegner etwas mehr aus (gedeckelt, Lebenspunkte höchstens +25 %).
Die Lobby zeigt Team-Level, empfohlenes Level und die Anpassung an.

**Belohnungen** (jeder auf seinem Gerät, genau einmal je Match): Münzen,
Erfahrung für die gespielte Figur, Material, Sterne; das erste gewonnene
Boss-Duell des Tages bringt eine Silbertruhe. **Keine** Trophäen und keine
Gratis-Truhen-Zählung; nach 6 Siegen am Tag gibt es nur noch 30 %. Täglich
kommt eine **2v2-Bonusaufgabe** zu den drei normalen Aufgaben, dazu zwei
Erfolge (Teamgeist, Kombo-Meister).

**Alle Werte** (Kombo, Rollen, Fähigkeiten, Gegnerpaare je
Welt, Grade, Belohnungen, Netzwerk-Fristen) stehen in `js/data/duell.js`.

### So funktioniert der Online-Koop

* **Leitung:** Supabase Realtime (Broadcast) über WebSocket – mit dem
  öffentlichen Schlüssel, der ohnehin im Spiel steht. Kein neuer Schlüssel,
  keine fremde Bibliothek (`js/core/netz.js`).
* **Eine verbindliche Simulation:** Der Kampf wird nur beim Gastgeber
  (Spieler 1) gerechnet (`js/core/duell.js`). Spieler 2 schickt Absichten
  mit eindeutiger **Aktions-id**; der Gastgeber prüft sie mit denselben Regeln
  (Karte wirklich auf der Hand? Genug von **seiner** Energie? Ziel gültig?),
  führt sie genau einmal aus und antwortet. Lebenspunkte, Gegnerzüge,
  Boss-Phasen und Ergebnis gehen 8-mal pro Sekunde als kleiner Zustand
  (< 4 KB) an beide.
* **Match-id, Lobby-id, Spielerzuordnung**, Lebenszeichen alle 1,5 s.
* **Verbindungsabbruch:** Spieler 1 wird informiert, der Kampf läuft weiter;
  nach 15 s übernimmt eine (absichtlich schwächere) KI die Figur. Spieler 2
  kann zurückkommen (auch nach Neuladen: „Lobby erneut betreten“) und
  bekommt den kompletten Stand. Verliert der Gastgeber selbst die Leitung,
  pausiert der Kampf; nach 60 s endet er kontrolliert ohne Belohnung.
* **Belohnung genau einmal:** lokal je Match-id, und mit eingespielter
  Datenbank zusätzlich serverseitig (`mq_duell_belohnung`, siehe
  `datenbank/ANLEITUNG.md`).

**Grenzen – ehrlich benannt:** Es gibt keinen eigenen Spielserver. Die
verbindliche Simulation läuft im Browser des Gastgebers, und Spielstände
liegen (wie im ganzen Spiel) im Browser. Ein Spieler, der seinen eigenen
Browser manipuliert, kann deshalb als Gastgeber das Ergebnis verfälschen –
der Gast dagegen kann nichts vorgeben, was der Gastgeber nicht prüft. Für
echten Manipulationsschutz bräuchte es einen Server, der dieselbe Engine
rechnet; `js/core/duell.js` ist dafür vorbereitet (läuft ohne Browser, siehe
`tests/duell.test.mjs`). Supabase Realtime hat außerdem Nutzungsgrenzen
(kostenlose Stufe: begrenzte gleichzeitige Verbindungen und Nachrichten pro
Sekunde); ein Match braucht rund 10 Nachrichten pro Sekunde.

**Ohne Internet ausprobieren:** Das Spiel mit `?netz=lokal` in zwei Tabs
desselben Browsers öffnen – dann laufen Lobby und Kampf über einen
Browser-Kanal statt über das Netz.

**Tägliche Gratis-Truhen:** Neben der Figur auf der Startseite gibt es
**einmal am Tag eine Holztruhe** und **einmal am Tag eine Goldtruhe** – ohne
Kampf. Die Uhr startet mit dem **ersten Spielstart des Tages** (Uhrzeit des
Geräts): Die Holztruhe ist dann sofort da, die Goldtruhe **2 Stunden
später**. Abgeholt zeigt die Truhe „Morgen“. Sie belegen keinen Truhenplatz
und öffnen sich direkt; nicht abgeholte Truhen verfallen nicht, stapeln sich
aber auch nicht. Einstellbar in `ZEIT_TRUHEN` (`js/data/shop.js`).

### 👥 Freunde

Oben in der Spielerleiste sitzt der Knopf **👥** (mit roter Zahl, wenn
Anfragen oder Einladungen warten). Dort gibt es:

- **Deine Freundes-ID** (z. B. `MQ-58291`) – die gibst du Freunden.
- **Meine Freunde** – Name, Level, Figur, Skin und Onlinestatus
  (🟢 Online, 🟡 Im Kampf, ⚫ Offline; Online-Freunde stehen oben), dazu
  „⚔️ Zum 2v2 einladen“ und „Entfernen“.
- **Anfragen** – erhaltene annehmen oder ablehnen, gesendete zurückziehen.
- **Hinzufügen** – Freundes-ID eingeben, suchen, Anfrage senden.

**Zum 2v2 einladen** öffnet die eigene 2v2-Lobby und schickt dem Freund
eine Einladung mit dem Einladungscode. Er bekommt ein Fenster mit
„Annehmen“/„Ablehnen“ und tritt beim Annehmen über genau diesen Code bei –
es ist dieselbe Lobby wie beim Code von Hand. Der Einladungscode zum
Kopieren und Teilen funktioniert unverändert weiter. In der eigenen Lobby
steht außerdem die Liste „👥 Freund einladen“, solange Platz 2 frei ist.

Einladungen gelten 5 Minuten und lassen sich nur einmal annehmen. Während
eines Kampfes erscheint keine Einladung – sie wartet bis danach.

Einladungen, Anfragen und Antworten kommen **sofort** an: Jedes Spiel horcht
auf einem eigenen kleinen „Klingel“-Kanal (Supabase Realtime, benannt nach
der Freundes-ID). Wer etwas schickt, klingelt dort, und der Freund schaut
gleich in der Datenbank nach. Die Klingel trägt keine Daten. Zur Sicherheit
fragt das Spiel außerdem alle 15 Sekunden nach.

Die Freundes-ID ist nur zum Suchen da: Wer sie kennt, kommt damit an
keinen Spielstand heran. Gespeichert wird alles in der Datenbank (siehe
`datenbank/schema.sql`, Abschnitt „Freunde“) – Freunde bleiben also auch
nach einem Gerätewechsel oder einem übertragenen Spielstand erhalten. Ohne
Netz gibt es keine neuen Anfragen und Einladungen; alles andere, auch das
Solo-2v2 mit KI-Partner, läuft weiter.

---

## Das Deck des Spielers

| Timo | Rocco | Energie | Wirkung |
|---|---|---|---|
| Fausthieb | Steinfaust | 2 | 11 Schaden |
| Ellbogenstoß | Schulterramme | 2 | 12 Schaden |
| Wirbelkick | Felsstampfer | 3 | 17 Schaden |
| Aufwärtshaken | Brockenwurf | 4 | 23 Schaden |
| Deckung | Felshaut | 4 | fängt 26 Schaden ab |
| Energiestoß | Erdstoß | 5 | 30 Schaden |
| Druckwelle | Felslawine | 7 | 45 Schaden |
| Sturmfaust | Bergsturz | 9 | 62 Schaden |

Teure Attacken sind pro Energie etwas stärker – Sparen lohnt sich, ist aber
riskant. Roccos Attacken wirken genau wie Timos und teilen ihr Level: Wer
Fausthieb aufwertet, hat auch Steinfaust aufgewertet.

Die Rahmenfarbe einer Karte (Standard, Silber, Gold, Glitzer) zeigt nur ihre
Seltenheit an – sie ändert keine Werte.

**Karten-Level (wie bei Clash Royale):** Jede Karte hat ein Level von 1 bis 15
und wird pro Level 8 % stärker (Level 15 = gut doppelt so stark). Truhen
enthalten immer Fähigkeitskarten; doppelte Karten sind Kopien, und genug
Kopien heben die Karte automatisch ein Level höher. Wer nicht warten will,
kauft ein Level im Deckmenü – absichtlich teuer (800 Münzen für Level 2, rund
39.000 für Level 15). Die Abstände stehen in `js/data/karten.js`.

**Truhen** enthalten genau einmal Münzen (150–500), genau einmal Material und
auf den übrigen Plätzen Fähigkeitskarten (ab und zu einen Skin).

**Skins für Timo** gibt es in zwei Arten (`SKINS` in `js/data/items.js`):

* **Farb-Skins** (Asche, Frost, Gift, …) legen einen Farbfilter über Timo.
* **Outfits** geben ihm neue Kleidung und eine Kopfbedeckung – in allen 14
  Posen, auch im Kampf. Haut und Haare bleiben, wie sie sind:

| Outfit | Seltenheit | Aussehen |
|---|---|---|
| Sportler | gewöhnlich | weißer Trainingsanzug, Schweißband |
| Winter | selten | blaue Winterjacke, rote Bommelmütze |
| Cowboy | selten | Lederjacke, Cowboyhut |
| Ninja | episch | nachtschwarzer Anzug, rotes Stirnband |
| Wikinger | episch | waldgrüne Kluft, Hörnerhelm |
| Zauberer | episch | violette Robe, Sternen-Zauberhut |
| König | legendär | Königsrot, goldene Krone |

**Skin-Studio** (`werkstatt.html`, im Spiel unter Figur → Aussehen →
„Skin-Studio: eigenes Outfit“ und im Shop): eigene Outfits für Timo.

* **Kostenlos:** alle Kleidungsfarben (auch eigene), Helligkeit, Hut- und
  Musterfarben, „Einfarbig“ und „Kein Hut“.
* **Freischalten:** 9 Hüte und 7 Muster – im **Shop** (Reiter „Studio“, oder
  direkt im Studio antippen) oder aus **Truhen** (ab dem 2. Beuteplatz mit
  20 % Chance). Preise je Seltenheit: 500 / 1200 / 2500 / 5000 Münzen.
  Einstellbar in `js/data/studio-teile.js`.
* **Speichern & tragen** zieht das Outfit im Spiel an (höchstens 8). Im
  Spielstand steht nur das Rezept; die Bilder baut das Spiel daraus
  (`js/core/outfit.js`, `js/ui/outfit-bilder.js`).

Die festen Outfits oben erzeugt `werkzeuge/timo-skins-bauen.py` aus den Originalen in
`bilder/timo/`: Es färbt nur die Kleidung um und zeichnet den Hut passend auf
den Kopf jeder Pose. Neues Outfit = dort einen Eintrag in `SKINS` (Farbe und
Hut) ergänzen, das Skript laufen lassen und in `js/data/items.js` einen Skin
mit `ordner` eintragen.

---

## Im Kampf

* **Intro:** Vor jedem Kampf erscheint die Silhouette des Gegners, dann sein
  Name und sein Auftritt (aus dem Busch, rollend, landend, hinter einem Stein
  hervor oder gleitend – je nach Körperform). Bosse bekommen ein längeres
  Intro mit Krone, Zoom und Banner. Ein Tipp überspringt es.
* **Pause:** Der Knopf oben rechts hält alles an – Energie, Gegner,
  Animationen. Wechselt man die App, pausiert der Kampf von selbst.
* **Stimmung:** Jede Welt hat drei Arena-Varianten und eigenes Wetter (Regen,
  Nebel, Schnee, Glutregen ...). Die Tageszeit folgt der Uhr des Geräts.
  Das alles ist reine Optik und ändert keine Kampfwerte.
* **Statistik:** Nach dem Kampf zeigt das Ergebnisfenster ausgespielte
  Karten, angerichteten Schaden und die Kampfdauer.
* Schalter **„Animationen“** in den Einstellungen schaltet Intros, Wetter,
  Kamera und alle Bewegungen ab; der Kampf startet dann sofort.

---

## Testen

Die Kernregeln (8 Karten im Deck, 4 auf der Hand, XP zwischen 0 und 10,
Schaden und Schild) prüft ein Test ohne Browser:

```bash
node tests/regeln.test.mjs
```

Die Weltkarte hat einen eigenen Test (Stationen, Weg, Fluss und Brücke,
nichts steht auf einer Station, keine kaputten Farben in den Zeichnungen):

```bash
node tests/weltkarte.test.mjs
```

Der 2v2-Modus hat zwei eigene Tests: Regeln, KI, Belohnungen und zwei
echte Sitzungen über eine Leitung im Arbeitsspeicher (mit absichtlichen
Verbindungsabbrüchen) - und einen Browser-Test mit zwei Spielern in zwei
Tabs (braucht Playwright, sonst wird er übersprungen):

```bash
node tests/duell.test.mjs
node tests/duell-browser.test.mjs
```

Die Spielstand-Datenbank hat einen eigenen Test. Er startet die Testdatenbank
selbst – du brauchst dafür kein Konto und keine Einrichtung:

```bash
node tests/datenbank.test.mjs
```

Die Freundesliste hat einen Browser-Test mit zwei Spielern auf zwei
„Geräten“ (Anfragen, Annehmen, Ablehnen, Entfernen, 2v2-Einladung,
Einladungscode, offline). Er startet die Testdatenbank selbst und braucht
Playwright:

```bash
node tests/freunde-browser.test.mjs
```

Den Wiederherstellungs-Code (Erinnerung, Code erstellen, Spielstand auf
einem neuen Gerät zurückholen) prüft ein eigener Browser-Test:

```bash
node tests/sicherung-browser.test.mjs
```

Ob die Fenster (Sieg, Niederlage, Truhen ...) auf kleinen und großen Handys
hochkant und quer ganz auf den Bildschirm passen, ohne darin zu scrollen,
prüft ein weiterer Browser-Test:

```bash
node tests/fenster-browser.test.mjs
```

Wenn du an `data/` oder `core/` etwas änderst, lohnt sich ein Durchlauf –
er zeigt sofort, wenn eine Grundregel verletzt ist.

---

## Spielstände speichern

Jeder Spielstand liegt zuerst im Browser des Spielers (`localStorage`). Das
geht sofort und funktioniert auch ohne Netz.

Zusätzlich kann jeder Spielstand in einer Datenbank landen – dann siehst du
alle, die dein Spiel geöffnet haben, und ein Spieler kann seinen Stand mit
einem kurzen Code auf ein anderes Gerät holen. Eingerichtet wird das einmalig
über `js/data/cloud-config.js`; wie das geht, steht Schritt für Schritt in
[datenbank/ANLEITUNG.md](datenbank/ANLEITUNG.md).

**Solange dort nichts eingetragen ist, ändert sich nichts** – das Spiel
verhält sich genau wie vorher und schickt nichts ins Netz.

Zusätzlich legt das Spiel eine **zweite, lokale Sicherung** an
(`monsterquest.save.v3.sicherung`). Ist der Spielstand beim Start beschädigt,
wird er daraus wiederhergestellt. Diese Sicherung liegt im selben Browser –
gegen das Löschen der Browserdaten hilft der **🔑 Wiederherstellungs-Code**
(Optionen → Datenbank): ein fester Code, der nie abläuft und den Spielstand
auf jedem Gerät zurückholt. Wer schon ein paar Kämpfe geschafft und noch
keinen hat, wird höchstens einmal pro Woche daran erinnert.

---

## Selbst erweitern

**Neue Attacke:** Eintrag in `js/data/attacks.js`, dann die `id` in das
`deck`-Array eines Monsters eintragen. Das Deck muss weiterhin 8 Einträge haben.

**Neues Monster:** Eintrag in `js/data/monsters.js` mit `deck` aus 8 Attacken.
Gegner brauchen zusätzlich `reactionTime` und `patience` für ihre KI.

**Neues Level:** ein Gegner mehr in der Welt (`js/data/worlds.js`) –
`js/data/levels.js` macht daraus den Kampf. Weltkarte, Weg und
Freischaltung passen sich an.

**Neue Region:** Farbschema in `css/scenery.css` ergänzen (nach dem Vorbild von
`.scenery--sumpf`) und in den Leveln als `scenery` eintragen.

**Neuer Bildschirm:** Datei in `js/screens/` anlegen und in `js/main.js`
registrieren.

**Schwierigkeit anpassen** – vier Stellschrauben:

| Stellschraube | Wo | Wirkung |
|---|---|---|
| `damage` ÷ `cost` der Gegner-Attacken | `data/attacks.js` | **Wichtigste Schraube.** Beide Seiten bekommen 1 XP/Sekunde, dieser Wert entscheidet, wie hart der Gegner austeilt |
| `maxHp` | `data/monsters.js` | Wie lange der Kampf dauert |
| `reactionTime` | `data/monsters.js` | Wie schnell der Gegner reagiert |
| `patience` | `data/monsters.js` | Wie lange er auf eine starke Attacke spart |

`START_XP`, `MAX_XP` und `XP_PER_SECOND` stehen oben in `js/core/fighter.js`
und gelten für beide Seiten gleichzeitig.

**Echte Grafiken statt CSS-Kulissen:** In `css/scenery.css` bei der jeweiligen
Ebene ein Bild hinterlegen, z. B.
`.scenery__hills { background-image: url('../bilder/huegel.png'); }`.
Der restliche Code bleibt unverändert.

---

## Rechtliches

Alle Monster, Attacken und Namen sind eigene Erfindungen. Es werden bewusst
keine geschützten Inhalte Dritter verwendet. Timo ist eigens gezeichnet, alle
anderen Figuren sind berechnete Pixel-Figuren (`js/ui/sprite.js`). Die
Landschaft der Weltkarte ist im Code gezeichnet (`js/ui/weltkarte/`).
Die Schrift Fredoka steht unter der SIL Open Font License (`fonts/OFL.txt`).
