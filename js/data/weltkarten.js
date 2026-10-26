/**
 * Wie die Weltkarte einer Welt aussieht: Farben, Landschaft, Verzierung,
 * Effekte. NUR Daten - gezeichnet wird in js/ui/weltkarte/.
 *
 * "Grünes Tal" ist vollständig ausgestaltet. Alle anderen Welten bekommen
 * ihre Karte automatisch aus ihren Farben in js/data/worlds.js und einer
 * Vorlage passend zu ihrer Kulisse (VORLAGEN unten). Soll eine Welt eine
 * eigene, ausgearbeitete Karte bekommen, trägst du sie in KARTEN ein - alle
 * Felder sind optional und überschreiben die Vorlage.
 *
 * Felder:
 *   farben      - siehe FARBEN_GRUENES_TAL (gleiche Namen in jeder Welt)
 *   baum        - Form der Bäume: 'laub' | 'tanne' | 'kristall' | 'felsnadel'
 *                 | 'kahl' | 'kaktus' | 'koralle' | 'lolli'
 *   deko        - was auf der Karte steht und wie dicht (je 1000 x 1000):
 *                   baeume, bluetenbaeume, felsen, buesche, pilze, blumen,
 *                   gras (Dichte) und fluss, wasserfall, see, ruinen, fahne,
 *                   laternen, zaeune, vordergrund (an/aus)
 *   leben       - bewegte Dinge: schmetterlinge, blaetter (fallende Blätter
 *                 oder Blüten), glitzer, wolken, wolkenschatten, grasWiegen
 *   teilchen    - Art der fallenden Teilchen ('blatt', 'bluete', 'flocke',
 *                 'glut', 'funke', 'stern')
 */

/** Die Farben des Grünen Tals - Vorbild für alle anderen Welten. */
const FARBEN_GRUENES_TAL = {
  himmelOben: '#3f9fe6',
  himmelUnten: '#d4f0ff',
  sonne: '#fff6d0',
  bergFern: '#9fb3e0',
  bergFernHell: '#c9d6f2',
  bergNah: '#7593c4',
  bergNahHell: '#a9bde6',
  schnee: '#f6faff',
  huegelFern: '#5f9f6a',
  wald: '#3f7f4a',
  wiese: '#6fc04a',
  wieseHell: '#a6dc6a',
  wieseDunkel: '#3f8f34',
  weg: '#e6d29c',
  wegRand: '#b99a5e',
  wasser: '#3fa6e0',
  wasserHell: '#a6e4ff',
  wasserTief: '#1f6fae',
  ufer: '#8a7550',
  fels: '#a39d90',
  felsHell: '#d2cbbb',
  felsDunkel: '#6a645a',
  moos: '#6eae36',
  holz: '#8d5a30',
  holzDunkel: '#5a3a1c',
  laub: '#4f9c36',
  laubHell: '#a4dc5a',
  laubDunkel: '#2a6526',
  stamm: '#7a5232',
  bluete: '#ffb6d3',
  blueteHell: '#ffe2ef',
  blueteDunkel: '#e0709f',
  blumen: ['#b47cf0', '#ffd34d', '#ffffff', '#ff8fbd', '#7fb8ff'],
  glitzer: '#fff3b0',
};

const KARTEN = {
  1: {
    farben: FARBEN_GRUENES_TAL,
    baum: 'laub',
    deko: {
      baeume: 6,
      bluetenbaeume: 2,
      felsen: 5,
      buesche: 6,
      pilze: 3,
      blumen: 9,
      gras: 30,
      fluss: true,
      wasserfall: true,
      see: true,
      ruinen: true,
      fahne: true,
      laternen: true,
      zaeune: true,
      vordergrund: true,
    },
    leben: {
      schmetterlinge: true,
      blaetter: true,
      glitzer: true,
      wolken: true,
      wolkenschatten: true,
      grasWiegen: true,
    },
    teilchen: 'bluete',
  },
};

/**
 * Vorlagen je Kulisse (Feld "scenery" in js/data/worlds.js). Sie legen fest,
 * welche Formen und Dinge eine Welt hat; die Farben kommen aus der Welt.
 */
const VORLAGEN = {
  wald: { baum: 'laub', wasser: ['#3fa6e0', '#a6e4ff', '#1f6fae'], teilchen: 'blatt', deko: { fluss: true, wasserfall: true, see: true } },
  kristall: { baum: 'kristall', wasser: ['#7a6bf0', '#cbbfff', '#3d2f9e'], teilchen: 'funke', deko: { see: true, pilze: 4 } },
  vulkan: { baum: 'felsnadel', wasser: ['#ff7a1f', '#ffd36b', '#b8320f'], teilchen: 'glut', deko: { fluss: true, wasserfall: true, blumen: 0 } },
  eis: { baum: 'tanne', wasser: ['#9fdcf5', '#effaff', '#5aa7d6'], teilchen: 'flocke', deko: { see: true } },
  schatten: { baum: 'kahl', wasser: ['#4a3a78', '#8f7ad0', '#22183f'], teilchen: 'funke', deko: { see: true, pilze: 5, blumen: 2 } },
  wueste: { baum: 'kaktus', wasser: ['#3fb6d0', '#b6f0ff', '#1f7f9e'], teilchen: 'funke', deko: { see: true, blumen: 1, buesche: 2 } },
  riff: { baum: 'koralle', wasser: ['#2f9fd8', '#a6e8ff', '#145f9a'], teilchen: 'funke', deko: { see: true } },
  moor: { baum: 'kahl', wasser: ['#4f6b3c', '#8fa86a', '#2b3a22'], teilchen: 'funke', deko: { see: true, pilze: 6 } },
  uhrwerk: { baum: 'felsnadel', wasser: ['#5f8fa8', '#b6d8e8', '#2f5f78'], teilchen: 'funke', deko: { fluss: true } },
  zucker: { baum: 'lolli', wasser: ['#ff8fc8', '#ffd6ee', '#d0508f'], teilchen: 'bluete', deko: { fluss: true, see: true } },
  sterne: { baum: 'kristall', wasser: ['#3f3a9f', '#9f9aff', '#1a165f'], teilchen: 'stern', deko: { see: true } },
};

/** Grundausstattung jeder Welt - die Vorlage ergänzt oder überschreibt. */
const GRUND_DEKO = {
  baeume: 5,
  bluetenbaeume: 0,
  felsen: 6,
  buesche: 4,
  pilze: 2,
  blumen: 5,
  gras: 22,
  fluss: false,
  wasserfall: false,
  see: false,
  ruinen: true,
  fahne: true,
  laternen: true,
  zaeune: false,
  vordergrund: true,
};

/**
 * Das fertige Kartenthema einer Welt.
 * @param {object} welt - Eintrag aus js/data/worlds.js
 */
export function kartenThema(welt) {
  const eigene = KARTEN[welt.id];
  const vorlage = VORLAGEN[welt.scenery] ?? VORLAGEN.wald;
  const farben = { ...farbenAusWelt(welt, vorlage), ...(eigene?.farben ?? {}) };
  return {
    id: welt.id,
    farben,
    baum: eigene?.baum ?? vorlage.baum,
    deko: { ...GRUND_DEKO, ...vorlage.deko, ...(eigene?.deko ?? {}) },
    leben: {
      schmetterlinge: false,
      blaetter: true,
      glitzer: true,
      wolken: true,
      wolkenschatten: true,
      grasWiegen: true,
      ...(eigene?.leben ?? {}),
    },
    teilchen: eigene?.teilchen ?? vorlage.teilchen,
    ausgearbeitet: Boolean(eigene),
  };
}

/** Leitet alle Kartenfarben aus den zehn Farben einer Welt ab. */
function farbenAusWelt(welt, vorlage) {
  const f = welt.farben ?? {};
  const [wasser, wasserHell, wasserTief] = vorlage.wasser;
  return {
    ...FARBEN_GRUENES_TAL,
    himmelOben: f.himmelOben ?? FARBEN_GRUENES_TAL.himmelOben,
    himmelUnten: f.himmelUnten ?? FARBEN_GRUENES_TAL.himmelUnten,
    bergFern: mischen(f.fels ?? '#7c8fb5', f.himmelUnten ?? '#ffffff', 0.45),
    bergFernHell: mischen(f.fels ?? '#7c8fb5', '#ffffff', 0.55),
    bergNah: f.fels ?? FARBEN_GRUENES_TAL.bergNah,
    bergNahHell: mischen(f.fels ?? '#7c8fb5', '#ffffff', 0.3),
    schnee: f.schnee ?? FARBEN_GRUENES_TAL.schnee,
    huegelFern: mischen(f.wieseDunkel ?? '#3f8f2c', f.himmelUnten ?? '#ffffff', 0.25),
    wald: f.wieseDunkel ?? FARBEN_GRUENES_TAL.wald,
    wiese: f.wiese ?? FARBEN_GRUENES_TAL.wiese,
    wieseHell: f.wieseHell ?? FARBEN_GRUENES_TAL.wieseHell,
    wieseDunkel: f.wieseDunkel ?? FARBEN_GRUENES_TAL.wieseDunkel,
    weg: mischen(f.wieseHell ?? '#e6d29c', '#f2e2b0', 0.6),
    wegRand: mischen(f.wieseDunkel ?? '#b99a5e', '#8a6a3a', 0.5),
    wasser,
    wasserHell,
    wasserTief,
    fels: f.fels ?? FARBEN_GRUENES_TAL.fels,
    felsHell: mischen(f.fels ?? '#a39d90', '#ffffff', 0.4),
    felsDunkel: f.felsDunkel ?? FARBEN_GRUENES_TAL.felsDunkel,
    moos: f.wieseHell ?? FARBEN_GRUENES_TAL.moos,
    laub: f.baum ?? FARBEN_GRUENES_TAL.laub,
    laubHell: mischen(f.baum ?? '#4f9c36', '#ffffff', 0.4),
    laubDunkel: f.baumDunkel ?? FARBEN_GRUENES_TAL.laubDunkel,
    stamm: mischen(f.baumDunkel ?? '#7a5232', '#5a3a1c', 0.5),
  };
}

/** Mischt zwei Hex-Farben (anteil 0 = nur a, 1 = nur b). */
export function mischen(a, b, anteil) {
  const lang = (hex) => (hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex);
  const zahl = (hex) => [1, 3, 5].map((i) => parseInt(lang(hex).slice(i, i + 2), 16));
  const [x, y] = [zahl(a), zahl(b)];
  return `#${x
    .map((wert, i) => Math.round(wert + (y[i] - wert) * anteil).toString(16).padStart(2, '0'))
    .join('')}`;
}
