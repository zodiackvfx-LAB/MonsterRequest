/**
 * Kleine Effekte für den Kampf: Aufprall-Funken, Bildschirm-Beben, Konfetti.
 *
 * Alle Effekte laufen über CSS-@keyframes (siehe css/ui.css). Hier wird nur
 * das passende Element erzeugt und nach kurzer Zeit wieder entfernt.
 *
 * Ist "Animationen" ausgeschaltet (oder am Gerät "weniger Bewegung"), passiert
 * gar nichts - dann sollen auch keine stummen Elemente kurz aufblitzen.
 */

/** Sind Animationen gerade erlaubt? */
function animationenAn() {
  if (document.body.classList.contains('no-animations')) return false;
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch {
    // matchMedia fehlt in sehr alten Browsern - dann eben mit Animation.
  }
  return true;
}

/**
 * Lässt den Kampfplatz kurz beben. Die Stärke richtet sich nach dem Schaden.
 *
 * @param {HTMLElement} arena
 * @param {number} anteil - Schaden geteilt durch die maximalen Lebenspunkte
 *        des Getroffenen (0 bis 1). Grosse Treffer beben stärker.
 */
export function bildschirmBeben(arena, anteil) {
  if (!arena || !animationenAn()) return;
  const klasse = anteil >= 0.28 ? 'beben-gross' : anteil >= 0.14 ? 'beben-mittel' : 'beben-klein';
  arena.classList.remove('beben-klein', 'beben-mittel', 'beben-gross');
  void arena.offsetWidth; // Neustart erzwingen
  arena.classList.add(klasse);
  setTimeout(() => arena.classList.remove(klasse), 450);
}

/**
 * Aufprall-Funken über einem getroffenen Monster: ein Lichtring und ein paar
 * Splitter, die wegfliegen.
 *
 * @param {HTMLElement} sprite - die Figur (der Effekt sitzt in deren Bühne)
 * @param {string} [farbe] - Farbe der Funken (Schaden = gold, Heilung = grün)
 * @param {number} [splitter] - Anzahl der Splitter
 */
export function trefferFunke(sprite, farbe = '#ffd76a', splitter = 7) {
  if (!sprite || !sprite.parentElement || !animationenAn()) return;

  const impakt = document.createElement('span');
  impakt.className = 'impakt';
  impakt.style.setProperty('--impakt-farbe', farbe);

  const ring = document.createElement('span');
  ring.className = 'impakt__ring';
  impakt.appendChild(ring);

  for (let i = 0; i < splitter; i++) {
    const teil = document.createElement('span');
    teil.className = 'impakt__splitter';
    // Gleichmässig im Kreis verteilt, mit etwas Zufall in der Weite.
    const winkel = (i / splitter) * Math.PI * 2 + Math.random() * 0.5;
    const weite = 26 + Math.random() * 22;
    teil.style.setProperty('--dx', `${Math.cos(winkel) * weite}px`);
    teil.style.setProperty('--dy', `${Math.sin(winkel) * weite}px`);
    impakt.appendChild(teil);
  }

  sprite.parentElement.appendChild(impakt);
  setTimeout(() => impakt.remove(), 520);
}

/**
 * Streut Konfetti über ein Element - zum Feiern im Siegesfenster.
 *
 * @param {HTMLElement} box - der Kasten, in den es fällt
 * @param {number} [anzahl]
 */
export function konfetti(box, anzahl = 16) {
  if (!box || !animationenAn()) return;

  const farben = ['#ffc53d', '#6d92ff', '#7ee081', '#ff7a3c', '#ffffff', '#c77dff'];
  const breite = box.clientWidth || 300;
  const hoehe = box.clientHeight || 320;

  for (let i = 0; i < anzahl; i++) {
    const stueck = document.createElement('span');
    stueck.className = 'konfetti';
    stueck.style.left = `${Math.random() * breite}px`;
    stueck.style.background = farben[i % farben.length];
    stueck.style.setProperty('--fall', `${hoehe + 30}px`);
    stueck.style.setProperty('--dreh', `${360 + Math.random() * 540}deg`);
    stueck.style.animationDelay = `${Math.random() * 0.35}s`;
    box.appendChild(stueck);
    setTimeout(() => stueck.remove(), 2000);
  }
}
