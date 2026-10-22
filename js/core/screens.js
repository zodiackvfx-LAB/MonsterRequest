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
let currentName = null;

/** Name des gerade gezeigten Screens (Seiten der Lobby heißen 'lobby'). */
export function aktuellerScreenName() {
  return currentName;
}

/** Legt fest, in welches Element die Screens gerendert werden. */
export function initScreens(element) {
  rootElement = element;
}

/** Macht einen Screen unter einem Namen bekannt. */
export function registerScreen(name, screen) {
  screens.set(name, screen);
}

/**
 * Die Lobby (js/screens/lobby.js): ein Bildschirm mit mehreren Seiten zum
 * Wischen. Wird einer dieser Seiten-Namen aufgerufen, öffnet sich die Lobby
 * auf dieser Seite - oder blättert dorthin, wenn sie schon zu sehen ist.
 */
let lobby = null; // { name, seiten: [...] }

/** Meldet die Lobby an: name = ihr Bildschirm, seiten = Namen ihrer Seiten. */
export function registerLobby(name, seiten) {
  lobby = { name, seiten };
}

/** Wechselt zum Screen mit diesem Namen. params wird an mount() durchgereicht. */
export function showScreen(name, params = {}) {
  if (lobby && lobby.seiten.includes(name)) {
    const lobbyScreen = screens.get(lobby.name);
    // Neu bauen erzwingen (z. B. nach dem Laden aus der Datenbank).
    if (currentScreen === lobbyScreen && !params.neu) {
      lobbyScreen.zeigeSeite(name, params);
      return;
    }
    params = { tab: name, tabParams: params };
    name = lobby.name;
  }

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
  currentName = name;
  screen.mount(rootElement, params);

  // Während der neue Bildschirm hereingleitet, nimmt er kurz keine Tipps an.
  // So löst ein schneller Doppeltipp (z. B. auf "Weiter") nicht gleich den
  // Knopf aus, der auf dem NEUEN Bildschirm an derselben Stelle liegt.
  const neu = rootElement.querySelector(':scope > .screen');
  if (neu && !document.body.classList.contains('no-animations')) {
    neu.classList.add('ist-im-uebergang');
    setTimeout(() => neu.classList.remove('ist-im-uebergang'), UEBERGANG_MS);
  }
}

/** So lange (ms) dauert der Auftritt eines Bildschirms (siehe .screen in css/ui.css). */
const UEBERGANG_MS = 260;
