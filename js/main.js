/**
 * Einstiegspunkt von MonsterQuest.
 *
 * Aufgaben:
 *   1. Gespeicherten Fortschritt laden
 *   2. Alle Screens registrieren
 *   3. Den Startbildschirm anzeigen
 */

import { initScreens, registerScreen, showScreen } from './core/screens.js';
import { loadProgress } from './core/state.js';
import { startScreen } from './screens/start.js';
import { mapScreen } from './screens/map.js';
import { battleScreen } from './screens/battle.js';

loadProgress();

initScreens(document.getElementById('app'));

registerScreen('start', startScreen);
registerScreen('map', mapScreen);
registerScreen('battle', battleScreen);

showScreen('start');
