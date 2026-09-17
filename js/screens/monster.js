/**
 * Monster-Bildschirm: zeigt den aktuellen Begleiter mit seinen Werten.
 *
 * Später kommen hier mehrere eigene Monster und das Wechseln dazwischen hin.
 */

import { showScreen } from '../core/screens.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { getAttack } from '../data/attacks.js';
import { createScenery } from '../ui/scenery.js';
import { createTopbar } from '../ui/hud.js';
import { getPlayerLevel } from '../core/state.js';

export const monsterScreen = {
  mount(root) {
    const monster = getMonster(STARTER_MONSTER_ID);

    // Durchschnittlicher Schaden des Decks - als grober Stärkewert.
    const deck = monster.deck.map(getAttack);
    const strongest = deck.reduce((best, attack) => (attack.damage > best.damage ? attack : best));

    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Dein Monster', () => showScreen('start')));

    const content = document.createElement('div');
    content.className = 'page__content';
    content.innerHTML = `
      <div class="panel" style="display: grid; justify-items: center; gap: 6px; text-align: center;">
        <div class="sprite sprite--large idle-bob">${monster.icon}</div>
        <div class="panel__title" style="font-size: 1.2rem; margin: 0;">${monster.name}</div>
        <div class="start__hero-name">${monster.element}</div>
        <p class="map__info-text">${monster.text}</p>
      </div>

      <div class="panel">
        <div class="panel__title">Werte</div>
        <div class="stat-row">
          <span class="stat-row__label">Lebenspunkte</span>
          <span class="stat-row__value">${monster.maxHp}</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">Stufe</span>
          <span class="stat-row__value">${getPlayerLevel()}</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">Attacken im Deck</span>
          <span class="stat-row__value">${monster.deck.length} / 8</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">Stärkste Attacke</span>
          <span class="stat-row__value">${strongest.icon} ${strongest.name}</span>
        </div>
      </div>

      <button class="btn btn--ghost" id="btn-deck" type="button">Deck ansehen</button>
    `;

    content.querySelector('#btn-deck').addEventListener('click', () => showScreen('deck'));

    screen.appendChild(content);
    root.appendChild(screen);
  },
};
