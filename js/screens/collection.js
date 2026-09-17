/**
 * Sammlung: alle Kreaturen der Welt. Noch nicht besiegte Gegner bleiben
 * verdeckt - besiegte Gegner werden freigeschaltet.
 */

import { showScreen } from '../core/screens.js';
import { MONSTERS, STARTER_MONSTER_ID } from '../data/monsters.js';
import { LEVELS } from '../data/levels.js';
import { createScenery } from '../ui/scenery.js';
import { createTopbar } from '../ui/hud.js';
import { isLevelCleared } from '../core/state.js';

export const collectionScreen = {
  mount(root) {
    // Ein Gegner gilt als entdeckt, sobald sein Level geschafft wurde.
    const discovered = new Set([STARTER_MONSTER_ID]);
    LEVELS.forEach((level) => {
      if (isLevelCleared(level.id)) discovered.add(level.enemyId);
    });

    const all = Object.values(MONSTERS);

    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Sammlung', () => showScreen('start')));

    const content = document.createElement('div');
    content.className = 'page__content';

    const intro = document.createElement('div');
    intro.className = 'panel panel--tight';
    intro.innerHTML = `
      <p class="map__info-text">
        Entdeckt: <strong>${discovered.size} von ${all.length}</strong> Kreaturen.
        Besiege einen Gegner, um ihn hier freizuschalten.
      </p>
    `;
    content.appendChild(intro);

    const grid = document.createElement('div');
    grid.className = 'collection';

    all.forEach((monster) => {
      const known = discovered.has(monster.id);
      const item = document.createElement('div');
      item.className = `collection-item${known ? '' : ' is-locked'}`;
      item.innerHTML = `
        <span class="collection-item__sprite">${known ? monster.icon : '❓'}</span>
        <span class="collection-item__name">${known ? monster.name : '???'}</span>
        <span class="collection-item__note">${known ? `${monster.element} · ${monster.maxHp} LP` : 'Noch nicht entdeckt'}</span>
      `;
      grid.appendChild(item);
    });

    content.appendChild(grid);
    screen.appendChild(content);
    root.appendChild(screen);
  },
};
