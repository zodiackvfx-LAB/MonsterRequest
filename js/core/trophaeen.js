/**
 * Trophäen gewinnen und verlieren.
 *
 * Die Werte und Ligen stehen in js/data/trophaeen.js. Diese Datei kennt nur
 * die Regeln - keine Anzeige. Gezeigt werden die Trophäen in der
 * Spielerleiste, im Ergebnisfenster und auf der Ranglisten-Seite.
 */

import { TROPHAEEN, TROPHAEEN_MAX, ligaVon, trophaeenFuerSieg } from '../data/trophaeen.js';
import { gameState, saveProgress } from './state.js';

/** Setzt die Trophäen und gibt zurück, was sich geändert hat. */
function setzen(neu) {
  const vorher = gameState.trophaeen;
  const nachher = Math.max(0, Math.min(TROPHAEEN_MAX, Math.round(neu)));
  gameState.trophaeen = nachher;
  gameState.trophaeenRekord = Math.max(gameState.trophaeenRekord ?? 0, nachher);
  saveProgress();

  const ligaVorher = ligaVon(vorher);
  const ligaNachher = ligaVon(nachher);
  return {
    vorher,
    nachher,
    aenderung: nachher - vorher,
    liga: ligaNachher,
    aufgestiegen: ligaNachher.ab > ligaVorher.ab,
  };
}

/**
 * Trophäen für einen Sieg im Abenteuer.
 * @param {object} level
 * @param {boolean} erstesMal - der erste Sieg in diesem Kampf?
 */
export function trophaeenSieg(level, erstesMal) {
  return setzen(gameState.trophaeen + trophaeenFuerSieg(level, erstesMal));
}

/**
 * Trophäen für eine Niederlage. Man fällt nie unter die Grenze der
 * eigenen Liga - wer sie einmal erreicht hat, steigt nicht wieder ab.
 */
export function trophaeenNiederlage() {
  const grenze = ligaVon(gameState.trophaeen).ab;
  return setzen(Math.max(grenze, gameState.trophaeen - TROPHAEEN.NIEDERLAGE));
}
