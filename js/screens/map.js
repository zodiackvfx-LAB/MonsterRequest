/**
 * Weltkarte: zeigt alle Level aus js/data/levels.js als Punkte in der Landschaft.
 *
 * - Die Position eines Levels steht in den Daten (x/y in Prozent).
 * - Der Weg zwischen den Punkten wird automatisch gezeichnet.
 * - Freigeschaltete Level sind anklickbar, gesperrte zeigen ein Schloss.
 * - Kommen neue Level dazu, wächst die Karte mit - hier ist nichts zu ändern.
 */

import { showScreen } from '../core/screens.js';
import { LEVELS } from '../data/levels.js';
import { getMonster } from '../data/monsters.js';
import { createScenery } from '../ui/scenery.js';
import { createHud, createStars } from '../ui/hud.js';
import { getStars, getTotalStars, isLevelCleared, isLevelUnlocked } from '../core/state.js';

/** Beschriftung unter einem Levelpunkt. */
function nodeLabel(level, unlocked) {
  if (!unlocked) return level.isBoss ? 'BOSS' : 'Gesperrt';
  return level.isBoss ? `BOSS · ${level.name}` : level.name;
}

export const mapScreen = {
  mount(root) {
    const screen = document.createElement('div');
    screen.className = 'screen screen--map';
    screen.appendChild(createScenery({ region: 'wald' }));
    screen.appendChild(createHud());

    /* ---------- Kartenfläche ---------- */
    const map = document.createElement('div');
    map.className = 'map';

    const canvas = document.createElement('div');
    canvas.className = 'map__canvas';

    // Der Weg als gestrichelte Linie durch alle Levelpunkte.
    const points = LEVELS.map((level) => `${level.x},${level.y}`).join(' ');
    canvas.innerHTML = `
      <svg class="map__path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline class="map__path-line" points="${points}" vector-effect="non-scaling-stroke" />
      </svg>
    `;

    // Das nächste noch nicht geschaffte Level wird hervorgehoben.
    const currentLevel = LEVELS.find((level) => isLevelUnlocked(level.id) && !isLevelCleared(level.id));

    LEVELS.forEach((level) => {
      const unlocked = isLevelUnlocked(level.id);
      const cleared = isLevelCleared(level.id);
      const enemy = getMonster(level.enemyId);

      const node = document.createElement('button');
      node.type = 'button';
      node.className = [
        'node',
        unlocked ? 'is-unlocked' : 'is-locked',
        cleared ? 'is-cleared' : '',
        level.isBoss ? 'is-boss' : '',
        currentLevel && currentLevel.id === level.id ? 'is-current' : '',
      ]
        .filter(Boolean)
        .join(' ');
      node.style.left = `${level.x}%`;
      node.style.top = `${level.y}%`;
      node.disabled = !unlocked;
      node.setAttribute(
        'aria-label',
        `Level ${level.id}: ${level.name} (${cleared ? 'geschafft' : unlocked ? 'offen' : 'gesperrt'})`
      );

      const badge = level.isBoss && unlocked ? '💀' : unlocked ? level.id : '🔒';
      node.innerHTML = `
        <span class="node__circle">${badge}</span>
        <span class="node__label">${nodeLabel(level, unlocked)}</span>
      `;
      node.insertBefore(createStars(getStars(level.id)), node.querySelector('.node__label'));

      if (unlocked) {
        node.addEventListener('click', () => selectLevel(level, enemy));
      }

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

    /** Zeigt ein Level in der Infoleiste an und legt den Startknopf darauf. */
    let selected = null;
    function selectLevel(level, enemy) {
      selected = level;
      info.innerHTML = `
        <span class="map__info-title">${level.isBoss ? '👑 ' : ''}${level.region} · Level ${level.id}</span>
        <span class="map__info-text"><strong>${level.name}</strong></span>
        <span class="map__info-text">${level.text}</span>
        <span class="map__info-text">Gegner: ${enemy.icon} ${enemy.name} · ${enemy.maxHp} LP</span>
      `;
      playButton.textContent = `▶  LEVEL ${level.id} STARTEN`;
      playButton.disabled = false;
    }

    playButton.addEventListener('click', () => {
      if (selected) showScreen('battle', { levelId: selected.id });
    });

    // Beim Öffnen ist das nächste offene Level vorausgewählt.
    const preselect = currentLevel ?? LEVELS.find((level) => isLevelUnlocked(level.id));
    if (preselect) {
      selectLevel(preselect, getMonster(preselect.enemyId));
    } else {
      info.innerHTML = '<span class="map__info-text">Kein Level verfügbar.</span>';
      playButton.disabled = true;
    }

    screen.appendChild(map);
    screen.appendChild(footer);
    root.appendChild(screen);

    // Region und Sterne in der Kopfzeile ergänzen
    const hud = screen.querySelector('.hud');
    const regionChip = document.createElement('div');
    regionChip.className = 'hud__coins';
    regionChip.innerHTML = `<span class="hud__coin-icon">⭐</span><span>${getTotalStars()} / ${LEVELS.length * 3}</span>`;
    hud.insertBefore(regionChip, hud.lastElementChild);

    // Die Karte startet unten (bei Level 1), nicht oben.
    map.scrollTop = map.scrollHeight;
  },
};
