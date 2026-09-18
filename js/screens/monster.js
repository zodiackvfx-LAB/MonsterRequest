/**
 * Monster-Bildschirm: Werte, Level, Aufwertungen und Skins.
 *
 * Wichtig für das Verständnis: Es gibt zwei getrennte Systeme.
 *   1. Das Charakter-LEVEL steigt durch Erfahrung aus Kämpfen.
 *   2. Die AUFWERTUNGEN kauft man einzeln mit Münzen und Material.
 * Beide zusammen ergeben die Kampfwerte (siehe js/core/progression.js).
 */

import { showScreen } from '../core/screens.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { getAttack } from '../data/attacks.js';
import { MUENZE, SELTENHEITEN, SKINS } from '../data/items.js';
import { createScenery } from '../ui/scenery.js';
import { createHud, createTopbar } from '../ui/hud.js';
import { createSprite, spritesNeuZeichnen } from '../ui/sprite.js';
import { spieleKlang } from '../core/audio.js';
import {
  besitztSkin,
  gameState,
  getAktiverSkin,
  getDeck,
  setAktiverSkin,
} from '../core/state.js';
import {
  MAX_STUFE,
  WERTE,
  aufwertungsKosten,
  charakterWerte,
  getCharakter,
  wertAufwerten,
  xpFuerNaechstesLevel,
} from '../core/progression.js';

export const monsterScreen = {
  mount(root) {
    const monster = getMonster(STARTER_MONSTER_ID);

    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Dein Monster', () => showScreen('start')));
    screen.appendChild(createHud());

    const content = document.createElement('div');
    content.className = 'page__content';
    screen.appendChild(content);
    root.appendChild(screen);

    zeichnen();

    /** Baut den Inhalt neu auf - nach jeder Aufwertung. */
    function zeichnen() {
      const charakter = getCharakter(monster.id);
      const werte = charakterWerte(monster);
      const deck = getDeck(monster).map(getAttack);
      const staerkste = deck.reduce((best, a) => (a.damage > best.damage ? a : best));
      const xpNoetig = xpFuerNaechstesLevel(charakter.level);
      const xpAnteil = xpNoetig === Infinity ? 1 : charakter.xp / xpNoetig;

      content.innerHTML = '';

      /* ---------- Steckbrief ---------- */
      const kopf = document.createElement('div');
      kopf.className = 'panel monster-head';
      kopf.innerHTML = `
        <div class="sprite sprite--large idle-bob" id="monster-sprite"></div>
        <div class="monster-head__name">${monster.name}</div>
        <div class="start__hero-name">${monster.element} · Level ${werte.level}</div>
        <p class="map__info-text">${monster.text}</p>
        <div class="xp-row" style="width:100%">
          <div class="xp-row__head">
            <span class="xp-row__title">ERFAHRUNG</span>
            <span class="xp-row__value">${
              xpNoetig === Infinity ? 'Höchstlevel' : `${charakter.xp} / ${xpNoetig}`
            }</span>
          </div>
          <div class="bar"><div class="bar__fill" style="--fuellung:${Math.min(1, xpAnteil)}"></div></div>
        </div>
      `;
      kopf.querySelector('#monster-sprite').appendChild(createSprite(monster));
      content.appendChild(kopf);

      /* ---------- Kampfwerte ---------- */
      const werteBlock = document.createElement('div');
      werteBlock.className = 'panel';
      werteBlock.innerHTML = `
        <div class="panel__title">Kampfwerte</div>
        ${zeile('❤️ Lebenspunkte', werte.maxHp)}
        ${zeile('⚔️ Angriff', `${Math.round(werte.damageFactor * 100)} %`)}
        ${zeile('🛡️ Verteidigung', `${Math.round(werte.defense * 100)} % weniger Schaden`)}
        ${zeile('⚡ Tempo', `${werte.xpPerSecond.toFixed(2)} XP pro Sekunde`)}
        ${zeile('🃏 Stärkste Attacke', `${staerkste.icon} ${staerkste.name}`)}
      `;
      content.appendChild(werteBlock);

      /* ---------- Aufwertungen ---------- */
      const upgrade = document.createElement('div');
      upgrade.className = 'panel';
      upgrade.innerHTML = `
        <div class="panel__title">
          Aufwertungen
          <span class="panel__count">${MUENZE} ${gameState.coins} · 💠 ${gameState.materials}</span>
        </div>
      `;

      Object.entries(WERTE).forEach(([schluessel, wert]) => {
        const stufe = charakter.upgrades[schluessel] ?? 0;
        const voll = stufe >= MAX_STUFE;
        const kosten = aufwertungsKosten(stufe);
        const bezahlbar =
          !voll && gameState.coins >= kosten.muenzen && gameState.materials >= kosten.material;

        const reihe = document.createElement('div');
        reihe.className = 'upgrade-row';
        reihe.innerHTML = `
          <span class="upgrade-row__label">
            <span class="upgrade-row__name">${wert.icon} ${wert.name}</span>
            <span class="upgrade-row__hint">
              Stufe ${stufe} / ${MAX_STUFE}
              ${voll ? '' : `· nächste: +${wert.proStufe} ${wert.einheit}`}
            </span>
          </span>
        `;

        const knopf = document.createElement('button');
        knopf.type = 'button';
        knopf.className = `btn btn--small${bezahlbar ? '' : ' btn--ghost'}`;
        knopf.disabled = voll || !bezahlbar;
        knopf.innerHTML = voll
          ? 'Maximum'
          : `${MUENZE} ${kosten.muenzen}<br><span class="upgrade-row__mat">💠 ${kosten.material}</span>`;
        knopf.addEventListener('click', () => {
          if (wertAufwerten(monster.id, schluessel)) {
            spieleKlang('kauf');
            zeichnen();
          } else {
            spieleKlang('gesperrt');
          }
        });

        reihe.appendChild(knopf);
        upgrade.appendChild(reihe);
      });

      content.appendChild(upgrade);

      /* ---------- Skins ---------- */
      const skinBlock = document.createElement('div');
      skinBlock.className = 'panel';
      skinBlock.innerHTML = '<div class="panel__title">Skins</div>';

      const skinListe = document.createElement('div');
      skinListe.className = 'skin-list';

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
        // Die Vorschau zeigt genau diesen Skin, nicht den getragenen.
        knopf.querySelector('.skin-chip__vorschau').appendChild(createSprite(monster, { skin }));
        knopf.addEventListener('click', () => {
          setAktiverSkin(monster.id, skin.id);
          spritesNeuZeichnen();
          zeichnen();
        });

        skinListe.appendChild(knopf);
      });

      skinBlock.appendChild(skinListe);
      content.appendChild(skinBlock);

      const deckKnopf = document.createElement('button');
      deckKnopf.className = 'btn btn--ghost';
      deckKnopf.type = 'button';
      deckKnopf.textContent = 'Deck und Attacken';
      deckKnopf.addEventListener('click', () => showScreen('deck'));
      content.appendChild(deckKnopf);

    }
  },
};

function zeile(name, wert) {
  return `
    <div class="stat-row">
      <span class="stat-row__label">${name}</span>
      <span class="stat-row__value">${wert}</span>
    </div>
  `;
}
