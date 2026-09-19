# Arena-Hintergründe selbst ändern

Es gibt zwei Wege. Beide brauchen **nur eine Datei**: `js/data/worlds.js`.

---

## Weg 1: Farben ändern (ohne Bilder)

Jede Welt hat dort einen Block `farben`. Ändere einen Wert, lade die Seite
neu – fertig.

```js
{
  id: 1,
  name: 'Grünes Tal',
  scenery: 'wald',
  farben: {
    himmelOben:   '#3ba7e8',   // Himmel oben
    himmelUnten:  '#b6e8ff',   // Himmel am Horizont
    wiese:        '#66c447',   // Boden, auf dem gekämpft wird
    wieseDunkel:  '#3f8f2c',   // Hügel dahinter, unterer Rand des Bodens
    wieseHell:    '#8fdd63',   // heller Rand oben auf dem Boden
    fels:         '#7c8fb5',   // Berge im Hintergrund
    felsDunkel:   '#5a6c92',   // Bergschatten
    baum:         '#3b8f3a',   // Bäume / Kristalle / Kakteen
    baumDunkel:   '#23611f',   // deren Stämme
    schnee:       '#f2f8ff',   // Bergspitzen
  },
  ...
}
```

Farbwerte sind Hex-Codes (`#` und sechs Zeichen). Eine Farbe aussuchen
kannst du z. B. bei einem Farbwähler im Browser.

**Tipp:** Fang mit `himmelOben`, `himmelUnten` und `wiese` an – die drei
machen den größten Unterschied.

### Was sich NICHT über Farben ändert

Die **Formen** der Bäume (Tannen, Kristalle, Felsnadeln, Kakteen) stehen in
`css/scenery.css` unter `.region--...`. Welche Form eine Welt benutzt,
sagt ihr Feld `scenery`:

| `scenery` | Form |
|---|---|
| `wald` | Tannen |
| `kristall` | spitze Kristalle |
| `vulkan` | Felsnadeln |
| `eis` | verschneite Tannen |
| `schatten` | kahle Bäume |
| `wueste` | Kakteen |

Du darfst eine Form auch in einer anderen Welt verwenden – einfach
`scenery: 'kristall'` schreiben, egal welche Welt.

---

## Weg 2: Eigenes Hintergrundbild

1. Bild in den Ordner `bilder/welten/` legen, z. B. `vulkan.png`
2. In `js/data/worlds.js` bei der Welt **eine Zeile** ergänzen:

```js
hintergrund: 'bilder/welten/vulkan.png',
```

Das war's. Das Bild ersetzt dann Himmel, Berge und Hügel.

### Worauf du beim Bild achten solltest

- **Querformat**, etwa 2:1 (z. B. 1200 × 600 Pixel). Es wird zugeschnitten,
  nicht verzerrt.
- **Der untere Rand ist wichtig.** Das Bild wird unten ausgerichtet, dort
  stehen die Kämpfer.
- **PNG oder JPG.** Für Fotos/Verläufe ist JPG kleiner, für Pixelgrafik PNG.
- **Unter 300 KB**, sonst wird das Laden auf dem Handy spürbar.

### Der Boden bleibt

Der Boden der Arena wird **weiterhin gezeichnet** (in der Farbe `wiese`) und
liegt vor deinem Bild. Das ist Absicht: So stehen die Figuren immer sauber
auf dem Boden, egal wie dein Bild aussieht. Damit es zusammenpasst, stell
`wiese` auf eine Farbe aus dem unteren Teil deines Bildes.

Willst du, dass auch der Boden aus dem Bild kommt, sag Bescheid – das ist
eine Zeile im CSS, macht aber die Figurenposition empfindlich.

---

## Welche Datei macht was?

| Datei | Inhalt |
|---|---|
| `js/data/worlds.js` | Welten: Farben, Gegner, Schwierigkeit, Belohnung |
| `js/data/attacks.js` | Timos Attacken: Name, Kosten, Schaden |
| `js/data/monsters.js` | Timo: Grafiken, Lebenspunkte, Deck |
| `js/data/items.js` | Truhen-Beute, Skins, Seltenheiten |
| `js/data/sounds.js` | alle Klänge (als Zahlen, keine Dateien) |
| `js/data/musik.js` | Musik je Welt (Motiv, Tempo, Tonleiter) |
| `js/data/aufgaben.js` | Tagesaufgaben |
| `css/scenery.css` | Formen der Kulisse |
| `bilder/` | Timos Grafiken, eigene Hintergründe |

**Faustregel:** Alles, was du als Spiel-Inhalt änderst, liegt in
`js/data/`. Den Rest musst du nicht anfassen.

---

## Nach jeder Änderung

Seite im Browser neu laden. Wenn nichts passiert: Tab schließen und neu
öffnen – Safari hält alte Dateien manchmal fest.
