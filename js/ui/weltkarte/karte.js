/**
 * Baut die scrollbare Weltkarte zusammen - Ebene für Ebene, von hinten
 * nach vorn:
 *
 *   1. Hintergrund   Himmel, Sonne, Berge, ferne Hügel (Parallaxe: langsamer)
 *   2. Landschaft    Wiese, Fluss, Brücke, See, Bäume ... in Streifen-Bildern
 *   3. Leben         Wasser, Wolken, Gras, Schmetterlinge (leben.js)
 *   4. Lichtpfad     goldene Linie mit wandernden Lichtpunkten
 *   5. Stationen     die Kampfplattformen (station.js)
 *   6. Vordergrund   unscharfe Zweige am Rand (Parallaxe: schneller)
 *
 * Die stehende Landschaft wird als SVG-Bild eingebunden statt als lebendes
 * SVG im Dokument: Der Browser rastert sie einmal und schiebt beim Scrollen
 * nur noch fertige Bilder. Damit kein riesiges Einzelbild entsteht (das
 * Safari auf dem iPhone nicht mag), wird sie in Streifen geschnitten.
 */

import { karteAnlegen } from './layout.js';
import { bodenZeichnen, defsZeichnen, hintergrundZeichnen, vordergrundZeichnen } from './zeichnen.js';
import { lebenAnlegen, parallaxStarten } from './leben.js';
import { stationBauen } from './station.js';
import { pfadInPixeln, r } from './geometrie.js';

/** So breit wird die Spur mit den Kämpfen höchstens (Tablet, Querformat). */
const SPUR_MAX = 560;

/** Höhe eines Landschafts-Streifens in Pixeln. */
const STREIFEN_PX = 640;

/**
 * @param {object} o
 * @param {HTMLElement} o.scroller  - das scrollende Element
 * @param {object} o.welt
 * @param {object} o.thema          - aus js/data/weltkarten.js
 * @param {object[]} o.levels       - Kämpfe der Welt (Kampf 1 zuerst)
 * @param {(level) => object} o.gegnerVon
 * @param {(level) => {offen:boolean, geschafft:boolean, sterne:number}} o.zustand
 * @param {string|null} o.aktuellId - der nächste offene Kampf
 * @param {number} o.obenPx         - verdeckter Platz oben (Kopfleiste)
 * @param {number} o.untenPx        - verdeckter Platz unten (Kampfkarte)
 * @param {string} o.stufe          - Effektstufe (leben.js)
 * @param {(level) => void} o.beiWahl
 */
export function weltkarteBauen({ scroller, welt, thema, levels, gegnerVon, zustand, aktuellId, obenPx, untenPx, stufe, beiWahl }) {
  const breitePx = Math.max(280, scroller.clientWidth);
  const spurPx = Math.min(breitePx, SPUR_MAX);
  const m = spurPx / 1000; // Pixel je Karteneinheit
  const stationPx = Math.round(Math.min(124, Math.max(88, spurPx * 0.26)));
  const f = thema.farben;

  const karte = karteAnlegen({
    anzahl: levels.length,
    breite: breitePx / m,
    // Ganz oben steht der Boss direkt unter der Kopfleiste - weiter nach
    // oben lässt sich nicht scrollen. Die Berge schauen dahinter hervor.
    oben: (obenPx + Math.max(stationPx + 50, 185)) / m,
    unten: (untenPx + stationPx * 1.05 + 16) / m,
    seed: welt.id,
    deko: thema.deko,
    frei: {
      x: (stationPx * 0.6) / m + 10,
      oben: (stationPx * 0.62) / m,
      unten: (stationPx * 0.5 + 34) / m,
    },
  });

  const hoehePx = Math.round(karte.hoehe * m);
  const flaeche = document.createElement('div');
  flaeche.className = 'wk-flaeche';
  flaeche.style.height = `${hoehePx}px`;
  flaeche.style.setProperty('--breite', `${breitePx}px`);
  flaeche.style.setProperty('--station', `${stationPx}px`);
  flaeche.style.setProperty('--himmel', f.himmelOben);
  flaeche.style.setProperty('--wiese', f.wiese);

  const adressen = [];
  const bildAus = (svg) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    adressen.push(url);
    return url;
  };

  /* ---------- 1. Hintergrund ---------- */
  const fern = document.createElement('div');
  fern.className = 'wk-fern';
  const hg = hintergrundZeichnen(karte, f, thema);
  fern.style.height = `${Math.round(hg.hoehe * m)}px`;
  const hgBild = new Image();
  hgBild.alt = '';
  hgBild.decoding = 'async';
  hgBild.src = bildAus(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(karte.breite)} ${r(hg.hoehe)}" width="${breitePx}" height="${Math.round(hg.hoehe * m)}" preserveAspectRatio="none">${hg.svg}</svg>`);
  fern.appendChild(hgBild);
  flaeche.appendChild(fern);

  /* ---------- 2. Landschaft in Streifen ---------- */
  const landschaft = document.createElement('div');
  landschaft.className = 'wk-landschaft';
  const defs = defsZeichnen(karte, f);
  const teile = bodenZeichnen(karte, f, thema, { ohneWiegendes: stufe !== 'aus' && thema.leben.grasWiegen });
  const streifenU = STREIFEN_PX / m;
  // Der erste Streifen beginnt ganz oben: Baumkronen und Steintore ragen
  // über den Horizont und würden sonst waagerecht abgeschnitten.
  for (let y0 = 0; y0 < karte.hoehe; y0 += streifenU) {
    const y1 = Math.min(karte.hoehe, y0 + streifenU);
    const inhalt = teile.filter((t) => t.y1 >= y0 - 2 && t.y0 <= y1 + 2).map((t) => t.svg).join('');
    const top = Math.round(y0 * m);
    const hoehe = Math.round(y1 * m) - top + 1; // 1 px Überlappung gegen Haarlinien
    const vb = `0 ${r(top / m)} ${r(karte.breite)} ${r(hoehe / m)}`;
    const bild = new Image();
    bild.alt = '';
    bild.decoding = 'async';
    bild.className = 'wk-streifen';
    bild.style.top = `${top}px`;
    bild.style.height = `${hoehe}px`;
    bild.src = bildAus(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${breitePx}" height="${hoehe}" preserveAspectRatio="none">${defs}${inhalt}</svg>`);
    landschaft.appendChild(bild);
  }
  flaeche.appendChild(landschaft);

  /* ---------- 3. Leben ---------- */
  const leben = document.createElement('div');
  leben.className = 'wk-leben';
  lebenAnlegen(leben, karte, thema, m, stufe);
  flaeche.appendChild(leben);

  /* ---------- 4. Lichtpfad ---------- */
  const offen = levels.map((level) => zustand(level).offen);
  flaeche.appendChild(lichtpfadBauen(karte, offen, m, stufe));

  /* ---------- 5. Stationen ---------- */
  const knoepfe = new Map();
  levels.forEach((level, i) => {
    const z = zustand(level);
    const knopf = stationBauen({
      level,
      gegner: gegnerVon(level),
      offen: z.offen,
      geschafft: z.geschafft,
      sterne: z.sterne,
      aktuell: level.id === aktuellId,
    });
    const s = karte.stationen[i];
    knopf.style.left = `${r(s.x * m)}px`;
    knopf.style.top = `${r(s.y * m)}px`;
    if (z.offen) knopf.addEventListener('click', () => beiWahl(level));
    knoepfe.set(level.id, knopf);
    flaeche.appendChild(knopf);
  });

  /* ---------- 6. Vordergrund ---------- */
  let vorn = null;
  if (karte.vordergrund.length && stufe !== 'aus') {
    vorn = document.createElement('div');
    vorn.className = 'wk-vorn';
    vorn.setAttribute('aria-hidden', 'true');
    for (const stueck of karte.vordergrund) {
      const el = document.createElement('span');
      el.className = `wk-zweig wk-zweig--${stueck.seite < 0 ? 'links' : 'rechts'}`;
      el.style.top = `${r(stueck.y * m)}px`;
      el.style.setProperty('--g', String(stueck.s));
      el.innerHTML = vordergrundZeichnen(stueck, f);
      vorn.appendChild(el);
    }
    flaeche.appendChild(vorn);
  }

  scroller.replaceChildren(flaeche);
  const parallaxStop = stufe === 'aus' ? () => {} : parallaxStarten(scroller, fern, vorn);

  return {
    flaeche,
    knoepfe,
    massstab: m,
    karte,
    /** Scrollt so, dass die Station mittig zwischen Kopfleiste und Kampfkarte liegt. */
    zeigeStation(levelId, sanft = false) {
      const i = levels.findIndex((level) => level.id === levelId);
      if (i < 0) return;
      const mitteSichtbar = (obenPx + (scroller.clientHeight - untenPx)) / 2;
      const ziel = karte.stationen[i].y * m - mitteSichtbar;
      const max = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTo({ top: Math.max(0, Math.min(max, ziel)), behavior: sanft ? 'smooth' : 'auto' });
    },
    aufraeumen() {
      parallaxStop();
      adressen.forEach((url) => URL.revokeObjectURL(url));
    },
  };
}

/**
 * Der goldene Lichtpfad. Bis zum nächsten offenen Kampf leuchtet er golden
 * und Lichtpunkte wandern darauf entlang; dahinter ist er nur zart
 * gepunktet.
 */
function lichtpfadBauen(karte, offen, m, stufe) {
  const ebene = document.createElement('div');
  ebene.className = 'wk-pfad';
  ebene.setAttribute('aria-hidden', 'true');

  const { weg } = karte;
  const linie = (proben) => proben.map((p, i) => `${i ? 'L' : 'M'}${r(p.x)} ${r(p.y)}`).join(' ');

  // Zugang von unten bis Kampf 1 gehört immer zum erreichten Teil.
  const erste = karte.stationen[0];
  const bisErste = [];
  for (const p of weg.proben) {
    bisErste.push(p);
    if (Math.hypot(p.x - erste.x, p.y - erste.y) < 4) break;
  }

  const erreicht = [bisErste];
  const offenTeile = [];
  weg.abschnitte.forEach((teil, i) => (offen[i + 1] ? erreicht : offenTeile).push(teil));

  const goldD = erreicht.map(linie).join(' ');
  const zartD = offenTeile.map(linie).join(' ');
  const svg = `<svg viewBox="0 0 ${r(karte.breite)} ${r(karte.hoehe)}" preserveAspectRatio="none" style="width:${r(karte.breite * m)}px;height:${r(karte.hoehe * m)}px">
    ${zartD ? `<path d="${zartD}" stroke="#fffbe8" stroke-width="7" stroke-dasharray="1 22" stroke-linecap="round" fill="none" opacity="0.75"/>` : ''}
    <g fill="none" stroke="#ffd25a" stroke-linecap="round" stroke-linejoin="round">
      <path d="${goldD}" stroke-width="46" opacity="0.10"/><path d="${goldD}" stroke-width="32" opacity="0.14"/><path d="${goldD}" stroke-width="21" opacity="0.22"/>
    </g>
    <path d="${goldD}" stroke="#d9901a" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${goldD}" stroke="#ffe27a" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${goldD}" stroke="#ffffff" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.85"/>
  </svg>`;
  ebene.innerHTML = svg;

  // Lichtpunkte, die den goldenen Weg entlangwandern.
  const kannPfad = typeof CSS !== 'undefined' && CSS.supports?.('offset-path', "path('M0 0 L1 1')");
  if (stufe !== 'aus' && kannPfad) {
    const strecke = [...bisErste];
    weg.abschnitte.forEach((teil, i) => offen[i + 1] && strecke.push(...teil));
    const laengePx = strecke.reduce((s, p, i) => (i ? s + Math.hypot(p.x - strecke[i - 1].x, p.y - strecke[i - 1].y) : 0), 0) * m;
    const pfad = pfadInPixeln(strecke.filter((_, i) => i % 2 === 0 || i === strecke.length - 1), m);
    const zahl = stufe === 'hoch' ? Math.min(14, Math.max(4, Math.round(laengePx / 120))) : 3;
    const dauer = Math.max(6, laengePx / 55);
    for (let i = 0; i < zahl; i++) {
      const punkt = document.createElement('span');
      punkt.className = 'wk-lichtpunkt';
      punkt.style.offsetPath = `path('${pfad}')`;
      punkt.style.animationDuration = `${r(dauer)}s`;
      punkt.style.animationDelay = `-${r((dauer * i) / zahl)}s`;
      ebene.appendChild(punkt);
    }
  }
  return ebene;
}
