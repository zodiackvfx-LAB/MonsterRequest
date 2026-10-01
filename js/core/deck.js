/**
 * Deck- und Handkarten-Logik.
 *
 * Die Regeln des Spiels:
 *   - Ein Charakter besitzt genau 8 Attacken (sein Deck).
 *   - Im Kampf liegen immer 4 Attacken auf der Hand.
 *   - Eine benutzte Attacke verschwindet von der Hand.
 *   - Danach wird sofort eine neue Karte nachgezogen, sodass wieder 4 liegen.
 *   - Ist der Nachziehstapel leer, wird der Ablagestapel neu gemischt.
 *
 * Diese Datei kennt weder DOM noch Kampfregeln - nur Karten.
 */

export const HAND_SIZE = 4;
export const DECK_SIZE = 8;

/** Mischt eine Kopie des Arrays (Fisher-Yates). */
function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Erzeugt ein Deck aus einer Liste von Attacken-ids.
 * @param {string[]} cardIds - die 8 Attacken des Charakters
 */
export function createDeck(cardIds, handSize = HAND_SIZE) {
  if (cardIds.length !== DECK_SIZE) {
    console.warn(
      `Deck hat ${cardIds.length} Karten statt ${DECK_SIZE}. Das Spiel läuft trotzdem, ` +
        'aber die Regel "genau 8 Attacken" ist verletzt.'
    );
  }

  let drawPile = shuffle(cardIds);
  let discardPile = [];
  const hand = [];

  /** Zieht eine einzelne Karte. Mischt bei Bedarf den Ablagestapel neu. */
  function drawOne() {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) return false; // gar keine Karten mehr übrig
      drawPile = shuffle(discardPile);
      discardPile = [];
    }
    hand.push(drawPile.pop());
    return true;
  }

  /** Füllt die Hand wieder auf 4 Karten auf. */
  function refill() {
    while (hand.length < handSize) {
      if (!drawOne()) break;
    }
  }

  /**
   * Spielt die Karte an dieser Handposition aus:
   * Karte weg von der Hand -> auf den Ablagestapel -> sofort nachziehen.
   * @returns {string|null} die id der gespielten Karte
   */
  function play(handIndex) {
    if (handIndex < 0 || handIndex >= hand.length) return null;

    const [cardId] = hand.splice(handIndex, 1);
    discardPile.push(cardId);
    refill();
    return cardId;
  }

  refill(); // Starthand austeilen

  return {
    hand,
    play,
    refill,
    get drawCount() {
      return drawPile.length;
    },
    get discardCount() {
      return discardPile.length;
    },
  };
}
