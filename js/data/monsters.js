/**
 * Alle Monster des Spiels - Spielerkreaturen und Gegner.
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
 *   deck          - genau 8 Attacken-ids aus js/data/attacks.js
 *
 * Nur für Gegner (steuert die KI):
 *   reactionTime  - Sekunden, die der Gegner zwischen zwei Entscheidungen
 *                   überlegt (kleiner = wacher, reagiert schneller)
 *   patience      - wie viele Sekunden er höchstens auf eine stärkere
 *                   Attacke wartet, statt sofort eine schwache zu spielen
 *                   (0 = haut alles sofort raus, 3 = sammelt für den grossen Schlag)
 */
export const MONSTERS = {
  /* ---------- Spielermonster ---------- */
  glutwelpe: {
    id: 'glutwelpe',
    name: 'Glutwelpe',
    icon: '🐺',
    maxHp: 100,
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
    deck: [
      'blattschnitt',
      'sporenwolke',
      'moosklatsche',
      'rankenpeitsche',
      'knospenstoss',
      'wurzelgriff',
      'sporenschleuder',
      'dornenranke',
    ],
    reactionTime: 1.2, // etwas träge
    patience: 1, // spart kaum, schlägt lieber klein zu
  },

  schlickhuepfer: {
    id: 'schlickhuepfer',
    name: 'Schlickhüpfer',
    icon: '🐸',
    maxHp: 80,
    deck: [
      'tropfschlag',
      'quakstoss',
      'sumpfblase',
      'schlickwelle',
      'klebezunge',
      'schlammstoss',
      'flutstoss',
      'schlammgeysir',
    ],
    reactionTime: 1.0,
    patience: 2,
  },

  borkenwaechter: {
    id: 'borkenwaechter',
    name: 'Borkenwächter',
    icon: '🌳',
    maxHp: 100,
    deck: [
      'splitterschlag',
      'asthieb',
      'borkenfaust',
      'rindenpanzer',
      'wurzelschlag',
      'dornenhagel',
      'stammstoss',
      'waldzorn',
    ],
    reactionTime: 0.8, // hellwach
    patience: 3, // sammelt geduldig für die grossen Attacken
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
