/**
 * Ein Kämpfer im Kampf - Spieler UND Gegner benutzen diese Datei.
 *
 * Das ist der Kern des Kampfsystems: Beide Seiten spielen nach exakt
 * denselben Regeln. Der einzige Unterschied ist, WER entscheidet:
 *   - Beim Spieler entscheidest du per Tipp auf eine Karte.
 *   - Beim Gegner entscheidet die KI in js/core/battle.js.
 *
 * Regeln (für beide gleich):
 *   - Deck aus genau 8 Attacken, davon immer 4 auf der Hand
 *   - maximal 10 XP, niemals mehr und niemals weniger als 0
 *   - 1 XP pro Sekunde, automatisch
 *   - jede Attacke kostet XP und kann nur bezahlt gespielt werden
 */

import { getAttack } from '../data/attacks.js';
import { createDeck } from './deck.js';

/** Maximale XP eines Kämpfers. */
export const MAX_XP = 10;
/** XP, die pro Sekunde automatisch dazukommen. */
export const XP_PER_SECOND = 1;
/** XP zu Kampfbeginn (0 = zäher Start, höher = schnellerer Einstieg). */
export const START_XP = 3;

/**
 * Erzeugt einen Kämpfer aus einem Monster (js/data/monsters.js).
 */
export function createFighter(monster) {
  const deck = createDeck(monster.deck);

  /** Der sichtbare Zustand - den liest der Kampfbildschirm aus. */
  const state = {
    name: monster.name,
    icon: monster.icon,
    hp: monster.maxHp,
    maxHp: monster.maxHp,
    shield: 0, // fängt Schaden ab, bevor Lebenspunkte verloren gehen
    xp: START_XP, // ganze XP, die ausgegeben werden können
    xpProgress: 0, // 0..1 Fortschritt zum nächsten XP-Punkt (nur für die Anzeige)
    hand: deck.hand, // Array mit 4 Attacken-ids
    handVersion: 0, // zählt hoch, sobald sich die Hand ändert
  };

  let exactXp = START_XP; // XP mit Nachkommastellen (wächst kontinuierlich)

  /** Überträgt die internen Nachkommastellen in die Anzeige-Werte. */
  function syncXp() {
    exactXp = Math.max(0, Math.min(MAX_XP, exactXp));
    state.xp = Math.floor(exactXp);
    state.xpProgress = state.xp >= MAX_XP ? 1 : exactXp - state.xp;
  }

  /** XP-Regeneration für die vergangene Zeit. */
  function gainXp(seconds) {
    exactXp += seconds * XP_PER_SECOND;
    syncXp();
  }

  /** Reicht die XP für diese Kosten? */
  function canAfford(cost) {
    return cost <= state.xp;
  }

  /** Die 4 Handkarten als vollständige Attacken-Objekte. */
  function handAttacks() {
    return state.hand.map(getAttack);
  }

  /**
   * Benutzt die Karte an dieser Handposition: XP bezahlen, Karte ablegen,
   * sofort nachziehen. Gibt die Attacke zurück - oder null, wenn sie nicht
   * bezahlbar ist.
   */
  function useCard(handIndex) {
    const cardId = state.hand[handIndex];
    if (!cardId) return null;

    const attack = getAttack(cardId);
    if (!canAfford(attack.cost)) return null;

    exactXp -= attack.cost;
    syncXp();

    deck.play(handIndex);
    state.handVersion++;
    return attack;
  }

  /**
   * Schaden einstecken. Ein Schild wird zuerst aufgebraucht.
   * @returns {{hp: number, shield: number}} wie viel wovon abgezogen wurde
   */
  function takeDamage(amount) {
    const absorbed = Math.min(state.shield, amount);
    state.shield -= absorbed;

    const rest = amount - absorbed;
    state.hp = Math.max(0, state.hp - rest);

    return { hp: rest, shield: absorbed };
  }

  /** Schild aufbauen (ersetzt ein schwächeres Schild, statt sich zu stapeln). */
  function addShield(amount) {
    state.shield = Math.max(state.shield, amount);
  }

  function heal(amount) {
    state.hp = Math.min(state.maxHp, state.hp + amount);
  }

  /** Wie viele LP fehlen bis zum Maximum? (Die KI nutzt das für Heilkarten.) */
  function missingHp() {
    return state.maxHp - state.hp;
  }

  return {
    state,
    gainXp,
    canAfford,
    handAttacks,
    useCard,
    takeDamage,
    addShield,
    heal,
    missingHp,
  };
}
