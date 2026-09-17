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
 *   icon    - Platzhalter-Grafik (später durch eigene Bilder ersetzbar)
 *   text    - kurze Beschreibung für die Karte
 *
 * Faustregel fürs Balancing: Schaden geteilt durch Kosten ergibt die
 * "Stärke pro XP". Weil beide Seiten 1 XP pro Sekunde bekommen, entscheidet
 * dieser Wert darüber, wie hart eine Seite austeilt.
 *   Spieler       ca. 5,5
 *   Moosgnubbel   ca. 3,4   (leicht)
 *   Schlickhüpfer ca. 4,2   (mittel)
 *   Borkenwächter ca. 4,2   (Boss, dafür mit Heilung und mehr LP)
 */
export const ATTACKS = {
  /* ===================================================================
     Deck des Spielers (Glutwelpe)
     =================================================================== */
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

  /* ===================================================================
     Deck des Moosgnubbels (Level 1 - leichter Gegner)
     =================================================================== */
  blattschnitt: {
    id: 'blattschnitt',
    name: 'Blattschnitt',
    cost: 1,
    damage: 4,
    icon: '🍃',
    text: 'Ein scharfkantiges Blatt.',
  },
  sporenwolke: {
    id: 'sporenwolke',
    name: 'Sporenwolke',
    cost: 1,
    damage: 3,
    icon: '🍄',
    text: 'Feiner, reizender Staub.',
  },
  moosklatsche: {
    id: 'moosklatsche',
    name: 'Moosklatsche',
    cost: 2,
    damage: 6,
    icon: '🍀',
    text: 'Ein feuchter Klaps.',
  },
  rankenpeitsche: {
    id: 'rankenpeitsche',
    name: 'Rankenpeitsche',
    cost: 2,
    damage: 7,
    icon: '🌿',
    text: 'Peitscht mit zähen Ranken.',
  },
  knospenstoss: {
    id: 'knospenstoss',
    name: 'Knospenstoß',
    cost: 3,
    damage: 9,
    icon: '🌷',
    text: 'Eine Knospe platzt auf.',
  },
  wurzelgriff: {
    id: 'wurzelgriff',
    name: 'Wurzelgriff',
    cost: 3,
    damage: 10,
    icon: '🪵',
    text: 'Wurzeln packen von unten zu.',
  },
  sporenschleuder: {
    id: 'sporenschleuder',
    name: 'Sporenschleuder',
    cost: 4,
    damage: 14,
    icon: '🌾',
    text: 'Schleudert eine dichte Wolke.',
  },
  dornenranke: {
    id: 'dornenranke',
    name: 'Dornenranke',
    cost: 5,
    damage: 18,
    icon: '🌹',
    text: 'Die stärkste Ranke des Moosgnubbels.',
  },

  /* ===================================================================
     Deck des Schlickhüpfers (Level 2 - mittlerer Gegner)
     =================================================================== */
  tropfschlag: {
    id: 'tropfschlag',
    name: 'Tropfschlag',
    cost: 1,
    damage: 4,
    icon: '💧',
    text: 'Ein schneller Wasserklaps.',
  },
  quakstoss: {
    id: 'quakstoss',
    name: 'Quakstoß',
    cost: 1,
    damage: 4,
    icon: '🐸',
    text: 'Ein lautes, unangenehmes Quaken.',
  },
  sumpfblase: {
    id: 'sumpfblase',
    name: 'Sumpfblase',
    cost: 2,
    damage: 8,
    icon: '🫧',
    text: 'Eine Blase platzt übelriechend.',
  },
  schlickwelle: {
    id: 'schlickwelle',
    name: 'Schlickwelle',
    cost: 2,
    damage: 9,
    icon: '🌊',
    text: 'Eine Welle aus kaltem Schlamm.',
  },
  klebezunge: {
    id: 'klebezunge',
    name: 'Klebezunge',
    cost: 3,
    damage: 12,
    icon: '👅',
    text: 'Schnellt nach vorn und trifft hart.',
  },
  schlammstoss: {
    id: 'schlammstoss',
    name: 'Schlammstoß',
    cost: 3,
    damage: 13,
    icon: '💦',
    text: 'Ein Schwall zäher Schlamm.',
  },
  flutstoss: {
    id: 'flutstoss',
    name: 'Flutstoß',
    cost: 4,
    damage: 18,
    icon: '🌀',
    text: 'Reißt alles mit sich.',
  },
  schlammgeysir: {
    id: 'schlammgeysir',
    name: 'Schlammgeysir',
    cost: 5,
    damage: 22,
    icon: '⛲',
    text: 'Bricht mit voller Wucht hervor.',
  },

  /* ===================================================================
     Deck des Borkenwächters (Level 3 - Boss)
     =================================================================== */
  splitterschlag: {
    id: 'splitterschlag',
    name: 'Splitterschlag',
    cost: 1,
    damage: 4,
    icon: '🪵',
    text: 'Holzsplitter fliegen.',
  },
  asthieb: {
    id: 'asthieb',
    name: 'Asthieb',
    cost: 2,
    damage: 8,
    icon: '🪓',
    text: 'Ein schwerer Ast saust herab.',
  },
  borkenfaust: {
    id: 'borkenfaust',
    name: 'Borkenfaust',
    cost: 2,
    damage: 9,
    icon: '🪨',
    text: 'Schwerer Schlag aus hartem Holz.',
  },
  rindenpanzer: {
    id: 'rindenpanzer',
    name: 'Rindenpanzer',
    cost: 2,
    damage: 0,
    heal: 14,
    icon: '🧱',
    text: 'Frische Rinde schließt die Wunden.',
  },
  wurzelschlag: {
    id: 'wurzelschlag',
    name: 'Wurzelschlag',
    cost: 3,
    damage: 12,
    icon: '🌲',
    text: 'Wurzeln brechen aus dem Boden.',
  },
  dornenhagel: {
    id: 'dornenhagel',
    name: 'Dornenhagel',
    cost: 3,
    damage: 13,
    icon: '🌵',
    text: 'Ein Regen aus spitzen Dornen.',
  },
  stammstoss: {
    id: 'stammstoss',
    name: 'Stammstoß',
    cost: 4,
    damage: 17,
    icon: '🌰',
    text: 'Der ganze Stamm kippt nach vorn.',
  },
  waldzorn: {
    id: 'waldzorn',
    name: 'Waldzorn',
    cost: 5,
    damage: 21,
    icon: '💢',
    text: 'Der Zorn des ganzen Waldes.',
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
