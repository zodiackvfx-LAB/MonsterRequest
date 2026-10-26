/**
 * Der Hintergrund der Weltenauswahl: Himmel mit großen Wolken, Berge in
 * der Ferne, ein Schloss auf einer Klippe mit Wasserfall, Bäume - und unten
 * am Rand Blumen und Felsen.
 *
 * Drei Ebenen, die beim Scrollen der Karten unterschiedlich weit mitgehen
 * (Parallaxe): Himmel kaum, Berge und Schloss etwas, Vordergrund am meisten.
 * Jede Ebene wird einmal als Bild gerastert; bewegt werden nur ein paar
 * Wolken und die Wasserfäden.
 */

import { r, wuerfel, zwischen } from '../weltkarte/geometrie.js';
import { DEKO, bergketteZeichnen, defsZeichnen, felsBrocken, huegelreiheZeichnen, wasserfallZeichnen, wolkeZeichnen } from '../weltkarte/zeichnen.js';
import { kartenThema, mischen } from '../../data/weltkarten.js';
import { WORLDS } from '../../data/worlds.js';

const BREITE = 400;

function farben() {
  return { ...kartenThema(WORLDS[0]).farben, wasser: '#3fb8e0', wasserHell: '#c8f4ff' };
}

function defs(f, hoehe) {
  return defsZeichnen({ horizont: 0, hoehe }, f).replace(
    '</defs>',
    `<linearGradient id="wolke" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#eef6ff"/><stop offset="1" stop-color="#9fc0e8"/></linearGradient>
     <filter id="w" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
     <linearGradient id="himmelW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c3f8e"/><stop offset="0.35" stop-color="#3f86d6"/><stop offset="0.62" stop-color="#8fc6ef"/><stop offset="1" stop-color="#bfe2f8"/></linearGradient>
     <linearGradient id="nacht" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1736" stop-opacity="0"/><stop offset="0.35" stop-color="#0d1736" stop-opacity="0.75"/><stop offset="1" stop-color="#0a1230" stop-opacity="1"/></linearGradient>
     <linearGradient id="schloss" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c8cfe0"/><stop offset="0.5" stop-color="#8f98b8"/><stop offset="1" stop-color="#5a6288"/></linearGradient>
     <linearGradient id="dach" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a6ad0"/><stop offset="1" stop-color="#1e3080"/></linearGradient>
     </defs>`
  );
}

/** Ein Schlossturm mit Spitzdach und erleuchtetem Fenster. */
function turm(x, unten, b, h, dach) {
  return `<rect x="${r(x - b)}" y="${r(unten - h)}" width="${r(b * 2)}" height="${r(h)}" fill="url(#schloss)"/>
    <path d="M${r(x - b * 1.25)} ${r(unten - h)} L${r(x)} ${r(unten - h - dach)} L${r(x + b * 1.25)} ${r(unten - h)} Z" fill="url(#dach)"/>
    <path d="M${r(x)} ${r(unten - h - dach)} l0 -8 l7 3 l-7 3" stroke="#ffd76a" stroke-width="1.2" fill="#ff5a5a"/>
    <rect x="${r(x - b * 0.25)}" y="${r(unten - h * 0.7)}" width="${r(b * 0.5)}" height="${r(b * 0.8)}" rx="${r(b * 0.25)}" fill="#ffd98a"/>
    <path d="M${r(x - b)} ${r(unten - h)} l0 ${r(h)}" stroke="#ffffff" stroke-width="1.2" opacity="0.5"/>`;
}

/**
 * Die drei Ebenen als SVG-Texte.
 * @returns {{himmel: string, land: string, vorn: string, leben: string, hoehe: number}}
 */
export function hintergrundZeichnen() {
  const f = farben();
  const z = wuerfel(4711);
  const hoehe = 700;

  let himmel = `${defs(f, hoehe)}<rect width="${BREITE}" height="${hoehe}" fill="url(#himmelW)"/>
    <circle cx="70" cy="70" r="160" fill="#fff6d0" opacity="0.18"/>`;
  // Wenige, große Wolken - der Himmel soll blau bleiben.
  himmel += `<g opacity="0.85">${wolkeZeichnen(60, 150, 1.1, z)}${wolkeZeichnen(230, 210, 0.8, z)}${wolkeZeichnen(150, 60, 0.6, z)}</g>`;

  // Berge, Klippe mit Schloss und Wasserfall, Hügel, Bäume.
  let land = defs(f, hoehe);
  land += bergketteZeichnen(BREITE, 290, 150, 130, z, '#6f8fd0', '#a8c0f0', '#f4f8ff', 0.7);
  land += huegelreiheZeichnen(BREITE, 290, 24, z, '#3f7a6a', '#2f6a5a');
  // Klippe rechts.
  land += `<path d="M250 330 L262 200 Q300 180 340 186 Q380 180 410 190 L410 330 Z" fill="url(#klippe)" stroke="#3e3a34" stroke-width="2"/>
    <path d="M262 230 L410 226 M258 270 L410 266" stroke="#3e3a34" stroke-width="2" opacity="0.4"/>
    <path d="M258 196 Q300 176 340 182 Q380 176 410 186" stroke="${f.wiese}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  land += turm(300, 190, 10, 46, 28) + turm(372, 186, 9, 52, 30);
  land += `<rect x="300" y="150" width="72" height="38" fill="url(#schloss)"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${302 + i * 12}" y="144" width="7" height="8" fill="#a8b0c8"/>`).join('')}
    <path d="M326 188 l0 -18 a10 10 0 0 1 20 0 l0 18 Z" fill="#3a3456"/>`;
  land += turm(336, 150, 13, 54, 40);
  land += wasserfallZeichnen({ x: 286, y: 334, hoehe: 140, breite: 20 }, f);
  land += huegelreiheZeichnen(BREITE, 340, 20, z, '#2f6a4a', '#245a3e');
  land += DEKO.baum_laub({ x: 40, y: 380, s: 0.8, v: 0 }, f, z).svg + DEKO.baum_laub({ x: 120, y: 350, s: 0.5, v: 1 }, f, z).svg;
  land += `<rect x="0" y="260" width="${BREITE}" height="${hoehe - 260}" fill="url(#nacht)"/>`;

  // Vordergrund: Felsen, Blumen, Gras am unteren Rand.
  const vf = { ...f, blumen: ['#b47cf0', '#d08aff', '#ffd34d', '#ff8fbd'] };
  let vorn = defs(vf, 140);
  vorn += felsBrocken(60, 120, 34, { ...vf, fels: '#4a5068', felsHell: '#7a809a', felsDunkel: '#22263a' }, z);
  vorn += felsBrocken(330, 124, 40, { ...vf, fels: '#4a5068', felsHell: '#7a809a', felsDunkel: '#22263a' }, z);
  vorn += DEKO.busch({ x: 130, y: 130, s: 0.9, v: 3 }, { ...vf, laub: '#2f6a4a', laubHell: '#5fa86a', laubDunkel: '#1a3a2a' }, z).svg;
  vorn += DEKO.busch({ x: 260, y: 134, s: 0.8, v: 6 }, { ...vf, laub: '#2f6a4a', laubHell: '#5fa86a', laubDunkel: '#1a3a2a' }, z).svg;
  for (const [x, y, g] of [[100, 112, 1.2], [370, 96, 1.4], [200, 124, 1]]) {
    // Große Blüten wie im Vordergrund eines Gemäldes.
    for (let i = 0; i < 5; i++) {
      const w = (i / 5) * Math.PI * 2;
      vorn += `<ellipse cx="${r(x + Math.cos(w) * 8 * g)}" cy="${r(y + Math.sin(w) * 8 * g)}" rx="${r(7 * g)}" ry="${r(4 * g)}" fill="${mischen('#b47cf0', '#ffffff', i % 2 ? 0 : 0.2)}" transform="rotate(${r((w * 180) / Math.PI)} ${r(x + Math.cos(w) * 8 * g)} ${r(y + Math.sin(w) * 8 * g)})"/>`;
    }
    vorn += `<circle cx="${x}" cy="${y}" r="${r(4 * g)}" fill="#ffb02e"/>`;
  }
  for (let i = 0; i < 9; i++) vorn += DEKO.gras({ x: zwischen(z, 0, BREITE), y: 140, s: zwischen(z, 1, 1.6), v: i }, { ...vf, wiese: '#2f6a4a', wieseDunkel: '#1a3a2a', wieseHell: '#5fa86a' }, z).svg;

  // Bewegt: zwei Wolken und die Wasserfäden.
  const leben = `
    <g class="wb-ziehen" style="animation-duration:70s">${wolkeZeichnen(80, 120, 1.1, z)}</g>
    <g class="wb-ziehen" style="animation-duration:95s;animation-delay:-40s">${wolkeZeichnen(240, 70, 0.9, z)}</g>
    <clipPath id="wbh-fall"><rect x="276" y="194" width="20" height="140"/></clipPath>
    <g clip-path="url(#wbh-fall)"><g class="wb-fall">${[-1, 0, 1].map((i) => `<path d="M${286 + i * 4} -80 l0 420" stroke="#ffffff" stroke-width="1.6" stroke-dasharray="18 22" opacity="0.85"/>`).join('')}</g></g>`;

  return { himmel, land, vorn, leben, hoehe };
}

export { BREITE };
