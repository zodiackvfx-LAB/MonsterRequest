#!/usr/bin/env python3
"""
Baut das MonsterQuest-Logo aus der Schrift in feste SVG-Pfade um.

WARUM NICHT EINFACH <text>?
Das Logo hat eine dicke Kontur (Strich). Bei der Schrift Fredoka stehen die
Buchstaben so eng, dass sich diese Konturen ueberlappen. Welcher Buchstabe
dann obenauf liegt, entscheidet jeder Browser anders:

  Chrome  zeichnet Buchstabe fuer Buchstabe (Kontur, Fuellung, naechster) -
          man sieht zwischen den Buchstaben eine dunkle Linie.
  Safari  zeichnet erst ALLE Konturen und dann ALLE Fuellungen - die hellen
          Fuellungen ueberdecken die Konturen der Nachbarn, und aus dem Wort
          wird ein weisser Klumpen.

Mit festen Pfaden gibt es keine Schrift und keine Reihenfolge mehr, die
schiefgehen kann: Das Logo sieht auf jedem Geraet gleich aus.

BENUTZUNG (nur noetig, wenn sich der Titel oder die Schrift aendert):
    pip install fonttools brotli
    python3 werkzeuge/logo-bauen.py

Das Skript schreibt js/ui/logo-pfade.js neu.
"""

from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

WURZEL = Path(__file__).resolve().parent.parent
SCHRIFT = WURZEL / 'fonts' / 'fredoka-latin.woff2'
ZIEL = WURZEL / 'js' / 'ui' / 'logo-pfade.js'

# Dieselben Werte wie frueher im <text>: Mitte bei x=150, Grundlinien 40 und 94.
GEWICHT = 700
WOERTER = [
    # (Name, Text, Schriftgroesse, Grundlinie y, zusaetzlicher Buchstabenabstand)
    ('MONSTER', 'MONSTER', 40, 40, 2.0),
    ('QUEST', 'QUEST', 52, 94, 2.0),
]
MITTE_X = 150
VIEWBOX_BREITE = 300
STRICH_GOLD = 11  # breitester Strich - so viel Platz braucht das Logo am Rand


def wort_pfad(glyphen, cmap, hmtx, text, groesse, grundlinie, abstand):
    """Baut den Pfad eines Wortes und gibt (d, Breite) zurueck."""
    skala = groesse / 1000.0  # Die Schrift rechnet in 1000 Einheiten je Quadrat.

    # Erst die Gesamtbreite messen, damit das Wort mittig sitzt.
    breite = sum(hmtx[cmap[ord(c)]][0] for c in text) * skala
    breite += abstand * (len(text) - 1)
    x = MITTE_X - breite / 2

    teile = []
    for zeichen in text:
        name = cmap[ord(zeichen)]
        stift = SVGPathPen(glyphen, ntos=lambda v: f'{v:.2f}')
        # y wird gespiegelt: In der Schrift zeigt y nach oben, im SVG nach unten.
        glyphen[name].draw(TransformPen(stift, (skala, 0, 0, -skala, x, grundlinie)))
        d = stift.getCommands()
        if d:
            teile.append(d)
        x += hmtx[name][0] * skala + abstand

    return ' '.join(teile), breite


def main():
    schrift = TTFont(SCHRIFT)
    schrift = instantiateVariableFont(schrift, {'wght': GEWICHT}, inplace=True)
    glyphen = schrift.getGlyphSet()
    cmap = schrift.getBestCmap()
    hmtx = schrift['hmtx']

    zeilen = [
        '/**',
        ' * Die Buchstaben des Logos als feste SVG-Pfade.',
        ' *',
        ' * NICHT VON HAND AENDERN. Erzeugt von werkzeuge/logo-bauen.py',
        ' * (dort steht auch, warum das Logo keine echte Schrift mehr benutzt).',
        ' *',
        ' * Schrift: Fredoka, Gewicht %d, Lizenz OFL - siehe fonts/OFL.txt' % GEWICHT,
        ' */',
        '',
    ]

    for name, text, groesse, grundlinie, abstand in WOERTER:
        d, breite = wort_pfad(glyphen, cmap, hmtx, text, groesse, grundlinie, abstand)
        gesamt = breite + STRICH_GOLD
        rand = (VIEWBOX_BREITE - gesamt) / 2
        if rand < 0:
            raise SystemExit(f'"{text}" ist zu breit fuer die viewBox ({gesamt:.1f} von {VIEWBOX_BREITE}).')
        print(f'{text}: {breite:.1f} breit, mit Strich {gesamt:.1f}, Luft je Seite {rand:.1f}')
        zeilen.append(f'/* "{text}" - {breite:.1f} Einheiten breit, Grundlinie {grundlinie} */')
        zeilen.append(f"export const LOGO_{name} =")
        zeilen.append(f"  '{d}';")
        zeilen.append('')

    ZIEL.write_text('\n'.join(zeilen), encoding='utf-8')
    print('geschrieben:', ZIEL.relative_to(WURZEL))


if __name__ == '__main__':
    main()
