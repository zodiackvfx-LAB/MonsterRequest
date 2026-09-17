/**
 * Kampfbildschirm.
 *
 * Diese Datei ist reine Darstellung: Sie startet die Kampf-Engine
 * (js/core/battle.js), zeigt deren Zustand an und leitet Tipps des Spielers
 * an sie weiter. Die Regeln selbst stehen alle in der Engine.
 *
 * Weil Spieler und Gegner nach denselben Regeln kämpfen, wird auch die
 * XP-Leiste des Gegners angezeigt - so siehst du, wann bei ihm etwas
 * Großes kommt.
 */

import { showScreen } from '../core/screens.js';
import { getLevel } from '../data/levels.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { getEnemy } from '../data/enemies.js';
import { getAttack } from '../data/attacks.js';
import { createBattle, MAX_XP } from '../core/battle.js';
import { calculateStars, completeLevel, getDeck } from '../core/state.js';
import { attackeMitLevel, monsterMitFortschritt, xpGutschreiben } from '../core/progression.js';
import { applyRegion, createArenaLayers, createScenery } from '../ui/scenery.js';
import { createStars } from '../ui/hud.js';
import { createSprite } from '../ui/sprite.js';

let battle = null; // laufender Kampf, damit unmount() ihn stoppen kann
let resultTimer = null; // wartet kurz, bevor das Ergebnisfenster erscheint

/**
 * Wartezeit zwischen dem letzten Treffer und dem Ergebnisfenster.
 * Ohne sie erscheint das Fenster, während der Lebensbalken noch leerläuft -
 * dann sieht es so aus, als hätte der Gegner noch Leben gehabt.
 */
const ERGEBNIS_VERZOEGERUNG = 750;

export const battleScreen = {
  mount(root, params) {
    const level = getLevel(params.levelId);
    if (!level) {
      throw new Error(`Level ${params.levelId} gibt es nicht (siehe js/data/levels.js)`);
    }

    // Das Monster kämpft mit dem gewählten Deck und mit allen Werten aus
    // seinem Fortschritt (Level und gekaufte Aufwertungen).
    const basis = getMonster(STARTER_MONSTER_ID);
    const playerMonster = { ...monsterMitFortschritt(basis), deck: getDeck(basis) };
    const enemyMonster = getEnemy(level.enemyId);

    /* ---------- 1. Grundgerüst bauen ---------- */
    const screen = document.createElement('div');
    screen.className = 'screen screen--battle';
    applyRegion(screen, level.scenery);
    // Nur Himmel: den Boden bringt die Arena mit.
    screen.appendChild(createScenery({ skyOnly: true }));

    screen.insertAdjacentHTML(
      'beforeend',
      `
      <header class="topbar">
        <button class="btn btn--ghost btn--small" id="btn-flee" type="button">‹&nbsp;Fliehen</button>
        <h2 class="topbar__title">${level.isBoss ? 'Bosskampf' : `Kampf ${level.number}`}</h2>
        <span class="topbar__spacer"></span>
      </header>

      <section class="fighter-bar">
        <div class="fighter-bar__head">
          <span class="fighter-bar__name">${enemyMonster.name}</span>
          <span class="fighter-bar__hp" id="enemy-hp-text"></span>
        </div>
        <div class="bar" id="enemy-hp-bar"><div class="bar__fill" id="enemy-hp-fill"></div></div>
        <div class="fighter-bar__xp">
          <span class="fighter-bar__xp-label">XP</span>
          <div class="pips pips--enemy pips--small" id="enemy-xp-pips"></div>
        </div>
        <div class="shield-badge" id="enemy-shield">🛡️ <span></span></div>
      </section>

      <div class="battlefield">
        <div class="arena" id="arena">
          <div class="stage stage--enemy">
            <div class="sprite idle-bob${enemyMonster.isBoss ? ' sprite--boss' : ''}" id="enemy-sprite"></div>
            <div class="platform"></div>
          </div>

          <p class="battle-log" id="battle-log">${enemyMonster.name} greift an!</p>

          <div class="stage stage--player">
            <div class="sprite idle-bob" id="player-sprite"></div>
            <div class="platform"></div>
          </div>
        </div>
      </div>

      <section class="fighter-bar">
        <div class="fighter-bar__head">
          <span class="fighter-bar__name">${playerMonster.name}</span>
          <span class="fighter-bar__hp" id="player-hp-text"></span>
        </div>
        <div class="bar" id="player-hp-bar"><div class="bar__fill" id="player-hp-fill"></div></div>
        <div class="shield-badge" id="player-shield">🛡️ <span></span></div>
      </section>

      <section class="xp-row">
        <div class="xp-row__head">
          <span class="xp-row__title">DEINE XP</span>
          <span class="xp-row__value" id="xp-text">0 / ${MAX_XP}</span>
        </div>
        <div class="pips" id="xp-pips"></div>
      </section>

      <section class="hand" id="hand"></section>
      `
    );

    // Die Pixel-Figuren einsetzen (siehe js/ui/sprite.js)
    screen.querySelector('#enemy-sprite').appendChild(createSprite(enemyMonster));
    screen.querySelector('#player-sprite').appendChild(createSprite(playerMonster));

    // Kulisse der Arena (Hügel, Wiese, Bäume, Kampfplatz) hinter die Monster legen
    screen.querySelector('#arena').prepend(...createArenaLayers());

    const ui = {
      enemyHpFill: screen.querySelector('#enemy-hp-fill'),
      enemyHpText: screen.querySelector('#enemy-hp-text'),
      enemyHpBar: screen.querySelector('#enemy-hp-bar'),
      enemySprite: screen.querySelector('#enemy-sprite'),
      enemyShield: screen.querySelector('#enemy-shield'),
      playerHpFill: screen.querySelector('#player-hp-fill'),
      playerHpText: screen.querySelector('#player-hp-text'),
      playerHpBar: screen.querySelector('#player-hp-bar'),
      playerSprite: screen.querySelector('#player-sprite'),
      playerShield: screen.querySelector('#player-shield'),
      log: screen.querySelector('#battle-log'),
      xpText: screen.querySelector('#xp-text'),
      hand: screen.querySelector('#hand'),
    };

    const playerPips = createPips(screen.querySelector('#xp-pips'));
    const enemyPips = createPips(screen.querySelector('#enemy-xp-pips'));

    /** Legt MAX_XP Punkte in einem Container an und gibt sie als Array zurück. */
    function createPips(container) {
      const pips = [];
      for (let i = 0; i < MAX_XP; i++) {
        const pip = document.createElement('span');
        pip.className = 'pip';
        container.appendChild(pip);
        pips.push(pip);
      }
      return pips;
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
      renderFighter(ui.enemyHpBar, ui.enemyHpFill, ui.enemyHpText, ui.enemyShield, state.enemy);
      renderFighter(ui.playerHpBar, ui.playerHpFill, ui.playerHpText, ui.playerShield, state.player);

      ui.xpText.textContent = `${state.player.xp} / ${MAX_XP}`;
      renderPips(playerPips, state.player);
      renderPips(enemyPips, state.enemy);

      // Hand nur neu bauen, wenn sich die Karten geändert haben
      if (state.player.handVersion !== renderedHandVersion) {
        renderedHandVersion = state.player.handVersion;
        buildHand(state);
      }

      // Bezahlbarkeit jeder Karte laufend prüfen
      cardElements.forEach((card, index) => {
        const attack = kampfAttacke(state.player.hand[index]);
        const affordable = attack.cost <= state.player.xp && !state.finished;
        card.classList.toggle('is-ready', affordable);
        card.classList.toggle('is-disabled', !affordable);
        card.disabled = !affordable;
      });
    }

    /**
     * Eine Handkarte so, wie sie im Kampf wirkt: mit ihrem Attacken-Level
     * und dem Angriffswert des Charakters. Auf der Karte steht damit genau
     * der Schaden, der auch ankommt.
     */
    function kampfAttacke(attackId) {
      const attack = attackeMitLevel(getAttack(attackId));
      return {
        ...attack,
        damage: Math.round(attack.damage * (battle.state.player.damageFactor ?? 1)),
      };
    }

    /** Lebensbalken, Zahl und Schildanzeige eines Kämpfers. */
    function renderFighter(bar, fill, text, shieldBadge, fighter) {
      const share = fighter.hp / fighter.maxHp;
      fill.style.width = `${share * 100}%`;
      text.textContent = `${fighter.hp} / ${fighter.maxHp}`;
      bar.classList.toggle('is-low', share <= 0.3);

      shieldBadge.classList.toggle('is-active', fighter.shield > 0);
      if (fighter.shield > 0) {
        shieldBadge.querySelector('span').textContent = fighter.shield;
      }
    }

    /** Färbt die XP-Punkte eines Kämpfers passend zu seinen XP ein. */
    function renderPips(pips, fighter) {
      pips.forEach((pip, index) => {
        const filled = index < fighter.xp;
        // Der nächste Punkt füllt sich langsam - das macht das Warten sichtbar.
        const isCharging = index === fighter.xp && fighter.xp < MAX_XP;
        pip.classList.toggle('is-filled', filled);
        pip.classList.toggle('is-charging', isCharging);
        pip.style.setProperty('--charge', isCharging ? fighter.xpProgress : 0);
      });
    }

    /** Baut die 4 Handkarten neu auf. */
    function buildHand(state) {
      ui.hand.innerHTML = '';
      cardElements.length = 0;

      state.player.hand.forEach((attackId, index) => {
        const attack = kampfAttacke(attackId);

        let effect = `${attack.damage} SCH`;
        if (attack.heal > 0) effect = `+${attack.heal} LP`;
        if (attack.shield > 0) effect = `${attack.shield} Schild`;

        const card = document.createElement('button');
        card.className = 'card';
        card.type = 'button';
        card.innerHTML = `
          <span class="card__cost">${attack.cost}</span>
          <span class="card__icon">${attack.icon}</span>
          <span class="card__name">${attack.name}</span>
          <span class="card__effect">${effect}</span>
        `;

        card.addEventListener('click', () => {
          const played = battle.playCard(index);
          // Nicht genug XP: kurzes Wackeln als Rückmeldung.
          if (!played) flash(card, 'shake');
        });

        ui.hand.appendChild(card);
        cardElements.push(card);
      });
    }

    /* ---------- 4. Ereignisse: Log, Animationen, Zahlen ---------- */
    function handleEvent(event) {
      if (event.text) ui.log.textContent = event.text;

      switch (event.type) {
        case 'player-attack':
          flash(ui.playerSprite, 'lunge-right');
          flash(ui.enemySprite, 'hit');
          floatNumber(ui.enemySprite, `-${event.amount}`, 'damage');
          break;
        case 'enemy-attack':
          flash(ui.enemySprite, 'lunge-left');
          flash(ui.playerSprite, 'hit');
          floatNumber(ui.playerSprite, `-${event.amount}`, 'damage');
          break;
        case 'player-heal':
          flash(ui.playerSprite, 'heal');
          floatNumber(ui.playerSprite, `+${event.amount}`, 'heal');
          break;
        case 'enemy-heal':
          flash(ui.enemySprite, 'heal');
          floatNumber(ui.enemySprite, `+${event.amount}`, 'heal');
          break;
        case 'player-shield':
          floatNumber(ui.playerSprite, `🛡️ ${event.amount}`, 'shield');
          break;
        case 'enemy-shield':
          floatNumber(ui.enemySprite, `🛡️ ${event.amount}`, 'shield');
          break;
        default:
          break;
      }
    }

    /** Setzt kurz eine CSS-Klasse für eine Animation. */
    function flash(element, className) {
      element.classList.remove(className);
      void element.offsetWidth; // erzwingt den Neustart der Animation
      element.classList.add(className);
      setTimeout(() => element.classList.remove(className), 450);
    }

    /** Lässt eine Zahl über dem Monster aufsteigen. */
    function floatNumber(sprite, text, kind) {
      const number = document.createElement('span');
      number.className = `float-number float-number--${kind}`;
      number.textContent = text;
      sprite.parentElement.appendChild(number);
      setTimeout(() => number.remove(), 900);
    }

    /* ---------- 5. Kampfende ---------- */
    function showResult(result) {
      const state = battle.state;
      let stars = 0;
      let coins = 0;
      let newWorld = null; // wird gesetzt, wenn der Boss eine neue Welt öffnet

      let xpErgebnis = null;
      if (result === 'win') {
        stars = calculateStars(state.player.hp, state.player.maxHp);
        ({ coins, newWorld } = completeLevel(level.id, { stars, reward: level.reward ?? 0 }));
        // Erfahrung gibt es bei jedem Sieg, auch beim Wiederholen.
        xpErgebnis = xpGutschreiben(basis.id, level.xp ?? 0);
      }

      // Kurz warten, damit der letzte Treffer, die Schadenszahl und der
      // leerlaufende Lebensbalken noch zu sehen sind.
      resultTimer = setTimeout(
        () => buildResultOverlay(result, stars, coins, newWorld, xpErgebnis),
        ERGEBNIS_VERZOEGERUNG
      );
    }

    function buildResultOverlay(result, stars, coins, newWorld, xpErgebnis) {
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="overlay__box">
          <div class="overlay__icon">${result === 'win' ? '🏆' : '💀'}</div>
          <h3 class="overlay__title">${result === 'win' ? 'Sieg!' : 'Niederlage'}</h3>
          <p class="overlay__text">
            ${result === 'win'
              ? `${enemyMonster.name} wurde besiegt.${coins > 0 ? ` Du erhältst 🪙 ${coins}.` : ''}`
              : `${playerMonster.name} ist erschöpft. Versuch es noch einmal!`}
          </p>
          ${result === 'win' && level.xp
            ? `<p class="overlay__xp">⭐ +${level.xp} Erfahrung${
                xpErgebnis?.aufgestiegen
                  ? `<br><strong>Level ${xpErgebnis.levelNachher} erreicht!</strong>`
                  : ''
              }</p>`
            : ''}
          ${newWorld ? `<p class="overlay__unlock">🎉 Neue Welt freigeschaltet:<br><strong>${newWorld.icon} ${newWorld.name}</strong></p>` : ''}
          <div class="overlay__actions">
            <button class="btn btn--big btn--green" id="btn-next" type="button"></button>
            <button class="btn btn--ghost" id="btn-map" type="button">Zur Karte</button>
          </div>
        </div>
      `;

      if (result === 'win') {
        const box = overlay.querySelector('.overlay__box');
        box.insertBefore(createStars(stars), box.querySelector('.overlay__text'));
      }

      const nextButton = overlay.querySelector('#btn-next');
      nextButton.textContent = newWorld ? 'Neue Welt ansehen' : result === 'win' ? 'Weiter' : 'Nochmal kämpfen';
      nextButton.addEventListener('click', () => {
        if (newWorld) showScreen('worlds');
        else if (result === 'win') showScreen('map', { worldId: level.worldId });
        else showScreen('battle', { levelId: level.id });
      });

      overlay
        .querySelector('#btn-map')
        .addEventListener('click', () => showScreen('map', { worldId: level.worldId }));
      screen.appendChild(overlay);
    }

    screen.querySelector('#btn-flee').addEventListener('click', () =>
      showScreen('map', { worldId: level.worldId })
    );

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
    // Sonst könnte das Ergebnisfenster auf einem anderen Bildschirm landen.
    if (resultTimer !== null) {
      clearTimeout(resultTimer);
      resultTimer = null;
    }
  },
};
