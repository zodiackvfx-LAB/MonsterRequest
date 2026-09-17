/**
 * Spielfortschritt.
 *
 * Hält fest, welche Level freigeschaltet und welche schon geschafft sind,
 * und speichert das im Browser (localStorage), damit der Fortschritt einen
 * Neuladen überlebt.
 */

const STORAGE_KEY = 'monsterquest.save.v1';

export const gameState = {
  /** Höchstes freigeschaltetes Level. Level 1 ist immer offen. */
  unlockedLevel: 1,
  /** Alle Level-ids, die der Spieler bereits gewonnen hat. */
  clearedLevels: [],
};

/** Lädt den gespeicherten Fortschritt, falls vorhanden. */
export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);
    gameState.unlockedLevel = Number(saved.unlockedLevel) || 1;
    gameState.clearedLevels = Array.isArray(saved.clearedLevels) ? saved.clearedLevels : [];
  } catch (error) {
    // Kaputter oder gesperrter Speicher darf das Spiel nicht blockieren.
    console.warn('Spielstand konnte nicht geladen werden:', error);
  }
}

/** Speichert den aktuellen Fortschritt. */
export function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  } catch (error) {
    console.warn('Spielstand konnte nicht gespeichert werden:', error);
  }
}

/** Ist dieses Level anklickbar? */
export function isLevelUnlocked(levelId) {
  return levelId <= gameState.unlockedLevel;
}

/** Wurde dieses Level schon gewonnen? */
export function isLevelCleared(levelId) {
  return gameState.clearedLevels.includes(levelId);
}

/** Level als geschafft markieren und das nächste freischalten. */
export function completeLevel(levelId) {
  if (!isLevelCleared(levelId)) {
    gameState.clearedLevels.push(levelId);
  }
  if (levelId + 1 > gameState.unlockedLevel) {
    gameState.unlockedLevel = levelId + 1;
  }
  saveProgress();
}

/** Setzt den gesamten Fortschritt zurück (nützlich beim Testen). */
export function resetProgress() {
  gameState.unlockedLevel = 1;
  gameState.clearedLevels = [];
  saveProgress();
}
