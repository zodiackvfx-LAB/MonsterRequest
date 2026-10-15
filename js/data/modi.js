/**
 * Die drei Kampf-Modi neben Abenteuer und Endlos-Arena.
 *
 *   Tägliche Herausforderung - jeden Tag ein anderer Gegner mit einem
 *                              Kniff (zäher, wilder, flinker ...). Der
 *                              erste Sieg des Tages bringt eine Silbertruhe.
 *   Boss-Rush                - alle Bosse, die man schon besiegt hat,
 *                              hintereinander. Zwischen den Kämpfen heilt
 *                              man nur ein Stück. Wer durchkommt, bekommt
 *                              einmal am Tag eine Truhe.
 *   Zeitangriff              - drei Gegner der höchsten Welt so schnell wie
 *                              möglich. Jede neue Bestzeit bringt eine
 *                              Holztruhe.
 *
 * HIER STELLST DU DIE WERTE EIN. Die Regeln (wer darf, was gibt es) stehen
 * in js/core/modi.js, der Kampf selbst läuft über den normalen
 * Kampfbildschirm (js/screens/battle.js).
 *
 * Alle Funktionen hier bekommen, was sie brauchen, als Argument - sie lesen
 * keinen Spielstand. Dasselbe Datum ergibt immer denselben Gegner.
 */

import { getEnemy } from './enemies.js';
import { bossLevelOf, levelsOfWorld } from './levels.js';

export const MODI = {
  tages: {
    id: 'tages',
    name: 'Tägliche Herausforderung',
    kurz: 'Herausforderung',
    icon: '🎯',
    text: 'Jeden Tag ein neuer Gegner mit einem Kniff. Erster Sieg des Tages: Silbertruhe.',
    belohnung: 'silbertruhe',
  },
  bossrush: {
    id: 'bossrush',
    name: 'Boss-Rush',
    kurz: 'Boss-Rush',
    icon: '👑',
    text: 'Alle besiegten Bosse hintereinander. Einmal am Tag gibt es eine Truhe.',
    // Zwischen zwei Bossen heilt man diesen Anteil der Lebenspunkte.
    heilung: 0.3,
    // Ab so vielen Bossen gibt es die Goldtruhe, sonst die Silbertruhe.
    goldAb: 3,
  },
  zeit: {
    id: 'zeit',
    name: 'Zeitangriff',
    kurz: 'Zeitangriff',
    icon: '⏱️',
    text: 'Drei Gegner so schnell wie möglich. Jede neue Bestzeit: Holztruhe.',
    gegner: 3,
    belohnung: 'holztruhe',
  },
};

/**
 * Die Kniffe der Täglichen Herausforderung. Jeden Tag gilt einer.
 *   hp, schaden - Faktor auf Leben und Schaden des Gegners
 *   reaktion    - Faktor auf seine Reaktionszeit (kleiner = schneller)
 *   abwehr      - zusätzlicher Anteil Schaden, den er abfängt
 */
export const TAGES_KNIFFE = [
  { id: 'zaeh', name: 'Extra zäh', icon: '🪨', text: 'Der Gegner hat 60 % mehr Leben.', hp: 1.6 },
  { id: 'wild', name: 'Wild', icon: '🔥', text: 'Der Gegner teilt 35 % mehr aus.', hp: 1.15, schaden: 1.35 },
  { id: 'flink', name: 'Flink', icon: '💨', text: 'Der Gegner reagiert blitzschnell.', hp: 1.2, reaktion: 0.55 },
  { id: 'gepanzert', name: 'Gepanzert', icon: '🛡️', text: 'Der Gegner fängt ein Viertel jedes Treffers ab.', hp: 1.15, abwehr: 0.25 },
  { id: 'riese', name: 'Riese', icon: '🦣', text: 'Mehr Leben UND mehr Schaden.', hp: 1.35, schaden: 1.2 },
];

/** Eine gleichmäßige Zahl aus einem Text - derselbe Text, dieselbe Zahl. */
function streuwert(text) {
  let wert = 2166136261;
  for (let i = 0; i < text.length; i++) {
    wert ^= text.charCodeAt(i);
    wert = Math.imul(wert, 16777619);
  }
  return wert >>> 0;
}

/** Die normalen Gegner (ohne Boss) einer Welt. */
function normaleGegner(weltId) {
  return levelsOfWorld(weltId).filter((l) => !l.isBoss).map((l) => getEnemy(l.enemyId));
}

/**
 * Der Gegner der Täglichen Herausforderung.
 * @param {string} datum - "JJJJ-MM-TT"
 * @param {number} weltId - die höchste freigeschaltete Welt
 * @returns {{gegner: object, kniff: object}}
 */
export function tagesHerausforderung(datum, weltId) {
  const pool = normaleGegner(weltId);
  const zahl = streuwert(`tages-${datum}`);
  const basis = pool[zahl % pool.length];
  const kniff = TAGES_KNIFFE[Math.floor(zahl / 7) % TAGES_KNIFFE.length];
  return {
    kniff,
    gegner: {
      ...basis,
      id: `tages-${basis.id}`,
      variante: `${kniff.icon} ${kniff.name}`,
      maxHp: Math.round(basis.maxHp * (kniff.hp ?? 1)),
      damageFactor: (basis.damageFactor ?? 1) * (kniff.schaden ?? 1),
      reactionTime: Math.max(0.35, (basis.reactionTime ?? 1) * (kniff.reaktion ?? 1)),
      defense: Math.min(0.5, (basis.defense ?? 0) + (kniff.abwehr ?? 0)),
    },
  };
}

/**
 * Die Bosse für den Boss-Rush - in der Reihenfolge der Welten.
 * @param {number[]} weltIds - Welten, deren Boss schon besiegt ist
 */
export function bossRushGegner(weltIds) {
  return [...weltIds]
    .sort((a, b) => a - b)
    .map((id) => bossLevelOf(id))
    .filter(Boolean)
    .map((level) => getEnemy(level.enemyId));
}

/**
 * Die drei Gegner des Zeitangriffs: aus der höchsten Welt, jeden Tag andere.
 * @param {string} datum
 * @param {number} weltId
 */
export function zeitGegner(datum, weltId) {
  const pool = normaleGegner(weltId);
  const start = streuwert(`zeit-${datum}`) % pool.length;
  return Array.from({ length: MODI.zeit.gegner }, (_, i) => pool[(start + i) % pool.length]);
}

