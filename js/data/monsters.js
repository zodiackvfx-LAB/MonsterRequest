/**
 * Alle Monster des Spiels - Spielerkreaturen und Gegner.
 *
 * Felder:
 *   id            - eindeutiger Schlüssel
 *   name          - Anzeigename
 *   icon          - Platzhalter-Grafik (später durch eigene Bilder/Sprites ersetzbar)
 *   maxHp         - maximale Lebenspunkte
 *   deck          - GENAU 8 Attacken-ids (nur für Spielermonster nötig)
 *   attacks       - Attacken, aus denen der Gegner zufällig wählt
 *   attackDelay   - Sekunden zwischen zwei Gegnerangriffen (kleiner = schwerer)
 */
export const MONSTERS = {
  /* ---------- Spielermonster ---------- */
  glutwelpe: {
    id: 'glutwelpe',
    name: 'Glutwelpe',
    icon: '🐺',
    maxHp: 70,
    // Genau 8 Karten - das ist die Regel für jedes Spielermonster.
    deck: [
      'zuendfunke',
      'kratzer',
      'funkenflug',
      'rauchschild',
      'aschehieb',
      'glutbiss',
      'sengwirbel',
      'feuerstoss',
    ],
  },

  /* ---------- Gegner ---------- */
  moosgnubbel: {
    id: 'moosgnubbel',
    name: 'Moosgnubbel',
    icon: '🌱',
    maxHp: 55,
    attacks: ['sporenwolke', 'rankenpeitsche'],
    attackDelay: 3.0,
  },
  schlickhuepfer: {
    id: 'schlickhuepfer',
    name: 'Schlickhüpfer',
    icon: '🐸',
    maxHp: 75,
    attacks: ['schlickwelle', 'rankenpeitsche'],
    attackDelay: 2.6,
  },
  borkenwaechter: {
    id: 'borkenwaechter',
    name: 'Borkenwächter',
    icon: '🌳',
    maxHp: 120,
    attacks: ['wurzelschlag', 'borkenfaust', 'rankenpeitsche'],
    attackDelay: 2.2,
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
