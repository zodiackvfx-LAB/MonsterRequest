/**
 * Endlos-Arena (Boss-Rush).
 *
 * Ein Modus ohne Ende: Runde für Runde kommt ein stärkerer Gegner. Zwischen
 * den Runden heilt man nur ein Stück - wie weit kommst du?
 *
 * Diese Datei baut aus den vorhandenen Gegnern (js/data/enemies.js) für jede
 * Runde einen passend skalierten Gegner und ein synthetisches "Level", das der
 * normale Kampfbildschirm (js/screens/battle.js) anzeigen kann. So braucht die
 * Arena keinen eigenen Kampfcode.
 *
 * Jede fünfte Runde ist ein Bosskampf - dann setzt der Boss (wie sonst auch)
 * seine eigene Kraft ein.
 */

import { ENEMIES } from './enemies.js';
import { getWorld } from './worlds.js';

const NORMALE = Object.values(ENEMIES).filter((e) => !e.isBoss);
const BOSSE = Object.values(ENEMIES).filter((e) => e.isBoss);

/** Jede fünfte Runde ist ein Bosskampf. */
export function istBossRunde(runde) {
  return runde % 5 === 0;
}

/** Der (skalierte) Gegner für eine Arena-Runde. */
export function arenaGegner(runde) {
  const boss = istBossRunde(runde);
  const pool = boss ? BOSSE : NORMALE;
  const basis = pool[(runde - 1) % pool.length];

  // Werte steigen mit der Runde. Bosse sind zäher und teilen mehr aus.
  const skala = 1 + (runde - 1) * 0.16;
  const grundHp = boss ? 130 : 60;

  return {
    ...basis,
    id: `arena-${basis.id}-${runde}`,
    name: basis.name,
    maxHp: Math.round(grundHp * skala * (boss ? 1.5 : 1)),
    damageFactor: (basis.damageFactor ?? 1) * (1 + (runde - 1) * 0.045),
    defense: basis.defense ?? 0,
    reactionTime: Math.max(0.45, 0.95 - runde * 0.015),
    patience: 2,
    variante: null,
    isBoss: boss,
    worldId: basis.worldId,
  };
}

/** Das synthetische Level für eine Arena-Runde (für den Kampfbildschirm). */
export function arenaLevel(runde) {
  const gegner = arenaGegner(runde);
  const welt = getWorld(gegner.worldId) ?? getWorld(1);
  return {
    id: `arena-${runde}`,
    arena: true,
    runde,
    worldId: gegner.worldId,
    number: runde,
    name: gegner.name,
    enemyId: gegner.id,
    isBoss: gegner.isBoss,
    scenery: welt.scenery,
    music: welt.music,
    gegner, // den fertigen Gegner gleich mitliefern
  };
}
