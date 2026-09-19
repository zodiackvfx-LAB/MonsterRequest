/**
 * Alle Gegner des Spiels - erzeugt aus den Welten (js/data/worlds.js).
 *
 * Warum erzeugt und nicht aufgeschrieben? Bei 6 Welten mit je 12 Kämpfen
 * sind das 72 Gegner. Jeden einzeln mit Lebenspunkten, Deck und KI-Werten
 * hinzuschreiben wäre unübersichtlich und fehleranfällig. Stattdessen steht
 * in worlds.js nur, WER in einer Welt vorkommt - alles Weitere rechnet
 * diese Datei aus:
 *
 *   Lebenspunkte  steigen von Kampf zu Kampf (baseHp + Position * hpGrowth)
 *   Schaden       ergibt sich aus powerPerXp der Welt
 *   Reaktionszeit wird von Kampf zu Kampf kürzer (der Gegner wird wacher)
 *   Deck          sind die 8 Attacken-Vorlagen der Welt
 *
 * Ein Gegner ist danach ein ganz normales Monster wie das des Spielers und
 * kämpft nach denselben Regeln.
 */

import { registerAttack } from './attacks.js';
import { WORLDS } from './worlds.js';
import { BOSS_FORMEN, FORM_NAMEN } from '../ui/sprite.js';

/** Aus "Moosgnubbel" wird "moosgnubbel", aus "Knospenstoß" wird "knospenstoss". */
function slug(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Baut aus den Attacken-Vorlagen einer Welt echte Attacken und gibt deren
 * ids zurück. Der Wert einer Attacke ergibt sich aus Kosten × Stärke der Welt.
 */
function buildAttacks(templates, prefix, powerPerXp) {
  return templates.map((template) => {
    const id = `${prefix}-${slug(template.n)}`;
    const wert = Math.round(template.c * powerPerXp);

    registerAttack({
      id,
      name: template.n,
      icon: template.i,
      cost: template.c,
      damage: template.heal || template.shield ? 0 : wert,
      heal: template.heal ? Math.round(wert * 1.2) : 0,
      shield: template.shield ? Math.round(wert * 1.4) : 0,
      text: template.heal
        ? 'Frischt die eigenen Lebenspunkte auf.'
        : template.shield
          ? 'Fängt kommenden Schaden ab.'
          : 'Ein Angriff aus dieser Welt.',
    });

    return id;
  });
}

/** Alle Gegner, nach id. Wird beim Laden einmal aufgebaut. */
export const ENEMIES = {};

function buildEnemies() {
  for (const world of WORLDS) {
    const normalDeck = buildAttacks(world.attacks, `w${world.id}`, world.powerPerXp);
    const bossDeck = buildAttacks(world.bossAttacks, `w${world.id}-boss`, world.powerPerXp * 1.05);

    world.enemies.forEach((entry, index) => {
      const id = `w${world.id}-${slug(entry.n)}`;
      ENEMIES[id] = {
        // Aussehen: Form und Farbe werden der Reihe nach vergeben. Dadurch
        // sieht innerhalb einer Welt garantiert kein Gegner aus wie ein
        // anderer - und jede Welt hat ihren eigenen Farbton.
        look: {
          form: FORM_NAMEN[index % FORM_NAMEN.length],
          hue: (world.hueBase + index * 29) % 360,
          sattheit: 55 + (index % 4) * 10,
          akzentHue: (world.hueBase + index * 29 + 150) % 360,
          zusatz: (index + world.id) % 5,
        },
        id,
        name: entry.n,
        icon: entry.i,
        element: world.name,
        worldId: world.id,
        text: `Ein Bewohner der Welt ${world.name}.`,
        maxHp: world.baseHp + index * world.hpGrowth,
        deck: normalDeck,
        // Der Gegner wird im Verlauf der Welt wacher und geduldiger.
        reactionTime: Number((1.25 - index * 0.03).toFixed(2)),
        patience: index < 4 ? 1 : 2,
      };
    });

    const bossId = `w${world.id}-${slug(world.boss.n)}`;
    ENEMIES[bossId] = {
      // Bosse bekommen eigene Formen, die kein normaler Gegner hat.
      look: {
        form: BOSS_FORMEN[world.id % BOSS_FORMEN.length],
        hue: (world.hueBase + 200) % 360,
        sattheit: 70,
        akzentHue: (world.hueBase + 40) % 360,
        zusatz: 1,
      },
      id: bossId,
      name: world.boss.n,
      icon: world.boss.i,
      element: world.name,
      worldId: world.id,
      isBoss: true,
      text: `Der Herrscher über ${world.name}.`,
      maxHp: Math.round((world.baseHp + world.enemies.length * world.hpGrowth) * 1.15),
      deck: bossDeck,
      reactionTime: 0.85,
      patience: 3,
    };
  }
}

buildEnemies();

/** Holt einen Gegner per id - mit klarer Fehlermeldung, falls es ihn nicht gibt. */
export function getEnemy(id) {
  const enemy = ENEMIES[id];
  if (!enemy) {
    throw new Error(`Unbekannter Gegner: "${id}" (wird aus js/data/worlds.js erzeugt)`);
  }
  return enemy;
}

/** Die id des Gegners für einen bestimmten Kampf einer Welt (0-basiert). */
export function enemyIdFor(world, fightIndex) {
  const isBoss = fightIndex >= world.enemies.length;
  const name = isBoss ? world.boss.n : world.enemies[fightIndex].n;
  return `w${world.id}-${slug(name)}`;
}

/** Alle Gegner einer Welt, in der Reihenfolge der Kämpfe. */
export function enemiesOfWorld(worldId) {
  return Object.values(ENEMIES).filter((enemy) => enemy.worldId === Number(worldId));
}
