/**
 * Winziger Screen-Manager.
 *
 * Ein Screen ist ein Objekt mit:
 *   mount(root, params) - baut seinen Inhalt in das übergebene Element
 *   unmount()           - optional: räumt auf (Timer stoppen, Events entfernen)
 *   musik               - optional: Name der Musikkategorie oder eine
 *                         Funktion (params) => Name. Ohne Angabe läuft die
 *                         Menümusik weiter (siehe js/data/musik.js).
 *
 * Neuer Screen = Datei in js/screens/ anlegen und in js/main.js registrieren.
 */

import { musikStarten } from './audio.js';

const screens = new Map();

let rootElement = null;
let currentScreen = null;

/** Legt fest, in welches Element die Screens gerendert werden. */
export function initScreens(element) {
  rootElement = element;
}

/** Macht einen Screen unter einem Namen bekannt. */
export function registerScreen(name, screen) {
  screens.set(name, screen);
}

/** Wechselt zum Screen mit diesem Namen. params wird an mount() durchgereicht. */
export function showScreen(name, params = {}) {
  const screen = screens.get(name);
  if (!screen) {
    throw new Error(`Unbekannter Screen: "${name}" (in js/main.js registrieren)`);
  }

  // Alten Screen sauber beenden, bevor der neue startet.
  if (currentScreen && typeof currentScreen.unmount === 'function') {
    currentScreen.unmount();
  }

  // Musik VOR dem Aufbau umstellen: läuft schon dieselbe Kategorie,
  // passiert nichts - so gibt es beim Blättern keine Aussetzer.
  musikStarten(typeof screen.musik === 'function' ? screen.musik(params) : screen.musik ?? 'menue');

  rootElement.innerHTML = '';
  currentScreen = screen;
  screen.mount(rootElement, params);
}
