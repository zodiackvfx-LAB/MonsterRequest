/**
 * Die Lobby - wie bei Clash Royale.
 *
 * Unten liegt eine Leiste mit allen Menüpunkten. Die Seiten darüber liegen
 * nebeneinander: Man wischt nach links und rechts oder tippt auf einen
 * Punkt in der Leiste. In der Mitte liegt der Startbildschirm.
 *
 * Der Wechsel ist selbst gebaut (transform + Fingerverfolgung) statt mit
 * dem Scroll-Einrasten des Browsers - das wippte auf dem iPhone nach.
 *
 * Jede Seite ist ein ganz normaler Bildschirm (Shop, Deck, ...). Die Lobby
 * baut ihn nur in ihre Seite statt über den ganzen Bildschirm. Alles, was
 * diese Bildschirme können, funktioniert deshalb unverändert.
 *
 * Ruft ein Bildschirm showScreen('shop') o. Ä. auf, blättert die Lobby
 * einfach zu dieser Seite (siehe registerLobby in js/core/screens.js).
 *
 * NEUE SEITE = einen Eintrag in SEITEN ergänzen.
 */

import { gameState } from '../core/state.js';
import { startScreen } from './start.js';
import { shopScreen } from './shop.js';
import { monsterScreen } from './monster.js';
import { deckScreen } from './deck.js';
import { worldsScreen } from './worlds.js';
import { collectionScreen } from './collection.js';
import { settingsScreen } from './settings.js';

/**
 * Die Seiten von links nach rechts. id = Name des Bildschirms (wie in
 * js/main.js registriert); 'start' ist die mittlere Seite.
 */
export const SEITEN = [
  { id: 'shop', label: 'Shop', bild: 'bilder/menue/shop.png', screen: shopScreen },
  { id: 'monster', label: 'Figur', bild: 'bilder/menue/figur.png', screen: monsterScreen },
  { id: 'deck', label: 'Deck', bild: 'bilder/menue/deck.png', screen: deckScreen },
  { id: 'start', label: 'Start', icon: '⚔️', screen: startScreen },
  { id: 'worlds', label: 'Welten', bild: 'bilder/menue/welten.png', screen: worldsScreen },
  { id: 'collection', label: 'Sammlung', bild: 'bilder/menue/sammlung.png', screen: collectionScreen },
  { id: 'settings', label: 'Optionen', bild: 'bilder/menue/einstellungen.png', screen: settingsScreen },
];

/** Die Namen aller Seiten - js/core/screens.js leitet sie hierher um. */
export const LOBBY_SEITEN = SEITEN.map((seite) => seite.id);

/** Zustand der gerade gezeigten Lobby (es gibt immer nur eine). */
let lobby = null;

export const lobbyScreen = {
  mount(root, params = {}) {
    const start = Math.max(0, LOBBY_SEITEN.indexOf(params.tab ?? 'start'));

    const huelle = document.createElement('div');
    huelle.className = 'lobby';
    huelle.innerHTML = `
      <div class="lobby__seiten"></div>
      <nav class="lobby__leiste" aria-label="Hauptmenü"></nav>
    `;
    const seitenBereich = huelle.querySelector('.lobby__seiten');
    const leiste = huelle.querySelector('.lobby__leiste');

    // Je Seite ein leerer Behälter. Gebaut wird der Inhalt erst, wenn er
    // gebraucht wird - die aktive Seite sofort, die anderen kurz danach.
    const seiten = SEITEN.map((seite, index) => {
      const behaelter = document.createElement('section');
      behaelter.className = `lobby__seite lobby__seite--${seite.id}`;
      behaelter.setAttribute('aria-label', seite.label);
      seitenBereich.appendChild(behaelter);

      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = `lobby__tab${seite.id === 'start' ? ' lobby__tab--start' : ''}`;
      knopf.setAttribute('aria-label', seite.label);
      knopf.innerHTML = `
        <span class="lobby__tab-symbol">${seite.bild ? `<img src="${seite.bild}" alt="" draggable="false">` : seite.icon}</span>
        <span class="lobby__tab-name">${seite.label}</span>
      `;
      knopf.addEventListener('click', () => blaettern(index));
      leiste.appendChild(knopf);

      return { ...seite, behaelter, knopf, gebaut: false, stand: -1, params: {} };
    });

    root.appendChild(huelle);

    let aktiv = start;
    seiten[start].params = params.tabParams ?? {};

    /** Baut eine Seite (neu) - der alte Inhalt wird vorher sauber abgebaut. */
    function bauen(seite) {
      if (seite.gebaut) seite.screen.unmount?.();
      seite.behaelter.innerHTML = '';
      seite.screen.mount(seite.behaelter, seite.params);
      seite.gebaut = true;
      // Merken, welcher Spielstand gezeigt wird - ändert er sich (Münzen
      // ausgegeben, Figur gewechselt ...), wird die Seite beim nächsten
      // Besuch frisch gebaut.
      seite.stand = gameState.revision;
    }

    /** Markiert die aktive Seite in der Leiste. */
    function markieren(index) {
      seiten.forEach((seite, i) => {
        seite.knopf.classList.toggle('is-aktiv', i === index);
        seite.knopf.setAttribute('aria-current', i === index ? 'page' : 'false');
      });
    }

    /** Eine Seite ist angekommen: bei Bedarf frisch bauen. */
    function ankommen(index) {
      aktiv = index;
      markieren(index);
      const seite = seiten[index];
      if (!seite.gebaut || seite.stand !== gameState.revision) bauen(seite);
    }

    /* ---------- Seitenwechsel ----------
       Die Seiten liegen übereinander und werden per transform verschoben -
       ohne das Scroll-Einrasten des Browsers. Das hatte auf dem iPhone beim
       Antippen nachgewippt und geflackert. So läuft jeder Wechsel gleich:
       eine Seitenbreite, sanft, und nur die beiden beteiligten Seiten sind
       dabei sichtbar. */
    const GLEIT_MS = 300;
    let gleitTimer = null;
    const bewegt = () => !document.body.classList.contains('no-animations');

    /**
     * Legt jede Seite an ihren Platz: versatz in Seitenbreiten relativ zur
     * Mitte, zug = zusätzliche Fingerbewegung in Pixeln.
     */
    function lage(seite, versatz, zug = 0, sichtbar = true) {
      const el = seite.behaelter;
      el.style.visibility = sichtbar ? 'visible' : 'hidden';
      // Die ruhende, aktive Seite bekommt GAR KEIN transform - sonst würden
      // Fenster darin (position: fixed) nur noch die Seite statt den ganzen
      // Bildschirm abdecken.
      el.style.transform = versatz === 0 && zug === 0 ? 'none' : `translate3d(calc(${versatz * 100}% + ${zug}px), 0, 0)`;
    }

    /** Ruhezustand: nur die aktive Seite ist zu sehen. */
    function ruhen(index) {
      seitenBereich.classList.remove('ist-gleitend');
      seiten.forEach((seite, i) => lage(seite, i - index, 0, i === index));
    }

    /** Gleitet zu einer Seite. von = Seite, die gerade vorn ist. */
    function gleiten(von, nach, zug = 0) {
      clearTimeout(gleitTimer);
      ankommen(nach);
      if (!bewegt() || von === nach && zug === 0) {
        ruhen(nach);
        return;
      }
      const richtung = Math.sign(nach - von) || Math.sign(-zug) || 1;
      // Ausgangslage ohne Übergang: die Zielseite direkt NEBEN die aktuelle
      // legen - auch wenn sie in der Leiste weiter weg ist. So gleitet immer
      // genau eine Seite herein, nie ein Stapel Zwischenseiten.
      seitenBereich.classList.remove('ist-gleitend');
      seiten.forEach((seite, i) => {
        if (i === von) lage(seite, 0, zug, true);
        else if (i === nach) lage(seite, richtung, zug, true);
        else lage(seite, 0, 0, false);
      });
      void seitenBereich.offsetWidth; // Ausgangslage festschreiben
      seitenBereich.classList.add('ist-gleitend');
      if (von !== nach) lage(seiten[von], -richtung, 0, true);
      lage(seiten[nach], 0, 0.0001, true); // 0.0001: transform bleibt während des Gleitens gesetzt
      gleitTimer = setTimeout(() => ruhen(nach), GLEIT_MS + 30);
    }

    /** Tipp auf die Leiste. */
    function blaettern(index) {
      const ziel = Math.max(0, Math.min(seiten.length - 1, index));
      if (ziel === aktiv) return;
      gleiten(aktiv, ziel);
    }

    /* ---------- Wischen mit dem Finger ----------
       Waagrechte Bewegung verschiebt die Seiten mit; senkrechte bleibt dem
       Scrollen in der Seite überlassen (touch-action: pan-y im CSS). */
    let ziehen = null; // { x, y, zeit, richtungFest, waagrecht, dx }
    let gerade_gezogen = false;

    seitenBereich.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      // Liegt ein Fenster über der Seite (Truhe, Tauschen ...), nicht blättern.
      if (seiten[aktiv].behaelter.querySelector('.overlay')) return;
      ziehen = { x: event.clientX, y: event.clientY, zeit: performance.now(), waagrecht: null, dx: 0, id: event.pointerId };
    });

    seitenBereich.addEventListener('pointermove', (event) => {
      if (!ziehen || event.pointerId !== ziehen.id) return;
      const dx = event.clientX - ziehen.x;
      const dy = event.clientY - ziehen.y;
      if (ziehen.waagrecht === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        ziehen.waagrecht = Math.abs(dx) > Math.abs(dy);
        if (!ziehen.waagrecht) {
          ziehen = null; // senkrecht: das ist Scrollen, kein Blättern
          return;
        }
        seitenBereich.setPointerCapture?.(event.pointerId);
        clearTimeout(gleitTimer);
        seitenBereich.classList.remove('ist-gleitend');
      }
      // Am Rand (erste/letzte Seite) gibt es nur etwas Widerstand.
      const amRand = (dx > 0 && aktiv === 0) || (dx < 0 && aktiv === seiten.length - 1);
      ziehen.dx = amRand ? dx * 0.25 : dx;
      seiten.forEach((seite, i) => {
        const versatz = i - aktiv;
        lage(seite, versatz, ziehen.dx, Math.abs(versatz) <= 1);
      });
    });

    function loslassen(event) {
      if (!ziehen || event.pointerId !== ziehen.id) return;
      const { dx, waagrecht, zeit } = ziehen;
      ziehen = null;
      if (!waagrecht) return;
      gerade_gezogen = true;
      const breite = seitenBereich.clientWidth || 1;
      const tempo = Math.abs(dx) / Math.max(1, performance.now() - zeit); // Pixel je ms
      let ziel = aktiv;
      if (Math.abs(dx) > breite * 0.22 || (tempo > 0.45 && Math.abs(dx) > 24)) ziel = aktiv + (dx < 0 ? 1 : -1);
      ziel = Math.max(0, Math.min(seiten.length - 1, ziel));
      if (ziel === aktiv) {
        // Zurückfedern an die alte Stelle.
        if (bewegt()) {
          seitenBereich.classList.add('ist-gleitend');
          seiten.forEach((seite, i) => lage(seite, i - aktiv, 0.0001, Math.abs(i - aktiv) <= 1));
          gleitTimer = setTimeout(() => ruhen(aktiv), GLEIT_MS + 30);
        } else {
          ruhen(aktiv);
        }
      } else {
        gleiten(aktiv, ziel, dx);
      }
    }
    seitenBereich.addEventListener('pointerup', loslassen);
    seitenBereich.addEventListener('pointercancel', loslassen);

    // Nach einem Wisch darf der Finger beim Loslassen nichts antippen.
    seitenBereich.addEventListener(
      'click',
      (event) => {
        if (!gerade_gezogen) return;
        gerade_gezogen = false;
        event.stopPropagation();
        event.preventDefault();
      },
      true
    );
    seitenBereich.addEventListener('pointerdown', () => {
      gerade_gezogen = false;
    }, true);

    // Die gewünschte Seite sofort zeigen, die Nachbarn gleich danach bauen
    // (damit beim Wischen schon etwas zu sehen ist), den Rest im Leerlauf.
    bauen(seiten[start]);
    markieren(start);
    ruhen(start);
    const reihenfolge = SEITEN.map((_, i) => i)
      .filter((i) => i !== start)
      .sort((a, b) => Math.abs(a - start) - Math.abs(b - start));
    const vorbauTimer = [];
    reihenfolge.forEach((i, nr) => {
      vorbauTimer.push(
        setTimeout(() => {
          if (!seiten[i].gebaut) bauen(seiten[i]);
        }, 60 + nr * 70)
      );
    });

    lobby = {
      zeigen(name, tabParams = {}) {
        const index = LOBBY_SEITEN.indexOf(name);
        if (index < 0) return;
        const seite = seiten[index];
        seite.params = tabParams;
        // Ein Bildschirm, der sich selbst neu aufruft (z. B. der Shop nach
        // einer Truhe), wird frisch gebaut - genau wie früher.
        bauen(seite);
        blaettern(index);
      },
      abbauen() {
        vorbauTimer.forEach(clearTimeout);
        clearTimeout(gleitTimer);
        seiten.forEach((seite) => {
          if (seite.gebaut) seite.screen.unmount?.();
        });
      },
    };
  },

  /** Blättert zu einer Seite, ohne die Lobby neu zu bauen. */
  zeigeSeite(name, tabParams) {
    lobby?.zeigen(name, tabParams);
  },

  unmount() {
    lobby?.abbauen();
    lobby = null;
  },
};
