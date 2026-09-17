/**
 * Deck-Bildschirm: die genau 8 Attacken des Begleiters ansehen und tauschen.
 *
 * Die Regel bleibt: genau 8 Karten im Deck, im Kampf 4 auf der Hand.
 * Getauscht werden kann gegen Attacken, die man aus Truhen erhalten hat.
 */

import { showScreen } from '../core/screens.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { getAttack } from '../data/attacks.js';
import { BEUTE_ATTACKEN, SELTENHEITEN } from '../data/items.js';
import { createScenery } from '../ui/scenery.js';
import { createTopbar } from '../ui/hud.js';
import { HAND_SIZE } from '../core/deck.js';
import { besitztAttacke, getDeck, setDeck } from '../core/state.js';

export const deckScreen = {
  mount(root) {
    const monster = getMonster(STARTER_MONSTER_ID);

    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Dein Deck', () => showScreen('start')));

    const content = document.createElement('div');
    content.className = 'page__content';
    screen.appendChild(content);
    root.appendChild(screen);

    zeichnen();

    /** Baut die Liste neu auf - nach jedem Tausch. */
    function zeichnen() {
      const deck = getDeck(monster);
      content.innerHTML = '';

      const intro = document.createElement('div');
      intro.className = 'panel panel--tight';
      intro.innerHTML = `
        <p class="map__info-text">
          ${monster.name} kämpft mit genau ${deck.length} Attacken. Im Kampf liegen
          immer ${HAND_SIZE} davon auf der Hand - benutzt du eine, wird sofort
          nachgezogen. <strong>Tippe auf eine Karte, um sie zu tauschen.</strong>
        </p>
      `;
      content.appendChild(intro);

      const liste = document.createElement('div');
      liste.className = 'deck-list';

      deck.forEach((attackId, platz) => {
        const attacke = getAttack(attackId);
        const eintrag = document.createElement('button');
        eintrag.type = 'button';
        eintrag.className = 'deck-item deck-item--button';
        eintrag.innerHTML = zeileFuer(attacke);
        eintrag.addEventListener('click', () => tauschDialog(platz, deck));
        liste.appendChild(eintrag);
      });

      content.appendChild(liste);

      // Übersicht über das, was noch auf der Ersatzbank sitzt
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
      auswahl.forEach((attacke) => {
        const imDeck = deck.includes(attacke.id);
        const aktuell = deck[platz] === attacke.id;

        const knopf = document.createElement('button');
        knopf.type = 'button';
        knopf.className = `deck-item deck-item--button${aktuell ? ' is-current' : ''}`;
        // Eine Attacke darf nur einmal im Deck sein.
        knopf.disabled = imDeck && !aktuell;
        knopf.innerHTML = zeileFuer(attacke, imDeck && !aktuell ? 'bereits im Deck' : null);
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

/** Eine Zeile mit Symbol, Name, Wirkung und Kosten. */
function zeileFuer(attacke, hinweis = null) {
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
        ${seltenheit ? `<span class="deck-item__rarity" style="color:${seltenheit.farbe}">${seltenheit.name}</span>` : ''}
      </span>
      <span class="deck-item__text">${hinweis ?? `${wirkung} · ${attacke.text}`}</span>
    </span>
    <span class="deck-item__cost">${attacke.cost}</span>
  `;
}
