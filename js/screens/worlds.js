/**
 * Weltenauswahl: alle Welten aus js/data/worlds.js als große Fantasy-Karten
 * vor einer Landschaft mit Schloss, Bergen und Wasserfall.
 *
 * Eine neue Welt taucht hier automatisch auf - es muss nur ein Eintrag in
 * worlds.js ergänzt werden. Ihre Landschaft steht in
 * js/ui/weltbilder/szenen.js (ohne eigene Szene gibt es eine aus ihren
 * Farben).
 *
 * Dieser Bildschirm liest nur den Spielstand (freigeschaltet, Kämpfe,
 * Sterne) - er ändert nichts daran.
 */

import { showScreen } from '../core/screens.js';
import { WORLDS, fightsInWorld } from '../data/worlds.js';
import { createHud } from '../ui/hud.js';
import { bildEinsetzen, hintergrundBauen, symbolDefs, weltkarteBauen } from '../ui/weltbilder/karten.js';
import { qualitaetErmitteln } from '../ui/weltkarte/leben.js';
import { clearedInWorld, getTotalStars, isWorldCleared, isWorldUnlocked } from '../core/state.js';

let aufraeumen = () => {};

export const worldsScreen = {
  mount(root) {
    aufraeumen();
    const stufe = qualitaetErmitteln();
    const adressen = [];

    const screen = document.createElement('div');
    screen.className = `screen screen--page screen--welten wb--${stufe}`;
    screen.insertAdjacentHTML('afterbegin', symbolDefs());

    const hintergrund = hintergrundBauen(stufe, adressen);
    screen.appendChild(hintergrund.element);

    const kopf = document.createElement('header');
    kopf.className = 'wb-kopf';
    kopf.innerHTML = `
      <h2 class="wb-titel">
        <span class="wb-titel__zier" aria-hidden="true"></span>
        <span class="wb-titel__text">Welten</span>
        <span class="wb-titel__zier wb-titel__zier--r" aria-hidden="true"></span>
      </h2>
    `;
    screen.appendChild(kopf);

    const hud = createHud();
    hud.classList.add('wb-hud');
    screen.appendChild(hud);

    const liste = document.createElement('div');
    // --cards: Jede Karte bekommt ihre eigene, inhaltsabhängige Höhe.
    liste.className = 'page__content page__content--cards wb-liste';

    const karten = WORLDS.map((welt, i) => {
      const gesamt = fightsInWorld(welt);
      const karte = weltkarteBauen(
        welt,
        {
          offen: isWorldUnlocked(welt.id),
          geschafft: clearedInWorld(welt.id),
          gesamt,
          sterne: getTotalStars(welt.id),
          fertig: isWorldCleared(welt.id),
        },
        (w) => showScreen('map', { worldId: w.id })
      );
      karte.style.setProperty('--nr', String(i));
      liste.appendChild(karte);
      return { welt, karte };
    });

    screen.appendChild(liste);
    root.appendChild(screen);

    /* ---------- Landschaften erst laden, wenn sie gebraucht werden ----------
       Eine Karte bekommt ihr Bild, sobald sie in die Nähe des sichtbaren
       Bereichs kommt. Ihre Bewegungen laufen nur, solange sie zu sehen ist. */
    const zuKarte = new Map(karten.map((k) => [k.karte, k.welt]));
    const nahe = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          if (!e.isIntersecting) continue;
          bildEinsetzen(e.target, zuKarte.get(e.target), stufe, adressen);
          nahe.unobserve(e.target);
        }
      },
      { root: liste, rootMargin: '300px 0px' }
    );
    const sichtbar = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          e.target.classList.toggle('ist-sichtbar', e.isIntersecting);
          if (e.isIntersecting) e.target.classList.add('ist-da');
        }
      },
      { root: liste, threshold: 0.08 }
    );
    karten.forEach(({ karte }) => {
      nahe.observe(karte);
      sichtbar.observe(karte);
    });

    /* ---------- Parallaxe: Hintergrund geht beim Scrollen leicht mit ---------- */
    let geplant = false;
    const beimScrollen = () => {
      if (geplant) return;
      geplant = true;
      requestAnimationFrame(() => {
        geplant = false;
        hintergrund.verschieben(liste.scrollTop);
      });
    };
    liste.addEventListener('scroll', beimScrollen, { passive: true });

    aufraeumen = () => {
      nahe.disconnect();
      sichtbar.disconnect();
      liste.removeEventListener('scroll', beimScrollen);
      adressen.forEach((url) => URL.revokeObjectURL(url));
      aufraeumen = () => {};
    };
  },

  unmount() {
    aufraeumen();
  },
};
