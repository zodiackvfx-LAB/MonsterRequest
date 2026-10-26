/**
 * Kleine Bausteine, die mehrere Bildschirme gemeinsam nutzen.
 */

import { gameState, getAktiveFigur } from '../core/state.js';
import { charakterWerte, getCharakter, xpFuerNaechstesLevel } from '../core/progression.js';
import { getMonster } from '../data/monsters.js';
import { createSprite } from './sprite.js';
import { MUENZE } from '../data/items.js';
import { ligaVon } from '../data/trophaeen.js';
import { showScreen } from '../core/screens.js';
import { freundeMoeglich, offeneAnzahl } from '../core/freunde.js';

/**
 * Macht Text sicher fürs Einsetzen in HTML.
 *
 * Der Spielername kommt vom Spieler selbst. Ohne diese Umwandlung könnte ein
 * Name wie "<b>" das Layout verbiegen oder Schlimmeres - deshalb werden die
 * fünf gefährlichen Zeichen ersetzt.
 */
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (z) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[z]);
}

/**
 * Füllt einen Balken (.bar__fill oder .hud__level-fill).
 *
 * Wir setzen die Variable --fuellung von 0 bis 1 statt einer Breite in
 * Prozent: das CSS staucht den Balken damit über transform: scaleX().
 * Über "width" liess Safari auf dem iPad den alten, breiteren Anstrich
 * stehen - der Balken sah dann voller aus als die Lebenszahl.
 *
 * @param {HTMLElement} element - das Füll-Element
 * @param {number} anteil - 0 bis 1
 */
export function balkenFuellen(element, anteil) {
  const sicher = Math.max(0, Math.min(1, Number.isFinite(anteil) ? anteil : 0));
  element.style.setProperty('--fuellung', sicher);
}

/** Gezeichnete Symbole der Leiste - sehen auf jedem Gerät gleich aus (Emoji nicht). */
const HUD_ICONS = {
  freunde: `<svg viewBox="0 0 28 24" aria-hidden="true"><defs><linearGradient id="hud-blau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe2ff"/><stop offset="1" stop-color="#6f8fd8"/></linearGradient></defs>
    <circle cx="18.5" cy="7.5" r="4.2" fill="url(#hud-blau)" opacity="0.75"/><path d="M11 21 a7.5 6.5 0 0 1 15 0 Z" fill="url(#hud-blau)" opacity="0.75"/>
    <circle cx="10.5" cy="8.5" r="4.8" fill="url(#hud-blau)" stroke="#1b2450" stroke-width="1"/><path d="M2 22 a8.5 7.5 0 0 1 17 0 Z" fill="url(#hud-blau)" stroke="#1b2450" stroke-width="1"/></svg>`,
  pokal: `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="hud-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a8"/><stop offset="0.5" stop-color="#ffc93d"/><stop offset="1" stop-color="#e08a0c"/></linearGradient></defs>
    <path d="M6 3 h12 v5 a6 6 0 0 1 -12 0 Z" fill="url(#hud-gold)" stroke="#7a4a06" stroke-width="1.3"/><path d="M6 5 H2.8 a3.6 3.6 0 0 0 4.2 5 M18 5 h3.2 a3.6 3.6 0 0 1 -4.2 5" stroke="#e0a52a" stroke-width="1.8" fill="none"/>
    <path d="M10.6 13.5 h2.8 l0.6 4 h-4 Z" fill="#e0a52a"/><rect x="7" y="17.5" width="10" height="3.6" rx="1.2" fill="#a8741c"/><path d="M8.5 5 v3" stroke="#fffbe0" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/></svg>`,
};

/**
 * Spielerleiste oben: Avatar, Stufe, Fortschrittsbalken, Freunde, Trophäen
 * und Münzen. Ein Tipp auf die Trophäen öffnet die Rangliste, einer auf das
 * Freunde-Symbol die Freunde (nur, wenn es die Datenbank gibt).
 */
export function createHud() {
  const starter = getMonster(getAktiveFigur());
  const { level } = charakterWerte(starter);

  // Der Balken zeigt, wie weit es bis zum nächsten Charakter-Level ist.
  const charakter = getCharakter(starter.id);
  const noetig = xpFuerNaechstesLevel(charakter.level);
  const progress = noetig === Infinity ? 1 : Math.min(1, charakter.xp / noetig);

  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <div class="hud__player">
      <span class="hud__avatar"></span>
      <span class="hud__level">
        ${gameState.name ? `<span class="hud__name">${escapeHtml(gameState.name)}</span>` : ''}
        <span class="hud__level-text">Lv. ${level}</span>
        <span class="hud__level-bar">
          <span class="hud__level-fill" style="--fuellung: ${progress}"></span>
        </span>
      </span>
    </div>
    <div class="hud__rechts">
      ${freundeMoeglich() ? `<button class="hud__freunde" type="button" aria-label="Freunde">
        <span class="hud__freunde-icon" aria-hidden="true">${HUD_ICONS.freunde}</span>
        <span class="hud__freunde-zahl" data-freunde-zahl ${offeneAnzahl() ? '' : 'hidden'}>${offeneAnzahl() > 9 ? '9+' : offeneAnzahl()}</span>
      </button>` : ''}
      <button class="hud__trophaeen" type="button" style="--liga-farbe:${ligaVon(gameState.trophaeen).farbe}"
              aria-label="${gameState.trophaeen} Trophäen - Rangliste öffnen">
        <span class="hud__trophaeen-icon" aria-hidden="true">${HUD_ICONS.pokal}</span>
        <span>${gameState.trophaeen}</span>
      </button>
      <div class="hud__coins">
        <span class="hud__coin-icon">${MUENZE}</span>
        <span>${gameState.coins}</span>
      </div>
    </div>
  `;
  hud.querySelector('.hud__avatar').appendChild(createSprite(starter));
  hud.querySelector('.hud__trophaeen').addEventListener('click', () => showScreen('rangliste'));
  hud.querySelector('.hud__freunde')?.addEventListener('click', () => showScreen('freunde'));
  return hud;
}

/**
 * Kopfzeile mit Zurück-Button und Titel.
 *
 * @param {string} title
 * @param {function} onBack - wird beim Tippen auf "Zurück" aufgerufen
 */
export function createTopbar(title, onBack) {
  const bar = document.createElement('header');
  bar.className = 'topbar';
  bar.innerHTML = `
    <button class="btn btn--ghost btn--small" type="button">‹&nbsp;Zurück</button>
    <h2 class="topbar__title">${title}</h2>
    <span class="topbar__spacer"></span>
  `;
  bar.querySelector('button').addEventListener('click', onBack);
  return bar;
}

/**
 * Sternereihe (z. B. ★★☆).
 * @param {number} earned - 0 bis 3
 */
export function createStars(earned, total = 3) {
  const wrap = document.createElement('div');
  wrap.className = 'stars';
  for (let i = 0; i < total; i++) {
    const star = document.createElement('span');
    star.className = `star${i < earned ? ' is-earned' : ''}`;
    star.textContent = '⭐';
    wrap.appendChild(star);
  }
  return wrap;
}
