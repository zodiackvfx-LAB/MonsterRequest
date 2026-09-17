/**
 * Spielfortschritt.
 *
 * Hält fest, welche Level freigeschaltet und geschafft sind, wie viele Sterne
 * und Münzen der Spieler hat, und speichert das im Browser (localStorage),
 * damit der Fortschritt ein Neuladen überlebt.
 */

const STORAGE_KEY = 'monsterquest.save.v2';

/** Frischer Spielstand - auch die Grundlage fürs Zurücksetzen. */
function createNewGame() {
  return {
    unlockedLevel: 1, // höchstes freigeschaltetes Level (Level 1 ist immer offen)
    clearedLevels: [], // alle gewonnenen Level-ids
    stars: {}, // { levelId: 1..3 }
    coins: 0,
    settings: {
      sound: true,
      animations: true,
    },
  };
}

export const gameState = createNewGame();

/** Lädt den gespeicherten Fortschritt, falls vorhanden. */
export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);
    gameState.unlockedLevel = Number(saved.unlockedLevel) || 1;
    gameState.clearedLevels = Array.isArray(saved.clearedLevels) ? saved.clearedLevels : [];
    gameState.stars = saved.stars && typeof saved.stars === 'object' ? saved.stars : {};
    gameState.coins = Number(saved.coins) || 0;
    gameState.settings = { ...gameState.settings, ...(saved.settings ?? {}) };
  } catch (error) {
    // Ein kaputter oder gesperrter Speicher darf das Spiel nicht blockieren.
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

/** Bisher beste Sternewertung eines Levels (0 = noch nicht geschafft). */
export function getStars(levelId) {
  return gameState.stars[levelId] ?? 0;
}

/** Summe aller Sterne - für die Anzeige auf der Karte. */
export function getTotalStars() {
  return Object.values(gameState.stars).reduce((sum, value) => sum + value, 0);
}

/** Spielerstufe: steigt mit jedem geschafften Level. */
export function getPlayerLevel() {
  return 1 + gameState.clearedLevels.length;
}

/**
 * Sterne aus dem Kampfergebnis berechnen:
 * 3 Sterne für einen fast unbeschadeten Sieg, mindestens 1 für einen Sieg.
 */
export function calculateStars(hpLeft, maxHp) {
  const share = hpLeft / maxHp;
  if (share >= 0.7) return 3;
  if (share >= 0.35) return 2;
  return 1;
}

/**
 * Level als geschafft markieren, Sterne und Münzen gutschreiben,
 * nächstes Level freischalten.
 *
 * @returns {{stars: number, coins: number, isNew: boolean}} was es dafür gab
 */
export function completeLevel(levelId, { stars = 1, reward = 0 } = {}) {
  const isNew = !isLevelCleared(levelId);
  if (isNew) gameState.clearedLevels.push(levelId);

  // Nur eine Verbesserung wird gespeichert.
  if (stars > getStars(levelId)) gameState.stars[levelId] = stars;

  // Beim ersten Sieg gibt es die volle Belohnung, danach ein Viertel.
  const coins = isNew ? reward : Math.round(reward * 0.25);
  gameState.coins += coins;

  if (levelId + 1 > gameState.unlockedLevel) {
    gameState.unlockedLevel = levelId + 1;
  }

  saveProgress();
  return { stars, coins, isNew };
}

/** Eine Einstellung ändern (z. B. Ton an/aus). */
export function setSetting(key, value) {
  gameState.settings[key] = value;
  saveProgress();
}

/** Setzt den gesamten Fortschritt zurück. */
export function resetProgress() {
  Object.assign(gameState, createNewGame());
  saveProgress();
}
