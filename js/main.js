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
import { loadProgress } from './core/state.js';
import { startScreen } from './screens/start.js';
import { mapScreen } from './screens/map.js';
import { battleScreen } from './screens/battle.js';
import { monsterScreen } from './screens/monster.js';
import { deckScreen } from './screens/deck.js';
import { collectionScreen } from './screens/collection.js';
import { settingsScreen, applySettings } from './screens/settings.js';

loadProgress();
applySettings();

initScreens(document.getElementById('app'));

registerScreen('start', startScreen);
registerScreen('map', mapScreen);
registerScreen('battle', battleScreen);
registerScreen('monster', monsterScreen);
registerScreen('deck', deckScreen);
registerScreen('collection', collectionScreen);
registerScreen('settings', settingsScreen);

showScreen('start');
