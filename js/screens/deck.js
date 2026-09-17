/**
 * Deck-Bildschirm: zeigt die genau 8 Attacken des Begleiters.
 *
 * Später kann man hier Karten tauschen - die Regel "genau 8 Karten" bleibt.
 */

import { showScreen } from '../core/screens.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { getAttack } from '../data/attacks.js';
import { createScenery } from '../ui/scenery.js';
import { createTopbar } from '../ui/hud.js';
import { HAND_SIZE } from '../core/deck.js';

export const deckScreen = {
  mount(root) {
    const monster = getMonster(STARTER_MONSTER_ID);
    const attacks = monster.deck.map(getAttack);

    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Dein Deck', () => showScreen('start')));

    const content = document.createElement('div');
    content.className = 'page__content';

    const intro = document.createElement('div');
    intro.className = 'panel panel--tight';
    intro.innerHTML = `
      <p class="map__info-text">
        ${monster.icon} ${monster.name} kämpft mit genau ${attacks.length} Attacken.
        Im Kampf liegen immer ${HAND_SIZE} davon auf der Hand - benutzt du eine,
        wird sofort nachgezogen.
      </p>
    `;
    content.appendChild(intro);

    const list = document.createElement('div');
    list.className = 'deck-list';

    // Nach Kosten sortiert, damit die Reihenfolge verständlich ist.
    [...attacks]
      .sort((a, b) => a.cost - b.cost)
      .forEach((attack) => {
        let effect = `${attack.damage} Schaden`;
        if (attack.heal > 0) effect = `heilt ${attack.heal} LP`;
        if (attack.shield > 0) effect = `fängt ${attack.shield} Schaden ab`;

        const item = document.createElement('div');
        item.className = 'deck-item';
        item.innerHTML = `
          <span class="deck-item__icon">${attack.icon}</span>
          <span class="deck-item__body">
            <span class="deck-item__name">${attack.name}</span>
            <span class="deck-item__text">${effect} · ${attack.text}</span>
          </span>
          <span class="deck-item__cost">${attack.cost}</span>
        `;
        list.appendChild(item);
      });

    content.appendChild(list);
    screen.appendChild(content);
    root.appendChild(screen);
  },
};
