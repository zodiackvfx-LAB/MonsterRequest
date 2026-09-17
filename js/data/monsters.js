/**
 * Die Monster des Spielers.
 *
 * Die Gegner stehen nicht hier, sondern werden in js/data/enemies.js aus
 * den Welten erzeugt. So bleibt diese Datei übersichtlich, auch wenn es
 * später 70 und mehr Gegner gibt.
 *
 * Spieler und Gegner sind gleich aufgebaut: Jeder hat ein Deck aus GENAU
 * 8 Attacken, 4 davon liegen im Kampf auf der Hand, und beide bekommen
 * 1 XP pro Sekunde (maximal 10).
 *
 * Felder:
 *   id            - eindeutiger Schlüssel
 *   name          - Anzeigename
 *   icon          - Platzhalter-Grafik (später durch eigene Bilder ersetzbar)
 *   maxHp         - maximale Lebenspunkte
 *   element       - Typ der Kreatur (für die Anzeige; Stärken/Schwächen folgen später)
 *   text          - kurze Beschreibung für Monster- und Sammlungsbildschirm
 *   deck          - genau 8 Attacken-ids aus js/data/attacks.js
 *
 */
export const MONSTERS = {
  /* ---------- Spielermonster ---------- */
  glutwelpe: {
    id: 'glutwelpe',
    name: 'Glutwelpe',
    icon: '🐺',
    element: 'Feuer',
    text: 'Ein junger Feuerwelpe. Mutig, vorlaut und immer als Erster im Kampf.',
    maxHp: 100,
    // Genau 8 Attacken - das ist die Regel für jedes Deck.
    deck: [
      'krallenhieb',
      'biss',
      'feuerball',
      'flammenstoss',
      'schutzschild',
      'feuersturm',
      'lavabombe',
      'meteor',
    ],
  },

};

/** Holt ein Monster per id - mit klarer Fehlermeldung, falls die id nicht existiert. */
export function getMonster(id) {
  const monster = MONSTERS[id];
  if (!monster) {
    throw new Error(`Unbekanntes Monster: "${id}" (siehe js/data/monsters.js)`);
  }
  return monster;
}

/** Das Monster, mit dem der Spieler startet. */
export const STARTER_MONSTER_ID = 'glutwelpe';
