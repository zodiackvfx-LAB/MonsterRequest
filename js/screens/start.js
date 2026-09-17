/**
 * Startbildschirm: Logo, Spielerleiste, großer Startknopf und das Hauptmenü.
 */

import { showScreen } from '../core/screens.js';
import { createScenery } from '../ui/scenery.js';
import { createHud } from '../ui/hud.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { gameState } from '../core/state.js';

/** Die vier Menüknöpfe. Neuer Menüpunkt = hier einen Eintrag ergänzen. */
const MENU = [
  { icon: '🗺️', label: 'Welten', screen: 'worlds' },
  { icon: '🐾', label: 'Monster', screen: 'monster' },
  { icon: '🃏', label: 'Deck', screen: 'deck' },
  { icon: '📖', label: 'Sammlung', screen: 'collection' },
  { icon: '⚙️', label: 'Einstellungen', screen: 'settings' },
];

export const startScreen = {
  mount(root) {
    const starter = getMonster(STARTER_MONSTER_ID);

    const screen = document.createElement('div');
    screen.className = 'screen screen--start';
    screen.appendChild(createScenery());
    screen.appendChild(createHud());

    const content = document.createElement('div');
    content.className = 'start__logo';
    // Das Logo ist ein SVG: nur dort liegt die dunkle Kontur sauber hinter
    // der Farbfüllung (siehe .logo__text in css/ui.css).
    content.innerHTML = `
      <svg class="logo" viewBox="0 0 300 108" role="img" aria-label="MonsterQuest">
        <defs>
          <linearGradient id="logo-monster" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.35" stop-color="#ffffff" />
            <stop offset="1" stop-color="#9ecdff" />
          </linearGradient>
          <linearGradient id="logo-quest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.3" stop-color="#ffe98a" />
            <stop offset="1" stop-color="#ff9e18" />
          </linearGradient>
        </defs>
        <text class="logo__text logo__text--monster" x="150" y="40" fill="url(#logo-monster)">MONSTER</text>
        <text class="logo__text logo__text--quest" x="150" y="94" fill="url(#logo-quest)">QUEST</text>
      </svg>
      <p class="logo__claim">Kleine Monster. Große Abenteuer.</p>
    `;
    screen.appendChild(content);

    const hero = document.createElement('div');
    hero.className = 'start__hero';
    hero.innerHTML = `
      <div class="sprite sprite--large idle-bob">${starter.icon}</div>
      <p class="start__hero-name">Dein Begleiter: ${starter.name}</p>
    `;
    screen.appendChild(hero);

    const actions = document.createElement('div');
    actions.className = 'start__actions';

    const startButton = document.createElement('button');
    startButton.className = 'btn btn--big';
    startButton.type = 'button';
    startButton.textContent = '▶  SPIEL STARTEN';
    // Direkt in die zuletzt freigeschaltete Welt - die Weltauswahl
    // erreicht man von der Karte aus.
    startButton.addEventListener('click', () =>
      showScreen('map', { worldId: gameState.unlockedWorld })
    );
    actions.appendChild(startButton);

    const menu = document.createElement('div');
    menu.className = 'start__menu';
    MENU.forEach((entry) => {
      const button = document.createElement('button');
      button.className = 'icon-btn';
      button.type = 'button';
      button.innerHTML = `
        <span class="icon-btn__circle">${entry.icon}</span>
        <span class="icon-btn__label">${entry.label}</span>
      `;
      button.addEventListener('click', () => showScreen(entry.screen));
      menu.appendChild(button);
    });
    actions.appendChild(menu);

    screen.appendChild(actions);
    root.appendChild(screen);
  },
};
