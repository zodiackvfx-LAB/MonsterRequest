/**
 * Karten-Level - wie bei Clash Royale.
 *
 * Jede Fähigkeit (Attacke) ist eine Karte mit einem Level von 1 bis 15.
 * Findet man sie in einer Truhe noch einmal, gibt es Kopien. Genug Kopien
 * heben die Karte automatisch ein Level höher. Wer nicht warten will, kann
 * ein Level auch mit Münzen und Material kaufen (Deckmenü) - das ist
 * absichtlich teuer.
 *
 * HIER STELLST DU DIE ABSTÄNDE EIN:
 *   KOPIEN_FUER_LEVEL[L] = Kopien für den Schritt von Level L auf L+1.
 *   Bis Level 15 sind es zusammen 76 Kopien - die ersten Level gehen
 *   schnell, die letzten brauchen Geduld.
 */

/** Höchstes Karten-Level. */
export const KARTEN_MAX_LEVEL = 15;

/** Kopien je Stufe: Index = aktuelles Level (Index 0 bleibt leer). */
export const KOPIEN_FUER_LEVEL = [0, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 8, 9, 10, 12];

/**
 * Wie viele Kopien eine Karte in einer Truhe bringt - je nach Seltenheit.
 * Gewöhnliche Karten kommen häufiger und in größeren Stapeln.
 */
export const KOPIEN_JE_SELTENHEIT = {
  gewoehnlich: [1, 2],
  selten: [1, 1],
  episch: [1, 1],
  legendaer: [1, 1],
};

/** Stärke je Level: +8 Prozent Schaden, Heilung und Schild pro Level. */
export const STAERKE_JE_LEVEL = 0.08;

/** Kopien, die für den nächsten Schritt fehlen (0 = schon auf Max). */
export function kopienFuer(level) {
  return level >= KARTEN_MAX_LEVEL ? 0 : KOPIEN_FUER_LEVEL[level] ?? 0;
}

/** Wie stark eine Karte auf diesem Level ist (Level 1 = 1,0; Level 15 = 2,12). */
export function levelFaktor(level) {
  return 1 + STAERKE_JE_LEVEL * (Math.max(1, level) - 1);
}

/**
 * Früher gab es nur 5 Level mit je +20 Prozent. Damit eine aufgewertete
 * Karte beim Umstieg nicht schwächer wird, bekommt sie das neue Level mit
 * (fast) derselben Stärke: altes Level 5 (2,07×) wird Level 14 (2,04×).
 */
export const ALTES_LEVEL_NEU = { 1: 1, 2: 4, 3: 7, 4: 10, 5: 14 };
