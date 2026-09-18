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
import { getMonster, STARTER_MONSTER_ID } from './data/monsters.js';
import { bilderVorladen, setSkinNachschlag } from './ui/sprite.js';
import { spieleKlang, tonFreischalten } from './core/audio.js';
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

// Die Grafiken der Spielfigur im Voraus laden, damit die erste
// Angriffsanimation nicht ruckelt.
const spielfigur = getMonster(STARTER_MONSTER_ID);
bilderVorladen([spielfigur.image, spielfigur.bildKampf, ...(spielfigur.bildAngriff ?? [])]);

// Safari auf iPhone und iPad erlaubt Ton erst nach der ersten Berührung.
tonFreischalten();

/*
 * Knopfklänge an einer Stelle statt in jedem Bildschirm einzeln.
 * Ein Knopf kann den Klang über data-klang selbst bestimmen:
 *   data-klang="kauf"    - dieser Klang statt des automatischen
 *   data-klang="keiner"  - still (der Bildschirm spielt selbst etwas)
 */
document.addEventListener('click', (event) => {
  const knopf = event.target.closest('button');
  if (!knopf || knopf.disabled) return;

  const vorgabe = knopf.dataset.klang;
  if (vorgabe === 'keiner') return;

  spieleKlang(vorgabe ?? klangFuerKnopf(knopf));
});

/** Welcher Klang passt zu diesem Knopf? */
function klangFuerKnopf(knopf) {
  if (knopf.classList.contains('btn--big') || knopf.classList.contains('btn--green')) {
    return 'bestaetigen';
  }
  // Der Zurück-Knopf der Kopfzeile und der Zurück-Pfeil der Karte
  if (knopf.closest('.topbar') || knopf.classList.contains('btn--ghost')) return 'zurueck';
  return 'tipp';
}

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
