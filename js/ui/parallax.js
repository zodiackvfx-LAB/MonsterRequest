/**
 * Ein sehr leichter Tiefeneffekt für die Lobby.
 *
 * Bewegt man den Finger über den Bildschirm, verschieben sich die Ebenen
 * unterschiedlich weit: der Himmel fast gar nicht, die Berge ein wenig, die
 * Wiesenverzierung am stärksten. Dadurch wirkt die Lobby räumlich, ohne zu
 * wackeln.
 *
 * Zwei Dinge halten es ruhig:
 *   1. Der Zielwert wird geglättet (jeder Schritt nur ein Stück in Richtung
 *      Ziel). Ein ruckartiger Finger ergibt trotzdem eine weiche Bewegung.
 *   2. Ohne Berührung läuft alles langsam wieder in die Mitte zurück.
 *
 * Die Bewegungsweite je Ebene steht in css/screens.css.
 */

/** Wie schnell sich die Kulisse dem Ziel annähert (0 = gar nicht, 1 = sofort). */
const GLAETTUNG = 0.08;

/**
 * Schaltet den Effekt für einen Bildschirm ein.
 * @param {HTMLElement} screen
 * @returns {function} Aufräumen - beim Verlassen des Bildschirms aufrufen
 */
export function parallaxAktivieren(screen) {
  // Wer Animationen abgeschaltet hat, bekommt auch keine Kamerabewegung.
  if (document.body.classList.contains('no-animations')) return () => {};
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};

  let zielX = 0;
  let zielY = 0;
  let istX = 0;
  let istY = 0;
  let laeuft = true;
  let rafId = null;

  function merken(event) {
    const b = screen.getBoundingClientRect();
    // -1 (links/oben) bis +1 (rechts/unten)
    zielX = ((event.clientX - b.left) / b.width) * 2 - 1;
    zielY = ((event.clientY - b.top) / b.height) * 2 - 1;
  }

  function loslassen() {
    zielX = 0;
    zielY = 0;
  }

  function schritt() {
    if (!laeuft) return;
    istX += (zielX - istX) * GLAETTUNG;
    istY += (zielY - istY) * GLAETTUNG;
    screen.style.setProperty('--px', istX.toFixed(4));
    screen.style.setProperty('--py', istY.toFixed(4));
    rafId = requestAnimationFrame(schritt);
  }

  screen.addEventListener('pointermove', merken);
  screen.addEventListener('pointerdown', merken);
  screen.addEventListener('pointerup', loslassen);
  screen.addEventListener('pointerleave', loslassen);
  screen.addEventListener('pointercancel', loslassen);
  rafId = requestAnimationFrame(schritt);

  return () => {
    laeuft = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    screen.removeEventListener('pointermove', merken);
    screen.removeEventListener('pointerdown', merken);
    screen.removeEventListener('pointerup', loslassen);
    screen.removeEventListener('pointerleave', loslassen);
    screen.removeEventListener('pointercancel', loslassen);
  };
}
