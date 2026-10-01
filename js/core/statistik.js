/**
 * Statistik und Erfolge.
 *
 * Hier laufen die Zähler des Spiels zusammen (Siege, Krits, Schaden …) und
 * hier wird geprüft, ob dadurch ein Erfolg freigeschaltet wurde. Die Erfolge
 * selbst stehen als Daten in js/data/erfolge.js.
 *
 * Ablauf: Im Kampf werden die Zähler mit statErhoehen() hochgezählt. Am Ende
 * eines Kampfes (und nach dem Öffnen einer Truhe) ruft der Bildschirm
 * pruefeNeueErfolge() auf - neu erreichte Erfolge kommen als Liste zurück und
 * können gefeiert werden.
 */

import { gameState, saveProgress } from './state.js';
import { ERFOLGE } from '../data/erfolge.js';

/** Zählt einen Statistikwert hoch (nur im Speicher; gespeichert wird gebündelt). */
export function statErhoehen(key, menge = 1) {
  if (typeof gameState.statistik[key] !== 'number') return;
  gameState.statistik[key] += menge;
}

/** Ist der Fortschritt eines Erfolgs bei seinem Ziel angekommen? */
export function erfolgErreicht(erfolg) {
  return erfolg.wert() >= erfolg.ziel;
}

/** Wurde dieser Erfolg schon freigeschaltet (und gemerkt)? */
export function erfolgFrei(id) {
  return gameState.statistik.erfolge.includes(id);
}

/**
 * Prüft alle Erfolge und merkt die neu erreichten. Speichert NICHT selbst -
 * das erledigt der Aufrufer gebündelt mit statistikSpeichern().
 *
 * @returns {Array} die gerade eben freigeschalteten Erfolge (oft leer)
 */
export function pruefeNeueErfolge() {
  const neu = [];
  for (const erfolg of ERFOLGE) {
    if (!erfolgFrei(erfolg.id) && erfolgErreicht(erfolg)) {
      gameState.statistik.erfolge.push(erfolg.id);
      neu.push(erfolg);
    }
  }
  return neu;
}

/** Sichert Statistik und Erfolge im Spielstand (einmal je Kampf/Truhe). */
export function statistikSpeichern() {
  saveProgress();
}
