/**
 * Das Pop-up beim allerersten Start.
 *
 * Es fragt nach einem Namen. Den zeigt das Spiel oben in der Spielerleiste
 * an, und in deiner Datenbank-Übersicht siehst du ihn statt nur der langen
 * Spielernummer.
 *
 * Der Name ist freiwillig: Wer nichts eingibt und auf "Los geht's" tippt,
 * spielt einfach ohne. Ändern lässt er sich später in den Einstellungen
 * unter "Datenbank".
 */

import { NAME_MAX } from '../core/state.js';

/**
 * Zeigt das Pop-up.
 *
 * @param {HTMLElement} root - der Bildschirm, über den es gelegt wird
 * @param {(name: string) => void} onFertig - bekommt den eingegebenen Namen
 *        (kann leer sein)
 */
export function zeigeWillkommen(root, onFertig) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay__box willkommen">
      <div class="overlay__icon">👋</div>
      <h3 class="overlay__title">Willkommen!</h3>
      <p class="overlay__text">Wie sollen wir dich nennen?</p>
      <input
        class="eingabe willkommen__feld"
        type="text"
        maxlength="${NAME_MAX}"
        placeholder="Dein Name"
        autocomplete="off"
        autocapitalize="words"
        spellcheck="false"
        aria-label="Dein Name"
      />
      <p class="willkommen__hinweis">Das kannst du später jederzeit ändern.</p>
      <div class="overlay__actions">
        <button class="btn btn--big btn--green" id="willkommen-los" type="button">
          Los geht's
        </button>
      </div>
    </div>
  `;

  const feld = overlay.querySelector('.willkommen__feld');
  const los = overlay.querySelector('#willkommen-los');

  function fertig() {
    const name = feld.value.trim();
    overlay.remove();
    onFertig(name);
  }

  los.addEventListener('click', fertig);
  // Auf der Tastatur die Eingabetaste ("Fertig"/"Return") übernehmen.
  feld.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fertig();
    }
  });

  root.appendChild(overlay);

  // Kurz warten, dann das Feld aktivieren - sonst öffnet iOS die Tastatur
  // manchmal nicht.
  setTimeout(() => feld.focus(), 60);
}
