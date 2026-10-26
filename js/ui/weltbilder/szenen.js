/**
 * Die Landschaften der Weltenauswahl - eine eigene Szene für jede Welt.
 *
 * Jede Szene liefert zwei Teile, beide im selben Koordinatensystem
 * (B x H, siehe unten), damit sie genau übereinander passen:
 *   bild  - die stehende Landschaft. Sie wird einmal als Bild gerastert
 *           (js/ui/weltbilder/karten.js) und kostet danach nichts mehr.
 *   leben - nur das, was sich bewegt: Wasserfäden, Lava, Funken, Schnee,
 *           Blasen ... Bewegt wird über transform und opacity (CSS in
 *           css/welten.css), und nur, solange die Karte zu sehen ist.
 *
 * Die Bausteine (Bäume, Felsen, Torbögen, Berge, Wasserfall) kommen aus der
 * Weltkarte (js/ui/weltkarte/zeichnen.js) - so sehen Weltkarte und
 * Weltenauswahl aus einem Guss aus.
 *
 * NEUE WELT = eine Funktion in SZENEN ergänzen (Schlüssel = Welt-id).
 * Fehlt sie, bekommt die Welt automatisch eine Landschaft aus ihren Farben.
 */

import { r, wuerfel, zwischen } from '../weltkarte/geometrie.js';
import {
  DEKO,
  bergketteZeichnen,
  bogen,
  defsZeichnen,
  felsBrocken,
  huegelreiheZeichnen,
  saeule,
  seeZeichnen,
  wasserfallZeichnen,
  wolkeZeichnen,
} from '../weltkarte/zeichnen.js';
import { kartenThema, mischen } from '../../data/weltkarten.js';

/** Breite und Höhe jeder Szene. Das Wichtige liegt in der Mitte. */
export const B = 320;
export const H = 300;

/* ================================================================== */
/*  Gemeinsame Bausteine                                               */
/* ================================================================== */

function verlauf(id, stops, richtung = 'senkrecht') {
  const achse = richtung === 'senkrecht' ? 'x1="0" y1="0" x2="0" y2="1"' : 'x1="0" y1="0" x2="1" y2="0"';
  return `<linearGradient id="${id}" ${achse}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
}

function glut(id, farbe, staerke = 0.9) {
  return `<radialGradient id="${id}"><stop offset="0" stop-color="${farbe}" stop-opacity="${staerke}"/><stop offset="0.45" stop-color="${farbe}" stop-opacity="${staerke * 0.35}"/><stop offset="1" stop-color="${farbe}" stop-opacity="0"/></radialGradient>`;
}

/** Defs, die jede Szene braucht (Bäume, Felsen, Wasser, Wolken, Weichzeichner). */
function grundDefs(f) {
  return defsZeichnen({ horizont: 0, hoehe: H }, f).replace(
    '</defs>',
    `${verlauf('wolke', [[0, '#ffffff'], [0.6, '#ffffff'], [1, mischen(f.himmelUnten, f.himmelOben, 0.35)]])}
     <filter id="w" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>
     <filter id="nebel" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>
     </defs>`
  );
}

/** Ein Kristall: Spitze, Lichtseite links, Schattenseite rechts, heller Grat. */
function kristall(x, y, h, w, neig, hell, mitte, dunkel) {
  const sch = y - h * 0.74;
  const tip = { x: x + neig, y: y - h };
  const l = x - w / 2;
  const rr = x + w / 2;
  const grat = { x: x + neig * 0.78, y: sch };
  return `<path d="M${r(l)} ${r(y)} L${r(l + neig * 0.72)} ${r(sch + h * 0.02)} L${r(tip.x)} ${r(tip.y)} L${r(grat.x)} ${r(grat.y)} L${r(x)} ${r(y)} Z" fill="${hell}"/>
    <path d="M${r(x)} ${r(y)} L${r(grat.x)} ${r(grat.y)} L${r(tip.x)} ${r(tip.y)} L${r(rr + neig * 0.74)} ${r(sch + h * 0.04)} L${r(rr)} ${r(y)} Z" fill="${dunkel}"/>
    <path d="M${r(l + neig * 0.72)} ${r(sch + h * 0.02)} L${r(tip.x)} ${r(tip.y)} L${r(grat.x)} ${r(grat.y)} Z" fill="${mitte}" opacity="0.9"/>
    <path d="M${r(x)} ${r(y)} L${r(grat.x)} ${r(grat.y)} L${r(tip.x)} ${r(tip.y)}" stroke="#ffffff" stroke-width="${r(Math.max(1, w * 0.06))}" fill="none" opacity="0.75" stroke-linejoin="round"/>
    <path d="M${r(l)} ${r(y)} L${r(l + neig * 0.72)} ${r(sch + h * 0.02)} L${r(tip.x)} ${r(tip.y)} L${r(rr + neig * 0.74)} ${r(sch + h * 0.04)} L${r(rr)} ${r(y)}" stroke="${mischen(dunkel, '#000000', 0.4)}" stroke-width="1.2" fill="none" stroke-linejoin="round"/>`;
}

/** Ein Büschel Kristalle um einen Punkt. */
function kristallBuschel(x, y, g, z, farben) {
  const [hell, mitte, dunkel] = farben;
  const teile = [
    [-0.55, 0.55, 0.3, -0.35],
    [0.5, 0.6, 0.28, 0.32],
    [-0.2, 0.85, 0.36, -0.12],
    [0.18, 1, 0.4, 0.1],
    [-0.85, 0.35, 0.22, -0.4],
    [0.85, 0.38, 0.22, 0.42],
  ];
  return teile
    .map(([dx, h, w, n]) => kristall(x + dx * g * 0.55, y + Math.abs(dx) * g * 0.06, h * g * zwischen(z, 0.9, 1.1), w * g * 0.6, n * g * 0.5, hell, mitte, dunkel))
    .join('');
}

/** Tanne mit Schnee, in Szenengröße. */
function tanne(x, y, s, gruen, dunkel, schnee) {
  let svg = `<rect x="${r(x - 3 * s)}" y="${r(y - 14 * s)}" width="${r(6 * s)}" height="${r(15 * s)}" fill="#5a3a1c"/>`;
  for (let i = 0; i < 4; i++) {
    const b = (26 - i * 5) * s;
    const ty = y - (10 + i * 15) * s;
    svg += `<path d="M${r(x - b)} ${r(ty)} L${r(x)} ${r(ty - 26 * s)} L${r(x + b)} ${r(ty)} Q${r(x)} ${r(ty + 5 * s)} ${r(x - b)} ${r(ty)} Z" fill="${i % 2 ? dunkel : gruen}"/>
      <path d="M${r(x - b * 0.75)} ${r(ty - 5 * s)} L${r(x)} ${r(ty - 26 * s)} L${r(x + b * 0.45)} ${r(ty - 14 * s)} Q${r(x)} ${r(ty - 8 * s)} ${r(x - b * 0.75)} ${r(ty - 5 * s)} Z" fill="${schnee}"/>`;
  }
  return svg;
}

/** Palme fürs Oasenbild. */
function palme(x, y, s, neig, laub, laubDunkel, stamm) {
  const kx = x + neig * s;
  const ky = y - 70 * s;
  let svg = `<path d="M${r(x - 3 * s)} ${r(y)} Q${r(x + neig * 0.3 * s)} ${r(y - 40 * s)} ${r(kx)} ${r(ky)} L${r(kx + 4 * s)} ${r(ky + 2 * s)} Q${r(x + neig * 0.35 * s + 5 * s)} ${r(y - 40 * s)} ${r(x + 4 * s)} ${r(y)} Z" fill="${stamm}"/>`;
  for (let i = 0; i < 4; i++) svg += `<path d="M${r(x - 2 * s + neig * 0.1 * i * s)} ${r(y - (12 + i * 14) * s)} l${r(6 * s)} -2" stroke="rgba(0,0,0,0.25)" stroke-width="${r(1.5 * s)}"/>`;
  const wedel = [[-34, 10], [-26, -12], [-6, -22], [18, -18], [32, 4], [10, 14]];
  for (const [dx, dy] of wedel) {
    svg += `<path d="M${r(kx)} ${r(ky)} Q${r(kx + dx * 0.5 * s)} ${r(ky + (dy - 14) * s)} ${r(kx + dx * s)} ${r(ky + dy * s + 8 * s)}" stroke="${dy > 0 ? laubDunkel : laub}" stroke-width="${r(7 * s)}" fill="none" stroke-linecap="round"/>`;
  }
  return svg + `<circle cx="${r(kx)}" cy="${r(ky + 3 * s)}" r="${r(4 * s)}" fill="#7a4a1c"/>`;
}

/** Wasserfäden, die einen Wasserfall hinabrauschen (für "leben"). */
function fallFaeden(id, x, oben, unten, breite) {
  const faeden = [-2, -1, 0, 1, 2]
    .map((i) => `<path d="M${r(x + i * breite * 0.17)} ${r(oben - 260)} l0 ${r(unten - oben + 270)}" stroke="#ffffff" stroke-width="${i % 2 ? 1.6 : 2.6}" stroke-dasharray="${i % 2 ? '16 24' : '24 16'}" opacity="0.85"/>`)
    .join('');
  return `<clipPath id="${id}"><path d="M${r(x - breite * 0.45)} ${r(oben)} L${r(x + breite * 0.45)} ${r(oben)} L${r(x + breite * 0.62)} ${r(unten)} L${r(x - breite * 0.62)} ${r(unten)} Z"/></clipPath>
    <g clip-path="url(#${id})"><g class="wb-fall">${faeden}</g></g>
    <ellipse class="wb-puls" cx="${r(x)}" cy="${r(unten)}" rx="${r(breite * 0.9)}" ry="${r(breite * 0.32)}" fill="#ffffff" opacity="0.7"/>`;
}

/**
 * Teilchen für "leben".
 * @param {'steigen'|'fallen'|'schweben'|'funkeln'|'blase'} art
 */
function teilchen(art, anzahl, [x0, x1, y0, y1], z, farben, groesse = [1.5, 3]) {
  let svg = '';
  for (let i = 0; i < anzahl; i++) {
    const x = zwischen(z, x0, x1);
    const y = zwischen(z, y0, y1);
    const g = zwischen(z, groesse[0], groesse[1]);
    const farbe = farben[i % farben.length];
    const dauer = r(zwischen(z, 2.4, 5.5));
    const stil = `animation-duration:${dauer}s;animation-delay:-${r(z() * dauer)}s;--dx:${r(zwischen(z, -14, 14))}px`;
    if (art === 'schweben') {
      svg += `<ellipse class="wb-schweben" style="${stil}" cx="${r(x)}" cy="${r(y)}" rx="${r(g * 1.6)}" ry="${r(g * 0.8)}" fill="${farbe}" transform-origin="${r(x)} ${r(y)}"/>`;
    } else if (art === 'funkeln') {
      svg += `<path class="wb-funkeln" style="${stil}" d="M${r(x)} ${r(y - g * 2)} L${r(x + g * 0.5)} ${r(y - g * 0.5)} L${r(x + g * 2)} ${r(y)} L${r(x + g * 0.5)} ${r(y + g * 0.5)} L${r(x)} ${r(y + g * 2)} L${r(x - g * 0.5)} ${r(y + g * 0.5)} L${r(x - g * 2)} ${r(y)} L${r(x - g * 0.5)} ${r(y - g * 0.5)} Z" fill="${farbe}"/>`;
    } else if (art === 'blase') {
      svg += `<circle class="wb-steigen" style="${stil}" cx="${r(x)}" cy="${r(y)}" r="${r(g)}" fill="none" stroke="${farbe}" stroke-width="1"/>`;
    } else {
      svg += `<circle class="wb-${art}" style="${stil}" cx="${r(x)}" cy="${r(y)}" r="${r(g)}" fill="${farbe}"/>`;
    }
  }
  return svg;
}

/** Ein Nebelband, das langsam durchs Bild zieht (für "leben"). */
function nebelband(y, hoehe, farbe, deckkraft, dauer) {
  return `<g class="wb-ziehen" style="animation-duration:${dauer}s"><ellipse cx="80" cy="${y}" rx="150" ry="${hoehe}" fill="${farbe}" opacity="${deckkraft}" filter="url(#nebel)"/><ellipse cx="300" cy="${y + 6}" rx="130" ry="${hoehe * 0.8}" fill="${farbe}" opacity="${deckkraft * 0.8}" filter="url(#nebel)"/></g>`;
}

function boden(y, farbe, hell, z) {
  let d = `M-10 ${H + 10} L-10 ${y}`;
  for (let x = -10; x < B + 40; x += 40) d += ` Q${x + 20} ${r(y + zwischen(z, -10, 6))} ${x + 40} ${r(y + zwischen(z, -4, 6))}`;
  d += ` L${B + 10} ${H + 10} Z`;
  return `<path d="${d}" fill="${farbe}"/><path d="${d}" fill="none" stroke="${hell}" stroke-width="3" opacity="0.6"/>`;
}

/* ================================================================== */
/*  Die Szenen                                                         */
/* ================================================================== */

const SZENEN = {
  /* ---------- 1 Grünes Tal: Wasserfall, Riesenbaum, Ruinen ---------- */
  1(welt, z) {
    const f = { ...kartenThema(welt).farben, wasser: '#26b9c9', wasserHell: '#a8f3f0', wasserTief: '#13798f', ufer: '#5f7f48' };
    let bild = grundDefs(f).replace('</defs>', `${verlauf('h1', [[0, '#3f9fe6'], [0.65, '#9fdcff'], [1, '#d9f6ff']])}${glut('sonne1', '#fff4c0')}</defs>`);
    bild += `<rect width="${B}" height="${H}" fill="url(#h1)"/><circle cx="250" cy="44" r="120" fill="url(#sonne1)"/><circle cx="250" cy="44" r="16" fill="#fffbe8"/>`;
    bild += wolkeZeichnen(210, 70, 0.55, z) + wolkeZeichnen(90, 40, 0.45, z);
    bild += bergketteZeichnen(B, 165, 95, 120, z, '#a6b8e6', '#d3defa', '#f6faff', 0.8);
    bild += huegelreiheZeichnen(B, 168, 22, z, '#6aa86a', '#4c8a5a');
    // Klippe mit zwei Wasserfällen.
    bild += `<path d="M110 150 Q150 140 200 146 Q240 140 300 150 L320 150 L320 232 L100 232 Z" fill="url(#klippe)" stroke="#4e4a42" stroke-width="2"/>
      <path d="M118 170 L300 168 M112 196 L310 192" stroke="#4e4a42" stroke-width="2" opacity="0.45"/>
      <path d="M150 150 l0 80 M230 148 l0 84 M270 152 l0 80" stroke="#4e4a42" stroke-width="2" opacity="0.35"/>
      <path d="M100 150 Q150 138 200 145 Q250 136 320 148" stroke="${f.wiese}" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M100 147 Q150 135 200 142 Q250 133 320 145" stroke="${f.wieseHell}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M128 152 q-4 18 2 34 M182 150 q4 14 -2 26 M286 150 q-3 20 3 36" stroke="#4f8f2c" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    bild += wasserfallZeichnen({ x: 168, y: 234, hoehe: 90, breite: 30 }, f);
    bild += bogen(236, 150, 14, 46, f, false);
    bild += saeule(272, 152, 6, 26, f, true);
    bild += seeZeichnen({ x: 168, y: 256, rx: 120, ry: 30 }, f, z);
    bild += boden(270, f.wiese, f.wieseHell, z);
    bild += DEKO.blumen({ x: 120, y: 286, s: 0.9, v: 0 }, f, z).svg + DEKO.blumen({ x: 250, y: 290, s: 0.8, v: 3 }, f, z).svg;
    bild += DEKO.baum_laub({ x: 26, y: 300, s: 0.82, v: 0 }, f, z).svg;
    bild += DEKO.gras({ x: 200, y: 292, s: 1, v: 1 }, f, z).svg + DEKO.gras({ x: 300, y: 296, s: 1.1, v: 2 }, f, z).svg;
    let leben = fallFaeden(`wb1a${welt.id}`, 168, 144, 234, 30);
    leben += teilchen('schweben', 6, [20, 300, 60, 260], z, ['#7fd44a', '#b6ee6a', '#5fb03a'], [2, 3]);
    leben += teilchen('funkeln', 7, [60, 300, 120, 280], z, ['#fff3b0', '#ffffff'], [1.2, 2.2]);
    leben += `<ellipse class="wb-glanz" cx="140" cy="258" rx="30" ry="3" fill="#ffffff"/><ellipse class="wb-glanz" style="animation-delay:-1.6s" cx="230" cy="264" rx="22" ry="2.5" fill="#ffffff"/>`;
    return { bild, leben };
  },

  /* ---------- 2 Kristallhöhlen: violette Kristalle, türkiser Fall ---------- */
  2(welt, z) {
    const f = kartenThema(welt).farben;
    const lila = ['#e6c8ff', '#b47cf0', '#5a2a9e'];
    const blau = ['#cfe8ff', '#7fa8ff', '#2f3f9e'];
    let bild = grundDefs(f).replace(
      '</defs>',
      `${verlauf('h2', [[0, '#120a2e'], [0.5, '#2a1660'], [1, '#160c38']])}${glut('licht2', '#7f9fff', 0.8)}${glut('lila2', '#c07cff')}${glut('tuerkis2', '#4ff0f0')}
       ${verlauf('fall2', [[0, '#a6fbff'], [0.5, '#ffffff'], [1, '#3fd0e8']], 'waagerecht')}${verlauf('wand2', [[0, '#3a2470'], [1, '#140a30']])}</defs>`
    );
    bild += `<rect width="${B}" height="${H}" fill="url(#h2)"/><ellipse cx="170" cy="120" rx="170" ry="140" fill="url(#licht2)"/>`;
    // Ferne Höhlenwand mit leuchtenden Adern.
    bild += `<path d="M0 0 L320 0 L320 120 Q260 90 220 110 Q170 60 120 100 Q70 80 0 120 Z" fill="#1a0f40" opacity="0.8"/>
      <path d="M40 90 q30 -10 50 6 M230 96 q20 -14 46 -2 M150 70 q10 -8 24 0" stroke="#9f7cff" stroke-width="2" fill="none" opacity="0.7"/>`;
    // Unterirdischer Wasserfall.
    bild += `<path d="M150 60 L186 60 L196 220 L140 220 Z" fill="url(#fall2)" opacity="0.95"/>
      <path d="M156 64 L152 218 M168 62 L168 220 M180 64 L186 218" stroke="#ffffff" stroke-width="2" opacity="0.6"/>
      <ellipse cx="168" cy="62" rx="22" ry="5" fill="#ffffff" opacity="0.8"/>`;
    // Höhlenwände links und rechts, mit violettem Randlicht.
    bild += `<path d="M0 0 L70 0 Q90 40 76 80 Q100 130 70 170 Q86 220 60 300 L0 300 Z" fill="url(#wand2)"/>
      <path d="M70 0 Q90 40 76 80 Q100 130 70 170 Q86 220 60 300" stroke="#b48cff" stroke-width="3" fill="none" opacity="0.7"/>
      <path d="M320 0 L250 0 Q236 50 256 90 Q232 140 262 190 Q244 240 270 300 L320 300 Z" fill="url(#wand2)"/>
      <path d="M250 0 Q236 50 256 90 Q232 140 262 190 Q244 240 270 300" stroke="#7fd8ff" stroke-width="3" fill="none" opacity="0.6"/>
      <path d="M90 0 L100 34 L110 0 Z M120 0 L126 22 L134 0 Z M206 0 L214 40 L224 0 Z M236 0 L240 18 L248 0 Z" fill="#1a0f40"/>`;
    // Leuchtendes Becken.
    bild += `<ellipse cx="170" cy="236" rx="150" ry="34" fill="url(#tuerkis2)"/>
      <ellipse cx="170" cy="238" rx="128" ry="24" fill="#1fa8c8" opacity="0.85"/>
      <ellipse cx="170" cy="234" rx="100" ry="14" fill="#5ff0f8" opacity="0.5"/>
      <path d="M90 240 q20 -4 40 0 M200 244 q24 -4 46 0" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.5"/>`;
    // Kristalle: Glut dahinter, dann die Spitzen.
    bild += `<circle cx="56" cy="230" r="80" fill="url(#lila2)"/><circle cx="286" cy="236" r="64" fill="url(#lila2)"/>`;
    bild += kristallBuschel(282, 280, 110, z, blau);
    bild += kristallBuschel(52, 290, 170, z, lila);
    bild += kristallBuschel(122, 270, 44, z, lila) + kristallBuschel(232, 262, 40, z, blau);
    bild += `<path d="M0 286 Q80 270 160 284 Q240 274 320 288 L320 300 L0 300 Z" fill="#140a30"/>`;
    let leben = `<ellipse class="wb-puls wb-puls--lang" cx="56" cy="210" rx="70" ry="70" fill="url(#lila2)"/><ellipse class="wb-puls wb-puls--lang" style="animation-delay:-1.4s" cx="286" cy="226" rx="56" ry="56" fill="url(#lila2)"/>`;
    leben += fallFaeden(`wb2${welt.id}`, 168, 62, 220, 40);
    leben += teilchen('funkeln', 12, [20, 300, 30, 280], z, ['#e6c8ff', '#9ff8ff', '#ffffff'], [1.4, 2.8]);
    leben += teilchen('steigen', 6, [90, 250, 200, 260], z, ['#7ff5ff', '#d6b8ff'], [1, 2]);
    return { bild, leben };
  },

  /* ---------- 3 Vulkanlande: Vulkan, Lava, Rauch, Glut ---------- */
  3(welt, z) {
    const f = { ...kartenThema(welt).farben, fels: '#4a3434', felsHell: '#7a5a52', felsDunkel: '#1e1414' };
    const lava = 'M150 82 Q140 120 152 150 Q160 190 120 230 Q100 254 60 270 M188 84 Q200 130 214 160 Q226 200 260 236';
    const fluss = 'M-10 282 Q60 262 120 276 Q190 292 250 268 Q290 254 330 262';
    let bild = grundDefs(f).replace(
      '</defs>',
      `${verlauf('h3', [[0, '#1c060c'], [0.45, '#6e1416'], [0.8, '#d4441c'], [1, '#ff9a3a']])}${glut('krater3', '#ffb03a')}${glut('glut3', '#ff5a1a', 0.7)}
       ${verlauf('berg3', [[0, '#3e2424'], [1, '#140a0a']])}${verlauf('lava3', [[0, '#fff2a0'], [0.4, '#ffb02e'], [1, '#ff4a12']])}
       <filter id="glow3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter></defs>`
    );
    bild += `<rect width="${B}" height="${H}" fill="url(#h3)"/>`;
    // Ferne, dunkelrote Bergkette.
    bild += bergketteZeichnen(B, 200, 70, 90, z, '#4a1a1e', '#6e2a28', '#4a1a1e', 0);
    // Rauchwolken über dem Krater.
    for (let i = 0; i < 9; i++) {
      bild += `<circle cx="${r(170 + zwischen(z, -90, 90))}" cy="${r(zwischen(z, 6, 60))}" r="${r(zwischen(z, 18, 34))}" fill="${i % 2 ? '#2a1a1e' : '#3e2a2a'}" opacity="0.9" filter="url(#w)"/>`;
    }
    // Der Vulkan.
    bild += `<circle cx="170" cy="86" r="70" fill="url(#krater3)"/>
      <path d="M20 250 Q90 190 140 86 L198 86 Q250 190 320 246 L320 300 L0 300 Z" fill="url(#berg3)"/>
      <path d="M140 86 Q110 160 60 214" stroke="#ff7a3a" stroke-width="3" fill="none" opacity="0.55"/>
      <path d="M140 86 L198 86 Q190 94 170 96 Q150 94 140 86 Z" fill="#ffcf6a"/>`;
    bild += `<path d="${lava}" stroke="#ff4a12" stroke-width="12" fill="none" opacity="0.6" filter="url(#glow3)"/>
      <path d="${lava}" stroke="url(#lava3)" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="${lava}" stroke="#fff6c0" stroke-width="1.4" fill="none" opacity="0.9"/>`;
    // Felsnadeln vorn, Lavafluss unten.
    bild += DEKO.baum_felsnadel({ x: 286, y: 286, s: 0.75, v: 1 }, f, z).svg + DEKO.baum_felsnadel({ x: 24, y: 292, s: 0.6, v: 2 }, f, z).svg;
    bild += `<path d="${fluss}" stroke="#ff4a12" stroke-width="26" fill="none" opacity="0.55" filter="url(#glow3)"/>
      <path d="${fluss}" stroke="url(#lava3)" stroke-width="14" fill="none"/>
      <path d="${fluss}" stroke="#fff6c0" stroke-width="3" fill="none" opacity="0.7"/>`;
    bild += felsBrocken(110, 296, 14, f, z) + felsBrocken(210, 300, 12, f, z);
    let leben = `<ellipse class="wb-puls" cx="170" cy="86" rx="46" ry="26" fill="url(#krater3)"/>`;
    leben += `<path class="wb-fliessen" d="${lava}" stroke="#fffbe0" stroke-width="2.4" stroke-dasharray="6 20" fill="none" stroke-linecap="round"/>`;
    leben += `<path class="wb-fliessen wb-fliessen--langsam" d="${fluss}" stroke="#fff3b0" stroke-width="3.5" stroke-dasharray="10 16" fill="none" stroke-linecap="round"/>`;
    leben += teilchen('steigen', 14, [40, 300, 120, 290], z, ['#ffb347', '#ff7a1f', '#ffe08a'], [1, 2.2]);
    for (let i = 0; i < 3; i++) {
      leben += `<circle class="wb-rauch" style="animation-delay:-${i * 2.2}s" cx="${170 + (i - 1) * 16}" cy="70" r="16" fill="#3e2a2a" opacity="0.8" filter="url(#w)"/>`;
    }
    return { bild, leben };
  },

  /* ---------- 4 Eisgebirge: Gipfel, Eisklippen, gefrorener See ---------- */
  4(welt, z) {
    const f = { ...kartenThema(welt).farben, fels: '#9cc8e4', felsHell: '#eaf8ff', felsDunkel: '#4f7fa8', moos: '#e8f6ff', laub: '#2f7a7a', laubHell: '#6fbab0', laubDunkel: '#1a4f5a' };
    let bild = grundDefs(f).replace(
      '</defs>',
      `${verlauf('h4', [[0, '#2a64b0'], [0.6, '#8fcaf0'], [1, '#d8f2ff']])}${verlauf('berg4', [[0, '#d8e8ff'], [0.5, '#8fb0e0'], [1, '#4f6fa8']])}
       ${verlauf('eis4', [[0, '#e8fbff'], [0.5, '#9fdcf5'], [1, '#4f9fd0']])}${verlauf('see4', [[0, '#cfefff'], [1, '#7fbfe8']])}</defs>`
    );
    bild += `<rect width="${B}" height="${H}" fill="url(#h4)"/>`;
    bild += wolkeZeichnen(260, 50, 0.5, z);
    bild += bergketteZeichnen(B, 190, 110, 110, z, '#a8c0ea', '#e2ecff', '#ffffff', 0.9);
    // Ein mächtiger Hauptgipfel.
    bild += `<path d="M30 220 L130 34 L160 70 L176 56 L270 220 Z" fill="url(#berg4)"/>
      <path d="M130 34 L118 90 L96 120 L60 196 L30 220 Z" fill="#ffffff" opacity="0.35"/>
      <path d="M130 34 L160 70 L176 56 L190 92 L168 98 L150 86 L138 108 L124 92 L106 104 Z" fill="#ffffff"/>
      <path d="M130 34 L160 70 L176 56 L190 92 L168 98 L150 86 Z" fill="#c9dcf5"/>`;
    // Eisklippen.
    bild += `<path d="M180 230 L196 160 L214 150 L232 172 L246 140 L268 150 L282 176 L300 162 L320 170 L320 240 Z" fill="url(#eis4)" stroke="#6fafd8" stroke-width="1.5"/>
      <path d="M196 160 L204 230 M232 172 L236 236 M268 150 L262 236 M300 162 L304 238" stroke="#ffffff" stroke-width="2" opacity="0.7"/>`;
    // Gefrorener See mit Rissen.
    bild += `<ellipse cx="150" cy="252" rx="140" ry="26" fill="url(#see4)"/>
      <path d="M70 250 l24 -4 l14 6 l20 -6 M160 258 l18 -8 l22 4 M120 262 l-10 6" stroke="#ffffff" stroke-width="1.5" fill="none" opacity="0.8"/>
      <ellipse cx="120" cy="246" rx="40" ry="4" fill="#ffffff" opacity="0.6"/>`;
    bild += bogen(236, 236, 14, 44, f, false);
    bild += boden(270, '#e6f4ff', '#ffffff', z);
    bild += tanne(28, 290, 1.4, '#2f7a7a', '#1f5a5f', '#f4fbff') + tanne(70, 280, 1, '#2f7a7a', '#1f5a5f', '#f4fbff') + tanne(296, 292, 1.25, '#2f7a7a', '#1f5a5f', '#f4fbff');
    let leben = nebelband(214, 14, '#ffffff', 0.55, 26);
    leben += teilchen('fallen', 26, [0, 320, -20, 260], z, ['#ffffff', '#e8f6ff'], [1, 2.2]);
    leben += teilchen('funkeln', 6, [170, 320, 150, 260], z, ['#ffffff', '#bff2ff'], [1.4, 2.4]);
    return { bild, leben };
  },

  /* ---------- 5 Schattenreich: Mond, kahle Bäume, Nebel, Irrlichter ---------- */
  5(welt, z) {
    const f = { ...kartenThema(welt).farben, stamm: '#2a1f3a', laub: '#4a3a6e', laubHell: '#8a6ac8', laubDunkel: '#22183a' };
    let bild = grundDefs(f).replace('</defs>', `${verlauf('h5', [[0, '#0c0620'], [0.6, '#2c1a52'], [1, '#4a2f7a']])}${glut('mond5', '#d8c8ff')}${glut('lila5', '#a87cff', 0.6)}</defs>`);
    bild += `<rect width="${B}" height="${H}" fill="url(#h5)"/><circle cx="230" cy="70" r="90" fill="url(#mond5)"/><circle cx="230" cy="70" r="28" fill="#f2ecff"/><circle cx="240" cy="64" r="26" fill="#dcd0ff" opacity="0.5"/>`;
    for (let i = 0; i < 26; i++) bild += `<circle cx="${r(zwischen(z, 0, B))}" cy="${r(zwischen(z, 0, 150))}" r="${r(zwischen(z, 0.5, 1.4))}" fill="#ffffff" opacity="${r(zwischen(z, 0.4, 0.9))}"/>`;
    // Ruinenturm in der Ferne.
    bild += `<path d="M150 210 L150 110 L144 110 L144 98 L152 98 L152 90 L160 90 L160 98 L168 98 L168 90 L176 90 L176 98 L184 98 L184 110 L178 110 L178 210 Z" fill="#1c1236"/>
      <path d="M190 210 L190 140 L184 140 L186 128 L204 128 L206 140 L200 140 L200 210 Z" fill="#1c1236"/>
      <rect x="160" y="130" width="6" height="10" fill="#c8a8ff" opacity="0.8"/>`;
    bild += huegelreiheZeichnen(B, 214, 16, z, '#24183e', '#1c1236');
    bild += `<ellipse cx="160" cy="250" rx="200" ry="40" fill="url(#lila5)"/>`;
    bild += boden(262, '#1a1030', '#4a3a6e', z);
    bild += DEKO.baum_kahl({ x: 50, y: 300, s: 0.9, v: 1 }, f, z).svg + DEKO.baum_kahl({ x: 284, y: 292, s: 0.7, v: 2 }, f, z).svg;
    let leben = nebelband(250, 16, '#b48cff', 0.4, 22) + nebelband(272, 12, '#7f5fd8', 0.35, 30);
    leben += teilchen('schweben', 8, [40, 300, 150, 270], z, ['#d6b8ff', '#9f7cff'], [1.8, 3]);
    leben += teilchen('funkeln', 8, [0, 320, 0, 150], z, ['#ffffff'], [0.8, 1.6]);
    return { bild, leben };
  },

  /* ---------- 6 Wüstenreich: Dünen, Pyramiden, Oase ---------- */
  6(welt, z) {
    const f = { ...kartenThema(welt).farben, wasser: '#2fb6c8', wasserHell: '#a8f0f5', wasserTief: '#13798f', ufer: '#c9a05a', weg: '#f0d290' };
    let bild = grundDefs(f).replace(
      '</defs>',
      `${verlauf('h6', [[0, '#f0864a'], [0.55, '#ffc070'], [1, '#ffe6b0']])}${glut('sonne6', '#fff0b0')}
       ${verlauf('duene6', [[0, '#f5cf86'], [1, '#d99e4a']])}${verlauf('duene6b', [[0, '#eab868'], [1, '#c0823a']])}</defs>`
    );
    bild += `<rect width="${B}" height="${H}" fill="url(#h6)"/><circle cx="90" cy="140" r="130" fill="url(#sonne6)"/><circle cx="90" cy="140" r="28" fill="#fff6d8"/>`;
    // Pyramiden.
    bild += `<path d="M170 196 L222 120 L274 196 Z" fill="#d79a52"/><path d="M222 120 L274 196 L232 196 Z" fill="#a8703a"/>
      <path d="M250 196 L280 152 L310 196 Z" fill="#cf9250"/><path d="M280 152 L310 196 L288 196 Z" fill="#a06a36"/>
      <path d="M180 182 L264 182 M190 168 L254 168 M200 154 L244 154 M210 140 L234 140" stroke="#b07a40" stroke-width="1" opacity="0.6"/>`;
    // Dünen in drei Lagen.
    bild += `<path d="M-10 210 Q60 180 130 200 Q200 220 330 196 L330 300 L-10 300 Z" fill="url(#duene6)"/>
      <path d="M130 200 Q200 220 330 196 L330 230 Q220 236 130 200 Z" fill="#c88a40" opacity="0.4"/>
      <path d="M-10 250 Q80 220 170 246 Q250 266 330 236 L330 300 L-10 300 Z" fill="url(#duene6b)"/>`;
    bild += seeZeichnen({ x: 100, y: 262, rx: 62, ry: 15 }, f, z);
    bild += palme(70, 262, 1, -18, '#5fa83a', '#3a7a2a', '#8a5a2a') + palme(132, 258, 0.8, 22, '#6fb84a', '#3a7a2a', '#8a5a2a');
    bild += DEKO.baum_kaktus({ x: 270, y: 290, s: 0.55, v: 1 }, f, z).svg;
    bild += `<path d="M-10 290 Q100 276 200 292 Q260 300 330 284 L330 300 L-10 300 Z" fill="#c0823a"/>`;
    let leben = `<circle class="wb-puls wb-puls--lang" cx="90" cy="140" r="60" fill="url(#sonne6)"/>`;
    leben += nebelband(205, 8, '#fff2c8', 0.4, 18);
    leben += teilchen('schweben', 10, [0, 320, 180, 290], z, ['#fff0c0', '#f5cf86'], [0.8, 1.5]);
    leben += `<ellipse class="wb-glanz" cx="96" cy="262" rx="18" ry="2" fill="#ffffff"/>`;
    return { bild, leben };
  },

  /* ---------- 7 Himmelsinseln: schwebende Inseln über dem Wolkenmeer ---------- */
  7(welt, z) {
    const f = kartenThema(welt).farben;
    const insel = (x, y, w, h) => `
      <path d="M${x - w} ${y} Q${x} ${y + h * 0.2} ${x + w} ${y} L${x + w * 0.4} ${y + h * 0.6} L${x + w * 0.1} ${y + h} L${x - w * 0.3} ${y + h * 0.55} Z" fill="url(#klippe)" stroke="#5a5448" stroke-width="1.5"/>
      <path d="M${x - w * 0.8} ${y + h * 0.18} L${x + w * 0.7} ${y + h * 0.2} M${x - w * 0.5} ${y + h * 0.42} L${x + w * 0.4} ${y + h * 0.44}" stroke="#5a5448" stroke-width="1.5" opacity="0.5"/>
      <ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h * 0.16}" fill="${f.wiese}"/><ellipse cx="${x}" cy="${y - 2}" rx="${w * 0.9}" ry="${h * 0.1}" fill="${f.wieseHell}"/>`;
    let bild = grundDefs(f).replace('</defs>', `${verlauf('h7', [[0, '#3f9ff0'], [0.7, '#a8e0ff'], [1, '#e8f8ff']])}${glut('sonne7', '#ffffff')}</defs>`);
    bild += `<rect width="${B}" height="${H}" fill="url(#h7)"/><circle cx="60" cy="40" r="90" fill="url(#sonne7)"/>`;
    bild += insel(250, 92, 44, 70) + DEKO.baum_laub({ x: 250, y: 92, s: 0.28, v: 1 }, f, z).svg;
    bild += insel(120, 130, 86, 120);
    bild += wasserfallZeichnen({ x: 176, y: 230, hoehe: 96, breite: 14 }, f);
    bild += DEKO.baum_laub({ x: 96, y: 130, s: 0.45, v: 0 }, f, z).svg + DEKO.busch({ x: 150, y: 132, s: 0.5, v: 3 }, f, z).svg;
    bild += saeule(60, 128, 6, 26, f, true);
    // Wolkenmeer unten.
    for (let i = 0; i < 8; i++) bild += wolkeZeichnen(i * 46 + zwischen(z, -10, 10), 250 + (i % 2) * 18, zwischen(z, 0.8, 1.2), z);
    bild += `<rect x="0" y="262" width="${B}" height="40" fill="#ffffff" opacity="0.92"/>`;
    let leben = fallFaeden(`wb7${welt.id}`, 176, 134, 230, 14);
    leben += `<g class="wb-ziehen" style="animation-duration:30s">${wolkeZeichnen(60, 200, 0.45, z)}</g>`;
    for (let i = 0; i < 3; i++) {
      const x = 200 + i * 30;
      const y = 50 + i * 12;
      leben += `<path class="wb-vogel" style="animation-delay:-${i * 1.3}s" d="M${x} ${y} q5 -5 10 0 q5 -5 10 0" stroke="#2a3a5a" stroke-width="1.6" fill="none"/>`;
    }
    leben += teilchen('funkeln', 6, [20, 300, 20, 200], z, ['#ffffff', '#fff3b0'], [1.2, 2]);
    return { bild, leben };
  },

  /* ---------- 8 Korallenriff: Lichtstrahlen, Korallen, Fische, Blasen ---------- */
  8(welt, z) {
    const f = { ...kartenThema(welt).farben, laub: '#ff7a8a', laubHell: '#ffc0c8' };
    let bild = grundDefs(f).replace('</defs>', `${verlauf('h8', [[0, '#3fc8e8'], [0.45, '#1a8ac0'], [1, '#0a4a7a']])}${verlauf('sand8', [[0, '#f0d8a0'], [1, '#c8a46a']])}</defs>`);
    bild += `<rect width="${B}" height="${H}" fill="url(#h8)"/>`;
    for (let i = 0; i < 5; i++) {
      const x = 40 + i * 64;
      bild += `<path d="M${x} -10 L${x + 26} -10 L${x + 80} 300 L${x + 30} 300 Z" fill="#ffffff" opacity="0.07"/>`;
    }
    bild += `<path d="M-10 250 Q80 230 160 248 Q240 262 330 240 L330 300 L-10 300 Z" fill="url(#sand8)"/>`;
    const korallen = [[60, 270, 0.65, '#ff7a8a', '#ffc0c8'], [250, 262, 0.55, '#ff9a4a', '#ffd08a'], [150, 280, 0.45, '#c87cff', '#e6c8ff']];
    for (const [x, y, s, a, b] of korallen) bild += DEKO.baum_koralle({ x, y, s, v: x }, { ...f, laub: a, laubHell: b }, z).svg;
    bild += `<path d="M300 300 Q290 250 304 210 M290 300 Q296 260 282 226" stroke="#3fae6a" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    bild += felsBrocken(200, 284, 14, { ...f, fels: '#8a7a6a', felsHell: '#c8b89a', felsDunkel: '#4a3e34' }, z);
    const fisch = (x, y, s, farbe, klasse, delay) =>
      `<g class="${klasse}" style="animation-delay:-${delay}s"><path d="M${x} ${y} q${10 * s} ${-8 * s} ${20 * s} 0 q${-10 * s} ${8 * s} ${-20 * s} 0 Z M${x + 20 * s} ${y} l${7 * s} ${-6 * s} l0 ${12 * s} Z" fill="${farbe}"/><circle cx="${x + 5 * s}" cy="${y - 1 * s}" r="${1.4 * s}" fill="#102030"/><path d="M${x + 9 * s} ${y - 6 * s} l0 ${12 * s}" stroke="#ffffff" stroke-width="${2 * s}" opacity="0.8"/></g>`;
    let leben = '';
    for (let i = 0; i < 3; i++) leben += `<path class="wb-strahl" style="animation-delay:-${i * 1.5}s" d="M${70 + i * 90} -10 L${96 + i * 90} -10 L${150 + i * 90} 300 L${100 + i * 90} 300 Z" fill="#ffffff" opacity="0.08"/>`;
    leben += fisch(120, 120, 1.4, '#ff8a3a', 'wb-schwimmen', 0) + fisch(200, 170, 1, '#ffd84a', 'wb-schwimmen wb-schwimmen--lang', 2) + fisch(60, 190, 0.9, '#5fd0ff', 'wb-schwimmen', 4);
    leben += teilchen('blase', 14, [30, 300, 100, 290], z, ['#ffffff', '#c8f4ff'], [1.4, 3.2]);
    leben += `<path class="wb-wiegen" d="M30 300 Q20 260 34 220 Q44 196 30 170" stroke="#2f9a5a" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    return { bild, leben };
  },

  /* ---------- 9 Spukmoor: Nebel, krumme Bäume, Irrlichter ---------- */
  9(welt, z) {
    const f = { ...kartenThema(welt).farben, stamm: '#2a2a22', laub: '#3a4a34', laubHell: '#6a7a5a', laubDunkel: '#1e261c', wasser: '#3a5a48', wasserHell: '#8fae8a', wasserTief: '#1a2a20', ufer: '#2a3424' };
    let bild = grundDefs(f).replace('</defs>', `${verlauf('h9', [[0, '#0e1612'], [0.6, '#2a3a30'], [1, '#4f6650']])}${glut('mond9', '#e0ffd0', 0.8)}${glut('irr9', '#b6ff8a')}</defs>`);
    bild += `<rect width="${B}" height="${H}" fill="url(#h9)"/><circle cx="90" cy="70" r="80" fill="url(#mond9)"/><circle cx="90" cy="70" r="24" fill="#eafde0"/>`;
    bild += huegelreiheZeichnen(B, 190, 18, z, '#1e2a22', '#18221c');
    bild += seeZeichnen({ x: 170, y: 250, rx: 140, ry: 26 }, f, z);
    bild += `<ellipse cx="96" cy="250" rx="16" ry="4" fill="#eafde0" opacity="0.35"/>`;
    bild += boden(276, '#1a2218', '#3a4a34', z);
    bild += DEKO.baum_kahl({ x: 270, y: 290, s: 0.95, v: 3 }, f, z).svg + DEKO.baum_kahl({ x: 30, y: 286, s: 0.7, v: 4 }, f, z).svg;
    bild += DEKO.laterne({ x: 200, y: 288, s: 1, v: 0 }, { ...f, holz: '#4a3a2a', holzDunkel: '#2a2018' }, z).svg.replace('url(#lampe)', '#b6ff8a').replace('opacity="0.6"', 'opacity="0.25"');
    let leben = nebelband(230, 18, '#c8e8c0', 0.35, 24) + nebelband(268, 14, '#a8c8a0', 0.4, 32);
    for (let i = 0; i < 5; i++) {
      const x = zwischen(z, 40, 300);
      const y = zwischen(z, 150, 250);
      leben += `<g class="wb-irrlicht" style="animation-delay:-${r(z() * 6)}s;--dx:${r(zwischen(z, -20, 20))}px"><circle cx="${r(x)}" cy="${r(y)}" r="10" fill="url(#irr9)"/><circle cx="${r(x)}" cy="${r(y)}" r="2.2" fill="#f0ffe0"/></g>`;
    }
    return { bild, leben };
  },

  /* ---------- 10 Uhrwerkstadt: Uhrturm, Zahnräder, Dampf ---------- */
  10(welt, z) {
    const f = kartenThema(welt).farben;
    const messing = '#c9a14a';
    const zahnrad = (x, y, g, zaehne, farbe, klasse = '') => {
      let zacken = '';
      for (let i = 0; i < zaehne; i++) {
        const w = (i / zaehne) * Math.PI * 2;
        zacken += `<rect x="${r(x - g * 0.12)}" y="${r(y - g * 1.18)}" width="${r(g * 0.24)}" height="${r(g * 0.3)}" rx="1" transform="rotate(${r((w * 180) / Math.PI)} ${x} ${y})"/>`;
      }
      return `<g class="${klasse}" fill="${farbe}" style="transform-origin:${x}px ${y}px">${zacken}<circle cx="${x}" cy="${y}" r="${g}"/><circle cx="${x}" cy="${y}" r="${r(g * 0.55)}" fill="${mischen(farbe, '#000000', 0.35)}"/><circle cx="${x}" cy="${y}" r="${r(g * 0.2)}" fill="${mischen(farbe, '#ffffff', 0.3)}"/></g>`;
    };
    let bild = grundDefs(f).replace('</defs>', `${verlauf('h10', [[0, '#3a2a22'], [0.5, '#8a5a32'], [1, '#e8b060']])}${verlauf('turm10', [[0, '#6a5038'], [1, '#2e2218']], 'waagerecht')}${glut('licht10', '#ffd890', 0.6)}</defs>`);
    bild += `<rect width="${B}" height="${H}" fill="url(#h10)"/><circle cx="160" cy="200" r="160" fill="url(#licht10)"/>`;
    // Stadt-Silhouette.
    bild += `<path d="M0 230 L0 170 L20 170 L20 150 L34 150 L34 176 L56 176 L56 140 Q66 124 76 140 L76 186 L100 186 L100 160 L114 160 L114 200 L320 200 L320 230 Z" fill="#3a2a20" opacity="0.8"/>
      <path d="M220 200 L220 150 L236 150 L236 128 Q244 116 252 128 L252 150 L268 150 L268 174 L290 174 L290 140 L304 140 L304 200 Z" fill="#3a2a20" opacity="0.8"/>`;
    // Uhrturm.
    bild += `<path d="M132 250 L132 96 L188 96 L188 250 Z" fill="url(#turm10)"/><path d="M126 96 L160 46 L194 96 Z" fill="#4a3424"/><path d="M160 46 L194 96 L172 96 Z" fill="#2e2218"/>
      <circle cx="160" cy="126" r="22" fill="#f6e8c8" stroke="${messing}" stroke-width="4"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => `<rect x="159" y="107" width="2" height="5" fill="#4a3424" transform="rotate(${i * 30} 160 126)"/>`).join('')}
      <rect x="146" y="170" width="28" height="40" rx="14" fill="#ffcf6a" opacity="0.85"/><path d="M160 170 L160 210 M146 190 L174 190" stroke="#4a3424" stroke-width="2"/>`;
    // Rohre.
    bild += `<path d="M190 236 L250 236 Q262 236 262 224 L262 196" stroke="${messing}" stroke-width="8" fill="none"/><path d="M190 236 L250 236 Q262 236 262 224 L262 196" stroke="#fff0c0" stroke-width="2" fill="none" opacity="0.5"/>
      <rect x="256" y="188" width="12" height="10" rx="2" fill="#8a6a32"/>`;
    bild += `<path d="M-10 250 L330 250 L330 300 L-10 300 Z" fill="#2e2218"/><path d="M-10 250 L330 250" stroke="${messing}" stroke-width="3"/>`;
    let leben = `<g class="wb-drehen" style="transform-origin:160px 126px"><rect x="159" y="110" width="2.4" height="17" fill="#2e2218"/></g><rect x="159" y="118" width="2.6" height="9" fill="#2e2218" transform="rotate(60 160 126)"/>`;
    leben += zahnrad(44, 262, 40, 12, messing, 'wb-drehen wb-drehen--langsam') + zahnrad(108, 290, 22, 9, '#a8823a', 'wb-drehen wb-drehen--rueck') + zahnrad(290, 276, 34, 11, '#b8923a', 'wb-drehen wb-drehen--rueck');
    for (let i = 0; i < 3; i++) leben += `<circle class="wb-rauch" style="animation-delay:-${i * 1.6}s" cx="262" cy="186" r="9" fill="#f2e6d6" opacity="0.8" filter="url(#w)"/>`;
    leben += teilchen('funkeln', 6, [20, 300, 60, 240], z, ['#ffe08a'], [1.2, 2]);
    return { bild, leben };
  },

  /* ---------- 11 Zuckerland: Bonbonhügel, Lollis, Schokofluss ---------- */
  11(welt, z) {
    const f = { ...kartenThema(welt).farben, laub: '#ff6fa8', laubHell: '#ffd0e4', laubDunkel: '#c83a7a' };
    const schoko = 'M-10 262 Q70 246 140 262 Q210 278 330 254';
    let bild = grundDefs(f).replace('</defs>', `${verlauf('h11', [[0, '#ff8fd0'], [0.6, '#ffc8ea'], [1, '#fff0f8']])}${verlauf('huegel11', [[0, '#a8f0d0'], [1, '#5fc8a0']])}${verlauf('huegel11b', [[0, '#ffd0ea'], [1, '#f08ac0']])}</defs>`);
    bild += `<rect width="${B}" height="${H}" fill="url(#h11)"/>`;
    bild += wolkeZeichnen(80, 50, 0.55, z) + wolkeZeichnen(250, 70, 0.45, z);
    // Cupcake-Berg.
    bild += `<path d="M196 200 L210 140 L290 140 L304 200 Z" fill="#c88a5a"/><path d="M210 140 L216 200 M230 140 L232 200 M250 140 L250 200 M270 140 L268 200 M290 140 L284 200" stroke="#a86a3a" stroke-width="2"/>
      <path d="M200 144 Q204 104 236 104 Q240 76 262 84 Q290 80 290 108 Q306 116 300 144 Z" fill="#ffe0f0"/><circle cx="258" cy="74" r="10" fill="#ff3a5a"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${214 + i * 13}" y="${112 + (i % 3) * 8}" width="6" height="2.4" rx="1" fill="${['#5fc8ff', '#ffd84a', '#8aff8a'][i % 3]}" transform="rotate(${i * 30} ${217 + i * 13} ${113 + (i % 3) * 8})"/>`).join('')}`;
    // Hügel mit Streifen.
    bild += `<path d="M-10 230 Q60 170 140 220 L140 300 L-10 300 Z" fill="url(#huegel11)"/><path d="M-10 200 Q30 196 60 210 M10 230 Q60 214 110 226" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.6"/>
      <path d="M110 240 Q200 190 330 230 L330 300 L110 300 Z" fill="url(#huegel11b)"/>`;
    bild += `<path d="${schoko}" stroke="#5a2a14" stroke-width="22" fill="none"/><path d="${schoko}" stroke="#8a4a24" stroke-width="14" fill="none"/>`;
    bild += DEKO.baum_lolli({ x: 54, y: 296, s: 0.7, v: 1 }, f, z).svg + DEKO.baum_lolli({ x: 290, y: 290, s: 0.55, v: 2 }, { ...f, laub: '#5fc8ff', laubHell: '#cfefff', laubDunkel: '#2f8ac8' }, z).svg;
    bild += `<path d="M180 296 L180 236 Q180 220 196 220 Q212 220 212 236" stroke="#ffffff" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M180 296 L180 236 Q180 220 196 220 Q212 220 212 236" stroke="#ff3a5a" stroke-width="9" fill="none" stroke-dasharray="7 7" stroke-linecap="butt"/>`;
    let leben = `<path class="wb-fliessen wb-fliessen--langsam" d="${schoko}" stroke="#b8784a" stroke-width="3" stroke-dasharray="12 14" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < 16; i++) {
      const x = zwischen(z, 0, 320);
      const y = zwischen(z, -20, 240);
      const dauer = r(zwischen(z, 3, 6));
      leben += `<rect class="wb-fallen" style="animation-duration:${dauer}s;animation-delay:-${r(z() * dauer)}s" x="${r(x)}" y="${r(y)}" width="2" height="6" rx="1" fill="${['#ff3a5a', '#5fc8ff', '#ffd84a', '#8aff8a', '#ffffff'][i % 5]}"/>`;
    }
    leben += teilchen('funkeln', 5, [20, 300, 20, 200], z, ['#ffffff'], [1.4, 2.2]);
    return { bild, leben };
  },

  /* ---------- 12 Sternenwelt: Nebel, Planet, schwebende Kristalle ---------- */
  12(welt, z) {
    const f = kartenThema(welt).farben;
    let bild = grundDefs(f).replace(
      '</defs>',
      `${verlauf('h12', [[0, '#05031a'], [0.6, '#1a1250'], [1, '#2e1f78']])}${glut('neb12a', '#c05cff', 0.6)}${glut('neb12b', '#3fb6ff', 0.5)}${glut('neb12c', '#ff6fa8', 0.4)}
       ${verlauf('planet12', [[0, '#ffd08a'], [0.5, '#e07a4a'], [1, '#7a2a4a']])}</defs>`
    );
    bild += `<rect width="${B}" height="${H}" fill="url(#h12)"/>
      <ellipse cx="90" cy="110" rx="140" ry="70" fill="url(#neb12a)"/><ellipse cx="240" cy="160" rx="120" ry="60" fill="url(#neb12b)"/><ellipse cx="180" cy="60" rx="100" ry="40" fill="url(#neb12c)"/>`;
    for (let i = 0; i < 60; i++) bild += `<circle cx="${r(zwischen(z, 0, B))}" cy="${r(zwischen(z, 0, H))}" r="${r(zwischen(z, 0.4, 1.3))}" fill="#ffffff" opacity="${r(zwischen(z, 0.3, 0.95))}"/>`;
    // Planet mit Ring.
    bild += `<ellipse cx="236" cy="86" rx="62" ry="12" fill="none" stroke="#ffe2a8" stroke-width="5" opacity="0.6" transform="rotate(-14 236 86)"/>
      <circle cx="236" cy="86" r="34" fill="url(#planet12)"/><path d="M208 76 Q236 70 264 80 M206 92 Q236 88 266 98" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.25"/>
      <path d="M180 100 A62 12 -14 0 0 296 72" stroke="#ffe2a8" stroke-width="5" fill="none" opacity="0.85" transform="rotate(0)"/>`;
    // Schwebende Felsen mit goldenen Kristallen.
    const gold = ['#fff6c0', '#ffd84a', '#c88a1a'];
    bild += `<path d="M30 250 Q90 236 150 250 L120 286 L80 296 L44 278 Z" fill="#2a2058" stroke="#6a5aa8" stroke-width="2"/>${kristallBuschel(90, 250, 90, z, gold)}`;
    bild += `<path d="M210 230 Q250 222 290 232 L270 256 L236 262 Z" fill="#2a2058" stroke="#6a5aa8" stroke-width="2"/>${kristallBuschel(250, 232, 46, z, ['#e6f4ff', '#8fd0ff', '#3a6ac8'])}`;
    let leben = teilchen('funkeln', 16, [0, 320, 0, 300], z, ['#ffffff', '#fff3b0', '#c8e8ff'], [1, 2.4]);
    leben += `<g class="wb-komet"><path d="M60 30 L0 6" stroke="#ffffff" stroke-width="2" opacity="0.8" stroke-linecap="round"/><circle cx="60" cy="30" r="2.6" fill="#ffffff"/></g>`;
    leben += `<ellipse class="wb-puls wb-puls--lang" cx="90" cy="220" rx="50" ry="40" fill="url(#neb12c)"/>`;
    return { bild, leben };
  },
};

/** Ersatz für Welten ohne eigene Szene: Himmel, Berge, Hügel und Bäume in ihren Farben. */
function standardSzene(welt, z) {
  const thema = kartenThema(welt);
  const f = thema.farben;
  let bild = grundDefs(f).replace('</defs>', `${verlauf('hs', [[0, f.himmelOben], [1, f.himmelUnten]])}</defs>`);
  bild += `<rect width="${B}" height="${H}" fill="url(#hs)"/>`;
  bild += bergketteZeichnen(B, 190, 100, 110, z, f.bergFern, f.bergFernHell, f.schnee, 0.6);
  bild += huegelreiheZeichnen(B, 200, 20, z, f.huegelFern, f.wald);
  bild += boden(240, f.wiese, f.wieseHell, z);
  bild += (DEKO[`baum_${thema.baum}`] ?? DEKO.baum_laub)({ x: 60, y: 296, s: 0.8, v: 1 }, f, z).svg;
  bild += felsBrocken(220, 280, 18, f, z);
  return { bild, leben: teilchen('funkeln', 6, [20, 300, 40, 260], z, ['#ffffff'], [1.2, 2]) };
}

/**
 * Die Szene einer Welt.
 * @returns {{bild: string, leben: string}} Inhalte für ein SVG mit viewBox 0 0 B H
 */
export function szeneZeichnen(welt) {
  const z = wuerfel(welt.id * 7717 + 3);
  return (SZENEN[welt.id] ?? standardSzene)(welt, z);
}

/** Gibt es für diese Welt eine eigens gestaltete Szene? */
export function hatEigeneSzene(weltId) {
  return Boolean(SZENEN[weltId]);
}
