/**
 * Tägliche Gratis-Truhen: eine Holztruhe und eine Goldtruhe, jede einmal am
 * Tag (Liste in ZEIT_TRUHEN, js/data/shop.js). Sie liegen nicht in den
 * Truhenplätzen, sondern werden beim Abholen direkt geöffnet. Danach ist die
 * Truhe bis Mitternacht (Uhrzeit des Geräts) weg.
 *
 * Diese Datei kennt nur Regeln - keine Anzeige (die steht in
 * js/screens/start.js). "jetzt" lässt sich mitgeben, damit die Regeln ohne
 * Warten testbar sind.
 */

import { ZEIT_TRUHEN, truheNachId } from '../data/shop.js';
import { gameState, saveProgress } from './state.js';

const TAG = 24 * 60 * 60 * 1000;

/** Der nächste Mitternachtszeitpunkt nach "jetzt" (Zeitzone des Geräts). */
export function naechsteMitternacht(jetzt = Date.now()) {
  const datum = new Date(jetzt);
  datum.setHours(24, 0, 0, 0);
  return datum.getTime();
}

/**
 * Der Zustand einer Zeit-Truhe.
 * @returns {{truhe: object, bereit: boolean, rest: number, dauer: number}|null}
 */
export function zeitTruheZustand(id, jetzt = Date.now()) {
  const eintrag = ZEIT_TRUHEN.find((z) => z.id === id);
  if (!eintrag) return null;
  const dauer = TAG;
  const ab = Number(gameState.zeitTruhen?.[id]) || 0;
  const rest = Math.max(0, ab - jetzt);
  return { truhe: truheNachId(id), bereit: rest === 0, rest, dauer };
}

/** Alle Zeit-Truhen in der Reihenfolge aus ZEIT_TRUHEN. */
export function alleZeitTruhen(jetzt = Date.now()) {
  return ZEIT_TRUHEN.map(({ id }) => zeitTruheZustand(id, jetzt));
}

/**
 * Holt eine bereite Truhe ab - die nächste gibt es ab Mitternacht.
 * @returns {object|null} die Truhe zum Öffnen - oder null, wenn sie noch
 *   nicht bereit ist
 */
export function zeitTruheAbholen(id, jetzt = Date.now()) {
  const zustand = zeitTruheZustand(id, jetzt);
  if (!zustand?.bereit) return null;
  if (!gameState.zeitTruhen || typeof gameState.zeitTruhen !== 'object') gameState.zeitTruhen = {};
  gameState.zeitTruhen[id] = naechsteMitternacht(jetzt);
  saveProgress();
  return zustand.truhe;
}
