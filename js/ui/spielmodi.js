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
import { getMonster } from '../data/monsters.js';
import { paarGegner } from '../data/duell.js';
import { createSprite } from './sprite.js';

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
    if (modus.vorschau === 'duell') {
      liste.appendChild(duellKarte(modus));
      return;
    }
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

/**
 * Die große Karte für das 2v2 Monster-Duell: links zwei Verbündete (die
 * eigene Figur und ein Teamkamerad), rechts zwei Gegner aus der höchsten
 * Welt - darunter Name, Erklärung und "Spielen".
 */
function duellKarte(modus) {
  const karte = document.createElement('div');
  karte.className = 'spielmodus spielmodus--duell';
  karte.innerHTML = `
    <div class="duell-vorschau" aria-hidden="true">
      <span class="duell-vorschau__team duell-vorschau__team--blau"></span>
      <span class="duell-vorschau__vs">VS</span>
      <span class="duell-vorschau__team duell-vorschau__team--rot"></span>
    </div>
    <span class="spielmodus__body">
      <span class="spielmodus__name">${modus.icon} ${modus.name}</span>
      <span class="spielmodus__text">${modus.text}</span>
      <span class="spielmodus__info">${modus.info(gameState)}</span>
    </span>
    <button class="btn btn--green btn--small spielmodus__spielen" type="button" data-klang="keiner">Spielen</button>
  `;
  // Die eigene Figur und ihr Gegenstück als Teamkamerad.
  const ich = getMonster(gameState.aktiveFigur ?? 'timo');
  const partner = getMonster(ich.id === 'timo' ? 'rocco' : 'timo');
  const blau = karte.querySelector('.duell-vorschau__team--blau');
  blau.appendChild(createSprite(ich, { bild: ich.image }));
  blau.appendChild(createSprite(partner, { bild: partner.image, skin: null }));
  const rot = karte.querySelector('.duell-vorschau__team--rot');
  paarGegner(Math.max(1, gameState.unlockedWorld), 0).forEach(({ gegner }) => rot.appendChild(createSprite(gegner)));

  const oeffnen = () => {
    spieleKlang('bestaetigen');
    showScreen(modus.screen);
  };
  karte.querySelector('.spielmodus__spielen').addEventListener('click', oeffnen);
  // Die ganze Karte ist antippbar - große Touch-Fläche.
  karte.addEventListener('click', (event) => {
    if (!event.target.closest('button')) oeffnen();
  });
  return karte;
}
