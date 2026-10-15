/**
 * Kurzes Kampf-Tutorial für den allerersten Kampf.
 *
 * Zeigt einmalig drei knappe Hinweise, wie ein Kampf funktioniert, und startet
 * den Kampf erst, wenn der Spieler auf "Los geht's!" tippt. Danach wird der
 * Hinweis als gesehen gemerkt (siehe js/core/state.js) und nie wieder gezeigt.
 *
 * Bewusst schlicht gehalten: ein Kasten mit drei Zeilen statt animierter
 * Pfeile - das ist auf dem Handy am ruhigsten zu lesen und blockiert nichts
 * länger als nötig.
 */

const SCHRITTE = [
  { icon: '⚡', titel: 'Energie sammelt sich', text: 'Deine Energie füllt sich von selbst - Sekunde für Sekunde.' },
  { icon: '🃏', titel: 'Karten spielen', text: 'Tippe eine Karte, sobald du genug Energie hast. Teure Karten treffen härter.' },
  { icon: '❤️', titel: 'Zuerst zuschlagen', text: 'Besiege den Gegner, bevor er dich besiegt. Behalte seine Energieleiste im Blick!' },
];

/**
 * Zeigt das Tutorial über dem Kampf.
 *
 * @param {HTMLElement} container - der Kampfbildschirm (das Overlay kommt hinein)
 * @param {function} onFertig - wird aufgerufen, wenn der Spieler beginnt
 */
export function zeigeKampfTutorial(container, onFertig) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay overlay--tutorial';

  const schritte = SCHRITTE.map(
    (s) => `
      <li class="tutorial-step">
        <span class="tutorial-step__icon">${s.icon}</span>
        <span class="tutorial-step__body">
          <span class="tutorial-step__title">${s.titel}</span>
          <span class="tutorial-step__text">${s.text}</span>
        </span>
      </li>`
  ).join('');

  overlay.innerHTML = `
    <div class="overlay__box">
      <div class="overlay__icon">🎓</div>
      <h3 class="overlay__title">So kämpfst du</h3>
      <ul class="tutorial-liste">${schritte}</ul>
      <div class="overlay__actions">
        <button class="btn btn--big btn--green" id="tutorial-los" type="button">Los geht's!</button>
      </div>
    </div>
  `;

  overlay.querySelector('#tutorial-los').addEventListener('click', () => {
    overlay.remove();
    onFertig();
  });

  container.appendChild(overlay);
}
