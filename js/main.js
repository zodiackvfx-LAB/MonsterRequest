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
import { getAktiverSkin, loadProgress, setSpielername } from './core/state.js';
import { cloudStart } from './core/sync.js';
import { zeigeWillkommen } from './ui/willkommen.js';
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

const hatSpielstand = loadProgress();
applySettings();

// Die Pixel-Figuren sollen den gewählten Skin verwenden. sprite.js kennt den
// Spielstand nicht - deshalb bekommt es hier die passende Funktion gereicht.
setSkinNachschlag((monster) => {
  const skinId = getAktiverSkin(monster.id);
  return skinId ? getSkin(skinId) : null;
});

// Die KAMPF-Grafiken (Schlag, Strahl, Treffer) werden erst gebraucht, wenn
// ein Kampf beginnt. Deshalb laden wir sie NICHT sofort - das würde nur mit
// den Startbild-Grafiken um die Leitung streiten -, sondern im Leerlauf,
// sobald der Browser Luft hat. Der Startbildschirm erscheint dadurch
// schneller; die erste Angriffsanimation ruckelt trotzdem nicht, weil die
// Bilder bis dahin längst da sind. Die Grafiken von Held und Menü lädt der
// Startbildschirm selbst, sobald er sie zeigt.
const spielfigur = getMonster(STARTER_MONSTER_ID);
function kampfgrafikenVorladen() {
  bilderVorladen([
    spielfigur.bildKampf,
    ...(spielfigur.bildSchlag ?? []),
    ...(spielfigur.bildStrahl ?? []),
    ...(spielfigur.bildTreffer ?? []),
  ]);
}
if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(kampfgrafikenVorladen, { timeout: 3000 });
} else {
  setTimeout(kampfgrafikenVorladen, 1200);
}

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

/*
 * Erster Start auf diesem Geraet: nach einem Namen fragen. hatSpielstand ist
 * false, wenn im Browser noch nichts lag. Das Pop-up wird ueber den
 * Startbildschirm gelegt; nach der Eingabe wird der Bildschirm neu
 * gezeichnet, damit der Name gleich oben in der Spielerleiste steht.
 */
if (!hatSpielstand) {
  zeigeWillkommen(document.getElementById('app'), (name) => {
    if (name) {
      setSpielername(name);
      showScreen('start');
    }
  });
}

/*
 * Abgleich mit der Datenbank - erst JETZT, nachdem das Spiel schon zu sehen
 * ist. Es laeuft im Hintergrund weiter; ohne Netz oder ohne eingetragene
 * Datenbank passiert einfach nichts.
 *
 * Gewinnt der Stand aus der Datenbank, wird der Startbildschirm neu
 * gezeichnet - sonst stuenden dort noch die alten Muenzen.
 */
cloudStart(() => {
  setSkinNachschlag((monster) => {
    const skinId = getAktiverSkin(monster.id);
    return skinId ? getSkin(skinId) : null;
  });
  showScreen('start');
});
