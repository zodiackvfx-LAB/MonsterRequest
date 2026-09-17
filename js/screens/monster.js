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
import { createSprite } from '../ui/sprite.js';
import { besitztSkin, getAktiverSkin, getPlayerLevel, setAktiverSkin } from '../core/state.js';
import { SELTENHEITEN, SKINS } from '../data/items.js';
import { spritesNeuZeichnen } from '../ui/sprite.js';

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
        <div class="sprite sprite--large idle-bob" id="monster-sprite"></div>
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

      <div class="panel">
        <div class="panel__title">Skins</div>
        <div class="skin-list" id="skins"></div>
      </div>

      <button class="btn btn--ghost" id="btn-deck" type="button">Deck ansehen</button>
    `;

    // Skins zur Auswahl: besessene sind anklickbar, fehlende ausgegraut.
    const skinListe = content.querySelector('#skins');
    SKINS.filter((skin) => skin.monsterId === monster.id).forEach((skin) => {
      const besitzt = besitztSkin(skin.id);
      const aktiv = (getAktiverSkin(monster.id) ?? 'skin-standard') === skin.id;
      const seltenheit = SELTENHEITEN[skin.seltenheit];

      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = `skin-chip${aktiv ? ' is-active' : ''}${besitzt ? '' : ' is-locked'}`;
      knopf.disabled = !besitzt;
      knopf.style.setProperty('--rarity', seltenheit.farbe);
      knopf.innerHTML = `
        <span class="skin-chip__vorschau"></span>
        <span class="skin-chip__name">${besitzt ? skin.name : '🔒 ' + skin.name}</span>
      `;
      // Kleine Vorschau in den Farben des Skins
      knopf.querySelector('.skin-chip__vorschau').appendChild(
        createSprite({ ...monster, id: `${monster.id}__${skin.id}`, look: { ...monster.look, ...skin.look } })
      );

      knopf.addEventListener('click', () => {
        setAktiverSkin(monster.id, skin.id);
        spritesNeuZeichnen();
        showScreen('monster');
      });

      skinListe.appendChild(knopf);
    });

    content.querySelector('#monster-sprite').appendChild(createSprite(monster));
    content.querySelector('#btn-deck').addEventListener('click', () => showScreen('deck'));

    screen.appendChild(content);
    root.appendChild(screen);
  },
};
