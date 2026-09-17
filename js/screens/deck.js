/**
 * Deck-Bildschirm: die genau 8 Attacken ansehen, tauschen und aufwerten.
 *
 * Die Regel bleibt: genau 8 Karten im Deck, im Kampf 4 auf der Hand.
 * Neu ist, dass jede Attacke ein eigenes Level hat (siehe progression.js):
 * Schaden, Heilung und Schild steigen, die XP-Kosten bleiben gleich.
 */

import { showScreen } from '../core/screens.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { getAttack } from '../data/attacks.js';
import { BEUTE_ATTACKEN, SELTENHEITEN } from '../data/items.js';
import { createScenery } from '../ui/scenery.js';
import { createHud, createTopbar } from '../ui/hud.js';
import { HAND_SIZE } from '../core/deck.js';
import { besitztAttacke, gameState, getDeck, setDeck } from '../core/state.js';
import {
  MAX_ATTACKEN_LEVEL,
  attackeAufwerten,
  attackeMitLevel,
  attackenKosten,
  getAttackenLevel,
} from '../core/progression.js';

export const deckScreen = {
  mount(root) {
    const monster = getMonster(STARTER_MONSTER_ID);

    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Dein Deck', () => showScreen('start')));
    screen.appendChild(createHud());

    const content = document.createElement('div');
    content.className = 'page__content';
    screen.appendChild(content);
    root.appendChild(screen);

    zeichnen();

    /** Baut die Liste neu auf - nach jedem Tausch und jeder Aufwertung. */
    function zeichnen() {
      const deck = getDeck(monster);
      content.innerHTML = '';

      const intro = document.createElement('div');
      intro.className = 'panel panel--tight';
      intro.innerHTML = `
        <p class="map__info-text">
          Genau ${deck.length} Attacken, im Kampf ${HAND_SIZE} auf der Hand.
          <strong>Antippen</strong> zum Tauschen, <strong>Aufwerten</strong> macht
          eine Attacke stärker - die XP-Kosten bleiben gleich.
          <br>🪙 ${gameState.coins} · 💠 ${gameState.materials}
        </p>
      `;
      content.appendChild(intro);

      const liste = document.createElement('div');
      liste.className = 'deck-list';

      deck.forEach((attackId, platz) => {
        liste.appendChild(deckZeile(attackId, platz, deck));
      });

      content.appendChild(liste);

      const ersatz = verfuegbareAttacken().filter((a) => !deck.includes(a.id));
      const info = document.createElement('div');
      info.className = 'panel panel--tight';
      info.innerHTML = `
        <p class="map__info-text">
          Auf der Ersatzbank: <strong>${ersatz.length}</strong> Attacke${ersatz.length === 1 ? '' : 'n'}.
          Neue Attacken findest du in Truhen im Shop.
        </p>
      `;
      content.appendChild(info);
    }

    /** Eine Zeile: links die Attacke (antippen zum Tauschen), rechts Aufwerten. */
    function deckZeile(attackId, platz, deck) {
      const attacke = attackeMitLevel(getAttack(attackId));
      const level = getAttackenLevel(attackId);
      const voll = level >= MAX_ATTACKEN_LEVEL;
      const kosten = attackenKosten(level);
      const bezahlbar =
        !voll && gameState.coins >= kosten.muenzen && gameState.materials >= kosten.material;

      const zeile = document.createElement('div');
      zeile.className = 'deck-item';

      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'deck-item__tap';
      info.innerHTML = inhaltFuer(attacke, level);
      info.addEventListener('click', () => tauschDialog(platz, deck));
      zeile.appendChild(info);

      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = `btn btn--small${bezahlbar ? '' : ' btn--ghost'}`;
      knopf.disabled = voll || !bezahlbar;
      knopf.innerHTML = voll
        ? 'Max.'
        : `🪙 ${kosten.muenzen}<br><span class="upgrade-row__mat">💠 ${kosten.material}</span>`;
      knopf.addEventListener('click', () => {
        if (attackeAufwerten(attackId)) zeichnen();
      });
      zeile.appendChild(knopf);

      return zeile;
    }

    /** Alle Attacken, die der Spieler einsetzen darf. */
    function verfuegbareAttacken() {
      const grund = monster.deck.map(getAttack);
      const ausTruhen = BEUTE_ATTACKEN.filter((a) => besitztAttacke(a.id)).map((a) =>
        getAttack(a.id)
      );
      return [...grund, ...ausTruhen];
    }

    /** Auswahl, womit ein Deckplatz belegt werden soll. */
    function tauschDialog(platz, deck) {
      const auswahl = verfuegbareAttacken();

      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="overlay__box overlay__box--wide">
          <h3 class="overlay__title">Platz ${platz + 1} belegen</h3>
          <p class="overlay__text">Wähle die Attacke für diesen Deckplatz.</p>
          <div class="swap-list" id="swap"></div>
          <div class="overlay__actions">
            <button class="btn btn--ghost" id="btn-cancel" type="button">Abbrechen</button>
          </div>
        </div>
      `;

      const liste = overlay.querySelector('#swap');
      auswahl.forEach((roh) => {
        const attacke = attackeMitLevel(roh);
        const imDeck = deck.includes(attacke.id);
        const aktuell = deck[platz] === attacke.id;

        const knopf = document.createElement('button');
        knopf.type = 'button';
        knopf.className = `deck-item deck-item--button${aktuell ? ' is-current' : ''}`;
        knopf.disabled = imDeck && !aktuell;
        knopf.innerHTML = inhaltFuer(
          attacke,
          getAttackenLevel(attacke.id),
          imDeck && !aktuell ? 'bereits im Deck' : null
        );
        knopf.addEventListener('click', () => {
          const neu = [...deck];
          neu[platz] = attacke.id;
          setDeck(monster.id, neu);
          overlay.remove();
          zeichnen();
        });
        liste.appendChild(knopf);
      });

      overlay.querySelector('#btn-cancel').addEventListener('click', () => overlay.remove());
      screen.appendChild(overlay);
    }
  },
};

/** Symbol, Name mit Level, Wirkung und Kosten. */
function inhaltFuer(attacke, level, hinweis = null) {
  let wirkung = `${attacke.damage} Schaden`;
  if (attacke.heal > 0) wirkung = `heilt ${attacke.heal} LP`;
  if (attacke.shield > 0) wirkung = `fängt ${attacke.shield} Schaden ab`;

  const beute = BEUTE_ATTACKEN.find((a) => a.id === attacke.id);
  const seltenheit = beute ? SELTENHEITEN[beute.seltenheit] : null;

  return `
    <span class="deck-item__icon">${attacke.icon}</span>
    <span class="deck-item__body">
      <span class="deck-item__name">
        ${attacke.name}
        <span class="deck-item__level">Lv. ${level}</span>
        ${seltenheit ? `<span class="deck-item__rarity" style="color:${seltenheit.farbe}">${seltenheit.name}</span>` : ''}
      </span>
      <span class="deck-item__text">${hinweis ?? wirkung}</span>
    </span>
    <span class="deck-item__cost">${attacke.cost}</span>
  `;
}
