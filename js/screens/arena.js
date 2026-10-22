/**
 * Endlos-Arena (Boss-Rush).
 *
 * Eine Startseite für den Arena-Modus: Regeln, Bestwert und ein großer
 * Start-Knopf. Der eigentliche Kampf läuft über den normalen
 * Kampfbildschirm (js/screens/battle.js) im Arena-Modus - siehe
 * js/data/arena.js.
 */

import { showScreen } from '../core/screens.js';
import { gameState } from '../core/state.js';
import { createScenery } from '../ui/scenery.js';
import { createTopbar } from '../ui/hud.js';

export const arenaScreen = {
  musik: () => 'menue',

  mount(root) {
    const best = gameState.statistik?.arenaBest ?? 0;

    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Arena', () => showScreen('start')));

    const content = document.createElement('div');
    content.className = 'page__content';
    content.innerHTML = `
      <div class="panel arena-intro">
        <div class="arena-intro__icon">🏟️</div>
        <div class="panel__title">Endlos-Arena</div>
        <p class="map__info-text">
          Kämpfe dich durch immer stärkere Gegner - Runde für Runde, ohne Ende.
          Zwischen den Runden heilst du nur ein Stück. Jede fünfte Runde ist ein
          Bosskampf. Wie weit kommst du?
        </p>
      </div>

      <div class="panel">
        <div class="stat-row">
          <span class="stat-row__label">🏆 Bester Lauf</span>
          <span class="stat-row__value">${best} ${best === 1 ? 'Runde' : 'Runden'}</span>
        </div>
      </div>
    `;
    screen.appendChild(content);

    const start = document.createElement('button');
    start.className = 'btn btn--big btn--green';
    start.type = 'button';
    start.textContent = '▶  Arena starten';
    start.addEventListener('click', () => showScreen('battle', { arena: { runde: 1, hp: null } }));
    content.appendChild(start);

    root.appendChild(screen);
  },
};
