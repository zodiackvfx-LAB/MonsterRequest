/**
 * Weltkarte einer Welt: zeigt alle Kämpfe als Stationen auf einem Weg.
 *
 * - Die Positionen stehen in den Level-Daten (js/data/levels.js) und werden
 *   dort automatisch berechnet. Kommt ein Kampf dazu, wächst die Karte mit.
 * - Geschaffte Kämpfe tragen einen Haken und ihre Sterne.
 * - Der nächste offene Kampf wackelt, damit man ihn sofort findet.
 * - Gesperrte Kämpfe zeigen ein Schloss.
 */

import { showScreen } from '../core/screens.js';
import { levelsOfWorld } from '../data/levels.js';
import { getWorld, fightsInWorld } from '../data/worlds.js';
import { getEnemy } from '../data/enemies.js';
import { applyRegion, createScenery } from '../ui/scenery.js';
import { createHud, createStars } from '../ui/hud.js';
import { createSprite } from '../ui/sprite.js';
import { MUENZE } from '../data/items.js';
import {
  clearedInWorld,
  gameState,
  getStars,
  getTotalStars,
  isLevelCleared,
  isLevelUnlocked,
  nextLevelOf,
} from '../core/state.js';

/**
 * Beschriftung unter einer Station. Immer die Kampfnummer - ob gesperrt ist,
 * zeigt schon das Schloss im Kreis. Drei Mal "Gesperrt" untereinander wäre
 * nur unruhig.
 */
function nodeLabel(level, unlocked) {
  if (level.isBoss) return unlocked ? `BOSS · ${getEnemy(level.enemyId).name}` : 'BOSS';
  return `Kampf ${level.number}`;
}

export const mapScreen = {
  // Auf der Karte läuft schon die Musik der Welt.
  musik: (params) => getWorld(Number(params.worldId) || gameState.unlockedWorld)?.music ?? 'menue',

  mount(root, params = {}) {
    const worldId = Number(params.worldId) || gameState.unlockedWorld;
    const world = getWorld(worldId);
    if (!world) throw new Error(`Welt ${worldId} gibt es nicht (siehe js/data/worlds.js)`);

    const levels = levelsOfWorld(worldId);
    const current = nextLevelOf(worldId);

    const screen = document.createElement('div');
    screen.className = 'screen screen--map';
    applyRegion(screen, world.scenery);
    screen.appendChild(createScenery());
    screen.appendChild(createHud());

    /* ---------- Kopfzeile der Welt ---------- */
    const header = document.createElement('div');
    header.className = 'map__header';
    header.innerHTML = `
      <button class="btn btn--ghost btn--small" id="btn-worlds" type="button">🗺️&nbsp;Welten</button>
      <span class="map__world">${world.icon} ${world.name}</span>
      <span class="map__chip">${clearedInWorld(worldId)} / ${fightsInWorld(world)}</span>
    `;
    header.querySelector('#btn-worlds').addEventListener('click', () => showScreen('worlds'));
    screen.appendChild(header);

    /* ---------- Kartenfläche ---------- */
    const map = document.createElement('div');
    map.className = 'map';

    const canvas = document.createElement('div');
    canvas.className = 'map__canvas';
    // Je mehr Kämpfe, desto höher die Karte - sie wird dann scrollbar.
    canvas.style.setProperty('--levels', String(levels.length));

    const points = levels.map((level) => `${level.x},${level.y}`).join(' ');
    canvas.innerHTML = `
      <svg class="map__path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline class="map__path-line" points="${points}" vector-effect="non-scaling-stroke" />
      </svg>
    `;

    levels.forEach((level) => {
      const unlocked = isLevelUnlocked(level.id);
      const cleared = isLevelCleared(level.id);
      const enemy = getEnemy(level.enemyId);

      const node = document.createElement('button');
      node.type = 'button';
      node.className = [
        'node',
        unlocked ? 'is-unlocked' : 'is-locked',
        cleared ? 'is-cleared' : '',
        level.isBoss ? 'is-boss' : '',
        current && current.id === level.id ? 'is-current' : '',
      ]
        .filter(Boolean)
        .join(' ');
      node.style.left = `${level.x}%`;
      node.style.top = `${level.y}%`;
      node.disabled = !unlocked;
      node.setAttribute(
        'aria-label',
        `Kampf ${level.number}: ${level.name} (${cleared ? 'geschafft' : unlocked ? 'offen' : 'gesperrt'})`
      );

      const badge = cleared ? '✓' : level.isBoss && unlocked ? '💀' : unlocked ? level.number : '🔒';
      node.innerHTML = `
        <span class="node__circle">${badge}</span>
        <span class="node__label">${nodeLabel(level, unlocked)}</span>
      `;
      // Sterne nur bei geschafften Kämpfen - sonst stehen überall graue Sterne.
      const sterne = getStars(level.id);
      if (sterne > 0) {
        node.insertBefore(createStars(sterne), node.querySelector('.node__label'));
      }

      if (unlocked) node.addEventListener('click', () => selectLevel(level, enemy));
      canvas.appendChild(node);
    });

    map.appendChild(canvas);

    /* ---------- Infoleiste unten ---------- */
    const footer = document.createElement('div');
    footer.className = 'map__footer';

    const info = document.createElement('div');
    info.className = 'panel panel--tight map__info';
    footer.appendChild(info);

    const buttons = document.createElement('div');
    buttons.className = 'map__buttons';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn--ghost';
    backButton.type = 'button';
    backButton.textContent = '‹';
    backButton.setAttribute('aria-label', 'Zurück zum Startbildschirm');
    backButton.addEventListener('click', () => showScreen('start'));
    buttons.appendChild(backButton);

    const playButton = document.createElement('button');
    playButton.className = 'btn btn--big btn--green';
    playButton.type = 'button';
    buttons.appendChild(playButton);

    footer.appendChild(buttons);

    let selected = null;
    function selectLevel(level, enemy) {
      selected = level;
      info.innerHTML = `
        <span class="map__info-sprite"></span>
        <span class="map__info-title">${level.isBoss ? '👑 ' : ''}Kampf ${level.number} von ${levels.length}</span>
        <span class="map__info-text"><strong>${enemy.name}</strong> · ${enemy.maxHp} LP</span>
        <span class="map__info-text">Belohnung: ${MUENZE} ${level.reward}</span>
      `;
      info.querySelector('.map__info-sprite').appendChild(createSprite(enemy));
      playButton.textContent = level.isBoss ? '▶  BOSSKAMPF' : `▶  KAMPF ${level.number} STARTEN`;
      playButton.disabled = false;

      canvas.querySelectorAll('.node').forEach((node) => node.classList.remove('is-selected'));
      const index = levels.indexOf(level);
      canvas.querySelectorAll('.node')[index]?.classList.add('is-selected');
    }

    playButton.addEventListener('click', () => {
      if (selected) showScreen('battle', { levelId: selected.id });
    });

    const preselect = current ?? levels.findLast((level) => isLevelUnlocked(level.id)) ?? levels[0];
    if (preselect) {
      selectLevel(preselect, getEnemy(preselect.enemyId));
    } else {
      info.innerHTML = '<span class="map__info-text">Kein Kampf verfügbar.</span>';
      playButton.disabled = true;
    }

    screen.appendChild(map);
    screen.appendChild(footer);
    root.appendChild(screen);

    // Sterne dieser Welt in der Kopfleiste ergänzen
    const hud = screen.querySelector('.hud');
    const starChip = document.createElement('div');
    starChip.className = 'hud__coins';
    starChip.innerHTML = `<span class="hud__coin-icon">⭐</span><span>${getTotalStars(worldId)} / ${levels.length * 3}</span>`;
    hud.insertBefore(starChip, hud.lastElementChild);

    // Zum ausgewählten Kampf scrollen - und zwar so, dass er komplett im
    // Bild liegt und nicht am oberen oder unteren Rand angeschnitten wird.
    const selectedNode = canvas.querySelector('.node.is-selected');
    if (selectedNode) {
      const mitte = selectedNode.offsetTop - map.clientHeight / 2 + selectedNode.offsetHeight / 2;
      const rand = 60; // Platz für den weichen Rand der Karte
      map.scrollTop = Math.max(
        0,
        Math.min(mitte, map.scrollHeight - map.clientHeight - rand + rand)
      );
    } else {
      map.scrollTop = map.scrollHeight;
    }
  },
};
