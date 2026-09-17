/**
 * Die Level der Weltkarte.
 *
 * Neues Level hinzufügen = einen Eintrag ergänzen. Mehr ist nicht nötig,
 * die Karte und die Freischaltung richten sich automatisch danach.
 *
 * Felder:
 *   id        - fortlaufende Nummer (1, 2, 3, ...)
 *   name      - Anzeigename auf der Karte
 *   region    - Name der Region (später für mehrere Weltkarten)
 *   enemyId   - Gegner aus js/data/monsters.js
 *   isBoss    - true = Bossgegner am Ende der Region
 */
export const LEVELS = [
  {
    id: 1,
    name: 'Moosige Lichtung',
    region: 'Grünwald',
    enemyId: 'moosgnubbel',
    isBoss: false,
  },
  {
    id: 2,
    name: 'Nebelpfad',
    region: 'Grünwald',
    enemyId: 'schlickhuepfer',
    isBoss: false,
  },
  {
    id: 3,
    name: 'Dornenhorst',
    region: 'Grünwald',
    enemyId: 'borkenwaechter',
    isBoss: true,
  },
];

/** Holt ein Level per id. Gibt undefined zurück, wenn es das Level nicht gibt. */
export function getLevel(id) {
  return LEVELS.find((level) => level.id === id);
}
