/**
 * Kleine Bausteine, die mehrere Bildschirme gemeinsam nutzen.
 */

import { gameState, getPlayerLevel } from '../core/state.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { LEVELS } from '../data/levels.js';

/**
 * Spielerleiste oben: Avatar, Stufe, Fortschrittsbalken und Münzen.
 */
export function createHud() {
  const level = getPlayerLevel();
  const starter = getMonster(STARTER_MONSTER_ID);

  // Der Balken zeigt, wie weit das ganze Spiel geschafft ist.
  const progress = Math.min(1, gameState.clearedLevels.length / LEVELS.length);

  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <div class="hud__player">
      <span class="hud__avatar">${starter.icon}</span>
      <span class="hud__level">
        <span class="hud__level-text">Lv. ${level}</span>
        <span class="hud__level-bar">
          <span class="hud__level-fill" style="width: ${progress * 100}%"></span>
        </span>
      </span>
    </div>
    <div class="hud__coins">
      <span class="hud__coin-icon">🪙</span>
      <span>${gameState.coins}</span>
    </div>
  `;
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
