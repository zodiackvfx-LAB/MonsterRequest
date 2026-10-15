import { MODI } from './modi.js';

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
 */

/** Ein Eintrag für einen Kampf-Modus - Name, Symbol und Text aus MODI. */
const kampfModus = (id) => ({ id, name: MODI[id].name, icon: MODI[id].icon, text: MODI[id].text, modus: id });

export const SPIELMODI = [
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
