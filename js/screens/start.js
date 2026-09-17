/**
 * Startbildschirm: Titel, Beispielmonster und der Button "Spiel starten".
 */

import { showScreen } from '../core/screens.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { gameState } from '../core/state.js';

export const startScreen = {
  mount(root) {
    const starter = getMonster(STARTER_MONSTER_ID);

    const screen = document.createElement('div');
    screen.className = 'screen screen--start';
    screen.innerHTML = `
      <div class="start__top">
        <p class="start__kicker">Ein Abenteuer mit eigenen Kreaturen</p>
        <h1 class="start__title">Monster<span>Quest</span></h1>
      </div>

      <div class="start__hero">
        <div class="monster-sprite monster-sprite--large idle-bob">${starter.icon}</div>
        <p class="start__hero-name">Dein Begleiter: <strong>${starter.name}</strong></p>
      </div>

      <div class="start__bottom">
        <button class="button button--primary" id="btn-start">Spiel starten</button>
        <p class="start__hint">
          ${gameState.clearedLevels.length > 0
            ? `Fortschritt gefunden: ${gameState.clearedLevels.length} Level geschafft.`
            : 'Tippe auf den Button, um die Weltkarte zu öffnen.'}
        </p>
      </div>
    `;

    screen.querySelector('#btn-start').addEventListener('click', () => {
      showScreen('map');
    });

    root.appendChild(screen);
  },
};
