# MonsterQuest

Ein 2D-Mobile-Game im Browser: Cartoon-Monster-RPG mit Weltkarte und
taktischem Echtzeit-Kampfsystem. Gebaut mit reinem HTML, CSS und JavaScript –
ohne Framework, ohne Build-Schritt.

**Stand: Phase 1** – Startbildschirm, Weltkarte, Kampf, Menüseiten.

---

## Spiel starten

Das Spiel nutzt ES-Module. Die funktionieren aus Sicherheitsgründen **nicht**,
wenn du `index.html` einfach doppelklickst – du brauchst einen Webserver.

**Am Computer:**

```bash
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

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

fonts/                  Spielschrift Fredoka (lokal, kein externer Aufruf)

js/
  main.js               Startet das Spiel, registriert alle Bildschirme

  data/                 NUR Daten – hier balancierst du das Spiel
    attacks.js          Katalog aller Attacken (Kosten, Schaden, Heilung, Schild)
    monsters.js         Spielermonster und Gegner samt Decks
    levels.js           Level der Weltkarte inkl. Position auf der Karte

  core/                 NUR Logik – kennt kein HTML
    screens.js          Bildschirmverwaltung
    state.js            Fortschritt, Sterne, Münzen, Einstellungen, Speichern
    deck.js             8-Karten-Deck, Hand mit 4 Karten, Nachziehen
    fighter.js          Ein Kämpfer: XP, Deck, Hand, Schaden, Schild
    battle.js           Kampfablauf, Zeitsteuerung, Gegner-KI

  ui/                   Bausteine, die mehrere Bildschirme nutzen
    scenery.js          Baut die Hintergrund-Kulisse
    hud.js              Spielerleiste, Kopfzeile, Sterne

  screens/              NUR Darstellung – baut HTML, reagiert auf Tipps
    start.js            Startbildschirm
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
* Eine benutzte Attacke verschwindet und wird **sofort nachgezogen**.
* Ist der Nachziehstapel leer, wird der Ablagestapel neu gemischt.
* Jeder Kämpfer hat **maximal 10 XP** und bekommt **1 XP pro Sekunde**.
  XP steigen nie über 10 und fallen nie unter 0.
* Jede Attacke kostet XP und kann nur gespielt werden, wenn die XP reichen.

**Der einzige Unterschied ist, wer entscheidet:** Du per Tipp auf eine Karte,
der Gegner per KI (`chooseCard` in `js/core/battle.js`). Die **rote XP-Leiste**
beim Gegner zeigt dir, wann bei ihm ein großer Schlag kommt.

**Nach dem Kampf:** Sterne je nach verbliebenen Lebenspunkten (3 Sterne ab 70 %),
Münzen als Belohnung, und das nächste Level wird freigeschaltet.

---

## Das Deck des Spielers

| Attacke | XP | Wirkung |
|---|---|---|
| Krallenhieb | 2 | 11 Schaden |
| Biss | 2 | 12 Schaden |
| Feuerball | 3 | 17 Schaden |
| Flammenstoß | 4 | 23 Schaden |
| Schutzschild | 4 | fängt 26 Schaden ab |
| Feuersturm | 5 | 30 Schaden |
| Lavabombe | 7 | 45 Schaden |
| Meteor | 9 | 62 Schaden |

Teure Attacken sind pro XP etwas stärker – Sparen lohnt sich, ist aber riskant.

---

## Testen

Die Kernregeln (8 Karten im Deck, 4 auf der Hand, XP zwischen 0 und 10,
Schaden und Schild) prüft ein Test ohne Browser:

```bash
node tests/regeln.test.mjs
```

Wenn du an `data/` oder `core/` etwas änderst, lohnt sich ein Durchlauf –
er zeigt sofort, wenn eine Grundregel verletzt ist.

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
keine geschützten Inhalte Dritter verwendet. Die Monster-Darstellungen sind
Emoji-Platzhalter und sollen später durch eigene Grafiken ersetzt werden.
Die Schrift Fredoka steht unter der SIL Open Font License (`fonts/OFL.txt`).
