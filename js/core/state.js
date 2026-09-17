/**
 * Spielfortschritt.
 *
 * Hält fest, wie weit der Spieler ist, und speichert das im Browser
 * (localStorage). Für den Prototypen reicht das; die Struktur ist so
 * gehalten, dass später ein richtiger Server dahinter kann - dafür müssten
 * nur loadProgress und saveProgress ausgetauscht werden.
 */

import { LEVELS, bossLevelOf } from '../data/levels.js';
import { WORLDS } from '../data/worlds.js';

const STORAGE_KEY = 'monsterquest.save.v3';
const ALTER_KEY = 'monsterquest.save.v2'; // Vorgängerversion, wird übernommen

/** Frischer Spielstand - auch die Grundlage fürs Zurücksetzen. */
function createNewGame() {
  return {
    unlockedWorld: 1, // höchste freigeschaltete Welt
    clearedLevels: [], // Level-ids wie "1-3"
    stars: {}, // { "1-3": 2 }
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
    if (raw) {
      uebernehmen(JSON.parse(raw));
      return;
    }

    // Alter Spielstand (3 Level ohne Welten): in die neue Form bringen.
    const alt = localStorage.getItem(ALTER_KEY);
    if (alt) {
      const saved = JSON.parse(alt);
      uebernehmen({
        unlockedWorld: 1,
        clearedLevels: (saved.clearedLevels ?? []).map((nummer) => `1-${nummer}`),
        stars: Object.fromEntries(
          Object.entries(saved.stars ?? {}).map(([nummer, wert]) => [`1-${nummer}`, wert])
        ),
        coins: saved.coins,
        settings: saved.settings,
      });
      saveProgress();
    }
  } catch (error) {
    // Ein kaputter oder gesperrter Speicher darf das Spiel nicht blockieren.
    console.warn('Spielstand konnte nicht geladen werden:', error);
  }
}

function uebernehmen(saved) {
  gameState.unlockedWorld = Number(saved.unlockedWorld) || 1;
  gameState.clearedLevels = Array.isArray(saved.clearedLevels) ? saved.clearedLevels.map(String) : [];
  gameState.stars = saved.stars && typeof saved.stars === 'object' ? saved.stars : {};
  gameState.coins = Number(saved.coins) || 0;
  gameState.settings = { ...gameState.settings, ...(saved.settings ?? {}) };
}

/** Speichert den aktuellen Fortschritt. */
export function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  } catch (error) {
    console.warn('Spielstand konnte nicht gespeichert werden:', error);
  }
}

/* ------------------------------------------------------------------ */
/*  Welten                                                             */
/* ------------------------------------------------------------------ */

/** Ist diese Welt betretbar? */
export function isWorldUnlocked(worldId) {
  return Number(worldId) <= gameState.unlockedWorld;
}

/** Wie viele Kämpfe einer Welt sind geschafft? */
export function clearedInWorld(worldId) {
  return LEVELS.filter(
    (level) => level.worldId === Number(worldId) && isLevelCleared(level.id)
  ).length;
}

/** Ist die Welt komplett durchgespielt? */
export function isWorldCleared(worldId) {
  const boss = bossLevelOf(worldId);
  return Boolean(boss) && isLevelCleared(boss.id);
}

/* ------------------------------------------------------------------ */
/*  Level                                                              */
/* ------------------------------------------------------------------ */

/**
 * Ein Kampf ist offen, wenn seine Welt offen ist und der Kampf davor
 * geschafft wurde. Der erste Kampf einer Welt ist immer offen.
 */
export function isLevelUnlocked(levelId) {
  const level = LEVELS.find((entry) => entry.id === String(levelId));
  if (!level || !isWorldUnlocked(level.worldId)) return false;
  if (level.number === 1) return true;
  return isLevelCleared(`${level.worldId}-${level.number - 1}`);
}

/** Wurde dieser Kampf schon gewonnen? */
export function isLevelCleared(levelId) {
  return gameState.clearedLevels.includes(String(levelId));
}

/** Bisher beste Sternewertung eines Kampfes (0 = noch nicht geschafft). */
export function getStars(levelId) {
  return gameState.stars[String(levelId)] ?? 0;
}

/** Sterne einer Welt - oder aller Welten, wenn nichts angegeben wird. */
export function getTotalStars(worldId = null) {
  return LEVELS.filter((level) => worldId === null || level.worldId === Number(worldId)).reduce(
    (summe, level) => summe + getStars(level.id),
    0
  );
}

/** Der nächste offene, noch nicht geschaffte Kampf einer Welt. */
export function nextLevelOf(worldId) {
  return LEVELS.find(
    (level) =>
      level.worldId === Number(worldId) && isLevelUnlocked(level.id) && !isLevelCleared(level.id)
  );
}

/** Spielerstufe: steigt mit jedem geschafften Kampf. */
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
 * Kampf als geschafft markieren, Sterne und Münzen gutschreiben.
 * War es ein Bosskampf, wird die nächste Welt freigeschaltet.
 *
 * @returns {{stars: number, coins: number, isNew: boolean, newWorld: object|null}}
 */
export function completeLevel(levelId, { stars = 1, reward = 0 } = {}) {
  const id = String(levelId);
  const level = LEVELS.find((entry) => entry.id === id);
  const isNew = !isLevelCleared(id);

  if (isNew) gameState.clearedLevels.push(id);
  if (stars > getStars(id)) gameState.stars[id] = stars;

  // Beim ersten Sieg gibt es die volle Belohnung, danach ein Viertel.
  const coins = isNew ? reward : Math.round(reward * 0.25);
  gameState.coins += coins;

  // Boss besiegt: nächste Welt öffnen.
  let newWorld = null;
  if (level?.isBoss) {
    const naechste = WORLDS.find((world) => world.id === level.worldId + 1);
    if (naechste && naechste.id > gameState.unlockedWorld) {
      gameState.unlockedWorld = naechste.id;
      newWorld = naechste;
    }
  }

  saveProgress();
  return { stars, coins, isNew, newWorld };
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
