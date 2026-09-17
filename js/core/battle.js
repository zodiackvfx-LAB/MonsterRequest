/**
 * Die Kampf-Engine.
 *
 * Diese Datei enthält NUR Regeln - kein HTML, kein CSS, kein DOM.
 * Der Kampfbildschirm (js/screens/battle.js) zeigt an, was hier passiert.
 *
 * Regeln:
 *   - Der Charakter hat maximal 10 XP.
 *   - Er bekommt automatisch 1 XP pro Sekunde.
 *   - Attacken kosten XP. Der Spieler entscheidet selbst, wann er angreift.
 *   - Der Gegner greift automatisch in festen Abständen an.
 */

import { getAttack } from '../data/attacks.js';
import { createDeck } from './deck.js';

/** Maximale XP eines Charakters. */
export const MAX_XP = 10;
/** XP, die pro Sekunde automatisch dazukommen. */
export const XP_PER_SECOND = 1;
/** XP zu Kampfbeginn (zum Balancieren: 0 = zäher Start, höher = schnellerer Einstieg). */
export const START_XP = 3;

/**
 * Startet einen Kampf.
 *
 * @param {object} options
 * @param {object} options.playerMonster - Monster aus js/data/monsters.js (mit deck)
 * @param {object} options.enemyMonster  - Monster aus js/data/monsters.js (mit attacks)
 * @param {function} [options.onUpdate]  - wird bei jedem Frame mit dem state aufgerufen
 * @param {function} [options.onEvent]   - Kampfereignisse (für Log und Animationen)
 * @param {function} [options.onEnd]     - 'win' oder 'lose'
 */
export function createBattle({ playerMonster, enemyMonster, onUpdate, onEvent, onEnd }) {
  const deck = createDeck(playerMonster.deck);

  const state = {
    player: {
      name: playerMonster.name,
      icon: playerMonster.icon,
      hp: playerMonster.maxHp,
      maxHp: playerMonster.maxHp,
      xp: START_XP, // ganze XP, die ausgegeben werden können
      xpProgress: 0, // 0..1 Fortschritt zum nächsten XP-Punkt (nur für die Anzeige)
    },
    enemy: {
      name: enemyMonster.name,
      icon: enemyMonster.icon,
      hp: enemyMonster.maxHp,
      maxHp: enemyMonster.maxHp,
      attackProgress: 0, // 0..1 bis zum nächsten Gegnerangriff
    },
    hand: deck.hand, // Array mit 4 Attacken-ids
    handVersion: 0, // zählt hoch, sobald sich die Hand ändert
    running: false,
    finished: false,
    result: null, // 'win' | 'lose'
  };

  let exactXp = START_XP; // XP mit Nachkommastellen (wächst kontinuierlich)
  let enemyTimer = enemyMonster.attackDelay; // Sekunden bis zum nächsten Gegnerangriff
  let rafId = null;
  let lastTimestamp = 0;

  function emit(event) {
    if (onEvent) onEvent(event);
  }

  /** Teilt Schaden aus und prüft, ob der Kampf damit endet. */
  function dealDamage(target, amount) {
    target.hp = Math.max(0, target.hp - amount);
  }

  function heal(target, amount) {
    target.hp = Math.min(target.maxHp, target.hp + amount);
  }

  function finish(result) {
    if (state.finished) return;
    state.finished = true;
    state.result = result;
    stop();
    // Letzter Zeichendurchlauf, damit der entscheidende Treffer auch sichtbar wird
    // (die Schleife läuft ab hier nicht mehr).
    if (onUpdate) onUpdate(state);
    emit({ type: 'end', result });
    if (onEnd) onEnd(result);
  }

  function checkEnd() {
    if (state.enemy.hp <= 0) finish('win');
    else if (state.player.hp <= 0) finish('lose');
  }

  /** Kann der Spieler sich diese Attacke gerade leisten? */
  function canPlay(handIndex) {
    const cardId = state.hand[handIndex];
    if (!cardId || state.finished) return false;
    return getAttack(cardId).cost <= state.player.xp;
  }

  /**
   * Der Spieler benutzt eine Attacke von der Hand.
   * @returns {boolean} true, wenn die Attacke ausgeführt wurde
   */
  function playCard(handIndex) {
    if (!state.running || state.finished) return false;
    if (!canPlay(handIndex)) return false;

    const attack = getAttack(state.hand[handIndex]);

    // XP bezahlen (auch die Nachkommastellen mitnehmen, damit nichts verloren geht)
    exactXp -= attack.cost;
    syncXp();

    if (attack.damage > 0) {
      dealDamage(state.enemy, attack.damage);
      emit({
        type: 'player-attack',
        attack,
        amount: attack.damage,
        text: `${state.player.name} setzt ${attack.name} ein: ${attack.damage} Schaden!`,
      });
    }

    if (attack.heal > 0) {
      heal(state.player, attack.heal);
      emit({
        type: 'player-heal',
        attack,
        amount: attack.heal,
        text: `${state.player.name} nutzt ${attack.name} und heilt ${attack.heal} LP.`,
      });
    }

    // Karte ablegen und sofort nachziehen -> es liegen wieder 4 Karten
    deck.play(handIndex);
    state.handVersion++;

    checkEnd();
    return true;
  }

  /** Der Gegner sucht sich eine zufällige Attacke aus. */
  function enemyTurn() {
    const attackId = enemyMonster.attacks[Math.floor(Math.random() * enemyMonster.attacks.length)];
    const attack = getAttack(attackId);

    dealDamage(state.player, attack.damage);
    emit({
      type: 'enemy-attack',
      attack,
      amount: attack.damage,
      text: `${state.enemy.name} greift mit ${attack.name} an: ${attack.damage} Schaden!`,
    });

    checkEnd();
  }

  /** Überträgt die internen Nachkommastellen in die Anzeige-Werte. */
  function syncXp() {
    exactXp = Math.max(0, Math.min(MAX_XP, exactXp));
    state.player.xp = Math.floor(exactXp);
    state.player.xpProgress = state.player.xp >= MAX_XP ? 1 : exactXp - state.player.xp;
  }

  /** Ein Schritt der Spielzeit. deltaSeconds = vergangene Zeit seit dem letzten Frame. */
  function tick(deltaSeconds) {
    // XP-Regeneration
    exactXp += deltaSeconds * XP_PER_SECOND;
    syncXp();

    // Gegner-Timer
    enemyTimer -= deltaSeconds;
    state.enemy.attackProgress = 1 - Math.max(0, enemyTimer) / enemyMonster.attackDelay;
    if (enemyTimer <= 0 && !state.finished) {
      enemyTimer = enemyMonster.attackDelay;
      enemyTurn();
    }
  }

  /** Die Spielschleife: läuft mit der Bildwiederholrate des Geräts. */
  function loop(timestamp) {
    if (!state.running) return;

    // Beim ersten Frame gibt es noch keine Differenz.
    const deltaSeconds = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0;
    lastTimestamp = timestamp;

    // Deckel, damit nach einem Tabwechsel nicht 30 Sekunden auf einmal ablaufen.
    tick(Math.min(deltaSeconds, 0.1));

    if (onUpdate) onUpdate(state);

    if (state.running) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function start() {
    if (state.running || state.finished) return;
    state.running = true;
    lastTimestamp = 0;
    rafId = requestAnimationFrame(loop);
  }

  /** Stoppt die Schleife (z. B. beim Verlassen des Kampfbildschirms). */
  function stop() {
    state.running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return { state, start, stop, playCard, canPlay };
}
