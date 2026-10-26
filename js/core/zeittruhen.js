/**
 * Tägliche Gratis-Truhen: eine Holztruhe und eine Goldtruhe, jede einmal am
 * Tag (Liste in ZEIT_TRUHEN, js/data/shop.js). Sie liegen nicht in den
 * Truhenplätzen, sondern werden beim Abholen direkt geöffnet.
 *
 * WANN GIBT ES SIE?
 * Nicht einfach ab Mitternacht, sondern ab dem ersten Spielstart des Tages
 * (Uhrzeit des Geräts): Wer an einem Tag zum ersten Mal ins Spiel kommt,
 * startet die Uhren. Die Holztruhe ist dann sofort da, die Goldtruhe nach
 * ihrer Wartezeit (2 Stunden). Abgeholt ist eine Truhe bis zum nächsten
 * Tag weg.
 *
 * Gespeichert in gameState.zeitTruhen:
 *   tag    - "JJJJ-MM-TT": an diesem Tag liefen die Uhren zuletzt los
 *   [id]   - Zeitpunkt (ms), ab dem die Truhe bereit ist, oder null =
 *            heute schon abgeholt
 *
 * Eine Truhe, die man nicht abholt, verfällt nicht: Am nächsten Tag ist
 * sie so früh bereit wie möglich - mehr als eine je Sorte gibt es nie.
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

/** Der Kalendertag von "jetzt" als "JJJJ-MM-TT" (Zeitzone des Geräts). */
export function tagVon(jetzt = Date.now()) {
  const d = new Date(jetzt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function speicher() {
  if (!gameState.zeitTruhen || typeof gameState.zeitTruhen !== 'object') gameState.zeitTruhen = {};
  return gameState.zeitTruhen;
}

/**
 * Erster Blick auf die Truhen an einem neuen Tag: Jetzt laufen die Uhren
 * los. Wird von selbst aufgerufen, sobald jemand nach den Truhen fragt
 * (der Startbildschirm tut das gleich beim Öffnen des Spiels).
 * @returns {boolean} true, wenn gerade ein neuer Tag begonnen hat
 */
export function tagesStart(jetzt = Date.now()) {
  const z = speicher();
  const heute = tagVon(jetzt);
  if (z.tag === heute) return false;
  ZEIT_TRUHEN.forEach(({ id, warten }) => {
    const neu = jetzt + warten;
    const alt = z[id];
    // Nicht abgeholt: bleibt (oder wird) so früh bereit wie möglich.
    z[id] = typeof alt === 'number' && Number.isFinite(alt) ? Math.min(alt, neu) : neu;
  });
  z.tag = heute;
  saveProgress();
  return true;
}

/**
 * Der Zustand einer Zeit-Truhe.
 * @returns {{truhe: object, bereit: boolean, geholt: boolean, rest: number, dauer: number}|null}
 *   geholt = heute schon abgeholt (morgen wieder); rest = Zeit bis bereit
 *   bzw. bis Mitternacht
 */
export function zeitTruheZustand(id, jetzt = Date.now()) {
  const eintrag = ZEIT_TRUHEN.find((z) => z.id === id);
  if (!eintrag) return null;
  tagesStart(jetzt);
  const ab = speicher()[id];
  if (ab === null) {
    return { truhe: truheNachId(id), bereit: false, geholt: true, rest: Math.max(0, naechsteMitternacht(jetzt) - jetzt), dauer: TAG };
  }
  // Nie länger als die Wartezeit - auch wenn die Uhr am Gerät verstellt wurde.
  const rest = Math.min(Math.max(0, (Number(ab) || 0) - jetzt), eintrag.warten);
  return { truhe: truheNachId(id), bereit: rest === 0, geholt: false, rest, dauer: eintrag.warten || TAG };
}

/** Alle Zeit-Truhen in der Reihenfolge aus ZEIT_TRUHEN. */
export function alleZeitTruhen(jetzt = Date.now()) {
  return ZEIT_TRUHEN.map(({ id }) => zeitTruheZustand(id, jetzt));
}

/**
 * Holt eine bereite Truhe ab - die nächste gibt es am nächsten Tag.
 * @returns {object|null} die Truhe zum Öffnen - oder null, wenn sie noch
 *   nicht bereit ist
 */
export function zeitTruheAbholen(id, jetzt = Date.now()) {
  const zustand = zeitTruheZustand(id, jetzt);
  if (!zustand?.bereit) return null;
  speicher()[id] = null;
  saveProgress();
  return zustand.truhe;
}
