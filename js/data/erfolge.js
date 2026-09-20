/**
 * Erfolge (Achievements).
 *
 * Jeder Erfolg hat ein Ziel (eine Zahl) und eine Funktion, die den aktuellen
 * Fortschritt liefert. Erreicht der Fortschritt das Ziel, ist der Erfolg
 * freigeschaltet - das prüft js/core/statistik.js nach jedem Kampf.
 *
 * Die Fortschritts-Funktionen lesen den Spielstand (Zähler aus der Statistik
 * oder abgeleitete Werte wie „wie viele Bosse besiegt"). So braucht es keine
 * zusätzlichen Zähler für Dinge, die sich ohnehin aus dem Stand ergeben.
 *
 * NEUER ERFOLG = hier einen Eintrag ergänzen. Sonst nichts.
 *
 * Felder:
 *   id    - eindeutiger Name (wird im Spielstand gespeichert)
 *   name  - Anzeigename
 *   icon  - Symbol
 *   text  - was man tun muss
 *   ziel  - Zahl, die erreicht werden muss
 *   wert  - Funktion: aktueller Fortschritt (0 .. ziel und darüber)
 */

import {
  gameState,
  getTotalStars,
  besitztSkin,
  besitztAttacke,
  isLevelCleared,
} from '../core/state.js';
import { SKINS, BEUTE_ATTACKEN } from './items.js';
import { START_ATTACKEN } from './attacks.js';
import { LEVELS } from './levels.js';
import { WORLDS } from './worlds.js';

/** Wie viele Bosse hat der Spieler besiegt? (geschaffte Boss-Level) */
function bosseBesiegt() {
  return LEVELS.filter((level) => level.isBoss && isLevelCleared(level.id)).length;
}

/** Wie viele Attacken sind insgesamt sammelbar? */
const ATTACKEN_GESAMT = START_ATTACKEN.length + BEUTE_ATTACKEN.length;

/** Wie viele Attacken besitzt der Spieler? (Startattacken zählen immer) */
function attackenGesammelt() {
  return START_ATTACKEN.length + BEUTE_ATTACKEN.filter((a) => besitztAttacke(a.id)).length;
}

export const ERFOLGE = [
  {
    id: 'erster-sieg',
    name: 'Erster Sieg',
    icon: '🥇',
    text: 'Gewinne deinen ersten Kampf.',
    ziel: 1,
    wert: () => gameState.statistik.siege,
  },
  {
    id: 'kaempfer',
    name: 'Kämpfer',
    icon: '⚔️',
    text: 'Gewinne 25 Kämpfe.',
    ziel: 25,
    wert: () => gameState.statistik.siege,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    icon: '🎖️',
    text: 'Gewinne 100 Kämpfe.',
    ziel: 100,
    wert: () => gameState.statistik.siege,
  },
  {
    id: 'kritmeister',
    name: 'Kritmeister',
    icon: '💥',
    text: 'Lande 50 kritische Treffer.',
    ziel: 50,
    wert: () => gameState.statistik.krits,
  },
  {
    id: 'zerstoerer',
    name: 'Zerstörer',
    icon: '🔥',
    text: 'Teile insgesamt 10 000 Schaden aus.',
    ziel: 10000,
    wert: () => gameState.statistik.schaden,
  },
  {
    id: 'bossbezwinger',
    name: 'Boss-Bezwinger',
    icon: '👑',
    text: 'Besiege den Boss jeder Welt.',
    ziel: WORLDS.length,
    wert: bosseBesiegt,
  },
  {
    id: 'weltenbummler',
    name: 'Weltenbummler',
    icon: '🗺️',
    text: 'Schalte alle Welten frei.',
    ziel: WORLDS.length,
    wert: () => gameState.unlockedWorld,
  },
  {
    id: 'sternenjaeger',
    name: 'Sternenjäger',
    icon: '⭐',
    text: 'Sammle 100 Sterne.',
    ziel: 100,
    wert: () => getTotalStars(),
  },
  {
    id: 'sammler',
    name: 'Sammler',
    icon: '🎒',
    text: 'Sammle alle Attacken.',
    ziel: ATTACKEN_GESAMT,
    wert: attackenGesammelt,
  },
  {
    id: 'stylist',
    name: 'Stylist',
    icon: '🎨',
    text: 'Schalte alle Skins frei.',
    ziel: SKINS.length,
    wert: () => SKINS.filter((s) => besitztSkin(s.id)).length,
  },
];

/** Holt einen Erfolg per id. */
export function getErfolg(id) {
  return ERFOLGE.find((e) => e.id === id);
}
