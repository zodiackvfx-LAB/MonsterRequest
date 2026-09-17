/**
 * Einstellungen: Schalter und das Zurücksetzen des Fortschritts.
 */

import { showScreen } from '../core/screens.js';
import { createScenery } from '../ui/scenery.js';
import { createTopbar } from '../ui/hud.js';
import { gameState, getTotalStars, resetProgress, setSetting } from '../core/state.js';
import { LEVELS } from '../data/levels.js';

/** Die Schalter. Neue Einstellung = hier einen Eintrag ergänzen. */
const TOGGLES = [
  {
    key: 'animations',
    name: 'Animationen',
    hint: 'Treffer- und Bewegungseffekte im Kampf',
  },
  {
    key: 'sound',
    name: 'Ton',
    hint: 'Noch ohne Wirkung - Klänge kommen später',
  },
];

export const settingsScreen = {
  mount(root) {
    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Einstellungen', () => showScreen('start')));

    const content = document.createElement('div');
    content.className = 'page__content';

    /* ---------- Schalter ---------- */
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = '<div class="panel__title">Spiel</div>';

    TOGGLES.forEach((toggle) => {
      const row = document.createElement('div');
      row.className = 'setting-row';
      row.innerHTML = `
        <span class="setting-row__label">
          <span class="setting-row__name">${toggle.name}</span>
          <span class="setting-row__hint">${toggle.hint}</span>
        </span>
      `;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = `switch${gameState.settings[toggle.key] ? ' is-on' : ''}`;
      button.setAttribute('aria-label', toggle.name);
      button.addEventListener('click', () => {
        const value = !gameState.settings[toggle.key];
        setSetting(toggle.key, value);
        button.classList.toggle('is-on', value);
        applySettings();
      });

      row.appendChild(button);
      panel.appendChild(row);
    });

    content.appendChild(panel);

    /* ---------- Fortschritt ---------- */
    const progress = document.createElement('div');
    progress.className = 'panel';
    progress.innerHTML = `
      <div class="panel__title">Fortschritt</div>
      <div class="stat-row">
        <span class="stat-row__label">Geschaffte Level</span>
        <span class="stat-row__value">${gameState.clearedLevels.length} / ${LEVELS.length}</span>
      </div>
      <div class="stat-row">
        <span class="stat-row__label">Sterne</span>
        <span class="stat-row__value">${getTotalStars()} / ${LEVELS.length * 3}</span>
      </div>
      <div class="stat-row">
        <span class="stat-row__label">Münzen</span>
        <span class="stat-row__value">🪙 ${gameState.coins}</span>
      </div>
    `;
    content.appendChild(progress);

    const resetButton = document.createElement('button');
    resetButton.className = 'btn btn--danger';
    resetButton.type = 'button';
    resetButton.textContent = 'Fortschritt zurücksetzen';
    resetButton.addEventListener('click', () => askReset(screen));
    content.appendChild(resetButton);

    const note = document.createElement('p');
    note.className = 'map__info-text';
    note.style.textAlign = 'center';
    note.textContent = 'MonsterQuest · Phase 1';
    content.appendChild(note);

    screen.appendChild(content);
    root.appendChild(screen);
  },
};

/** Sicherheitsabfrage, damit niemand aus Versehen alles löscht. */
function askReset(screen) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay__box">
      <div class="overlay__icon">⚠️</div>
      <h3 class="overlay__title">Wirklich zurücksetzen?</h3>
      <p class="overlay__text">
        Alle Level, Sterne und Münzen gehen verloren. Das lässt sich nicht rückgängig machen.
      </p>
      <div class="overlay__actions">
        <button class="btn btn--ghost" id="btn-cancel" type="button">Abbrechen</button>
        <button class="btn btn--danger" id="btn-confirm" type="button">Ja, alles löschen</button>
      </div>
    </div>
  `;

  overlay.querySelector('#btn-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#btn-confirm').addEventListener('click', () => {
    resetProgress();
    showScreen('start');
  });

  screen.appendChild(overlay);
}

/**
 * Wendet die Einstellungen auf die Seite an.
 * Ist "Animationen" aus, bekommt der Körper eine Klasse, die alle
 * Animationen abschaltet (siehe css/base.css).
 */
export function applySettings() {
  document.body.classList.toggle('no-animations', !gameState.settings.animations);
}
