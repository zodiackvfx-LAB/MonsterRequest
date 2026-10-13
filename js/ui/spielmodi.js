/**
 * Das kleine Auswahlfenster "Spielmodi" auf dem Startbildschirm.
 *
 * Es listet alle Einträge aus js/data/spielmodi.js. Kommt ein neuer
 * Spielmodus dazu, taucht er hier von selbst auf.
 */

import { SPIELMODI } from '../data/spielmodi.js';
import { gameState } from '../core/state.js';
import { showScreen } from '../core/screens.js';

/**
 * Öffnet das Fenster über einem Bildschirm.
 * @param {HTMLElement} screen
 */
export function zeigeSpielmodi(screen) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay overlay--spielmodi';
  overlay.innerHTML = `
    <div class="overlay__box spielmodi" role="dialog" aria-label="Spielmodi">
      <button class="spielmodi__zu" type="button" aria-label="Schließen" data-klang="zurueck">✕</button>
      <h3 class="overlay__title">Spielmodi</h3>
      <div class="spielmodi__liste"></div>
      <p class="spielmodi__hinweis">Weitere Spielmodi kommen hier dazu.</p>
    </div>
  `;

  const liste = overlay.querySelector('.spielmodi__liste');
  SPIELMODI.forEach((modus) => {
    const karte = document.createElement('button');
    karte.type = 'button';
    karte.className = 'spielmodus';
    karte.innerHTML = `
      <span class="spielmodus__icon">${modus.icon}</span>
      <span class="spielmodus__body">
        <span class="spielmodus__name">${modus.name}</span>
        <span class="spielmodus__text">${modus.text}</span>
        ${modus.info ? `<span class="spielmodus__info">${modus.info(gameState)}</span>` : ''}
      </span>
      <span class="spielmodus__pfeil">›</span>
    `;
    karte.addEventListener('click', () => showScreen(modus.screen));
    liste.appendChild(karte);
  });

  const schliessen = () => overlay.remove();
  overlay.querySelector('.spielmodi__zu').addEventListener('click', schliessen);
  // Ein Tipp neben das Fenster schließt es auch.
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) schliessen();
  });
  screen.appendChild(overlay);
}
