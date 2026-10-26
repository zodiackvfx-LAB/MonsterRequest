/**
 * Zeichnet die Landschaft einer Weltkarte als SVG.
 *
 * Hier entstehen nur Zeichenketten - kein HTML-Element. js/ui/weltkarte/
 * karte.js macht daraus Bilder. Die stehende Landschaft wird so EINMAL
 * gerastert und kostet beim Scrollen fast nichts; alles, was sich bewegt
 * (Wasser, Gras, Schmetterlinge ...), liegt als eigene Ebene darüber
 * (js/ui/weltkarte/leben.js).
 *
 * Licht kommt von oben links: Lichtkanten links oben, Schatten fallen nach
 * rechts unten. Alle Maße in Karteneinheiten (die Spur ist 1000 breit).
 */

import { r, wuerfel, zwischen } from './geometrie.js';
import { mischen } from '../../data/weltkarten.js';

/* ================================================================== */
/*  Gemeinsame Verläufe und Filter                                     */
/* ================================================================== */

/** Verläufe, Muster und Filter, die jedes Teilbild braucht. */
export function defsZeichnen(karte, f) {
  return `
  <defs>
    <filter id="weich" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="weich2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>
    <filter id="dunst" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="16"/></filter>
    <linearGradient id="boden" gradientUnits="userSpaceOnUse" x1="0" y1="${karte.horizont}" x2="0" y2="${karte.hoehe}">
      <stop offset="0" stop-color="${mischen(f.wieseHell, f.himmelUnten, 0.18)}"/>
      <stop offset="0.06" stop-color="${f.wieseHell}"/>
      <stop offset="0.35" stop-color="${f.wiese}"/>
      <stop offset="1" stop-color="${mischen(f.wiese, f.wieseDunkel, 0.35)}"/>
    </linearGradient>
    <radialGradient id="fleckHell"><stop offset="0" stop-color="${f.wieseHell}" stop-opacity="0.75"/><stop offset="1" stop-color="${f.wieseHell}" stop-opacity="0"/></radialGradient>
    <radialGradient id="fleckDunkel"><stop offset="0" stop-color="${f.wieseDunkel}" stop-opacity="0.5"/><stop offset="1" stop-color="${f.wieseDunkel}" stop-opacity="0"/></radialGradient>
    <radialGradient id="fleckGelb"><stop offset="0" stop-color="${mischen(f.wieseHell, '#fff3a0', 0.5)}" stop-opacity="0.55"/><stop offset="1" stop-color="#fff3a0" stop-opacity="0"/></radialGradient>
    <pattern id="halme" width="46" height="38" patternUnits="userSpaceOnUse">
      <path d="M6 30 q2 -9 5 -12 M9 31 q0 -8 -3 -12 M30 14 q2 -8 5 -10 M33 15 q-1 -7 -4 -10" stroke="${f.wieseDunkel}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.32"/>
      <path d="M22 34 q1 -6 4 -9 M40 30 q1 -5 3 -7" stroke="${f.wieseHell}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.45"/>
    </pattern>
    <radialGradient id="laubKugel" cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stop-color="${f.laubHell}"/><stop offset="0.5" stop-color="${f.laub}"/><stop offset="1" stop-color="${f.laubDunkel}"/>
    </radialGradient>
    <radialGradient id="blueteKugel" cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stop-color="${f.blueteHell}"/><stop offset="0.5" stop-color="${f.bluete}"/><stop offset="1" stop-color="${f.blueteDunkel}"/>
    </radialGradient>
    <linearGradient id="stamm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${mischen(f.stamm, '#ffffff', 0.2)}"/><stop offset="0.55" stop-color="${f.stamm}"/><stop offset="1" stop-color="${mischen(f.stamm, '#000000', 0.4)}"/>
    </linearGradient>
    <linearGradient id="fels" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="${f.felsHell}"/><stop offset="0.45" stop-color="${f.fels}"/><stop offset="1" stop-color="${f.felsDunkel}"/>
    </linearGradient>
    <linearGradient id="klippe" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${mischen(f.fels, '#ffffff', 0.15)}"/><stop offset="0.5" stop-color="${mischen(f.fels, f.felsDunkel, 0.4)}"/><stop offset="1" stop-color="${mischen(f.felsDunkel, '#000', 0.2)}"/>
    </linearGradient>
    <linearGradient id="moos" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${mischen(f.moos, '#ffffff', 0.25)}"/><stop offset="1" stop-color="${mischen(f.moos, '#000000', 0.25)}"/>
    </linearGradient>
    <linearGradient id="holz" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${mischen(f.holz, '#ffffff', 0.2)}"/><stop offset="1" stop-color="${f.holzDunkel}"/>
    </linearGradient>
    <radialGradient id="seeWasser" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="${f.wasserHell}"/><stop offset="0.45" stop-color="${f.wasser}"/><stop offset="1" stop-color="${f.wasserTief}"/>
    </radialGradient>
    <linearGradient id="fall" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${mischen(f.wasserHell, '#ffffff', 0.3)}"/>
      <stop offset="0.35" stop-color="#ffffff"/>
      <stop offset="0.7" stop-color="${f.wasserHell}"/>
      <stop offset="1" stop-color="${f.wasser}"/>
    </linearGradient>
    <radialGradient id="lampe"><stop offset="0" stop-color="#ffe9a0" stop-opacity="0.9"/><stop offset="1" stop-color="#ffb93d" stop-opacity="0"/></radialGradient>
    <linearGradient id="dunstOben" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${f.himmelUnten}" stop-opacity="0.85"/><stop offset="1" stop-color="${f.himmelUnten}" stop-opacity="0"/>
    </linearGradient>
  </defs>`;
}

/* ================================================================== */
/*  Hintergrund: Himmel, Wolken, Berge, ferne Hügel                    */
/* ================================================================== */

/**
 * Die hinterste Ebene. Sie bewegt sich beim Scrollen langsamer als die
 * Karte (Parallaxe) und reicht deshalb etwas unter den Horizont.
 *
 * @returns {{svg: string, hoehe: number}}
 */
export function hintergrundZeichnen(karte, f, thema) {
  const { breite, horizont } = karte;
  const hoehe = horizont + 320;
  const zufall = wuerfel(thema.id * 131 + 7);
  const sonne = { x: breite * 0.24, y: horizont * 0.22 };

  let svg = `
  <defs>
    <linearGradient id="himmel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${f.himmelOben}"/>
      <stop offset="0.75" stop-color="${mischen(f.himmelOben, f.himmelUnten, 0.75)}"/>
      <stop offset="1" stop-color="${f.himmelUnten}"/>
    </linearGradient>
    <radialGradient id="sonne"><stop offset="0" stop-color="${f.sonne}" stop-opacity="0.95"/><stop offset="0.25" stop-color="${f.sonne}" stop-opacity="0.45"/><stop offset="1" stop-color="${f.sonne}" stop-opacity="0"/></radialGradient>
    <linearGradient id="bergFern" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f.bergFernHell}"/><stop offset="1" stop-color="${f.bergFern}"/></linearGradient>
    <linearGradient id="bergNah" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f.bergNahHell}"/><stop offset="0.7" stop-color="${f.bergNah}"/><stop offset="1" stop-color="${mischen(f.bergNah, f.huegelFern, 0.5)}"/></linearGradient>
    <linearGradient id="dunst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f.himmelUnten}" stop-opacity="0"/><stop offset="1" stop-color="${f.himmelUnten}" stop-opacity="0.9"/></linearGradient>
    <linearGradient id="wolke" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#ffffff"/><stop offset="1" stop-color="${mischen(f.himmelUnten, f.himmelOben, 0.35)}"/></linearGradient>
    <filter id="w" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="d" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <rect x="0" y="0" width="${breite}" height="${hoehe}" fill="url(#himmel)"/>
  <circle cx="${r(sonne.x)}" cy="${r(sonne.y)}" r="${r(horizont * 0.9)}" fill="url(#sonne)"/>
  <circle cx="${r(sonne.x)}" cy="${r(sonne.y)}" r="34" fill="#fffbe8" opacity="0.95"/>`;

  // Sonnenstrahlen: ein paar breite, fast durchsichtige Keile.
  for (let i = 0; i < 6; i++) {
    const winkel = 0.35 + i * 0.32 + zwischen(zufall, -0.08, 0.08);
    const laenge = horizont * 1.6;
    const breiteKeil = 0.06;
    const a = { x: sonne.x + Math.cos(winkel - breiteKeil) * laenge, y: sonne.y + Math.sin(winkel - breiteKeil) * laenge };
    const b = { x: sonne.x + Math.cos(winkel + breiteKeil) * laenge, y: sonne.y + Math.sin(winkel + breiteKeil) * laenge };
    svg += `<path d="M${r(sonne.x)} ${r(sonne.y)} L${r(a.x)} ${r(a.y)} L${r(b.x)} ${r(b.y)} Z" fill="${f.sonne}" opacity="0.10"/>`;
  }

  // Gemalte Wolken am Himmel (die ziehenden liegen in leben.js darüber).
  for (let i = 0; i < Math.ceil(breite / 450); i++) {
    const x = zwischen(zufall, 0, breite);
    const y = zwischen(zufall, horizont * 0.12, horizont * 0.55);
    svg += wolkeZeichnen(x, y, zwischen(zufall, 0.7, 1.3), zufall);
  }

  // Ferne Bergkette mit Schnee.
  svg += bergketteZeichnen(breite, horizont + 40, horizont * 0.62, 340, zufall, 'url(#bergFern)', f.bergFernHell, f.schnee, 0.8);
  svg += `<rect x="0" y="${r(horizont * 0.55)}" width="${breite}" height="${r(horizont * 0.5)}" fill="url(#dunst)" opacity="0.6"/>`;
  // Nähere Kette, tiefer und kräftiger.
  svg += bergketteZeichnen(breite, horizont + 60, horizont * 0.4, 260, zufall, 'url(#bergNah)', f.bergNahHell, f.schnee, 0.4);

  // Ein ferner Wasserfall an der nahen Kette.
  if (thema.deko.wasserfall) {
    const wx = breite * zwischen(zufall, 0.62, 0.8);
    const wy = horizont - horizont * 0.22;
    svg += `<path d="M${r(wx - 5)} ${r(wy)} L${r(wx + 5)} ${r(wy)} L${r(wx + 9)} ${r(horizont + 10)} L${r(wx - 9)} ${r(horizont + 10)} Z" fill="#ffffff" opacity="0.75"/>
      <ellipse cx="${r(wx)}" cy="${r(horizont + 8)}" rx="30" ry="12" fill="#ffffff" opacity="0.6" filter="url(#w)"/>`;
  }

  svg += `<rect x="0" y="${r(horizont - 120)}" width="${breite}" height="200" fill="url(#dunst)" opacity="0.7"/>`;

  // Ferne Hügel mit Waldrand.
  svg += huegelreiheZeichnen(breite, horizont + 10, 70, zufall, mischen(f.huegelFern, f.himmelUnten, 0.35), mischen(f.wald, f.himmelUnten, 0.4));
  svg += huegelreiheZeichnen(breite, horizont + 70, 60, zufall, f.huegelFern, mischen(f.wald, f.himmelUnten, 0.15));
  svg += `<rect x="0" y="${r(horizont + 60)}" width="${breite}" height="260" fill="${f.huegelFern}"/>`;

  return { svg, hoehe };
}

function wolkeZeichnen(x, y, s, zufall) {
  const teile = [];
  const n = 5 + Math.floor(zufall() * 3);
  for (let i = 0; i < n; i++) {
    const dx = (i - (n - 1) / 2) * 34 * s;
    const rr = (30 + zufall() * 26 - Math.abs(i - (n - 1) / 2) * 6) * s;
    teile.push(`<circle cx="${r(x + dx)}" cy="${r(y - rr * 0.35)}" r="${r(rr)}"/>`);
  }
  return `<g fill="url(#wolke)" opacity="0.9" filter="url(#w)">${teile.join('')}<rect x="${r(x - n * 18 * s)}" y="${r(y - 6 * s)}" width="${r(n * 36 * s)}" height="${r(22 * s)}" rx="${r(11 * s)}"/></g>`;
}

/**
 * Eine Bergkette: Gipfel nebeneinander, jeder mit beleuchteter Flanke und
 * (wenn hoch genug) einer Schneekappe.
 */
function bergketteZeichnen(breite, fuss, maxHoehe, abstand, zufall, fuellung, licht, schnee, schneeAnteil) {
  let d = `M-40 ${r(fuss)}`;
  const gipfel = [];
  let x = -zwischen(zufall, 40, 120);
  while (x < breite + 200) {
    const h = maxHoehe * zwischen(zufall, 0.55, 1);
    const w = abstand * zwischen(zufall, 0.75, 1.25);
    gipfel.push({ x: x + w / 2, y: fuss - h, w, h });
    x += w * zwischen(zufall, 0.55, 0.8);
  }
  gipfel.forEach((g) => {
    d += ` L${r(g.x - g.w * 0.5)} ${r(fuss - g.h * 0.15)} L${r(g.x - g.w * 0.08)} ${r(g.y + g.h * 0.06)} L${r(g.x)} ${r(g.y)} L${r(g.x + g.w * 0.12)} ${r(g.y + g.h * 0.1)}`;
  });
  d += ` L${breite + 40} ${r(fuss)} Z`;

  let svg = `<path d="${d}" fill="${fuellung}"/>`;
  gipfel.forEach((g) => {
    // Lichtflanke links des Grats.
    svg += `<path d="M${r(g.x)} ${r(g.y)} L${r(g.x - g.w * 0.08)} ${r(g.y + g.h * 0.06)} L${r(g.x - g.w * 0.42)} ${r(fuss - g.h * 0.12)} L${r(g.x - g.w * 0.05)} ${r(fuss - g.h * 0.3)} Z" fill="${licht}" opacity="0.55"/>`;
    // Rinnen und Grate, die vom Gipfel herablaufen.
    for (let k = 0; k < 3; k++) {
      const richtung = k === 0 ? -0.05 : k === 1 ? 0.18 : 0.32;
      let x = g.x + g.w * richtung * 0.2;
      let y = g.y + g.h * (0.12 + k * 0.06);
      let rinne = `M${r(x)} ${r(y)}`;
      for (let s = 0; s < 4; s++) {
        x += g.w * (richtung * 0.22 + zwischen(zufall, -0.03, 0.03));
        y += g.h * 0.16;
        rinne += ` L${r(x)} ${r(y)}`;
      }
      svg += `<path d="${rinne}" stroke="#2a3a6a" stroke-width="${r(Math.max(3, g.w * 0.02))}" fill="none" opacity="0.08" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    if (g.h / maxHoehe > 1 - schneeAnteil) {
      const k = g.h * 0.26;
      // Schneekappe mit gezackter Unterkante; rechte Hälfte im Schatten.
      const zacken = [
        [0.12, 0.1], [0.11, k / g.h], [0.06, k / g.h * 0.72], [0.02, k / g.h * 1.1], [-0.03, k / g.h * 0.8], [-0.07, k / g.h * 1.18], [-0.11, k / g.h * 0.78], [-0.08, 0.06],
      ];
      const kappe = `M${r(g.x)} ${r(g.y)} ` + zacken.map(([dx, dy]) => `L${r(g.x + g.w * dx)} ${r(g.y + g.h * dy)}`).join(' ') + ' Z';
      svg += `<path d="${kappe}" fill="${schnee}"/>
      <path d="M${r(g.x)} ${r(g.y)} L${r(g.x + g.w * 0.12)} ${r(g.y + g.h * 0.1)} L${r(g.x + g.w * 0.11)} ${r(g.y + k)} L${r(g.x + g.w * 0.06)} ${r(g.y + k * 0.72)} L${r(g.x + g.w * 0.02)} ${r(g.y + k * 1.1)} Z" fill="${mischen(schnee, '#7f9ccf', 0.35)}"/>`;
    }
  });
  return svg;
}

/** Sanft gewellte Hügel, oben ein Saum aus runden Baumkronen. */
function huegelreiheZeichnen(breite, basis, wellen, zufall, farbe, waldFarbe) {
  let d = `M-40 ${r(basis + 300)} L-40 ${r(basis)}`;
  let wald = '';
  for (let x = -40; x < breite + 80; x += 160) {
    const y = basis - zwischen(zufall, 0, wellen);
    d += ` Q${r(x + 40)} ${r(y - 30)} ${r(x + 80)} ${r(y)} T${r(x + 160)} ${r(basis - zwischen(zufall, 0, wellen) * 0.6)}`;
    // Baumkronen-Saum.
    for (let t = 0; t < 6; t++) {
      const bx = x + t * 27 + zufall() * 10;
      const by = y + zufall() * 18 - 6;
      wald += `<circle cx="${r(bx)}" cy="${r(by)}" r="${r(10 + zufall() * 9)}"/>`;
    }
  }
  d += ` L${breite + 40} ${r(basis + 300)} Z`;
  return `<g fill="${waldFarbe}">${wald}</g><path d="${d}" fill="${farbe}"/>`;
}

/* ================================================================== */
/*  Boden: Wiese, Flecken, Weg, Wasser                                 */
/* ================================================================== */

/**
 * Alle Teile der Landschaft vor dem Hintergrund, jeweils mit dem Bereich
 * (y0 bis y1), in dem sie liegen. karte.js schneidet die Karte damit in
 * Streifen, damit kein riesiges Einzelbild entsteht.
 *
 * @returns {{svg: string, y0: number, y1: number}[]}
 */
export function bodenZeichnen(karte, f, thema, { ohneWiegendes = false } = {}) {
  const { breite, hoehe, horizont } = karte;
  const zufall = wuerfel(thema.id * 977 + 3);
  const teile = [];
  const teil = (svg, y0, y1) => teile.push({ svg, y0, y1 });

  // Grundfläche mit gewelltem oberem Rand (dort beginnt die Wiese).
  let rand = `M-60 ${hoehe + 60} L-60 ${horizont + 30}`;
  for (let x = -60; x < breite + 120; x += 140) {
    rand += ` Q${r(x + 70)} ${r(horizont + zwischen(zufall, -10, 30))} ${r(x + 140)} ${r(horizont + zwischen(zufall, 10, 40))}`;
  }
  rand += ` L${breite + 60} ${hoehe + 60} Z`;
  teil(`<path d="${rand}" fill="url(#boden)"/><path d="${rand}" fill="url(#halme)"/>`, horizont - 20, hoehe + 60);

  // Waldsaum am oberen Rand: eine Reihe runder Kronen im Dunst.
  let saum = '';
  for (let x = -40; x < breite + 40; x += 24) {
    const y = horizont + 26 + Math.sin(x / 90) * 12 + zufall() * 10;
    saum += `<circle cx="${r(x)}" cy="${r(y)}" r="${r(16 + zufall() * 14)}"/>`;
  }
  teil(
    `<g fill="${mischen(f.wald, f.himmelUnten, 0.3)}">${saum}</g>
     <g fill="${mischen(f.laub, f.himmelUnten, 0.25)}" opacity="0.7">${saum.replace(/cy="([\d.]+)"/g, (_, y) => `cy="${r(Number(y) - 6)}"`).replace(/r="([\d.]+)"/g, (_, v) => `r="${r(Number(v) * 0.6)}"`)}</g>`,
    horizont - 20,
    horizont + 120
  );

  // Licht- und Schattenflecken: die Wiese wirkt dadurch gemalt statt flach.
  const anzahl = Math.round((breite * (hoehe - horizont)) / 1e6 * 9);
  for (let i = 0; i < anzahl; i++) {
    const x = zwischen(zufall, -100, breite + 100);
    const y = zwischen(zufall, horizont + 120, hoehe + 50);
    const rx = zwischen(zufall, 120, 300);
    const art = zufall() < 0.45 ? 'fleckHell' : zufall() < 0.6 ? 'fleckDunkel' : 'fleckGelb';
    teil(`<ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(rx)}" ry="${r(rx * 0.5)}" fill="url(#${art})"/>`, y - rx * 0.5, y + rx * 0.5);
  }

  // Wasser: Bach oben, Wasserfall, Fluss, See.
  for (const fluss of karte.fluesse) {
    if (fluss.klippe) teil(klippeZeichnen(fluss, f, zufall), fluss.klippe.y1 - 40, fluss.klippe.y2 + 60);
    if (fluss.quelle) teil(flussZeichnen(fluss.quelle.d, f, 0.72), fluss.klippe.y1 - 220, fluss.klippe.y1 + 20);
    const ys = fluss.proben.map((p) => p.y);
    teil(flussZeichnen(fluss.d, f, 1) + uferSteine(fluss.proben, f, zufall), Math.min(...ys) - 80, Math.max(...ys) + 80);
    if (fluss.wasserfall) teil(wasserfallZeichnen(fluss.wasserfall, f), fluss.wasserfall.y - fluss.wasserfall.hoehe - 10, fluss.wasserfall.y + 60);
  }
  if (karte.see) teil(seeZeichnen(karte.see, f, zufall), karte.see.y - karte.see.ry - 60, karte.see.y + karte.see.ry + 60);

  // Der Erdweg unter der goldenen Lichtspur.
  teil(wegZeichnen(karte, f, zufall), horizont, hoehe + 80);

  for (const fluss of karte.fluesse) teil(brueckeZeichnen(fluss.bruecke, f), fluss.bruecke.y - 90, fluss.bruecke.y + 110);

  // Bäume, Felsen, Blumen ... (schon von hinten nach vorn sortiert)
  for (const d of karte.deko) {
    // Wiegendes Gras zeichnet leben.js als eigene, bewegte Ebene.
    if (ohneWiegendes && d.wiegt) continue;
    const zeichner = DEKO[d.art === 'baum' ? `baum_${thema.baum}` : d.art] ?? DEKO[d.art];
    if (!zeichner) continue;
    const { svg, oben, unten } = zeichner(d, f, wuerfel(d.v * 31 + d.x));
    teil(svg, d.y - oben * d.s, d.y + unten * d.s);
  }
  return teile;
}

function flussZeichnen(d, f, s) {
  return `
    <path d="${d}" stroke="${f.ufer}" stroke-width="${r(104 * s)}" fill="none" stroke-linecap="round" opacity="0.55" filter="url(#weich2)"/>
    <path d="${d}" stroke="${mischen(f.ufer, f.wieseDunkel, 0.4)}" stroke-width="${r(90 * s)}" fill="none" stroke-linecap="round"/>
    <path d="${d}" stroke="${f.wasserTief}" stroke-width="${r(76 * s)}" fill="none" stroke-linecap="round"/>
    <path d="${d}" stroke="${f.wasser}" stroke-width="${r(60 * s)}" fill="none" stroke-linecap="round"/>
    <path d="${d}" stroke="${f.wasserHell}" stroke-width="${r(22 * s)}" fill="none" stroke-linecap="round" opacity="0.45" transform="translate(-8 -3)"/>
    <path d="${d}" stroke="#ffffff" stroke-width="${r(3 * s)}" fill="none" stroke-dasharray="14 46" opacity="0.6" transform="translate(-12 -2)"/>
    <path d="${d}" stroke="#ffffff" stroke-width="${r(2.5 * s)}" fill="none" stroke-dasharray="10 60" opacity="0.5" transform="translate(14 4)"/>`;
}

/** Kleine Steine am Flussufer, mal links, mal rechts. */
function uferSteine(proben, f, zufall) {
  let svg = '';
  for (let i = 6; i < proben.length - 6; i += 7) {
    if (zufall() < 0.45) continue;
    const a = proben[i];
    const b = proben[i + 1];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const seite = zufall() < 0.5 ? 1 : -1;
    const x = a.x + (-(b.y - a.y) / l) * 46 * seite;
    const y = a.y + ((b.x - a.x) / l) * 46 * seite;
    const g = zwischen(zufall, 7, 15);
    svg += `<ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(g)}" ry="${r(g * 0.7)}" fill="url(#fels)"/>`;
    if (zufall() < 0.5) svg += `<ellipse cx="${r(x - g * 0.2)}" cy="${r(y - g * 0.45)}" rx="${r(g * 0.6)}" ry="${r(g * 0.3)}" fill="${f.moos}"/>`;
  }
  return svg;
}

/**
 * Felskante mit Wasserfall: eine Stufe in der Wiese, vom Kartenrand bis
 * kurz hinter den Wasserfall. Die Wand besteht aus einzelnen Felssäulen,
 * oben hängt Moos über die Kante, unten liegen Brocken ums Becken.
 */
function klippeZeichnen(fluss, f, zufall) {
  const { x1, x2, y1, y2 } = fluss.klippe;
  const fall = fluss.wasserfall;
  const innen = fluss.seite > 0 ? x2 : x1; // dort läuft die Kante aus
  const aussen = fluss.seite > 0 ? x1 : x2;
  const hoch = y2 - y1;
  const tFall = (fall.x - aussen) / (innen - aussen);

  // Ober- und Unterkante: bis kurz hinter den Wasserfall volle Höhe,
  // danach läuft die Wand flach in die Wiese aus.
  const schritte = 16;
  const oben = [];
  const unten = [];
  for (let i = 0; i <= schritte; i++) {
    const t = i / schritte;
    const x = aussen + (innen - aussen) * t;
    const auslauf = t <= tFall + 0.12 ? 0 : Math.min(1, (t - tFall - 0.12) / Math.max(0.05, 1 - tFall - 0.12));
    const kante = y1 + 14 + zwischen(zufall, -7, 7) + auslauf * hoch * 0.55;
    const fuss = y2 - auslauf * hoch * 0.4 + zwischen(zufall, -4, 4);
    oben.push({ x, y: kante });
    unten.push({ x, y: Math.max(kante + 2, fuss) });
  }
  const pfad = (punkte) => punkte.map((p, i) => `${i ? 'L' : 'M'}${r(p.x)} ${r(p.y)}`).join(' ');
  const flaeche = `${pfad(oben)} ${pfad([...unten].reverse()).replace('M', 'L')} Z`;

  // Schatten unter der Wand und eine dunkle Grundfläche.
  let svg = `<path d="${pfad(unten)}" stroke="#000" stroke-width="30" opacity="0.2" fill="none" filter="url(#weich2)" transform="translate(0 12)"/>
    <path d="${flaeche}" fill="${f.felsDunkel}"/>`;

  // Felsblöcke unterschiedlicher Breite: oben eine helle Kante, darunter
  // dunkler werdend; dazwischen tiefe Spalten.
  const dunkel = mischen(f.felsDunkel, '#000', 0.3);
  for (let i = 0; i < schritte; ) {
    const breite = Math.min(schritte - i, 1 + Math.floor(zufall() * 3));
    const a = oben[i];
    const b = oben[i + breite];
    const ua = unten[i];
    const ub = unten[i + breite];
    i += breite;
    if (Math.max(ua.y - a.y, ub.y - b.y) < 12) continue;
    const einzug = zwischen(zufall, 3, 7);
    const xl = Math.min(a.x, b.x) + einzug;
    const xr = Math.max(a.x, b.x) - einzug;
    const yo = (a.y + b.y) / 2;
    const yu = (ua.y + ub.y) / 2;
    const d = `M${r(xl)} ${r(a.y + 6)} Q${r((xl + xr) / 2)} ${r(yo - zwischen(zufall, 0, 8))} ${r(xr)} ${r(b.y + 6)}
      L${r(xr - zwischen(zufall, 0, 6))} ${r(ub.y - 4)} Q${r((xl + xr) / 2)} ${r(yu + 6)} ${r(xl + zwischen(zufall, 0, 6))} ${r(ua.y - 4)} Z`;
    svg += `<path d="${d}" fill="url(#klippe)" stroke="${dunkel}" stroke-width="2.5" stroke-linejoin="round"/>`;
    // Helle Oberkante des Blocks.
    svg += `<path d="M${r(xl + 4)} ${r(a.y + 10)} Q${r((xl + xr) / 2)} ${r(yo + 1)} ${r(xr - 4)} ${r(b.y + 10)}" stroke="${f.felsHell}" stroke-width="4" fill="none" opacity="0.6" stroke-linecap="round"/>`;
    // Ein, zwei Bruchkanten quer durch den Block.
    const kanten = 1 + Math.floor(zufall() * 2);
    for (let k = 0; k < kanten; k++) {
      const t = zwischen(zufall, 0.3, 0.75);
      const y = yo + (yu - yo) * t;
      svg += `<path d="M${r(xl + 2)} ${r(y)} q${r((xr - xl) * 0.5)} ${r(zwischen(zufall, -8, 8))} ${r(xr - xl - 4)} ${r(zwischen(zufall, -6, 6))}" stroke="${dunkel}" stroke-width="2" fill="none" opacity="0.55"/>`;
      svg += `<path d="M${r(xl + 2)} ${r(y + 3)} q${r((xr - xl) * 0.5)} 0 ${r(xr - xl - 4)} 0" stroke="${f.felsHell}" stroke-width="1.5" fill="none" opacity="0.3"/>`;
    }
  }

  // Grasnarbe auf der Kante, Moos und Ranken hängen herab.
  svg += `<path d="${pfad(oben)}" stroke="${mischen(f.wieseDunkel, '#000', 0.15)}" stroke-width="20" fill="none" stroke-linecap="round" transform="translate(0 4)"/>
    <path d="${pfad(oben)}" stroke="${f.wiese}" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="${pfad(oben)}" stroke="${f.wieseHell}" stroke-width="5" fill="none" stroke-linecap="round" transform="translate(0 -5)" opacity="0.9"/>`;
  for (let i = 0; i < schritte; i++) {
    if (zufall() < 0.4 || unten[i].y - oben[i].y < 30) continue;
    const p = oben[i];
    const x = p.x + zwischen(zufall, 0, 20);
    const laenge = zwischen(zufall, 24, Math.min(80, unten[i].y - oben[i].y - 10));
    svg += `<path d="M${r(x)} ${r(p.y + 6)} q${r(zwischen(zufall, -8, 8))} ${r(laenge / 2)} ${r(zwischen(zufall, -4, 4))} ${r(laenge)}" stroke="${mischen(f.moos, '#000', 0.2)}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    svg += `<circle cx="${r(x + 1)}" cy="${r(p.y + laenge * 0.55)}" r="4" fill="${f.moos}"/><circle cx="${r(x - 2)}" cy="${r(p.y + laenge * 0.85)}" r="3" fill="${f.laubHell}"/>`;
  }

  // Becken und Brocken am Fuß.
  svg += `<ellipse cx="${r(fall.x)}" cy="${r(fall.y + 12)}" rx="100" ry="36" fill="${f.ufer}" opacity="0.6" filter="url(#weich2)"/>
    <ellipse cx="${r(fall.x)}" cy="${r(fall.y + 10)}" rx="86" ry="30" fill="url(#seeWasser)"/>`;
  for (let i = 0; i < 8; i++) {
    const x = fall.x + zwischen(zufall, -125, 125);
    const y = fall.y + zwischen(zufall, -6, 34);
    if (Math.abs(x - fall.x) < 60) continue;
    svg += felsBrocken(x, y, zwischen(zufall, 13, 24), f, zufall);
  }
  return svg;
}

function wasserfallZeichnen(fall, f) {
  const { x, y, hoehe } = fall;
  const oben = y - hoehe;
  const b = fall.breite;
  let svg = `
    <path d="M${r(x - b * 0.42)} ${r(oben)} C${r(x - b * 0.5)} ${r(oben + hoehe * 0.4)} ${r(x - b * 0.6)} ${r(y - 30)} ${r(x - b * 0.62)} ${r(y)}
      L${r(x + b * 0.62)} ${r(y)} C${r(x + b * 0.6)} ${r(y - 30)} ${r(x + b * 0.5)} ${r(oben + hoehe * 0.4)} ${r(x + b * 0.42)} ${r(oben)} Z" fill="url(#fall)"/>`;
  // Senkrechte Wasserfäden.
  for (let i = -3; i <= 3; i++) {
    svg += `<path d="M${r(x + i * b * 0.11)} ${r(oben + 6)} L${r(x + i * b * 0.15)} ${r(y - 6)}" stroke="${i % 2 ? f.wasserHell : '#ffffff'}" stroke-width="${i % 2 ? 3 : 2}" opacity="0.7"/>`;
  }
  // Abbruchkante oben, Gischt unten.
  svg += `<ellipse cx="${r(x)}" cy="${r(oben + 2)}" rx="${r(b * 0.48)}" ry="8" fill="#ffffff" opacity="0.85"/>`;
  for (let i = 0; i < 9; i++) {
    const gx = x + (i - 4) * b * 0.17;
    svg += `<circle cx="${r(gx)}" cy="${r(y + 2 + (i % 3) * 4)}" r="${r(12 + (i % 4) * 4)}" fill="#ffffff" opacity="0.9"/>`;
  }
  svg += `<ellipse cx="${r(x)}" cy="${r(y - 6)}" rx="${r(b * 1.2)}" ry="34" fill="#ffffff" opacity="0.45" filter="url(#weich)"/>`;
  return svg;
}

function seeZeichnen(see, f, zufall) {
  const { x, y, rx, ry } = see;
  let svg = `
    <ellipse cx="${r(x + 10)}" cy="${r(y + 8)}" rx="${r(rx + 22)}" ry="${r(ry + 16)}" fill="${f.ufer}" opacity="0.55" filter="url(#weich2)"/>
    <ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(rx + 10)}" ry="${r(ry + 8)}" fill="${mischen(f.weg, f.ufer, 0.3)}"/>
    <ellipse cx="${r(x)}" cy="${r(y + 2)}" rx="${r(rx)}" ry="${r(ry)}" fill="url(#seeWasser)"/>
    <ellipse cx="${r(x - rx * 0.25)}" cy="${r(y - ry * 0.35)}" rx="${r(rx * 0.45)}" ry="${r(ry * 0.18)}" fill="#ffffff" opacity="0.3"/>
    <path d="M${r(x - rx * 0.6)} ${r(y + ry * 0.2)} q${r(rx * 0.2)} -6 ${r(rx * 0.4)} 0" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.5"/>
    <path d="M${r(x + rx * 0.1)} ${r(y + ry * 0.45)} q${r(rx * 0.15)} -5 ${r(rx * 0.3)} 0" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.4"/>`;
  // Seerosen.
  for (let i = 0; i < 4; i++) {
    const px = x + zwischen(zufall, -rx * 0.6, rx * 0.6);
    const py = y + zwischen(zufall, -ry * 0.4, ry * 0.5);
    const g = zwischen(zufall, 11, 17);
    svg += `<path d="M${r(px)} ${r(py)} L${r(px + g)} ${r(py - g * 0.18)} A${r(g)} ${r(g * 0.55)} 0 1 1 ${r(px + g * 0.9)} ${r(py + g * 0.3)} Z" fill="${mischen(f.laub, '#2f7f3a', 0.3)}"/>`;
    if (i % 2 === 0) svg += `<circle cx="${r(px - 2)}" cy="${r(py - 4)}" r="5" fill="#ffc3dc"/><circle cx="${r(px - 2)}" cy="${r(py - 5)}" r="2" fill="#ffe27a"/>`;
  }
  // Schilf am Rand.
  for (let i = 0; i < 9; i++) {
    const winkel = zwischen(zufall, 0.2, 2.9);
    const px = x + Math.cos(winkel) * rx * 0.98;
    const py = y + Math.sin(winkel) * ry * 0.98 + 4;
    const h = zwischen(zufall, 26, 44);
    svg += `<path d="M${r(px)} ${r(py)} q${r(zwischen(zufall, -6, 6))} ${r(-h / 2)} ${r(zwischen(zufall, -6, 6))} ${r(-h)}" stroke="${f.wieseDunkel}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (i % 2) svg += `<rect x="${r(px - 3)}" y="${r(py - h * 0.85)}" width="6" height="14" rx="3" fill="${f.holz}"/>`;
  }
  return svg;
}

function wegZeichnen(karte, f, zufall) {
  const d = karte.weg.d;
  let steine = '';
  const proben = karte.weg.proben;
  for (let i = 3; i < proben.length - 3; i += 5) {
    if (zufall() < 0.55) continue;
    const p = proben[i];
    const q = proben[i + 1];
    const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const seite = zufall() < 0.5 ? 1 : -1;
    const abstand = zwischen(zufall, 14, 30) * seite;
    const x = p.x + (-(q.y - p.y) / l) * abstand;
    const y = p.y + ((q.x - p.x) / l) * abstand;
    const g = zwischen(zufall, 3, 6);
    steine += `<ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(g)}" ry="${r(g * 0.7)}" fill="${mischen(f.wegRand, '#fff', 0.2)}"/>`;
  }
  return `
    <path d="${d}" stroke="#000" stroke-width="74" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.10" filter="url(#weich2)" transform="translate(4 6)"/>
    <path d="${d}" stroke="${f.wegRand}" stroke-width="66" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
    <path d="${d}" stroke="${f.weg}" stroke-width="54" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" stroke="${mischen(f.weg, '#ffffff', 0.35)}" stroke-width="20" fill="none" stroke-linecap="round" opacity="0.5" transform="translate(-6 -4)"/>
    ${steine}`;
}

/** Steinbrücke mit Bogen. Man schaut von vorn auf den Bogen, das Wasser kommt darunter heraus. */
function brueckeZeichnen(b, f) {
  const { x, y } = b;
  const w = 118; // halbe Länge
  const deck = y - 16;
  let steine = '';
  for (let i = -5; i <= 5; i++) {
    const sx = x + i * 21;
    steine += `<path d="M${r(sx)} ${r(deck + 4)} l0 14" stroke="${f.felsDunkel}" stroke-width="2" opacity="0.45"/>`;
  }
  for (let i = -4; i <= 4; i++) {
    const sx = x + i * 24 + 11;
    if (Math.abs(i) < 2) continue;
    steine += `<path d="M${r(sx)} ${r(deck + 20)} l0 16" stroke="${f.felsDunkel}" stroke-width="2" opacity="0.45"/>`;
  }
  return `
    <ellipse cx="${r(x + 8)}" cy="${r(y + 64)}" rx="${r(w + 10)}" ry="20" fill="#000" opacity="0.2" filter="url(#weich2)"/>
    <path d="M${r(x - w)} ${r(deck - 6)} L${r(x + w)} ${r(deck - 6)} L${r(x + w)} ${r(deck + 26)} L${r(x - w)} ${r(deck + 26)} Z" fill="${f.weg}"/>
    <path d="M${r(x - w - 8)} ${r(deck + 2)} L${r(x + w + 8)} ${r(deck + 2)} L${r(x + w + 12)} ${r(y + 62)} L${r(x + 50)} ${r(y + 62)}
             C${r(x + 46)} ${r(y + 20)} ${r(x - 46)} ${r(y + 20)} ${r(x - 50)} ${r(y + 62)} L${r(x - w - 12)} ${r(y + 62)} Z" fill="url(#fels)"/>
    <path d="M${r(x - 50)} ${r(y + 62)} C${r(x - 46)} ${r(y + 20)} ${r(x + 46)} ${r(y + 20)} ${r(x + 50)} ${r(y + 62)} Z" fill="${mischen(f.wasserTief, '#000', 0.45)}"/>
    <path d="M${r(x - 38)} ${r(y + 62)} C${r(x - 30)} ${r(y + 42)} ${r(x + 30)} ${r(y + 42)} ${r(x + 38)} ${r(y + 62)} Z" fill="${f.wasser}" opacity="0.6"/>
    <path d="M${r(x - 50)} ${r(y + 62)} C${r(x - 46)} ${r(y + 20)} ${r(x + 46)} ${r(y + 20)} ${r(x + 50)} ${r(y + 62)}" stroke="${f.felsHell}" stroke-width="5" fill="none"/>
    ${[-3, -2, -1, 0, 1, 2, 3].map((i) => {
      const winkel = Math.PI * (0.5 + i * 0.13);
      const ix = x - Math.cos(winkel) * 50;
      const iy = y + 62 - Math.sin(winkel) * 42;
      const ax = x - Math.cos(winkel) * 64;
      const ay = y + 62 - Math.sin(winkel) * 56;
      return `<path d="M${r(ix)} ${r(iy)} L${r(ax)} ${r(ay)}" stroke="${f.felsDunkel}" stroke-width="2.5" opacity="0.55"/>`;
    }).join('')}
    <path d="M${r(x - w - 8)} ${r(deck + 2)} L${r(x + w + 8)} ${r(deck + 2)}" stroke="${f.felsDunkel}" stroke-width="3" opacity="0.5"/>
    ${steine}
    <rect x="${r(x - w - 10)}" y="${r(deck - 22)}" width="${r(2 * w + 20)}" height="14" rx="5" fill="url(#fels)"/>
    <rect x="${r(x - w - 10)}" y="${r(deck - 22)}" width="${r(2 * w + 20)}" height="5" rx="2.5" fill="${f.felsHell}" opacity="0.7"/>
    <path d="M${r(x - w - 6)} ${r(deck - 20)} q20 -10 44 -2 q16 6 30 -1" stroke="url(#moos)" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M${r(x + w - 60)} ${r(deck + 4)} q14 18 6 40" stroke="${f.moos}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

/* ================================================================== */
/*  Verzierung                                                         */
/* ================================================================== */

/** Weicher Schatten am Boden, leicht nach rechts unten versetzt. */
function schatten(x, y, rx, ry, staerke = 0.22) {
  return `<ellipse cx="${r(x + rx * 0.22)}" cy="${r(y + ry * 0.3)}" rx="${r(rx)}" ry="${r(ry)}" fill="#000" opacity="${staerke}" filter="url(#weich)"/>`;
}

function felsBrocken(x, y, g, f, zufall) {
  const punkte = [];
  for (let i = 0; i < 8; i++) {
    const w = (i / 8) * Math.PI * 2;
    const rr = g * zwischen(zufall, 0.8, 1.1);
    punkte.push({ x: x + Math.cos(w) * rr, y: y + Math.sin(w) * rr * (Math.sin(w) > 0 ? 0.45 : 0.85) });
  }
  const d = punkte.map((p, i) => `${i ? 'L' : 'M'}${r(p.x)} ${r(p.y)}`).join(' ') + ' Z';
  return `${schatten(x, y + g * 0.3, g * 1.1, g * 0.4, 0.25)}<path d="${d}" fill="url(#fels)" stroke="${f.felsDunkel}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M${r(x - g * 0.6)} ${r(y - g * 0.45)} q${r(g * 0.5)} ${r(-g * 0.35)} ${r(g * 1.1)} ${r(-g * 0.05)}" stroke="${f.felsHell}" stroke-width="${r(g * 0.18)}" fill="none" stroke-linecap="round" opacity="0.8"/>`;
}

/** Eine Baumkrone aus vielen Ballen: dunkler Grund, Kugeln mit Licht, Glanzpunkte. */
function krone(cx, cy, s, zufall, kugel, hell, dunkel, form = 'rund') {
  const ballen = [];
  const muster =
    form === 'breit'
      ? [[-78, 8, 40], [78, 8, 40], [-40, -22, 52], [40, -22, 52], [0, 6, 54], [-96, -14, 30], [96, -14, 30], [0, -52, 46], [-60, -48, 34], [60, -48, 34]]
      : [[-52, 10, 44], [52, 10, 44], [0, -26, 54], [-34, -52, 40], [36, -50, 42], [0, 18, 50], [-62, -18, 34], [64, -16, 34], [4, -76, 34]];
  for (const [dx, dy, rr] of muster) {
    ballen.push({ x: cx + (dx + zwischen(zufall, -6, 6)) * s, y: cy + (dy + zwischen(zufall, -6, 6)) * s, r: rr * s * zwischen(zufall, 0.9, 1.1) });
  }
  let svg = `<g fill="${dunkel}">${ballen.map((b) => `<circle cx="${r(b.x + 3 * s)}" cy="${r(b.y + 5 * s)}" r="${r(b.r + 3 * s)}"/>`).join('')}</g>`;
  // Hintere Ballen zuerst (weiter oben = weiter hinten).
  const sortiert = [...ballen].sort((a, b) => a.y - b.y);
  svg += sortiert.map((b) => `<circle cx="${r(b.x)}" cy="${r(b.y)}" r="${r(b.r)}" fill="url(#${kugel})"/>`).join('');
  // Glanz oben links an den oberen Ballen.
  svg += sortiert
    .slice(0, 6)
    .map((b) => `<ellipse cx="${r(b.x - b.r * 0.32)}" cy="${r(b.y - b.r * 0.38)}" rx="${r(b.r * 0.38)}" ry="${r(b.r * 0.26)}" fill="${hell}" opacity="0.55"/>`)
    .join('');
  // Ein paar Blätter-Tupfer für Struktur.
  for (let i = 0; i < 10; i++) {
    const b = ballen[i % ballen.length];
    const w = zwischen(zufall, 0, Math.PI * 2);
    svg += `<ellipse cx="${r(b.x + Math.cos(w) * b.r * 0.6)}" cy="${r(b.y + Math.sin(w) * b.r * 0.6)}" rx="${r(5 * s)}" ry="${r(3 * s)}" fill="${i % 2 ? hell : dunkel}" opacity="0.5" transform="rotate(${r(w * 57)} ${r(b.x + Math.cos(w) * b.r * 0.6)} ${r(b.y + Math.sin(w) * b.r * 0.6)})"/>`;
  }
  return svg;
}

function stammZeichnen(x, y, s, hoehe, breite) {
  const h = hoehe * s;
  const b = breite * s;
  return `<path d="M${r(x - b)} ${r(y)} C${r(x - b * 0.8)} ${r(y - h * 0.35)} ${r(x - b * 0.75)} ${r(y - h * 0.7)} ${r(x - b * 0.45)} ${r(y - h)}
      L${r(x + b * 0.45)} ${r(y - h)} C${r(x + b * 0.75)} ${r(y - h * 0.7)} ${r(x + b * 0.8)} ${r(y - h * 0.35)} ${r(x + b)} ${r(y)}
      Q${r(x + b * 1.6)} ${r(y + 4 * s)} ${r(x + b * 1.9)} ${r(y + 6 * s)} L${r(x - b * 1.9)} ${r(y + 6 * s)} Q${r(x - b * 1.6)} ${r(y + 4 * s)} ${r(x - b)} ${r(y)} Z" fill="url(#stamm)"/>
    <path d="M${r(x - b * 0.3)} ${r(y - h * 0.15)} q${r(-b * 0.15)} ${r(-h * 0.3)} ${r(b * 0.05)} ${r(-h * 0.6)}" stroke="rgba(0,0,0,0.25)" stroke-width="${r(2.5 * s)}" fill="none"/>`;
}

const DEKO = {
  /* ---------- Bäume je Welt ---------- */
  baum_laub(d, f, zufall) {
    const { x, y, s } = d;
    const riese = d.v % 4 === 0;
    const k = riese ? 1.2 : 1;
    let svg = schatten(x, y, 92 * s * k, 26 * s * k);
    svg += stammZeichnen(x, y, s * k, 96, 16);
    if (riese) {
      // Kräftige Äste, die zwischen den Ballen hervorschauen.
      svg += `<path d="M${r(x)} ${r(y - 80 * s)} q${r(-30 * s)} ${r(-20 * s)} ${r(-62 * s)} ${r(-30 * s)} M${r(x)} ${r(y - 86 * s)} q${r(34 * s)} ${r(-18 * s)} ${r(66 * s)} ${r(-34 * s)}" stroke="${f.stamm}" stroke-width="${r(10 * s)}" fill="none" stroke-linecap="round"/>`;
    }
    svg += krone(x, y - 150 * s * k, s * k, zufall, 'laubKugel', f.laubHell, f.laubDunkel, riese ? 'breit' : 'rund');
    return { svg, oben: 260 * k, unten: 40 };
  },
  bluetenbaum(d, f, zufall) {
    const { x, y, s } = d;
    let svg = schatten(x, y, 84 * s, 24 * s);
    svg += stammZeichnen(x, y, s, 90, 14);
    svg += krone(x, y - 140 * s, s * 0.92, zufall, 'blueteKugel', f.blueteHell, f.blueteDunkel);
    // Abgefallene Blüten am Boden.
    for (let i = 0; i < 12; i++) {
      svg += `<circle cx="${r(x + zwischen(zufall, -90, 110) * s)}" cy="${r(y + zwischen(zufall, -6, 26) * s)}" r="${r(3 * s)}" fill="${i % 2 ? f.bluete : f.blueteHell}"/>`;
    }
    return { svg, oben: 240, unten: 40 };
  },
  baum_tanne(d, f, zufall) {
    const { x, y, s } = d;
    let svg = schatten(x, y, 60 * s, 18 * s);
    svg += `<rect x="${r(x - 7 * s)}" y="${r(y - 36 * s)}" width="${r(14 * s)}" height="${r(38 * s)}" fill="url(#stamm)"/>`;
    for (let i = 0; i < 4; i++) {
      const b = (70 - i * 13) * s;
      const ty = y - (30 + i * 46) * s;
      svg += `<path d="M${r(x - b)} ${r(ty)} L${r(x)} ${r(ty - 80 * s)} L${r(x + b)} ${r(ty)} Q${r(x)} ${r(ty + 14 * s)} ${r(x - b)} ${r(ty)} Z" fill="url(#laubKugel)"/>
        <path d="M${r(x - b * 0.7)} ${r(ty - 18 * s)} L${r(x)} ${r(ty - 80 * s)} L${r(x + b * 0.35)} ${r(ty - 50 * s)} Q${r(x)} ${r(ty - 30 * s)} ${r(x - b * 0.7)} ${r(ty - 18 * s)} Z" fill="${f.schnee}" opacity="0.9"/>`;
    }
    return { svg, oben: 260, unten: 30 };
  },
  baum_kristall(d, f, zufall) {
    const { x, y, s } = d;
    let svg = schatten(x, y, 60 * s, 16 * s);
    const spitzen = [[-30, 90, -10], [0, 150, 0], [28, 110, 12], [-12, 70, -22], [44, 64, 20]];
    for (const [dx, h, neig] of spitzen) {
      const bx = x + dx * s;
      const hh = h * s * zwischen(zufall, 0.85, 1.1);
      const w = 16 * s;
      svg += `<path d="M${r(bx - w)} ${r(y)} L${r(bx - w + neig * s * 0.3)} ${r(y - hh * 0.75)} L${r(bx + neig * s * 0.5)} ${r(y - hh)} L${r(bx + w + neig * s * 0.3)} ${r(y - hh * 0.75)} L${r(bx + w)} ${r(y)} Z" fill="url(#laubKugel)" stroke="${f.laubDunkel}" stroke-width="1.5"/>
        <path d="M${r(bx - w)} ${r(y)} L${r(bx - w + neig * s * 0.3)} ${r(y - hh * 0.75)} L${r(bx + neig * s * 0.5)} ${r(y - hh)} L${r(bx + neig * s * 0.2)} ${r(y)} Z" fill="${f.laubHell}" opacity="0.5"/>`;
    }
    return { svg, oben: 170, unten: 20 };
  },
  baum_felsnadel(d, f, zufall) {
    const { x, y, s } = d;
    let svg = schatten(x, y, 60 * s, 16 * s);
    for (const [dx, h] of [[-26, 110], [10, 170], [40, 90]]) {
      const bx = x + dx * s;
      const hh = h * s * zwischen(zufall, 0.85, 1.1);
      svg += `<path d="M${r(bx - 26 * s)} ${r(y)} L${r(bx - 8 * s)} ${r(y - hh)} L${r(bx + 6 * s)} ${r(y - hh * 0.96)} L${r(bx + 24 * s)} ${r(y)} Z" fill="url(#fels)" stroke="${f.felsDunkel}" stroke-width="2"/>
        <path d="M${r(bx - 8 * s)} ${r(y - hh)} L${r(bx + 6 * s)} ${r(y - hh * 0.96)} L${r(bx + 2 * s)} ${r(y - hh * 0.75)} Z" fill="${f.laub}" opacity="0.8"/>`;
    }
    return { svg, oben: 190, unten: 20 };
  },
  baum_kahl(d, f, zufall) {
    const { x, y, s } = d;
    let svg = schatten(x, y, 60 * s, 16 * s);
    svg += stammZeichnen(x, y, s, 120, 12);
    const aeste = [[-60, -150, -90, -190], [55, -160, 95, -200], [-30, -110, -70, -120], [30, -120, 70, -135], [0, -120, 8, -210]];
    for (const [ax, ay, bx, by] of aeste) {
      svg += `<path d="M${r(x)} ${r(y - 100 * s)} Q${r(x + ax * s)} ${r(y + ay * s)} ${r(x + bx * s)} ${r(y + by * s)}" stroke="${f.stamm}" stroke-width="${r(7 * s)}" fill="none" stroke-linecap="round"/>`;
    }
    svg += krone(x, y - 170 * s, s * 0.6, zufall, 'laubKugel', f.laubHell, f.laubDunkel).replace(/<g fill=[^>]*>.*?<\/g>/, '');
    return { svg, oben: 230, unten: 20 };
  },
  baum_kaktus(d, f, zufall) {
    const { x, y, s } = d;
    let svg = schatten(x, y, 40 * s, 12 * s);
    svg += `<path d="M${r(x - 14 * s)} ${r(y)} L${r(x - 14 * s)} ${r(y - 120 * s)} A${r(14 * s)} ${r(14 * s)} 0 0 1 ${r(x + 14 * s)} ${r(y - 120 * s)} L${r(x + 14 * s)} ${r(y)} Z" fill="url(#laubKugel)"/>
      <path d="M${r(x - 14 * s)} ${r(y - 60 * s)} L${r(x - 40 * s)} ${r(y - 60 * s)} L${r(x - 40 * s)} ${r(y - 95 * s)}" stroke="url(#laubKugel)" stroke-width="${r(18 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${r(x + 14 * s)} ${r(y - 80 * s)} L${r(x + 36 * s)} ${r(y - 80 * s)} L${r(x + 36 * s)} ${r(y - 108 * s)}" stroke="url(#laubKugel)" stroke-width="${r(16 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${r(x - 4 * s)} ${r(y - 6 * s)} L${r(x - 4 * s)} ${r(y - 124 * s)} M${r(x + 6 * s)} ${r(y - 6 * s)} L${r(x + 6 * s)} ${r(y - 124 * s)}" stroke="${f.laubDunkel}" stroke-width="2" opacity="0.5"/>`;
    return { svg, oben: 150, unten: 20 };
  },
  baum_koralle(d, f, zufall) {
    const { x, y, s } = d;
    let svg = schatten(x, y, 50 * s, 14 * s);
    const aeste = [[0, -130], [-40, -100], [40, -110], [-60, -60], [62, -70]];
    for (const [ax, ay] of aeste) {
      svg += `<path d="M${r(x)} ${r(y)} Q${r(x + ax * 0.3 * s)} ${r(y + ay * 0.5 * s)} ${r(x + ax * s)} ${r(y + ay * s)}" stroke="${f.laub}" stroke-width="${r(14 * s)}" fill="none" stroke-linecap="round"/>
        <circle cx="${r(x + ax * s)}" cy="${r(y + ay * s)}" r="${r(10 * s)}" fill="${f.laubHell}"/>`;
    }
    return { svg, oben: 150, unten: 20 };
  },
  baum_lolli(d, f, zufall) {
    const { x, y, s } = d;
    let svg = schatten(x, y, 40 * s, 12 * s);
    svg += `<rect x="${r(x - 5 * s)}" y="${r(y - 110 * s)}" width="${r(10 * s)}" height="${r(110 * s)}" rx="${r(4 * s)}" fill="#fff6ee" stroke="#e8c8b8" stroke-width="2"/>
      <circle cx="${r(x)}" cy="${r(y - 140 * s)}" r="${r(46 * s)}" fill="url(#laubKugel)"/>
      <path d="M${r(x)} ${r(y - 140 * s)} m-30 0 a30 30 0 1 1 30 30 a20 20 0 1 1 -20 -20 a10 10 0 1 1 10 10" stroke="#ffffff" stroke-width="${r(6 * s)}" fill="none" opacity="0.8"/>`;
    return { svg, oben: 190, unten: 20 };
  },

  /* ---------- Kleinzeug ---------- */
  busch(d, f, zufall) {
    const { x, y, s } = d;
    let svg = schatten(x, y, 50 * s, 14 * s);
    const ballen = [[-26, -14, 24], [24, -14, 24], [0, -30, 28], [-6, -8, 26]];
    svg += `<g fill="${f.laubDunkel}">${ballen.map(([dx, dy, rr]) => `<circle cx="${r(x + dx * s + 2)}" cy="${r(y + dy * s + 3)}" r="${r(rr * s + 2)}"/>`).join('')}</g>`;
    svg += ballen.map(([dx, dy, rr]) => `<circle cx="${r(x + dx * s)}" cy="${r(y + dy * s)}" r="${r(rr * s)}" fill="url(#laubKugel)"/>`).join('');
    if (d.v % 3 === 0) {
      for (let i = 0; i < 5; i++) {
        svg += `<circle cx="${r(x + zwischen(zufall, -36, 36) * s)}" cy="${r(y + zwischen(zufall, -44, -6) * s)}" r="${r(4 * s)}" fill="${f.blumen[(d.v + i) % f.blumen.length]}"/>`;
      }
    }
    return { svg, oben: 70, unten: 20 };
  },
  fels(d, f, zufall) {
    const { x, y, s } = d;
    const g = 40 * s;
    let svg = schatten(x, y, g * 1.3, g * 0.35, 0.28);
    const punkte = [];
    for (let i = 0; i < 9; i++) {
      const w = Math.PI + (i / 8) * Math.PI;
      const rr = g * zwischen(zufall, 0.8, 1.15);
      punkte.push({ x: x + Math.cos(w) * rr * 1.2, y: y + Math.sin(w) * rr });
    }
    const d1 = punkte.map((p, i) => `${i ? 'L' : 'M'}${r(p.x)} ${r(p.y)}`).join(' ') + ` Q${r(x)} ${r(y + g * 0.25)} ${r(punkte[0].x)} ${r(punkte[0].y)} Z`;
    svg += `<path d="${d1}" fill="url(#fels)" stroke="${f.felsDunkel}" stroke-width="2" stroke-linejoin="round"/>`;
    // Kante zwischen Ober- und Vorderseite.
    svg += `<path d="M${r(punkte[1].x)} ${r(punkte[1].y + g * 0.25)} Q${r(x)} ${r(y - g * 0.45)} ${r(punkte[7].x)} ${r(punkte[7].y + g * 0.2)}" stroke="${f.felsHell}" stroke-width="${r(3 * s)}" fill="none" opacity="0.7"/>`;
    // Moospolster oben.
    svg += `<path d="M${r(x - g * 0.8)} ${r(y - g * 0.55)} Q${r(x - g * 0.3)} ${r(y - g * 1.15)} ${r(x + g * 0.4)} ${r(y - g * 0.85)} Q${r(x + g * 0.8)} ${r(y - g * 0.7)} ${r(x + g * 0.7)} ${r(y - g * 0.45)} Q${r(x)} ${r(y - g * 0.65)} ${r(x - g * 0.8)} ${r(y - g * 0.55)} Z" fill="url(#moos)"/>`;
    svg += `<path d="M${r(x + g * 0.1)} ${r(y - g * 0.2)} l${r(g * 0.12)} ${r(g * 0.25)} l${r(-g * 0.06)} ${r(g * 0.2)}" stroke="${f.felsDunkel}" stroke-width="2" fill="none" opacity="0.6"/>`;
    return { svg, oben: 60, unten: 20 };
  },
  blumen(d, f, zufall) {
    const { x, y, s } = d;
    const haupt = f.blumen[d.v % f.blumen.length];
    let svg = `<ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(62 * s)}" ry="${r(26 * s)}" fill="${f.wieseHell}" opacity="0.35"/>`;
    const n = 14 + Math.floor(zufall() * 10);
    const bluemchen = [];
    for (let i = 0; i < n; i++) {
      const w = zufall() * Math.PI * 2;
      const rr = Math.sqrt(zufall());
      bluemchen.push({ x: x + Math.cos(w) * rr * 58 * s, y: y + Math.sin(w) * rr * 22 * s, farbe: zufall() < 0.75 ? haupt : f.blumen[Math.floor(zufall() * f.blumen.length)] });
    }
    bluemchen.sort((a, b) => a.y - b.y);
    for (const b of bluemchen) {
      svg += `<path d="M${r(b.x)} ${r(b.y + 8)} l0 -8" stroke="${f.wieseDunkel}" stroke-width="2"/>
        <ellipse cx="${r(b.x - 4)}" cy="${r(b.y + 6)}" rx="4" ry="2" fill="${f.laub}"/>
        <circle cx="${r(b.x)}" cy="${r(b.y - 1)}" r="${r(5.5 * s)}" fill="${b.farbe}"/>
        <circle cx="${r(b.x - 1.5)}" cy="${r(b.y - 2.5)}" r="${r(2.2 * s)}" fill="#ffffff" opacity="0.55"/>
        <circle cx="${r(b.x)}" cy="${r(b.y - 1)}" r="${r(1.8 * s)}" fill="${b.farbe === '#ffd34d' ? '#e08a1f' : '#ffe27a'}"/>`;
    }
    return { svg, oben: 40, unten: 34 };
  },
  gras(d, f, zufall) {
    const { x, y, s } = d;
    let svg = '';
    for (let i = 0; i < 6; i++) {
      const dx = (i - 2.5) * 5 * s;
      const h = zwischen(zufall, 18, 32) * s;
      const neig = zwischen(zufall, -10, 10) * s;
      svg += `<path d="M${r(x + dx - 3)} ${r(y)} Q${r(x + dx + neig * 0.4)} ${r(y - h * 0.6)} ${r(x + dx + neig)} ${r(y - h)} Q${r(x + dx + neig * 0.3 + 2)} ${r(y - h * 0.5)} ${r(x + dx + 3)} ${r(y)} Z" fill="${i % 2 ? f.wieseDunkel : mischen(f.wiese, f.wieseDunkel, 0.3)}"/>`;
    }
    svg += `<path d="M${r(x - 2)} ${r(y)} q2 -14 8 -22" stroke="${f.wieseHell}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    return { svg, oben: 36, unten: 4 };
  },
  pilze(d, f, zufall) {
    const { x, y, s } = d;
    let svg = '';
    const n = 2 + (d.v % 3);
    for (let i = 0; i < n; i++) {
      const px = x + (i - (n - 1) / 2) * 16 * s + zwischen(zufall, -4, 4);
      const py = y + zwischen(zufall, -6, 6);
      const g = zwischen(zufall, 7, 12) * s;
      svg += `<ellipse cx="${r(px + 3)}" cy="${r(py + 2)}" rx="${r(g)}" ry="${r(g * 0.3)}" fill="#000" opacity="0.2"/>
        <rect x="${r(px - g * 0.3)}" y="${r(py - g * 1.3)}" width="${r(g * 0.6)}" height="${r(g * 1.3)}" rx="${r(g * 0.25)}" fill="#f6eedc"/>
        <path d="M${r(px - g)} ${r(py - g * 1.1)} Q${r(px)} ${r(py - g * 2.6)} ${r(px + g)} ${r(py - g * 1.1)} Z" fill="${d.v % 2 ? '#e2453c' : '#c98a4a'}"/>
        <circle cx="${r(px - g * 0.35)}" cy="${r(py - g * 1.6)}" r="${r(g * 0.18)}" fill="#fff"/><circle cx="${r(px + g * 0.3)}" cy="${r(py - g * 1.45)}" r="${r(g * 0.13)}" fill="#fff"/>`;
    }
    return { svg, oben: 40, unten: 10 };
  },
  ruine(d, f, zufall) {
    const { x, y, s } = d;
    let svg = schatten(x, y, 80 * s, 18 * s);
    // Umgestürzte Säule und ein stehender Stumpf.
    svg += `<g transform="rotate(-8 ${r(x - 30 * s)} ${r(y)})">
        <rect x="${r(x - 100 * s)}" y="${r(y - 22 * s)}" width="${r(80 * s)}" height="${r(26 * s)}" rx="${r(8 * s)}" fill="url(#fels)"/>
        <ellipse cx="${r(x - 100 * s)}" cy="${r(y - 9 * s)}" rx="${r(7 * s)}" ry="${r(13 * s)}" fill="${f.felsHell}"/>
        <path d="M${r(x - 70 * s)} ${r(y - 22 * s)} l0 26 M${r(x - 45 * s)} ${r(y - 22 * s)} l0 26" stroke="${f.felsDunkel}" stroke-width="2" opacity="0.5"/>
      </g>`;
    svg += saeule(x + 20 * s, y, 22 * s, 95 * s, f, true);
    svg += felsBrocken(x + 60 * s, y + 6 * s, 12 * s, f, zufall);
    svg += `<path d="M${r(x + 4 * s)} ${r(y - 80 * s)} q-10 30 4 70" stroke="${f.moos}" stroke-width="${r(5 * s)}" fill="none" stroke-linecap="round"/>`;
    return { svg, oben: 120, unten: 30 };
  },
  tor(d, f, zufall) {
    const { x, y, s } = d;
    const b = 70 * s; // halbe Weite des Bogens
    const h = 170 * s;
    let svg = schatten(x, y, 140 * s, 24 * s);
    // Zweiter, kleinerer Bogen dahinter.
    svg += `<g opacity="0.8">${bogen(x - 130 * s, y - 36 * s, b * 0.7, h * 0.7, f, true)}</g>`;
    svg += bogen(x, y, b, h, f, false);
    svg += saeule(x + 140 * s, y + 10 * s, 18 * s, 80 * s, f, true);
    svg += felsBrocken(x - 120 * s, y + 18 * s, 16 * s, f, zufall);
    svg += felsBrocken(x + 100 * s, y + 24 * s, 12 * s, f, zufall);
    return { svg, oben: 260, unten: 40 };
  },
  zaun(d, f) {
    const { x, y } = d;
    const pfosten = [-58, -20, 20, 58];
    let svg = `<g transform="rotate(${r(d.v)} ${r(x)} ${r(y)})">`;
    svg += `<ellipse cx="${r(x + 6)}" cy="${r(y + 6)}" rx="68" ry="8" fill="#000" opacity="0.18" filter="url(#weich2)"/>`;
    svg += `<rect x="${r(x - 64)}" y="${r(y - 26)}" width="128" height="7" rx="3" fill="url(#holz)"/>`;
    svg += `<rect x="${r(x - 64)}" y="${r(y - 12)}" width="128" height="7" rx="3" fill="url(#holz)"/>`;
    for (const px of pfosten) {
      svg += `<path d="M${r(x + px - 4)} ${r(y + 4)} L${r(x + px - 4)} ${r(y - 32)} L${r(x + px)} ${r(y - 37)} L${r(x + px + 4)} ${r(y - 32)} L${r(x + px + 4)} ${r(y + 4)} Z" fill="url(#holz)" stroke="${f.holzDunkel}" stroke-width="1"/>`;
    }
    svg += `<path d="M${r(x - 60)} ${r(y - 25)} q20 -3 40 0" stroke="${f.moos}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
    return { svg, oben: 50, unten: 12 };
  },
  laterne(d, f) {
    const { x, y } = d;
    const svg = `${schatten(x, y, 18, 5, 0.3)}
      <circle cx="${r(x + 22)}" cy="${r(y - 86)}" r="44" fill="url(#lampe)" opacity="0.6"/>
      <rect x="${r(x - 4)}" y="${r(y - 110)}" width="8" height="112" rx="3" fill="url(#holz)"/>
      <path d="M${r(x)} ${r(y - 104)} l26 0" stroke="${f.holzDunkel}" stroke-width="4" stroke-linecap="round"/>
      <path d="M${r(x + 22)} ${r(y - 104)} l0 6" stroke="#3a2a18" stroke-width="2"/>
      <path d="M${r(x + 13)} ${r(y - 98)} l18 0 l-3 -6 l-12 0 Z" fill="#3a2a18"/>
      <rect x="${r(x + 14)}" y="${r(y - 98)}" width="16" height="22" rx="2" fill="#ffe08a" stroke="#3a2a18" stroke-width="2"/>
      <path d="M${r(x + 22)} ${r(y - 98)} l0 22" stroke="#3a2a18" stroke-width="1.5"/>
      <path d="M${r(x + 12)} ${r(y - 76)} l20 0" stroke="#3a2a18" stroke-width="3"/>`;
    return { svg, oben: 130, unten: 10 };
  },
  fahne(d, f) {
    const { x, y } = d;
    // Nur Mast und Sockel - das wehende Banner liegt in leben.js darüber.
    const svg = `${schatten(x, y, 26, 7, 0.3)}
      <rect x="${r(x - 4)}" y="${r(y - 170)}" width="8" height="172" rx="3" fill="url(#holz)"/>
      <circle cx="${r(x)}" cy="${r(y - 174)}" r="7" fill="#ffd76a" stroke="#a8741c" stroke-width="2"/>
      <path d="M${r(x - 18)} ${r(y + 2)} L${r(x + 18)} ${r(y + 2)} L${r(x + 12)} ${r(y - 12)} L${r(x - 12)} ${r(y - 12)} Z" fill="url(#fels)"/>`;
    return { svg, oben: 190, unten: 10 };
  },
};

function saeule(x, y, b, h, f, gebrochen) {
  const oben = y - h;
  let svg = `<rect x="${r(x - b)}" y="${r(oben)}" width="${r(b * 2)}" height="${r(h)}" fill="url(#fels)"/>`;
  for (let i = 1; i < 4; i++) {
    svg += `<path d="M${r(x - b + (b * 2 * i) / 4)} ${r(oben + 6)} L${r(x - b + (b * 2 * i) / 4)} ${r(y - 4)}" stroke="${f.felsDunkel}" stroke-width="1.5" opacity="0.4"/>`;
  }
  svg += `<rect x="${r(x - b * 1.25)}" y="${r(y - b * 0.5)}" width="${r(b * 2.5)}" height="${r(b * 0.6)}" rx="2" fill="${f.felsDunkel}"/>`;
  if (gebrochen) {
    svg += `<path d="M${r(x - b)} ${r(oben)} L${r(x - b * 0.4)} ${r(oben - b * 0.5)} L${r(x + b * 0.1)} ${r(oben - b * 0.1)} L${r(x + b * 0.6)} ${r(oben - b * 0.6)} L${r(x + b)} ${r(oben)} Z" fill="${f.felsHell}"/>`;
  } else {
    svg += `<rect x="${r(x - b * 1.25)}" y="${r(oben - b * 0.5)}" width="${r(b * 2.5)}" height="${r(b * 0.6)}" rx="2" fill="${f.felsHell}"/>`;
  }
  svg += `<path d="M${r(x - b * 0.6)} ${r(oben + h * 0.2)} q${r(-b * 0.4)} ${r(h * 0.3)} ${r(b * 0.1)} ${r(h * 0.7)}" stroke="${f.moos}" stroke-width="${r(b * 0.25)}" fill="none" stroke-linecap="round"/>`;
  return svg;
}

/** Ein steinerner Torbogen aus zwei Pfeilern; rechts oben abgebrochen. */
function bogen(x, y, b, h, f, ganz) {
  const p = b * 0.42; // Pfeilerbreite
  const scheitel = y - h;
  let svg = '';
  svg += `<path d="M${r(x - b - p)} ${r(y)} L${r(x - b - p)} ${r(scheitel + b)} A${r(b + p)} ${r(b + p)} 0 0 1 ${r(x + b + p)} ${r(scheitel + b)} L${r(x + b + p)} ${r(y)} L${r(x + b)} ${r(y)} L${r(x + b)} ${r(scheitel + b)} A${r(b)} ${r(b)} 0 0 0 ${r(x - b)} ${r(scheitel + b)} L${r(x - b)} ${r(y)} Z" fill="url(#fels)" stroke="${f.felsDunkel}" stroke-width="2"/>`;
  // Steinfugen im Bogen.
  for (let i = 1; i < 8; i++) {
    const w = Math.PI - (i / 8) * Math.PI;
    svg += `<path d="M${r(x + Math.cos(w) * b)} ${r(scheitel + b - Math.sin(w) * b)} L${r(x + Math.cos(w) * (b + p))} ${r(scheitel + b - Math.sin(w) * (b + p))}" stroke="${f.felsDunkel}" stroke-width="2" opacity="0.5"/>`;
  }
  for (let i = 1; i < 5; i++) {
    const yy = y - (i * (h - b)) / 5;
    svg += `<path d="M${r(x - b - p)} ${r(yy)} l${r(p)} 0 M${r(x + b)} ${r(yy)} l${r(p)} 0" stroke="${f.felsDunkel}" stroke-width="2" opacity="0.45"/>`;
  }
  // Licht auf der linken Kante, Efeu am rechten Pfeiler.
  svg += `<path d="M${r(x - b - p + 3)} ${r(y)} L${r(x - b - p + 3)} ${r(scheitel + b)}" stroke="${f.felsHell}" stroke-width="4" opacity="0.7"/>`;
  svg += `<path d="M${r(x + b + p * 0.5)} ${r(scheitel + b * 0.6)} q${r(-p)} ${r(h * 0.25)} 0 ${r(h * 0.5)} q${r(p * 0.6)} ${r(h * 0.15)} ${r(-p * 0.2)} ${r(h * 0.3)}" stroke="url(#moos)" stroke-width="${r(p * 0.45)}" fill="none" stroke-linecap="round"/>`;
  if (!ganz) {
    // Abgebrochene Ecke: ein Stück Himmel-farbiger Ausbruch würde stören,
    // also nur ein paar herabgefallene Steine davor.
    svg += `<rect x="${r(x + b * 0.4)}" y="${r(y - 10)}" width="${r(p * 0.8)}" height="${r(p * 0.5)}" rx="3" fill="url(#fels)" transform="rotate(12 ${r(x + b * 0.4)} ${r(y)})"/>`;
  }
  svg += `<path d="M${r(x - b - p)} ${r(scheitel + b * 0.2)} q${r(b * 0.6)} ${r(-b * 0.9)} ${r(b * 1.5)} ${r(-b * 0.75)}" stroke="url(#moos)" stroke-width="${r(p * 0.5)}" fill="none" stroke-linecap="round"/>`;
  return svg;
}

/* ================================================================== */
/*  Vordergrund                                                        */
/* ================================================================== */

/**
 * Großer, unscharfer Blätterzweig am Bildrand (ein eigenes kleines SVG).
 * @returns {string} vollständiges <svg>
 */
export function vordergrundZeichnen(stueck, f) {
  const zufall = wuerfel(stueck.v + 17);
  const w = 260;
  const h = 300;
  let blaetter = '';
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = 20 + t * 170 + zwischen(zufall, -14, 14);
    const y = 150 + Math.sin(t * 3) * 50 + zwischen(zufall, -30, 30);
    const winkel = zwischen(zufall, -60, 60);
    const g = zwischen(zufall, 0.8, 1.3);
    blaetter += `<g transform="translate(${r(x)} ${r(y)}) rotate(${r(winkel)}) scale(${r(g)})">
      <path d="M0 0 C18 -26 52 -26 72 0 C52 26 18 26 0 0 Z" fill="${i % 3 ? f.laub : f.laubDunkel}"/>
      <path d="M2 0 L68 0" stroke="${f.laubHell}" stroke-width="2" opacity="0.6"/></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <path d="M0 160 Q90 130 200 150" stroke="${f.stamm}" stroke-width="7" fill="none"/>${blaetter}</svg>`;
}
