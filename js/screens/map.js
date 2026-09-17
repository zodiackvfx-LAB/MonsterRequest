/**
 * Weltkarte: zeigt alle Level aus js/data/levels.js als Wegpunkte.
 *
 * - Freigeschaltete Level sind anklickbar und starten den Kampf.
 * - Gesperrte Level zeigen ein Schloss.
 * - Geschaffte Level bekommen einen Haken.
 */

import { showScreen } from '../core/screens.js';
import { LEVELS } from '../data/levels.js';
import { getMonster } from '../data/monsters.js';
import { isLevelCleared, isLevelUnlocked } from '../core/state.js';

export const mapScreen = {
  mount(root) {
    const screen = document.createElement('div');
    screen.className = 'screen screen--map';

    const region = LEVELS[0]?.region ?? 'Unbekannte Region';

    screen.innerHTML = `
      <header class="topbar">
        <button class="button button--ghost button--small" id="btn-back">‹ Zurück</button>
        <h2 class="topbar__title">${region}</h2>
        <span class="topbar__spacer"></span>
      </header>

      <div class="map">
        <ul class="map__list" id="level-list"></ul>
      </div>
    `;

    const list = screen.querySelector('#level-list');

    LEVELS.forEach((level, index) => {
      const unlocked = isLevelUnlocked(level.id);
      const cleared = isLevelCleared(level.id);
      const enemy = getMonster(level.enemyId);

      const item = document.createElement('li');
      // Level abwechselnd links/rechts setzen - das ergibt den Schlangenpfad.
      item.className = `map__item ${index % 2 === 0 ? 'map__item--left' : 'map__item--right'}`;

      const status = cleared ? 'geschafft' : unlocked ? 'offen' : 'gesperrt';

      item.innerHTML = `
        <button
          class="level-node ${unlocked ? 'is-unlocked' : 'is-locked'} ${cleared ? 'is-cleared' : ''} ${level.isBoss ? 'is-boss' : ''}"
          ${unlocked ? '' : 'disabled'}
          aria-label="Level ${level.id}: ${level.name} (${status})"
        >
          <span class="level-node__badge">${cleared ? '✓' : unlocked ? level.id : '🔒'}</span>
          <span class="level-node__info">
            <span class="level-node__name">${level.isBoss ? '👑 ' : ''}${level.name}</span>
            <span class="level-node__enemy">${unlocked ? `${enemy.icon} ${enemy.name}` : 'Noch gesperrt'}</span>
          </span>
        </button>
      `;

      if (unlocked) {
        item.querySelector('button').addEventListener('click', () => {
          showScreen('battle', { levelId: level.id });
        });
      }

      list.appendChild(item);
    });

    screen.querySelector('#btn-back').addEventListener('click', () => {
      showScreen('start');
    });

    root.appendChild(screen);
  },
};
