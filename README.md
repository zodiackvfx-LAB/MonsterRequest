# MonsterQuest

Ein 2D-Mobile-Game im Browser: Cartoon-Monster-RPG mit Weltkarte und
taktischem Echtzeit-Kampfsystem. Gebaut mit reinem HTML, CSS und JavaScript –
ohne Framework, ohne Build-Schritt.

**Stand:** 7 Welten mit je 12 Kämpfen, zwei Spielfiguren (Timo und Rocco),
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

css/
  base.css              Schrift, Farben, Grundlayout   ← Farben zentral ändern
  scenery.css           Kulissen: Himmel, Wolken, Berge, Hügel, Boden
  ui.css                Bausteine: Logo, Buttons, Panels, Balken, Karten
  screens.css           Aufbau der einzelnen Bildschirme
  erlebnis.css          Pause, Ergebnisfenster, Kampf-Intros, Auftritte,
                        Kartenrahmen, Wetter, Tageszeit, Weltkarten-Teilchen

fonts/                  Spielschrift Fredoka (lokal, kein externer Aufruf)

datenbank/              Spielstände auf einem Server – siehe ANLEITUNG.md
  schema.sql            Tabellen und Funktionen, einmal in Supabase einfügen
  schema.test.sql       Prüft schema.sql nach dem Einspielen

werkzeuge/              Hilfsskripte, die nicht zum Spiel gehören
  logo-bauen.py         Erzeugt die Logo-Pfade aus der Schrift
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
    trophaeen.js        Trophäen je Sieg und die 8 Ligen

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
    zeittruhen.js       Gratis-Truhen mit Uhr (Holz 30 Min, Gold 1 Std)
    trophaeen.js        Trophäen gewinnen und verlieren

  ui/                   Bausteine, die mehrere Bildschirme nutzen
    scenery.js          Baut die Hintergrund-Kulisse
    hud.js              Spielerleiste, Kopfzeile, Sterne
    kampfintro.js       Intro vor dem Kampf, Auftritte, Bewegung je Gegnerform
    umgebung.js         Arena-Varianten, Tageszeit, Wetter, kleine Tiere
    truhen.js           Die gezeichneten Truhen (Holz, Silber, Gold, Boss)
    truhe-oeffnen.js    Die Öffnungs-Animation (Landen, Rütteln, Aufspringen,
                        Beute fliegt heraus)

  screens/              NUR Darstellung – baut HTML, reagiert auf Tipps
    lobby.js            Lobby wie bei Clash Royale: Seiten zum Wischen und
                        die Leiste unten (Shop, Figur, Deck, Start, Welten,
                        Sammlung, Optionen)
    start.js            Startbildschirm (die mittlere Seite der Lobby)
    map.js              Weltkarte
    battle.js           Kampfbildschirm
    monster.js          Monsterübersicht
    deck.js             Deckübersicht
    collection.js       Sammlung aller Kreaturen
    settings.js         Einstellungen
```

**Die wichtigste Regel dieses Projekts:** Daten (`data/`), Logik (`core/`) und
Darstellung (`screens/`) bleiben getrennt. Die Kampf-Engine weiß nicht, wie ein
Kampf aussieht – der Kampfbildschirm kennt keine Kampfregeln.

---

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

**Spielmodi** (Knopf „Modi“ neben „Spiel starten“):

| Modus | Worum es geht | Belohnung |
|---|---|---|
| 🎯 Tägliche Herausforderung | Jeden Tag ein anderer Gegner aus der höchsten Welt mit einem Kniff (zäh, wild, flink, gepanzert, Riese) | Silbertruhe beim ersten Sieg des Tages |
| 🏟️ Endlos-Arena | Gegner um Gegner, jede 5. Runde ein Boss | Bestwert |
| 👑 Boss-Rush | Alle besiegten Bosse hintereinander, dazwischen 30 % Heilung | einmal am Tag: Goldtruhe (ab 3 Bossen), sonst Silbertruhe |
| ⏱️ Zeitangriff | Drei Gegner der höchsten Welt so schnell wie möglich | Holztruhe für jede neue Bestzeit |

Die Werte stehen in `js/data/modi.js`. Gewonnene Truhen kommen in die
Truhenplätze; sind alle belegt, warten sie, bis einer frei wird.

**Gratis-Truhen mit Uhr:** Neben der Figur auf der Startseite gibt es
**alle 30 Minuten eine Holztruhe** und **jede Stunde eine Goldtruhe** – ohne
Kampf. Sie belegen keinen Truhenplatz und öffnen sich direkt. Die Uhr für die
nächste läuft ab dem Abholen; nicht abgeholte Truhen stapeln sich nicht.
Einstellbar in `ZEIT_TRUHEN` (`js/data/shop.js`).

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

Die Spielstand-Datenbank hat einen eigenen Test. Er startet die Testdatenbank
selbst – du brauchst dafür kein Konto und keine Einrichtung:

```bash
node tests/datenbank.test.mjs
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
gegen das Löschen der Browserdaten hilft nur der Übertragungscode.

---

## Selbst erweitern

**Neue Attacke:** Eintrag in `js/data/attacks.js`, dann die `id` in das
`deck`-Array eines Monsters eintragen. Das Deck muss weiterhin 8 Einträge haben.

**Neues Monster:** Eintrag in `js/data/monsters.js` mit `deck` aus 8 Attacken.
Gegner brauchen zusätzlich `reactionTime` und `patience` für ihre KI.

**Neues Level:** Eintrag in `js/data/levels.js` – inklusive `x`/`y` für die
Position auf der Karte. Weltkarte, Weg und Freischaltung passen sich an.

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
anderen Figuren sind berechnete Pixel-Figuren (`js/ui/sprite.js`).
Die Schrift Fredoka steht unter der SIL Open Font License (`fonts/OFL.txt`).
