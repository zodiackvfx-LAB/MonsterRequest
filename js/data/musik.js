/**
 * Hintergrundmusik - je Welt eine eigene Stimmung.
 *
 * Wie die Klänge wird auch die Musik im Browser berechnet, nicht geladen.
 * Jede Welt hat ein festes Motiv von 16 Achteln, das sich wiederholt. Dadurch
 * klingt es nach Musik und nicht nach Zufall. Für Abwechslung sorgt die
 * Basslinie, die einer kleinen Akkordfolge folgt, und jeder vierte Durchgang,
 * der eine Oktave höher spielt.
 *
 * Die Kategorie kommt aus js/data/worlds.js (Feld "music").
 *
 * Felder:
 *   grundton    - Grundfrequenz in Hertz (tiefer = schwerer)
 *   skala       - Halbtonschritte über dem Grundton; bestimmt die Stimmung
 *   muster      - 16 Achtel. Eine Zahl ist ein Platz in der Skala,
 *                 null ist eine Pause.
 *   bassfolge   - Plätze in der Skala; ein Basston auf Schlag 1 und 3
 *   tempo       - Schläge pro Minute
 *   form        - Klangfarbe der Melodie
 *   bassForm    - Klangfarbe des Basses
 *   lautstaerke - Feinabstimmung dieser Welt
 *
 * Tonleitern:
 *   Pentatonik [0,2,4,7,9]     - offen, klingt immer gut
 *   Ganzton    [0,2,4,6,8,10]  - schwebend, ohne Zuhause
 *   Phrygisch  [0,1,3,5,7,8]   - fremd, bedrohlich
 */
export const MUSIK = {
  // Grünes Tal: hell und freundlich, eine wandernde Melodie
  wald: {
    grundton: 196.0, // G3
    skala: [0, 2, 4, 7, 9],
    muster: [0, null, 2, null, 4, null, 2, null, 3, null, 2, null, 0, null, null, null],
    bassfolge: [0, 3, 2, 0],
    tempo: 96,
    form: 'triangle',
    bassForm: 'sine',
    lautstaerke: 1,
  },

  // Kristallhöhlen: hoch, gläsern, viel Platz zwischen den Tönen
  hoehle: {
    grundton: 220.0, // A3
    skala: [0, 2, 3, 7, 10],
    muster: [0, null, null, null, 3, null, null, 2, null, null, 4, null, null, null, 1, null],
    bassfolge: [0, 0, 2, 2],
    tempo: 76,
    form: 'sine',
    bassForm: 'sine',
    lautstaerke: 1.05,
  },

  // Vulkanlande: treibend und rau, kaum Pausen
  vulkan: {
    grundton: 146.83, // D3
    skala: [0, 1, 3, 5, 7],
    muster: [0, 0, null, 2, 0, null, 3, null, 0, 0, null, 4, 2, null, 1, null],
    bassfolge: [0, 0, 4, 3],
    tempo: 132,
    form: 'sawtooth',
    bassForm: 'square',
    lautstaerke: 0.75,
  },

  // Eisgebirge: langsam, klar, kalt - Ganztonleiter ohne Zuhause
  eis: {
    grundton: 261.63, // C4
    skala: [0, 2, 4, 6, 8, 10],
    muster: [0, null, null, null, 2, null, null, null, 4, null, null, 3, null, null, null, null],
    bassfolge: [0, 2, 4, 2],
    tempo: 68,
    form: 'sine',
    bassForm: 'triangle',
    lautstaerke: 1,
  },

  // Schattenreich: dunkel und schleichend
  schatten: {
    grundton: 130.81, // C3
    skala: [0, 1, 3, 5, 8],
    muster: [0, null, null, 1, null, null, 3, null, null, 2, null, null, 1, null, null, null],
    bassfolge: [0, 0, 1, 0],
    tempo: 84,
    form: 'triangle',
    bassForm: 'sawtooth',
    lautstaerke: 0.9,
  },

  // Wüstenreich: warm, mit fremdartigen Halbtönen
  wueste: {
    grundton: 174.61, // F3
    skala: [0, 1, 4, 5, 7, 8],
    muster: [0, null, 1, null, 3, null, 4, 3, null, 1, null, 0, null, null, 2, null],
    bassfolge: [0, 3, 0, 4],
    tempo: 108,
    form: 'triangle',
    bassForm: 'sine',
    lautstaerke: 0.95,
  },

  // Menü und Startbildschirm: ruhig, gehört zu keiner Welt
  menue: {
    grundton: 174.61, // F3
    skala: [0, 2, 4, 7, 9],
    muster: [0, null, null, 2, null, null, 4, null, null, 2, null, null, 3, null, null, null],
    bassfolge: [0, 2, 3, 2],
    tempo: 84,
    form: 'sine',
    bassForm: 'sine',
    lautstaerke: 0.85,
  },
};

/** Wie viele Achtel ein Motiv lang ist. */
export const MUSTER_LAENGE = 16;

export function getMusik(kategorie) {
  return MUSIK[kategorie] ?? MUSIK.menue;
}
