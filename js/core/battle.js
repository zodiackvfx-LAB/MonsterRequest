/**
 * Die Kampf-Engine.
 *
 * Diese Datei enthält NUR Regeln - kein HTML, kein CSS, kein DOM.
 * Der Kampfbildschirm (js/screens/battle.js) zeigt an, was hier passiert.
 *
 * Spieler und Gegner sind gleich aufgebaut (siehe js/core/fighter.js):
 * beide haben ein Deck aus 8 Attacken, 4 Karten auf der Hand, maximal 10 XP
 * und bekommen 1 XP pro Sekunde. Der einzige Unterschied ist, wer entscheidet:
 * du per Tipp, der Gegner per KI (weiter unten in dieser Datei).
 */

import { createFighter, MAX_XP, XP_PER_SECOND, START_XP } from './fighter.js';

// Weiterreichen, damit andere Dateien nur diese eine Datei importieren müssen.
export { MAX_XP, XP_PER_SECOND, START_XP };

/** Standardwerte, falls ein Gegner keine eigenen KI-Werte mitbringt. */
const DEFAULT_REACTION_TIME = 1.0;
const DEFAULT_PATIENCE = 2;

/**
 * Startet einen Kampf.
 *
 * @param {object} options
 * @param {object} options.playerMonster - Monster aus js/data/monsters.js
 * @param {object} options.enemyMonster  - Monster aus js/data/monsters.js
 * @param {function} [options.onUpdate]  - wird bei jedem Frame mit dem state aufgerufen
 * @param {function} [options.onEvent]   - Kampfereignisse (für Log und Animationen)
 * @param {function} [options.onEnd]     - 'win' oder 'lose'
 */
export function createBattle({ playerMonster, enemyMonster, onUpdate, onEvent, onEnd }) {
  const player = createFighter(playerMonster);
  const enemy = createFighter(enemyMonster);

  /** Wie schnell der Gegner reagiert und wie geduldig er spart. */
  const reactionTime = enemyMonster.reactionTime ?? DEFAULT_REACTION_TIME;
  const patience = enemyMonster.patience ?? DEFAULT_PATIENCE;

  const state = {
    player: player.state,
    enemy: enemy.state,
    running: false,
    finished: false,
    result: null, // 'win' | 'lose'
  };

  let thinkTimer = reactionTime; // Sekunden, bis der Gegner das nächste Mal überlegt
  let savingFromXp = null; // XP-Stand, ab dem der Gegner gerade spart (null = spart nicht)
  let rafId = null;
  let lastTimestamp = 0;

  function emit(event) {
    if (onEvent) onEvent(event);
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

  /**
   * Führt eine Attacke aus: Schaden beim Gegenüber, Heilung bei sich selbst.
   * Läuft für Spieler und Gegner identisch ab.
   */
  /**
   * Wie viel Schaden kommt tatsächlich an?
   * Der Angriffswert des Angreifers erhöht ihn, die Verteidigung des
   * Getroffenen senkt ihn. Mindestens 1 Schaden kommt immer durch.
   */
  function schadenBerechnen(attacker, defender, roh) {
    const mitAngriff = roh * (attacker.state.damageFactor ?? 1);
    const nachAbwehr = mitAngriff * (1 - (defender.state.defense ?? 0));
    return Math.max(1, Math.round(nachAbwehr));
  }

  function useAttack(attacker, defender, attack, side) {
    if (attack.damage > 0) {
      const schaden = schadenBerechnen(attacker, defender, attack.damage);
      const applied = defender.takeDamage(schaden);
      emit({
        type: `${side}-attack`,
        attack,
        amount: schaden,
        absorbed: applied.shield, // vom Schild abgefangener Anteil
        text: applied.shield > 0
          ? `${attack.name}: ${schaden} Schaden - das Schild fängt ${applied.shield} ab!`
          : `${attacker.state.name} setzt ${attack.name} ein: ${schaden} Schaden!`,
      });
    }

    if (attack.heal > 0) {
      attacker.heal(attack.heal);
      emit({
        type: `${side}-heal`,
        attack,
        amount: attack.heal,
        text: `${attacker.state.name} nutzt ${attack.name} und heilt ${attack.heal} LP.`,
      });
    }

    if (attack.shield > 0) {
      attacker.addShield(attack.shield);
      emit({
        type: `${side}-shield`,
        attack,
        amount: attack.shield,
        text: `${attacker.state.name} stellt ein Schutzschild auf: ${attack.shield} Schaden werden abgefangen.`,
      });
    }

    checkEnd();
  }

  /* ------------------------------------------------------------------ */
  /*  Spieler                                                            */
  /* ------------------------------------------------------------------ */

  /** Kann der Spieler diese Handkarte gerade bezahlen? */
  function canPlay(handIndex) {
    const attack = player.handAttacks()[handIndex];
    if (!attack || state.finished) return false;
    return player.canAfford(attack.cost);
  }

  /**
   * Der Spieler benutzt eine Attacke von der Hand.
   * @returns {boolean} true, wenn die Attacke ausgeführt wurde
   */
  function playCard(handIndex) {
    if (!state.running || state.finished) return false;

    const attack = player.useCard(handIndex);
    if (!attack) return false;

    useAttack(player, enemy, attack, 'player');
    return true;
  }

  /* ------------------------------------------------------------------ */
  /*  Gegner-KI                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Wie wertvoll ist diese Attacke für den Gegner gerade?
   * Schaden zählt immer, Heilung nur so weit, wie ihm LP fehlen -
   * dadurch heilt er nie mit vollen Lebenspunkten. Ein Schild zählt nur,
   * wenn er bereits angeschlagen ist.
   */
  function valueOf(attack) {
    const usefulHeal = Math.min(attack.heal ?? 0, enemy.missingHp());
    // Ein Schild lohnt sich vor allem, wenn es für den Gegner eng wird.
    const inDanger = state.enemy.hp < state.enemy.maxHp * 0.5;
    const usefulShield = inDanger ? attack.shield ?? 0 : 0;
    return attack.damage + usefulHeal + usefulShield;
  }

  /**
   * Die Entscheidung des Gegners.
   *
   * 1. Er sucht die wertvollste Attacke, die er sich gerade leisten kann.
   * 2. Wäre in den nächsten Sekunden (= patience) etwas Stärkeres bezahlbar,
   *    spart er lieber weiter - genau wie ein Spieler, der auf die grosse
   *    Attacke wartet.
   *
   * @returns {number} Handposition der Attacke oder -1 für "noch warten"
   */
  function chooseCard() {
    const hand = enemy.handAttacks();

    let bestIndex = -1;
    let bestValue = -1;

    hand.forEach((attack, index) => {
      if (!enemy.canAfford(attack.cost)) return;
      const value = valueOf(attack);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });

    // Gemessen wird ab dem XP-Stand, bei dem er angefangen hat zu sparen.
    // Sonst würde er sich Stufe für Stufe immer weiter hochsparen und
    // am Ende doch ewig warten.
    const startXp = savingFromXp ?? state.enemy.xp;

    // Lohnt sich Warten? (bald bezahlbar UND wertvoller als alles Bezahlbare)
    const worthWaiting = hand.some(
      (attack) =>
        !enemy.canAfford(attack.cost) &&
        attack.cost <= startXp + patience &&
        valueOf(attack) > bestValue
    );

    if (worthWaiting) {
      if (savingFromXp === null) savingFromXp = state.enemy.xp;
      return -1;
    }

    savingFromXp = null;
    return bestIndex;
  }

  /** Der Gegner überlegt und spielt gegebenenfalls eine Karte. */
  function enemyTurn() {
    const handIndex = chooseCard();
    if (handIndex < 0) return; // spart noch XP

    const attack = enemy.useCard(handIndex);
    if (!attack) return;

    useAttack(enemy, player, attack, 'enemy');
  }

  /* ------------------------------------------------------------------ */
  /*  Spielschleife                                                      */
  /* ------------------------------------------------------------------ */

  /** Ein Schritt der Spielzeit. deltaSeconds = vergangene Zeit seit dem letzten Frame. */
  function tick(deltaSeconds) {
    // XP-Regeneration - für beide Seiten gleich
    player.gainXp(deltaSeconds);
    enemy.gainXp(deltaSeconds);

    // Der Gegner überlegt nur in festen Abständen, statt in jedem Frame.
    // Das ist seine "Reaktionszeit" und ersetzt das Dauerfeuer.
    thinkTimer -= deltaSeconds;
    if (thinkTimer <= 0 && !state.finished) {
      thinkTimer = reactionTime;
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
