/**
 * Die Kämpfe der Weltkarte - abgeleitet aus js/data/worlds.js.
 *
 * Eine Welt besteht aus 10 bis 15 Kämpfen; der letzte ist immer der Boss.
 * Statt jeden Kampf einzeln aufzuschreiben, entstehen sie hier automatisch
 * aus der Gegnerliste einer Welt. Ein neuer Kampf = ein Gegner mehr in
 * worlds.js. Position auf der Karte, Belohnung und Freischaltung ergeben
 * sich von selbst.
 *
 * Ein Level hat:
 *   id        - "1-1", "1-2", ... (Welt-Nummer und Kampf-Nummer)
 *   worldId   - zu welcher Welt es gehört
 *   number    - Nummer des Kampfes innerhalb der Welt (1-basiert)
 *   name      - Anzeigename
 *   enemyId   - Gegner aus js/data/enemies.js
 *   isBoss    - letzter Kampf einer Welt
 *   reward    - Münzen für den ersten Sieg
 *   x, y      - Position auf der Weltkarte in Prozent
 */

import { WORLDS, fightsInWorld, getWorld } from './worlds.js';
import { enemyIdFor, getEnemy } from './enemies.js';

/**
 * Position eines Kampfes auf der Karte.
 * Die Kämpfe laufen von unten nach oben; die x-Position wechselt in einem
 * Schlangenmuster, damit der Weg nicht schnurgerade verläuft.
 */
function positionFor(index, total) {
  const muster = [26, 50, 74, 50];
  const abstand = total > 1 ? 92 / (total - 1) : 0;
  return {
    x: muster[index % muster.length],
    y: Number((95 - index * abstand).toFixed(2)),
  };
}

function buildLevels() {
  const levels = [];

  for (const world of WORLDS) {
    const total = fightsInWorld(world);

    for (let index = 0; index < total; index++) {
      const isBoss = index === total - 1;
      const enemy = getEnemy(enemyIdFor(world, index));
      const { x, y } = positionFor(index, total);

      levels.push({
        id: `${world.id}-${index + 1}`,
        worldId: world.id,
        number: index + 1,
        name: isBoss ? `Boss: ${enemy.name}` : enemy.name,
        enemyId: enemy.id,
        isBoss,
        scenery: world.scenery,
        // Spätere Kämpfe geben mehr, der Boss deutlich mehr.
        reward: Math.round(world.reward * (1 + index * 0.12) * (isBoss ? 4 : 1)),
        x,
        y,
      });
    }
  }

  return levels;
}

export const LEVELS = buildLevels();

/** Holt ein Level per id ("1-3"). Gibt undefined zurück, wenn es das nicht gibt. */
export function getLevel(id) {
  return LEVELS.find((level) => level.id === String(id));
}

/** Alle Kämpfe einer Welt, in der richtigen Reihenfolge. */
export function levelsOfWorld(worldId) {
  return LEVELS.filter((level) => level.worldId === Number(worldId));
}

/** Der Bosskampf einer Welt. */
export function bossLevelOf(worldId) {
  return levelsOfWorld(worldId).find((level) => level.isBoss);
}

/** Die Welt zu einem Level. */
export function worldOfLevel(level) {
  return getWorld(level.worldId);
}
