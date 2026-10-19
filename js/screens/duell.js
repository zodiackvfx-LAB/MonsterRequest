/**
 * Die 2v2-Arena.
 *
 * Links Team Blau (du und dein Teamkamerad), rechts Team Rot (zwei
 * KI-Monster). Alle vier sind gleichzeitig zu sehen, jeder mit eigener
 * Lebensanzeige. Unten liegen DEINE Energie, DEINE Boss-Kraft und DEINE vier
 * Handkarten.
 *
 * ZIELE (ohne Extra-Menü): Tippe auf einen Gegner - oben auf seine Tafel
 * oder auf die Figur -, dann treffen deine Angriffe ihn (🎯). Tippe auf
 * dich oder deinen Teamkameraden, dann gehen Heilung und Schild dorthin
 * (💚). Jede Karte zeigt, worauf sie wirkt.
 *
 * Diese Datei ist reine Darstellung: Sie liest den Zustand aus der Sitzung
 * (js/core/duell-sitzung.js) und schickt Tipps als Aktionen dorthin. Ob eine
 * Aktion gilt, entscheidet die Engine (beim Gastgeber).
 */

import { showScreen } from '../core/screens.js';
import { getWorld } from '../data/worlds.js';
import { getAttack } from '../data/attacks.js';
import { getKraft } from '../data/kraefte.js';
import { DUELL, ROLLEN, SIGNALE, STATUS } from '../data/duell.js';
import { MAX_ENERGIE, zielArtVon } from '../core/duell.js';
import { attackeAufLevel } from '../core/progression.js';
import { stufenId } from '../data/attacks.js';
import { aktuelleSitzung } from '../core/duell-sitzung.js';
import { duellSterne } from '../core/duell-belohnung.js';
import { spieleBeute, spieleKlang, spieleTreffer } from '../core/audio.js';
import { vibriere } from '../core/haptik.js';
import { SELTENHEITEN } from '../data/items.js';
import { truheSvg } from '../ui/truhen.js';
import { applyRegion, createArenaLayers, createScenery } from '../ui/scenery.js';
import { balkenFuellen, createStars } from '../ui/hud.js';
import { createSprite, skinBild, spieleBildfolge } from '../ui/sprite.js';
import { bildschirmBeben, energiestrahl, karteWeg, konfetti, trefferFunke } from '../ui/effekte.js';
import { bewegungVon } from '../ui/kampfintro.js';
import { figurBild, sicher, skinAusProfil } from '../ui/duell-ansicht.js';
import { zeigeErfolgToast } from '../ui/toast.js';

/** Aufräumen beim Verlassen. */
let aufraeumen = [];

/** Rahmen der Handkarten nach Seltenheit (wie im Abenteuer). */
const RAHMEN = { gewoehnlich: 'standard', selten: 'silber', episch: 'gold', legendaer: 'glitzer' };
/** Ab diesem Preis schießt eine Figur einen Strahl statt zuzuschlagen. */
const STRAHL_AB = 5;
const KRAFT_KLANG = {
  schild: 'kraftSchild', schildbruch: 'kraftSchildbruch', brand: 'kraftBrand', frost: 'kraftFrost',
  lebensraub: 'kraftLebensraub', energiesturm: 'kraftEnergiesturm', energieraub: 'kraftEnergieraub',
};
/** Zeichen auf der Karte: worauf wirkt sie? */
const ZIEL_ZEICHEN = { gegner: '🎯', beideGegner: '🌊', arena: '🌊', verbuendeter: '💚', selbst: '💚', partner: '💚', beideVerbuendete: '💚' };
const MAX_ZAHLEN = 14;

export const duellScreen = {
  musik: () => getWorld(aktuelleSitzung()?.info.match?.setup?.welt ?? 1)?.music ?? 'menue',

  mount(root) {
    const sitzung = aktuelleSitzung();
    if (!sitzung?.info.match || !sitzung.matchState()) {
      setTimeout(() => showScreen('duell-lobby'), 0);
      return;
    }
    const setup = sitzung.info.match.setup;
    const matchId = sitzung.info.match.matchId;
    const ich = sitzung.meineFigur();
    const partnerId = ich === 'p1' ? 'p2' : 'p1';
    const welt = getWorld(setup.welt);
    const solo = sitzung.info.art === 'solo';
    const sparsam = document.body.classList.contains('no-animations') || (navigator.hardwareConcurrency ?? 8) <= 4 || (navigator.deviceMemory ?? 8) <= 2;
    const ids = ['p1', 'p2', 'g1', 'g2'];
    const defs = Object.fromEntries([...setup.team, ...setup.gegner].map((d) => [d.id, d]));
    const meineDef = defs[ich];
    const meineKraft = meineDef.kraft ? getKraft(meineDef.kraft) : null;

    /**
     * Wo eine Figur steht: die eigene immer vorne links, der Teamkamerad
     * dahinter; Gegner 1 hinten rechts, Gegner 2 vorne rechts.
     */
    const feldPlatz = (id) => (id === ich ? 'blau-vorne' : id.startsWith('p') ? 'blau-hinten' : id === 'g1' ? 'rot-hinten' : 'rot-vorne');

    /* ---------- 1. Grundgerüst ---------- */
    const screen = document.createElement('div');
    screen.className = 'screen screen--battle screen--duell';
    applyRegion(screen, welt.scenery, welt);
    screen.appendChild(createScenery({ skyOnly: true }));

    screen.insertAdjacentHTML('beforeend', `
      <header class="topbar">
        <button class="btn btn--ghost btn--small" id="btn-aufgeben" type="button" data-klang="keiner">‹&nbsp;Aufgeben</button>
        <h2 class="topbar__title" title="${sicher(welt.name)}">2v2 · ${welt.icon} Welt ${welt.id}${setup.bossDuell ? ' · 👑' : ''}</h2>
        <span class="topbar__spacer topbar__spacer--knopf duell-kopf-rechts">
          ${solo
            ? '<button class="btn btn--ghost btn--small pause-knopf" id="btn-pause" type="button" aria-label="Pause" data-klang="keiner">⏸</button>'
            : '<span class="duell-netz" id="netz" title="Verbindung"></span>'}
          <button class="btn btn--ghost btn--small duell-signal-knopf" id="btn-signal" type="button" aria-label="Team-Signal senden" data-klang="keiner">💬</button>
        </span>
      </header>

      <section class="duell-gegnerleiste">
        ${['g1', 'g2'].map((id) => `
          <button class="duell-plakette duell-plakette--rot" type="button" data-ziel="${id}" data-klang="keiner" aria-label="Ziel wählen">
            <span class="duell-plakette__kopf">
              <span class="duell-plakette__rolle" title="${ROLLEN[defs[id].rolle]?.name ?? ''}">${ROLLEN[defs[id].rolle]?.icon ?? ''}</span>
              <span class="duell-plakette__name">${sicher(defs[id].monster.name)}</span>
              <span class="duell-plakette__hp" data-hp></span>
            </span>
            <span class="bar"><span class="bar__fill" data-fill></span></span>
            <span class="duell-plakette__fuss">
              <span class="pips pips--enemy pips--small" data-pips></span>
              <span class="duell-plakette__schild" data-schild></span>
            </span>
            <span class="duell-plakette__status" data-status></span>
            <span class="duell-plakette__ansage" data-ansage><span data-ansage-text></span><span class="duell-plakette__ansage-fill" data-ansage-fill></span></span>
            <span class="duell-plakette__ziel" aria-hidden="true">🎯</span>
          </button>`).join('')}
      </section>

      <p class="duell-band" id="band" hidden></p>

      <div class="battlefield">
        <div class="arena duell-arena" id="arena">
          ${ids.map((id) => `
            <div class="stage duell-platz duell-platz--${feldPlatz(id)} ${id.startsWith('g') ? 'stage--enemy' : 'stage--player'}" data-platz="${id}">
              <span class="duell-mini"><span class="duell-mini__name">${id === ich ? 'Du' : sicher(defs[id].monster.name)}</span><span class="bar"><span class="bar__fill" data-mini></span></span></span>
              <div class="sprite${defs[id].rolle === 'boss' ? ' sprite--boss' : ''}" data-sprite="${id}"></div>
              <span class="duell-marker" aria-hidden="true"></span>
              <div class="platform"></div>
            </div>`).join('')}
          <p class="battle-log" id="battle-log"></p>
          <div class="duell-signale" id="signale" hidden>
            ${SIGNALE.map((s) => `<button class="duell-signale__knopf" type="button" data-signal="${s.id}" data-klang="keiner" title="${s.text}">${s.icon}</button>`).join('')}
          </div>
        </div>
      </div>

      <section class="duell-teamleiste">
        ${[ich, partnerId].map((id) => `
          <button class="duell-team-halb ${id === ich ? 'ist-ich' : 'ist-partner'}" type="button" data-freund="${id}" data-klang="keiner" aria-label="Verbündetes Ziel wählen">
            <span class="duell-team-halb__kopf">
              <span class="duell-team-halb__name">${id === ich ? 'Du' : sicher(defs[id].monster.name)}</span>
              <span class="duell-team-halb__hp" data-hp></span>
            </span>
            <span class="bar"><span class="bar__fill" data-fill></span></span>
            <span class="duell-team-halb__fuss">
              <span class="duell-plakette__status" data-status></span>
              <span class="duell-plakette__schild" data-schild></span>
              ${id === partnerId ? '<span class="duell-team-halb__kraft" data-kraft></span><span class="duell-team-halb__steuerung" data-steuerung></span>' : ''}
            </span>
            <span class="duell-plakette__ziel" aria-hidden="true">💚</span>
          </button>`).join('')}
        <button class="btn btn--small duell-wiederbeleben" id="btn-wiederbeleben" type="button" data-klang="keiner" hidden>💖 Wiederbeleben · ${DUELL.wiederbelebung.kosten}⚡</button>
      </section>

      <section class="wert-leiste">
        <div class="wert-leiste__kopf">
          <span class="wert-leiste__titel">DEINE ENERGIE</span>
          <span class="wert-leiste__wert" id="energie-text">0 / ${MAX_ENERGIE}</span>
        </div>
        <div class="wert-leiste__reihe"><div class="pips" id="energie-pips"></div></div>
      </section>

      <section class="hand" id="hand"></section>
    `);

    const arena = screen.querySelector('#arena');
    arena.prepend(...createArenaLayers());
    const ui = {
      log: screen.querySelector('#battle-log'),
      band: screen.querySelector('#band'),
      hand: screen.querySelector('#hand'),
      energieText: screen.querySelector('#energie-text'),
      energieLeiste: screen.querySelector('.wert-leiste'),
      battlefield: screen.querySelector('.battlefield'),
      wiederbeleben: screen.querySelector('#btn-wiederbeleben'),
      signale: screen.querySelector('#signale'),
      netz: screen.querySelector('#netz'),
    };

    // Die Figuren: Spieler mit Skin (auch der des Teamkameraden), Gegner mit
    // ihrer Ruhe-Bewegung (sie schweben, stampfen, flattern ...).
    const skins = {};
    const bildfolgeStopp = {};
    const platz = {};
    for (const id of ids) {
      const el = screen.querySelector(`[data-platz="${id}"]`);
      const sprite = el.querySelector(`[data-sprite="${id}"]`);
      platz[id] = { el, sprite, mini: el.querySelector('[data-mini]') };
      const def = defs[id];
      if (id.startsWith('p')) {
        const neuZeichnen = () => {
          skins[id] = skinAusProfil(def.skin);
          sprite.replaceChildren(figurBild(def.monster, skins[id], { kampf: true }));
        };
        skins[id] = skinAusProfil(def.skin, neuZeichnen);
        sprite.appendChild(figurBild(def.monster, skins[id], { kampf: true }));
        sprite.classList.add('idle-bob');
      } else {
        const koerper = document.createElement('span');
        koerper.className = `sprite__koerper ruhe--${bewegungVon(def.monster).ruhe}`;
        koerper.appendChild(createSprite(def.monster));
        sprite.appendChild(koerper);
      }
    }

    // Tafeln oben (Gegner) und unten (Team).
    const tafel = {};
    for (const id of ['g1', 'g2']) {
      const el = screen.querySelector(`.duell-plakette[data-ziel="${id}"]`);
      tafel[id] = {
        el,
        hp: el.querySelector('[data-hp]'),
        fill: el.querySelector('[data-fill]'),
        bar: el.querySelector('.bar'),
        status: el.querySelector('[data-status]'),
        schild: el.querySelector('[data-schild]'),
        ansage: el.querySelector('[data-ansage]'),
        ansageText: el.querySelector('[data-ansage-text]'),
        ansageFill: el.querySelector('[data-ansage-fill]'),
        pips: pipsAnlegen(el.querySelector('[data-pips]')),
      };
    }
    for (const id of [ich, partnerId]) {
      const el = screen.querySelector(`.duell-team-halb[data-freund="${id}"]`);
      tafel[id] = {
        el,
        hp: el.querySelector('[data-hp]'),
        fill: el.querySelector('[data-fill]'),
        bar: el.querySelector('.bar'),
        status: el.querySelector('[data-status]'),
        schild: el.querySelector('[data-schild]'),
        kraft: el.querySelector('[data-kraft]'),
        steuerung: el.querySelector('[data-steuerung]'),
      };
    }
    const meinePips = pipsAnlegen(screen.querySelector('#energie-pips'));

    function pipsAnlegen(behaelter) {
      return Array.from({ length: MAX_ENERGIE }, () => {
        const pip = document.createElement('span');
        pip.className = 'pip';
        behaelter.appendChild(pip);
        return pip;
      });
    }

    // Kraft-Knopf (nur mit getragener Boss-Kraft).
    let kraftKnopf = null;
    if (meineKraft) {
      kraftKnopf = document.createElement('button');
      kraftKnopf.className = 'kraft-knopf';
      kraftKnopf.type = 'button';
      kraftKnopf.disabled = true;
      kraftKnopf.dataset.klang = 'keiner';
      kraftKnopf.setAttribute('aria-label', `${meineKraft.name}: ${meineKraft.text}`);
      kraftKnopf.innerHTML = `<span class="kraft-knopf__ring"></span><span class="kraft-knopf__icon">${meineKraft.icon}</span>`;
      kraftKnopf.addEventListener('click', () => {
        const r = sitzung.aktion({ typ: 'kraft', ziel: zielGegner });
        if (!r.ok) blitz(kraftKnopf, 'shake');
      });
      screen.querySelector('.wert-leiste__reihe').appendChild(kraftKnopf);
      ui.energieLeiste.classList.add('hat-kraft');
    }

    /* ---------- 2. Ziele ---------- */
    let zielGegner = 'g1';
    let zielFreund = ich;

    // Die Markierung erscheint sofort beim Tippen, nicht erst im nächsten Bild.
    function zielGegnerSetzen(id) {
      zielGegner = id;
      cache.ziel = null;
      spieleKlang('tipp');
      render();
    }
    function zielFreundSetzen(id) {
      zielFreund = id;
      cache.ziel = null;
      spieleKlang('tipp');
      render();
    }
    screen.querySelectorAll('[data-ziel]').forEach((el) => el.addEventListener('click', () => zielGegnerSetzen(el.dataset.ziel)));
    screen.querySelectorAll('[data-freund]').forEach((el) => el.addEventListener('click', () => zielFreundSetzen(el.dataset.freund)));
    for (const id of ids) {
      platz[id].el.addEventListener('click', () => (id.startsWith('g') ? zielGegnerSetzen(id) : zielFreundSetzen(id)));
    }

    /* ---------- 3. Anzeige ---------- */
    const cache = { k: {}, hand: -1, energie: -1, kartenEnergie: -1, gesperrt: null, ziel: null, kraft: -1, kraftBereit: null, band: null, netz: null, wb: null, ende: false };
    let letzteHand = null;
    let karten = [];
    let handGesperrt = false;
    let handSperre = null;
    let rafId = null;
    let letzterZustand = { t: -1, wann: performance.now() };

    function render() {
      const state = sitzung.matchState();
      if (!state) return;
      const k = state.kaempfer;

      // Ziel fällt -> automatisch auf das andere.
      if (k[zielGegner]?.ko) zielGegner = ['g1', 'g2'].find((id) => !k[id].ko) ?? zielGegner;
      if (k[zielFreund]?.ko) zielFreund = ich;

      for (const id of ids) kaempferZeichnen(id, k[id]);

      // Zielmarkierungen
      const zielKey = `${zielGegner}|${zielFreund}`;
      if (zielKey !== cache.ziel) {
        cache.ziel = zielKey;
        for (const id of ids) {
          const gewaehlt = id === zielGegner || id === zielFreund;
          platz[id].el.classList.toggle('ist-ziel', gewaehlt);
          platz[id].el.classList.toggle('ist-ziel--freund', gewaehlt && id.startsWith('p'));
          tafel[id]?.el.classList.toggle('ist-ziel', gewaehlt);
        }
      }

      eigeneLeisteZeichnen(state, k[ich]);
      handZeichnen(state, k[ich]);
      partnerZeichnen(k);
      bandZeichnen();
    }

    function kaempferZeichnen(id, s) {
      const c = (cache.k[id] ??= {});
      const t = tafel[id];
      if (s.hp !== c.hp || s.maxHp !== c.maxHp) {
        const anteil = s.hp / (s.maxHp || 1);
        balkenFuellen(platz[id].mini, anteil);
        if (t) {
          balkenFuellen(t.fill, anteil);
          t.hp.textContent = `${s.hp}/${s.maxHp}`;
          t.bar.classList.toggle('is-low', anteil <= 0.3);
        }
        c.hp = s.hp;
        c.maxHp = s.maxHp;
      }
      if (t && s.shield !== c.shield) {
        t.schild.textContent = s.shield > 0 ? `🛡️${s.shield}` : '';
        c.shield = s.shield;
      }
      const statusKey = Object.keys(s.status).sort().join(',');
      if (statusKey !== c.status) {
        if (t) t.status.textContent = Object.keys(s.status).map((n) => STATUS[n]?.icon ?? '').join('');
        platz[id].sprite.classList.toggle('ist-gefroren', Boolean(s.status.gefroren));
        platz[id].sprite.classList.toggle('ist-betaeubt', Boolean(s.status.betaeubt));
        platz[id].el.classList.toggle('ist-verstaerkt', Boolean(s.status.verstaerkt));
        c.status = statusKey;
      }
      if (s.ko !== c.ko) {
        platz[id].el.classList.toggle('ist-ko', s.ko);
        t?.el.classList.toggle('ist-ko', s.ko);
        c.ko = s.ko;
      }
      // Gegner: Energie und Ankündigung.
      if (id.startsWith('g')) {
        if (s.energie !== c.energie) {
          t.pips.forEach((pip, i) => {
            pip.classList.toggle('is-filled', i < s.energie);
            pip.classList.toggle('is-charging', i === s.energie && s.energie < MAX_ENERGIE);
          });
          c.energie = s.energie;
        }
        if (s.energie < MAX_ENERGIE) t.pips[s.energie].style.setProperty('--charge', s.energieFortschritt);
        const an = s.ansage;
        const anKey = an ? `${an.name}|${an.ziel}` : '';
        if (anKey !== c.ansage) {
          t.el.classList.toggle('kuendigt-an', Boolean(an));
          t.ansageText.textContent = an ? `${an.icon} ${an.name}${an.ziel ? ` → ${an.ziel === ich ? 'DICH' : sicher(defs[an.ziel]?.monster.name ?? '')}` : ' → alle'}` : '';
          for (const pid of ['p1', 'p2']) {
            platz[pid].el.classList.toggle(`bedroht--${id}`, Boolean(an && (an.ziel === pid || !an.ziel)));
          }
          c.ansage = anKey;
        }
        if (an) t.ansageFill.style.setProperty('--fuellung', Math.max(0, 1 - an.rest / an.gesamt));
      }
    }

    function eigeneLeisteZeichnen(state, s) {
      // Beim Gast kommt der Zustand 8x pro Sekunde - der ladende Punkt wird
      // dazwischen weitergerechnet, damit er flüssig wächst.
      if (state.zeit !== letzterZustand.t) letzterZustand = { t: state.zeit, wann: performance.now() };
      const gesperrt = s.ko || s.status.betaeubt > 0 || s.status.gefroren > 0;
      const tempo = (s.energieProSekunde ?? 1) * (s.status.verlangsamt > 0 ? STATUS.verlangsamt.faktor : 1);
      const extra = gesperrt || state.ende ? 0 : ((performance.now() - letzterZustand.wann) / 1000) * tempo;
      const genau = Math.min(MAX_ENERGIE, s.energie + s.energieFortschritt + (solo || ich === 'p1' ? 0 : extra));
      const ganz = Math.min(MAX_ENERGIE, Math.floor(genau));
      if (ganz !== cache.energie) {
        meinePips.forEach((pip, i) => {
          pip.classList.toggle('is-filled', i < ganz);
          pip.classList.toggle('is-charging', i === ganz && ganz < MAX_ENERGIE);
        });
        ui.energieText.textContent = `${s.energie} / ${MAX_ENERGIE}`;
        ui.energieLeiste.classList.toggle('is-voll', s.energie >= MAX_ENERGIE);
        cache.energie = ganz;
      }
      if (ganz < MAX_ENERGIE) meinePips[ganz].style.setProperty('--charge', genau - ganz);
      if (kraftKnopf) {
        if (s.kraft !== cache.kraft) {
          kraftKnopf.style.setProperty('--kraft', s.kraft);
          cache.kraft = s.kraft;
        }
        const bereit = s.kraftBereit && !s.ko && !state.ende;
        if (bereit !== cache.kraftBereit) {
          kraftKnopf.classList.toggle('is-bereit', bereit);
          kraftKnopf.disabled = !bereit;
          cache.kraftBereit = bereit;
        }
      }
    }

    /** Eine Handkarte, wie sie wirkt: mit DEINEN Karten-Leveln und deinem Angriff. */
    function kampfAttacke(id, s) {
      const roh = getAttack(id);
      const level = meineDef.monster.kartenLevel?.[stufenId(id)] ?? 1;
      const a = attackeAufLevel(roh, level);
      return { ...a, damage: Math.round(a.damage * (s.damageFactor ?? 1)) };
    }

    function handZeichnen(state, s) {
      if (s.handVersion !== cache.hand || s.hand.join() !== letzteHand?.join()) {
        cache.hand = s.handVersion;
        handBauen(s);
        cache.kartenEnergie = -1;
      }
      const gesperrt = s.ko || s.status.betaeubt > 0 || s.status.gefroren > 0 || Boolean(state.ende);
      if (s.energie !== cache.kartenEnergie || gesperrt !== cache.gesperrt) {
        karten.forEach(({ el, attacke }) => {
          const ok = attacke.cost <= s.energie && !gesperrt;
          if (ok && el.classList.contains('is-disabled')) blitz(el, 'karte-bereit');
          el.classList.toggle('is-ready', ok);
          el.classList.toggle('is-disabled', !ok);
        });
        cache.kartenEnergie = s.energie;
        cache.gesperrt = gesperrt;
      }
    }

    function handBauen(s) {
      const neu = letzteHand ? s.hand.map((id, i) => id !== letzteHand[i]) : s.hand.map(() => false);
      letzteHand = [...s.hand];
      ui.hand.innerHTML = '';
      karten = s.hand.map((id, index) => {
        const attacke = kampfAttacke(id, s);
        const zielArt = zielArtVon(attacke);
        const flaeche = zielArt === 'beideGegner' || zielArt === 'arena';
        let effekt = flaeche ? `${Math.round(attacke.damage * DUELL.flaechenAnteil)}×2` : `${attacke.damage} SCH`;
        if (attacke.heal > 0) effekt = `+${attacke.heal} LP`;
        if (attacke.shield > 0) effekt = `${attacke.shield} Schild`;
        if (attacke.gift) effekt += ' ☠️';
        if (attacke.stun) effekt += ' 💫';
        const el = document.createElement('button');
        el.type = 'button';
        el.dataset.klang = 'keiner';
        el.className = `card card--${RAHMEN[attacke.seltenheit] ?? 'standard'}${neu[index] ? ' karte-gezogen' : ''}`;
        el.innerHTML = `
          <span class="card__cost">${attacke.cost}</span>
          <span class="card__ziel" title="${zielArt}">${ZIEL_ZEICHEN[zielArt] ?? '🎯'}</span>
          <span class="card__icon">${attacke.icon}</span>
          <span class="card__name">${sicher(attacke.name)}</span>
          <span class="card__effect">${effekt}</span>
        `;
        el.addEventListener('click', () => karteSpielen(index, el, attacke, zielArt));
        ui.hand.appendChild(el);
        return { el, attacke };
      });
    }

    function karteSpielen(index, el, attacke, zielArt) {
      if (handGesperrt || el.classList.contains('ist-unterwegs')) return;
      const state = sitzung.matchState();
      const s = state.kaempfer[ich];
      if (attacke.cost > s.energie || s.ko) {
        blitz(el, 'shake');
        spieleKlang('gesperrt');
        return;
      }
      const ziel = zielArt === 'gegner' ? zielGegner : zielArt === 'verbuendeter' ? zielFreund : null;
      const r = sitzung.aktion({ typ: 'karte', hand: index, karte: s.hand[index], ziel });
      if (!r.ok) {
        blitz(el, 'shake');
        return;
      }
      spieleKlang('karte');
      karteWeg(el);
      if (r.wartet) el.classList.add('ist-unterwegs');
      handGesperrt = true;
      clearTimeout(handSperre);
      handSperre = setTimeout(() => { handGesperrt = false; }, 220);
      render();
    }

    function partnerZeichnen(k) {
      const p = k[partnerId];
      const me = k[ich];
      const t = tafel[partnerId];
      const steu = p.steuerung;
      const steuKey = `${steu}|${p.ko}|${p.kraftBereit}`;
      if (steuKey !== cache.steu) {
        t.steuerung.textContent = p.ko ? '💤 K.O.' : steu === 'ki' && !solo ? '🤖 KI spielt' : steu === 'leer' ? '📡 getrennt' : steu === 'ki' ? '🤖' : '';
        const kraft = defs[partnerId].kraft ? getKraft(defs[partnerId].kraft) : null;
        t.kraft.textContent = kraft ? `${kraft.icon}${p.kraftBereit ? '✨' : ''}` : '';
        t.kraft.title = kraft ? `${kraft.name}${p.kraftBereit ? ' - bereit!' : ''}` : '';
        cache.steu = steuKey;
      }
      const wbMoeglich = p.ko && p.wiederbelebt < DUELL.wiederbelebung.proSpieler && !me.ko && !sitzung.matchState().ende;
      const wbKey = `${wbMoeglich}|${me.energie >= DUELL.wiederbelebung.kosten}`;
      if (wbKey !== cache.wb) {
        ui.wiederbeleben.hidden = !wbMoeglich;
        ui.wiederbeleben.disabled = me.energie < DUELL.wiederbelebung.kosten;
        cache.wb = wbKey;
      }
    }

    function bandZeichnen() {
      const info = sitzung.info;
      const text = info.hinweis ?? '';
      if (text !== cache.band) {
        ui.band.hidden = !text;
        ui.band.textContent = text;
        cache.band = text;
      }
      if (ui.netz) {
        const netz = info.verbindung !== 'verbunden' ? 'weg' : info.partnerOnline ? 'gut' : 'wackelt';
        if (netz !== cache.netz) {
          ui.netz.className = `duell-netz duell-netz--${netz}`;
          ui.netz.title = netz === 'gut' ? 'Verbunden' : netz === 'wackelt' ? 'Teamkamerad nicht erreichbar' : 'Keine Verbindung';
          cache.netz = netz;
        }
      }
    }

    ui.wiederbeleben.addEventListener('click', () => {
      const r = sitzung.aktion({ typ: 'wiederbeleben', ziel: partnerId });
      if (!r.ok) blitz(ui.wiederbeleben, 'shake');
    });

    /* ---------- 4. Ereignisse: Animation, Klang, Log ---------- */
    let zahlen = 0;

    function name(id) {
      if (id === ich) return 'Du';
      return defs[id]?.monster.name ?? '';
    }

    function blitz(el, klasse, dauer = 450) {
      if (!el) return;
      el.classList.remove(klasse);
      void el.offsetWidth;
      el.classList.add(klasse);
      setTimeout(() => el.classList.remove(klasse), dauer);
    }

    function zahl(id, text, art, gross = false) {
      if (zahlen >= MAX_ZAHLEN) return;
      zahlen += 1;
      const el = document.createElement('span');
      el.className = `float-number float-number--${art}${gross ? ' float-number--gross' : ''}`;
      el.style.setProperty('--drift', `${(Math.random() * 2 - 1) * 14}px`);
      el.textContent = text;
      platz[id].el.appendChild(el);
      setTimeout(() => {
        el.remove();
        zahlen -= 1;
      }, 1000);
    }

    /** Eine kurze Linie vom Angreifer zum Ziel - man sieht immer, wer wen trifft. */
    function linie(von, zu, team) {
      if (!platz[von] || !platz[zu] || sparsam) return;
      const a = platz[von].sprite.getBoundingClientRect();
      const b = platz[zu].sprite.getBoundingClientRect();
      const basis = arena.getBoundingClientRect();
      const x1 = a.left + a.width / 2 - basis.left;
      const y1 = a.top + a.height / 2 - basis.top;
      const x2 = b.left + b.width / 2 - basis.left;
      const y2 = b.top + b.height / 2 - basis.top;
      const el = document.createElement('span');
      el.className = `duell-linie duell-linie--${team}`;
      el.style.left = `${x1}px`;
      el.style.top = `${y1}px`;
      el.style.width = `${Math.hypot(x2 - x1, y2 - y1)}px`;
      el.style.transform = `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`;
      arena.appendChild(el);
      setTimeout(() => el.remove(), 420);
    }

    function blase(id, text, klasse = '') {
      const el = document.createElement('span');
      el.className = `duell-blase ${klasse}`;
      el.textContent = text;
      platz[id].el.appendChild(el);
      setTimeout(() => el.remove(), 2400);
    }

    function banner(text, klasse = '') {
      const el = document.createElement('div');
      el.className = `duell-banner ${klasse}`;
      el.textContent = text;
      arena.appendChild(el);
      setTimeout(() => el.remove(), 1700);
    }

    function figurAnimation(id, kosten) {
      const def = defs[id];
      if (!def?.monster.bildSchlag) return;
      const bilder = kosten >= STRAHL_AB ? def.monster.bildStrahl : def.monster.bildSchlag;
      bildfolgeStopp[id]?.();
      bildfolgeStopp[id] = spieleBildfolge(platz[id].sprite, bilder.map((b) => skinBild(b, skins[id])));
    }

    function ereignis(e) {
      switch (e.typ) {
        case 'karte': {
          const team = e.von.startsWith('p') ? 'blau' : 'rot';
          blitz(platz[e.von].sprite, team === 'blau' ? 'lunge-right' : 'lunge-left');
          if (team === 'blau') figurAnimation(e.von, e.kosten);
          if (e.kosten >= STRAHL_AB && !sparsam) {
            for (const z of e.ziele) if (z.startsWith(team === 'blau' ? 'g' : 'p')) energiestrahl(platz[e.von].sprite, platz[z].sprite, team === 'blau' ? defs[e.von].monster.strahlFarbe ?? '#8fd0ff' : '#ff8a5a');
          }
          if (e.von !== ich) ui.log.textContent = `${name(e.von)}: ${e.icon} ${e.name}`;
          break;
        }
        case 'treffer': {
          const zielEl = platz[e.ziel];
          if (!zielEl) break;
          const team = e.von?.startsWith('p') ? 'blau' : 'rot';
          if (e.von && e.quelle.art !== 'dot') linie(e.von, e.ziel, team);
          blitz(zielEl.sprite, 'hit');
          const anteil = e.menge / ((sitzung.matchState()?.kaempfer[e.ziel]?.maxHp) || 1);
          zahl(e.ziel, `${e.krit ? 'KRIT! ' : ''}-${e.menge}`, e.quelle.art === 'dot' ? (e.quelle.id === 'gift' ? 'gift' : 'damage') : 'damage', e.krit || anteil >= 0.2);
          if (e.quelle.art !== 'dot') {
            trefferFunke(zielEl.sprite, e.krit ? '#ff5a2c' : team === 'blau' ? '#ffd76a' : '#ff6a6a', sparsam ? 3 : e.krit ? 12 : 7);
            if (!sparsam) bildschirmBeben(arena, e.krit ? Math.max(anteil, 0.3) : anteil * 0.7);
            if (e.krit) spieleKlang('trefferStark');
            else spieleTreffer(e.menge);
            if (e.ziel === ich) {
              vibriere(e.krit ? 'krit' : 'treffer');
              const def = defs[ich];
              if (def.monster.bildTreffer) {
                bildfolgeStopp[ich]?.();
                bildfolgeStopp[ich] = spieleBildfolge(platz[ich].sprite, def.monster.bildTreffer.map((b) => skinBild(b, skins[ich])));
              }
            }
          } else if (!sparsam) {
            trefferFunke(zielEl.sprite, e.quelle.id === 'gift' ? '#7ee081' : '#ff7a3c', 3);
          }
          if (e.ziel.startsWith('p') && e.von) ui.log.textContent = `${name(e.von)} trifft ${e.ziel === ich ? 'dich' : name(e.ziel)}: ${e.menge}`;
          break;
        }
        case 'kombo': {
          banner('TEAM-KOMBO!', `duell-banner--kombo duell-banner--${e.team}`);
          trefferFunke(platz[e.ziel].sprite, e.team === 'blau' ? '#ffe27a' : '#ff6aa0', sparsam ? 5 : 16);
          spieleKlang('teamKombo');
          if (e.team === 'blau') vibriere('krit');
          break;
        }
        case 'heilung':
          blitz(platz[e.ziel].sprite, 'heal');
          zahl(e.ziel, `+${e.menge}`, 'heal');
          spieleKlang('heilung');
          break;
        case 'schild':
          zahl(e.ziel, `🛡️ ${e.menge}`, 'shield');
          spieleKlang('schild');
          break;
        case 'status':
          if (e.status !== 'gift' && e.status !== 'brand') blase(e.ziel, `${STATUS[e.status]?.icon ?? ''} ${STATUS[e.status]?.name ?? ''}`, 'duell-blase--status');
          break;
        case 'immun':
          zahl(e.ziel, 'IMMUN', 'shield');
          break;
        case 'energieentzug':
          zahl(e.ziel, `-${e.menge}⚡`, 'shield');
          break;
        case 'ansage':
          spieleKlang('ansage');
          ui.log.textContent = `⚠️ ${name(e.von)} lädt ${e.name} auf${e.ziel ? ` - Ziel: ${e.ziel === ich ? 'DU' : name(e.ziel)}` : ' - gegen euch beide'}!`;
          if (e.ziel === ich) vibriere('treffer');
          break;
        case 'unterbrochen':
          blase(e.ziel, '✋ Unterbrochen!', 'duell-blase--gut');
          spieleKlang('unterbrochen');
          break;
        case 'faehigkeit':
          blitz(platz[e.von].sprite, 'heal');
          ui.log.textContent = `${name(e.von)}: ${e.icon} ${e.name}`;
          break;
        case 'kraft': {
          const team = e.von.startsWith('p') ? 'blau' : 'rot';
          blitz(platz[e.von].sprite, 'heal');
          trefferFunke(platz[e.von].sprite, team === 'blau' ? '#ffd76a' : '#ff5ad0', sparsam ? 4 : 12);
          if (!sparsam) bildschirmBeben(arena, 0.3);
          spieleKlang(KRAFT_KLANG[e.art] ?? 'levelauf');
          ui.log.textContent = `${name(e.von)} setzt ${e.icon} ${e.name} ein!`;
          vibriere('kraft');
          break;
        }
        case 'ko':
          ui.log.textContent = e.ziel === ich ? '💤 Du bist kampfunfähig - dein Teamkamerad kann dich wiederbeleben!' : `💤 ${name(e.ziel)} ist kampfunfähig!`;
          spieleKlang('niederlage');
          break;
        case 'besiegt':
          blase(e.ziel, '💥 Besiegt!', 'duell-blase--gut');
          ui.log.textContent = `${name(e.ziel)} ist besiegt!`;
          break;
        case 'wiederbelebt':
          blitz(platz[e.ziel].sprite, 'heal');
          trefferFunke(platz[e.ziel].sprite, '#7ee06a', sparsam ? 4 : 14);
          zahl(e.ziel, `+${e.hp}`, 'heal', true);
          spieleKlang('wiederbelebung');
          ui.log.textContent = `💖 ${name(e.von)} belebt ${e.ziel === ich ? 'dich' : name(e.ziel)} wieder!`;
          break;
        case 'phase':
          banner('PHASE 2', 'duell-banner--phase');
          spieleKlang('bossPhase');
          if (!sparsam) bildschirmBeben(arena, 0.5);
          ui.log.textContent = `👑 ${name(e.von)} wird wütend - Vorsicht!`;
          break;
        case 'steuerung':
          if (e.ziel === partnerId && e.steuerung === 'ki' && !solo) ui.log.textContent = '🤖 Die KI spielt für deinen Teamkameraden.';
          break;
        case 'signal': {
          const s = SIGNALE.find((x) => x.id === e.signal);
          if (s) {
            blase(e.von, `${s.icon} ${s.text}`, 'duell-blase--signal');
            spieleKlang('signal');
            if (e.von !== ich && (e.signal === 'links' || e.signal === 'rechts')) platz[e.signal === 'links' ? 'g1' : 'g2'].el.classList.add('ist-signal');
            setTimeout(() => ['g1', 'g2'].forEach((id) => platz[id].el.classList.remove('ist-signal')), 2400);
          }
          break;
        }
        case 'abgelehnt': {
          // Der Gastgeber hat eine Karte des Gastes nicht angenommen.
          karten.forEach(({ el }) => el.classList.remove('ist-unterwegs'));
          if (e.grund !== 'karte-veraltet') spieleKlang('gesperrt');
          break;
        }
        default:
          break;
      }
    }
    aufraeumen.push(sitzung.ereignisse(ereignis));

    /* ---------- 5. Team-Signale ---------- */
    let signalSperre = 0;
    screen.querySelector('#btn-signal').addEventListener('click', () => {
      ui.signale.hidden = !ui.signale.hidden;
      spieleKlang('tipp');
    });
    ui.signale.querySelectorAll('[data-signal]').forEach((knopf) => knopf.addEventListener('click', (event) => {
      event.stopPropagation();
      const jetzt = performance.now();
      if (jetzt < signalSperre) return; // höchstens ein Signal pro Sekunde
      signalSperre = jetzt + 1000;
      sitzung.signal(knopf.dataset.signal);
      ui.signale.hidden = true;
    }));

    /* ---------- 6. Aufgeben, Pause ---------- */
    const aufgeben = screen.querySelector('#btn-aufgeben');
    let aufgebenBis = 0;
    aufgeben.addEventListener('click', () => {
      // Kein Extra-Menü: einmal tippen fragt nach, zweimal gibt auf.
      if (performance.now() > aufgebenBis) {
        aufgebenBis = performance.now() + 2500;
        aufgeben.textContent = 'Sicher? Tippen';
        spieleKlang('tipp');
        setTimeout(() => { aufgeben.innerHTML = '‹&nbsp;Aufgeben'; }, 2500);
        return;
      }
      spieleKlang('zurueck');
      sitzung.verlassen();
      showScreen('start');
    });

    let pauseOverlay = null;
    function pausieren() {
      if (!solo || pauseOverlay || sitzung.info.phase !== 'match') return;
      if (!sitzung.pausieren(true)) return;
      screen.classList.add('ist-pausiert');
      pauseOverlay = document.createElement('div');
      pauseOverlay.className = 'overlay overlay--pause';
      pauseOverlay.innerHTML = `
        <div class="overlay__box">
          <div class="overlay__icon">⏸</div>
          <h3 class="overlay__title">Pause</h3>
          <p class="overlay__text">Energie, Gegner und KI-Partner warten auf dich.</p>
          <div class="overlay__actions">
            <button class="btn btn--big btn--green" data-aktion="weiter" type="button">▶&nbsp;Fortsetzen</button>
            <button class="btn btn--ghost" data-aktion="raus" type="button">Aufgeben</button>
          </div>
        </div>`;
      pauseOverlay.querySelector('[data-aktion="weiter"]').addEventListener('click', fortsetzen);
      pauseOverlay.querySelector('[data-aktion="raus"]').addEventListener('click', () => {
        sitzung.verlassen();
        showScreen('start');
      });
      screen.appendChild(pauseOverlay);
    }
    function fortsetzen() {
      pauseOverlay?.remove();
      pauseOverlay = null;
      screen.classList.remove('ist-pausiert');
      sitzung.pausieren(false);
    }
    screen.querySelector('#btn-pause')?.addEventListener('click', () => {
      spieleKlang('tipp');
      pausieren();
    });
    const sichtwechsel = () => {
      if (document.hidden) pausieren();
    };
    document.addEventListener('visibilitychange', sichtwechsel);
    aufraeumen.push(() => document.removeEventListener('visibilitychange', sichtwechsel));

    /* ---------- 7. Ergebnis ---------- */
    let ergebnisOverlay = null;
    let ergebnisTimer = null;
    let ergebnisGezeigt = null;

    function ergebnisPruefen() {
      const info = sitzung.info;
      if (info.phase === 'lobby' || info.phase === 'countdown') {
        showScreen('duell-lobby');
        return;
      }
      if (info.phase === 'geschlossen') return;
      if (info.phase !== 'ergebnis' || !info.ergebnis) return;
      if (info.match?.matchId !== matchId) return;
      const key = `${info.ergebnis.laedt}`;
      if (ergebnisGezeigt === key) return;
      clearTimeout(ergebnisTimer);
      ergebnisTimer = setTimeout(() => {
        ergebnisGezeigt = key;
        ergebnisZeigen(info.ergebnis);
      }, ergebnisOverlay ? 0 : 800);
    }
    aufraeumen.push(sitzung.beobachten(ergebnisPruefen));

    function ergebnisZeigen({ ende, belohnung, laedt }) {
      const ergebnis = ende.ergebnis;
      const sieg = ergebnis === 'sieg';
      if (!ergebnisOverlay) {
        // Figuren jubeln oder sinken.
        for (const id of ['p1', 'p2']) platz[id].el.classList.add(sieg ? 'jubelt' : 'traurig');
        spieleKlang(sieg ? 'sieg' : 'niederlage');
        vibriere(sieg ? 'sieg' : 'niederlage');
      }
      ergebnisOverlay?.remove();
      const sterne = duellSterne(ende);
      const stat = ende.statistik ?? {};
      const zeile = (id) => {
        const s = stat[id] ?? {};
        return `<tr${id === ich ? ' class="ist-ich"' : ''}><th>${id === ich ? 'Du' : sicher(defs[id].monster.name)}</th><td>${s.schaden ?? 0}</td><td>${(s.teamHeilung ?? 0)}</td><td>${s.kombos ?? 0}</td><td>${s.besiegt ?? 0}</td></tr>`;
      };
      const titel = sieg ? 'Sieg!' : ergebnis === 'abbruch' ? 'Abgebrochen' : 'Niederlage';
      const text = sieg
        ? 'Beide Monster sind besiegt - starkes Teamwork!'
        : ergebnis === 'abbruch'
          ? sitzung.info.hinweis || 'Das Match wurde beendet.'
          : 'Euer Team ist erschöpft. Probiert es nochmal - vielleicht mit mehr Kombos!';
      ergebnisOverlay = document.createElement('div');
      ergebnisOverlay.className = `overlay overlay--ergebnis ${sieg ? 'overlay--sieg' : 'overlay--niederlage'}`;
      ergebnisOverlay.innerHTML = `
        <div class="overlay__box duell-ergebnis">
          <div class="ergebnis-kopf ${sieg ? 'ergebnis-kopf--sieg' : 'ergebnis-kopf--niederlage'}">
            <div class="overlay__icon ergebnis-kopf__icon">${sieg ? (setup.bossDuell ? '👑' : '🤝') : ergebnis === 'abbruch' ? '📡' : '🌙'}</div>
            <h3 class="overlay__title ergebnis-banner">${titel}</h3>
          </div>
          <p class="overlay__text">${sicher(text)}</p>
          ${ergebnis !== 'abbruch' ? `
            <table class="duell-statistik">
              <thead><tr><th></th><th title="Schaden">💥</th><th title="Teamkamerad geheilt">💚</th><th title="Team-Kombos">⚡</th><th title="Besiegte Gegner">💀</th></tr></thead>
              <tbody>${zeile('p1')}${zeile('p2')}</tbody>
            </table>
            <p class="kampf-dauer">⏱️ ${Math.floor((ende.zeit ?? 0) / 60)}:${String(Math.round(ende.zeit ?? 0) % 60).padStart(2, '0')} · Gegner besiegt: <strong>${ende.gegnerBesiegt ?? 0}/2</strong>${ende.teamKo ? ` · K.O.: ${ende.teamKo}` : ''}</p>` : ''}
          <div class="belohnung" data-belohnung></div>
          <p class="duell-klein" data-belohnung-text></p>
          <div class="overlay__actions">
            <button class="btn btn--big btn--green" data-aktion="nochmal" type="button">Nochmal</button>
            <button class="btn btn--ghost" data-aktion="start" type="button">Zum Start</button>
          </div>
        </div>`;
      const box = ergebnisOverlay.querySelector('.overlay__box');
      if (sieg) box.insertBefore(createStars(sterne), box.querySelector('.overlay__text'));
      const behaelter = ergebnisOverlay.querySelector('[data-belohnung]');
      const hinweis = ergebnisOverlay.querySelector('[data-belohnung-text]');
      if (laedt) hinweis.textContent = 'Belohnung wird verbucht …';
      else if (!belohnung || belohnung.keine) hinweis.textContent = ergebnis === 'abbruch' ? 'Ein abgebrochenes Match bringt keine Belohnung.' : '';
      else if (belohnung.schonVergeben) hinweis.textContent = 'Die Belohnung für dieses Match hast du schon bekommen.';
      else {
        belohnung.stuecke.forEach((stueck, i) => {
          const feld = document.createElement('div');
          feld.className = 'loot-item';
          feld.style.setProperty('--rarity', (SELTENHEITEN[stueck.seltenheit] ?? SELTENHEITEN.gewoehnlich).farbe);
          feld.style.animationDelay = `${i * 0.09}s`;
          feld.innerHTML = `<span class="loot-item__icon">${stueck.icon}</span><span class="loot-item__name">${stueck.name}</span>`;
          behaelter.appendChild(feld);
          setTimeout(() => (stueck.art === 'muenzen' ? spieleKlang('muenze') : spieleBeute(stueck.seltenheit)), 250 + i * 90);
        });
        if (belohnung.truhe) {
          behaelter.insertAdjacentHTML('afterend', `<div class="gewonnene-truhen"><div class="gewonnene-truhe">${truheSvg(belohnung.truhe.design)}<span class="gewonnene-truhe__name">🎁 ${belohnung.truhe.name} gewonnen!</span></div></div>`);
        }
        const teile = [];
        if (belohnung.tagesFaktor < 1) teile.push('Heute schon viele Siege - weitere bringen weniger.');
        if (belohnung.xpErgebnis?.aufgestiegen) teile.push(`🌟 Level ${belohnung.xpErgebnis.levelNachher} erreicht!`);
        hinweis.textContent = teile.join(' ');
        if (belohnung.neueErfolge?.length) zeigeErfolgToast(belohnung.neueErfolge);
        if (sieg) setTimeout(() => konfetti(box, sparsam ? 10 : 26), 120);
      }
      ergebnisOverlay.querySelector('[data-aktion="nochmal"]').addEventListener('click', () => {
        if (sitzung.info.phase === 'geschlossen') {
          showScreen('duell-lobby');
          return;
        }
        sitzung.zurLobby();
        showScreen('duell-lobby');
      });
      ergebnisOverlay.querySelector('[data-aktion="start"]').addEventListener('click', () => {
        sitzung.verlassen();
        showScreen('start');
      });
      screen.appendChild(ergebnisOverlay);
    }

    /* ---------- 8. Los ---------- */
    root.appendChild(screen);
    render();
    banner(`${welt.icon} KAMPF!`, 'duell-banner--start');
    ui.log.textContent = 'Tippe auf einen Gegner, um ihn anzuvisieren 🎯';

    function schleife() {
      render();
      rafId = requestAnimationFrame(schleife);
    }
    rafId = requestAnimationFrame(schleife);
    aufraeumen.push(() => {
      cancelAnimationFrame(rafId);
      clearTimeout(handSperre);
      clearTimeout(ergebnisTimer);
      Object.values(bildfolgeStopp).forEach((stopp) => stopp?.());
    });
    ergebnisPruefen();
  },

  unmount() {
    aufraeumen.forEach((fn) => fn());
    aufraeumen = [];
  },
};
