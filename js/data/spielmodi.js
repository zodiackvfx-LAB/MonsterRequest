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
 *   info    - optional: (gameState) => kurzer Text, z. B. der Bestwert
 */
export const SPIELMODI = [
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
];
