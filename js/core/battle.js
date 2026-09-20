/**
 * Die Kampf-Engine.
 *
 * Diese Datei enthält NUR Regeln - kein HTML, kein CSS, kein DOM.
 * Der Kampfbildschirm (js/screens/battle.js) zeigt an, was hier passiert.
 *
 * Spieler und Gegner sind gleich aufgebaut (siehe js/core/fighter.js):
 * beide haben ein Deck aus 8 Attacken, 4 Karten auf der Hand, maximal 10 Energie
 * und bekommen 1 Energie pro Sekunde. Der einzige Unterschied ist, wer entscheidet:
 * du per Tipp, der Gegner per KI (weiter unten in dieser Datei).
 */

import { createFighter, MAX_ENERGIE, ENERGIE_PRO_SEKUNDE, START_ENERGIE } from './fighter.js';

// Weiterreichen, damit andere Dateien nur diese eine Datei importieren müssen.
export { MAX_ENERGIE, ENERGIE_PRO_SEKUNDE, START_ENERGIE };

/** Standardwerte, falls ein Gegner keine eigenen KI-Werte mitbringt. */
const DEFAULT_REACTION_TIME = 1.0;
const DEFAULT_PATIENCE = 2;

/**
 * Kritische Treffer.
 *
 * Mit dieser Wahrscheinlichkeit trifft eine Schadensattacke besonders hart
 * und macht das FAKTOR-fache. Gilt für beide Seiten gleich - das bringt
 * Spannung in jede Karte, ohne die Grundwerte zu verschieben.
 * Zahlen ändern = Krits häufiger/stärker.
 */
export const KRIT_CHANCE = 0.12;
export const KRIT_FAKTOR = 1.5;

/**
 * Startet einen Kampf.
 *
 * @param {object} options
 * @param {object} options.playerMonster  - Monster aus js/data/monsters.js
 * @param {object} options.enemyMonster   - Monster aus js/data/monsters.js
 * @param {object} [options.bossPower]     - die vom Spieler getragene Boss-Kraft
 * @param {object} [options.enemyBossPower]- die Boss-Kraft des Gegners (nur Bosse)
 * @param {function} [options.onUpdate]   - wird bei jedem Frame mit dem state aufgerufen
 * @param {function} [options.onEvent]    - Kampfereignisse (für Log und Animationen)
 * @param {function} [options.onEnd]      - 'win' oder 'lose'
 */
export function createBattle({
  playerMonster,
  enemyMonster,
  bossPower = null,
  enemyBossPower = null,
  onUpdate,
  onEvent,
  onEnd,
}) {
  const player = createFighter(playerMonster);
  const enemy = createFighter(enemyMonster);

  /** Wie schnell der Gegner reagiert und wie geduldig er spart. */
  const reactionTime = enemyMonster.reactionTime ?? DEFAULT_REACTION_TIME;
  const patience = enemyMonster.patience ?? DEFAULT_PATIENCE;

  const state = {
    player: player.state,
    enemy: enemy.state,
    bossPower, // die getragene Boss-Kraft (oder null) - der Spieler trägt sie
    enemyBossPower, // die Boss-Kraft des Gegners (nur bei Bossen gesetzt)
    kraft: 0, // 0..1: wie voll die Kraft-Leiste des Spielers ist
    kraftBereit: false, // true, sobald die Spieler-Kraft einsatzbereit ist
    gegnerKraft: 0, // 0..1: wie voll die Kraft-Leiste des Gegners ist
    playerFrozen: false, // true, solange der Spieler eingefroren ist (Boss-Kraft)
    running: false,
    finished: false,
    result: null, // 'win' | 'lose'
  };

  /* Die Kraft-Leiste füllt sich mit "Ladepunkten": für gespielte Karten und
     für eingesteckte Treffer. Ist das Maximum erreicht, ist die Kraft bereit.
     Der Gegner lädt langsamer, damit sein Spezial nicht zu oft kommt - es soll
     ein Höhepunkt bleiben, keine Dauerbelastung. Wie viele Punkte er braucht,
     steht bei jeder Kraft selbst (gegnerLadung, siehe js/data/kraefte.js) -
     so kommen milde Kräfte früh und harte (Frost, Inferno) seltener. */
  const KRAFT_MAX = 16;
  let kraftPunkte = 0;
  const GEGNER_KRAFT_MAX = enemyBossPower?.gegnerLadung ?? 24;
  let gegnerKraftPunkte = 0;

  function ladeKraft(punkte) {
    if (!bossPower || state.finished) return;
    kraftPunkte = Math.min(KRAFT_MAX, kraftPunkte + punkte);
    state.kraft = kraftPunkte / KRAFT_MAX;
    state.kraftBereit = kraftPunkte >= KRAFT_MAX;
  }

  function gegnerKraftLaden(punkte) {
    if (!enemyBossPower || state.finished) return;
    gegnerKraftPunkte = Math.min(GEGNER_KRAFT_MAX, gegnerKraftPunkte + punkte);
    state.gegnerKraft = gegnerKraftPunkte / GEGNER_KRAFT_MAX;
  }

  /* Brand (Schaden über Zeit) und Vereisung - jetzt für BEIDE Seiten möglich,
     weil auch der Boss seine Kraft einsetzt. Der Schlüssel ('player'|'enemy')
     ist immer die Seite, die GERADE brennt bzw. eingefroren ist. */
  const brand = { player: null, enemy: null }; // je: { rest, tick, timer, angreifer, verteidiger }
  const frostRest = { player: 0, enemy: 0 }; // Sekunden, die eine Seite noch eingefroren ist

  let thinkTimer = reactionTime; // Sekunden, bis der Gegner das nächste Mal überlegt
  let sparenAb = null; // Energiestand, ab dem der Gegner gerade spart (null = spart nicht)
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
      let schaden = schadenBerechnen(attacker, defender, attack.damage);
      // Kritischer Treffer: seltener, dafür deutlich härter.
      const krit = Math.random() < KRIT_CHANCE;
      if (krit) schaden = Math.round(schaden * KRIT_FAKTOR);

      const applied = defender.takeDamage(schaden);
      // Ein Treffer lädt die Kraft-Leiste der getroffenen Seite ein Stück.
      if (side === 'enemy') ladeKraft(2); // der Spieler wurde getroffen
      if (side === 'player') gegnerKraftLaden(2); // der Gegner wurde getroffen
      emit({
        type: `${side}-attack`,
        attack,
        amount: schaden,
        krit,
        absorbed: applied.shield, // vom Schild abgefangener Anteil
        text: krit
          ? `Kritischer Treffer! ${attack.name}: ${schaden} Schaden!`
          : applied.shield > 0
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

    // Status-Effekte mancher Attacken treffen das Gegenüber.
    const zielSeite = side === 'player' ? 'enemy' : 'player';

    // Gift: Schaden über Zeit (nutzt dieselbe Maschinerie wie der Boss-Brand).
    if (attack.gift) {
      const intervall = attack.gift.intervall ?? 1.0;
      brand[zielSeite] = {
        rest: attack.gift.male,
        tick: attack.gift.tick,
        timer: intervall,
        intervall,
        angreifer: attacker,
        verteidiger: defender,
        typ: 'gift',
      };
      emit({ type: 'gift', seite: zielSeite, text: `${defender.state.name} ist vergiftet!` });
    }

    // Betäubung: das Gegenüber kann kurz nicht handeln (wie Frost).
    if (attack.stun) {
      frostRest[zielSeite] = attack.stun;
      if (zielSeite === 'player') state.playerFrozen = true;
      emit({ type: 'betaeubung', seite: zielSeite, dauer: attack.stun, text: `${defender.state.name} ist betäubt!` });
    }

    checkEnd();
  }

  /* ------------------------------------------------------------------ */
  /*  Spieler                                                            */
  /* ------------------------------------------------------------------ */

  /** Kann der Spieler diese Handkarte gerade bezahlen? */
  function canPlay(handIndex) {
    const attack = player.handAttacks()[handIndex];
    // Eingefroren (gegnerische Boss-Kraft "Frostbann"): keine Karten spielbar.
    if (!attack || state.finished || state.playerFrozen) return false;
    return player.canAfford(attack.cost);
  }

  /**
   * Der Spieler benutzt eine Attacke von der Hand.
   * @returns {boolean} true, wenn die Attacke ausgeführt wurde
   */
  function playCard(handIndex) {
    if (!state.running || state.finished || state.playerFrozen) return false;

    const attack = player.useCard(handIndex);
    if (!attack) return false;

    // Für jede gespielte Karte lädt die Kraft-Leiste um die Energiekosten.
    ladeKraft(attack.cost);
    useAttack(player, enemy, attack, 'player');
    return true;
  }

  /**
   * Wendet eine Boss-Kraft an - für Spieler ODER Gegner, je nach `seite`.
   *
   * Beide Seiten nutzen dieselbe Rechnung: Der Angreifer setzt die Kraft ein,
   * der Verteidiger bekommt sie ab. Die Ereignisse tragen den Präfix der
   * angreifenden Seite ('player-...' / 'enemy-...'), damit der Bildschirm
   * die richtige Figur trifft.
   *
   * @param {object} kraft - Eintrag aus js/data/kraefte.js
   * @param {object} angreifer - der Kämpfer, der die Kraft einsetzt
   * @param {object} verteidiger - sein Gegenüber
   * @param {'player'|'enemy'} seite - Seite des Angreifers
   */
  function kraftAnwenden(kraft, angreifer, verteidiger, seite) {
    const gegenseite = seite === 'player' ? 'enemy' : 'player';

    // Ansage zuerst - der Bildschirm zeigt darauf den grossen Effekt.
    emit({ type: 'kraft', power: kraft, seite, text: `${angreifer.state.name} setzt ${kraft.name} ein!` });

    switch (kraft.art) {
      case 'schild': {
        const menge = Math.round(angreifer.state.maxHp * kraft.wert);
        angreifer.addShield(menge);
        emit({ type: `${seite}-shield`, amount: menge, kraft: true, text: `${kraft.name}: Schild ${menge}.` });
        break;
      }
      case 'schildbruch': {
        verteidiger.entferneSchild();
        const dmg = schadenBerechnen(angreifer, verteidiger, kraft.wert);
        verteidiger.takeDamage(dmg);
        emit({ type: `${seite}-attack`, amount: dmg, kraft: true, text: `${kraft.name} zerschlägt das Schild: ${dmg} Schaden!` });
        break;
      }
      case 'lebensraub': {
        const dmg = schadenBerechnen(angreifer, verteidiger, kraft.wert);
        verteidiger.takeDamage(dmg);
        angreifer.heal(dmg);
        emit({ type: `${seite}-attack`, amount: dmg, kraft: true, text: `${kraft.name}: ${dmg} Schaden - und ${dmg} LP zurück!` });
        emit({ type: `${seite}-heal`, amount: dmg });
        break;
      }
      case 'energiesturm': {
        angreifer.energieVoll();
        const dmg = schadenBerechnen(angreifer, verteidiger, kraft.wert);
        verteidiger.takeDamage(dmg);
        emit({ type: `${seite}-attack`, amount: dmg, kraft: true, text: `${kraft.name}: volle Energie und ${dmg} Schaden!` });
        break;
      }
      case 'energieraub': {
        const dmg = schadenBerechnen(angreifer, verteidiger, kraft.wert);
        verteidiger.takeDamage(dmg);
        verteidiger.energieLeeren();
        emit({ type: `${seite}-attack`, amount: dmg, kraft: true, text: `${kraft.name}: ${dmg} Schaden - und die ganze Energie entladen!` });
        break;
      }
      case 'brand': {
        const sofort = schadenBerechnen(angreifer, verteidiger, kraft.wert.sofort);
        verteidiger.takeDamage(sofort);
        emit({ type: `${seite}-attack`, amount: sofort, kraft: true, text: `${kraft.name}: ${sofort} Schaden - Feuer!` });
        // Der Rest kommt tickweise in der Schleife - auf der getroffenen Seite.
        brand[gegenseite] = { rest: kraft.wert.male, tick: kraft.wert.tick, timer: 0.6, intervall: 0.6, angreifer, verteidiger, typ: 'brand' };
        break;
      }
      case 'frost': {
        frostRest[gegenseite] = kraft.wert;
        if (gegenseite === 'player') state.playerFrozen = true;
        emit({ type: 'frost', seite: gegenseite, dauer: kraft.wert, text: `${kraft.name}: ${verteidiger.state.name} ist eingefroren!` });
        break;
      }
      default:
        break;
    }

    checkEnd();
  }

  /**
   * Löst die vom Spieler getragene Boss-Kraft aus - wenn die Leiste voll ist.
   * @returns {boolean} true, wenn die Kraft ausgelöst wurde
   */
  function useBossPower() {
    if (!state.running || state.finished) return false;
    if (!bossPower || kraftPunkte < KRAFT_MAX) return false;

    // Sofort leeren, damit ein Doppeltipp nicht doppelt auslöst.
    kraftPunkte = 0;
    state.kraft = 0;
    state.kraftBereit = false;

    kraftAnwenden(bossPower, player, enemy, 'player');
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

    // Gemessen wird ab dem Energiestand, bei dem er angefangen hat zu sparen.
    // Sonst würde er sich Stufe für Stufe immer weiter hochsparen und
    // am Ende doch ewig warten.
    const startEnergie = sparenAb ?? state.enemy.energie;

    // Lohnt sich Warten? (bald bezahlbar UND wertvoller als alles Bezahlbare)
    const worthWaiting = hand.some(
      (attack) =>
        !enemy.canAfford(attack.cost) &&
        attack.cost <= startEnergie + patience &&
        valueOf(attack) > bestValue
    );

    if (worthWaiting) {
      if (sparenAb === null) sparenAb = state.enemy.energie;
      return -1;
    }

    sparenAb = null;
    return bestIndex;
  }

  /** Der Gegner überlegt und spielt gegebenenfalls eine Karte. */
  function enemyTurn() {
    // Boss-Kraft: ist die gegnerische Leiste voll, setzt der Boss in diesem
    // Zug seine Signatur-Fähigkeit ein - statt einer normalen Karte.
    if (enemyBossPower && gegnerKraftPunkte >= GEGNER_KRAFT_MAX && !state.finished) {
      gegnerKraftPunkte = 0;
      state.gegnerKraft = 0;
      kraftAnwenden(enemyBossPower, enemy, player, 'enemy');
      return;
    }

    const handIndex = chooseCard();
    if (handIndex < 0) return; // spart noch Energie

    const attack = enemy.useCard(handIndex);
    if (!attack) return;

    // Für jede gespielte Karte lädt auch die gegnerische Kraft-Leiste.
    gegnerKraftLaden(attack.cost);
    useAttack(enemy, player, attack, 'enemy');
  }

  /* ------------------------------------------------------------------ */
  /*  Spielschleife                                                      */
  /* ------------------------------------------------------------------ */

  /** Ein Schritt der Spielzeit. deltaSeconds = vergangene Zeit seit dem letzten Frame. */
  function tick(deltaSeconds) {
    // Energie-Nachschub für den Spieler - außer er ist eingefroren (Frostbann
    // des Bosses). Eingefroren lädt er keine Energie und kann keine Karte spielen.
    if (frostRest.player > 0) {
      frostRest.player = Math.max(0, frostRest.player - deltaSeconds);
      if (frostRest.player === 0) state.playerFrozen = false;
    } else {
      player.energieAufladen(deltaSeconds);
    }

    if (frostRest.enemy > 0) {
      // Eingefroren (Boss-Kraft "Frostbann"): der Gegner lädt keine Energie
      // und greift nicht an, bis die Vereisung vorbei ist.
      frostRest.enemy = Math.max(0, frostRest.enemy - deltaSeconds);
    } else {
      enemy.energieAufladen(deltaSeconds);
      // Der Gegner überlegt nur in festen Abständen, statt in jedem Frame.
      // Das ist seine "Reaktionszeit" und ersetzt das Dauerfeuer.
      thinkTimer -= deltaSeconds;
      if (thinkTimer <= 0 && !state.finished) {
        thinkTimer = reactionTime;
        enemyTurn();
      }
    }

    // Brand (Boss-Kraft "Inferno") und Gift (Attacken): auf jeder Seite, die
    // gerade brennt bzw. vergiftet ist, kommt in Abständen weiter Schaden.
    for (const seite of ['player', 'enemy']) {
      const b = brand[seite];
      if (!b || state.finished) continue;
      b.timer -= deltaSeconds;
      while (b.timer <= 0 && b.rest > 0 && !state.finished) {
        const dmg = schadenBerechnen(b.angreifer, b.verteidiger, b.tick);
        b.verteidiger.takeDamage(dmg);
        const gift = b.typ === 'gift';
        emit({
          type: gift ? 'gift' : 'brand',
          seite,
          amount: dmg,
          text: `${b.verteidiger.state.name} ${gift ? 'erleidet Gift' : 'brennt'}: ${dmg} Schaden.`,
        });
        b.rest -= 1;
        b.timer += b.intervall ?? 0.6;
        checkEnd();
      }
      if (b.rest <= 0) brand[seite] = null;
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

  return { state, start, stop, playCard, canPlay, useBossPower };
}
