/**
 * Pixel-Figuren für Monster und Gegner.
 *
 * Bei 72 Gegnern kann niemand 72 Bilder von Hand zeichnen. Deshalb setzt
 * diese Datei jede Figur aus Bausteinen zusammen:
 *
 *   1. eine Grundform (Körperbau) - siehe FORMEN weiter unten
 *   2. eine Farbwelt, die sich aus einem Farbwert ergibt
 *   3. Zusätze wie Hörner, Stacheln, Flügel oder ein drittes Auge
 *
 * Die Figuren sind 32 mal 32 Felder gross. Licht- und Schattenkanten werden
 * beim Zeichnen automatisch gesetzt - sie müssen in keiner Form von Hand
 * eingetragen werden.
 *
 * ECHTE GRAFIKEN SPÄTER EINSETZEN:
 * Jedes Monster darf ein Feld "image" bekommen. Ist es gesetzt, wird dieses
 * Bild verwendet und nichts gezeichnet:
 *     { id: '...', name: '...', image: 'bilder/moosgnubbel.png' }
 * Der übrige Code bleibt gleich.
 *
 * Zeichen in den Formen:
 *   .  leer            B  Körper          S  Schatten (dunkler)
 *   L  Bauch/Licht     A  Zusatzfarbe     C  zweite Zusatzfarbe
 *   E  Augenweiß       P  Pupille         M  Mund/Detail
 */

/** Kantenlänge einer Figur in Feldern. */
export const GROESSE = 32;

/** Alle Grundformen. Jede ist 32 Felder breit und 32 hoch. */
const FORMEN = {
  klecks: [
    '................................',
    '................................',
    '..........BBBBBBBBBBBB..........',
    '........BBBBBBBBBBBBBBBB........',
    '.......BBBBBBBBBBBBBBBBBB.......',
    '......BBBBBBBBBBBBBBBBBBBB......',
    '.....BBBBBBBBBBBBBBBBBBBBBB.....',
    '....BBBBBBBBBBBBBBBBBBBBBBBB....',
    '....BBBBBBBBBBBBBBBBBBBBBBBB....',
    '...BBBBBBBBBBBBBBBBBBBBBBBBBB...',
    '...BBBBBBBBBBBBBBBBBBBBBBBBBB...',
    '...BBBEEEEEBBBBBBBBEEEEEBBBBB...',
    '...BBEEEEEEEBBBBBBEEEEEEEBBBB...',
    '...BBEEEPPPEBBBBBBEEEPPPEBBBB...',
    '...BBEEEPPPEBBBBBBEEEPPPEBBBB...',
    '...BBEEEEEEEBBBBBBEEEEEEEBBBB...',
    '...BBBEEEEEBBBBBBBBEEEEEBBBBB...',
    '...BBBBBBBBBBBBBBBBBBBBBBBBBB...',
    '....BBBBBBBBMMMMMMBBBBBBBBBB....',
    '....BBBBBBBMMMMMMMMBBBBBBBBB....',
    '....BBBBBBBBMMMMMMBBBBBBBBBB....',
    '.....BBBBBBBBBBBBBBBBBBBBBB.....',
    '.....BBBBBBBBBBBBBBBBBBBBBB.....',
    '......LLLLBBBBBBBBBBBBLLLL......',
    '.......LLLLLLLLLLLLLLLLLL.......',
    '........LLLLLLLLLLLLLLLL........',
    '.........LLLLLLLLLLLLLL.........',
    '.......SSSSS......SSSSS.........',
    '.......SSSSS......SSSSS.........',
    '.......SSSSS......SSSSS.........',
    '................................',
    '................................',
  ],
  vierbeiner: [
    '................................',
    '..AA......................AA....',
    '..AAA....................AAA....',
    '...AAA..................AAA.....',
    '....AAA................AAA......',
    '.....AA...............AA........',
    '......A..BBBBBBBBBBBBBB.........',
    '.....BBBBBBBBBBBBBBBBBBBB.......',
    '...BBBBBBBBBBBBBBBBBBBBBBB......',
    '..BBBBBBBBBBBBBBBBBBBBBBBBB.....',
    '.BBBBBBBBBBBBBBBBBBBBBBBBBBB....',
    'BBBBBBBBBBBBBBBBBBBBBEEEEEBB....',
    'BBBBBBBBBBBBBBBBBBBBEEPPPEBBB...',
    '.BBBBBBBBBBBBBBBBBBBEEPPPEBBB...',
    '..BBBBBBBBBBBBBBBBBBEEEEEBBBB...',
    '...BBBBBBBBBBBBBBBBBBBBBBBBBB...',
    '...BBBBBBBBBBBBBBBBBBBBBBMMBB...',
    '...BBBBBBBBBBBBBBBBBBBBBBMMBB...',
    '...LLBBBBBBBBBBBBBBBBBBBBBBB....',
    '....LLLLLLLLLLLLLLLLLLLLLLL.....',
    '.....LLLLLLLLLLLLLLLLLLLLL......',
    '....BBBB....BBBB....BBBB........',
    '....BBBB....BBBB....BBBB........',
    '....BBBB....BBBB....BBBB........',
    '....SSSS....SSSS....SSSS........',
    '....SSSS....SSSS....SSSS........',
    '....SSSS....SSSS....SSSS........',
    '....SSSS....SSSS....SSSS........',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  fluegler: [
    '................................',
    '.AAA........................AAA.',
    '.AAAAA....................AAAAA.',
    'AAAAAAA..................AAAAAAA',
    'AAAAAAAA................AAAAAAAA',
    'AAAAAAAAA...BBBBBB.....AAAAAAAAA',
    'AAAAAAAAA..BBBBBBBB...AAAAAAAAAA',
    '.AAAAAAAA.BBBBBBBBBB..AAAAAAAAA.',
    '.AAAAAAABBBBBBBBBBBBBBAAAAAAAAA.',
    '..AAAAABBBEEEEBBEEEEBBBAAAAAAA..',
    '..AAAABBBEEPPEBBEEPPEBBBAAAAAA..',
    '...AAABBBEEPPEBBEEPPEBBBAAAAA...',
    '....AABBBBEEEEBBEEEEBBBBAAAA....',
    '.....ABBBBBBBBBBBBBBBBBBAAA.....',
    '......BBBBBBMMMMMMBBBBBBBA......',
    '......BBBBBBMMMMMMBBBBBBB.......',
    '......BBBBBBBBBBBBBBBBBBB.......',
    '.......BBBBBBBBBBBBBBBBB........',
    '.......BBBBBBBBBBBBBBBBB........',
    '........LLLLLLLLLLLLLL..........',
    '.........LLLLLLLLLLLL...........',
    '..........LLLLLLLLLL............',
    '..........CCC....CCC............',
    '..........CCC....CCC............',
    '..........SSS....SSS............',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  gestalt: [
    '................................',
    '..............AA................',
    '.............AAAA...............',
    '............AAAAAA..............',
    '...........AAAAAAAA.............',
    '..........BBBBBBBBBB............',
    '.........BBBBBBBBBBBB...........',
    '........BBBBBBBBBBBBBB..........',
    '........BBEEEEBBEEEEBB..........',
    '........BEEEPPEBEEPPEB..........',
    '........BEEEPPEBEEPPEB..........',
    '........BBEEEEBBEEEEBB..........',
    '........BBBBBBBBBBBBBB..........',
    '.........BBBMMMMMMBBB...........',
    '..........BBBBBBBBBB............',
    '...BB......BBBBBBBB......BB.....',
    '..BBBB....BBBBBBBBBB....BBBB....',
    '.BBBBB...BBBBBBBBBBBB...BBBBB...',
    'BBBBB...BBBBBBBBBBBBBB...BBBBB..',
    'BBBB....BBBBBBBBBBBBBB....BBBB..',
    'CCC.....LLBBBBBBBBBBLL.....CCC..',
    '........LLLLLLLLLLLLLL..........',
    '.........LLLLLLLLLLLL...........',
    '..........BBBB..BBBB............',
    '..........BBBB..BBBB............',
    '..........BBBB..BBBB............',
    '.........SSSSS..SSSSS...........',
    '.........SSSSS..SSSSS...........',
    '.........SSSSS..SSSSS...........',
    '................................',
    '................................',
    '................................',
  ],
  schlange: [
    '................................',
    '..........BBBBBBBBBB............',
    '.........BBBBBBBBBBBB...........',
    '........BBBBBBBBBBBBBB..........',
    '........BBEEEEBBEEEEBB..........',
    '........BEEEPPEBEEPPEB..........',
    '........BEEEPPEBEEPPEB..........',
    '........BBEEEEBBEEEEBB..........',
    '........BBBBBBBBBBBBBB..........',
    '.........BBBMMMMMMBBB...........',
    '..........BBBBBBBBBB............',
    '...........BBBBBBBB.............',
    '............BBBBBB..............',
    '...........BBBBBBBB.............',
    '..........BBBBBBBBBB............',
    '.........BBBBBBBBBB.............',
    '........BBBBBBBBBB..............',
    '.......BBBBBBBBBB...............',
    '......BBBBBBBBBB................',
    '.....BBBBBBBBBB.................',
    '....BBBBBBBBBB.............AAA..',
    '...BBBBBBBBBB............AAAAAA.',
    '..BBBBBBBBBB...........AAAAAAAA.',
    '..LBBBBBBBBBBBBBBBBBBBBAAAAAAA..',
    '..LLBBBBBBBBBBBBBBBBBBBBAAAA....',
    '...LLLLLLLLLLLLLLLLLLLLLL.......',
    '....LLLLLLLLLLLLLLLLLLL.........',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  golem: [
    '................................',
    '....AAA..................AAA....',
    '...AAAAA................AAAAA...',
    '...AAAAA................AAAAA...',
    '....AAA..................AAA....',
    '.....BBBBBBBBBBBBBBBBBBBBBB.....',
    '....BBBBBBBBBBBBBBBBBBBBBBBB....',
    '...BBBBBBBBBBBBBBBBBBBBBBBBBB...',
    '...BBBBBBBBBBBBBBBBBBBBBBBBBB...',
    '...BBEEEEEBBBBBBBBBBEEEEEBBBB...',
    '...BBEEPPPEBBBBBBBBEEEPPPEBBB...',
    '...BBEEPPPEBBBBBBBBEEEPPPEBBB...',
    '...BBEEEEEBBBBBBBBBBEEEEEBBBB...',
    '...BBBBBBBBBBBBBBBBBBBBBBBBBB...',
    '..BBBBBBBMMMMMMMMMMMMBBBBBBBBB..',
    '..BBBBBBBMMMMMMMMMMMMBBBBBBBBB..',
    '.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBB.',
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'BBBBLLLLBBBBBBBBBBBBBBLLLLBBBBBB',
    'BBBBLLLLLLLLLLLLLLLLLLLLLLBBBBBB',
    'BBBBLLLLLLLLLLLLLLLLLLLLLLBBBBBB',
    '.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBB.',
    '..SSSSSS......SSSSSS......SSSS..',
    '..SSSSSS......SSSSSS......SSSS..',
    '..SSSSSS......SSSSSS......SSSS..',
    '...SSSS........SSSS........SS...',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  kaefer: [
    '................................',
    '..A..........................A..',
    '..AA........................AA..',
    '...AA......................AA...',
    '....AA....BBBBBBBBBB.....AA.....',
    '.....AA..BBBBBBBBBBBB...AA......',
    '......A.BBBBBBBBBBBBBB.A........',
    '.......BBBBBBBBBBBBBBBB.........',
    '......BBEEEEEBBBBEEEEEBB........',
    '......BEEEPPPEBBEEEPPPEB........',
    '......BEEEPPPEBBEEEPPPEB........',
    '......BBEEEEEBBBBEEEEEBB........',
    '.....BBBBBBBBBBBBBBBBBBBB.......',
    '.....BBBBBBMMMMMMMMBBBBBB.......',
    '....BBBBBBBBBBBBBBBBBBBBBB......',
    '...BBBBBBBBBBBBBBBBBBBBBBBB.....',
    '..BBBBBBLLLLBBBBLLLLBBBBBBBB....',
    '.SBBBBBBLLLLBBBBLLLLBBBBBBBBS...',
    'SSBBBBBBBLLBBBBBBLLBBBBBBBBBSS..',
    'SSBBBBBBBBBBBBBBBBBBBBBBBBBBSS..',
    '.SBBBBBBBBBBBBBBBBBBBBBBBBBBS...',
    '..BBBBBBBBBBBBBBBBBBBBBBBBBB....',
    '..SS.SS..SS..........SS..SS.....',
    '.SS...SS..SS........SS....SS....',
    'SS.....SS..SS......SS......SS...',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  geist: [
    '................................',
    '................................',
    '..........BBBBBBBBBBBB..........',
    '........BBBBBBBBBBBBBBBB........',
    '.......BBBBBBBBBBBBBBBBBB.......',
    '......BBBBBBBBBBBBBBBBBBBB......',
    '.....BBBBBBBBBBBBBBBBBBBBBB.....',
    '.....BBBBBBBBBBBBBBBBBBBBBB.....',
    '....BBBBEEEEEBBBBEEEEEBBBBBB....',
    '....BBBEEEEEEEBBEEEEEEEBBBBB....',
    '....BBBEEEPPPEBBEEEPPPEBBBBB....',
    '....BBBEEEPPPEBBEEEPPPEBBBBB....',
    '....BBBEEEEEEEBBEEEEEEEBBBBB....',
    '....BBBBEEEEEBBBBEEEEEBBBBBB....',
    '....BBBBBBBBBBBBBBBBBBBBBBBB....',
    '..CCBBBBBBBMMMMMMMMBBBBBBBBCC...',
    '.CCCBBBBBBBMMMMMMMMBBBBBBBBCCC..',
    '.CCCBBBBBBBBMMMMMMBBBBBBBBBCCC..',
    '..CCBBBBBBBBBBBBBBBBBBBBBBBCC...',
    '....BBBBBBBBBBBBBBBBBBBBBBBB....',
    '....LLLBBBBBBBBBBBBBBBBBBLLL....',
    '....LLLLLLLLLLLLLLLLLLLLLLLL....',
    '....LLLLLLLLLLLLLLLLLLLLLLLL....',
    '....LLLL..LLLLLL..LLLLLLLLLL....',
    '....LLL....LLLL....LLLL..LLL....',
    '....LL......LL......LL....LL....',
    '.....L.......L.......L.....L....',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  drache: [
    '....A......................A....',
    '...AA......................AA...',
    'A.AAA......................AAA.A',
    'AAACAA....................AACAAA',
    'AACCCAA....BBBBBB........AACCCAA',
    'ACCCCCAA..BBBBBBBB......AACCCCCA',
    'ACCCCCCA.BBBBBBBBBB....ACCCCCCCA',
    'ACCCCCCAABBBBBBBBBBBBAACCCCCCCCA',
    'AACCCCCABBEEEEBBEEEEBBACCCCCCCAA',
    'AAACCCCABBEEEPPEBEEPPEBACCCCCAAA',
    '.AAACCCABBEEEPPEBEEPPEBACCCCAAA.',
    '..AAACCABBBEEEEBBEEEEBBACCCAAA..',
    '...AAACAABBBBBBBBBBBBBBAACAAA...',
    '....AAAA.BBBMMMMMMMMBBB.AAAA....',
    '.....AA..BBBMMMMMMMMBBB..AA.....',
    '........BBBBBBBBBBBBBBBB........',
    '.......BBBBBBBBBBBBBBBBBB.......',
    '......BBBBBBBBBBBBBBBBBBBB......',
    '......BBBLLLLBBBBLLLLBBBBB......',
    '.......BBLLLLLLLLLLLLBBBB.......',
    '.......BBBLLLLLLLLLLBBBBB.......',
    '........BBBBBBBBBBBBBBBB....CC..',
    '........BBBB......BBBB.....CCC..',
    '........BBBB......BBBB...CCCC...',
    '.......SSSSS.....SSSSS.CCCC.....',
    '.......SSSSS.....SSSSS..........',
    '.......SSSSS.....SSSSS..........',
    '........SSS.......SSS...........',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  herrscher: [
    '.....A....A....A....A...........',
    '....AAA..AAA..AAA..AAA..........',
    '....AAAAAAAAAAAAAAAAAA..........',
    '....AAAAAAAAAAAAAAAAAA..........',
    '.....BBBBBBBBBBBBBBBB...........',
    '....BBBBBBBBBBBBBBBBBB..........',
    '...BBBBBBBBBBBBBBBBBBBB.........',
    '...BBEEEEEBBBBBBEEEEEBB.........',
    '...BEEEPPPEBBBBEEEPPPEB.........',
    '...BEEEPPPEBBBBEEEPPPEB.........',
    '...BBEEEEEBBBBBBEEEEEBB.........',
    '...BBBBBBBBBBBBBBBBBBBB.........',
    '....BBBBMMMMMMMMMMBBBB..........',
    '..C..BBBBBBBBBBBBBBB..C.........',
    '.CCC..BBBBBBBBBBBBB..CCC........',
    'CCCCC.BBBBBBBBBBBBBB.CCCCC......',
    'CCCCCBBBBBBBBBBBBBBBBCCCCCC.....',
    'CCCCCBBBBBBBBBBBBBBBBCCCCCC.....',
    'CCCCCBBBBBBBBBBBBBBBBCCCCCC.....',
    'CCCCCBBBLLLLBBBBLLLLBBCCCCC.....',
    'CCCCCBBBLLLLLLLLLLLLBBCCCCC.....',
    '.CCCCBBBBLLLLLLLLLLBBBCCCC......',
    '..CCCBBBBBBBBBBBBBBBBBCCC.......',
    '...CCCBBBBBBBBBBBBBBBCCC........',
    '....C.BBBBBB....BBBBB.C.........',
    '......BBBBBB....BBBBB...........',
    '......SSSSSS....SSSSS...........',
    '......SSSSSS....SSSSS...........',
    '......SSSSSS....SSSSS...........',
    '................................',
    '................................',
    '................................',
  ],
};

/**
 * Prüft, ob alle Formen die richtige Größe haben.
 * Wird vom Test in tests/regeln.test.mjs benutzt - eine verrutschte Zeile
 * in einer Form würde die Figur sonst unbemerkt verunstalten.
 *
 * @returns {string[]} Liste der Probleme (leer = alles in Ordnung)
 */
export function formenPruefen() {
  const probleme = [];
  for (const [name, zeilen] of Object.entries(FORMEN)) {
    if (zeilen.length !== GROESSE) {
      probleme.push(`${name}: ${zeilen.length} Zeilen statt ${GROESSE}`);
    }
    zeilen.forEach((zeile, i) => {
      if (zeile.length !== GROESSE) {
        probleme.push(`${name}, Zeile ${i}: ${zeile.length} Zeichen statt ${GROESSE}`);
      }
    });
  }
  return probleme;
}

/** Formen für normale Gegner. */
export const FORM_NAMEN = Object.keys(FORMEN).filter(
  (name) => !['drache', 'herrscher'].includes(name)
);

/** Formen, die nur Bosse bekommen - damit sie sich abheben. */
export const BOSS_FORMEN = ['drache', 'herrscher', 'golem'];

/* ------------------------------------------------------------------ */
/*  Zusätze                                                            */
/* ------------------------------------------------------------------ */

/**
 * Sucht den Kopfbereich einer Form: die oberste Zeile mit Körper und deren
 * linken und rechten Rand. Dadurch sitzen Hörner und Stacheln bei jeder Form
 * an der richtigen Stelle, ohne dass sie einzeln eingetragen werden müssen.
 */
function kopfBereich(grid) {
  for (let y = 0; y < grid.length; y++) {
    const links = grid[y].indexOf('B');
    if (links >= 0) {
      return { y, links, rechts: grid[y].lastIndexOf('B') };
    }
  }
  return { y: 0, links: 12, rechts: 19 };
}

function setzen(grid, x, y, zeichen) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) return;
  const zeile = grid[y].split('');
  zeile[x] = zeichen;
  grid[y] = zeile.join('');
}

/** Zwei gebogene Hörner auf dem Kopf. */
function hoerner(grid) {
  const { y, links, rechts } = kopfBereich(grid);
  for (let i = 0; i < 5; i++) {
    setzen(grid, links + 2 - i, y - 1 - i, 'A');
    setzen(grid, links + 3 - i, y - 1 - i, 'A');
    setzen(grid, rechts - 2 + i, y - 1 - i, 'A');
    setzen(grid, rechts - 3 + i, y - 1 - i, 'A');
  }
}

/** Stachelkamm über dem Rücken. */
function stacheln(grid) {
  const { y, links, rechts } = kopfBereich(grid);
  for (let x = links + 2; x <= rechts - 2; x += 4) {
    setzen(grid, x, y - 1, 'A');
    setzen(grid, x, y - 2, 'A');
    setzen(grid, x - 1, y - 1, 'A');
  }
}

/** Ein drittes Auge über den anderen beiden. */
function drittesAuge(grid) {
  // Die Zeile mit den ersten Augen finden und darüber ein weiteres setzen.
  const augenZeile = grid.findIndex((zeile) => zeile.includes('P'));
  if (augenZeile < 3) return;
  const mitte = Math.floor(GROESSE / 2);
  for (let x = mitte - 2; x <= mitte + 1; x++) {
    setzen(grid, x, augenZeile - 3, 'E');
    setzen(grid, x, augenZeile - 2, 'E');
  }
  setzen(grid, mitte - 1, augenZeile - 2, 'P');
  setzen(grid, mitte, augenZeile - 2, 'P');
}

/** Ein Schweif, der seitlich heraussteht. */
function schweif(grid) {
  const unten = grid.reduce((letzte, zeile, y) => (zeile.includes('B') ? y : letzte), 0);
  const start = Math.max(0, unten - 9);
  for (let i = 0; i < 7; i++) {
    setzen(grid, GROESSE - 3 + Math.min(2, i), start + i, 'C');
    setzen(grid, GROESSE - 4 + Math.min(3, i), start + i, 'C');
  }
}

const ZUSAETZE = [null, hoerner, stacheln, drittesAuge, schweif];

/* ------------------------------------------------------------------ */
/*  Farben                                                             */
/* ------------------------------------------------------------------ */

function farbwelt(hue, sattheit, akzentHue) {
  return {
    B: `hsl(${hue}, ${sattheit}%, 54%)`,
    S: `hsl(${hue}, ${sattheit}%, 36%)`,
    L: `hsl(${hue}, ${Math.round(sattheit * 0.85)}%, 72%)`,
    A: `hsl(${akzentHue}, ${Math.min(95, sattheit + 15)}%, 62%)`,
    C: `hsl(${(akzentHue + 40) % 360}, ${Math.min(95, sattheit + 10)}%, 55%)`,
    E: '#ffffff',
    P: '#141d33',
    M: `hsl(${hue}, ${sattheit}%, 24%)`,
    kante: `hsl(${hue}, ${Math.round(sattheit * 0.9)}%, 16%)`,
  };
}

/** Aus einem Text eine immer gleiche Zahl machen - so bleibt jede Figur gleich. */
function zahlAus(text) {
  let wert = 0;
  for (let i = 0; i < text.length; i++) wert = (wert * 31 + text.charCodeAt(i)) % 100000;
  return wert;
}

/**
 * Das Aussehen eines Monsters. Steht im Monster ein eigenes "look", wird das
 * genommen; sonst wird eines aus der id abgeleitet - immer dasselbe.
 */
export function aussehenVon(monster) {
  if (monster.look) return { ...standardAussehen(monster), ...monster.look };
  return standardAussehen(monster);
}

function standardAussehen(monster) {
  const zahl = zahlAus(monster.id ?? monster.name ?? 'monster');
  return {
    form: FORM_NAMEN[zahl % FORM_NAMEN.length],
    hue: (zahl * 37) % 360,
    sattheit: 55 + (zahl % 4) * 10,
    akzentHue: (zahl * 37 + 140) % 360,
    zusatz: zahl % ZUSAETZE.length,
  };
}

/* ------------------------------------------------------------------ */
/*  Zeichnen                                                           */
/* ------------------------------------------------------------------ */

const zwischenspeicher = new Map();

/** Wird von aussen gesetzt, damit sprite.js nichts ueber den Spielstand wissen muss. */
let skinNachschlag = () => null;

/**
 * Legt fest, wie der aktive Skin eines Monsters gefunden wird.
 * Wird einmal beim Start gesetzt (siehe js/main.js).
 */
export function setSkinNachschlag(funktion) {
  skinNachschlag = funktion;
}

/** Leert den Zwischenspeicher - nötig, wenn ein Skin gewechselt wurde. */
export function spritesNeuZeichnen() {
  zwischenspeicher.clear();
}

function feld(grid, x, y) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) return '.';
  return grid[y][x];
}

/**
 * Zeichnet die Figur und gibt sie als Bild-Adresse zurück.
 * Jede Figur wird nur einmal gezeichnet und danach wiederverwendet.
 */
export function spriteDataUrl(monster, optionen = {}) {
  // Ohne Vorgabe gilt der getragene Skin. Die Sammlung gibt dagegen gezielt
  // einen bestimmten Skin vor, um ihn in der Vorschau zu zeigen - sonst
  // saehen dort alle Skins wie der gerade getragene aus.
  const skin = 'skin' in optionen ? optionen.skin : skinNachschlag(monster);
  const key = `${monster.id ?? monster.name}${skin ? `+${skin.id}` : ''}`;
  if (zwischenspeicher.has(key)) return zwischenspeicher.get(key);

  // Ein Skin überschreibt nur die Farben, nicht die Form.
  const look = { ...aussehenVon(monster), ...(skin?.look ?? {}) };
  const grid = [...(FORMEN[look.form] ?? FORMEN.klecks)];
  const zusatz = ZUSAETZE[look.zusatz % ZUSAETZE.length];
  if (zusatz) zusatz(grid);

  const farben = farbwelt(look.hue, look.sattheit, look.akzentHue);
  const canvas = document.createElement('canvas');
  canvas.width = GROESSE;
  canvas.height = GROESSE;
  const ctx = canvas.getContext('2d');

  // 1. Kante: jedes belegte Feld wird nach allen Seiten um ein Feld
  //    verbreitert. Das ergibt eine saubere dunkle Kontur, ohne dass sie
  //    in jeder Form von Hand gezeichnet werden muss.
  ctx.fillStyle = farben.kante;
  for (let y = 0; y < GROESSE; y++) {
    for (let x = 0; x < GROESSE; x++) {
      if (feld(grid, x, y) === '.') continue;
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
  }

  // 2. Füllung mit automatischer Licht- und Schattenkante:
  //    Körperfelder, über denen nichts liegt, bekommen Licht;
  //    Körperfelder, unter denen nichts liegt, bekommen Schatten.
  //    Dadurch wirken die Figuren rund, ohne dass jede Schattierung
  //    von Hand gezeichnet werden muss.
  for (let y = 0; y < GROESSE; y++) {
    for (let x = 0; x < GROESSE; x++) {
      const zeichen = feld(grid, x, y);
      if (zeichen === '.') continue;

      let farbe = farben[zeichen] ?? farben.B;

      if (zeichen === 'B') {
        if (feld(grid, x, y - 1) === '.') farbe = farben.L;
        else if (feld(grid, x, y + 1) === '.') farbe = farben.S;
      }

      // Augenglanz: das obere linke Feld einer Pupille wird hell. Das gibt
      // den Augen Leben, ohne dass es in jeder Form eingetragen werden muss.
      if (zeichen === 'P' && feld(grid, x, y - 1) === 'E' && feld(grid, x - 1, y) === 'E') {
        farbe = '#ffffff';
      }

      ctx.fillStyle = farbe;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const url = canvas.toDataURL('image/png');
  zwischenspeicher.set(key, url);
  return url;
}

/**
 * Erzeugt das Bild einer Figur zum Einhängen in die Seite.
 *
 * @param {object} monster - Monster oder Gegner
 * @param {object} [options]
 * @param {string} [options.className] - zusätzliche CSS-Klassen
 */
export function createSprite(monster, optionen = {}) {
  const img = document.createElement('img');
  const skin = 'skin' in optionen ? optionen.skin : skinNachschlag(monster);

  // Ein eigenes Bild hat Vorrang vor der berechneten Pixelfigur. So bekommt
  // Timo seine gezeichneten Grafiken, alle Gegner weiterhin gerechnete.
  const eigenesBild = optionen.bild ?? monster.image;

  if (eigenesBild) {
    img.src = eigenesBild;
    // Ein fertiges Bild lässt sich nicht umrechnen - ein Skin wird deshalb
    // als Farbfilter darübergelegt (siehe SKINS in js/data/items.js).
    if (skin?.filter) img.style.filter = skin.filter;
  } else {
    img.src = spriteDataUrl(monster, optionen);
  }

  const klassen = ['pixel-sprite'];
  // Menschen sind schmal und hoch und dürfen über den quadratischen Kasten
  // hinauswachsen, sonst wirken sie neben den Gegnern winzig.
  if (monster.hoch) klassen.push('pixel-sprite--hoch');
  if (optionen.className) klassen.push(optionen.className);

  img.alt = monster.name ?? '';
  img.className = klassen.join(' ');
  img.draggable = false;
  return img;
}

/**
 * Spielt eine Bildfolge auf einer Figur ab und kehrt danach zum Ausgangsbild
 * zurück - so wird aus Einzelbildern eine Angriffsanimation.
 *
 * @param {HTMLElement} spriteElement - der Kasten mit dem Bild darin
 * @param {string[]} bilder - die Bildadressen der Reihe nach
 * @param {number} [proBild] - Anzeigedauer je Bild in Millisekunden
 * @returns {function} Abbrechen - stoppt die Folge und stellt das Bild zurück
 */
export function spieleBildfolge(spriteElement, bilder, proBild = 75) {
  const img = spriteElement?.querySelector('img');
  if (!img || !bilder?.length) return () => {};

  const ausgangsbild = img.src;
  const timer = [];

  bilder.forEach((bild, index) => {
    timer.push(setTimeout(() => { img.src = bild; }, index * proBild));
  });
  timer.push(setTimeout(() => { img.src = ausgangsbild; }, bilder.length * proBild));

  return () => {
    timer.forEach(clearTimeout);
    img.src = ausgangsbild;
  };
}

/**
 * Lädt Bilder im Voraus, damit die erste Animation nicht ruckelt.
 * Wird einmal beim Start aufgerufen (js/main.js).
 */
export function bilderVorladen(bilder) {
  bilder.filter(Boolean).forEach((bild) => {
    const img = new Image();
    img.src = bild;
  });
}
