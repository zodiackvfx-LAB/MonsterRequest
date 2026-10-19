/**
 * 2v2 – Monster-Duell: alle Werte an EINER Stelle.
 *
 * Zwei Spieler (Team Blau) kämpfen gemeinsam gegen zwei KI-Monster (Team Rot).
 * Die Regeln stehen in js/core/duell.js, die KI in js/core/duell-ki.js. Hier
 * stehen nur Zahlen und Listen - wer das Duell leichter, schwerer oder
 * lohnender machen will, ändert hier und nirgends sonst.
 *
 * Grundsatz: Es gelten dieselben Kampfregeln wie im Abenteuer (8 Karten im
 * Deck, 4 auf der Hand, höchstens 10 Energie, 1 Energie pro Sekunde, Krits,
 * Boss-Kräfte). Neu sind nur Ziele, Team-Kombos, Kampfunfähigkeit und die
 * Rollen der Gegner.
 */

import { WORLDS, getWorld } from './worlds.js';
import { enemyIdFor, getEnemy } from './enemies.js';

export const DUELL = {
  id: 'duell',
  name: '2v2 Monster-Duell',
  icon: '⚔️',
  text: 'Zu zweit gegen zwei Monster: eigene Karten, eigene Energie, gemeinsame Kombos.',

  /**
   * Team-Kombo: Treffen beide Spieler denselben Gegner innerhalb von
   * `fenster` Sekunden, bekommt der zweite Treffer `bonus` mehr Schaden.
   * Danach ruht die Kombo `cooldown` Sekunden für das ganze Team. Der
   * Bonus-Schaden selbst löst nie eine weitere Kombo aus - so kann keine
   * endlose Kette entstehen. Für das Gegnerteam gilt dieselbe Regel.
   */
  kombo: { fenster: 2.0, bonus: 0.1, cooldown: 8 },

  /**
   * Flächenkarten treffen beide Gegner, jeden mit diesem Anteil des
   * Kartenschadens (zusammen also etwas mehr als ein Einzeltreffer).
   */
  flaechenAnteil: 0.6,

  /**
   * Angekündigte Spezialangriffe: Eine Karte mit mindestens so viel
   * Energiekosten (oder eine Betäubung) unterbricht die Ankündigung.
   */
  unterbrechenAbKosten: 5,

  /**
   * Betäubung und Frost: Nach dem Ende einer Sperre ist ein Kämpfer so viele
   * Sekunden lang davor geschützt - keine Dauerbetäubung.
   */
  sperrSchutz: 4,

  /** Gegner in Ankündigung: wie lange (Sekunden) sie vorher warnen. Je Grad unterschiedlich. */
  ansageStandard: 2.2,

  /** Lebenspunkte der Gegner für zwei Spieler: maßvoll, keine HP-Schwämme. */
  teamHpFaktor: 1.15,

  /** Boss-Duell: Ab diesem Anteil Lebenspunkte beginnt Phase 2. */
  bossPhaseAb: 0.5,

  /**
   * Boss-Kraft der Gegner: Zwei Spieler treffen doppelt so oft - damit die
   * Kraft nicht doppelt so oft kommt, braucht sie mehr Ladung und ein
   * Treffer lädt nur 1 Punkt (im Abenteuer 2).
   */
  gegnerKraftLadung: 1.35,
  gegnerKraftProTreffer: 1,

  /** Heilung der Gegner nutzt sich ab: jede weitere Heilung wirkt so viel schwächer. */
  heilAbnutzung: 0.75,
  /** Ein Gegner kann insgesamt höchstens so viel (Anteil seiner LP) geheilt bekommen. */
  heilGrenze: 0.5,

  /** Netzwerk (Online-Koop) - siehe js/core/duell-sitzung.js. */
  netz: {
    zustandProSekunde: 8, // so oft schickt der Gastgeber den Spielstand
    pingAlle: 1.5, // Lebenszeichen in Sekunden
    getrenntNach: 5, // ohne Lebenszeichen gilt der andere als getrennt
    kiErsatzNach: 15, // danach übernimmt die KI die Figur des Getrennten
    abbruchNach: 60, // danach wird das Match kontrolliert beendet
    codeLaenge: 6,
  },
};

/**
 * Welche Karten im 2v2 ein anderes Ziel haben als "ein Gegner".
 * Alle Karten ohne Schaden, die heilen oder schützen, wirken automatisch
 * auf einen Verbündeten (siehe zielArtVon in js/core/duell.js).
 *
 * Zielarten: 'gegner' | 'beideGegner' | 'selbst' | 'partner' |
 *            'verbuendeter' | 'beideVerbuendete' | 'arena'
 */
export const KARTEN_ZIELE = {
  druckwelle: 'beideGegner', // "Eine Wand aus Luft, die alles vor sich herschiebt"
  felslawine: 'beideGegner', // "Geröll von allen Seiten"
  donnerwelle: 'beideGegner', // "Der Boden bebt"
  sternenregen: 'beideGegner', // "Ein Hagel aus Sternen"
  urknall: 'arena', // "Alles auf einmal"
};

/** Die Schwierigkeitsgrade. Mehr Grad = klügere KI, nicht nur mehr Leben. */
export const DUELL_GRADE = [
  {
    id: 'einfach', name: 'Einfach', icon: '🍀',
    text: 'Langsame Gegner, die oft danebenliegen. Gut zum Üben.',
    hp: 0.85, schaden: 0.8, reaktion: 1.45, fehler: 0.35, fokus: 0,
    kombo: false, schuetzen: false, unterbrechen: false, planen: false,
    faehigkeitPause: 1.6, ansage: 2.8, belohnung: 0.8,
  },
  {
    id: 'normal', name: 'Normal', icon: '⚔️',
    text: 'Ausgeglichen. Die Gegner schützen sich gegenseitig.',
    hp: 1, schaden: 1, reaktion: 1, fehler: 0.12, fokus: 0.35,
    kombo: false, schuetzen: true, unterbrechen: false, planen: false,
    faehigkeitPause: 1.15, ansage: 2.3, belohnung: 1,
  },
  {
    id: 'schwer', name: 'Schwer', icon: '🔥',
    text: 'Bessere Zielwahl, Kombos und Unterbrechungen.',
    hp: 1.1, schaden: 1.15, reaktion: 0.85, fehler: 0.05, fokus: 0.6,
    kombo: true, schuetzen: true, unterbrechen: true, planen: false,
    faehigkeitPause: 1, ansage: 2.0, belohnung: 1.25,
  },
  {
    id: 'albtraum', name: 'Albtraum', icon: '💀',
    text: 'Echte Teamstrategie: gemeinsames Ziel, getimte Kombos.',
    hp: 1.18, schaden: 1.35, reaktion: 0.72, fehler: 0, fokus: 0.85,
    kombo: true, schuetzen: true, unterbrechen: true, planen: true,
    faehigkeitPause: 0.9, ansage: 1.8, belohnung: 1.5,
  },
];

export function getDuellGrad(id) {
  return DUELL_GRADE.find((g) => g.id === id) ?? DUELL_GRADE[1];
}

/**
 * Die KI-Teamkameradin (Solo-Modus und Ersatz bei Verbindungsabbruch).
 * Sie spielt bewusst etwas schwächer als ein aufmerksamer Mensch.
 */
export const KI_PARTNER = { reaktion: 1.3, fehler: 0.18, patience: 2 };

/**
 * Rollen der Gegner. Sie verschieben ein paar Werte des Monsters (es behält
 * sein Deck aus der Welt) und bringen Rollen-Fähigkeiten mit.
 *
 *   hp, schaden, reaktion - Faktoren auf die Werte des Monsters
 *   abwehr                - zusätzlicher Anteil Schaden, der abgefangen wird
 *   faehigkeiten          - ids aus FAEHIGKEITEN
 */
export const ROLLEN = {
  angreifer: {
    name: 'Angreifer', icon: '🗡️', text: 'Hoher Schaden, greift oft an, nutzt Kombos.',
    hp: 0.95, schaden: 1.12, reaktion: 0.9, abwehr: 0, faehigkeiten: ['wutschlag'],
  },
  verteidiger: {
    name: 'Verteidiger', icon: '🛡️', text: 'Viel Leben, schützt den Partner, unterbricht.',
    hp: 1.2, schaden: 0.85, reaktion: 1.05, abwehr: 0.08, faehigkeiten: ['schutzwall', 'schildstoss'],
  },
  magier: {
    name: 'Magier', icon: '🔮', text: 'Flächenangriffe mit Elementar-Effekten.',
    hp: 0.9, schaden: 1, reaktion: 1, abwehr: 0, faehigkeiten: ['elementarwelle'],
  },
  unterstuetzer: {
    name: 'Unterstützer', icon: '💚', text: 'Heilt und stärkt den Partner, schwächt dich.',
    hp: 0.85, schaden: 0.85, reaktion: 1, abwehr: 0, faehigkeiten: ['heilung', 'staerkung', 'fluch'],
  },
  boss: {
    name: 'Boss', icon: '👑', text: 'Boss-Kraft, Angriffsphasen, angekündigte Spezialattacken.',
    hp: 1, schaden: 1, reaktion: 1, abwehr: 0, faehigkeiten: ['bosszorn'],
  },
  untergebener: {
    name: 'Untergebener', icon: '🪖', text: 'Schützt seinen Boss und hält die Spieler beschäftigt.',
    hp: 0.8, schaden: 0.9, reaktion: 1, abwehr: 0.04, faehigkeiten: ['schutzwall'],
  },
};

/**
 * Rollen-Fähigkeiten. Sie kosten Energie wie eine Karte (keine Energie aus
 * dem Nichts) und haben eine Abklingzeit.
 *
 *   kosten     - Energie
 *   pause      - Abklingzeit in Sekunden
 *   ziel       - 'spieler' | 'beideSpieler' | 'partner' | 'verbuendeter' | 'selbst'
 *   wert       - Stärke als Vielfaches von (kosten × powerPerXp der Welt)
 *   ansage     - true: wird angekündigt und kann unterbrochen werden
 *   ab Phase   - nurPhase2: erst in Phase 2 eines Boss-Duells
 */
export const FAEHIGKEITEN = {
  wutschlag: {
    name: 'Wutschlag', icon: '💢', kosten: 6, pause: 11, ziel: 'spieler', wert: 1.55, ansage: true,
    text: 'Holt weit aus und schlägt mit voller Wucht zu.',
  },
  schutzwall: {
    name: 'Schutzwall', icon: '🛡️', kosten: 3, pause: 8, ziel: 'verbuendeter', wert: 1.5,
    text: 'Stellt ein Schild vor den Partner (oder sich selbst).',
  },
  schildstoss: {
    name: 'Schildstoß', icon: '💫', kosten: 3, pause: 14, ziel: 'spieler', wert: 0.7, betaeubung: 1.0,
    text: 'Ein Stoß, der kurz betäubt - gegen gefährliche Spieler.',
  },
  elementarwelle: {
    name: 'Elementarwelle', icon: '🌊', kosten: 5, pause: 10, ziel: 'beideSpieler', wert: 0.62, ansage: true,
    text: 'Trifft beide Spieler mit dem Element der Welt.',
  },
  heilung: {
    name: 'Heilung', icon: '💚', kosten: 3, pause: 7, ziel: 'verbuendeter', wert: 1.4,
    text: 'Heilt den Partner. Wird mit jedem Mal schwächer.',
  },
  staerkung: {
    name: 'Stärkung', icon: '💪', kosten: 2, pause: 11, ziel: 'partner', dauer: 6, staerke: 0.25,
    text: 'Der Partner teilt kurz mehr aus.',
  },
  fluch: {
    name: 'Fluch', icon: '🪄', kosten: 2, pause: 11, ziel: 'spieler', dauer: 5, staerke: 0.2,
    text: 'Ein Spieler teilt kurz weniger aus.',
  },
  bosszorn: {
    name: 'Bosszorn', icon: '🌋', kosten: 7, pause: 13, ziel: 'beideSpieler', wert: 0.75, ansage: true, nurPhase2: true,
    text: 'Phase 2: Der Boss trifft die ganze Arena.',
  },
};

/**
 * Das Element jeder Welt - bestimmt, was die Elementarwelle der Magier
 * zusätzlich bewirkt:
 *   gift / brand   - Schaden über Zeit
 *   verlangsamt    - weniger Energie pro Sekunde
 *   geschwaecht    - weniger Schaden
 *   energieentzug  - sofort 2 Energie weniger
 */
export const WELT_ELEMENT = {
  1: { status: 'gift', name: 'Sporen' },
  2: { status: 'geschwaecht', name: 'Blendlicht' },
  3: { status: 'brand', name: 'Glut' },
  4: { status: 'verlangsamt', name: 'Frost' },
  5: { status: 'geschwaecht', name: 'Schatten' },
  6: { status: 'verlangsamt', name: 'Treibsand' },
  7: { status: 'energieentzug', name: 'Blitz' },
  8: { status: 'verlangsamt', name: 'Strömung' },
  9: { status: 'gift', name: 'Moorgas' },
  10: { status: 'brand', name: 'Heißdampf' },
  11: { status: 'verlangsamt', name: 'Karamell' },
  12: { status: 'energieentzug', name: 'Schwerkraft' },
};

/**
 * Status-Effekte im 2v2. Die Werte gelten für beide Seiten gleich.
 *   faktor - verlangsamt: Energie pro Sekunde; geschwaecht/verstaerkt: Schaden
 */
export const STATUS = {
  verlangsamt: { name: 'Verlangsamt', icon: '🐌', faktor: 0.6, dauer: 4 },
  geschwaecht: { name: 'Geschwächt', icon: '🥀', faktor: 0.8, dauer: 5 },
  verstaerkt: { name: 'Verstärkt', icon: '💪', faktor: 1.25, dauer: 6 },
  gift: { name: 'Vergiftet', icon: '☠️' },
  brand: { name: 'Brennt', icon: '🔥' },
  betaeubt: { name: 'Betäubt', icon: '💫' },
  gefroren: { name: 'Eingefroren', icon: '❄️' },
  ansage: { name: 'Lädt auf', icon: '⚠️' },
};

/**
 * Die Gegnerteams jeder Welt. Die Zahl ist die Position des Monsters in
 * seiner Welt (0 = erster Gegner, siehe js/data/worlds.js). Jedes Paar ist
 * so gewählt, dass die Rollen zusammenarbeiten.
 */
export const GEGNER_PAARE = {
  1: [
    { name: 'Dornenwacht', monster: [[3, 'verteidiger'], [5, 'angreifer']], text: 'Der Pilzkobold schützt, der Dornenigel sticht zu.' },
    { name: 'Sporenzauber', monster: [[9, 'magier'], [2, 'unterstuetzer']], text: 'Giftsporen und ein Falter, der heilt.' },
    { name: 'Waldjäger', monster: [[10, 'angreifer'], [8, 'verteidiger']], text: 'Der Steinbock stürmt, die Rankenkralle hält stand.' },
  ],
  2: [
    { name: 'Splitterwall', monster: [[3, 'verteidiger'], [5, 'angreifer']], text: 'Kristallpanzer vorn, Geodenwurm dahinter.' },
    { name: 'Prismaecho', monster: [[2, 'magier'], [4, 'unterstuetzer']], text: 'Blendlicht schwächt dich, das Echo heilt.' },
    { name: 'Schliffduo', monster: [[9, 'angreifer'], [10, 'angreifer']], text: 'Zwei schnelle Angreifer - wer zögert, verliert.' },
  ],
  3: [
    { name: 'Glutrudel', monster: [[2, 'angreifer'], [10, 'angreifer']], text: 'Lavahund und Flammenaffe hetzen dich.' },
    { name: 'Rauchzeichen', monster: [[7, 'magier'], [3, 'unterstuetzer']], text: 'Brennender Rauch, gepflegt von der Schwefelmotte.' },
    { name: 'Basaltschild', monster: [[6, 'verteidiger'], [9, 'angreifer']], text: 'Die Basaltkrabbe deckt den Obsidianbock.' },
  ],
  4: [
    { name: 'Frostfalle', monster: [[0, 'magier'], [1, 'angreifer']], text: 'Der Frostwicht verlangsamt - der Eiswolf schlägt zu.' },
    { name: 'Zapfenwehr', monster: [[3, 'verteidiger'], [5, 'angreifer']], text: 'Eisschild und ein wütender Frostrabe.' },
    { name: 'Eiswinter', monster: [[6, 'magier'], [7, 'angreifer']], text: 'Reifgeist friert ein, Eisbär räumt ab.' },
  ],
  5: [
    { name: 'Fluchbund', monster: [[2, 'unterstuetzer'], [5, 'angreifer']], text: 'Die Fluchpuppe stärkt den Knochenhund.' },
    { name: 'Grabesnebel', monster: [[3, 'verteidiger'], [4, 'magier']], text: 'Die Grabspinne schützt das Irrlicht.' },
    { name: 'Leerenblick', monster: [[9, 'magier'], [8, 'unterstuetzer']], text: 'Schattenwellen und eine Katze, die heilt.' },
  ],
  6: [
    { name: 'Dünenpatrouille', monster: [[2, 'angreifer'], [1, 'verteidiger']], text: 'Skarabäus greift an, der Kaktuskobold deckt.' },
    { name: 'Ruinenspuk', monster: [[9, 'magier'], [7, 'unterstuetzer']], text: 'Treibsand bremst dich, der Wächter heilt.' },
    { name: 'Geierschwarm', monster: [[6, 'verteidiger'], [5, 'angreifer']], text: 'Geierwicht schirmt den Skorpion ab.' },
  ],
  7: [
    { name: 'Rückenwind', monster: [[2, 'magier'], [1, 'unterstuetzer']], text: 'Blitze rauben Energie, der Fink pflegt.' },
    { name: 'Donnerkeil', monster: [[3, 'verteidiger'], [7, 'angreifer']], text: 'Der Blitzkäfer hält, die Donnerkralle trifft.' },
    { name: 'Wirbelsturm', monster: [[9, 'angreifer'], [10, 'angreifer']], text: 'Zwei flinke Stürmer aus den Wolken.' },
  ],
  8: [
    { name: 'Riffwache', monster: [[3, 'verteidiger'], [9, 'angreifer']], text: 'Krabbenkrieger und Muränenbiss.' },
    { name: 'Gezeiten', monster: [[4, 'magier'], [2, 'unterstuetzer']], text: 'Strömung bremst, das Seesternchen heilt.' },
    { name: 'Haifischbecken', monster: [[10, 'angreifer'], [7, 'angreifer']], text: 'Hammerhai und Kugelfisch beißen gemeinsam.' },
  ],
  9: [
    { name: 'Irrlichtreigen', monster: [[0, 'magier'], [1, 'unterstuetzer']], text: 'Moorgas und eine heilende Kröte.' },
    { name: 'Sumpfgrab', monster: [[3, 'verteidiger'], [9, 'angreifer']], text: 'Der Schnapper schützt die Knochenkrähe.' },
    { name: 'Hexenküche', monster: [[8, 'magier'], [10, 'angreifer']], text: 'Der Kesselgeist vergiftet, der Moorwolf jagt.' },
  ],
  10: [
    { name: 'Zahnradwerk', monster: [[0, 'unterstuetzer'], [5, 'angreifer']], text: 'Der Schraubenwicht ölt die Kettenschlange.' },
    { name: 'Dampfkessel', monster: [[3, 'verteidiger'], [8, 'magier']], text: 'Der Dampfspatz deckt die Funkenfliege.' },
    { name: 'Schmiede', monster: [[9, 'angreifer'], [10, 'verteidiger']], text: 'Ambossbär und Turmwächter.' },
  ],
  11: [
    { name: 'Naschbande', monster: [[4, 'unterstuetzer'], [5, 'angreifer']], text: 'Das Watteschaf stärkt den Donutdrachen.' },
    { name: 'Lollilöwe', monster: [[3, 'verteidiger'], [2, 'magier']], text: 'Karamell klebt, der Löwe hält stand.' },
    { name: 'Zuckerbombe', monster: [[9, 'magier'], [10, 'angreifer']], text: 'Kirschbombe und Lebkuchenriese.' },
  ],
  12: [
    { name: 'Mondschein', monster: [[1, 'unterstuetzer'], [5, 'angreifer']], text: 'Der Mondhase stärkt den Astrofuchs.' },
    { name: 'Planetenbahn', monster: [[3, 'verteidiger'], [7, 'magier']], text: 'Die Planetenkugel schützt die Lichtqualle.' },
    { name: 'Supernova', monster: [[9, 'angreifer'], [10, 'magier']], text: 'Galaxiendrache und Sonnenwächter.' },
  ],
};

/**
 * Boss-Duelle: der Boss der Welt und ein Untergebener (kein zweiter Boss -
 * das wäre unübersichtlich und unfair).
 */
export const BOSS_UNTERGEBENE = { 1: 6, 2: 6, 3: 8, 4: 10, 5: 10, 6: 10, 7: 6, 8: 6, 9: 6, 10: 6, 11: 6, 12: 6 };

/**
 * Team-Ausgleich - die Regel für unterschiedlich starke Teams.
 *
 *   Kampfkraft eines Spielers = Angriff × Kartenstärke × Tempo × Lebenspunkte
 *                               ÷ (1 − Verteidigung)   (alles aus seinem Fortschritt)
 *   Weltstärke                = Schaden pro Energie × mittlere Gegner-LP der Welt
 *   Verhältnis v              = Kampfkraft des Teams ÷ (2 × Richtkraft der Welt)
 *
 * Bei v = 1 ist das Team genau so stark, wie die Welt es erwartet. Ist es
 * stärker, teilen die Gegner etwas mehr aus (Wurzel aus v, gedeckelt) und
 * halten nur wenig mehr aus - stärker sein lohnt sich also weiterhin, nur
 * wird es nicht langweilig. Ist das Team schwächer, werden die Gegner
 * etwas milder. Die Grenzen verhindern HP-Schwämme und Frust.
 */
export const TEAM_AUSGLEICH = {
  schaden: { hoch: 0.5, min: 0.8, max: 1.6 },
  hp: { hoch: 0.25, min: 0.9, max: 1.25 },
  // Eine getragene Boss-Kraft macht einen Spieler deutlich stärker.
  kraftFaktor: 1.4,
};

/**
 * Belohnungen. Es gibt Münzen, Erfahrung, Material und Sterne - aber KEINE
 * Trophäen und keine Gratis-Truhen-Zählung, damit die anderen Modi wichtig
 * bleiben. Nur das erste Boss-Duell des Tages bringt eine Silbertruhe.
 */
export const DUELL_BELOHNUNG = {
  muenzen: 0.9, // × Münzbelohnung der Welt (js/data/worlds.js)
  erfahrung: 0.9, // × Erfahrung eines mittleren Gegners der Welt
  sternBonus: 0.1, // je Stern mehr Münzen
  bossFaktor: 2,
  niederlage: { muenzen: 0.2, erfahrung: 0.35 },
  volleSiegeProTag: 6, // danach gibt es nur noch...
  spaeterFaktor: 0.3, // ...diesen Anteil
  material: { chance: 0.5, menge: [1, 3] },
  bossMaterial: [3, 5],
  bossTruhe: 'silbertruhe', // einmal am Tag beim ersten gewonnenen Boss-Duell
};

/** Schnelle Team-Signale - kein Chat, nur feste Sätze. */
export const SIGNALE = [
  { id: 'links', icon: '⬅️', text: 'Greif links an!' },
  { id: 'rechts', icon: '➡️', text: 'Greif rechts an!' },
  { id: 'hilfe', icon: '🆘', text: 'Ich brauche Hilfe!' },
  { id: 'kombo', icon: '⚡', text: 'Team-Kombo!' },
  { id: 'gut', icon: '👍', text: 'Guter Angriff!' },
];

/** Die Gegner eines Paares als Liste { gegner, rolle }. */
export function paarGegner(weltId, paarIndex, bossDuell = false) {
  const welt = getWorld(weltId) ?? WORLDS[0];
  if (bossDuell) {
    const boss = getEnemy(enemyIdFor(welt, welt.enemies.length));
    const helfer = getEnemy(enemyIdFor(welt, BOSS_UNTERGEBENE[welt.id] ?? 6));
    return [
      { gegner: boss, rolle: 'boss' },
      { gegner: helfer, rolle: 'untergebener' },
    ];
  }
  const paare = GEGNER_PAARE[welt.id] ?? GEGNER_PAARE[1];
  const paar = paare[((paarIndex % paare.length) + paare.length) % paare.length];
  return paar.monster.map(([index, rolle]) => ({ gegner: getEnemy(enemyIdFor(welt, index)), rolle }));
}
