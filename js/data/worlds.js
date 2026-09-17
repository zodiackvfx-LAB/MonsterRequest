/**
 * Die Welten von MonsterQuest.
 *
 * Das ist die wichtigste Datendatei des Spiels: Aus ihr entstehen
 * automatisch die Gegner (js/data/enemies.js) und die Kämpfe der
 * Weltkarte (js/data/levels.js).
 *
 * EINE NEUE WELT HINZUFÜGEN = einen Eintrag ergänzen. Sonst nichts.
 *
 * Felder:
 *   id          - fortlaufende Nummer
 *   name        - Anzeigename
 *   icon        - Symbol für die Weltauswahl
 *   scenery     - Kulisse/Farbwelt (siehe .region--... in css/scenery.css)
 *   hueBase     - Grundfarbton der Kreaturen dieser Welt (0-360)
 *   text        - kurze Beschreibung
 *   music       - Klang-Kategorie (noch ohne Wirkung, für später vorgesehen)
 *   powerPerXp  - wie viel Schaden die Gegner pro XP austeilen (Schwierigkeit)
 *   baseHp      - Lebenspunkte des ersten Gegners der Welt
 *   hpGrowth    - wie stark die Lebenspunkte von Kampf zu Kampf steigen
 *   reward      - Münzen für den ersten Sieg im ersten Kampf
 *   attacks     - 8 Attacken-Vorlagen für die normalen Gegner der Welt
 *                 (n = Name, i = Symbol, c = XP-Kosten; der Schaden wird
 *                  aus den Kosten und powerPerXp berechnet)
 *   bossAttacks - 8 Attacken-Vorlagen für den Boss
 *   enemies     - 11 normale Gegner (n = Name, i = Platzhalter-Symbol)
 *   boss        - der Bossgegner der Welt
 *
 * Die Symbole sind bewusst nur Platzhalter. In einem späteren Schritt
 * werden sie durch eigene Pixel-Art-Figuren ersetzt - dafür muss an dieser
 * Datei nichts geändert werden außer dem Feld selbst.
 */
export const WORLDS = [
  {
    id: 1,
    name: 'Grünes Tal',
    icon: '🌿',
    hueBase: 110, // Grundfarbton der Kreaturen dieser Welt
    scenery: 'wald',
    text: 'Sonnige Wiesen und dichter Wald. Hier beginnt dein Abenteuer.',
    music: 'wald',
    powerPerXp: 3.4,
    baseHp: 70,
    hpGrowth: 9,
    reward: 25,
    attacks: [
      { n: 'Blattschnitt', i: '🍃', c: 1 },
      { n: 'Sporenwolke', i: '🍄', c: 1 },
      { n: 'Moosklatsche', i: '🍀', c: 2 },
      { n: 'Rankenpeitsche', i: '🌿', c: 2 },
      { n: 'Knospenstoß', i: '🌷', c: 3 },
      { n: 'Wurzelgriff', i: '🪵', c: 3 },
      { n: 'Sporenschleuder', i: '🌾', c: 4 },
      { n: 'Dornenranke', i: '🌹', c: 5 },
    ],
    bossAttacks: [
      { n: 'Splitterschlag', i: '🪵', c: 1 },
      { n: 'Asthieb', i: '🪓', c: 2 },
      { n: 'Borkenfaust', i: '🪨', c: 2 },
      { n: 'Rindenpanzer', i: '🧱', c: 2, heal: true },
      { n: 'Wurzelschlag', i: '🌲', c: 3 },
      { n: 'Dornenhagel', i: '🌵', c: 3 },
      { n: 'Stammstoß', i: '🌰', c: 4 },
      { n: 'Waldzorn', i: '💢', c: 5 },
    ],
    enemies: [
      { n: 'Moosgnubbel', i: '🌱' },
      { n: 'Hüpfkäfer', i: '🐛' },
      { n: 'Blattfalter', i: '🦋' },
      { n: 'Pilzkobold', i: '🍄' },
      { n: 'Wieselwicht', i: '🦡' },
      { n: 'Dornenigel', i: '🦔' },
      { n: 'Schlickhüpfer', i: '🐸' },
      { n: 'Hornschnecke', i: '🐌' },
      { n: 'Rankenkralle', i: '🦎' },
      { n: 'Waldgeist', i: '👻' },
      { n: 'Steinbock', i: '🐐' },
    ],
    boss: { n: 'Borkenwächter', i: '🌳' },
  },

  {
    id: 2,
    name: 'Kristallhöhlen',
    icon: '💎',
    hueBase: 265, // Grundfarbton der Kreaturen dieser Welt
    scenery: 'kristall',
    text: 'Funkelnde Stollen voller scharfkantiger Kristallwesen.',
    music: 'hoehle',
    powerPerXp: 3.7,
    baseHp: 105,
    hpGrowth: 11,
    reward: 40,
    attacks: [
      { n: 'Splittersalve', i: '💠', c: 1 },
      { n: 'Glasschnitt', i: '🔹', c: 1 },
      { n: 'Prismastrahl', i: '🔷', c: 2 },
      { n: 'Scherbenhieb', i: '🪞', c: 2 },
      { n: 'Echoschlag', i: '🔔', c: 3 },
      { n: 'Kristallstoß', i: '💎', c: 3 },
      { n: 'Lichtbrechung', i: '✨', c: 4 },
      { n: 'Geodenbruch', i: '🧊', c: 5 },
    ],
    bossAttacks: [
      { n: 'Funkenschliff', i: '✨', c: 1 },
      { n: 'Spiegelhieb', i: '🪞', c: 2 },
      { n: 'Kristallwand', i: '🛡️', c: 2, shield: true },
      { n: 'Strahlenkegel', i: '🔆', c: 3 },
      { n: 'Splitterregen', i: '💠', c: 3 },
      { n: 'Resonanz', i: '📿', c: 4 },
      { n: 'Prismasturm', i: '🔷', c: 4 },
      { n: 'Herzsplitter', i: '💥', c: 5 },
    ],
    enemies: [
      { n: 'Scherbling', i: '🔹' },
      { n: 'Glimmermilbe', i: '🕷️' },
      { n: 'Prismafalter', i: '🦋' },
      { n: 'Kristallkrabbe', i: '🦀' },
      { n: 'Echofledermaus', i: '🦇' },
      { n: 'Geodenwurm', i: '🪱' },
      { n: 'Spiegelgeist', i: '👁️' },
      { n: 'Quarzkröte', i: '🐸' },
      { n: 'Funkenmaus', i: '🐭' },
      { n: 'Schliffgolem', i: '🗿' },
      { n: 'Diamantkäfer', i: '🪲' },
    ],
    boss: { n: 'Kristallgolem', i: '💎' },
  },

  {
    id: 3,
    name: 'Vulkanlande',
    icon: '🌋',
    hueBase: 14, // Grundfarbton der Kreaturen dieser Welt
    scenery: 'vulkan',
    text: 'Glühende Asche, Lavaströme und Wesen aus Feuer.',
    music: 'vulkan',
    powerPerXp: 4.0,
    baseHp: 140,
    hpGrowth: 12,
    reward: 60,
    attacks: [
      { n: 'Funkenflug', i: '✨', c: 1 },
      { n: 'Aschehieb', i: '🌑', c: 1 },
      { n: 'Glutbiss', i: '🦷', c: 2 },
      { n: 'Rauchstoß', i: '💨', c: 2 },
      { n: 'Lavaspritzer', i: '🔥', c: 3 },
      { n: 'Magmafaust', i: '🪨', c: 3 },
      { n: 'Schlackenwelle', i: '🌊', c: 4 },
      { n: 'Eruption', i: '🌋', c: 5 },
    ],
    bossAttacks: [
      { n: 'Glutatem', i: '🔥', c: 1 },
      { n: 'Klauenhieb', i: '🦅', c: 2 },
      { n: 'Ascheschild', i: '🛡️', c: 2, shield: true },
      { n: 'Feuerpeitsche', i: '🪢', c: 3 },
      { n: 'Magmaregen', i: '☄️', c: 3 },
      { n: 'Schwefelstoß', i: '🟡', c: 4 },
      { n: 'Lavasturz', i: '🌋', c: 4 },
      { n: 'Inferno', i: '💥', c: 5 },
    ],
    enemies: [
      { n: 'Glutwicht', i: '🔥' },
      { n: 'Ascheratte', i: '🐀' },
      { n: 'Lavahund', i: '🐕' },
      { n: 'Schwefelmotte', i: '🦟' },
      { n: 'Magmaschnecke', i: '🐌' },
      { n: 'Funkenspecht', i: '🐦' },
      { n: 'Basaltkrabbe', i: '🦂' },
      { n: 'Rauchgeist', i: '💨' },
      { n: 'Glutschlange', i: '🐍' },
      { n: 'Obsidianbock', i: '🐏' },
      { n: 'Flammenaffe', i: '🐒' },
    ],
    boss: { n: 'Schlackenfürst', i: '🐲' },
  },

  {
    id: 4,
    name: 'Eisgebirge',
    icon: '❄️',
    hueBase: 192, // Grundfarbton der Kreaturen dieser Welt
    scenery: 'eis',
    text: 'Bittere Kälte, Schneestürme und alles, was darin überlebt.',
    music: 'eis',
    powerPerXp: 4.2,
    baseHp: 175,
    hpGrowth: 13,
    reward: 85,
    attacks: [
      { n: 'Frostnadel', i: '❄️', c: 1 },
      { n: 'Schneeball', i: '⚪', c: 1 },
      { n: 'Eishieb', i: '🧊', c: 2 },
      { n: 'Reifgriff', i: '🤍', c: 2 },
      { n: 'Zapfenstoß', i: '🔻', c: 3 },
      { n: 'Frostbiss', i: '🦷', c: 3 },
      { n: 'Schneesturm', i: '🌨️', c: 4 },
      { n: 'Gletscherbruch', i: '🏔️', c: 5 },
    ],
    bossAttacks: [
      { n: 'Frosthauch', i: '❄️', c: 1 },
      { n: 'Eiskralle', i: '🐾', c: 2 },
      { n: 'Eispanzer', i: '🛡️', c: 2, shield: true },
      { n: 'Hagelschlag', i: '🌨️', c: 3 },
      { n: 'Frostwelle', i: '🌊', c: 3 },
      { n: 'Eiszapfenregen', i: '🔻', c: 4 },
      { n: 'Lawine', i: '🏔️', c: 4 },
      { n: 'Ewiger Winter', i: '💠', c: 5 },
    ],
    enemies: [
      { n: 'Frostwicht', i: '⛄' },
      { n: 'Eiswolf', i: '🐺' },
      { n: 'Schneehase', i: '🐇' },
      { n: 'Zapfenkobold', i: '🔻' },
      { n: 'Gletscherkrabbe', i: '🦀' },
      { n: 'Frostrabe', i: '🐦‍⬛' },
      { n: 'Reifgeist', i: '🌬️' },
      { n: 'Eisbär', i: '🐻‍❄️' },
      { n: 'Schneeotter', i: '🦦' },
      { n: 'Firnmotte', i: '🦋' },
      { n: 'Packeisgolem', i: '🧊' },
    ],
    boss: { n: 'Frostherrscher', i: '🦣' },
  },

  {
    id: 5,
    name: 'Schattenreich',
    icon: '🌑',
    hueBase: 288, // Grundfarbton der Kreaturen dieser Welt
    scenery: 'schatten',
    text: 'Ein Land ohne Sonne. Hier bewegt sich etwas in der Dunkelheit.',
    music: 'schatten',
    powerPerXp: 4.4,
    baseHp: 210,
    hpGrowth: 14,
    reward: 115,
    attacks: [
      { n: 'Schattenkralle', i: '🌑', c: 1 },
      { n: 'Nebelhauch', i: '🌫️', c: 1 },
      { n: 'Fluchzeichen', i: '🔮', c: 2 },
      { n: 'Seelenzug', i: '💀', c: 2 },
      { n: 'Dunkelstoß', i: '🕳️', c: 3 },
      { n: 'Albtraum', i: '😱', c: 3 },
      { n: 'Schattenwelle', i: '🌊', c: 4 },
      { n: 'Finsternis', i: '⚫', c: 5 },
    ],
    bossAttacks: [
      { n: 'Schattenhand', i: '🖤', c: 1 },
      { n: 'Fluchblitz', i: '⚡', c: 2 },
      { n: 'Schattenmantel', i: '🛡️', c: 2, shield: true },
      { n: 'Seelenfeuer', i: '🔥', c: 3 },
      { n: 'Leerenriss', i: '🕳️', c: 3 },
      { n: 'Schreckensruf', i: '📢', c: 4 },
      { n: 'Nachtsturm', i: '🌪️', c: 4 },
      { n: 'Ewige Nacht', i: '⚫', c: 5 },
    ],
    enemies: [
      { n: 'Schattenwicht', i: '👤' },
      { n: 'Nebelkrähe', i: '🐦‍⬛' },
      { n: 'Fluchpuppe', i: '🪆' },
      { n: 'Grabspinne', i: '🕷️' },
      { n: 'Irrlicht', i: '🕯️' },
      { n: 'Knochenhund', i: '🦴' },
      { n: 'Schleiergeist', i: '👻' },
      { n: 'Nachtmotte', i: '🦇' },
      { n: 'Schattenkatze', i: '🐈‍⬛' },
      { n: 'Leerenauge', i: '👁️' },
      { n: 'Grufthüter', i: '⚰️' },
    ],
    boss: { n: 'Schattenmagier', i: '🧙' },
  },

  {
    id: 6,
    name: 'Wüstenreich',
    icon: '🏜️',
    hueBase: 38, // Grundfarbton der Kreaturen dieser Welt
    scenery: 'wueste',
    text: 'Endlose Dünen, alte Ruinen und alles, was im Sand wartet.',
    music: 'wueste',
    powerPerXp: 4.6,
    baseHp: 245,
    hpGrowth: 15,
    reward: 150,
    attacks: [
      { n: 'Sandstoß', i: '🏜️', c: 1 },
      { n: 'Dornenstich', i: '🌵', c: 1 },
      { n: 'Hitzewelle', i: '🥵', c: 2 },
      { n: 'Skarabäusbiss', i: '🪲', c: 2 },
      { n: 'Sandwirbel', i: '🌪️', c: 3 },
      { n: 'Schwanzhieb', i: '🦂', c: 3 },
      { n: 'Fata Morgana', i: '💫', c: 4 },
      { n: 'Sandsturm', i: '🌫️', c: 5 },
    ],
    bossAttacks: [
      { n: 'Klingenhieb', i: '🗡️', c: 1 },
      { n: 'Sandfalle', i: '⏳', c: 2 },
      { n: 'Schildwall', i: '🛡️', c: 2, shield: true },
      { n: 'Wüstenwind', i: '💨', c: 3 },
      { n: 'Skarabäusschwarm', i: '🪲', c: 3 },
      { n: 'Sonnenbrand', i: '☀️', c: 4 },
      { n: 'Dünenbeben', i: '🏜️', c: 4 },
      { n: 'Königsfluch', i: '👑', c: 5 },
    ],
    enemies: [
      { n: 'Sandwicht', i: '🏜️' },
      { n: 'Kaktuskobold', i: '🌵' },
      { n: 'Skarabäus', i: '🪲' },
      { n: 'Dünenschlange', i: '🐍' },
      { n: 'Wüstenfuchs', i: '🦊' },
      { n: 'Sandskorpion', i: '🦂' },
      { n: 'Geierwicht', i: '🦅' },
      { n: 'Ruinenwächter', i: '🗿' },
      { n: 'Glutwarán', i: '🦎' },
      { n: 'Sandgeist', i: '🌫️' },
      { n: 'Kamelritter', i: '🐫' },
    ],
    boss: { n: 'Dünenkönig', i: '👑' },
  },
];

/** Holt eine Welt per id. */
export function getWorld(id) {
  return WORLDS.find((world) => world.id === Number(id));
}

/** Wie viele Kämpfe hat eine Welt? (11 normale Gegner + 1 Boss) */
export function fightsInWorld(world) {
  return world.enemies.length + 1;
}
