/**
 * Das Öffnen einer Truhe - mit großer Animation.
 *
 * Ablauf:
 *   1. Die Truhe fällt herab und landet federnd auf einem leuchtenden
 *      Zauberkreis, hinter ihr drehen sich Lichtstrahlen, Lichtstaub steigt
 *      auf. Eine Zahl an der Truhe sagt, wie viele Stücke drin sind.
 *      "Tippen zum Öffnen".
 *   2. Nach dem Tipp rüttelt sie immer stärker und beginnt zu leuchten.
 *   3. Ein Lichtblitz und eine Druckwelle - der Deckel springt auf, eine
 *      Lichtsäule steigt auf, Funken, Sterne und Münzen sprühen in der
 *      Farbe des wertvollsten Stücks.
 *   4. Die Stücke fliegen einzeln aus der Truhe auf ihren Platz und drehen
 *      sich dabei um; die Zahl an der Truhe zählt herunter. Seltene Stücke
 *      bekommen eine kurze Pause, einen Lichtring und ihren Klang,
 *      legendäre zusätzlich einen schimmernden Rand. Ein Tipp zeigt sofort alle.
 *   5. "Alles einsammeln" (und, falls im Lager noch Truhen liegen,
 *      "Nächste Truhe").
 *
 * Gutgeschrieben wird ALLES gleich zu Beginn - die Animation zeigt nur noch
 * an. So geht nichts verloren, wenn man das Spiel mittendrin schließt.
 *
 * Gestaltet in css/erlebnis.css (Abschnitt 9).
 */

import { truheOeffnen } from '../core/loot.js';
import { beuteGutschreiben } from '../core/state.js';
import { fortschrittMelden } from '../core/aufgaben.js';
import { spieleBeute, spieleKlang } from '../core/audio.js';
import { vibriere } from '../core/haptik.js';
import { SELTENHEITEN } from '../data/items.js';
import { truheSvg } from './truhen.js';

const RANG = { gewoehnlich: 0, selten: 1, episch: 2, legendaer: 3 };

/**
 * Was in einem Feld steht. Fähigkeitskarten zeigen ihre Kopien und wie weit
 * es bis zum nächsten Level ist - steigt die Karte, gibt es "LEVEL UP".
 */
function inhaltFuer(stueck, seltenheit) {
  const kopf = `
    <span class="loot-item__icon">${stueck.icon}</span>
    <span class="loot-item__name">${stueck.name}</span>
  `;
  if (stueck.art === 'attacke') {
    return `${kopf}<span class="loot-item__neu">NEUE KARTE!</span>`;
  }
  if (stueck.art === 'studio') {
    return `${kopf}<span class="loot-item__neu">FÜRS SKIN-STUDIO!</span>`;
  }
  if (stueck.art === 'karte' && stueck.ergebnis) {
    const { levelVorher, level, kopien, benoetigt } = stueck.ergebnis;
    const anteil = benoetigt ? Math.min(1, kopien / benoetigt) : 1;
    return `${kopf}
      <span class="loot-item__kopien">+${stueck.menge} ${stueck.menge === 1 ? 'Karte' : 'Karten'}</span>
      ${level > levelVorher ? `<span class="loot-item__levelup">LEVEL UP! Lv. ${level}</span>` : ''}
      <span class="kartenbalken" style="--anteil:${anteil}">
        <span class="kartenbalken__text">${benoetigt ? `Lv. ${level} · ${kopien}/${benoetigt}` : `Lv. ${level} · MAX`}</span>
      </span>
    `;
  }
  return `${kopf}<span class="loot-item__rarity">${seltenheit.name}</span>`;
}

/** Takt zwischen zwei Stücken (ms) - seltene Stücke bekommen mehr Zeit. */
const TAKT = 380;
const TAKT_SELTEN = 820;

/** Lichtstaub, der während des Öffnens aufsteigt: [links %, Verzögerung s]. */
const STAUB = [[12, 0], [24, 2.2], [36, 0.9], [48, 3.1], [58, 1.5], [70, 0.4], [82, 2.6], [90, 1.2], [6, 3.6], [64, 4.2]];

function animationenAn() {
  if (document.body.classList.contains('no-animations')) return false;
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch {
    // ohne matchMedia eben mit Animation
  }
  return true;
}

/**
 * Öffnet eine Truhe mit Animation.
 *
 * @param {HTMLElement} behaelter - der Bildschirm, über den das Fenster kommt
 * @param {object} truhe - Eintrag aus js/data/shop.js
 * @param {object} [optionen]
 * @param {number} [optionen.weitere] - wie viele Truhen danach noch warten
 * @param {function} [optionen.fertig] - (naechste: boolean) => void
 */
export function zeigeTruhenOeffnung(behaelter, truhe, { weitere = 0, fertig = () => {} } = {}) {
  const stuecke = truheOeffnen(truhe);
  // Sofort gutschreiben - die Animation ist nur noch Anzeige.
  stuecke.forEach((stueck) => beuteGutschreiben(stueck));
  fortschrittMelden('truhe');

  const bestes = stuecke.reduce(
    (best, s) => (RANG[s.seltenheit] > RANG[best] ? s.seltenheit : best),
    'gewoehnlich'
  );
  const leuchtFarbe = SELTENHEITEN[bestes]?.farbe ?? '#ffd76a';
  const bewegt = animationenAn();
  const timer = [];
  const spaeter = (fn, ms) => timer.push(setTimeout(fn, ms));

  const overlay = document.createElement('div');
  overlay.className = `overlay overlay--oeffnung oeffnung--${truhe.design}`;
  overlay.style.setProperty('--leucht-farbe', leuchtFarbe);
  overlay.innerHTML = `
    <div class="oeffnung">
      <div class="oeffnung__buehne">
        <span class="oeffnung__strahlen" aria-hidden="true"></span>
        <span class="oeffnung__kreis" aria-hidden="true"></span>
        <span class="oeffnung__saeule" aria-hidden="true"></span>
        <span class="oeffnung__welle" aria-hidden="true"></span>
        <div class="oeffnung__truhe">${truheSvg(truhe.design)}</div>
        <span class="oeffnung__zaehler" aria-label="${stuecke.length} Stücke">${stuecke.length}</span>
        <span class="oeffnung__funken" aria-hidden="true"></span>
      </div>
      <div class="oeffnung__titel"><span>${truhe.name}</span></div>
      <div class="oeffnung__hinweis">Tippen zum Öffnen</div>
      <div class="loot-grid oeffnung__beute"></div>
      <div class="oeffnung__knoepfe" hidden>
        <button class="btn btn--big btn--green" data-aktion="fertig" type="button">Alles einsammeln</button>
        ${weitere > 0 ? `<button class="btn" data-aktion="naechste" type="button">🎁 Nächste Truhe öffnen (${weitere})</button>` : ''}
      </div>
    </div>
    ${STAUB.map(([x, t]) => `<span class="oeffnung__staub" style="left:${x}%;animation-delay:${t}s" aria-hidden="true"></span>`).join('')}
    <span class="oeffnung__blitz" aria-hidden="true"></span>
  `;
  behaelter.appendChild(overlay);

  const truheEl = overlay.querySelector('.oeffnung__truhe');
  const hinweis = overlay.querySelector('.oeffnung__hinweis');
  const gitter = overlay.querySelector('.oeffnung__beute');
  const knoepfe = overlay.querySelector('.oeffnung__knoepfe');
  const funken = overlay.querySelector('.oeffnung__funken');
  const zaehler = overlay.querySelector('.oeffnung__zaehler');

  // Leere Plätze für die Stücke - so steht das Raster von Anfang an fest.
  const felder = stuecke.map(() => {
    const feld = document.createElement('div');
    feld.className = 'loot-item oeffnung__platz';
    gitter.appendChild(feld);
    return feld;
  });

  let phase = 'wartet'; // wartet -> ruettelt -> zeigt -> fertig
  let naechstes = 0;

  /** Die Zahl an der Truhe: wie viele Stücke noch drin sind. */
  function zaehlerSetzen() {
    const rest = stuecke.length - naechstes;
    zaehler.textContent = rest;
    zaehler.classList.toggle('ist-leer', rest === 0);
    // Kurz hüpfen lassen - Klasse neu setzen startet die Animation neu.
    zaehler.classList.remove('huepft');
    void zaehler.offsetWidth;
    zaehler.classList.add('huepft');
  }

  if (bewegt) {
    overlay.classList.add('ist-landend');
    spaeter(() => spieleKlang('karte'), 380);
  }

  /** Ein Stück aus der Truhe auf seinen Platz fliegen lassen. */
  function aufdecken(index, sofort = false) {
    const stueck = stuecke[index];
    const feld = felder[index];
    const seltenheit = SELTENHEITEN[stueck.seltenheit] ?? SELTENHEITEN.gewoehnlich;
    feld.className = `loot-item is-${stueck.seltenheit}`;
    feld.style.setProperty('--rarity', seltenheit.farbe);
    feld.innerHTML = inhaltFuer(stueck, seltenheit);
    if (!sofort && bewegt) {
      // Startpunkt = Mitte der Truhe, damit das Stück sichtbar aus ihr kommt.
      const t = truheEl.getBoundingClientRect();
      const f = feld.getBoundingClientRect();
      feld.style.setProperty('--von-x', `${t.left + t.width / 2 - (f.left + f.width / 2)}px`);
      feld.style.setProperty('--von-y', `${t.top + t.height / 2 - (f.top + f.height / 2)}px`);
      feld.classList.add('fliegt');
      // Seltene Stücke, neue Karten und Level-Ups bekommen den großen Auftritt.
      const levelUp = stueck.ergebnis && stueck.ergebnis.level > stueck.ergebnis.levelVorher;
      if (RANG[stueck.seltenheit] >= 2 || stueck.art === 'attacke' || levelUp) feld.classList.add('ist-besonders');
      if (levelUp) spaeter(() => spieleKlang('levelauf'), 260);
      spieleBeute(stueck.seltenheit);
      if (RANG[stueck.seltenheit] >= 2) vibriere('krit');
    }
  }

  /** Das nächste Stück - und danach das übernächste, bis alle da sind. */
  function weiter() {
    if (phase !== 'zeigt') return;
    if (naechstes >= stuecke.length) {
      abschliessen();
      return;
    }
    const index = naechstes++;
    aufdecken(index);
    zaehlerSetzen();
    const stueck = stuecke[index];
    const selten = RANG[stueck.seltenheit] >= 2 || stueck.art === 'attacke' ||
      (stueck.ergebnis && stueck.ergebnis.level > stueck.ergebnis.levelVorher);
    spaeter(weiter, selten ? TAKT_SELTEN : TAKT);
  }

  function abschliessen() {
    if (phase === 'fertig') return;
    timer.forEach(clearTimeout);
    timer.length = 0;
    // Was noch fehlt, erscheint sofort.
    for (; naechstes < stuecke.length; naechstes++) aufdecken(naechstes, true);
    zaehlerSetzen();
    phase = 'fertig';
    overlay.classList.add('ist-fertig');
    hinweis.textContent = 'Du erhältst:';
    knoepfe.hidden = false;
  }

  /**
   * Funken in alle Richtungen - in der Farbe des besten Stücks. Dazwischen
   * ein paar Sterne und Münzen, die nach oben fliegen und wieder fallen.
   */
  function funkenSpruehen() {
    if (!bewegt) return;
    const ANZAHL = 26;
    for (let i = 0; i < ANZAHL; i++) {
      const funke = document.createElement('span');
      const art = i % 6 === 0 ? ' oeffnung__funke--muenze' : i % 4 === 0 ? ' oeffnung__funke--stern' : '';
      funke.className = `oeffnung__funke${art}`;
      const winkel = (i / ANZAHL) * Math.PI * 2 + Math.random() * 0.3;
      const weite = 80 + Math.random() * 90;
      funke.style.setProperty('--fx', `${Math.cos(winkel) * weite}px`);
      funke.style.setProperty('--fy', `${Math.sin(winkel) * weite * 0.8 - 40}px`);
      funke.style.setProperty('--dreh', `${Math.round(Math.random() * 540 - 270)}deg`);
      funke.style.animationDelay = `${Math.random() * 0.12}s`;
      funken.appendChild(funke);
    }
  }

  function oeffnen() {
    phase = 'ruettelt';
    hinweis.textContent = '…';
    overlay.classList.remove('ist-landend');
    overlay.classList.add('ist-ruettelnd');
    vibriere('treffer');
    const dauer = bewegt ? 750 : 0;
    spaeter(() => {
      overlay.classList.remove('ist-ruettelnd');
      overlay.classList.add('ist-offen');
      truheEl.classList.add('is-open');
      hinweis.textContent = 'Tippen zum Überspringen';
      spieleKlang('truhe');
      vibriere('krit');
      funkenSpruehen();
      phase = 'zeigt';
      if (bewegt) spaeter(weiter, 450);
      else abschliessen();
    }, dauer);
  }

  // Ein Tipp irgendwo: öffnen - oder während der Stücke alles sofort zeigen.
  overlay.addEventListener('click', (event) => {
    if (event.target.closest('.oeffnung__knoepfe')) return;
    if (phase === 'wartet') oeffnen();
    else if (phase === 'zeigt') abschliessen();
  });

  knoepfe.addEventListener('click', (event) => {
    const knopf = event.target.closest('button');
    if (!knopf) return;
    timer.forEach(clearTimeout);
    overlay.remove();
    fertig(knopf.dataset.aktion === 'naechste');
  });
}
