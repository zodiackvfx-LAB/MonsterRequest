# MonsterQuest: Projekt-Briefing für Ideen

Du bekommst hier den aktuellen Stand meines Handyspiel-Prototyps **MonsterQuest**. Bitte lies alles durch und denk dir neue Inhalte und Funktionen aus, die zum bestehenden Spiel passen. Die Aufgabe steht ganz unten.

---

## 1. Worum es geht

- **Genre:** Monster-Sammelspiel mit Kartenkämpfen, ähnlich wie Pokémon, aber mit Kartendeck statt Attackenmenü.
- **Zielgruppe:** Gelegenheitsspieler am Handy, eher jünger oder Familien. Der Stil ist freundlich, bunt und rund.
- **Slogan:** „Kleine Monster. Große Abenteuer.“
- **Sprache im Spiel:** Deutsch.

## 2. Technik (diese Grenzen gelten für alle Ideen)

- Das ganze Spiel steckt in **einer einzigen HTML-Datei** mit eigenem CSS und reinem JavaScript, ohne Framework.
- Externe Quellen sind nur Google Fonts. Alle Grafiken sind **selbst gezeichnete SVGs** im Code, dazu Emojis als Symbole. Es gibt keine Bilddateien und keine Sounddateien.
- Ausgelegt fürs Handy, maximal 520 px breit, Hochformat, Bedienung per Tippen.
- Gespeichert wird nur lokal im Browser (localStorage). Es gibt keinen Server, keine Konten und kein Online-Multiplayer.
- `alert()`, `confirm()` und `prompt()` funktionieren nicht. Rückfragen müssen im Spiel selbst gebaut werden.

## 3. Optik

- **Farben:** Himmelblau (#7ec8f2), Wiesengrün (#3fae6f), Gold für Buttons (#ffb400), Glut-Orange für Boss und Gefahr (#ff6b4a), Cremeweiß für Panels (#fff8e9), dunkles Violett für Text (#2b2140). Dazu Grün für HP und Blau (#4aa8ff) für XP.
- **Schriften:** „Baloo 2“ für Überschriften und Buttons, „Nunito“ für Fließtext.
- **Form:** Runde Pillen-Buttons mit „3D“-Schatten nach unten, cremefarbene Karten-Panels, Monster als einfache runde Figuren mit großen Augen.
- **Animationen:** Leichtes Hüpfen der Level-Punkte und Monster, Aufblitzen bei Treffern, aufsteigende Schadenszahlen. Alles lässt sich in den Einstellungen abschalten.

## 4. Bildschirme

1. **Start:** Logo, Maskottchen Flauschi, Button „Spiel starten“ und vier Menü-Buttons: Monster, Deck, Sammlung, Einstellungen.
2. **Weltkarte:** Ein gestrichelter Pfad mit 4 Stationen: **1 Grasland** (offen), **2 Wald**, **3 Hügel** und **Boss** (gesperrt, Krone 👑). Oben stehen Spieler-Level (Lv. 1) und Münzen (🪙 250).
3. **Kampf:** Links dein Monster, rechts der Gegner, beide mit HP-Leiste. Unten sind eine XP-Leiste, 4 Handkarten und ein Zähler für die restlichen Karten im Deck. Nach dem Kampf erscheint „Sieg!“ oder „Niederlage“.
4. **Monster:** Porträt von Flauschi, Werte, Kampfbilanz (Siege und Niederlagen) und 3 gesperrte Team-Plätze („ab Level 2“, „ab Level 3“, „nach dem Boss“).
5. **Deck:** Alle 8 Attackenkarten mit Kosten und Wirkung, dazu eine kurze Regel-Erklärung.
6. **Sammlung:** Monster-Lexikon mit 5 Plätzen. Unentdeckte Monster stehen als „???“ mit Silhouette drin.
7. **Einstellungen:** Monster umbenennen, Animationen an oder aus, Gegner-Tempo (Ruhig, Normal, Schnell) und Fortschritt zurücksetzen.

## 5. Kampfregeln (genau so umgesetzt)

- Dein Monster **Flauschi** hat Lv. 1 und **30 HP**.
- Der Gegner **Grollzahn** hat Lv. 1 und **24 HP**.
- „XP“ ist hier die **Energie zum Ausspielen von Karten**: Du startest mit 10, maximal 10, +1 pro Sekunde.
- Das Deck hat **8 Karten** und wird zu Kampfbeginn gemischt. Du hältst immer 4 auf der Hand. Nach jeder gespielten Karte ziehst du eine neue, solange Karten übrig sind.
- **Der Gegner greift nur an, nachdem du eine Karte gespielt hast.** Er macht 3 bis 6 Schaden, je nach Tempo nach 0,3 bis 0,9 Sekunden. Wartest du, passiert nichts.
- Sieg bei 0 HP des Gegners, Niederlage bei 0 HP von Flauschi. Es gibt **noch keine Belohnung** für einen Sieg.

### Attackenkarten

| Karte        | Symbol | Kosten (XP) | Wirkung     |
|--------------|--------|-------------|-------------|
| Krallenhieb  | 🐾     | 2           | 5 Schaden   |
| Biss         | 🦷     | 2           | 6 Schaden   |
| Feuerball    | 🔥     | 3           | 8 Schaden   |
| Flammenstoß  | 💥     | 4           | 11 Schaden  |
| Schutzschild | 🛡️     | 4           | heilt 8 HP  |
| Feuersturm   | 🌪️     | 5           | 15 Schaden  |
| Lavabombe    | ☄️     | 7           | 20 Schaden  |
| Meteor       | 🌠     | 9           | 26 Schaden  |

### Monster

| Nr. | Name      | Aussehen                                                      | Status                    |
|-----|-----------|---------------------------------------------------------------|---------------------------|
| 001 | Flauschi  | Hellblau, rund, große Ohren, rosa Bäckchen, lächelt           | Dein Partner              |
| 002 | Grollzahn | Rostrot, zwei kleine Hörner, gelbe Augen, grimmiger Mund      | Gegner im Grasland        |
| 003 | ???       | noch nicht ausgedacht                                         | Wald, Level 2             |
| 004 | ???       | noch nicht ausgedacht                                         | Hügel, Level 3            |
| 005 | ???       | noch nicht ausgedacht                                         | Boss-Gebiet               |

## 6. Was noch fehlt oder nicht stimmig ist

- **Level 2, Level 3 und der Boss** sind gesperrt und haben noch keinen Inhalt. Es gibt keine Regel, wann sie freigeschaltet werden.
- **Münzen (250)** und **Spieler-Level (Lv. 1)** werden nur angezeigt und haben keine Funktion.
- Ein Sieg bringt **keine Belohnung**. Es gibt kein Aufleveln und keine neuen Karten.
- Die **3 Team-Plätze** sind leer, und es gibt noch keinen Weg, neue Monster zu bekommen.
- **Flauschi sieht nach Wasser- oder Flausch-Monster aus, alle Karten sind aber Feuer-Attacken.** Das passt noch nicht zusammen. Es gibt auch noch kein Typen- oder Element-System.
- Das Wort **„XP“** wird für Kampf-Energie benutzt, obwohl man bei XP meistens an Erfahrungspunkte denkt.
- Weil der Gegner nur nach deinen Zügen angreift, kann man ohne Risiko warten, bis die Energie voll ist. Das nimmt dem Kampf Spannung.
- Es gibt keine Sounds, kein Tutorial und keine Story.

## 7. Deine Aufgabe

Denk dir neue Inhalte und Funktionen für MonsterQuest aus. Bitte:

1. **Bleib im Stil:** freundlich, bunt, für Kinder und Familien geeignet, deutsche Namen mit Wortwitz (wie „Flauschi“, „Grollzahn“).
2. **Halte dich an die Technik-Grenzen aus Abschnitt 2.** Keine Ideen, die einen Server, Bilddateien oder Online-Funktionen brauchen.
3. **Gib konkrete Zahlen an,** zum Beispiel HP, Kosten, Schaden und Belohnungen, passend zu den Werten oben.
4. **Ordne jede Idee ein:** klein (ein Nachmittag), mittel oder groß.
5. **Fang mit den Lücken aus Abschnitt 6 an.** Danach darfst du frei weiterdenken.

Ideen, die mich besonders interessieren:
- Neue Monster für Wald, Hügel und Boss, mit Name, Aussehen (so beschrieben, dass man es als einfache SVG-Figur zeichnen kann), Werten und eigenen Karten.
- Neue Attackenkarten und vielleicht ein Element-System (z. B. Feuer, Wasser, Pflanze).
- Belohnungen und Fortschritt: Münzen, Aufleveln, neue Karten, neue Monster fürs Team.
- Wofür man Münzen ausgeben kann, zum Beispiel ein Laden.
- Ideen, wie der Kampf spannender wird.
- Eine kleine Geschichte, die die Welt zusammenhält.

Gib das Ergebnis bitte als übersichtliche Liste mit Überschriften aus.
