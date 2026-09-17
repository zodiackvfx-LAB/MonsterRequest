/**
 * Katalog aller Attacken im Spiel.
 *
 * Das sind reine Daten - hier balancierst du das Spiel, ohne Logik anzufassen.
 *
 * Felder:
 *   id      - eindeutiger Schlüssel (muss mit dem Objekt-Schlüssel übereinstimmen)
 *   name    - Anzeigename auf der Karte
 *   cost    - XP-Kosten (1 bis 10, siehe MAX_XP in js/core/fighter.js)
 *   damage  - Schaden am Gegenüber (0, wenn die Attacke nur heilt)
 *   heal    - Heilung für sich selbst (optional)
 *   shield  - Schild, das kommenden Schaden abfängt (optional)
 *   icon    - Platzhalter-Grafik (später durch eigene Bilder ersetzbar)
 *   text    - kurze Beschreibung für die Karte
 *   seltenheit - 'gewoehnlich' | 'selten' | 'episch' | 'legendaer'
 *                (nur für die Anzeige in der Sammlung, siehe js/data/items.js)
 *
 * Hier stehen nur die Attacken des Spielers. Die Attacken der Gegner werden
 * aus den Vorlagen der jeweiligen Welt erzeugt (js/data/worlds.js) und über
 * registerAttack() ergänzt.
 *
 * Faustregel fürs Balancing: Schaden geteilt durch Kosten ergibt die
 * "Stärke pro XP". Weil beide Seiten 1 XP pro Sekunde bekommen, entscheidet
 * dieser Wert darüber, wie hart eine Seite austeilt.
 *   Spieler  ca. 5,5 bis 6,9 (je teurer, desto stärker pro XP)
 *   Gegner   3,4 in Welt 1 bis 4,6 in Welt 6 (powerPerXp in worlds.js)
 */
export const ATTACKS = {
  /* ===================================================================
     Deck des Spielers (Glutwelpe) - die acht Platzhalter-Attacken.
     Teurere Attacken sind pro XP etwas stärker. Das belohnt Sparen,
     ohne die billigen Karten nutzlos zu machen.
     =================================================================== */
  krallenhieb: {
    id: 'krallenhieb',
    seltenheit: 'gewoehnlich',
    name: 'Krallenhieb',
    cost: 2,
    damage: 11,
    icon: '🐾',
    text: 'Schneller Hieb mit scharfen Krallen.',
  },
  biss: {
    id: 'biss',
    seltenheit: 'gewoehnlich',
    name: 'Biss',
    cost: 2,
    damage: 12,
    icon: '🦷',
    text: 'Beißt kräftig zu.',
  },
  feuerball: {
    id: 'feuerball',
    seltenheit: 'selten',
    name: 'Feuerball',
    cost: 3,
    damage: 17,
    icon: '🔥',
    text: 'Eine kompakte Kugel aus Glut.',
  },
  flammenstoss: {
    id: 'flammenstoss',
    seltenheit: 'selten',
    name: 'Flammenstoß',
    cost: 4,
    damage: 23,
    icon: '💥',
    text: 'Ein gebündelter Flammenstrahl.',
  },
  schutzschild: {
    id: 'schutzschild',
    seltenheit: 'selten',
    name: 'Schutzschild',
    cost: 4,
    damage: 0,
    shield: 26,
    icon: '🛡️',
    text: 'Eine Barriere aus glühender Luft.',
  },
  feuersturm: {
    id: 'feuersturm',
    seltenheit: 'episch',
    name: 'Feuersturm',
    cost: 5,
    damage: 30,
    icon: '🌪️',
    text: 'Ein Wirbel aus Feuer.',
  },
  lavabombe: {
    id: 'lavabombe',
    seltenheit: 'episch',
    name: 'Lavabombe',
    cost: 7,
    damage: 45,
    icon: '🌋',
    text: 'Teuer, aber verheerend.',
  },
  meteor: {
    id: 'meteor',
    seltenheit: 'legendaer',
    name: 'Meteor',
    cost: 9,
    damage: 62,
    icon: '☄️',
    text: 'Die stärkste Attacke - fast die gesamte Energie.',
  },

};

/**
 * Die ids der acht Startattacken - festgehalten, bevor Beute- und
 * Gegnerattacken über registerAttack() dazukommen. Die Sammlung
 * unterscheidet darüber, was von Anfang an dabei ist.
 */
export const START_ATTACKEN = Object.keys(ATTACKS);

/**
 * Trägt eine Attacke nachträglich in den Katalog ein.
 *
 * Das nutzt js/data/enemies.js: Die Attacken der Gegner werden aus den
 * Vorlagen einer Welt erzeugt, statt hier einzeln aufgeschrieben zu werden.
 * Für die Kampf-Engine sind sie danach ganz normale Attacken.
 */
export function registerAttack(attack) {
  if (!attack.id) throw new Error('Attacke ohne id kann nicht eingetragen werden');
  ATTACKS[attack.id] = { damage: 0, heal: 0, shield: 0, ...attack };
  return attack.id;
}

/** Holt eine Attacke per id - mit klarer Fehlermeldung, falls die id nicht existiert. */
export function getAttack(id) {
  const attack = ATTACKS[id];
  if (!attack) {
    throw new Error(`Unbekannte Attacke: "${id}" (siehe js/data/attacks.js)`);
  }
  return attack;
}
