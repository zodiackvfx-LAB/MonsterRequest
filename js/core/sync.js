/**
 * Bringt Browser und Datenbank beim Start auf denselben Stand.
 *
 * Hier treffen sich state.js (der Spielstand) und cloud.js (die Leitung).
 * Beide kennen sich nicht - das haelt sie einfach und einzeln testbar.
 *
 * ABLAUF BEIM START
 *   1. Das Spiel laedt wie immer zuerst den Stand aus dem Browser und ist
 *      sofort spielbar. Ohne Netz endet es hier.
 *   2. Im Hintergrund wird der Stand aus der Datenbank geholt.
 *   3. Gewonnen hat der hoehere Zaehler (revision). Ist der aus der
 *      Datenbank hoeher, wird er uebernommen und der Bildschirm neu
 *      gezeichnet. Sonst wandert der eigene Stand nach oben.
 */

import {
  cloudAktiv,
  cloudEreignisse,
  cloudJetztSenden,
  cloudLaden,
  cloudMerken,
  spielerIdSetzen,
} from './cloud.js';
import { gameState, spielstandUebernehmen } from './state.js';

/** Eine Kopie des Spielstands - damit spaetere Aenderungen sie nicht treffen. */
function kopie() {
  return JSON.parse(JSON.stringify(gameState));
}

/**
 * @param {() => void} [beiUebernahme] - wird gerufen, wenn der Stand aus der
 *        Datenbank gewonnen hat und der Bildschirm neu muss
 * @returns {Promise<'aus'|'geladen'|'gesendet'|'fehler'>}
 */
export async function cloudStart(beiUebernahme) {
  if (!cloudAktiv()) return 'aus';

  cloudEreignisse();

  try {
    const fremd = await cloudLaden();
    const hier = Number(gameState.revision) || 0;
    const dort = Number(fremd?.revision) || 0;

    if (fremd && dort > hier) {
      // Der Stand aus der Datenbank ist weiter. Nicht gleich wieder
      // hochschicken - er kommt ja von dort.
      spielstandUebernehmen(fremd, false);
      beiUebernahme?.();
      return 'geladen';
    }

    // Eigener Stand ist gleich weit oder weiter. Hochschicken, damit dieser
    // Spieler in der Datenbank auftaucht - auch beim allerersten Besuch.
    cloudMerken(kopie());
    await cloudJetztSenden();
    return 'gesendet';
  } catch (fehler) {
    // Ein Aussetzer der Datenbank darf das Spiel nicht aufhalten.
    console.warn('Abgleich mit der Datenbank fehlgeschlagen:', fehler);
    return 'fehler';
  }
}

/**
 * Uebernimmt einen Spielstand, der ueber einen Code geholt wurde.
 * Ab jetzt gehoert dieser Browser zu derselben Spielernummer.
 *
 * @param {{ id: string, daten: object }} ergebnis
 */
export function spielstandUebernehmenVonCode(ergebnis) {
  spielerIdSetzen(ergebnis.id);
  return spielstandUebernehmen(ergebnis.daten, false);
}
