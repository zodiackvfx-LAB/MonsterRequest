/**
 * Einstiegspunkt von MonsterQuest.
 *
 * Aufgaben:
 *   1. Gespeicherten Fortschritt laden und Einstellungen anwenden
 *   2. Alle Bildschirme registrieren
 *   3. Den Startbildschirm anzeigen
 *
 * Neuer Bildschirm = Datei in js/screens/ anlegen und hier registrieren.
 */

import { initScreens, registerScreen, showScreen } from './core/screens.js';
import { getAktiverSkin, loadProgress } from './core/state.js';
import { getSkin } from './data/items.js';
import { setSkinNachschlag } from './ui/sprite.js';
import { startScreen } from './screens/start.js';
import { worldsScreen } from './screens/worlds.js';
import { mapScreen } from './screens/map.js';
import { battleScreen } from './screens/battle.js';
import { monsterScreen } from './screens/monster.js';
import { deckScreen } from './screens/deck.js';
import { collectionScreen } from './screens/collection.js';
import { dailyScreen } from './screens/daily.js';
import { settingsScreen, applySettings } from './screens/settings.js';
import { shopScreen } from './screens/shop.js';

loadProgress();
applySettings();

// Die Pixel-Figuren sollen den gewählten Skin verwenden. sprite.js kennt den
// Spielstand nicht - deshalb bekommt es hier die passende Funktion gereicht.
setSkinNachschlag((monster) => {
  const skinId = getAktiverSkin(monster.id);
  return skinId ? getSkin(skinId) : null;
});

initScreens(document.getElementById('app'));

registerScreen('start', startScreen);
registerScreen('worlds', worldsScreen);
registerScreen('map', mapScreen);
registerScreen('battle', battleScreen);
registerScreen('monster', monsterScreen);
registerScreen('deck', deckScreen);
registerScreen('collection', collectionScreen);
registerScreen('settings', settingsScreen);
registerScreen('shop', shopScreen);
registerScreen('daily', dailyScreen);

showScreen('start');
