/**
 * Kampfbildschirm.
 *
 * Diese Datei ist reine Darstellung: Sie startet die Kampf-Engine
 * (js/core/battle.js), zeigt deren Zustand an und leitet Tipps des Spielers
 * an sie weiter. Die Regeln selbst stehen alle in der Engine.
 *
 * Weil Spieler und Gegner nach denselben Regeln kämpfen, wird auch die
 * Energieleiste des Gegners angezeigt - so siehst du, wann bei ihm etwas
 * Großes kommt.
 */

import { showScreen } from '../core/screens.js';
import { getLevel } from '../data/levels.js';
import { getWorld } from '../data/worlds.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { getEnemy } from '../data/enemies.js';
import { getAttack } from '../data/attacks.js';
import { createBattle, MAX_ENERGIE } from '../core/battle.js';
import { kraftFuerWelt } from '../data/kraefte.js';
import { calculateStars, getBossKraft, getDeck } from '../core/state.js';
import { attackeMitLevel, monsterMitFortschritt } from '../core/progression.js';
import { siegBelohnung } from '../core/belohnung.js';
import { fortschrittMelden } from '../core/aufgaben.js';
import { spieleBeute, spieleKlang, spieleTreffer } from '../core/audio.js';
import { SELTENHEITEN } from '../data/items.js';
import { applyRegion, createArenaLayers, createScenery } from '../ui/scenery.js';
import { balkenFuellen, createStars } from '../ui/hud.js';
import { createSprite, spieleBildfolge } from '../ui/sprite.js';
import { bildschirmBeben, energiestrahl, karteWeg, konfetti, trefferFunke } from '../ui/effekte.js';

let battle = null; // laufender Kampf, damit unmount() ihn stoppen kann
let resultTimer = null; // wartet kurz, bevor das Ergebnisfenster erscheint
const klangTimer = []; // geplante Klaenge, damit sie beim Verlassen verstummen
let bildfolgeStoppen = () => {}; // bricht eine laufende Angriffsanimation ab
let handSperreTimer = null; // Doppeltap-Sperre nach dem Kartenspiel

/**
 * Wartezeit zwischen dem letzten Treffer und dem Ergebnisfenster.
 * Ohne sie erscheint das Fenster, während der Lebensbalken noch leerläuft -
 * dann sieht es so aus, als hätte der Gegner noch Leben gehabt.
 */
const ERGEBNIS_VERZOEGERUNG = 750;

/**
 * Ab diesem Energiepreis gilt eine Attacke als grosse Attacke: Timo schiesst
 * dann einen Energiestrahl statt zuzuschlagen. Darunter gibt es den
 * Nahkampf. Zahl aendern = Grenze verschieben.
 */
const ANGRIFF_AB_ENERGIE = 5;

export const battleScreen = {
  // Jede Welt hat ihre eigene Musik.
  musik: (params) => getLevel(params.levelId)?.music ?? 'menue',

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
    // Die getragene Boss-Kraft (oder null) - siehe js/data/kraefte.js.
    const bossKraft = getBossKraft();
    // Ist der Gegner ein Boss, setzt er im Kampf seine eigene Signatur-Kraft
    // ein - dieselbe, die man beim Sieg über ihn freischaltet.
    const gegnerKraft = enemyMonster.isBoss ? kraftFuerWelt(enemyMonster.worldId) ?? null : null;

    /* ---------- 1. Grundgerüst bauen ---------- */
    const screen = document.createElement('div');
    screen.className = 'screen screen--battle';
    applyRegion(screen, level.scenery, getWorld(level.worldId));
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
          <span class="fighter-bar__name">${enemyMonster.name}${enemyMonster.variante ? ` <span class="fighter-bar__variante">${enemyMonster.variante}</span>` : ''}</span>
          <span class="fighter-bar__hp" id="enemy-hp-text"></span>
        </div>
        <div class="bar" id="enemy-hp-bar"><div class="bar__fill" id="enemy-hp-fill"></div></div>
        <div class="fighter-bar__energie">
          <span class="fighter-bar__energie-label">ENERGIE</span>
          <div class="pips pips--enemy pips--small" id="enemy-energie-pips"></div>
        </div>
        ${gegnerKraft
          ? `<div class="kraft-warnung" id="enemy-kraft" title="${gegnerKraft.name}: ${gegnerKraft.text}">
               <span class="kraft-warnung__label">${gegnerKraft.icon} ${gegnerKraft.name}</span>
               <div class="kraft-warnung__bar"><div class="kraft-warnung__fill" id="enemy-kraft-fill"></div></div>
             </div>`
          : ''}
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

      <section class="wert-leiste">
        <div class="wert-leiste__kopf">
          <span class="wert-leiste__titel">DEINE ENERGIE</span>
          <span class="wert-leiste__wert" id="energie-text">0 / ${MAX_ENERGIE}</span>
        </div>
        <div class="wert-leiste__reihe">
          <div class="pips" id="energie-pips"></div>
        </div>
      </section>

      <section class="hand" id="hand"></section>
      `
    );

    // Die Pixel-Figuren einsetzen (siehe js/ui/sprite.js)
    screen.querySelector('#enemy-sprite').appendChild(createSprite(enemyMonster));
    // Im Kampf zeigt Timo seine Kampfhaltung statt der Vorderansicht.
    screen.querySelector('#player-sprite').appendChild(
      createSprite(playerMonster, { bild: basis.bildKampf })
    );

    // Kulisse der Arena (Hügel, Wiese, Bäume, Kampfplatz) hinter die Monster legen
    screen.querySelector('#arena').prepend(...createArenaLayers());

    const ui = {
      enemyHpFill: screen.querySelector('#enemy-hp-fill'),
      enemyHpText: screen.querySelector('#enemy-hp-text'),
      enemyHpBar: screen.querySelector('#enemy-hp-bar'),
      enemySprite: screen.querySelector('#enemy-sprite'),
      enemyShield: screen.querySelector('#enemy-shield'),
      enemyKraft: screen.querySelector('#enemy-kraft'),
      enemyKraftFill: screen.querySelector('#enemy-kraft-fill'),
      playerHpFill: screen.querySelector('#player-hp-fill'),
      playerHpText: screen.querySelector('#player-hp-text'),
      playerHpBar: screen.querySelector('#player-hp-bar'),
      playerSprite: screen.querySelector('#player-sprite'),
      playerShield: screen.querySelector('#player-shield'),
      log: screen.querySelector('#battle-log'),
      energieText: screen.querySelector('#energie-text'),
      energieLeiste: screen.querySelector('.wert-leiste'),
      arena: screen.querySelector('#arena'),
      hand: screen.querySelector('#hand'),
    };

    const playerPips = createPips(screen.querySelector('#energie-pips'));
    const enemyPips = createPips(screen.querySelector('#enemy-energie-pips'));

    // Der Kraft-Knopf erscheint nur, wenn eine Boss-Kraft getragen wird.
    // Der Ring um ihn zeigt, wie voll die Kraft-Leiste ist (--kraft von 0..1).
    let kraftKnopf = null;
    if (bossKraft) {
      kraftKnopf = document.createElement('button');
      kraftKnopf.className = 'kraft-knopf';
      kraftKnopf.type = 'button';
      kraftKnopf.disabled = true;
      kraftKnopf.dataset.klang = 'keiner';
      kraftKnopf.setAttribute('aria-label', `${bossKraft.name}: ${bossKraft.text}`);
      kraftKnopf.innerHTML = `
        <span class="kraft-knopf__ring"></span>
        <span class="kraft-knopf__icon">${bossKraft.icon}</span>
      `;
      kraftKnopf.addEventListener('click', () => battle.useBossPower());
      screen.querySelector('.wert-leiste__reihe').appendChild(kraftKnopf);
      ui.energieLeiste.classList.add('hat-kraft');
    }

    /** Legt MAX_ENERGIE Punkte in einem Container an und gibt sie als Array zurück. */
    function createPips(container) {
      const pips = [];
      for (let i = 0; i < MAX_ENERGIE; i++) {
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
    // Merkt sich je Handplatz, ob die Karte zuletzt spielbar war - fuer den
    // kurzen Effekt, wenn sie es GERADE wird.
    const warBereit = [];

    /* Zwischenspeicher fuer render(): Die Kampfschleife laeuft mit 60 Bildern
       pro Sekunde. Ohne diese Speicher wuerde jeder Frame Texte, 20 Energie-
       punkte und alle Karten neu ins DOM schreiben - auch wenn sich nichts
       geaendert hat. Wir schreiben nur noch, was sich wirklich aendert. */
    const cacheEnemy = { hp: -1, maxHp: -1, shield: -1, low: null };
    const cachePlayer = { hp: -1, maxHp: -1, shield: -1, low: null };
    const cacheEnergie = { player: -1, enemy: -1 };
    let cacheEnergieText = '';
    let cacheVoll = null;
    let cacheKartenEnergie = -1;
    let cacheFinished = null;
    let cacheKraft = -1;
    let cacheKraftBereit = null;
    let cacheGegnerKraft = -1;
    let cacheFrozen = null; // für die Vereisung des Spieler-Sprites
    let cacheKartenFrozen = null; // für die Kartensperre bei Vereisung

    /* Kurze Sperre nach dem Kartenspiel: verhindert, dass ein zweiter, schneller
       Tap (Doppeltap) versehentlich die gerade nachgezogene Karte mitspielt. */
    const HAND_SPERRE = 220;
    let handGesperrt = false;
    // handSperreTimer liegt auf Modulebene, damit unmount() ihn löschen kann.
    handSperreTimer = null;

    battle = createBattle({
      playerMonster,
      enemyMonster,
      bossPower: bossKraft,
      enemyBossPower: gegnerKraft,
      onUpdate: render,
      onEvent: handleEvent,
      onEnd: showResult,
    });

    /* ---------- 3. Anzeige aktualisieren ---------- */
    function render(state) {
      renderFighter(ui.enemyHpBar, ui.enemyHpFill, ui.enemyHpText, ui.enemyShield, state.enemy, cacheEnemy);
      renderFighter(ui.playerHpBar, ui.playerHpFill, ui.playerHpText, ui.playerShield, state.player, cachePlayer);

      const energieText = `${state.player.energie} / ${MAX_ENERGIE}`;
      if (energieText !== cacheEnergieText) {
        ui.energieText.textContent = energieText;
        cacheEnergieText = energieText;
      }

      renderPips(playerPips, state.player, cacheEnergie, 'player');
      renderPips(enemyPips, state.enemy, cacheEnergie, 'enemy');

      // Volle Energie sichtbar machen: der Balken schimmert golden.
      const voll = state.player.energie >= MAX_ENERGIE && !state.finished;
      if (voll !== cacheVoll) {
        ui.energieLeiste.classList.toggle('is-voll', voll);
        cacheVoll = voll;
      }

      // Hand nur neu bauen, wenn sich die Karten geändert haben
      if (state.player.handVersion !== renderedHandVersion) {
        renderedHandVersion = state.player.handVersion;
        buildHand(state);
        cacheKartenEnergie = -1; // neue Karten einmal bewerten
      }

      // Der Spieler-Sprite zeigt die Vereisung an, solange sie anhält.
      if (state.playerFrozen !== cacheFrozen) {
        ui.playerSprite.classList.toggle('ist-gefroren', state.playerFrozen);
        cacheFrozen = state.playerFrozen;
      }

      // Bezahlbarkeit nur neu prüfen, wenn sich die Spielerenergie geändert hat
      // (oder das Ende bzw. die Vereisung - dann sind Karten gesperrt).
      if (
        state.player.energie !== cacheKartenEnergie ||
        state.finished !== cacheFinished ||
        state.playerFrozen !== cacheKartenFrozen
      ) {
        cardElements.forEach((card, index) => {
          const attack = kampfAttacke(state.player.hand[index]);
          const affordable = attack.cost <= state.player.energie && !state.finished && !state.playerFrozen;
          // Genau in dem Moment, in dem eine Karte spielbar wird, springt sie
          // kurz an - so sieht man sofort, was man jetzt einsetzen kann.
          if (affordable && warBereit[index] === false) flash(card, 'karte-bereit');
          warBereit[index] = affordable;
          card.classList.toggle('is-ready', affordable);
          card.classList.toggle('is-disabled', !affordable);
          card.disabled = !affordable;
        });
        cacheKartenEnergie = state.player.energie;
        cacheFinished = state.finished;
        cacheKartenFrozen = state.playerFrozen;
      }

      // Warnleiste des Gegners: zeigt, wie nah sein Spezial ist.
      if (ui.enemyKraftFill && state.gegnerKraft !== cacheGegnerKraft) {
        ui.enemyKraftFill.style.width = `${Math.round(state.gegnerKraft * 100)}%`;
        ui.enemyKraft.classList.toggle('is-voll', state.gegnerKraft >= 1);
        cacheGegnerKraft = state.gegnerKraft;
      }

      // Kraft-Leiste: Ring fuellen, Knopf freigeben sobald sie voll ist.
      if (kraftKnopf) {
        if (state.kraft !== cacheKraft) {
          kraftKnopf.style.setProperty('--kraft', state.kraft);
          cacheKraft = state.kraft;
        }
        const bereit = state.kraftBereit && !state.finished;
        if (bereit !== cacheKraftBereit) {
          kraftKnopf.classList.toggle('is-bereit', bereit);
          kraftKnopf.disabled = !bereit;
          cacheKraftBereit = bereit;
        }
      }
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

    /** Lebensbalken, Zahl und Schildanzeige eines Kämpfers - nur bei Änderung. */
    function renderFighter(bar, fill, text, shieldBadge, fighter, cache) {
      if (fighter.hp !== cache.hp || fighter.maxHp !== cache.maxHp) {
        const share = fighter.hp / fighter.maxHp;
        balkenFuellen(fill, share);
        text.textContent = `${fighter.hp} / ${fighter.maxHp}`;
        const low = share <= 0.3;
        if (low !== cache.low) {
          bar.classList.toggle('is-low', low);
          cache.low = low;
        }
        cache.hp = fighter.hp;
        cache.maxHp = fighter.maxHp;
      }

      if (fighter.shield !== cache.shield) {
        const hat = fighter.shield > 0;
        shieldBadge.classList.toggle('is-active', hat);
        if (hat) shieldBadge.querySelector('span').textContent = fighter.shield;
        cache.shield = fighter.shield;
      }
    }

    /**
     * Färbt die Energiepunkte eines Kämpfers.
     *
     * Die Klassen (voll/lädt) werden nur neu gesetzt, wenn sich die ganze
     * Energie geändert hat. Nur der EINE ladende Punkt bekommt jeden Frame
     * seinen Füllstand - das ist die einzige laufende Änderung.
     */
    function renderPips(pips, fighter, cache, key) {
      if (fighter.energie !== cache[key]) {
        pips.forEach((pip, index) => {
          pip.classList.toggle('is-filled', index < fighter.energie);
          pip.classList.toggle('is-charging', index === fighter.energie && fighter.energie < MAX_ENERGIE);
        });
        cache[key] = fighter.energie;
      }
      if (fighter.energie < MAX_ENERGIE) {
        pips[fighter.energie].style.setProperty('--charge', fighter.energieFortschritt);
      }
    }

    /** Baut die 4 Handkarten neu auf. */
    function buildHand(state) {
      ui.hand.innerHTML = '';
      cardElements.length = 0;
      // Neue Karten: der "wird spielbar"-Effekt startet frisch, damit er nicht
      // gleich beim Nachziehen fuer alle Karten auf einmal losgeht.
      warBereit.length = 0;

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
          // Kurz nach einem Kartenspiel gesperrt - so löst ein versehentlicher
          // Doppeltap nicht gleich die nachgezogene Karte mit aus.
          if (handGesperrt) return;

          const played = battle.playCard(index);
          if (!played) {
            // Nicht genug Energie: kurzes Wackeln als Rückmeldung.
            flash(card, 'shake');
            return;
          }

          // Die getippte Karte fliegt als Klon aus der Hand ...
          karteWeg(card);
          // ... und sofort neu zeichnen: das Original verschwindet auf der
          // Stelle, die neue Karte rückt nach. Das fühlt sich direkt an und
          // schließt die Lücke, in der ein Doppeltap zuschlagen könnte.
          handGesperrt = true;
          render(battle.state);
          handSperreTimer = setTimeout(() => {
            handGesperrt = false;
            handSperreTimer = null;
          }, HAND_SPERRE);
        });

        ui.hand.appendChild(card);
        cardElements.push(card);
      });
    }

    /* ---------- 4. Ereignisse: Log, Animationen, Zahlen ---------- */
    /** Spielt eine Bildfolge auf Timo ab - die vorige wird abgebrochen. */
    function spieleFolge(bilder) {
      if (!bilder?.length) return;
      bildfolgeStoppen();
      bildfolgeStoppen = spieleBildfolge(ui.playerSprite, bilder);
    }

    function handleEvent(event) {
      if (event.text) ui.log.textContent = event.text;

      switch (event.type) {
        case 'player-attack': {
          // Kleine Attacke = Nahkampf, grosse Attacke = Energiestrahl.
          const teuer = (event.attack?.cost ?? 0) >= ANGRIFF_AB_ENERGIE;
          spieleFolge(teuer ? basis.bildStrahl : basis.bildSchlag);
          // Teure Attacken schießen einen Energiestrahl quer über die Arena.
          if (teuer) energiestrahl(ui.playerSprite, ui.enemySprite, '#8fd0ff');
          flash(ui.playerSprite, 'lunge-right');
          flash(ui.enemySprite, 'hit');
          const anteilG = event.amount / (battle.state.enemy.maxHp || 1);
          floatNumber(ui.enemySprite, `-${event.amount}`, 'damage', anteilG, event.krit);
          // Ein Krit spritzt mehr Funken und lässt den Platz kräftiger beben.
          trefferFunke(ui.enemySprite, event.krit ? '#ff5a2c' : '#ffd76a', event.krit ? 12 : 7);
          bildschirmBeben(ui.arena, event.krit ? Math.max(anteilG, 0.3) : anteilG);
          spieleKlang('karte');
          if (event.krit) spieleKlang('trefferStark');
          else spieleTreffer(event.amount);
          // Zaehlt fuer die Tagesaufgaben.
          fortschrittMelden('attacke');
          fortschrittMelden('schaden', event.amount);
          break;
        }
        case 'enemy-attack': {
          if ((event.attack?.cost ?? 0) >= ANGRIFF_AB_ENERGIE) {
            energiestrahl(ui.enemySprite, ui.playerSprite, '#ff8a5a');
          }
          flash(ui.enemySprite, 'lunge-left');
          flash(ui.playerSprite, 'hit');
          const anteilP = event.amount / (battle.state.player.maxHp || 1);
          floatNumber(ui.playerSprite, `-${event.amount}`, 'damage', anteilP, event.krit);
          trefferFunke(ui.playerSprite, '#ff6a6a', event.krit ? 12 : 7);
          bildschirmBeben(ui.arena, event.krit ? Math.max(anteilP, 0.3) : anteilP);
          if (event.krit) spieleKlang('trefferStark');
          else spieleTreffer(event.amount);
          // Timo geht sichtbar in die Knie, wenn er einsteckt.
          spieleFolge(basis.bildTreffer);
          break;
        }
        case 'player-heal':
          flash(ui.playerSprite, 'heal');
          floatNumber(ui.playerSprite, `+${event.amount}`, 'heal');
          spieleKlang('heilung');
          break;
        case 'enemy-heal':
          flash(ui.enemySprite, 'heal');
          floatNumber(ui.enemySprite, `+${event.amount}`, 'heal');
          spieleKlang('heilung');
          break;
        case 'player-shield':
          floatNumber(ui.playerSprite, `🛡️ ${event.amount}`, 'shield');
          if (event.kraft) trefferFunke(ui.playerSprite, '#8fe3ff', 8);
          spieleKlang('schild');
          break;

        // ---------- Boss-Kräfte ----------
        case 'kraft': {
          // Die Ansage: die einsetzende Figur leuchtet auf, Funken, der Platz bebt.
          // Beim Gegner rot-violett (bedrohlich), beim Spieler golden.
          const gegner = event.seite === 'enemy';
          const sprite = gegner ? ui.enemySprite : ui.playerSprite;
          flash(sprite, 'heal');
          trefferFunke(sprite, gegner ? '#ff5ad0' : '#ffd76a', 12);
          bildschirmBeben(ui.arena, gegner ? 0.34 : 0.3);
          spieleKlang('levelauf');
          break;
        }
        case 'brand': {
          // Ein Brand-Tick: kleine orange Zahl, ein paar Funken, kein Beben -
          // auf der Figur, die gerade brennt.
          const sprite = event.seite === 'player' ? ui.playerSprite : ui.enemySprite;
          floatNumber(sprite, `-${event.amount}`, 'damage');
          trefferFunke(sprite, '#ff7a3c', 4);
          break;
        }
        case 'frost': {
          // Die getroffene Figur friert sichtbar ein - blau getönt, ohne Wippen.
          const sprite = event.seite === 'player' ? ui.playerSprite : ui.enemySprite;
          trefferFunke(sprite, '#8fe3ff', 8);
          // Die Vereisung des SPIELERS steuert render() über state.playerFrozen;
          // die des GEGNERS gibt es nur hier, also per Timer wieder auftauen.
          if (event.seite === 'enemy') {
            sprite.classList.add('ist-gefroren');
            setTimeout(() => sprite.classList.remove('ist-gefroren'), (event.dauer ?? 3) * 1000);
          }
          spieleKlang('schild');
          break;
        }
        case 'enemy-shield':
          floatNumber(ui.enemySprite, `🛡️ ${event.amount}`, 'shield');
          spieleKlang('schild');
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

    /**
     * Lässt eine Zahl über dem Monster aufsteigen.
     *
     * @param {number} [anteil] - Schadensanteil (0-1). Grosse Treffer werden
     *        groesser und rot-orange dargestellt.
     * @param {boolean} [krit] - kritischer Treffer: immer gross, mit "KRIT!".
     */
    function floatNumber(sprite, text, kind, anteil = 0, krit = false) {
      const number = document.createElement('span');
      const gross = krit || (kind === 'damage' && anteil >= 0.2) ? ' float-number--gross' : '';
      const kritKlasse = krit ? ' float-number--krit' : '';
      number.className = `float-number float-number--${kind}${gross}${kritKlasse}`;
      // Jede Zahl driftet ein Stueck zufaellig zur Seite, damit sich mehrere
      // nicht genau uebereinander stapeln.
      number.style.setProperty('--drift', `${(Math.random() * 2 - 1) * 16}px`);
      number.textContent = krit ? `KRIT! ${text}` : text;
      sprite.parentElement.appendChild(number);
      setTimeout(() => number.remove(), 1000);
    }

    /* ---------- 5. Kampfende ---------- */
    function showResult(result) {
      const state = battle.state;
      let stars = 0;
      let belohnung = null;

      if (result === 'win') {
        stars = calculateStars(state.player.hp, state.player.maxHp);
        // Berechnet und bucht Münzen, Erfahrung, Material und die Bosstruhe.
        belohnung = siegBelohnung(level, stars, basis.id);

        // Tagesaufgaben mitzaehlen.
        fortschrittMelden('sieg');
        if (stars >= 3) fortschrittMelden('dreiSterne');
        if (level.isBoss) fortschrittMelden('boss');
      }

      // Kurz warten, damit der letzte Treffer, die Schadenszahl und der
      // leerlaufende Lebensbalken noch zu sehen sind.
      resultTimer = setTimeout(
        () => buildResultOverlay(result, stars, belohnung),
        ERGEBNIS_VERZOEGERUNG
      );
    }

    function buildResultOverlay(result, stars, belohnung) {
      const newWorld = belohnung?.newWorld ?? null;
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="overlay__box">
          <div class="overlay__icon">${result === 'win' ? (level.isBoss ? '👑' : '🏆') : '💀'}</div>
          <h3 class="overlay__title">${result === 'win' ? 'Sieg!' : 'Niederlage'}</h3>
          <p class="overlay__text">
            ${result === 'win'
              ? `${enemyMonster.name} wurde besiegt.`
              : `${playerMonster.name} ist erschöpft. Versuch es noch einmal!`}
          </p>
          ${result === 'win' ? '<div class="belohnung" id="belohnung"></div>' : ''}
          ${belohnung?.xpErgebnis?.aufgestiegen
            ? `<p class="overlay__unlock">🌟 <strong>Level ${belohnung.xpErgebnis.levelNachher} erreicht!</strong></p>`
            : ''}
          ${belohnung?.neueKraft
            ? `<p class="overlay__unlock overlay__unlock--kraft">${belohnung.neueKraft.icon} <strong>Neue Boss-Kraft: ${belohnung.neueKraft.name}!</strong><br>${belohnung.neueKraft.text}<br><small>Ausrüsten unter „Figur“.</small></p>`
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
        fuelleBelohnung(overlay.querySelector('#belohnung'), belohnung.stuecke);
        // Konfetti zum Feiern - erst, wenn das Fenster steht.
        setTimeout(() => konfetti(box), 120);
      }

      // Erst die Fanfare, danach Aufstieg bzw. neue Welt - nicht alles auf einmal.
      spieleKlang(result === 'win' ? 'sieg' : 'niederlage');
      if (belohnung?.xpErgebnis?.aufgestiegen) {
        klangTimer.push(setTimeout(() => spieleKlang('levelauf'), 900));
      }
      if (newWorld) {
        klangTimer.push(setTimeout(() => spieleKlang('neueWelt'), 1500));
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

    /**
     * Zeigt die Belohnungen als Reihe von Feldern - eins nach dem anderen,
     * damit man jedes einzeln wahrnimmt.
     */
    function fuelleBelohnung(behaelter, stuecke) {
      stuecke.forEach((stueck, index) => {
        const seltenheit = SELTENHEITEN[stueck.seltenheit] ?? SELTENHEITEN.gewoehnlich;
        const feld = document.createElement('div');
        feld.className = 'loot-item';
        feld.style.setProperty('--rarity', seltenheit.farbe);
        // Jedes Feld erscheint 90 ms nach dem vorigen.
        feld.style.animationDelay = `${index * 0.09}s`;
        // Klang genau dann, wenn das Feld aufpoppt.
        klangTimer.push(
          setTimeout(() => {
            if (stueck.art === 'muenzen') spieleKlang('muenze');
            else spieleBeute(stueck.seltenheit);
          }, 250 + index * 90)
        );
        feld.innerHTML = `
          <span class="loot-item__icon">${stueck.icon}</span>
          <span class="loot-item__name">${stueck.name}</span>
        `;
        behaelter.appendChild(feld);
      });
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
    // Sonst erklaenge die Fanfare noch auf dem naechsten Bildschirm.
    klangTimer.forEach((timer) => clearTimeout(timer));
    klangTimer.length = 0;
    // Die Handsperre nicht in den nächsten Kampf mitnehmen.
    if (handSperreTimer !== null) {
      clearTimeout(handSperreTimer);
      handSperreTimer = null;
    }
    bildfolgeStoppen();
    bildfolgeStoppen = () => {};
  },
};
