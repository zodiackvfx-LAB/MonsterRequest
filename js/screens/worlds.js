/**
 * Weltauswahl: zeigt alle Welten aus js/data/worlds.js als Karten.
 *
 * Eine neue Welt taucht hier automatisch auf - es muss nur ein Eintrag in
 * worlds.js ergänzt werden.
 */

import { showScreen } from '../core/screens.js';
import { WORLDS, fightsInWorld } from '../data/worlds.js';
import { applyWorldColors, createScenery } from '../ui/scenery.js';
import { createHud, createTopbar } from '../ui/hud.js';
import { clearedInWorld, getTotalStars, isWorldCleared, isWorldUnlocked } from '../core/state.js';

export const worldsScreen = {
  mount(root) {
    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Welten', () => showScreen('start')));
    screen.appendChild(createHud());

    const content = document.createElement('div');
    content.className = 'page__content';

    WORLDS.forEach((world) => {
      const unlocked = isWorldUnlocked(world.id);
      const geschafft = clearedInWorld(world.id);
      const gesamt = fightsInWorld(world);
      const fertig = isWorldCleared(world.id);

      const card = document.createElement('button');
      card.type = 'button';
      card.className = `world-card region--${world.scenery}${unlocked ? '' : ' is-locked'}`;
      // Damit die kleine Vorschau die Farben ihrer Welt zeigt und nicht
      // ueberall dieselbe gruene Wiese.
      applyWorldColors(card, world);
      card.disabled = !unlocked;
      card.innerHTML = `
        <span class="world-card__art">
          <span class="world-card__sky"></span>
          <span class="world-card__hill"></span>
          <span class="world-card__icon">${unlocked ? world.icon : '🔒'}</span>
        </span>
        <span class="world-card__body">
          <span class="world-card__name">Welt ${world.id} · ${world.name}</span>
          <span class="world-card__text">${unlocked ? world.text : 'Besiege den Boss der Welt davor.'}</span>
          <span class="world-card__meta">
            <span class="world-card__chip">${geschafft} / ${gesamt} Kämpfe</span>
            <span class="world-card__chip">⭐ ${getTotalStars(world.id)} / ${gesamt * 3}</span>
            ${fertig ? '<span class="world-card__chip world-card__chip--done">✓ Geschafft</span>' : ''}
          </span>
        </span>
      `;

      if (unlocked) {
        card.addEventListener('click', () => showScreen('map', { worldId: world.id }));
      }

      content.appendChild(card);
    });

    screen.appendChild(content);
    root.appendChild(screen);
  },
};
