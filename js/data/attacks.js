/**
 * Katalog aller Attacken im Spiel.
 *
 * Das sind reine Daten - hier balancierst du das Spiel, ohne Logik anzufassen.
 *
 * Felder:
 *   id      - eindeutiger Schlüssel (muss mit dem Objekt-Schlüssel übereinstimmen)
 *   name    - Anzeigename auf der Karte
 *   cost    - XP-Kosten (1 bis 10, siehe MAX_XP in js/core/battle.js)
 *   damage  - Schaden am Gegner (0, wenn die Attacke nur heilt)
 *   heal    - Heilung für den eigenen Charakter (optional)
 *   icon    - Platzhalter-Grafik (später durch eigene Bilder ersetzbar)
 *   text    - kurze Beschreibung für die Karte
 */
export const ATTACKS = {
  zuendfunke: {
    id: 'zuendfunke',
    name: 'Zündfunke',
    cost: 1,
    damage: 5,
    icon: '✨',
    text: 'Billig und schnell.',
  },
  kratzer: {
    id: 'kratzer',
    name: 'Kratzer',
    cost: 1,
    damage: 6,
    icon: '🪶',
    text: 'Schneller Hieb ohne Aufwärmen.',
  },
  funkenflug: {
    id: 'funkenflug',
    name: 'Funkenflug',
    cost: 2,
    damage: 10,
    icon: '🔥',
    text: 'Solider Standardangriff.',
  },
  rauchschild: {
    id: 'rauchschild',
    name: 'Rauchschild',
    cost: 2,
    damage: 0,
    heal: 12,
    icon: '🛡️',
    text: 'Heilt dich um 12 LP.',
  },
  aschehieb: {
    id: 'aschehieb',
    name: 'Aschehieb',
    cost: 3,
    damage: 14,
    icon: '🌑',
    text: 'Harter Nahkampfschlag.',
  },
  glutbiss: {
    id: 'glutbiss',
    name: 'Glutbiss',
    cost: 3,
    damage: 15,
    icon: '🦷',
    text: 'Beißt sich glutheiß fest.',
  },
  sengwirbel: {
    id: 'sengwirbel',
    name: 'Sengwirbel',
    cost: 4,
    damage: 20,
    icon: '🌪️',
    text: 'Wirbelnder Flammensturm.',
  },
  feuerstoss: {
    id: 'feuerstoss',
    name: 'Feuerstoß',
    cost: 5,
    damage: 27,
    icon: '☄️',
    text: 'Teuer, aber verheerend.',
  },

  /* --- Gegner-Attacken --- */
  rankenpeitsche: {
    id: 'rankenpeitsche',
    name: 'Rankenpeitsche',
    cost: 2,
    damage: 7,
    icon: '🌿',
    text: 'Peitscht mit zähen Ranken.',
  },
  sporenwolke: {
    id: 'sporenwolke',
    name: 'Sporenwolke',
    cost: 2,
    damage: 5,
    icon: '🍄',
    text: 'Feiner, reizender Staub.',
  },
  wurzelschlag: {
    id: 'wurzelschlag',
    name: 'Wurzelschlag',
    cost: 3,
    damage: 11,
    icon: '🪵',
    text: 'Wurzeln brechen aus dem Boden.',
  },
  schlickwelle: {
    id: 'schlickwelle',
    name: 'Schlickwelle',
    cost: 3,
    damage: 9,
    icon: '💧',
    text: 'Eine Welle aus kaltem Schlamm.',
  },
  borkenfaust: {
    id: 'borkenfaust',
    name: 'Borkenfaust',
    cost: 4,
    damage: 14,
    icon: '🪨',
    text: 'Schwerer Schlag aus hartem Holz.',
  },
};

/** Holt eine Attacke per id - mit klarer Fehlermeldung, falls die id nicht existiert. */
export function getAttack(id) {
  const attack = ATTACKS[id];
  if (!attack) {
    throw new Error(`Unbekannte Attacke: "${id}" (siehe js/data/attacks.js)`);
  }
  return attack;
}
