"""
Baut Timos Skins mit eigener Kleidung und Kopfbedeckung.

Timo ist ein fertig gezeichnetes Pixelbild in 14 Posen (bilder/timo/).
Ein Farbfilter würde ALLES umfärben - Haut, Haare, Augen. Dieses Skript
macht es gezielt:

  1. Kleidung umfärben: Jacke, Hose und Tasche sind dunkle, fast graue Töne.
     Genau diese Pixel bekommen eine neue Farbe - mit derselben Helligkeit,
     damit Falten und Schatten erhalten bleiben. Haut, Haare, Augen, Schuhe
     und das helle Shirt bleiben, wie sie sind.
  2. Kopfbedeckung: In jeder Pose wird der Kopf gesucht (die oberste
     Haar-Stelle und ihre Breite) und die Mütze, Krone oder der Hut als
     Pixelgrafik passend groß daraufgezeichnet - mit dunkler Kontur wie
     der Rest der Figur.

Ergebnis: bilder/timo/skins/<ordner>/<pose>.png - gleiche Dateinamen wie
die Originale - und js/data/timo-skins.js mit der Liste aller Bilder (siehe
skinBild in js/ui/sprite.js und SKINS in js/data/items.js). Die Liste
schreibt jeden Pfad aus, damit die Einzeldatei-Version
(werkzeuge/eine-datei-bauen.mjs) die Bilder findet und einbettet.

Aufruf (im Projektordner):  python3 werkzeuge/timo-skins-bauen.py
Vorschau aller Skins:       python3 werkzeuge/timo-skins-bauen.py --vorschau ziel.png
"""

import colorsys
import math
import os
import sys

from PIL import Image, ImageDraw

QUELLE = 'bilder/timo'
ZIEL = 'bilder/timo/skins'
POSEN = [
    'front', 'stand',
    'schlag-1', 'schlag-2', 'schlag-3', 'schlag-4',
    'strahl-1', 'strahl-2', 'strahl-3', 'strahl-4',
    'treffer-1', 'treffer-2', 'treffer-3', 'treffer-4',
]

KONTUR = (18, 14, 20, 255)

# In diesen Posen leuchtet der Kopf im blauen Energieblitz - die Haarfarbe
# ist dort nicht zu erkennen. Der Kopf steht aber an derselben Stelle wie in
# der Pose davor, also wird er von dort übernommen.
KOPF_WIE = {'schlag-3': 'schlag-2', 'strahl-3': 'strahl-2', 'strahl-4': 'strahl-2'}

# ---------------------------------------------------------------------------
# Die Skins. kleidung = (Farbton 0-360, Sättigung 0-1, hellster, dunkelster
# Helligkeitswert). hut = welche Kopfbedeckung (siehe HUETE unten).
# ---------------------------------------------------------------------------
SKINS = {
    'winter':   {'kleidung': (205, 0.42, 0.66, 0.16), 'hut': 'wintermuetze'},
    'koenig':   {'kleidung': (350, 0.55, 0.52, 0.12), 'hut': 'krone'},
    'zauberer': {'kleidung': (268, 0.45, 0.50, 0.10), 'hut': 'zauberhut'},
    'cowboy':   {'kleidung': (28, 0.45, 0.60, 0.14), 'hut': 'cowboyhut'},
    'wikinger': {'kleidung': (110, 0.28, 0.48, 0.10), 'hut': 'wikingerhelm'},
    'ninja':    {'kleidung': (225, 0.30, 0.32, 0.05), 'hut': 'ninjaband'},
    'sportler': {'kleidung': (215, 0.10, 0.92, 0.38), 'hut': 'schweissband'},
}


def hls(rgb):
    return colorsys.rgb_to_hls(*(v / 255 for v in rgb))


def ist_kleidung(rgb):
    """Dunkle, fast farblose Töne - Jacke, Hose, Tasche. Nicht die Kontur."""
    h, l, s = hls(rgb)
    return 0.07 <= l <= 0.42 and s < 0.26


def ist_warm(rgb):
    """Haare und Haut: warme, gesättigte Töne."""
    h, l, s = hls(rgb)
    return 0.12 <= l <= 0.82 and s >= 0.28 and (h * 360 <= 45 or h * 360 >= 345)


def ist_effekt(rgb):
    """Blaue Energie-Effekte (Schlag, Strahl, Treffer)."""
    h, l, s = hls(rgb)
    return 170 <= h * 360 <= 250 and s > 0.35


def umfaerben(bild, farbe, kopf):
    """Färbt die Kleidung um. Der Kopf bleibt aus - dunkle Haarschatten sehen
    sonst aus wie Kleidung und würden mitgefärbt."""
    ton, satt, hell, dunkel = farbe
    px = bild.load()
    for y in range(bild.height):
        for x in range(bild.width):
            r, g, b, a = px[x, y]
            if a == 0 or not ist_kleidung((r, g, b)) or im_kopf(kopf, x, y):
                continue
            _, l, _ = hls((r, g, b))
            anteil = (l - 0.07) / 0.35  # 0 = dunkelster, 1 = hellster Kleidungston
            neu_l = dunkel + anteil * (hell - dunkel)
            nr, ng, nb = colorsys.hls_to_rgb(ton / 360, neu_l, satt)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)


def kopf_finden(bild):
    """Oberste Haarstelle, Mitte und Breite des Kopfes."""
    px = bild.load()
    figur = [(x, y) for y in range(bild.height) for x in range(bild.width)
             if px[x, y][3] > 0 and not ist_effekt(px[x, y][:3])]
    oben = min(y for _, y in figur)
    unten = max(y for _, y in figur)
    hoehe = unten - oben
    warm = [(x, y) for x, y in figur if ist_warm(px[x, y][:3])]
    spitze = min(y for _, y in warm)

    def spanne(von, bis, rand=0.04):
        xs = sorted(x for x, y in warm if von <= y <= bis)
        return xs[int(len(xs) * rand)], xs[int(len(xs) * (1 - rand)) - 1]

    # Grobe Breite über ein Band unterhalb der Haarspitzen ...
    links, rechts = spanne(spitze + hoehe * 0.03, spitze + hoehe * 0.12)
    breite = rechts - links + 1
    # ... dann die erste Zeile mit DICHTEM Haar - einzelne Strähnen zählen nicht.
    zeilen = {}
    for _, y in warm:
        zeilen[y] = zeilen.get(y, 0) + 1
    y0 = next(y for y in range(spitze, unten) if zeilen.get(y, 0) >= breite * 0.35)
    # Und die Breite noch einmal genauer, über den oberen Teil des Kopfes.
    links, rechts = spanne(y0, y0 + breite * 0.45, 0.03)
    return {'y0': y0, 'mitte': (links + rechts) / 2, 'breite': rechts - links + 1}


def im_kopf(kopf, x, y):
    """Liegt ein Punkt im (ungefähren) Kopf? Eine Ellipse um die Haare."""
    rx = kopf['breite'] * 0.62
    ry = kopf['breite'] * 0.55
    cy = kopf['y0'] + kopf['breite'] * 0.30
    return ((x - kopf['mitte']) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1


# ---------------------------------------------------------------------------
# Kopfbedeckungen. Jede bekommt einen Zeichner (ImageDraw), die Kopfmitte cx,
# die oberste Haarstelle y0 und die Kopfbreite u - alle Maße sind Anteile
# von u, damit es in jeder Bildgröße passt.
# ---------------------------------------------------------------------------

def rgb(hexwert):
    hexwert = hexwert.lstrip('#')
    return tuple(int(hexwert[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def ellipse(d, cx, cy, rx, ry, farbe):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=farbe)


def stern(d, x, y, r, farbe):
    r = max(1, round(r))
    d.line([x - r, y, x + r, y], fill=farbe)
    d.line([x, y - r, x, y + r], fill=farbe)


def wintermuetze(d, cx, y0, u):
    rot, rot_hell, rot_dunkel = rgb('#d8323c'), rgb('#f2606a'), rgb('#9c1f2a')
    weiss, grau = rgb('#f4f1ec'), rgb('#c9c3bd')
    unten = y0 + 0.40 * u
    # Kappe: halbe Ellipse über dem Kopf.
    d.pieslice([cx - 0.52 * u, y0 - 0.20 * u, cx + 0.52 * u, unten + 0.30 * u], 180, 360, fill=rot)
    d.pieslice([cx - 0.40 * u, y0 - 0.14 * u, cx + 0.22 * u, unten + 0.10 * u], 200, 290, fill=rot_hell)
    # Rippen der Mütze.
    for i in range(-3, 4):
        x = cx + i * 0.12 * u
        d.line([x, y0 + 0.02 * u + abs(i) * 0.03 * u, x, unten - 0.02 * u], fill=rot_dunkel)
    # Umschlag.
    d.rounded_rectangle([cx - 0.55 * u, unten - 0.04 * u, cx + 0.55 * u, unten + 0.12 * u],
                        radius=max(1, 0.04 * u), fill=weiss)
    d.line([cx - 0.52 * u, unten + 0.10 * u, cx + 0.52 * u, unten + 0.10 * u], fill=grau)
    # Bommel.
    ellipse(d, cx, y0 - 0.20 * u, 0.15 * u, 0.15 * u, weiss)
    ellipse(d, cx + 0.04 * u, y0 - 0.16 * u, 0.07 * u, 0.07 * u, grau)


def krone(d, cx, y0, u):
    gold, gold_hell, gold_dunkel = rgb('#ffc93d'), rgb('#fff09a'), rgb('#c98a12')
    rubin, saphir = rgb('#e0294a'), rgb('#3a8cff')
    unten = y0 + 0.16 * u
    b = 0.42 * u
    zacken = [(cx - b, unten), (cx - b, y0 - 0.12 * u), (cx - b * 0.55, y0 + 0.02 * u),
              (cx - b * 0.3, y0 - 0.30 * u), (cx, y0 - 0.02 * u), (cx + b * 0.3, y0 - 0.30 * u),
              (cx + b * 0.55, y0 + 0.02 * u), (cx + b, y0 - 0.12 * u), (cx + b, unten)]
    d.polygon(zacken, fill=gold)
    d.rectangle([cx - b, unten - 0.12 * u, cx + b, unten], fill=gold_dunkel)
    d.line([cx - b + 1, unten - 0.12 * u, cx + b - 1, unten - 0.12 * u], fill=gold_hell)
    d.line([cx - b * 0.3, y0 - 0.24 * u, cx - b * 0.3, y0 - 0.02 * u], fill=gold_hell)
    for x, y in [(cx - b, y0 - 0.12 * u), (cx - b * 0.3, y0 - 0.30 * u), (cx + b * 0.3, y0 - 0.30 * u), (cx + b, y0 - 0.12 * u)]:
        ellipse(d, x, y, max(1, 0.04 * u), max(1, 0.04 * u), gold_hell)
    ellipse(d, cx, unten - 0.06 * u, 0.06 * u, 0.045 * u, rubin)
    ellipse(d, cx - b * 0.62, unten - 0.06 * u, 0.04 * u, 0.035 * u, saphir)
    ellipse(d, cx + b * 0.62, unten - 0.06 * u, 0.04 * u, 0.035 * u, saphir)


def zauberhut(d, cx, y0, u):
    lila, lila_hell, lila_dunkel = rgb('#6b3fc9'), rgb('#9a72ef'), rgb('#3f2287')
    gelb = rgb('#ffe066')
    krempe = y0 + 0.20 * u
    spitze = (cx + 0.30 * u, y0 - 1.05 * u)
    knick = (cx + 0.05 * u, y0 - 0.55 * u)
    d.polygon([(cx - 0.42 * u, krempe), knick, spitze, (cx + 0.18 * u, y0 - 0.50 * u), (cx + 0.40 * u, krempe)], fill=lila)
    d.polygon([(cx - 0.42 * u, krempe), knick, (cx - 0.05 * u, y0 - 0.50 * u), (cx - 0.22 * u, krempe)], fill=lila_hell)
    ellipse(d, cx, krempe, 0.70 * u, 0.12 * u, lila_dunkel)
    ellipse(d, cx, krempe - 0.03 * u, 0.62 * u, 0.07 * u, lila)
    d.rectangle([cx - 0.40 * u, krempe - 0.16 * u, cx + 0.40 * u, krempe - 0.08 * u], fill=gelb)
    for x, y, r in [(cx - 0.10 * u, y0 - 0.25 * u, 0.06 * u), (cx + 0.18 * u, y0 - 0.05 * u, 0.05 * u),
                    (cx + 0.16 * u, y0 - 0.62 * u, 0.04 * u)]:
        stern(d, x, y, r, gelb)


def cowboyhut(d, cx, y0, u):
    braun, braun_hell, braun_dunkel = rgb('#9a6233'), rgb('#c48a52'), rgb('#5e3818')
    band = rgb('#2b1a10')
    krempe = y0 + 0.20 * u
    # Krone mit Delle oben.
    d.polygon([(cx - 0.40 * u, krempe), (cx - 0.36 * u, y0 - 0.34 * u), (cx - 0.12 * u, y0 - 0.40 * u),
               (cx, y0 - 0.30 * u), (cx + 0.12 * u, y0 - 0.40 * u), (cx + 0.36 * u, y0 - 0.34 * u),
               (cx + 0.40 * u, krempe)], fill=braun)
    d.polygon([(cx - 0.36 * u, krempe), (cx - 0.32 * u, y0 - 0.30 * u), (cx - 0.14 * u, y0 - 0.34 * u),
               (cx - 0.16 * u, krempe)], fill=braun_hell)
    d.rectangle([cx - 0.40 * u, krempe - 0.14 * u, cx + 0.40 * u, krempe - 0.04 * u], fill=band)
    # Breite, nach oben geschwungene Krempe.
    d.polygon([(cx - 0.80 * u, krempe - 0.14 * u), (cx - 0.55 * u, krempe + 0.04 * u), (cx + 0.55 * u, krempe + 0.04 * u),
               (cx + 0.80 * u, krempe - 0.14 * u), (cx + 0.62 * u, krempe + 0.12 * u), (cx - 0.62 * u, krempe + 0.12 * u)],
              fill=braun_dunkel)
    d.line([cx - 0.55 * u, krempe + 0.04 * u, cx + 0.55 * u, krempe + 0.04 * u], fill=braun_hell)


def wikingerhelm(d, cx, y0, u):
    metall, metall_hell, metall_dunkel = rgb('#9aa6b5'), rgb('#dfe7f0'), rgb('#5d6878')
    horn, horn_dunkel = rgb('#f1e4c4'), rgb('#bba57a')
    unten = y0 + 0.34 * u
    # Hörner zuerst - der Helm liegt davor.
    for seite in (-1, 1):
        d.polygon([(cx + seite * 0.38 * u, unten - 0.12 * u), (cx + seite * 0.62 * u, unten - 0.26 * u),
                   (cx + seite * 0.78 * u, y0 - 0.30 * u), (cx + seite * 0.66 * u, y0 - 0.06 * u),
                   (cx + seite * 0.44 * u, unten - 0.30 * u)], fill=horn)
        d.line([cx + seite * 0.62 * u, unten - 0.24 * u, cx + seite * 0.74 * u, y0 - 0.20 * u], fill=horn_dunkel)
    d.pieslice([cx - 0.50 * u, y0 - 0.18 * u, cx + 0.50 * u, unten + 0.34 * u], 180, 360, fill=metall)
    d.pieslice([cx - 0.40 * u, y0 - 0.12 * u, cx + 0.10 * u, unten + 0.10 * u], 200, 280, fill=metall_hell)
    d.rectangle([cx - 0.52 * u, unten, cx + 0.52 * u, unten + 0.10 * u], fill=metall_dunkel)
    d.rectangle([cx - 0.05 * u, y0 - 0.16 * u, cx + 0.05 * u, unten], fill=metall_dunkel)
    for i in range(-2, 3):
        ellipse(d, cx + i * 0.2 * u, unten + 0.05 * u, max(1, 0.025 * u), max(1, 0.025 * u), metall_hell)


def stirnband(d, cx, y0, u, farbe, hell, baender):
    oben = y0 + 0.24 * u
    d.rectangle([cx - 0.52 * u, oben, cx + 0.52 * u, oben + 0.13 * u], fill=farbe)
    d.line([cx - 0.50 * u, oben + 0.02 * u, cx + 0.50 * u, oben + 0.02 * u], fill=hell)
    if baender:
        # Zwei Bandenden flattern nach links weg.
        x = cx - 0.50 * u
        d.polygon([(x, oben + 0.02 * u), (x - 0.45 * u, oben - 0.10 * u), (x - 0.38 * u, oben + 0.06 * u), (x, oben + 0.11 * u)], fill=farbe)
        d.polygon([(x, oben + 0.06 * u), (x - 0.40 * u, oben + 0.22 * u), (x - 0.30 * u, oben + 0.30 * u), (x, oben + 0.13 * u)], fill=farbe)


def ninjaband(d, cx, y0, u):
    stirnband(d, cx, y0, u, rgb('#d8283a'), rgb('#ff6a78'), True)


def schweissband(d, cx, y0, u):
    stirnband(d, cx, y0, u, rgb('#f6f6f6'), rgb('#ffffff'), False)
    oben = y0 + 0.24 * u
    d.rectangle([cx - 0.52 * u, oben + 0.05 * u, cx + 0.52 * u, oben + 0.08 * u], fill=rgb('#2f7bff'))


HUETE = {
    'wintermuetze': wintermuetze,
    'krone': krone,
    'zauberhut': zauberhut,
    'cowboyhut': cowboyhut,
    'wikingerhelm': wikingerhelm,
    'ninjaband': ninjaband,
    'schweissband': schweissband,
}


# Platz über dem Kopf - als Anteil der Bildhöhe, für ALLE Skin-Bilder gleich.
# Das Spiel zeigt Skin-Bilder genau um diesen Anteil höher an
# (.pixel-sprite--hut in css/ui.css). So bleibt Timo gleich groß, und der Hut
# ragt einfach nach oben über den Rand. Ändern = auch dort ändern!
HUT_RAUM = 0.35


def hut_aufsetzen(bild, hut, kopf):
    """Setzt die Figur unter einen festen Hutraum und zeichnet den Hut mit Kontur."""
    raum = round(bild.height * HUT_RAUM)
    ebene = Image.new('RGBA', (bild.width, bild.height + raum), (0, 0, 0, 0))
    d = ImageDraw.Draw(ebene)
    HUETE[hut](d, kopf['mitte'], kopf['y0'] + raum, kopf['breite'] * 1.08)

    # Kontur: jedes leere Feld neben dem Hut wird dunkel.
    px = ebene.load()
    kontur = []
    for y in range(ebene.height):
        for x in range(ebene.width):
            if px[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < ebene.width and 0 <= ny < ebene.height and px[nx, ny][3]:
                    kontur.append((x, y))
                    break
    for x, y in kontur:
        px[x, y] = KONTUR

    ganz = Image.new('RGBA', ebene.size, (0, 0, 0, 0))
    ganz.paste(bild, (0, raum))
    ganz.alpha_composite(ebene)
    return ganz


def mit_palette(bild):
    """Speichert wie die Originale mit Farbpalette - so bleiben die Dateien
    klein. Feld 0 der Palette ist "durchsichtig". Halbdurchsichtige Pixel
    gibt es in der Pixelgrafik nicht; sie werden voll oder leer."""
    farben = {}
    px = bild.load()
    for y in range(bild.height):
        for x in range(bild.width):
            r, g, b, a = px[x, y]
            if a >= 128:
                farben.setdefault((r, g, b), len(farben) + 1)
    if len(farben) > 255:
        raise SystemExit(f'Zu viele Farben ({len(farben)}) für eine Palette')
    neu = Image.new('P', bild.size, 0)
    palette = [0, 0, 0]
    for farbe in farben:
        palette.extend(farbe)
    neu.putpalette(palette + [0] * (768 - len(palette)))
    npx = neu.load()
    for y in range(bild.height):
        for x in range(bild.width):
            r, g, b, a = px[x, y]
            if a >= 128:
                npx[x, y] = farben[(r, g, b)]
    return neu


def bauen(name, skin):
    ordner = os.path.join(ZIEL, name)
    os.makedirs(ordner, exist_ok=True)
    for pose in POSEN:
        original = Image.open(os.path.join(QUELLE, f'{pose}.png')).convert('RGBA')
        # Den Kopf im ORIGINAL suchen - rot gefärbte Kleidung sähe sonst aus wie Haare.
        kopf_pose = KOPF_WIE.get(pose, pose)
        kopf = kopf_finden(Image.open(os.path.join(QUELLE, f'{kopf_pose}.png')).convert('RGBA'))
        bild = original.copy()
        umfaerben(bild, skin['kleidung'], kopf)
        bild = hut_aufsetzen(bild, skin['hut'], kopf)
        mit_palette(bild).save(os.path.join(ordner, f'{pose}.png'), optimize=True, transparency=0)


def vorschau(ziel):
    reihen = []
    for name in SKINS:
        bilder = [Image.open(os.path.join(ZIEL, name, f'{p}.png')) for p in ('front', 'stand', 'schlag-2', 'strahl-3', 'treffer-3')]
        reihen.append(bilder)
    breite = max(sum(b.width + 8 for b in r) for r in reihen)
    hoehe = sum(max(b.height for b in r) + 8 for r in reihen)
    blatt = Image.new('RGBA', (breite, hoehe), (96, 150, 96, 255))
    y = 0
    for r in reihen:
        h = max(b.height for b in r)
        x = 0
        for b in r:
            blatt.alpha_composite(b, (x, y + h - b.height))
            x += b.width + 8
        y += h + 8
    blatt.save(ziel)


def liste_schreiben():
    zeilen = [
        '/**',
        ' * Die Bilder der Outfit-Skins von Timo - je Skin-Ordner eine Liste in',
        ' * der Reihenfolge von SKIN_POSEN.',
        ' *',
        ' * NICHT VON HAND ÄNDERN: erzeugt von werkzeuge/timo-skins-bauen.py.',
        ' * Jeder Pfad steht ausgeschrieben da, damit die Einzeldatei-Version',
        ' * (werkzeuge/eine-datei-bauen.mjs) die Bilder findet und einbettet.',
        ' */',
        '',
        'export const SKIN_POSEN = [' + ', '.join(f"'{p}'" for p in POSEN) + '];',
        '',
        'export const SKIN_BILDER = {',
    ]
    for name in SKINS:
        zeilen.append(f'  {name}: [')
        zeilen.extend(f"    'bilder/timo/skins/{name}/{p}.png'," for p in POSEN)
        zeilen.append('  ],')
    zeilen.append('};')
    with open('js/data/timo-skins.js', 'w', encoding='utf-8') as datei:
        datei.write('\n'.join(zeilen) + '\n')


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--vorschau':
        vorschau(sys.argv[2])
    else:
        for name, skin in SKINS.items():
            bauen(name, skin)
            print('gebaut:', name)
        liste_schreiben()
        print('geschrieben: js/data/timo-skins.js')
