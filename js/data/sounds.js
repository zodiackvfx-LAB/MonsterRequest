/**
 * Alle Klänge des Spiels - als reine Daten.
 *
 * Es gibt KEINE Audiodateien. Jeder Klang wird im Browser aus Schwingungen
 * berechnet (siehe js/core/audio.js). Vorteile: nichts zum Herunterladen,
 * keine fremden Rechte, funktioniert offline, und du kannst jeden Klang
 * hier durch Zahlen ändern, ohne ein Tonprogramm zu brauchen.
 *
 * Ein Klang besteht aus einer oder mehreren "Ebenen", die gleichzeitig oder
 * versetzt erklingen.
 *
 * Felder einer Ebene:
 *   form         - 'sine' (weich), 'triangle' (weich-hell), 'square' (spielzeugartig),
 *                  'sawtooth' (rau) oder 'rauschen' (Zischen, z. B. für Treffer)
 *   von          - Tonhöhe in Hertz am Anfang
 *   bis          - Tonhöhe am Ende (weggelassen = bleibt gleich)
 *   start        - Verzögerung in Sekunden (für Melodien)
 *   dauer        - Länge in Sekunden
 *   lautstaerke  - 0 bis 1
 *   anstieg      - wie schnell der Ton einsetzt (klein = hart, groß = weich)
 *   filter       - optional { typ, von, bis } - dämpft hohe oder tiefe Anteile
 *
 * Tonhöhen zur Orientierung: C4 = 262, E4 = 330, G4 = 392, C5 = 523, G5 = 784, C6 = 1047
 */

/** Kurzschreibweise, damit die Liste unten lesbar bleibt. */
function ton(form, von, bis, dauer, lautstaerke, extra = {}) {
  return { form, von, bis: bis ?? von, dauer, lautstaerke, anstieg: 0.004, start: 0, ...extra };
}

export const KLAENGE = {
  /* ---------- Bedienung ---------- */

  // Kurzer, freundlicher Tipp-Ton für jeden Knopf.
  tipp: [ton('triangle', 660, 880, 0.07, 0.22)],

  // Etwas tiefer: "zurück" fühlt sich dadurch anders an als "weiter".
  zurueck: [ton('triangle', 620, 420, 0.09, 0.2)],

  // Großer Knopf (Spiel starten, Weiter): zwei Töne aufwärts.
  bestaetigen: [
    ton('triangle', 523, 523, 0.07, 0.22),
    ton('triangle', 784, 784, 0.11, 0.22, { start: 0.06 }),
  ],

  // Etwas ist gesperrt oder zu teuer: kurzes, tiefes Brummen.
  gesperrt: [ton('square', 180, 120, 0.13, 0.16, { filter: { typ: 'lowpass', von: 900, bis: 400 } })],

  /* ---------- Kampf ---------- */

  // Karte wird gespielt: ein Wischen nach oben.
  karte: [
    ton('triangle', 330, 620, 0.1, 0.18),
    ton('rauschen', 2000, 5000, 0.07, 0.08, { filter: { typ: 'bandpass', von: 1500, bis: 4000 } }),
  ],

  // Treffer: dumpfer Schlag plus kurzes Zischen.
  treffer: [
    ton('sine', 190, 55, 0.16, 0.5, { anstieg: 0.001 }),
    ton('rauschen', 0, 0, 0.11, 0.3, { filter: { typ: 'lowpass', von: 2600, bis: 300 } }),
  ],

  // Starker Treffer (ab etwa 30 Schaden): tiefer und länger.
  trefferStark: [
    ton('sine', 150, 40, 0.3, 0.6, { anstieg: 0.001 }),
    ton('rauschen', 0, 0, 0.22, 0.38, { filter: { typ: 'lowpass', von: 3200, bis: 200 } }),
    ton('sawtooth', 110, 55, 0.2, 0.16, { filter: { typ: 'lowpass', von: 1400, bis: 500 } }),
  ],

  // Heilung: drei helle Töne aufwärts, weich einsetzend.
  heilung: [
    ton('sine', 523, 523, 0.14, 0.2, { anstieg: 0.02 }),
    ton('sine', 659, 659, 0.14, 0.2, { start: 0.08, anstieg: 0.02 }),
    ton('sine', 880, 880, 0.24, 0.22, { start: 0.16, anstieg: 0.02 }),
  ],

  // Schild: ein Wischen nach oben mit metallischem Nachklang.
  schild: [
    ton('rauschen', 0, 0, 0.26, 0.22, { filter: { typ: 'bandpass', von: 600, bis: 3000 } }),
    ton('triangle', 392, 784, 0.26, 0.16, { anstieg: 0.03 }),
  ],

  /* ---------- Boss-Kräfte ----------
   * Jede Boss-Kraft hat ihren eigenen Signatur-Klang statt des früher
   * geliehenen Levelauf-Tons. Gespielt wird der passende beim Auslösen
   * (siehe js/screens/battle.js, Ereignis 'kraft'). Der Name richtet sich
   * nach der "art" der Kraft (js/data/kraefte.js): kraft<Art>. */

  // Schild (Rindenpanzer): schwerer, tiefer Aufbau mit metallischem Ring.
  kraftSchild: [
    ton('sine', 130, 262, 0.36, 0.42, { anstieg: 0.02 }),
    ton('triangle', 330, 660, 0.42, 0.22, { anstieg: 0.03 }),
    ton('rauschen', 0, 0, 0.3, 0.16, { filter: { typ: 'bandpass', von: 500, bis: 2200 } }),
  ],

  // Schildbruch (Prismabrecher): ein splitterndes Zerbrechen aus Glas.
  kraftSchildbruch: [
    ton('rauschen', 0, 0, 0.3, 0.4, { anstieg: 0.001, filter: { typ: 'highpass', von: 5000, bis: 1200 } }),
    ton('square', 1568, 220, 0.22, 0.2, { anstieg: 0.001 }),
    ton('sine', 2637, 1760, 0.3, 0.12, { start: 0.02, anstieg: 0.01 }),
  ],

  // Brand (Inferno): ein anschwellendes Feuer-Rauschen mit tiefem Grollen.
  kraftBrand: [
    ton('rauschen', 0, 0, 0.5, 0.34, { anstieg: 0.08, filter: { typ: 'lowpass', von: 400, bis: 3000 } }),
    ton('sawtooth', 90, 160, 0.5, 0.16, { anstieg: 0.05, filter: { typ: 'lowpass', von: 1200, bis: 600 } }),
    ton('sine', 220, 110, 0.4, 0.14, { anstieg: 0.02 }),
  ],

  // Frost (Frostbann): ein absteigendes, kristallines Glitzern - eiskalt.
  kraftFrost: [
    ton('sine', 1760, 880, 0.45, 0.2, { anstieg: 0.02 }),
    ton('triangle', 1319, 659, 0.4, 0.14, { start: 0.05, anstieg: 0.03 }),
    ton('rauschen', 0, 0, 0.4, 0.13, { filter: { typ: 'highpass', von: 6000, bis: 3000 } }),
  ],

  // Lebensraub (Seelenraub): erst dunkel absinkend (Kraft geht), dann
  // hell aufsteigend (Kraft kommt zurück).
  kraftLebensraub: [
    ton('sawtooth', 440, 220, 0.4, 0.18, { anstieg: 0.03, filter: { typ: 'lowpass', von: 1800, bis: 700 } }),
    ton('sine', 330, 494, 0.45, 0.16, { start: 0.1, anstieg: 0.06 }),
    ton('sine', 660, 990, 0.35, 0.1, { start: 0.18, anstieg: 0.05 }),
  ],

  // Energiesturm (Sandsturm): ein wirbelnder Bö-Sog mit aufsteigendem Pfeifen.
  kraftEnergiesturm: [
    ton('rauschen', 0, 0, 0.5, 0.3, { anstieg: 0.06, filter: { typ: 'bandpass', von: 800, bis: 4000, q: 3 } }),
    ton('triangle', 330, 990, 0.45, 0.14, { anstieg: 0.05 }),
  ],

  // Energieraub (Gewittersturm, Welt 7): ein Donnerschlag und eine
  // absinkende Entladung - die Energie des Gegners bricht weg.
  kraftEnergieraub: [
    ton('rauschen', 0, 0, 0.32, 0.4, { anstieg: 0.001, filter: { typ: 'lowpass', von: 4000, bis: 200 } }),
    ton('sawtooth', 880, 60, 0.3, 0.2, { anstieg: 0.001, filter: { typ: 'lowpass', von: 3000, bis: 400 } }),
    ton('square', 1319, 330, 0.18, 0.12, { start: 0.03 }),
  ],

  /* ---------- Ergebnis ---------- */

  // Sieg: C - E - G - C aufwärts.
  sieg: [
    ton('triangle', 523, 523, 0.13, 0.26),
    ton('triangle', 659, 659, 0.13, 0.26, { start: 0.12 }),
    ton('triangle', 784, 784, 0.13, 0.26, { start: 0.24 }),
    ton('triangle', 1047, 1047, 0.45, 0.3, { start: 0.36 }),
    ton('sine', 1568, 1568, 0.45, 0.1, { start: 0.36, anstieg: 0.05 }),
  ],

  // Niederlage: drei Töne abwärts, dunkler Klang.
  niederlage: [
    ton('sawtooth', 392, 392, 0.2, 0.16, { filter: { typ: 'lowpass', von: 1200, bis: 600 } }),
    ton('sawtooth', 311, 311, 0.2, 0.16, { start: 0.18, filter: { typ: 'lowpass', von: 1100, bis: 500 } }),
    ton('sawtooth', 247, 247, 0.55, 0.18, { start: 0.36, filter: { typ: 'lowpass', von: 1000, bis: 300 } }),
  ],

  // Levelaufstieg: schnelle Tonleiter aufwärts mit Glitzern obendrauf.
  levelauf: [
    ton('square', 523, 523, 0.08, 0.14, { start: 0.0 }),
    ton('square', 659, 659, 0.08, 0.14, { start: 0.07 }),
    ton('square', 784, 784, 0.08, 0.14, { start: 0.14 }),
    ton('square', 1047, 1047, 0.08, 0.14, { start: 0.21 }),
    ton('square', 1319, 1319, 0.3, 0.16, { start: 0.28 }),
    ton('sine', 2093, 2637, 0.4, 0.07, { start: 0.28, anstieg: 0.06 }),
  ],

  // Neue Welt: größere Fanfare.
  neueWelt: [
    ton('triangle', 392, 392, 0.16, 0.26),
    ton('triangle', 523, 523, 0.16, 0.26, { start: 0.15 }),
    ton('triangle', 659, 659, 0.16, 0.26, { start: 0.3 }),
    ton('triangle', 784, 784, 0.7, 0.3, { start: 0.45 }),
    ton('triangle', 1047, 1047, 0.7, 0.22, { start: 0.45 }),
    ton('sine', 196, 196, 0.8, 0.18, { start: 0.45, anstieg: 0.05 }),
  ],

  /* ---------- Belohnungen ---------- */

  // Münzen: zwei helle Klicks, wie Metall auf Metall.
  muenze: [
    ton('square', 1319, 1319, 0.05, 0.12),
    ton('square', 1760, 1760, 0.11, 0.12, { start: 0.05 }),
  ],

  // Beutestück wird aufgedeckt.
  beute: [
    ton('triangle', 880, 1175, 0.1, 0.18),
    ton('sine', 1760, 2349, 0.16, 0.07, { start: 0.04, anstieg: 0.02 }),
  ],

  // Seltenes Beutestück: länger und glitzernder.
  beuteSelten: [
    ton('triangle', 1047, 1568, 0.16, 0.2),
    ton('sine', 2093, 3136, 0.4, 0.09, { start: 0.06, anstieg: 0.04 }),
    ton('sine', 1568, 2093, 0.4, 0.07, { start: 0.12, anstieg: 0.04 }),
  ],

  // Truhe springt auf: Knarzen, dann Funkeln.
  truhe: [
    ton('rauschen', 0, 0, 0.3, 0.22, { filter: { typ: 'lowpass', von: 800, bis: 2600 } }),
    ton('sine', 262, 523, 0.3, 0.14, { anstieg: 0.04 }),
    ton('sine', 1568, 2093, 0.35, 0.09, { start: 0.22, anstieg: 0.05 }),
  ],

  // Kauf oder Aufwertung geglückt.
  kauf: [
    ton('triangle', 587, 587, 0.09, 0.2),
    ton('triangle', 880, 880, 0.2, 0.22, { start: 0.08 }),
    ton('sine', 1760, 1760, 0.25, 0.06, { start: 0.08, anstieg: 0.03 }),
  ],

  // Tagesaufgabe abgeholt.
  aufgabe: [
    ton('square', 784, 784, 0.07, 0.14),
    ton('square', 988, 988, 0.07, 0.14, { start: 0.07 }),
    ton('square', 1319, 1319, 0.26, 0.16, { start: 0.14 }),
  ],
};

export function getKlang(name) {
  return KLAENGE[name] ?? null;
}
