/**
 * Die Lobby - wie bei Clash Royale.
 *
 * Unten liegt eine Leiste mit allen Menüpunkten. Die Seiten darüber liegen
 * nebeneinander: Man wischt nach links und rechts oder tippt auf einen
 * Punkt in der Leiste. In der Mitte liegt der Startbildschirm.
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
      knopf.addEventListener('click', () => blaettern(index, true));
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

    /**
     * Zu einer Seite springen (Tipp auf die Leiste).
     *
     * Bewusst KEIN weiches Scrollen: Das wischte sichtbar durch alle Seiten
     * dazwischen, die Hervorhebung hüpfte über jeden Punkt der Leiste, und
     * auf dem iPhone blieb es am Einrasten einzelner Seiten hängen. Stattdessen
     * springt die Lobby direkt hin, und die Zielseite gleitet kurz aus der
     * Richtung herein, aus der sie kommt.
     */
    let sprungTimer = null;
    function blaettern(index, sanft) {
      const ziel = Math.max(0, Math.min(seiten.length - 1, index));
      const richtung = Math.sign(ziel - aktiv);

      // Das Springen löst Scroll-Ereignisse aus - die sollen hier nichts
      // markieren oder bauen, das erledigt ankommen() direkt.
      springt = true;
      clearTimeout(sprungTimer);
      sprungTimer = setTimeout(() => {
        springt = false;
      }, 200);
      seitenBereich.scrollTo({ left: ziel * seitenBereich.clientWidth, behavior: 'auto' });
      ankommen(ziel);

      if (sanft && richtung !== 0 && !document.body.classList.contains('no-animations')) {
        const seite = seiten[ziel].behaelter;
        seite.style.setProperty('--rein-von', `${richtung * 28}px`);
        seite.classList.remove('lobby__seite--rein');
        void seite.offsetWidth; // Animation neu starten
        seite.classList.add('lobby__seite--rein');
        setTimeout(() => seite.classList.remove('lobby__seite--rein'), 320);
      }
    }

    // Wischen: Die Seiten rasten per CSS ein (scroll-snap). Hier wird nur
    // mitgezählt, welche Seite gerade vorn ist.
    let rafId = null;
    let ruheTimer = null;
    let springt = false; // true, solange ein Sprung per Tipp läuft
    function beimScrollen() {
      if (springt) return;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const index = Math.round(seitenBereich.scrollLeft / (seitenBereich.clientWidth || 1));
          markieren(index);
        });
      }
      // Erst wenn das Wischen zur Ruhe kommt, gilt die Seite als angekommen.
      clearTimeout(ruheTimer);
      ruheTimer = setTimeout(() => {
        const index = Math.round(seitenBereich.scrollLeft / (seitenBereich.clientWidth || 1));
        if (index !== aktiv || seiten[index].stand !== gameState.revision) ankommen(index);
      }, 140);
    }
    seitenBereich.addEventListener('scroll', beimScrollen, { passive: true });

    // Dreht man das Gerät, bleibt man auf derselben Seite.
    const beobachter = new ResizeObserver(() => {
      seitenBereich.scrollLeft = aktiv * seitenBereich.clientWidth;
    });
    beobachter.observe(seitenBereich);

    // Die gewünschte Seite sofort zeigen, die Nachbarn gleich danach bauen
    // (damit beim Wischen schon etwas zu sehen ist), den Rest im Leerlauf.
    bauen(seiten[start]);
    markieren(start);
    seitenBereich.scrollLeft = start * seitenBereich.clientWidth;
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
        blaettern(index, index !== aktiv);
      },
      abbauen() {
        vorbauTimer.forEach(clearTimeout);
        clearTimeout(ruheTimer);
        clearTimeout(sprungTimer);
        if (rafId !== null) cancelAnimationFrame(rafId);
        beobachter.disconnect();
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
