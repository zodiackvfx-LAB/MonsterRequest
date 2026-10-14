/**
 * Outfits für Timo bauen: Kleidung umfärben und eine Kopfbedeckung aufsetzen.
 *
 * Dieselbe Idee wie werkzeuge/timo-skins-bauen.py - nur in JavaScript, damit
 * die Skin-Werkstatt (werkstatt.html) direkt im Browser Outfits bauen kann.
 *
 * Diese Datei kennt kein HTML. Sie rechnet nur auf Pixeln: Hinein kommen die
 * Originalbilder als ImageData-ähnliche Objekte { width, height, data },
 * heraus kommen neue Bilder derselben Art - oben um HUT_RAUM höher, damit der
 * Hut Platz hat (siehe .pixel-sprite--hut in css/ui.css).
 *
 * Ein Rezept beschreibt ein Outfit:
 *   { kleidung: '#3a7bd5', helligkeit: 0, hut: 'krone', hutFarbe: '#ffc93d' }
 *     kleidung   - Grundfarbe für Jacke und Hose (null = Originalkleidung)
 *     helligkeit - -0.2 (dunkler) bis 0.2 (heller)
 *     hut        - Schlüssel aus HUETE (oder 'keiner')
 *     hutFarbe   - Hauptfarbe des Huts (null = seine eigene)
 */

/** Platz über dem Kopf - genau wie im Python-Werkzeug und in css/ui.css. */
export const HUT_RAUM = 0.35;

/** Die Posen in der Reihenfolge, in der das Spiel sie kennt. */
export const POSEN = [
  'front', 'stand',
  'schlag-1', 'schlag-2', 'schlag-3', 'schlag-4',
  'strahl-1', 'strahl-2', 'strahl-3', 'strahl-4',
  'treffer-1', 'treffer-2', 'treffer-3', 'treffer-4',
];

/** In diesen Posen leuchtet der Kopf im Energieblitz - Kopf aus der Pose davor nehmen. */
const KOPF_WIE = { 'schlag-3': 'schlag-2', 'strahl-3': 'strahl-2', 'strahl-4': 'strahl-2' };

const KONTUR = [18, 14, 20, 255];

/* ------------------------------------------------------------------ */
/*  Farben                                                             */
/* ------------------------------------------------------------------ */

/** RGB (0-255) -> [Farbton 0-1, Helligkeit 0-1, Sättigung 0-1] wie Pythons colorsys. */
export function rgbZuHls(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, l, 0];
  const d = max - min;
  const s = l <= 0.5 ? d / (max + min) : d / (2 - max - min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, l, s];
}

export function hlsZuRgb(h, l, s) {
  if (s === 0) return [l * 255, l * 255, l * 255].map(Math.round);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const kanal = (t) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [kanal(h + 1 / 3), kanal(h), kanal(h - 1 / 3)].map((v) => Math.round(v * 255));
}

function hexZuRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** Eine Farbe heller oder dunkler machen (für Licht und Schatten am Hut). */
function schattiert(hex, um) {
  const [h, l, s] = rgbZuHls(...hexZuRgb(hex));
  return [...hlsZuRgb(h, Math.max(0, Math.min(1, l + um)), s), 255];
}

const farbe = (hex) => [...hexZuRgb(hex), 255];

/** Grundfarbe + Helligkeit -> Farbton, Sättigung und der Bereich hell..dunkel. */
export function kleidungAusFarbe(hex, helligkeit = 0) {
  const [h, l, s] = rgbZuHls(...hexZuRgb(hex));
  const mitte = Math.max(0.12, Math.min(0.75, l + helligkeit));
  return {
    ton: h,
    satt: s,
    hell: Math.min(0.95, mitte + 0.25),
    dunkel: Math.max(0.03, mitte - 0.25),
  };
}

/* ------------------------------------------------------------------ */
/*  Pixel einordnen                                                    */
/* ------------------------------------------------------------------ */

/** Dunkle, fast farblose Töne - Jacke, Hose, Tasche. Nicht die Kontur. */
function istKleidung(r, g, b) {
  const [, l, s] = rgbZuHls(r, g, b);
  return l >= 0.07 && l <= 0.42 && s < 0.26;
}

/** Haare und Haut: warme, gesättigte Töne. */
function istWarm(r, g, b) {
  const [h, l, s] = rgbZuHls(r, g, b);
  return l >= 0.12 && l <= 0.82 && s >= 0.28 && (h * 360 <= 45 || h * 360 >= 345);
}

/** Blaue Energie-Effekte. */
function istEffekt(r, g, b) {
  const [h, , s] = rgbZuHls(r, g, b);
  return h * 360 >= 170 && h * 360 <= 250 && s > 0.35;
}

/** Oberste dichte Haarstelle, Mitte und Breite des Kopfes. */
export function kopfFinden(bild) {
  const { width: w, height: hoehe, data } = bild;
  let oben = Infinity;
  let unten = -Infinity;
  const warm = [];
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!data[i + 3]) continue;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (istEffekt(r, g, b)) continue;
      oben = Math.min(oben, y);
      unten = Math.max(unten, y);
      if (istWarm(r, g, b)) warm.push([x, y]);
    }
  }
  const figur = unten - oben;
  const spitze = Math.min(...warm.map(([, y]) => y));

  const spanne = (von, bis, rand = 0.04) => {
    const xs = warm.filter(([, y]) => y >= von && y <= bis).map(([x]) => x).sort((a, b) => a - b);
    return [xs[Math.floor(xs.length * rand)], xs[Math.floor(xs.length * (1 - rand)) - 1]];
  };

  let [links, rechts] = spanne(spitze + figur * 0.03, spitze + figur * 0.12);
  const breite = rechts - links + 1;
  const zeilen = new Map();
  warm.forEach(([, y]) => zeilen.set(y, (zeilen.get(y) ?? 0) + 1));
  let y0 = spitze;
  for (let y = spitze; y < unten; y++) {
    if ((zeilen.get(y) ?? 0) >= breite * 0.35) {
      y0 = y;
      break;
    }
  }
  [links, rechts] = spanne(y0, y0 + breite * 0.45, 0.03);
  return { y0, mitte: (links + rechts) / 2, breite: rechts - links + 1 };
}

function imKopf(kopf, x, y) {
  const rx = kopf.breite * 0.62;
  const ry = kopf.breite * 0.55;
  const cy = kopf.y0 + kopf.breite * 0.3;
  return ((x - kopf.mitte) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

/* ------------------------------------------------------------------ */
/*  Kleines Pixel-Malprogramm - ohne weiche Kanten                      */
/* ------------------------------------------------------------------ */

function leinwand(w, h) {
  return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
}

function setze(l, x, y, f) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= l.width || y >= l.height) return;
  const i = (y * l.width + x) * 4;
  l.data[i] = f[0]; l.data[i + 1] = f[1]; l.data[i + 2] = f[2]; l.data[i + 3] = f[3];
}

/** Füllt alle Pixel in einem Rahmen, für die test(x, y) stimmt. */
function fuelle(l, x0, y0, x1, y1, f, test) {
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      if (test(x, y)) setze(l, x, y, f);
    }
  }
}

function rechteck(l, x0, y0, x1, y1, f) {
  fuelle(l, x0, y0, x1, y1, f, (x, y) => x >= Math.round(x0) && x <= Math.round(x1) && y >= Math.round(y0) && y <= Math.round(y1));
}

function ellipse(l, cx, cy, rx, ry, f) {
  rx = Math.max(rx, 0.5);
  ry = Math.max(ry, 0.5);
  fuelle(l, cx - rx, cy - ry, cx + rx, cy + ry, f, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
}

/** Tortenstück wie bei PIL: Winkel in Grad, 0 = rechts, im Uhrzeigersinn. */
function tortenstueck(l, x0, y0, x1, y1, start, ende, f) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = Math.max((x1 - x0) / 2, 0.5);
  const ry = Math.max((y1 - y0) / 2, 0.5);
  fuelle(l, x0, y0, x1, y1, f, (x, y) => {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) return false;
    const winkel = ((Math.atan2(y - cy, x - cx) * 180) / Math.PI + 360) % 360;
    return winkel >= start && winkel <= ende;
  });
}

function vieleck(l, punkte, f) {
  const xs = punkte.map((p) => p[0]);
  const ys = punkte.map((p) => p[1]);
  fuelle(l, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), f, (x, y) => {
    let drin = false;
    for (let i = 0, j = punkte.length - 1; i < punkte.length; j = i++) {
      const [xi, yi] = punkte[i];
      const [xj, yj] = punkte[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) drin = !drin;
    }
    return drin;
  });
}

function linie(l, x0, y0, x1, y1, f) {
  const schritte = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= schritte; i++) {
    setze(l, x0 + ((x1 - x0) * i) / schritte, y0 + ((y1 - y0) * i) / schritte, f);
  }
}

function stern(l, x, y, r, f) {
  r = Math.max(1, Math.round(r));
  linie(l, x - r, y, x + r, y, f);
  linie(l, x, y - r, x, y + r, f);
}

/* ------------------------------------------------------------------ */
/*  Kopfbedeckungen                                                    */
/*  Jede bekommt: Leinwand, Kopfmitte cx, oberste Haarstelle y0,        */
/*  Kopfbreite u und ihre Hauptfarbe. Maße sind Anteile von u.          */
/* ------------------------------------------------------------------ */

export const HUETE = {
  keiner: { name: 'Kein Hut', icon: '🚫', farbe: null, malen: () => {} },

  wintermuetze: {
    name: 'Bommelmütze', icon: '🧶', farbe: '#d8323c',
    malen(l, cx, y0, u, haupt) {
      const [rot, hell, dunkel] = [farbe(haupt), schattiert(haupt, 0.14), schattiert(haupt, -0.14)];
      const weiss = farbe('#f4f1ec');
      const grau = farbe('#c9c3bd');
      const unten = y0 + 0.4 * u;
      tortenstueck(l, cx - 0.52 * u, y0 - 0.2 * u, cx + 0.52 * u, unten + 0.3 * u, 180, 360, rot);
      tortenstueck(l, cx - 0.4 * u, y0 - 0.14 * u, cx + 0.22 * u, unten + 0.1 * u, 200, 290, hell);
      for (let i = -3; i <= 3; i++) {
        const x = cx + i * 0.12 * u;
        linie(l, x, y0 + 0.02 * u + Math.abs(i) * 0.03 * u, x, unten - 0.02 * u, dunkel);
      }
      rechteck(l, cx - 0.55 * u, unten - 0.04 * u, cx + 0.55 * u, unten + 0.12 * u, weiss);
      linie(l, cx - 0.52 * u, unten + 0.1 * u, cx + 0.52 * u, unten + 0.1 * u, grau);
      ellipse(l, cx, y0 - 0.2 * u, 0.15 * u, 0.15 * u, weiss);
      ellipse(l, cx + 0.04 * u, y0 - 0.16 * u, 0.07 * u, 0.07 * u, grau);
    },
  },

  krone: {
    name: 'Krone', icon: '👑', farbe: '#ffc93d',
    malen(l, cx, y0, u, haupt) {
      const [gold, hell, dunkel] = [farbe(haupt), schattiert(haupt, 0.2), schattiert(haupt, -0.2)];
      const unten = y0 + 0.16 * u;
      const b = 0.42 * u;
      vieleck(l, [[cx - b, unten], [cx - b, y0 - 0.12 * u], [cx - b * 0.55, y0 + 0.02 * u],
        [cx - b * 0.3, y0 - 0.3 * u], [cx, y0 - 0.02 * u], [cx + b * 0.3, y0 - 0.3 * u],
        [cx + b * 0.55, y0 + 0.02 * u], [cx + b, y0 - 0.12 * u], [cx + b, unten]], gold);
      rechteck(l, cx - b, unten - 0.12 * u, cx + b, unten, dunkel);
      linie(l, cx - b + 1, unten - 0.12 * u, cx + b - 1, unten - 0.12 * u, hell);
      [[cx - b, y0 - 0.12 * u], [cx - b * 0.3, y0 - 0.3 * u], [cx + b * 0.3, y0 - 0.3 * u], [cx + b, y0 - 0.12 * u]]
        .forEach(([x, y]) => ellipse(l, x, y, Math.max(1, 0.04 * u), Math.max(1, 0.04 * u), hell));
      ellipse(l, cx, unten - 0.06 * u, 0.06 * u, 0.045 * u, farbe('#e0294a'));
      ellipse(l, cx - b * 0.62, unten - 0.06 * u, 0.04 * u, 0.035 * u, farbe('#3a8cff'));
      ellipse(l, cx + b * 0.62, unten - 0.06 * u, 0.04 * u, 0.035 * u, farbe('#3a8cff'));
    },
  },

  zauberhut: {
    name: 'Zauberhut', icon: '🧙', farbe: '#6b3fc9',
    malen(l, cx, y0, u, haupt) {
      const [lila, hell, dunkel] = [farbe(haupt), schattiert(haupt, 0.15), schattiert(haupt, -0.15)];
      const gelb = farbe('#ffe066');
      const krempe = y0 + 0.2 * u;
      const knick = [cx + 0.05 * u, y0 - 0.55 * u];
      vieleck(l, [[cx - 0.42 * u, krempe], knick, [cx + 0.3 * u, y0 - 1.05 * u], [cx + 0.18 * u, y0 - 0.5 * u], [cx + 0.4 * u, krempe]], lila);
      vieleck(l, [[cx - 0.42 * u, krempe], knick, [cx - 0.05 * u, y0 - 0.5 * u], [cx - 0.22 * u, krempe]], hell);
      ellipse(l, cx, krempe, 0.7 * u, 0.12 * u, dunkel);
      ellipse(l, cx, krempe - 0.03 * u, 0.62 * u, 0.07 * u, lila);
      rechteck(l, cx - 0.4 * u, krempe - 0.16 * u, cx + 0.4 * u, krempe - 0.08 * u, gelb);
      stern(l, cx - 0.1 * u, y0 - 0.25 * u, 0.06 * u, gelb);
      stern(l, cx + 0.18 * u, y0 - 0.05 * u, 0.05 * u, gelb);
      stern(l, cx + 0.16 * u, y0 - 0.62 * u, 0.04 * u, gelb);
    },
  },

  cowboyhut: {
    name: 'Cowboyhut', icon: '🤠', farbe: '#9a6233',
    malen(l, cx, y0, u, haupt) {
      const [braun, hell, dunkel] = [farbe(haupt), schattiert(haupt, 0.12), schattiert(haupt, -0.14)];
      const band = farbe('#2b1a10');
      const krempe = y0 + 0.2 * u;
      vieleck(l, [[cx - 0.4 * u, krempe], [cx - 0.36 * u, y0 - 0.34 * u], [cx - 0.12 * u, y0 - 0.4 * u],
        [cx, y0 - 0.3 * u], [cx + 0.12 * u, y0 - 0.4 * u], [cx + 0.36 * u, y0 - 0.34 * u], [cx + 0.4 * u, krempe]], braun);
      vieleck(l, [[cx - 0.36 * u, krempe], [cx - 0.32 * u, y0 - 0.3 * u], [cx - 0.14 * u, y0 - 0.34 * u], [cx - 0.16 * u, krempe]], hell);
      rechteck(l, cx - 0.4 * u, krempe - 0.14 * u, cx + 0.4 * u, krempe - 0.04 * u, band);
      vieleck(l, [[cx - 0.8 * u, krempe - 0.14 * u], [cx - 0.55 * u, krempe + 0.04 * u], [cx + 0.55 * u, krempe + 0.04 * u],
        [cx + 0.8 * u, krempe - 0.14 * u], [cx + 0.62 * u, krempe + 0.12 * u], [cx - 0.62 * u, krempe + 0.12 * u]], dunkel);
      linie(l, cx - 0.55 * u, krempe + 0.04 * u, cx + 0.55 * u, krempe + 0.04 * u, hell);
    },
  },

  wikingerhelm: {
    name: 'Wikingerhelm', icon: '⚔️', farbe: '#9aa6b5',
    malen(l, cx, y0, u, haupt) {
      const [metall, hell, dunkel] = [farbe(haupt), schattiert(haupt, 0.2), schattiert(haupt, -0.2)];
      const horn = farbe('#f1e4c4');
      const hornDunkel = farbe('#bba57a');
      const unten = y0 + 0.34 * u;
      [-1, 1].forEach((s) => {
        vieleck(l, [[cx + s * 0.38 * u, unten - 0.12 * u], [cx + s * 0.62 * u, unten - 0.26 * u],
          [cx + s * 0.78 * u, y0 - 0.3 * u], [cx + s * 0.66 * u, y0 - 0.06 * u], [cx + s * 0.44 * u, unten - 0.3 * u]], horn);
        linie(l, cx + s * 0.62 * u, unten - 0.24 * u, cx + s * 0.74 * u, y0 - 0.2 * u, hornDunkel);
      });
      tortenstueck(l, cx - 0.5 * u, y0 - 0.18 * u, cx + 0.5 * u, unten + 0.34 * u, 180, 360, metall);
      tortenstueck(l, cx - 0.4 * u, y0 - 0.12 * u, cx + 0.1 * u, unten + 0.1 * u, 200, 280, hell);
      rechteck(l, cx - 0.52 * u, unten, cx + 0.52 * u, unten + 0.1 * u, dunkel);
      rechteck(l, cx - 0.05 * u, y0 - 0.16 * u, cx + 0.05 * u, unten, dunkel);
      for (let i = -2; i <= 2; i++) ellipse(l, cx + i * 0.2 * u, unten + 0.05 * u, Math.max(1, 0.025 * u), Math.max(1, 0.025 * u), hell);
    },
  },

  ninjaband: {
    name: 'Ninja-Band', icon: '🥷', farbe: '#d8283a',
    malen(l, cx, y0, u, haupt) {
      stirnband(l, cx, y0, u, farbe(haupt), schattiert(haupt, 0.15), true);
    },
  },

  schweissband: {
    name: 'Schweißband', icon: '🏃', farbe: '#2f7bff',
    malen(l, cx, y0, u, haupt) {
      stirnband(l, cx, y0, u, farbe('#f6f6f6'), farbe('#ffffff'), false);
      const oben = y0 + 0.24 * u;
      rechteck(l, cx - 0.52 * u, oben + 0.05 * u, cx + 0.52 * u, oben + 0.08 * u, farbe(haupt));
    },
  },

  partyhut: {
    name: 'Partyhut', icon: '🎉', farbe: '#ff4fa3',
    malen(l, cx, y0, u, haupt) {
      const grund = farbe(haupt);
      const streifen = farbe('#ffe066');
      const basis = y0 + 0.14 * u;
      const spitze = y0 - 0.8 * u;
      vieleck(l, [[cx - 0.32 * u, basis], [cx, spitze], [cx + 0.32 * u, basis]], grund);
      // Schräge Streifen: nur innerhalb des Kegels.
      const breiteBei = (y) => (0.32 * u * (y - spitze)) / (basis - spitze);
      for (let k = 0; k < 3; k++) {
        const ymitte = spitze + (basis - spitze) * (0.3 + k * 0.25);
        for (let y = Math.round(ymitte - 0.05 * u); y <= Math.round(ymitte + 0.05 * u); y++) {
          const halb = breiteBei(y);
          linie(l, cx - halb + 1, y, cx + halb - 1, y, streifen);
        }
      }
      ellipse(l, cx, spitze, 0.1 * u, 0.1 * u, streifen);
      rechteck(l, cx - 0.34 * u, basis - 0.04 * u, cx + 0.34 * u, basis + 0.02 * u, schattiert(haupt, -0.18));
    },
  },

  piratenhut: {
    name: 'Piratenhut', icon: '🏴‍☠️', farbe: '#2a2a33',
    malen(l, cx, y0, u, haupt) {
      const hut = farbe(haupt);
      const gold = farbe('#e8b84a');
      const weiss = farbe('#f4f1ec');
      vieleck(l, [[cx - 0.66 * u, y0 + 0.2 * u], [cx - 0.58 * u, y0 - 0.28 * u], [cx - 0.3 * u, y0 - 0.1 * u],
        [cx, y0 - 0.36 * u], [cx + 0.3 * u, y0 - 0.1 * u], [cx + 0.58 * u, y0 - 0.28 * u],
        [cx + 0.66 * u, y0 + 0.2 * u], [cx, y0 + 0.1 * u]], hut);
      linie(l, cx - 0.62 * u, y0 + 0.17 * u, cx, y0 + 0.08 * u, gold);
      linie(l, cx, y0 + 0.08 * u, cx + 0.62 * u, y0 + 0.17 * u, gold);
      // Totenkopf mit gekreuzten Knochen.
      linie(l, cx - 0.14 * u, y0 - 0.2 * u, cx + 0.14 * u, y0 + 0.04 * u, weiss);
      linie(l, cx + 0.14 * u, y0 - 0.2 * u, cx - 0.14 * u, y0 + 0.04 * u, weiss);
      ellipse(l, cx, y0 - 0.1 * u, 0.09 * u, 0.08 * u, weiss);
      setze(l, cx - 0.04 * u, y0 - 0.11 * u, hut);
      setze(l, cx + 0.04 * u, y0 - 0.11 * u, hut);
    },
  },
};

function stirnband(l, cx, y0, u, f, hell, baender) {
  const oben = y0 + 0.24 * u;
  rechteck(l, cx - 0.52 * u, oben, cx + 0.52 * u, oben + 0.13 * u, f);
  linie(l, cx - 0.5 * u, oben + 0.02 * u, cx + 0.5 * u, oben + 0.02 * u, hell);
  if (baender) {
    const x = cx - 0.5 * u;
    vieleck(l, [[x, oben + 0.02 * u], [x - 0.45 * u, oben - 0.1 * u], [x - 0.38 * u, oben + 0.06 * u], [x, oben + 0.11 * u]], f);
    vieleck(l, [[x, oben + 0.06 * u], [x - 0.4 * u, oben + 0.22 * u], [x - 0.3 * u, oben + 0.3 * u], [x, oben + 0.13 * u]], f);
  }
}

/* ------------------------------------------------------------------ */
/*  Ein Bild, ein ganzes Outfit                                        */
/* ------------------------------------------------------------------ */

/**
 * Welche Pixel eines Originals Kleidung sind - und wie hell. Wird je Bild
 * nur einmal gerechnet, damit die Vorschau beim Schieben flüssig bleibt.
 * -1 = keine Kleidung (oder durchsichtig, oder im Kopf).
 */
const KLEIDUNG_CACHE = new WeakMap();

function kleidungsKarte(original, kopf) {
  if (KLEIDUNG_CACHE.has(original)) return KLEIDUNG_CACHE.get(original);
  const { width: w, height: h, data } = original;
  const karte = new Float32Array(w * h).fill(-1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 128) continue;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (istKleidung(r, g, b) && !imKopf(kopf, x, y)) karte[y * w + x] = rgbZuHls(r, g, b)[1];
    }
  }
  KLEIDUNG_CACHE.set(original, karte);
  return karte;
}

/**
 * Baut eine Pose im Outfit.
 * @param {{width, height, data}} original - das Originalbild
 * @param {{y0, mitte, breite}} kopf - aus kopfFinden
 * @param {object} rezept
 */
export function poseBauen(original, kopf, rezept) {
  const { width: w, height: h } = original;
  const raum = Math.round(h * HUT_RAUM);
  const bild = leinwand(w, h + raum);

  // 1. Figur nach unten versetzt kopieren - die Kleidung dabei umfärben.
  const kleidung = rezept.kleidung ? kleidungAusFarbe(rezept.kleidung, rezept.helligkeit ?? 0) : null;
  const karte = kleidungsKarte(original, kopf);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (original.data[i + 3] < 128) continue;
      let [r, g, b] = [original.data[i], original.data[i + 1], original.data[i + 2]];
      const l = karte[y * w + x];
      if (kleidung && l >= 0) {
        const anteil = (l - 0.07) / 0.35;
        [r, g, b] = hlsZuRgb(kleidung.ton, kleidung.dunkel + anteil * (kleidung.hell - kleidung.dunkel), kleidung.satt);
      }
      const o = ((y + raum) * w + x) * 4;
      bild.data[o] = r; bild.data[o + 1] = g; bild.data[o + 2] = b; bild.data[o + 3] = 255;
    }
  }

  // 2. Den Hut auf eine eigene Ebene malen, mit Kontur, dann darüberlegen.
  const hut = HUETE[rezept.hut] ?? HUETE.keiner;
  if (hut.malen && rezept.hut !== 'keiner') {
    const ebene = leinwand(w, h + raum);
    hut.malen(ebene, kopf.mitte, kopf.y0 + raum, kopf.breite * 1.08, rezept.hutFarbe ?? hut.farbe);
    const d = ebene.data;
    const kontur = [];
    for (let y = 0; y < ebene.height; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3]) continue;
        const nachbar = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const nx = x + dx;
          const ny = y + dy;
          return nx >= 0 && ny >= 0 && nx < w && ny < ebene.height && d[(ny * w + nx) * 4 + 3];
        });
        if (nachbar) kontur.push([x, y]);
      }
    }
    kontur.forEach(([x, y]) => setze(ebene, x, y, KONTUR));
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      bild.data.set(d.subarray(i, i + 4), i);
    }
  }
  return bild;
}

/**
 * Baut alle Posen eines Outfits.
 * @param {Object<string, {width, height, data}>} originale - je Pose das Originalbild
 * @param {object} rezept
 * @param {Map} [koepfe] - Zwischenspeicher für die gefundenen Köpfe
 * @returns {Object<string, {width, height, data}>}
 */
export function outfitBauen(originale, rezept, koepfe = new Map()) {
  const fertig = {};
  POSEN.forEach((pose) => {
    if (originale[pose]) fertig[pose] = poseImOutfit(originale, pose, rezept, koepfe);
  });
  return fertig;
}

/** Eine einzelne Pose im Outfit - für die schnelle Vorschau. */
export function poseImOutfit(originale, pose, rezept, koepfe = new Map()) {
  const quelle = KOPF_WIE[pose] ?? pose;
  if (!koepfe.has(quelle)) koepfe.set(quelle, kopfFinden(originale[quelle]));
  return poseBauen(originale[pose], koepfe.get(quelle), rezept);
}
