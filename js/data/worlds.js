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
 *   scenery     - Form der Kulisse: bestimmt die Silhouetten von Baeumen,
 *                 Kristallen oder Kakteen (siehe .region--... in css/scenery.css)
 *   farben      - die zehn Farben dieser Welt. HIER aenderst du das Aussehen
 *                 einer Arena. Siehe ANLEITUNG.md
 *   hintergrund - optional: eigenes Hintergrundbild statt der gezeichneten
 *                 Kulisse, z. B. 'bilder/welten/vulkan.png'
 *   hueBase     - Grundfarbton der Kreaturen dieser Welt (0-360)
 *   text        - kurze Beschreibung
 *   music       - Klang-Kategorie (noch ohne Wirkung, für später vorgesehen)
 *   powerPerXp  - wie viel Schaden die Gegner pro Energie austeilen (Schwierigkeit)
 *   baseHp      - Lebenspunkte des ersten Gegners der Welt
 *   hpGrowth    - wie stark die Lebenspunkte von Kampf zu Kampf steigen
 *   reward      - Münzen für den ersten Sieg im ersten Kampf
 *   attacks     - 8 Attacken-Vorlagen für die normalen Gegner der Welt
 *                 (n = Name, i = Symbol, c = Energiekosten; der Schaden wird
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
    farben: {
      himmelOben: '#3ba7e8',
      himmelUnten: '#b6e8ff',
      wiese: '#66c447',
      wieseDunkel: '#3f8f2c',
      wieseHell: '#8fdd63',
      fels: '#7c8fb5',
      felsDunkel: '#5a6c92',
      baum: '#3b8f3a',
      baumDunkel: '#23611f',
      schnee: '#f2f8ff',
    },
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
      { n: 'Rindenbalsam', i: '🧴', c: 2, heal: true },
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
    farben: {
      himmelOben: '#3a2f8f',
      himmelUnten: '#b9c8ff',
      wiese: '#6f7bd6',
      wieseDunkel: '#454b9e',
      wieseHell: '#9aa5f0',
      fels: '#8a7ad0',
      felsDunkel: '#5b4f9e',
      baum: '#7ce0ff',
      baumDunkel: '#3f7fd0',
      schnee: '#eaf2ff',
    },
    text: 'Funkelnde Stollen voller scharfkantiger Kristallwesen.',
    music: 'hoehle',
    powerPerXp: 3.7,
    baseHp: 100,
    hpGrowth: 10,
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
    farben: {
      himmelOben: '#6d2140',
      himmelUnten: '#ffa45c',
      wiese: '#6b4636',
      wieseDunkel: '#40261c',
      wieseHell: '#96634a',
      fels: '#6b3a45',
      felsDunkel: '#43242c',
      baum: '#d95b25',
      baumDunkel: '#7a2b12',
      schnee: '#ffd9a0',
    },
    text: 'Glühende Asche, Lavaströme und Wesen aus Feuer.',
    music: 'vulkan',
    powerPerXp: 4.0,
    baseHp: 130,
    hpGrowth: 11,
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
      { n: 'Feuersturm', i: '💥', c: 5 },
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
    farben: {
      himmelOben: '#5aa7d6',
      himmelUnten: '#e6f6ff',
      wiese: '#cfe8f7',
      wieseDunkel: '#9dc3dd',
      wieseHell: '#f2fbff',
      fels: '#9db6cc',
      felsDunkel: '#6f8aa3',
      baum: '#4f9ea8',
      baumDunkel: '#2c6670',
      schnee: '#ffffff',
    },
    text: 'Bittere Kälte, Schneestürme und alles, was darin überlebt.',
    music: 'eis',
    powerPerXp: 4.2,
    baseHp: 160,
    hpGrowth: 11,
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
    icon: '🌙',
    hueBase: 288, // Grundfarbton der Kreaturen dieser Welt
    scenery: 'schatten',
    farben: {
      himmelOben: '#1c1030',
      himmelUnten: '#4b3570',
      wiese: '#3b2c55',
      wieseDunkel: '#241a38',
      wieseHell: '#54406f',
      fels: '#3a2b52',
      felsDunkel: '#241a38',
      baum: '#6b4a8f',
      baumDunkel: '#33214a',
      schnee: '#c9b6e8',
    },
    text: 'Ein Land ohne Sonne. Hier bewegt sich etwas in der Dunkelheit.',
    music: 'schatten',
    powerPerXp: 4.4,
    baseHp: 190,
    hpGrowth: 12,
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
    farben: {
      himmelOben: '#f0a05a',
      himmelUnten: '#ffe6b8',
      wiese: '#e8c07a',
      wieseDunkel: '#b98c4a',
      wieseHell: '#f7dda6',
      fels: '#c99a63',
      felsDunkel: '#8f6a3f',
      baum: '#77a05a',
      baumDunkel: '#4a6b36',
      schnee: '#fff3d6',
    },
    text: 'Endlose Dünen, alte Ruinen und alles, was im Sand wartet.',
    music: 'wueste',
    powerPerXp: 4.6,
    baseHp: 220,
    hpGrowth: 12,
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

  {
    id: 7,
    name: 'Himmelsinseln',
    icon: '🌤️',
    hueBase: 205, // Grundfarbton der Kreaturen dieser Welt (Himmelsblau)
    scenery: 'wald',
    farben: {
      himmelOben: '#5cb8f0',
      himmelUnten: '#dff2ff',
      wiese: '#7ecf8f',
      wieseDunkel: '#4f9e78',
      wieseHell: '#a9e8b8',
      fels: '#b9c6e0',
      felsDunkel: '#8a9ac0',
      baum: '#5bb0d8',
      baumDunkel: '#3a7fb0',
      schnee: '#ffffff',
    },
    text: 'Schwebende Inseln über den Wolken, wo der Wind niemals schläft.',
    music: 'himmel',
    powerPerXp: 4.8,
    baseHp: 250,
    hpGrowth: 13,
    reward: 190,
    attacks: [
      { n: 'Windstoß', i: '🌬️', c: 1 },
      { n: 'Federhieb', i: '🪶', c: 1 },
      { n: 'Wolkenschlag', i: '☁️', c: 2 },
      { n: 'Blitzfunke', i: '⚡', c: 2 },
      { n: 'Sturmbö', i: '🌀', c: 3 },
      { n: 'Regenguss', i: '🌧️', c: 3 },
      { n: 'Donnerhall', i: '🔊', c: 4 },
      { n: 'Orkanschlag', i: '🌪️', c: 5 },
    ],
    bossAttacks: [
      { n: 'Sturmklinge', i: '🗡️', c: 1 },
      { n: 'Böenstoß', i: '💨', c: 2 },
      { n: 'Windschild', i: '🛡️', c: 2, shield: true },
      { n: 'Aufwind', i: '🌬️', c: 2, heal: true },
      { n: 'Donnerkeil', i: '⚡', c: 3 },
      { n: 'Wolkenbruch', i: '🌧️', c: 3 },
      { n: 'Fallböe', i: '🌀', c: 4 },
      { n: 'Wirbelsturm', i: '🌪️', c: 5 },
    ],
    enemies: [
      { n: 'Wolkengnubbel', i: '☁️' },
      { n: 'Flatterfink', i: '🐦' },
      { n: 'Windgeist', i: '🌬️' },
      { n: 'Blitzkäfer', i: '⚡' },
      { n: 'Federdrache', i: '🐉' },
      { n: 'Himmelsqualle', i: '🎐' },
      { n: 'Sturmvogel', i: '🕊️' },
      { n: 'Donnerkralle', i: '🦅' },
      { n: 'Segelrochen', i: '🪁' },
      { n: 'Wirbelwicht', i: '🌀' },
      { n: 'Himmelsschlange', i: '🐍' },
    ],
    boss: { n: 'Sturmfürst', i: '🌩️' },
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
