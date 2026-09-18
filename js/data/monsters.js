/**
 * Die Figuren des Spielers.
 *
 * Die Gegner stehen nicht hier, sondern werden in js/data/enemies.js aus
 * den Welten erzeugt. So bleibt diese Datei übersichtlich, auch wenn es
 * später 70 und mehr Gegner gibt.
 *
 * Spieler und Gegner sind gleich aufgebaut: Jeder hat ein Deck aus GENAU
 * 8 Attacken, 4 davon liegen im Kampf auf der Hand, und beide bekommen
 * 1 XP pro Sekunde (maximal 10).
 *
 * Felder:
 *   id            - eindeutiger Schlüssel
 *   name          - Anzeigename
 *   icon          - Platzhalter-Grafik (später durch eigene Bilder ersetzbar)
 *   maxHp         - maximale Lebenspunkte
 *   element       - Typ der Kreatur (für die Anzeige; Stärken/Schwächen folgen später)
 *   look          - Aussehen der Pixel-Figur (siehe js/ui/sprite.js)
 *   text          - kurze Beschreibung für Monster- und Sammlungsbildschirm
 *   deck          - genau 8 Attacken-ids aus js/data/attacks.js
 *
 */
export const MONSTERS = {
  /* ---------- Spielerfigur ---------- */
  timo: {
    id: 'timo',
    name: 'Timo',
    icon: '🧑',
    element: 'Feuer',
    /*
     * Timo hat als einzige Figur eigene Grafiken statt einer berechneten
     * Pixelfigur. Die Felder:
     *   image       - im Menü und in der Sammlung (Vorderansicht)
     *   bildKampf   - im Kampf (Kampfhaltung, nach rechts gerichtet)
     *   bildAngriff - die Bildfolge beim Angreifen
     *   hoch        - Mensch statt Tier: schmal und hoch. Damit er im
     *                 quadratischen Kasten nicht winzig wirkt, darf er
     *                 darüber hinauswachsen (siehe .pixel-sprite--hoch).
     *
     * Eigene Grafiken für weitere Figuren gehören nach bilder/ und werden
     * hier genauso eingetragen.
     */
    image: 'bilder/timo/front.png',
    bildKampf: 'bilder/timo/kampf.png',
    bildAngriff: [
      'bilder/timo/attacke-1.png',
      'bilder/timo/attacke-2.png',
      'bilder/timo/attacke-3.png',
      'bilder/timo/attacke-4.png',
      'bilder/timo/attacke-5.png',
      'bilder/timo/attacke-6.png',
    ],
    hoch: true,
    text: 'Ein junger Kämpfer mit schneller Faust. Redet wenig, trifft dafür genau.',
    maxHp: 100,
    // Genau 8 Attacken - das ist die Regel für jedes Deck.
    deck: [
      'krallenhieb',
      'biss',
      'feuerball',
      'flammenstoss',
      'schutzschild',
      'feuersturm',
      'lavabombe',
      'meteor',
    ],
  },

};

/** Holt ein Monster per id - mit klarer Fehlermeldung, falls die id nicht existiert. */
export function getMonster(id) {
  const monster = MONSTERS[id];
  if (!monster) {
    throw new Error(`Unbekanntes Monster: "${id}" (siehe js/data/monsters.js)`);
  }
  return monster;
}

/** Die Figur, mit der der Spieler startet. */
export const STARTER_MONSTER_ID = 'timo';
