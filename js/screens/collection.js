/**
 * Sammlung: alle Kreaturen des Spiels, nach Welten sortiert.
 *
 * Ein Gegner gilt als entdeckt, sobald sein Kampf gewonnen wurde. Noch nicht
 * entdeckte Gegner bleiben verdeckt - man sieht nur, dass es sie gibt.
 */

import { showScreen } from '../core/screens.js';
import { MONSTERS } from '../data/monsters.js';
import { WORLDS } from '../data/worlds.js';
import { LEVELS } from '../data/levels.js';
import { getEnemy } from '../data/enemies.js';
import { createScenery } from '../ui/scenery.js';
import { createTopbar } from '../ui/hud.js';
import { isLevelCleared, isWorldUnlocked } from '../core/state.js';

export const collectionScreen = {
  mount(root) {
    // Entdeckt ist, wessen Kampf gewonnen wurde.
    const discovered = new Set();
    LEVELS.forEach((level) => {
      if (isLevelCleared(level.id)) discovered.add(level.enemyId);
    });

    const eigene = Object.values(MONSTERS);
    const gesamt = LEVELS.length + eigene.length;

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
        Entdeckt: <strong>${discovered.size + eigene.length} von ${gesamt}</strong> Kreaturen.
        Gewinne einen Kampf, um den Gegner freizuschalten.
      </p>
    `;
    content.appendChild(intro);

    // Eigene Monster zuerst
    content.appendChild(gruppe('Deine Monster', eigene.map((monster) => ({ monster, known: true }))));

    // Danach eine Gruppe je Welt
    WORLDS.forEach((world) => {
      const sichtbar = isWorldUnlocked(world.id);
      const eintraege = LEVELS.filter((level) => level.worldId === world.id).map((level) => ({
        monster: getEnemy(level.enemyId),
        known: sichtbar && discovered.has(level.enemyId),
      }));
      content.appendChild(gruppe(`${world.icon} ${world.name}`, eintraege));
    });

    screen.appendChild(content);
    root.appendChild(screen);
  },
};

/** Eine Überschrift mit einem Raster aus Kreaturen. */
function gruppe(titel, eintraege) {
  const block = document.createElement('div');
  block.className = 'panel';

  const gefunden = eintraege.filter((eintrag) => eintrag.known).length;
  block.innerHTML = `<div class="panel__title">${titel} <span class="panel__count">${gefunden}/${eintraege.length}</span></div>`;

  const grid = document.createElement('div');
  grid.className = 'collection';

  eintraege.forEach(({ monster, known }) => {
    const item = document.createElement('div');
    item.className = `collection-item${known ? '' : ' is-locked'}${monster.isBoss ? ' is-boss' : ''}`;
    item.innerHTML = `
      <span class="collection-item__sprite">${known ? monster.icon : '❓'}</span>
      <span class="collection-item__name">${known ? monster.name : '???'}</span>
      <span class="collection-item__note">${known ? `${monster.maxHp} LP` : 'Unentdeckt'}</span>
    `;
    grid.appendChild(item);
  });

  block.appendChild(grid);
  return block;
}
