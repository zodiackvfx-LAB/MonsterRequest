/**
 * Haptik - kurzes Vibrieren als Rückmeldung im Kampf.
 *
 * Nutzt die Vibration-API des Browsers. Die gibt es vor allem auf Android;
 * iPhone und iPad unterstützen sie in Safari nicht - dort passiert einfach
 * nichts (und das ist völlig in Ordnung, das Spiel läuft normal weiter).
 *
 * Gesteuert wird alles über EINE Funktion: vibriere('treffer'). Die Muster
 * stehen hier als Daten, damit man sie leicht anpassen kann. Ein Muster ist
 * eine Zahl (Millisekunden) oder eine Liste [vibrieren, Pause, vibrieren, …].
 */

import { gameState } from './state.js';

/** Die Vibrations-Muster. Neue Rückmeldung = hier einen Eintrag ergänzen. */
const MUSTER = {
  treffer: 12, // normaler Treffer: ein kurzer Stups
  krit: [22, 30, 22], // kritischer Treffer: doppelter, kräftiger Schlag
  kraft: [15, 25, 15, 25, 40], // Boss-Kraft: ein aufbauendes Grollen
  sieg: [20, 40, 20, 40, 60], // Sieg: kleine Fanfare zum Fühlen
  niederlage: 60, // Niederlage: ein langes, dumpfes Brummen
};

/** Kann und darf das Gerät gerade vibrieren? */
function vibrationAn() {
  if (gameState.settings.vibration === false) return false;
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Löst ein Vibrations-Muster aus.
 * @param {string} name - Schlüssel aus MUSTER (unbekannt = passiert nichts)
 */
export function vibriere(name) {
  if (!vibrationAn()) return;
  const muster = MUSTER[name];
  if (muster === undefined) return;
  try {
    navigator.vibrate(muster);
  } catch {
    // Manche Browser werfen, wenn gerade keine Nutzeraktion läuft - egal.
  }
}
