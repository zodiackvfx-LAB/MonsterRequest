/**
 * Fortschritt eines Charakters und seiner Attacken.
 *
 * Hier steht die gesamte Rechnerei an EINER Stelle:
 *   - wie viel Erfahrung ein Charakter-Level kostet
 *   - was ein Level-Up an den Werten ändert
 *   - was einzelne Wert-Aufwertungen kosten und bringen
 *   - wie stark eine Attacke auf höherem Level wird und was das kostet
 *
 * Wichtig: Das Charakter-Level hat NICHTS mit den Welten zu tun. Man kann in
 * Welt 2 stehen und Charakter-Level 17 haben - oder umgekehrt.
 *
 * Willst du das Spiel leichter oder schwerer machen, ändere die Zahlen hier.
 */

import { gameState, saveProgress } from './state.js';

/* ------------------------------------------------------------------ */
/*  Charakter-Level                                                    */
/* ------------------------------------------------------------------ */

/** Höchstes Charakter-Level. */
export const MAX_LEVEL = 50;

/**
 * Erfahrung für den Schritt von diesem Level zum nächsten.
 * Level 1→2: 100, 2→3: 145, 3→4: 210, 4→5: 305 ...
 * Jedes Level kostet also rund 45 Prozent mehr als das davor.
 */
export function xpFuerNaechstesLevel(level) {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round((100 * Math.pow(1.45, level - 1)) / 5) * 5;
}

/** Der gespeicherte Fortschritt eines Charakters (legt ihn bei Bedarf an). */
export function getCharakter(monsterId) {
  if (!gameState.characters[monsterId]) {
    gameState.characters[monsterId] = {
      level: 1,
      xp: 0,
      upgrades: { hp: 0, angriff: 0, verteidigung: 0, tempo: 0 },
    };
  }
  const charakter = gameState.characters[monsterId];
  charakter.upgrades = { hp: 0, angriff: 0, verteidigung: 0, tempo: 0, ...charakter.upgrades };
  return charakter;
}

/**
 * Erfahrung gutschreiben. Steigt der Charakter dabei auf, wird das
 * zurückgemeldet, damit der Kampfbildschirm es anzeigen kann.
 *
 * @returns {{levelVorher: number, levelNachher: number, aufgestiegen: boolean}}
 */
export function xpGutschreiben(monsterId, xp) {
  const charakter = getCharakter(monsterId);
  const levelVorher = charakter.level;

  charakter.xp += xp;
  while (charakter.level < MAX_LEVEL && charakter.xp >= xpFuerNaechstesLevel(charakter.level)) {
    charakter.xp -= xpFuerNaechstesLevel(charakter.level);
    charakter.level += 1;
  }
  if (charakter.level >= MAX_LEVEL) charakter.xp = 0;

  saveProgress();
  return {
    levelVorher,
    levelNachher: charakter.level,
    aufgestiegen: charakter.level > levelVorher,
  };
}

/* ------------------------------------------------------------------ */
/*  Wert-Aufwertungen (getrennt vom Level!)                            */
/* ------------------------------------------------------------------ */

/**
 * Die vier aufwertbaren Werte. Jeder hat eine eigene Stufe, die man mit
 * Münzen und Material kauft - unabhängig vom Charakter-Level.
 */
export const WERTE = {
  hp: { name: 'Lebenspunkte', icon: '❤️', proStufe: 12, einheit: 'LP' },
  angriff: { name: 'Angriff', icon: '⚔️', proStufe: 5, einheit: '%' },
  verteidigung: { name: 'Verteidigung', icon: '🛡️', proStufe: 2, einheit: '%' },
  tempo: { name: 'Tempo', icon: '⚡', proStufe: 2, einheit: '%' },
};

/** Höchste Stufe je Wert. */
export const MAX_STUFE = 10;

/** Was die nächste Stufe eines Wertes kostet. */
export function aufwertungsKosten(stufe) {
  return {
    muenzen: Math.round((250 * Math.pow(1.55, stufe)) / 10) * 10,
    material: 2 + stufe * 2,
  };
}

/**
 * Wertet einen Charakterwert auf, wenn Münzen und Material reichen.
 * @returns {boolean} true, wenn es geklappt hat
 */
export function wertAufwerten(monsterId, wert) {
  const charakter = getCharakter(monsterId);
  const stufe = charakter.upgrades[wert] ?? 0;
  if (stufe >= MAX_STUFE) return false;

  const kosten = aufwertungsKosten(stufe);
  if (gameState.coins < kosten.muenzen || gameState.materials < kosten.material) return false;

  gameState.coins -= kosten.muenzen;
  gameState.materials -= kosten.material;
  charakter.upgrades[wert] = stufe + 1;
  saveProgress();
  return true;
}

/* ------------------------------------------------------------------ */
/*  Daraus berechnete Kampfwerte                                       */
/* ------------------------------------------------------------------ */

/**
 * Die Kampfwerte eines Charakters: Grundwerte des Monsters, verbessert durch
 * Level UND durch gekaufte Aufwertungen.
 */
export function charakterWerte(monster) {
  const charakter = getCharakter(monster.id);
  const level = charakter.level;
  const up = charakter.upgrades;

  return {
    level,
    // Lebenspunkte: 8 je Level, 12 je gekaufter Stufe
    maxHp: monster.maxHp + (level - 1) * 8 + up.hp * WERTE.hp.proStufe,
    // Angriff: 4,5 % je Level, 6 % je Stufe
    damageFactor: 1 + (level - 1) * 0.045 + up.angriff * 0.06,
    // Verteidigung: 0,5 % je Level, 2 % je Stufe - höchstens 45 %
    defense: Math.min(0.45, (level - 1) * 0.005 + up.verteidigung * 0.02),
    // Tempo: mehr XP pro Sekunde, höchstens das Anderthalbfache
    xpPerSecond: Math.min(1.5, 1 + (level - 1) * 0.01 + up.tempo * 0.02),
  };
}

/** Ein Monster mit allen Werten seines Fortschritts - so kämpft es. */
export function monsterMitFortschritt(monster) {
  const werte = charakterWerte(monster);
  return {
    ...monster,
    maxHp: werte.maxHp,
    damageFactor: werte.damageFactor,
    defense: werte.defense,
    xpPerSecond: werte.xpPerSecond,
  };
}

/* ------------------------------------------------------------------ */
/*  Attacken-Level                                                     */
/* ------------------------------------------------------------------ */

/** Höchstes Attacken-Level. */
export const MAX_ATTACKEN_LEVEL = 5;

/** Das Level einer Attacke (1, wenn noch nie aufgewertet). */
export function getAttackenLevel(attackId) {
  return gameState.attackLevels[attackId] ?? 1;
}

/**
 * Was die nächste Stufe einer Attacke kostet.
 * Level 1→2: 500 Münzen, 2→3: 825, 3→4: 1360, 4→5: 2250
 */
export function attackenKosten(level) {
  return {
    muenzen: Math.round((500 * Math.pow(1.65, level - 1)) / 5) * 5,
    material: level * 3,
  };
}

/**
 * Wertet eine Attacke auf, wenn Münzen und Material reichen.
 * @returns {boolean} true, wenn es geklappt hat
 */
export function attackeAufwerten(attackId) {
  const level = getAttackenLevel(attackId);
  if (level >= MAX_ATTACKEN_LEVEL) return false;

  const kosten = attackenKosten(level);
  if (gameState.coins < kosten.muenzen || gameState.materials < kosten.material) return false;

  gameState.coins -= kosten.muenzen;
  gameState.materials -= kosten.material;
  gameState.attackLevels[attackId] = level + 1;
  saveProgress();
  return true;
}

/**
 * Eine Attacke mit ihrem aktuellen Level: Schaden, Heilung und Schild
 * steigen um 20 Prozent je Stufe. Die XP-Kosten bleiben gleich - sonst
 * würde eine aufgewertete Attacke im Kampf langsamer statt stärker.
 */
export function attackeMitLevel(attacke) {
  const level = getAttackenLevel(attacke.id);
  if (level === 1) return attacke;

  const faktor = Math.pow(1.2, level - 1);
  return {
    ...attacke,
    level,
    damage: Math.round(attacke.damage * faktor),
    heal: attacke.heal ? Math.round(attacke.heal * faktor) : 0,
    shield: attacke.shield ? Math.round(attacke.shield * faktor) : 0,
  };
}
