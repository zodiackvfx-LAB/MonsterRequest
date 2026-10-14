/**
 * Trophäen und Ligen - wie bei Clash Royale.
 *
 * Trophäen zeigen, wie weit und wie gut jemand spielt. Sie entscheiden die
 * Liga und den Platz in der Rangliste (siehe js/screens/rangliste.js).
 *
 * HIER STELLST DU DIE WERTE EIN:
 *
 *   Erster Sieg in einem Kampf  GRUND + JE_WELT × Weltnummer
 *                               (Welt 1: 15, Welt 7: 45), Boss doppelt
 *   Sieg beim Wiederholen       WIEDERHOLUNG (Boss doppelt) - damit sich
 *                               ein leichter Kampf nicht endlos lohnt
 *   Niederlage                  minus NIEDERLAGE - aber nie unter die
 *                               Grenze der eigenen Liga
 *
 * Wer alle 7 Welten einmal schafft, hat 2730 Trophäen. Die Ligen sind so
 * gelegt, dass man mit jeder geschafften Welt ungefähr eine Liga aufsteigt.
 * Die Endlos-Arena bringt keine Trophäen - sie läuft bewusst ohne Belohnung.
 */

export const TROPHAEEN = {
  GRUND: 10,
  JE_WELT: 5,
  BOSS_FAKTOR: 2,
  WIEDERHOLUNG: 2,
  NIEDERLAGE: 5,
};

/** Mehr zeigt die Rangliste nicht an - schützt vor unsinnigen Werten. */
export const TROPHAEEN_MAX = 100000;

/**
 * Die Ligen, aufsteigend. "ab" = so viele Trophäen braucht man.
 * farbe färbt das Abzeichen (siehe .liga-abzeichen in css/erlebnis.css).
 */
export const LIGEN = [
  { id: 'holz', name: 'Holzliga', ab: 0, icon: '🪵', farbe: '#b9844f' },
  { id: 'bronze', name: 'Bronzeliga', ab: 150, icon: '🥉', farbe: '#d08a4e' },
  { id: 'silber', name: 'Silberliga', ab: 400, icon: '🥈', farbe: '#b8c6dc' },
  { id: 'gold', name: 'Goldliga', ab: 750, icon: '🥇', farbe: '#ffc53d' },
  { id: 'kristall', name: 'Kristallliga', ab: 1100, icon: '💎', farbe: '#5fd8ff' },
  { id: 'meister', name: 'Meisterliga', ab: 1600, icon: '🔮', farbe: '#c07bff' },
  { id: 'legende', name: 'Legendenliga', ab: 2100, icon: '🔥', farbe: '#ff7a45' },
  { id: 'champion', name: 'Championliga', ab: 2700, icon: '👑', farbe: '#ffe27a' },
];

/** Die Liga zu einer Trophäenzahl. */
export function ligaVon(trophaeen) {
  let liga = LIGEN[0];
  for (const eintrag of LIGEN) {
    if (trophaeen >= eintrag.ab) liga = eintrag;
  }
  return liga;
}

/** Die nächste Liga - oder null, wenn man schon in der höchsten ist. */
export function naechsteLiga(trophaeen) {
  return LIGEN.find((liga) => liga.ab > trophaeen) ?? null;
}

/**
 * Trophäen für einen Sieg.
 * @param {object} level - aus js/data/levels.js (worldId, isBoss)
 * @param {boolean} erstesMal - der erste Sieg in diesem Kampf?
 */
export function trophaeenFuerSieg(level, erstesMal) {
  const boss = level.isBoss ? TROPHAEEN.BOSS_FAKTOR : 1;
  if (!erstesMal) return TROPHAEEN.WIEDERHOLUNG * boss;
  return (TROPHAEEN.GRUND + TROPHAEEN.JE_WELT * (Number(level.worldId) || 1)) * boss;
}
