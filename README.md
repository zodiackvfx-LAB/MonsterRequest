# MonsterQuest

Ein 2D-Mobile-Game im Browser: Cartoon-Monster-RPG mit Weltkarte und
taktischem Echtzeit-Kampfsystem. Gebaut mit reinem HTML, CSS und JavaScript –
ohne Framework, ohne Build-Schritt.

**Stand: spielbarer Prototyp** (Startbildschirm → Weltkarte → Kampf).

---

## Spiel starten

Das Spiel nutzt ES-Module. Die funktionieren aus Sicherheitsgründen **nicht**,
wenn du `index.html` einfach doppelklickst – du brauchst einen kleinen lokalen
Webserver. Ein Befehl im Projektordner genügt:

```bash
python3 -m http.server 8000
```

Dann im Browser öffnen: <http://localhost:8000>

**Auf dem Handy oder iPad testen:** Computer und Gerät ins gleiche WLAN,
die lokale IP des Computers herausfinden (z. B. `192.168.0.42`) und auf dem
Gerät `http://192.168.0.42:8000` aufrufen.

**Alternative:** Das Repository über GitHub Pages veröffentlichen – dann läuft
das Spiel ohne lokalen Server direkt über eine URL.

---

## Projektstruktur

```
index.html              Einstiegspunkt, Mobile-Meta-Tags, leerer #app-Container
css/style.css           Komplettes Styling (mobile-first)
js/
  main.js               Startet das Spiel, registriert die Screens
  data/                 NUR Daten – hier balancierst du das Spiel
    attacks.js          Katalog aller Attacken (Kosten, Schaden, Heilung)
    monsters.js         Spielermonster und Gegner
    levels.js           Level der Weltkarte
  core/                 NUR Logik – kennt kein HTML
    screens.js          Screen-Manager (Start ↔ Karte ↔ Kampf)
    state.js            Fortschritt, Speichern im Browser
    deck.js             8-Karten-Deck, Hand mit 4 Karten, Nachziehen
    fighter.js          Ein Kämpfer: XP, Deck, Hand – für Spieler UND Gegner
    battle.js           Kampf-Engine: Zeitablauf, Schaden, Gegner-KI, Sieg/Niederlage
  screens/              NUR Darstellung – baut HTML, hört auf Klicks
    start.js            Startbildschirm
    map.js              Weltkarte
    battle.js           Kampfbildschirm
```

**Die wichtigste Regel dieses Projekts:** Logik (`core/`) und Darstellung
(`screens/`) bleiben getrennt. Die Kampf-Engine weiß nicht, wie der Kampf
aussieht – der Kampfbildschirm kennt keine Kampfregeln. Dadurch kannst du
später die Optik komplett austauschen, ohne die Regeln anzufassen.

---

## Spielregeln im Prototyp

**Für beide Seiten gleich – Spieler und Gegner kämpfen nach denselben Regeln:**

* Jeder Kämpfer besitzt ein Deck aus **genau 8 Attacken**.
* Im Kampf liegen immer **4 Attacken auf der Hand**.
* Eine benutzte Attacke verschwindet und wird **sofort nachgezogen**.
* Ist der Nachziehstapel leer, wird der Ablagestapel neu gemischt.
* Jeder Kämpfer hat **maximal 10 XP** und bekommt **1 XP pro Sekunde**.
* Jede Attacke kostet XP.

**Der einzige Unterschied ist, wer entscheidet:**

* Du entscheidest per Tipp auf eine Karte.
* Der Gegner entscheidet per KI (`chooseCard` in `js/core/battle.js`):
  Er spielt die stärkste Attacke, die er sich leisten kann – es sei denn,
  in den nächsten Sekunden wäre etwas deutlich Stärkeres bezahlbar, dann
  spart er weiter.
* Die **rote XP-Leiste** unter den Lebenspunkten des Gegners zeigt dir seinen
  XP-Stand. Daran erkennst du, wann bei ihm ein grosser Schlag kommt.
* Seine Handkarten bleiben verdeckt – du siehst nur die XP.

Level gewonnen → das nächste Level auf der Karte wird freigeschaltet.

---

## Selbst erweitern

**Neue Attacke:** Eintrag in `js/data/attacks.js` ergänzen, dann die `id` in
das `deck`-Array eines Monsters in `js/data/monsters.js` schreiben. Achtung:
Das Deck muss weiterhin genau 8 Einträge haben.

**Neues Monster:** Eintrag in `js/data/monsters.js` ergänzen. Jedes Monster –
auch jeder Gegner – braucht ein `deck` mit genau 8 Attacken. Gegner bekommen
zusätzlich `reactionTime` und `patience` für ihre KI.

**Neues Level:** Eintrag in `js/data/levels.js` ergänzen. Weltkarte und
Freischaltung richten sich automatisch danach.

**Schwierigkeit anpassen** – vier Stellschrauben, von grob nach fein:

| Stellschraube | Wo | Wirkung |
|---|---|---|
| `damage` ÷ `cost` der Gegner-Attacken | `js/data/attacks.js` | **Wichtigste Schraube.** Weil beide Seiten 1 XP/Sekunde bekommen, entscheidet dieser Wert, wie hart der Gegner austeilt. Spieler ≈ 5,5 · Level 1 ≈ 3,4 · Level 2 und Boss ≈ 4,2 |
| `maxHp` | `js/data/monsters.js` | Wie lange der Kampf dauert |
| `reactionTime` | `js/data/monsters.js` | Wie schnell der Gegner reagiert (kleiner = wacher) |
| `patience` | `js/data/monsters.js` | Wie lange er auf eine stärkere Attacke spart (0 = haut sofort alles raus) |

`START_XP`, `MAX_XP` und `XP_PER_SECOND` stehen oben in `js/core/fighter.js`
und gelten für beide Seiten gleichzeitig.

**Fortschritt zurücksetzen:** In der Browser-Konsole
`localStorage.removeItem('monsterquest.save.v1')` ausführen und neu laden.

---

## Mögliche nächste Schritte

* Eigene Grafiken statt der Emoji-Platzhalter
* Mehrere eigene Monster und ein Team statt eines einzelnen Charakters
* Elemente/Typen mit Stärken und Schwächen
* Verschiedene Gegner-Strategien (vorsichtig, aggressiv, heilend)
* Belohnungen nach dem Kampf, neue Attacken freischalten
* Weitere Regionen mit eigener Weltkarte
* Sound und Trefferanimationen

---

## Rechtliches

Alle Monster, Attacken und Namen in diesem Projekt sind eigene Erfindungen.
Es werden bewusst keine geschützten Inhalte Dritter verwendet. Die aktuellen
Monster-Darstellungen sind reine Emoji-Platzhalter und sollen später durch
eigene Grafiken ersetzt werden.
