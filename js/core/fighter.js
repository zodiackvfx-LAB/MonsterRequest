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
 *   - maximal 10 Energie, niemals mehr und niemals weniger als 0
 *   - 1 Energie pro Sekunde, automatisch
 *   - jede Attacke kostet Energie und kann nur bezahlt gespielt werden
 */

import { getAttack } from '../data/attacks.js';
import { createDeck } from './deck.js';
import { attackeMitLevel } from './progression.js';

/** Maximale Energie eines Kämpfers. */
export const MAX_ENERGIE = 10;
/** Energie, die pro Sekunde automatisch dazukommen. */
export const ENERGIE_PRO_SEKUNDE = 1;
/** Energie zu Kampfbeginn (0 = zäher Start, höher = schnellerer Einstieg). */
export const START_ENERGIE = 3;

/**
 * Erzeugt einen Kämpfer aus einem Monster (js/data/monsters.js).
 */
export function createFighter(monster) {
  const deck = createDeck(monster.deck);

  // Werte aus dem Fortschritt. Wer nichts mitbringt, kämpft mit den
  // Grundwerten - so bleiben Gegner unverändert.
  const energieProSekunde = monster.energieProSekunde ?? ENERGIE_PRO_SEKUNDE;

  /** Der sichtbare Zustand - den liest der Kampfbildschirm aus. */
  const state = {
    name: monster.name,
    icon: monster.icon,
    hp: monster.maxHp,
    maxHp: monster.maxHp,
    shield: 0, // fängt Schaden ab, bevor Lebenspunkte verloren gehen
    energie: START_ENERGIE, // ganze Energie, die ausgegeben werden kann
    energieFortschritt: 0, // 0..1 Fortschritt zum nächsten Energiepunkt (nur für die Anzeige)
    hand: deck.hand, // Array mit 4 Attacken-ids
    handVersion: 0, // zählt hoch, sobald sich die Hand ändert
    // Kampfwerte aus dem Charakterfortschritt (siehe js/core/progression.js)
    damageFactor: monster.damageFactor ?? 1,
    defense: monster.defense ?? 0,
    energieProSekunde: energieProSekunde,
  };

  let genaueEnergie = START_ENERGIE; // Energie mit Nachkommastellen (wächst kontinuierlich)

  /** Überträgt die internen Nachkommastellen in die Anzeige-Werte. */
  function syncXp() {
    genaueEnergie = Math.max(0, Math.min(MAX_ENERGIE, genaueEnergie));
    state.energie = Math.floor(genaueEnergie);
    state.energieFortschritt =
      state.energie >= MAX_ENERGIE ? 1 : genaueEnergie - state.energie;
  }

  /** Energie-Nachschub für die vergangene Zeit. */
  function energieAufladen(seconds) {
    genaueEnergie += seconds * energieProSekunde;
    syncXp();
  }

  /** Reicht die Energie für diese Kosten? */
  function canAfford(cost) {
    return cost <= state.energie;
  }

  /**
   * Die 4 Handkarten als vollständige Attacken-Objekte - mit ihrem
   * aktuellen Attacken-Level (siehe js/core/progression.js).
   */
  function handAttacks() {
    return state.hand.map((id) => attackeMitLevel(getAttack(id)));
  }

  /**
   * Benutzt die Karte an dieser Handposition: Energie bezahlen, Karte ablegen,
   * sofort nachziehen. Gibt die Attacke zurück - oder null, wenn sie nicht
   * bezahlbar ist.
   */
  function useCard(handIndex) {
    const cardId = state.hand[handIndex];
    if (!cardId) return null;

    const attack = attackeMitLevel(getAttack(cardId));
    if (!canAfford(attack.cost)) return null;

    genaueEnergie -= attack.cost;
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
    energieAufladen,
    canAfford,
    handAttacks,
    useCard,
    takeDamage,
    addShield,
    heal,
    missingHp,
  };
}
