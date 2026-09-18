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
    element: 'Energie',
    /*
     * Timo hat als einzige Figur eigene Grafiken statt einer berechneten
     * Pixelfigur. Sie stammen aus seinem Designblatt.
     *
     *   image       Vorderansicht - Menue, Sammlung, Avatar
     *   bildKampf   Kampfhaltung von hinten. Im Kampf sieht man Timo von
     *               hinten dem Gegner gegenueber, so ist das Blatt gezeichnet.
     *   bildSchlag  Nahkampf: ausholen, schlagen, Hiebbogen, abfangen
     *   bildStrahl  Fernangriff: Energiestrahl nach vorn
     *   bildTreffer wenn Timo selbst getroffen wird
     *   hoch        Mensch statt Tier: schmal und hoch. Der Kasten wird
     *               dafuer hoeher (siehe .pixel-sprite--hoch in css/ui.css).
     *
     * Welche Angriffsfolge laeuft, entscheidet der XP-Preis der Attacke -
     * siehe ANGRIFF_AB_XP in js/screens/battle.js.
     */
    image: 'bilder/timo/front.png',
    bildKampf: 'bilder/timo/stand.png',
    bildSchlag: [
      'bilder/timo/schlag-1.png',
      'bilder/timo/schlag-2.png',
      'bilder/timo/schlag-3.png',
      'bilder/timo/schlag-4.png',
    ],
    bildStrahl: [
      'bilder/timo/strahl-1.png',
      'bilder/timo/strahl-2.png',
      'bilder/timo/strahl-3.png',
      'bilder/timo/strahl-4.png',
    ],
    bildTreffer: [
      'bilder/timo/treffer-1.png',
      'bilder/timo/treffer-2.png',
      'bilder/timo/treffer-3.png',
      'bilder/timo/treffer-4.png',
    ],
    hoch: true,
    text: 'Ein junger Kämpfer mit schneller Faust. Redet wenig, trifft dafür genau.',
    maxHp: 100,
    // Genau 8 Attacken - das ist die Regel für jedes Deck.
    deck: [
      'fausthieb',
      'ellbogenstoss',
      'wirbelkick',
      'aufwaertshaken',
      'deckung',
      'energiestoss',
      'druckwelle',
      'sturmfaust',
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
