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
    battle.js           Kampf-Engine: XP, Schaden, Gegner, Sieg/Niederlage
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

* Jeder Charakter besitzt ein Deck aus **genau 8 Attacken**.
* Im Kampf liegen immer **4 Attacken auf der Hand**.
* Eine benutzte Attacke verschwindet und wird **sofort nachgezogen**.
* Ist der Nachziehstapel leer, wird der Ablagestapel neu gemischt.
* Der Charakter hat **maximal 10 XP** und bekommt **1 XP pro Sekunde**.
* Jede Attacke kostet XP. Du entscheidest selbst, wann du angreifst.
* Der Gegner greift automatisch in festen Abständen an (roter Balken unter
  seinen Lebenspunkten = Countdown bis zum nächsten Angriff).
* Level gewonnen → das nächste Level auf der Karte wird freigeschaltet.

---

## Selbst erweitern

**Neue Attacke:** Eintrag in `js/data/attacks.js` ergänzen, dann die `id` in
das `deck`-Array eines Monsters in `js/data/monsters.js` schreiben. Achtung:
Das Deck muss weiterhin genau 8 Einträge haben.

**Neues Monster:** Eintrag in `js/data/monsters.js` ergänzen. Gegner brauchen
`attacks` und `attackDelay`, Spielermonster ein `deck` mit 8 Attacken.

**Neues Level:** Eintrag in `js/data/levels.js` ergänzen. Weltkarte und
Freischaltung richten sich automatisch danach.

**Schwierigkeit anpassen:** `attackDelay` beim Gegner (kleiner = schwerer),
`maxHp` der Monster, `cost`/`damage` der Attacken, sowie `START_XP` ganz oben
in `js/core/battle.js`.

**Fortschritt zurücksetzen:** In der Browser-Konsole
`localStorage.removeItem('monsterquest.save.v1')` ausführen und neu laden.

---

## Mögliche nächste Schritte

* Eigene Grafiken statt der Emoji-Platzhalter
* Mehrere eigene Monster und ein Team statt eines einzelnen Charakters
* Elemente/Typen mit Stärken und Schwächen
* Belohnungen nach dem Kampf, neue Attacken freischalten
* Weitere Regionen mit eigener Weltkarte
* Sound und Trefferanimationen

---

## Rechtliches

Alle Monster, Attacken und Namen in diesem Projekt sind eigene Erfindungen.
Es werden bewusst keine geschützten Inhalte Dritter verwendet. Die aktuellen
Monster-Darstellungen sind reine Emoji-Platzhalter und sollen später durch
eigene Grafiken ersetzt werden.
