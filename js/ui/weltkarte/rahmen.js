/**
 * Der Rahmen um die Weltkarte: Kopfleiste (Figur, Sterne, Trophäen,
 * Münzen, Welten-Knopf, Weltname) und unten die Kampfkarte mit dem
 * Start-Knopf.
 *
 * Alle Werte kommen aus dem echten Spielstand. Eine Energieanzeige gibt es
 * bewusst nicht - das Spiel kennt keine Energie.
 */

import { gameState, getAktiveFigur } from '../../core/state.js';
import { charakterWerte } from '../../core/progression.js';
import { getMonster } from '../../data/monsters.js';
import { ligaVon } from '../../data/trophaeen.js';
import { createSprite } from '../sprite.js';

/* ---------- Symbole (gezeichnet statt Emoji) ---------- */

export const ICONS = {
  stern: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8 L15 8.3 L22.1 9 L16.8 13.8 L18.3 20.8 L12 17.2 L5.7 20.8 L7.2 13.8 L1.9 9 L9 8.3 Z" fill="url(#wk-stern)" stroke="#7a4a06" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.5 9.4 L12 4.6 L13.3 7.6" stroke="#fffbe0" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.8"/></svg>`,
  pokal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3 h12 v5 a6 6 0 0 1 -12 0 Z" fill="url(#wk-stern)" stroke="#7a4a06" stroke-width="1.3"/><path d="M6 5 H2.8 a3.6 3.6 0 0 0 4.2 5 M18 5 h3.2 a3.6 3.6 0 0 1 -4.2 5" stroke="#e0a52a" stroke-width="1.8" fill="none"/><path d="M10.6 13.5 h2.8 l0.6 4 h-4 Z" fill="#e0a52a"/><rect x="7" y="17.5" width="10" height="3.6" rx="1.2" fill="#a8741c"/><path d="M8.5 5 v3" stroke="#fffbe0" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/></svg>`,
  muenze: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="url(#wk-stern)" stroke="#8a5a10" stroke-width="1.5"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#c98a1c" stroke-width="1.4"/><path d="M10 8.4 h3.6 a1.8 1.8 0 0 1 0 3.6 h-3 h3.4 a1.8 1.8 0 0 1 0 3.6 H10 Z" fill="none" stroke="#a8741c" stroke-width="1.5" stroke-linejoin="round"/><path d="M6.6 9 a6 6 0 0 1 3.4 -3.2" stroke="#fffbe0" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 v14 M5 12 h14" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>`,
  karte: `<svg viewBox="0 0 28 24" aria-hidden="true"><path d="M2 5 L9 2.5 L19 5.5 L26 3 L26 19 L19 21.5 L9 18.5 L2 21 Z" fill="#f2deb0" stroke="#8a5a20" stroke-width="1.4" stroke-linejoin="round"/><path d="M9 2.5 V18.5 M19 5.5 V21.5" stroke="#c9a46a" stroke-width="1.2"/><path d="M5 15 q4 -6 8 -3 t8 -5" stroke="#d6453c" stroke-width="1.6" fill="none" stroke-dasharray="2 2"/><path d="M20.5 6 l1.6 1.6 M22.1 6 l-1.6 1.6" stroke="#d6453c" stroke-width="1.4" stroke-linecap="round"/><path d="M4 8 q2 1 3 0" stroke="#5a9e3a" stroke-width="1.6" fill="none"/></svg>`,
  blatt: `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 24 C4 12 12 4 25 3 C24 15 17 23 4 24 Z" fill="#6fcf4a" stroke="#2c7a22" stroke-width="1.4"/><path d="M4 24 L19 9 M10 18 l-1 -5 M14 14 l-1 -5 M10 18 l5 0 M14 14 l5 0" stroke="#2c7a22" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M8 17 C9 11 14 7 21 5.5" stroke="#d8ffb0" stroke-width="1.2" fill="none" opacity="0.8"/></svg>`,
  krone: `<svg viewBox="0 0 32 26" aria-hidden="true"><path d="M3 22 L1.5 7 L9 13 L16 3 L23 13 L30.5 7 L29 22 Z" fill="url(#wk-stern)" stroke="#7a4a06" stroke-width="1.6" stroke-linejoin="round"/><circle cx="16" cy="15" r="2.6" fill="#ff5c8a" stroke="#7a1a3a"/><circle cx="8" cy="17" r="1.8" fill="#5cc8ff"/><circle cx="24" cy="17" r="1.8" fill="#5cc8ff"/><rect x="3" y="21" width="26" height="3.4" rx="1.2" fill="#c98a1c"/></svg>`,
  schwerter: `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 23 L22 6 M23 23 L6 6" stroke="#5a3a10" stroke-width="5" stroke-linecap="round"/><path d="M5 23 L22 6 M23 23 L6 6" stroke="#eef2ff" stroke-width="2.6" stroke-linecap="round"/><path d="M3 19 l6 6 M25 19 l-6 6" stroke="#ffd76a" stroke-width="3" stroke-linecap="round"/></svg>`,
  zurueck: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 L7 12 L15 20" stroke="#fff" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  spielen: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5 L20 12 L7 19.5 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`,
  lorbeer: `<svg viewBox="0 0 30 40" aria-hidden="true"><path d="M24 38 C10 34 4 22 8 4" stroke="#ffe08a" stroke-width="2" fill="none" stroke-linecap="round"/>${[
    [9, 8, -40], [7, 15, -25], [8, 22, -10], [11, 29, 10], [16, 34, 30],
  ]
    .map(([x, y, w]) => `<ellipse cx="${x - 3}" cy="${y}" rx="5" ry="2.4" transform="rotate(${w - 60} ${x - 3} ${y})" fill="#ffe08a"/><ellipse cx="${x + 4}" cy="${y + 1}" rx="5" ry="2.4" transform="rotate(${w + 30} ${x + 4} ${y + 1})" fill="#f5c84a"/>`)
    .join('')}</svg>`,
};

/** Kleines Welt-Symbol: fürs Grüne Tal das Blatt, sonst das Welt-Emoji. */
function weltSymbol(welt) {
  return welt.id === 1 ? ICONS.blatt : `<span class="wk-banner__emoji">${welt.icon}</span>`;
}

/**
 * Die Kopfleiste der Weltkarte.
 *
 * @param {object} o
 * @param {object} o.welt
 * @param {number} o.sterne     - erreichte Sterne in dieser Welt
 * @param {number} o.sterneMax
 * @param {() => void} o.zuWelten
 * @param {() => void} o.zuRangliste
 * @param {() => void} o.zuShop
 */
export function kopfleisteBauen({ welt, sterne, sterneMax, zuWelten, zuRangliste, zuShop }) {
  const figur = getMonster(getAktiveFigur());
  const { level } = charakterWerte(figur);
  const liga = ligaVon(gameState.trophaeen);

  const leiste = document.createElement('header');
  leiste.className = 'wk-kopf';
  leiste.innerHTML = `
    <div class="wk-kopf__zeile">
      <div class="wk-avatar">
        <span class="wk-avatar__rahmen"><span class="wk-avatar__bild hud__avatar"></span></span>
        <span class="wk-avatar__level">Lv. ${level}</span>
      </div>
      <div class="wk-kopf__werte">
        <div class="wk-chip" aria-label="${sterne} von ${sterneMax} Sternen">
          <span class="wk-chip__icon">${ICONS.stern}</span><span class="wk-chip__zahl">${sterne}/${sterneMax}</span>
        </div>
        <button class="wk-chip wk-chip--knopf" type="button" style="--liga:${liga.farbe}" aria-label="${gameState.trophaeen} Trophäen - Rangliste öffnen">
          <span class="wk-chip__icon">${ICONS.pokal}</span><span class="wk-chip__zahl">${gameState.trophaeen}</span>
        </button>
        <div class="wk-chip wk-chip--muenzen">
          <span class="wk-chip__icon">${ICONS.muenze}</span><span class="wk-chip__zahl">${gameState.coins}</span>
          <button class="wk-chip__plus" type="button" aria-label="Zum Shop">${ICONS.plus}</button>
        </div>
      </div>
    </div>
    <div class="wk-kopf__zeile wk-kopf__zeile--welt">
      <button class="wk-knopf-welten" type="button"><span class="wk-knopf-welten__icon">${ICONS.karte}</span>Welten</button>
      <div class="wk-banner"><span class="wk-banner__icon">${weltSymbol(welt)}</span><span class="wk-banner__name">${welt.name}</span></div>
      <span class="wk-kopf__platz" aria-hidden="true"></span>
    </div>
  `;
  leiste.querySelector('.wk-avatar__bild').appendChild(createSprite(figur));
  leiste.querySelector('.wk-knopf-welten').addEventListener('click', zuWelten);
  leiste.querySelector('.wk-chip--knopf').addEventListener('click', zuRangliste);
  leiste.querySelector('.wk-chip__plus').addEventListener('click', zuShop);
  return leiste;
}

/**
 * Unten: Kampfkarte (Vorschau des gewählten Gegners) und die Knöpfe.
 *
 * @returns {{element: HTMLElement, zeigen: (level, gegner, anzahl) => void}}
 */
export function kampfkarteBauen({ zurueck, starten }) {
  const fuss = document.createElement('footer');
  fuss.className = 'wk-fuss';
  fuss.innerHTML = `
    <div class="wk-karte" aria-live="polite">
      <span class="wk-karte__ecke wk-karte__ecke--lo"></span><span class="wk-karte__ecke wk-karte__ecke--ro"></span>
      <span class="wk-karte__ecke wk-karte__ecke--lu"></span><span class="wk-karte__ecke wk-karte__ecke--ru"></span>
      <div class="wk-karte__buehne">
        <span class="wk-karte__podest"></span>
        <span class="wk-karte__figur"></span>
        <span class="wk-karte__funke" style="--i:0"></span><span class="wk-karte__funke" style="--i:1"></span><span class="wk-karte__funke" style="--i:2"></span>
      </div>
      <span class="wk-karte__trenner"></span>
      <div class="wk-karte__text">
        <div class="wk-karte__titel"></div>
        <div class="wk-karte__zeile wk-karte__gegner"></div>
        <div class="wk-karte__zeile wk-karte__belohnung"></div>
      </div>
    </div>
    <div class="wk-knoepfe">
      <button class="wk-zurueck" type="button" aria-label="Zurück zum Startbildschirm">${ICONS.zurueck}</button>
      <button class="wk-start" type="button">
        <span class="wk-start__lorbeer">${ICONS.lorbeer}</span>
        <span class="wk-start__text"><span class="wk-start__play">${ICONS.spielen}</span><span class="wk-start__wort"></span></span>
        <span class="wk-start__lorbeer wk-start__lorbeer--r">${ICONS.lorbeer}</span>
      </button>
    </div>
  `;
  fuss.querySelector('.wk-zurueck').addEventListener('click', zurueck);
  const startKnopf = fuss.querySelector('.wk-start');
  startKnopf.addEventListener('click', starten);

  const karte = fuss.querySelector('.wk-karte');
  const figur = fuss.querySelector('.wk-karte__figur');
  const titel = fuss.querySelector('.wk-karte__titel');
  const gegnerZeile = fuss.querySelector('.wk-karte__gegner');
  const belohnung = fuss.querySelector('.wk-karte__belohnung');
  const wort = fuss.querySelector('.wk-start__wort');

  function zeigen(level, gegner, anzahl) {
    karte.classList.remove('ist-leer');
    karte.classList.toggle('ist-boss', level.isBoss);
    startKnopf.classList.toggle('ist-boss', level.isBoss);
    titel.innerHTML = `${level.isBoss ? `<span class="wk-karte__krone">${ICONS.krone}</span>` : ''}Kampf ${level.number} von ${anzahl}`;
    gegnerZeile.innerHTML = `<strong>${gegner.name}</strong>${gegner.variante ? ` <span class="map__variante">${gegner.variante}</span>` : ''} <span class="wk-karte__punkt">·</span> ${gegner.maxHp} LP`;
    belohnung.innerHTML = `Belohnung: <span class="wk-karte__muenze">${ICONS.muenze}</span> <strong>${level.reward}</strong>`;
    figur.replaceChildren(createSprite(gegner));
    wort.textContent = level.isBoss ? 'BOSSKAMPF' : `KAMPF ${level.number} STARTEN`;
    startKnopf.disabled = false;
    // Kurzes Aufleuchten bei jeder neuen Auswahl.
    karte.classList.remove('ist-neu');
    void karte.offsetWidth;
    karte.classList.add('ist-neu');
  }

  function leeren() {
    karte.classList.add('ist-leer');
    titel.textContent = 'Kein Kampf verfügbar.';
    gegnerZeile.textContent = '';
    belohnung.textContent = '';
    wort.textContent = 'KAMPF';
    startKnopf.disabled = true;
  }

  return { element: fuss, zeigen, leeren };
}
