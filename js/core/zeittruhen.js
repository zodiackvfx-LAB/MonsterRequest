/**
 * Zeit-Truhen - Gratis-Truhen, die einfach mit der Zeit kommen.
 *
 * Alle 30 Minuten eine Holztruhe, jede Stunde eine Goldtruhe (einstellbar
 * in ZEIT_TRUHEN, js/data/shop.js). Sie liegen nicht in den Truhenplätzen,
 * sondern werden beim Abholen direkt geöffnet. Danach beginnt die Wartezeit
 * für die nächste.
 *
 * Diese Datei kennt nur Regeln - keine Anzeige (die steht in
 * js/screens/start.js). "jetzt" lässt sich mitgeben, damit die Regeln ohne
 * Warten testbar sind.
 */

import { ZEIT_TRUHEN, truheNachId } from '../data/shop.js';
import { gameState, saveProgress } from './state.js';

const MINUTE = 60 * 1000;

/**
 * Der Zustand einer Zeit-Truhe.
 * @returns {{truhe: object, bereit: boolean, rest: number, dauer: number}|null}
 */
export function zeitTruheZustand(id, jetzt = Date.now()) {
  const eintrag = ZEIT_TRUHEN.find((z) => z.id === id);
  if (!eintrag) return null;
  const dauer = eintrag.minuten * MINUTE;
  const ab = Number(gameState.zeitTruhen?.[id]) || 0;
  const rest = Math.max(0, ab - jetzt);
  return { truhe: truheNachId(id), bereit: rest === 0, rest, dauer };
}

/** Alle Zeit-Truhen in der Reihenfolge aus ZEIT_TRUHEN. */
export function alleZeitTruhen(jetzt = Date.now()) {
  return ZEIT_TRUHEN.map(({ id }) => zeitTruheZustand(id, jetzt));
}

/**
 * Holt eine bereite Zeit-Truhe ab und startet die Uhr für die nächste.
 * @returns {object|null} die Truhe zum Öffnen - oder null, wenn sie noch
 *   nicht bereit ist
 */
export function zeitTruheAbholen(id, jetzt = Date.now()) {
  const zustand = zeitTruheZustand(id, jetzt);
  if (!zustand?.bereit) return null;
  if (!gameState.zeitTruhen || typeof gameState.zeitTruhen !== 'object') gameState.zeitTruhen = {};
  gameState.zeitTruhen[id] = jetzt + zustand.dauer;
  saveProgress();
  return zustand.truhe;
}
