/**
 * Kleine Bausteine, die mehrere Bildschirme gemeinsam nutzen.
 */

import { gameState, getAktiveFigur } from '../core/state.js';
import { charakterWerte, getCharakter, xpFuerNaechstesLevel } from '../core/progression.js';
import { getMonster } from '../data/monsters.js';
import { createSprite } from './sprite.js';
import { MUENZE } from '../data/items.js';

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

/**
 * Spielerleiste oben: Avatar, Stufe, Fortschrittsbalken und Münzen.
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
    <div class="hud__coins">
      <span class="hud__coin-icon">${MUENZE}</span>
      <span>${gameState.coins}</span>
    </div>
  `;
  hud.querySelector('.hud__avatar').appendChild(createSprite(starter));
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
