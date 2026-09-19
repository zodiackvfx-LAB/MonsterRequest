/**
 * Hintergrundmusik - je Welt eine eigene Stimmung.
 *
 * Wie die Klänge wird auch die Musik im Browser berechnet, nicht geladen.
 * Jede Welt hat ein festes Motiv, das sich wiederholt - die Welten 16 Achtel,
 * das Titelthema 32. Dadurch
 * klingt es nach Musik und nicht nach Zufall. Für Abwechslung sorgt die
 * Basslinie, die einer kleinen Akkordfolge folgt, und jeder vierte Durchgang,
 * der eine Oktave höher spielt.
 *
 * Die Kategorie kommt aus js/data/worlds.js (Feld "music").
 *
 * Felder:
 *   grundton    - Grundfrequenz in Hertz (tiefer = schwerer)
 *   skala       - Halbtonschritte über dem Grundton; bestimmt die Stimmung
 *   muster      - die Achtel des Motivs (Vielfaches von MUSTER_TAKT).
 *                 Eine Zahl ist ein Platz in der Tonleiter, null eine Pause.
 *                 Ein Platz oberhalb der Tonleiter geht eine Oktave höher
 *                 weiter: bei sieben Stufen ist 7 wieder der Grundton.
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

  /*
   * Das Titelthema von MonsterQuest.
   *
   * Es ist doppelt so lang wie die Weltmotive (32 Achtel), damit es eine
   * richtige Melodie mit Frage und Antwort sein kann: Der erste Teil steigt
   * bis zur Oktave hinauf, der zweite kommt Schritt für Schritt zum
   * Grundton zurück.
   *
   * Tonleiter in G-Dur, Platz 0 bis 7:
   *   0=G  1=A  2=H  3=C  4=D  5=E  6=Fis  7=G eine Oktave höher
   *
   * Darunter liegt die Akkordfolge G - D - Em - C. Die klingt nach
   * Aufbruch, ohne aufdringlich zu sein.
   */
  menue: {
    grundton: 196.0, // G3
    skala: [0, 2, 4, 5, 7, 9, 11], // Dur
    muster: [
      // "D - G - Fis - D" : hinauf zur Oktave
      4, null, 7, null, 6, null, 4, null,
      // "E - D - H" : erstes Zurücksinken
      5, null, null, 4, 2, null, null, null,
      // "H - E - D - H" : noch einmal Anlauf
      2, null, 5, null, 4, null, 2, null,
      // "A - H - G" : Ankunft auf dem Grundton
      1, null, 2, null, 0, null, null, null,
    ],
    bassfolge: [0, 4, 5, 3], // G - D - Em - C
    tempo: 92,
    form: 'triangle', // wärmer als sine, trägt die Melodie besser
    bassForm: 'sine',
    lautstaerke: 0.9,
  },
};

/**
 * Ein Basston alle acht Achtel - das ist der Grundtakt.
 * Jedes Muster muss ein Vielfaches davon lang sein.
 */
export const MUSTER_TAKT = 8;

export function getMusik(kategorie) {
  return MUSIK[kategorie] ?? MUSIK.menue;
}
