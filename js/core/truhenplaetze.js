/**
 * Truhenplätze - wie bei Clash Royale.
 *
 * Gewonnene Truhen kommen in einen von 4 Plätzen. Jeder Platz ist in einem
 * von vier Zuständen:
 *
 *   leer     - nichts drin
 *   wartet   - eine Truhe liegt drin, das Freischalten ist noch nicht gestartet
 *   laeuft   - die Zeit läuft (immer nur bei EINER Truhe gleichzeitig)
 *   bereit   - fertig, die Truhe kann geöffnet werden
 *
 * Wer nicht warten will, öffnet sofort mit Münzen. Je weniger Zeit noch
 * fehlt, desto billiger (siehe sofortPreis).
 *
 * Diese Datei kennt nur Regeln - keine Anzeige. Die Plätze zeigt die
 * Startseite (js/screens/start.js). Die aktuelle Zeit kann jede Funktion
 * als "jetzt" mitbekommen - so lassen sich die Regeln ohne Warten testen.
 */

import { GRATIS_TRUHE_ID, SIEGE_PRO_GRATIS_TRUHE, SOFORT_MINDESTPREIS, SOFORT_WERT, truheNachId } from '../data/shop.js';
import { gameState, saveProgress } from './state.js';

const MINUTE = 60 * 1000;

/** Wie lange eine Truhe zum Freischalten braucht (Millisekunden). */
export function dauerVon(id) {
  return (truheNachId(id)?.minuten ?? 0) * MINUTE;
}

/**
 * Der Zustand eines Platzes.
 * @returns {{zustand: 'leer'|'wartet'|'laeuft'|'bereit', truhe?: object, rest?: number, dauer?: number}}
 */
export function platzZustand(index, jetzt = Date.now()) {
  const platz = gameState.truhenPlaetze[index];
  if (!platz) return { zustand: 'leer' };

  const truhe = truheNachId(platz.id);
  const dauer = dauerVon(platz.id);
  if (platz.bereitAb === null) return { zustand: 'wartet', truhe, rest: dauer, dauer };
  const rest = Math.max(0, platz.bereitAb - jetzt);
  return { zustand: rest > 0 ? 'laeuft' : 'bereit', truhe, rest, dauer };
}

/** Alle Plätze auf einmal - praktisch für die Anzeige. */
export function alleZustaende(jetzt = Date.now()) {
  return gameState.truhenPlaetze.map((_, i) => platzZustand(i, jetzt));
}

/** Läuft gerade bei einer Truhe die Zeit? */
export function freischaltenLaeuft(jetzt = Date.now()) {
  return alleZustaende(jetzt).some((p) => p.zustand === 'laeuft');
}

/** Wie viele Plätze sind frei? */
export function freiePlaetze() {
  return gameState.truhenPlaetze.filter((p) => !p).length;
}

/** Wie viele Truhen sind fertig und können sofort geöffnet werden? */
export function bereiteTruhen(jetzt = Date.now()) {
  return alleZustaende(jetzt).filter((p) => p.zustand === 'bereit').length;
}

/**
 * Legt eine gewonnene Truhe in den ersten freien Platz.
 *
 * @param {string} id
 * @param {object} [optionen]
 * @param {boolean} [optionen.warteschlange] - wenn alles voll ist, in die
 *   Warteschlange stellen statt abzulehnen (für die Bosstruhe)
 * @returns {'platz'|'warteschlange'|false}
 */
export function truheEinlagern(id, { warteschlange = false } = {}) {
  if (!truheNachId(id)) return false;
  const frei = gameState.truhenPlaetze.indexOf(null);
  if (frei >= 0) {
    gameState.truhenPlaetze[frei] = { id, bereitAb: null };
    saveProgress();
    return 'platz';
  }
  if (!warteschlange) return false;
  gameState.truhenWarteschlange.push(id);
  saveProgress();
  return 'warteschlange';
}

/**
 * Startet das Freischalten der Truhe in diesem Platz. Klappt nur, wenn sie
 * wartet und gerade keine andere Truhe läuft.
 */
export function freischaltenStarten(index, jetzt = Date.now()) {
  if (platzZustand(index, jetzt).zustand !== 'wartet' || freischaltenLaeuft(jetzt)) return false;
  const platz = gameState.truhenPlaetze[index];
  platz.bereitAb = jetzt + dauerVon(platz.id);
  saveProgress();
  return true;
}

/**
 * Was Sofort-Öffnen gerade kostet: der Anteil der noch fehlenden Zeit am
 * Wert der Truhe, aufgerundet. 0, wenn die Truhe schon bereit ist.
 */
export function sofortPreis(index, jetzt = Date.now()) {
  const { zustand, truhe, rest, dauer } = platzZustand(index, jetzt);
  if (zustand === 'leer' || zustand === 'bereit') return 0;
  const wert = SOFORT_WERT[truhe.id] ?? truhe.preis ?? 0;
  const anteil = dauer > 0 ? rest / dauer : 0;
  return Math.max(SOFORT_MINDESTPREIS, Math.ceil(wert * anteil));
}

/**
 * Nimmt die Truhe aus ihrem Platz, damit sie geöffnet werden kann.
 *
 * Ist sie noch nicht bereit, wird nur mit sofort: true geöffnet - dann
 * kostet es Münzen (sofortPreis). Danach rückt eine wartende Truhe nach.
 *
 * @returns {string|null} die id der Truhe, oder null (leer, nicht bereit,
 *   zu wenig Münzen)
 */
export function truheAusPlatz(index, { sofort = false, jetzt = Date.now() } = {}) {
  const { zustand, truhe } = platzZustand(index, jetzt);
  if (zustand === 'leer') return null;
  if (zustand !== 'bereit') {
    if (!sofort) return null;
    const preis = sofortPreis(index, jetzt);
    if (gameState.coins < preis) return null;
    gameState.coins -= preis;
  }

  gameState.truhenPlaetze[index] = null;
  nachruecken();
  saveProgress();
  return truhe.id;
}

/**
 * Füllt frei gewordene Plätze: erst die Warteschlange (Bosstruhen), dann
 * eine Gratis-Truhe, die auf einen Platz gewartet hat.
 */
export function nachruecken() {
  let frei = gameState.truhenPlaetze.indexOf(null);
  while (frei >= 0 && gameState.truhenWarteschlange.length) {
    gameState.truhenPlaetze[frei] = { id: gameState.truhenWarteschlange.shift(), bereitAb: null };
    frei = gameState.truhenPlaetze.indexOf(null);
  }
  if (frei >= 0 && gratisTruheWartet()) {
    gameState.truhenPlaetze[frei] = { id: GRATIS_TRUHE_ID, bereitAb: null };
    gameState.gratisTruheZaehler = 0;
  }
}

/** Ist eine Gratis-Truhe verdient, findet aber keinen freien Platz? */
export function gratisTruheWartet() {
  return (Number(gameState.gratisTruheZaehler) || 0) >= SIEGE_PRO_GRATIS_TRUHE;
}

/**
 * Restzeit als kurzer Text: "14:59" unter einer Stunde, sonst "2 Std 05".
 */
export function restText(ms) {
  const sekunden = Math.ceil(ms / 1000);
  const stunden = Math.floor(sekunden / 3600);
  const minuten = Math.floor((sekunden % 3600) / 60);
  const sek = sekunden % 60;
  if (stunden > 0) return `${stunden} Std ${String(minuten).padStart(2, '0')}`;
  return `${minuten}:${String(sek).padStart(2, '0')}`;
}

/** Dauer als Text für "Braucht ...": "15 Min", "1 Std", "3 Std". */
export function dauerText(ms) {
  const minuten = Math.round(ms / MINUTE);
  if (minuten < 60) return `${minuten} Min`;
  const stunden = minuten / 60;
  return `${Number.isInteger(stunden) ? stunden : stunden.toFixed(1).replace('.', ',')} Std`;
}
