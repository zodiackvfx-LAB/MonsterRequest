import { MODI } from './modi.js';
import { DUELL } from './duell.js';

/**
 * Die Spielmodi neben dem Abenteuer.
 *
 * Sie erscheinen im kleinen Auswahlfenster "Spielmodi" auf dem
 * Startbildschirm (js/ui/spielmodi.js).
 *
 * NEUER SPIELMODUS = einen Eintrag ergänzen. Sonst nichts.
 *
 * Felder:
 *   id      - eindeutiger Schlüssel
 *   name    - Anzeigename
 *   icon    - Symbol
 *   text    - ein kurzer Satz, worum es geht
 *   screen  - welcher Bildschirm sich öffnet (in js/main.js registriert)
 *   modus   - ODER: ein Kampf-Modus aus js/data/modi.js - dann startet
 *             direkt der Kampf, und Infozeile und Sperre kommen aus
 *             js/core/modi.js
 *   info    - optional: (gameState) => kurzer Text, z. B. der Bestwert
 *   vorschau - optional: 'duell' zeigt eine große Karte mit Figuren
 */

/** Ein Eintrag für einen Kampf-Modus - Name, Symbol und Text aus MODI. */
const kampfModus = (id) => ({ id, name: MODI[id].name, icon: MODI[id].icon, text: MODI[id].text, modus: id });

export const SPIELMODI = [
  {
    // Der Koop-Modus bekommt eine große Karte mit Vorschau (js/ui/spielmodi.js).
    id: DUELL.id,
    name: DUELL.name,
    icon: DUELL.icon,
    text: DUELL.text,
    screen: 'duell-lobby',
    vorschau: 'duell',
    info: (gameState) => {
      const siege = gameState.duell?.statistik?.siege ?? 0;
      return siege > 0 ? `${siege} ${siege === 1 ? 'Sieg' : 'Siege'} im Team` : 'Online mit Freund oder solo mit KI-Partner';
    },
  },
  kampfModus('tages'),
  {
    id: 'arena',
    name: 'Endlos-Arena',
    icon: '🏟️',
    text: 'Gegner um Gegner, jede 5. Runde ein Boss - wie weit kommst du?',
    screen: 'arena',
    info: (gameState) => {
      const best = gameState.statistik?.arenaBest ?? 0;
      return best > 0 ? `Bester Lauf: ${best} ${best === 1 ? 'Runde' : 'Runden'}` : 'Noch nicht gespielt';
    },
  },
  kampfModus('bossrush'),
  kampfModus('zeit'),
];
