/**
 * Kampfbildschirm.
 *
 * Diese Datei ist reine Darstellung: Sie startet die Kampf-Engine
 * (js/core/battle.js), zeigt deren Zustand an und leitet Tipps des Spielers
 * an sie weiter. Die Regeln selbst stehen alle in der Engine.
 */

import { showScreen } from '../core/screens.js';
import { getLevel } from '../data/levels.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { getAttack } from '../data/attacks.js';
import { createBattle, MAX_XP } from '../core/battle.js';
import { completeLevel } from '../core/state.js';

let battle = null; // laufender Kampf, damit unmount() ihn stoppen kann

export const battleScreen = {
  mount(root, params) {
    const level = getLevel(params.levelId);
    if (!level) {
      throw new Error(`Level ${params.levelId} gibt es nicht (siehe js/data/levels.js)`);
    }

    const playerMonster = getMonster(STARTER_MONSTER_ID);
    const enemyMonster = getMonster(level.enemyId);

    /* ---------- 1. Grundgerüst bauen ---------- */
    const screen = document.createElement('div');
    screen.className = 'screen screen--battle';
    screen.innerHTML = `
      <header class="topbar">
        <button class="button button--ghost button--small" id="btn-flee">‹ Fliehen</button>
        <h2 class="topbar__title">Level ${level.id}</h2>
        <span class="topbar__spacer"></span>
      </header>

      <section class="fighter fighter--enemy">
        <div class="fighter__bars">
          <div class="fighter__name">${enemyMonster.name}</div>
          <div class="bar bar--hp">
            <div class="bar__fill" id="enemy-hp-fill"></div>
            <span class="bar__label" id="enemy-hp-text"></span>
          </div>
          <div class="bar bar--timer" title="Zeit bis zum nächsten Angriff">
            <div class="bar__fill" id="enemy-timer-fill"></div>
          </div>
        </div>
        <div class="monster-sprite idle-bob" id="enemy-sprite">${enemyMonster.icon}</div>
      </section>

      <p class="battle-log" id="battle-log">${level.name}: ${enemyMonster.name} greift an!</p>

      <section class="fighter fighter--player">
        <div class="monster-sprite idle-bob" id="player-sprite">${playerMonster.icon}</div>
        <div class="fighter__bars">
          <div class="fighter__name">${playerMonster.name}</div>
          <div class="bar bar--hp">
            <div class="bar__fill" id="player-hp-fill"></div>
            <span class="bar__label" id="player-hp-text"></span>
          </div>
        </div>
      </section>

      <section class="xp">
        <div class="xp__header">
          <span class="xp__title">XP</span>
          <span class="xp__value" id="xp-text">0 / ${MAX_XP}</span>
        </div>
        <div class="xp__pips" id="xp-pips"></div>
      </section>

      <section class="hand" id="hand"></section>
    `;

    const ui = {
      enemyHpFill: screen.querySelector('#enemy-hp-fill'),
      enemyHpText: screen.querySelector('#enemy-hp-text'),
      enemyTimerFill: screen.querySelector('#enemy-timer-fill'),
      enemySprite: screen.querySelector('#enemy-sprite'),
      playerHpFill: screen.querySelector('#player-hp-fill'),
      playerHpText: screen.querySelector('#player-hp-text'),
      playerSprite: screen.querySelector('#player-sprite'),
      log: screen.querySelector('#battle-log'),
      xpText: screen.querySelector('#xp-text'),
      xpPips: screen.querySelector('#xp-pips'),
      hand: screen.querySelector('#hand'),
    };

    // Die 10 XP-Punkte einmal anlegen; später wird nur ihre Klasse getauscht.
    const pips = [];
    for (let i = 0; i < MAX_XP; i++) {
      const pip = document.createElement('span');
      pip.className = 'xp__pip';
      ui.xpPips.appendChild(pip);
      pips.push(pip);
    }

    /* ---------- 2. Kampf starten ---------- */
    let renderedHandVersion = -1;
    const cardElements = [];

    battle = createBattle({
      playerMonster,
      enemyMonster,
      onUpdate: render,
      onEvent: handleEvent,
      onEnd: showResult,
    });

    /* ---------- 3. Anzeige aktualisieren ---------- */
    function render(state) {
      // Lebensbalken
      ui.enemyHpFill.style.width = `${(state.enemy.hp / state.enemy.maxHp) * 100}%`;
      ui.enemyHpText.textContent = `${state.enemy.hp} / ${state.enemy.maxHp}`;
      ui.playerHpFill.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
      ui.playerHpText.textContent = `${state.player.hp} / ${state.player.maxHp}`;

      // Countdown bis zum nächsten Gegnerangriff
      ui.enemyTimerFill.style.width = `${state.enemy.attackProgress * 100}%`;

      // XP
      ui.xpText.textContent = `${state.player.xp} / ${MAX_XP}`;
      pips.forEach((pip, index) => {
        const filled = index < state.player.xp;
        // Der nächste Punkt füllt sich langsam - das macht das Warten sichtbar.
        const isCharging = index === state.player.xp && state.player.xp < MAX_XP;
        pip.classList.toggle('is-filled', filled);
        pip.classList.toggle('is-charging', isCharging);
        pip.style.setProperty('--charge', isCharging ? state.player.xpProgress : 0);
      });

      // Hand nur neu bauen, wenn sich die Karten geändert haben
      if (state.handVersion !== renderedHandVersion) {
        renderedHandVersion = state.handVersion;
        buildHand(state);
      }

      // Bezahlbarkeit jeder Karte laufend prüfen
      cardElements.forEach((card, index) => {
        const attack = getAttack(state.hand[index]);
        const affordable = attack.cost <= state.player.xp && !state.finished;
        card.classList.toggle('is-disabled', !affordable);
        card.disabled = !affordable;
      });
    }

    /** Baut die 4 Handkarten neu auf. */
    function buildHand(state) {
      ui.hand.innerHTML = '';
      cardElements.length = 0;

      state.hand.forEach((attackId, index) => {
        const attack = getAttack(attackId);

        const card = document.createElement('button');
        card.className = 'card';
        card.innerHTML = `
          <span class="card__cost">${attack.cost}</span>
          <span class="card__icon">${attack.icon}</span>
          <span class="card__name">${attack.name}</span>
          <span class="card__effect">${attack.heal > 0 ? `+${attack.heal} LP` : `${attack.damage} SCH`}</span>
        `;

        card.addEventListener('click', () => {
          const played = battle.playCard(index);
          if (!played) {
            // Nicht genug XP: kurzes Wackeln als Rückmeldung.
            flash(card, 'shake');
          }
        });

        ui.hand.appendChild(card);
        cardElements.push(card);
      });
    }

    /* ---------- 4. Ereignisse: Log und Animationen ---------- */
    function handleEvent(event) {
      if (event.text) ui.log.textContent = event.text;

      if (event.type === 'player-attack') flash(ui.enemySprite, 'hit');
      if (event.type === 'enemy-attack') flash(ui.playerSprite, 'hit');
      if (event.type === 'player-heal') flash(ui.playerSprite, 'heal');
    }

    /** Setzt kurz eine CSS-Klasse für eine Animation. */
    function flash(element, className) {
      element.classList.remove(className);
      void element.offsetWidth; // erzwingt den Neustart der Animation
      element.classList.add(className);
      setTimeout(() => element.classList.remove(className), 400);
    }

    /* ---------- 5. Kampfende ---------- */
    function showResult(result) {
      if (result === 'win') {
        completeLevel(level.id);
      }

      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="overlay__box">
          <div class="overlay__icon">${result === 'win' ? '🏆' : '💀'}</div>
          <h3 class="overlay__title">${result === 'win' ? 'Sieg!' : 'Niederlage'}</h3>
          <p class="overlay__text">
            ${result === 'win'
              ? `${enemyMonster.name} wurde besiegt. Das nächste Level ist frei!`
              : `${playerMonster.name} ist erschöpft. Versuch es noch einmal!`}
          </p>
          <div class="overlay__actions">
            <button class="button button--primary" id="btn-retry">Nochmal kämpfen</button>
            <button class="button button--ghost" id="btn-map">Zur Karte</button>
          </div>
        </div>
      `;

      overlay.querySelector('#btn-retry').addEventListener('click', () => {
        showScreen('battle', { levelId: level.id });
      });
      overlay.querySelector('#btn-map').addEventListener('click', () => {
        showScreen('map');
      });

      screen.appendChild(overlay);
    }

    screen.querySelector('#btn-flee').addEventListener('click', () => {
      showScreen('map');
    });

    root.appendChild(screen);

    render(battle.state); // einmal zeichnen, bevor der erste Frame läuft
    battle.start();
  },

  /** Wichtig: die Spielschleife stoppen, wenn der Bildschirm verlassen wird. */
  unmount() {
    if (battle) {
      battle.stop();
      battle = null;
    }
  },
};
