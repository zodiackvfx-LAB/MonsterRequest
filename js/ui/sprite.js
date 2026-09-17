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
 * Aus Form + Farbe + Zusätzen entstehen tausende Kombinationen, und jede
 * Figur hat einen eigenen Umriss, ein Gesicht und eine eigene Farbgebung.
 *
 * ECHTE GRAFIKEN SPÄTER EINSETZEN:
 * Jedes Monster darf ein Feld "image" bekommen. Ist es gesetzt, wird dieses
 * Bild verwendet und nichts gezeichnet:
 *     { id: '...', name: '...', image: 'bilder/moosgnubbel.png' }
 * Der übrige Code bleibt gleich.
 *
 * Zeichen in den Formen:
 *   .  leer          B  Körper        S  Schatten (dunkler)
 *   L  Bauch/Licht   A  Zusatzfarbe   E  Augenweiß
 *   P  Pupille       M  Mund/Detail
 */

/** Alle Grundformen. Jede ist 16 Zeichen breit und 16 hoch. */
const FORMEN = {
  // Rundes Wesen mit kleinen Füßen
  klecks: [
    '................',
    '......BBBB......',
    '....BBBBBBBB....',
    '...BBBBBBBBBB...',
    '..BBBBBBBBBBBB..',
    '..BBBBBBBBBBBB..',
    '..BBEEBBBBEEBB..',
    '..BBEPBBBBEPBB..',
    '..BBBBBBBBBBBB..',
    '..BBBBMMMMBBBB..',
    '..LBBBBBBBBBBL..',
    '..LLBBBBBBBBLL..',
    '...LLLLLLLLLL...',
    '....SSS..SSS....',
    '....SSS..SSS....',
    '................',
  ],

  // Vierbeiner mit Kopf vorn und Schwanz hinten
  vierbeiner: [
    '................',
    '.........BBBB...',
    'A.......BBBBBB..',
    'AA.....BBBBBBBB.',
    '.AA....BBEEBBBB.',
    '..BBBBBBBEPBBBB.',
    '.BBBBBBBBBBBMBB.',
    'BBBBBBBBBBBBBBB.',
    'BBBBBBBBBBBBBB..',
    'LBBBBBBBBBBBB...',
    '.LLLLLLLLLLL....',
    '.SS..SS..SS.....',
    '.SS..SS..SS.....',
    '.SS..SS..SS.....',
    '................',
    '................',
  ],

  // Geflügeltes Wesen mit weit gespannten Flügeln
  fluegler: [
    '................',
    'AAA.........AAA.',
    'AAAAA.....AAAAA.',
    'AAAAAA.BB.AAAAAA',
    'AAAAABBBBBBAAAAA',
    '.AAAABEEBEEBAAA.',
    '..AAABEPBEPBAA..',
    '...AABBBBBBBA...',
    '....BBBMMMBB....',
    '....BBBBBBBB....',
    '....LBBBBBBL....',
    '.....LLLLLL.....',
    '.....S....S.....',
    '....SS....SS....',
    '................',
    '................',
  ],

  // Aufrechte Gestalt mit Armen und Beinen
  gestalt: [
    '................',
    '.....AAAAAA.....',
    '....BBBBBBBB....',
    '...BBBBBBBBBB...',
    '...BBEEBBEEBB...',
    '...BBEPBBEPBB...',
    '...BBBBBBBBBB...',
    '....BBMMMMBB....',
    '..B..BBBBBB..B..',
    '.BB.BBBBBBBB.BB.',
    'BB..LBBBBBBL..BB',
    '....LLLLLLLL....',
    '....BBB..BBB....',
    '....SSS..SSS....',
    '...SSSS..SSSS...',
    '................',
  ],

  // Schlange, aufgerichtet
  schlange: [
    '................',
    '......BBBB......',
    '.....BBBBBB.....',
    '.....BEEBEEB....',
    '.....BEPBEPB....',
    '.....BBBBBBB....',
    '......BMMMB.....',
    '.......BBB......',
    '......BBBB......',
    '.....BBBBB......',
    '....BBBBB.......',
    '...BBBBB....AAA.',
    '..BBBBB...AAAAA.',
    '.LLBBBBBBBBBAA..',
    '..LLLLLLLLLLL...',
    '................',
  ],

  // Schwerer Golem aus Brocken
  golem: [
    '................',
    '..AA........AA..',
    '..BBBBBBBBBBBB..',
    '.BBBBBBBBBBBBBB.',
    '.BBEEBBBBBBEEBB.',
    '.BBEPBBBBBBEPBB.',
    '.BBBBBBBBBBBBBB.',
    'BBBBBMMMMMMBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBLLBBBBBBBBLLBB',
    'BBLLLLLLLLLLLLBB',
    '.SSS.SSSSSS.SSS.',
    '.SSS.SSSSSS.SSS.',
    '..SS..SSSS..SS..',
    '................',
  ],

  // Krabbelnder Käfer mit Fühlern
  kaefer: [
    '................',
    '.A............A.',
    '..A..........A..',
    '...AA.BBBB.AA...',
    '....BBBBBBBB....',
    '...BBEEBBEEBB...',
    '...BBEPBBEPBB...',
    '..BBBBBBBBBBBB..',
    '.SBBBBBBBBBBBBS.',
    'SSBBLLBBBBLLBBSS',
    'S.BBBLLLLLLBBB.S',
    '..BBBBBBBBBBBB..',
    '.S.SS.SS.SS.SS.S',
    'S...S..S..S...S.',
    '................',
    '................',
  ],

  // Boss: gehörnter Drache mit Flügeln
  drache: [
    '.A............A.',
    '.AA..........AA.',
    'AAAA..BBBB..AAAA',
    'AAAAABBBBBBAAAAA',
    'AAAABBEEBEEBBAAA',
    '.AAABBEPBEPBBAA.',
    '..AABBBBBBBBBA..',
    '...BBMMMMMMBB...',
    '..BBBBBBBBBBBB..',
    '.BBBBBBBBBBBBBB.',
    '.LLBBBBBBBBBBLL.',
    '..LLLLLLLLLLLL..',
    '..SS..SSSS..SS..',
    '.SSS..SSSS..SSS.',
    '.SS....SS....SS.',
    '................',
  ],

  // Boss: gekrönte Gestalt mit Umhang
  herrscher: [
    '...A.A.AA.A.A...',
    '...AAAAAAAAAA...',
    '....BBBBBBBB....',
    '...BBBBBBBBBB...',
    '...BBEEBBEEBB...',
    '...BBEPBBEPBB...',
    '...BBBBBBBBBB...',
    '....BBMMMMBB....',
    '..ABBBBBBBBBBA..',
    '.AABBBBBBBBBBAA.',
    'AAALBBBBBBBBLAAA',
    'AAALLLLLLLLLLAAA',
    '.AA.BBB..BBB.AA.',
    '....SSS..SSS....',
    '...SSSS..SSSS...',
    '................',
  ],

  // Geist mit wehendem Saum
  geist: [
    '................',
    '.....BBBBBB.....',
    '...BBBBBBBBBB...',
    '..BBBBBBBBBBBB..',
    '..BBEEBBBBEEBB..',
    '..BBEPBBBBEPBB..',
    '..BBBBBBBBBBBB..',
    '..BBBBMMMMBBBB..',
    '..BBBBBBBBBBBB..',
    '..LBBBBBBBBBBL..',
    '..LLBBBBBBBBLL..',
    '..LLLLLLLLLLLL..',
    '..LL.LLLL.LLLL..',
    '..L...LL...LL...',
    '................',
    '................',
  ],
};

/** Formen für normale Gegner. */
export const FORM_NAMEN = Object.keys(FORMEN).filter(
  (name) => !['drache', 'herrscher'].includes(name)
);

/** Formen, die nur Bosse bekommen - damit sie sich abheben. */
export const BOSS_FORMEN = ['drache', 'herrscher', 'golem'];

/* ------------------------------------------------------------------ */
/*  Zusätze                                                            */
/* ------------------------------------------------------------------ */

/** Hörner oben auf dem Kopf. */
function hoerner(grid) {
  setzen(grid, 4, 0, 'A');
  setzen(grid, 5, 1, 'A');
  setzen(grid, 11, 0, 'A');
  setzen(grid, 10, 1, 'A');
}

/** Stachelkamm auf dem Rücken. */
function stacheln(grid) {
  for (let x = 5; x <= 10; x += 2) setzen(grid, x, 0, 'A');
}

/** Ein drittes Auge auf der Stirn. */
function drittesAuge(grid) {
  setzen(grid, 7, 3, 'E');
  setzen(grid, 8, 3, 'E');
  setzen(grid, 7, 4, 'P');
  setzen(grid, 8, 4, 'P');
}

/** Ein Schweif seitlich. */
function schweif(grid) {
  setzen(grid, 15, 8, 'A');
  setzen(grid, 15, 9, 'A');
  setzen(grid, 14, 10, 'A');
}

const ZUSAETZE = [null, hoerner, stacheln, drittesAuge, schweif];

function setzen(grid, x, y, zeichen) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) return;
  const zeile = grid[y].split('');
  zeile[x] = zeichen;
  grid[y] = zeile.join('');
}

/* ------------------------------------------------------------------ */
/*  Farben                                                             */
/* ------------------------------------------------------------------ */

function farbwelt(hue, sattheit, akzentHue) {
  return {
    B: `hsl(${hue}, ${sattheit}%, 56%)`,
    S: `hsl(${hue}, ${sattheit}%, 38%)`,
    L: `hsl(${hue}, ${Math.round(sattheit * 0.8)}%, 74%)`,
    A: `hsl(${akzentHue}, ${Math.min(95, sattheit + 15)}%, 62%)`,
    E: '#ffffff',
    P: '#141d33',
    M: `hsl(${hue}, ${sattheit}%, 26%)`,
    umriss: `hsl(${hue}, ${Math.round(sattheit * 0.9)}%, 18%)`,
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

/**
 * Zeichnet die Figur und gibt sie als Bild-Adresse zurück.
 * Jede Figur wird nur einmal gezeichnet und danach wiederverwendet.
 */
export function spriteDataUrl(monster) {
  const key = monster.id ?? monster.name;
  if (zwischenspeicher.has(key)) return zwischenspeicher.get(key);

  const look = aussehenVon(monster);
  const grid = [...(FORMEN[look.form] ?? FORMEN.klecks)];
  const zusatz = ZUSAETZE[look.zusatz % ZUSAETZE.length];
  if (zusatz) zusatz(grid);

  const farben = farbwelt(look.hue, look.sattheit, look.akzentHue);
  const groesse = grid.length;
  const canvas = document.createElement('canvas');
  canvas.width = groesse;
  canvas.height = groesse;
  const ctx = canvas.getContext('2d');

  // 1. Umriss: jedes belegte Feld wird nach allen Seiten um ein Feld
  //    verbreitert. Das ergibt eine saubere dunkle Kontur, ohne dass sie
  //    in jeder Form von Hand gezeichnet werden muss.
  ctx.fillStyle = farben.umriss;
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === '.') continue;
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
  }

  // 2. Füllung
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const zeichen = grid[y][x];
      if (zeichen === '.') continue;
      ctx.fillStyle = farben[zeichen] ?? farben.B;
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
export function createSprite(monster, { className = '' } = {}) {
  const img = document.createElement('img');
  // Ein eigenes Bild hat Vorrang - so lassen sich später echte Grafiken
  // einsetzen, ohne hier etwas zu ändern.
  img.src = monster.image ?? spriteDataUrl(monster);
  img.alt = monster.name ?? '';
  img.className = `pixel-sprite ${className}`.trim();
  img.draggable = false;
  return img;
}
