/**
 * Die Level der Weltkarte.
 *
 * Neues Level hinzufügen = einen Eintrag ergänzen. Mehr ist nicht nötig:
 * Weltkarte, Weg und Freischaltung richten sich automatisch danach.
 *
 * Felder:
 *   id        - fortlaufende Nummer (1, 2, 3, ...)
 *   name      - Anzeigename auf der Karte
 *   region    - Name der Region
 *   scenery   - Kulisse: 'wald' | 'sumpf' | 'vulkan' (siehe css/scenery.css)
 *   enemyId   - Gegner aus js/data/monsters.js
 *   isBoss    - true = Bossgegner am Ende der Region
 *   text      - kurze Beschreibung für die Infoleiste der Karte
 *   reward    - Münzen für den ersten Sieg
 *   x, y      - Position auf der Karte in Prozent (x von links, y von oben).
 *               Level 1 liegt unten, spätere Level weiter oben.
 */
export const LEVELS = [
  {
    id: 1,
    name: 'Moosige Lichtung',
    region: 'Grünwald',
    scenery: 'wald',
    enemyId: 'moosgnubbel',
    isBoss: false,
    text: 'Eine sonnige Lichtung. Hier lernst du die Grundlagen.',
    reward: 25,
    x: 26,
    y: 84,
  },
  {
    id: 2,
    name: 'Nebelpfad',
    region: 'Grünwald',
    scenery: 'sumpf',
    enemyId: 'schlickhuepfer',
    isBoss: false,
    text: 'Feuchter Boden, schlechte Sicht - und etwas lauert im Schlamm.',
    reward: 40,
    x: 68,
    y: 58,
  },
  {
    id: 3,
    name: 'Dornenhorst',
    region: 'Grünwald',
    scenery: 'wald',
    enemyId: 'borkenwaechter',
    isBoss: true,
    text: 'Der Wächter der Region. Besiege ihn und die nächste Region öffnet sich.',
    reward: 100,
    x: 34,
    y: 26,
  },
];

/** Holt ein Level per id. Gibt undefined zurück, wenn es das Level nicht gibt. */
export function getLevel(id) {
  return LEVELS.find((level) => level.id === id);
}

/** Alle Level einer Region. */
export function getLevelsOfRegion(region) {
  return LEVELS.filter((level) => level.region === region);
}
