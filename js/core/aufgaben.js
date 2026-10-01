/**
 * Tägliche Aufgaben.
 *
 * Jeden Tag werden drei Aufgaben aus js/data/aufgaben.js gestellt. Welche
 * das sind, ergibt sich aus dem Datum - nicht aus Zufall. Damit bekommt man
 * beim Neuladen der Seite dieselben Aufgaben und kann sie nicht durch
 * Neustarten neu auswürfeln.
 *
 * Der Fortschritt wird von den Bildschirmen gemeldet, z. B. vom Kampf:
 *
 *     fortschrittMelden('sieg');
 *     fortschrittMelden('schaden', 17);
 *
 * Diese Datei kennt keine Anzeige - der Aufgabenbildschirm
 * (js/screens/daily.js) zeigt das Ergebnis an.
 */

import { AUFGABEN, AUFGABEN_PRO_TAG, getAufgabe } from '../data/aufgaben.js';
import { gameState, saveProgress } from './state.js';

/** Das heutige Datum als "JJJJ-MM-TT" in der Zeitzone des Geräts. */
export function heute(jetzt = new Date()) {
  const jahr = jetzt.getFullYear();
  const monat = String(jetzt.getMonth() + 1).padStart(2, '0');
  const tag = String(jetzt.getDate()).padStart(2, '0');
  return `${jahr}-${monat}-${tag}`;
}

/**
 * Eine einfache, gleichmäßige Zahl aus einem Text.
 * Immer derselbe Text ergibt immer dieselbe Zahl.
 */
function streuwert(text) {
  let wert = 2166136261;
  for (let i = 0; i < text.length; i++) {
    wert ^= text.charCodeAt(i);
    wert = Math.imul(wert, 16777619);
  }
  return wert >>> 0;
}

/**
 * Die Aufgaben-ids für einen bestimmten Tag.
 * Ohne Zufall: dasselbe Datum ergibt immer dieselben Aufgaben.
 */
export function aufgabenFuerTag(datum) {
  const offen = AUFGABEN.map((aufgabe) => aufgabe.id);
  const gewaehlt = [];

  for (let i = 0; i < AUFGABEN_PRO_TAG && offen.length > 0; i++) {
    const index = streuwert(`${datum}#${i}`) % offen.length;
    gewaehlt.push(offen.splice(index, 1)[0]);
  }

  return gewaehlt;
}

/**
 * Sorgt dafür, dass der Aufgabenstand zum heutigen Tag passt.
 * Ist ein neuer Tag angebrochen, werden Fortschritt und Belohnungen geleert.
 */
function tagPruefen(datum = heute()) {
  const stand = gameState.dailies;

  if (stand.datum !== datum) {
    stand.datum = datum;
    stand.aufgaben = aufgabenFuerTag(datum);
    stand.fortschritt = {};
    stand.abgeholt = [];
    saveProgress();
  } else if (!Array.isArray(stand.aufgaben) || stand.aufgaben.length === 0) {
    // Kann bei einem alten Spielstand vorkommen.
    stand.aufgaben = aufgabenFuerTag(datum);
    saveProgress();
  }

  return stand;
}

/**
 * Die heutigen Aufgaben mit ihrem Stand.
 * @returns {Array<{aufgabe: object, stand: number, fertig: boolean, abgeholt: boolean}>}
 */
export function getTagesAufgaben(datum = heute()) {
  const stand = tagPruefen(datum);

  return stand.aufgaben
    .map((id) => getAufgabe(id))
    .filter(Boolean)
    .map((aufgabe) => {
      const erreicht = Math.min(aufgabe.ziel, stand.fortschritt[aufgabe.id] ?? 0);
      return {
        aufgabe,
        stand: erreicht,
        fertig: erreicht >= aufgabe.ziel,
        abgeholt: stand.abgeholt.includes(aufgabe.id),
      };
    });
}

/**
 * Meldet Fortschritt für alle heutigen Aufgaben dieses Typs.
 *
 * @param {string} typ - z. B. 'sieg', 'schaden', 'truhe'
 * @param {number} [menge] - wie viel dazukommt (bei 'schaden' der Schaden)
 */
export function fortschrittMelden(typ, menge = 1) {
  const stand = tagPruefen();
  let etwasGeaendert = false;

  stand.aufgaben.forEach((id) => {
    const aufgabe = getAufgabe(id);
    if (!aufgabe || aufgabe.typ !== typ) return;

    const vorher = stand.fortschritt[id] ?? 0;
    if (vorher >= aufgabe.ziel) return; // schon voll - nicht weiterzählen

    stand.fortschritt[id] = Math.min(aufgabe.ziel, vorher + menge);
    etwasGeaendert = true;
  });

  if (etwasGeaendert) saveProgress();
}

/**
 * Holt die Belohnung einer erledigten Aufgabe ab.
 * @returns {{muenzen: number, material: number}|null} null, wenn nichts zu holen ist
 */
export function aufgabeAbholen(id) {
  const stand = tagPruefen();
  const aufgabe = getAufgabe(id);
  if (!aufgabe || !stand.aufgaben.includes(id)) return null;
  if (stand.abgeholt.includes(id)) return null;
  if ((stand.fortschritt[id] ?? 0) < aufgabe.ziel) return null;

  stand.abgeholt.push(id);
  gameState.coins += aufgabe.muenzen;
  gameState.materials += aufgabe.material;
  saveProgress();

  return { muenzen: aufgabe.muenzen, material: aufgabe.material };
}

/** Wie viele Belohnungen gerade abholbereit sind (für den Hinweispunkt im Menü). */
export function offeneBelohnungen() {
  return getTagesAufgaben().filter((eintrag) => eintrag.fertig && !eintrag.abgeholt).length;
}
