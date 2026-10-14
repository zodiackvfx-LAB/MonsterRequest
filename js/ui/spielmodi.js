/**
 * Das kleine Auswahlfenster "Spielmodi" auf dem Startbildschirm.
 *
 * Es listet alle Einträge aus js/data/spielmodi.js. Kommt ein neuer
 * Spielmodus dazu, taucht er hier von selbst auf.
 */

import { SPIELMODI } from '../data/spielmodi.js';
import { gameState } from '../core/state.js';
import { showScreen } from '../core/screens.js';
import { modusFrei, modusInfo, modusStarten } from '../core/modi.js';
import { spieleKlang } from '../core/audio.js';

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
    </div>
  `;

  const liste = overlay.querySelector('.spielmodi__liste');
  SPIELMODI.forEach((modus) => {
    const gesperrt = modus.modus && !modusFrei(modus.modus).frei;
    const info = modus.modus ? modusInfo(modus.modus) : modus.info?.(gameState);
    const karte = document.createElement('button');
    karte.type = 'button';
    karte.className = `spielmodus${gesperrt ? ' is-gesperrt' : ''}`;
    if (gesperrt) karte.dataset.klang = 'keiner';
    karte.innerHTML = `
      <span class="spielmodus__icon">${modus.icon}</span>
      <span class="spielmodus__body">
        <span class="spielmodus__name">${modus.name}</span>
        <span class="spielmodus__text">${modus.text}</span>
        ${info ? `<span class="spielmodus__info">${info}</span>` : ''}
      </span>
      <span class="spielmodus__pfeil">${gesperrt ? '🔒' : '›'}</span>
    `;
    karte.addEventListener('click', () => {
      if (gesperrt) {
        spieleKlang('gesperrt');
        return;
      }
      // Kampf-Modi starten direkt den ersten Kampf.
      if (modus.modus) showScreen('battle', { modus: modusStarten(modus.modus) });
      else showScreen(modus.screen);
    });
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
