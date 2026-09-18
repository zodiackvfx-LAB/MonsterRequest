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
    materials: 0, // für spätere Aufwertungen
    ownedAttacks: [], // aus Truhen freigeschaltete Attacken
    ownedSkins: ['skin-standard'],
    activeSkin: {}, // { monsterId: skinId }
    decks: {}, // { monsterId: [8 Attacken-ids] } - leer = Standarddeck
    characters: {}, // { monsterId: { level, xp, upgrades } } - siehe progression.js
    attackLevels: {}, // { attackId: level }
    // Tagesaufgaben - siehe js/core/aufgaben.js
    dailies: {
      datum: null, // "JJJJ-MM-TT" des Tages, fuer den die Aufgaben gelten
      aufgaben: [], // die ids der heutigen Aufgaben
      fortschritt: {}, // { aufgabenId: Anzahl }
      abgeholt: [], // ids, deren Belohnung schon geholt wurde
    },
    settings: {
      sound: true, // Klänge im Spiel
      musik: true, // Hintergrundmusik
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

/** Frueherer Name der Spielerfigur -> heutiger Name. */
const ALTE_FIGUR = 'glutwelpe';
const NEUE_FIGUR = 'timo';

/**
 * Zieht einen Eintrag von der alten auf die neue Figur um.
 * Betrifft alles, was nach Figur abgelegt ist: Deck, Charakterfortschritt
 * und der getragene Skin. Ein bereits umgezogener Spielstand bleibt, wie er ist.
 */
function figurUmbenennen(eintrag) {
  if (!eintrag || typeof eintrag !== 'object') return {};
  if (!(ALTE_FIGUR in eintrag)) return eintrag;

  const { [ALTE_FIGUR]: alt, ...rest } = eintrag;
  // Gibt es den neuen Eintrag schon, hat er Vorrang.
  return { [NEUE_FIGUR]: alt, ...rest };
}

function uebernehmen(saved) {
  gameState.unlockedWorld = Number(saved.unlockedWorld) || 1;
  gameState.clearedLevels = Array.isArray(saved.clearedLevels) ? saved.clearedLevels.map(String) : [];
  gameState.stars = saved.stars && typeof saved.stars === 'object' ? saved.stars : {};
  gameState.coins = Number(saved.coins) || 0;
  gameState.materials = Number(saved.materials) || 0;
  gameState.ownedAttacks = Array.isArray(saved.ownedAttacks) ? saved.ownedAttacks : [];
  gameState.ownedSkins = Array.isArray(saved.ownedSkins) ? saved.ownedSkins : ['skin-standard'];
  gameState.activeSkin = figurUmbenennen(saved.activeSkin ?? {});
  // Die Spielerfigur hiess frueher "glutwelpe" und heisst jetzt "timo".
  // Alte Spielstaende werden umgezogen, damit Level, Deck und Skin bleiben.
  gameState.decks = figurUmbenennen(saved.decks ?? {});
  gameState.characters = figurUmbenennen(saved.characters ?? {});
  gameState.attackLevels = saved.attackLevels ?? {};
  // Fehlt der Block in einem aelteren Spielstand, legt aufgaben.js ihn beim
  // ersten Blick auf die Aufgaben selbst an.
  gameState.dailies = {
    datum: saved.dailies?.datum ?? null,
    aufgaben: Array.isArray(saved.dailies?.aufgaben) ? saved.dailies.aufgaben : [],
    fortschritt: saved.dailies?.fortschritt ?? {},
    abgeholt: Array.isArray(saved.dailies?.abgeholt) ? saved.dailies.abgeholt : [],
  };
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

/* ------------------------------------------------------------------ */
/*  Besitz: Münzen, Material, Attacken, Skins                          */
/* ------------------------------------------------------------------ */

/** Reichen die Münzen? */
export function kannBezahlen(preis) {
  return gameState.coins >= preis;
}

/** Münzen abziehen. Gibt false zurück, wenn es nicht reicht. */
export function bezahlen(preis) {
  if (!kannBezahlen(preis)) return false;
  gameState.coins -= preis;
  saveProgress();
  return true;
}

export function besitztAttacke(id) {
  return gameState.ownedAttacks.includes(id);
}

export function besitztSkin(id) {
  return gameState.ownedSkins.includes(id);
}

/**
 * Schreibt ein Beutestück gut.
 *
 * Attacken und Skins, die man schon hat, werden zu Münzen - das entscheidet
 * schon js/core/loot.js, hier wird nur noch eingetragen.
 *
 * @returns {object} das gutgeschriebene Stück
 */
export function beuteGutschreiben(stueck) {
  switch (stueck.art) {
    case 'muenzen':
      gameState.coins += stueck.menge;
      break;
    case 'material':
      gameState.materials += stueck.menge;
      break;
    case 'attacke':
      if (!besitztAttacke(stueck.id)) gameState.ownedAttacks.push(stueck.id);
      break;
    case 'skin':
      if (!besitztSkin(stueck.id)) gameState.ownedSkins.push(stueck.id);
      break;
    default:
      break;
  }

  saveProgress();
  return stueck;
}

/* ------------------------------------------------------------------ */
/*  Deck und Skin eines Monsters                                       */
/* ------------------------------------------------------------------ */

/** Das aktuelle Deck eines Monsters - oder sein Standarddeck. */
export function getDeck(monster) {
  const eigenes = gameState.decks[monster.id];
  return Array.isArray(eigenes) && eigenes.length === 8 ? eigenes : monster.deck;
}

/** Ein Deck speichern. Es muss genau 8 Attacken enthalten. */
export function setDeck(monsterId, attacken) {
  if (attacken.length !== 8) {
    throw new Error(`Ein Deck braucht genau 8 Attacken, bekommen: ${attacken.length}`);
  }
  gameState.decks[monsterId] = [...attacken];
  saveProgress();
}

/** Der aktive Skin eines Monsters (oder null). */
export function getAktiverSkin(monsterId) {
  return gameState.activeSkin[monsterId] ?? null;
}

/** Skin auswählen. */
export function setAktiverSkin(monsterId, skinId) {
  gameState.activeSkin[monsterId] = skinId;
  saveProgress();
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
