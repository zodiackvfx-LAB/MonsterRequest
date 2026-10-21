/**
 * Fenster passen immer auf den Bildschirm.
 *
 * Ein Fenster (.overlay__box - Sieg, Niederlage, Einladung ... - und die
 * Truhen-Öffnung) kann mal mehr enthalten als sonst: Beute, Truhe, Level-Aufstieg, neue Welt,
 * Erfolge. Auf einem Handy wurde es dann höher als der Bildschirm, und man
 * musste darin scrollen, um "Weiter" zu finden. Jetzt wird so ein Fenster
 * gleichmäßig verkleinert (CSS scale), bis alles auf einmal zu sehen ist.
 *
 * Nur wenn es dafür zu klein würde (unter MIN_ZOOM), darf es wie bisher
 * scrollen - lesbar bleibt es dann trotzdem.
 *
 * Läuft von selbst für jedes Fenster, das irgendwo im Spiel erscheint, und
 * passt nach, wenn sich der Inhalt ändert (Beute rollt herein) oder das
 * Gerät gedreht wird.
 */

/** Was als Fenster gilt: die üblichen Fenster und die Truhen-Öffnung. */
const FENSTER = '.overlay__box, .overlay > .oeffnung';

/** Kleiner wird ein Fenster nicht - darunter wäre der Text zu winzig. */
const MIN_ZOOM = 0.6;

/** Fenster, die gerade beobachtet werden. */
const fenster = new Set();
let groessenBeobachter = null;

/** Erst im nächsten Bild rechnen - mehrere Änderungen auf einmal. */
let geplant = false;
function planen() {
  if (geplant) return;
  geplant = true;
  requestAnimationFrame(() => {
    geplant = false;
    alleEinpassen();
  });
}

/**
 * Rechnet aus, wie stark ein Fenster verkleinert werden muss.
 *
 * Verkleinert wird mit der CSS-Eigenschaft "scale" (nicht "zoom" - die
 * rechnet Safari auf dem iPhone anders als Chrome). scale ändert die
 * Größe nur beim Zeichnen: Das Fenster ist im Aufbau so hoch wie sein
 * Inhalt, steht mittig und wird um die Mitte herum so weit verkleinert,
 * dass es genau in den Platz passt. Die Einblend-Animation (transform)
 * stört das nicht - scale ist eine eigene Eigenschaft.
 */
function einpassen(box) {
  const overlay = box.parentElement;
  if (!overlay || !box.isConnected) return;
  const stil = getComputedStyle(overlay);
  // 2 px Luft: Verkleinerte Fenster runden beim Zeichnen etwas auf.
  const platz = overlay.clientHeight - parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom) - 2;
  if (!(platz > 0)) return;

  // Volle Höhe des Inhalts messen: Die Höchsthöhe aus dem CSS kurz
  // aufheben (scale selbst ändert an den Maßen nichts).
  box.style.maxHeight = 'none';
  const hoehe = box.offsetHeight;
  if (hoehe <= platz) {
    box.style.maxHeight = '';
    box.style.scale = '';
    box.style.marginBlock = '';
    overlay.style.overflow = '';
    return;
  }

  const faktor = Math.max(MIN_ZOOM, Math.floor((platz / hoehe) * 1000) / 1000);
  // Reicht selbst das kleinste Maß nicht, darf das Fenster wie früher
  // scrollen - dann aber genau so hoch, dass es verkleinert passt.
  const aufbau = hoehe * faktor <= platz + 1 ? hoehe : platz / faktor;
  box.style.maxHeight = aufbau < hoehe ? `${aufbau}px` : 'none';
  box.style.scale = String(faktor);
  // Im Aufbau nimmt das Fenster genau den Platz ein (negative Ränder
  // oben und unten) und steht so in jedem Browser mittig - verkleinert
  // um seine Mitte passt es dann genau hinein.
  box.style.marginBlock = `${-(aufbau - platz) / 2}px`;
  // Das unverkleinerte Fenster ragt im Aufbau über den Rand hinaus - das
  // darf die Seite dahinter nicht scrollbar machen.
  overlay.style.overflow = 'hidden';
}

function alleEinpassen() {
  fenster.forEach((box) => {
    if (!box.isConnected) {
      fenster.delete(box);
      groessenBeobachter?.unobserve(box);
      return;
    }
    einpassen(box);
  });
}

/**
 * Ergebnisfenster (Sieg, Niederlage, Arena, Modi, 2v2) in zwei Gruppen
 * teilen: links Kopf, Sterne, Monster, der erste Text und die Knöpfe -
 * rechts der Rest (Beute, Truhen, Aufstieg, Erfolge). Die Knöpfe stehen
 * hochkant trotzdem ganz unten (order in css/erlebnis.css). Hochkant sind
 * die Gruppen unsichtbar (display: contents) und nichts ändert sich; im Querformat stehen sie
 * nebeneinander (css/erlebnis.css), damit alles auf den flachen
 * Bildschirm passt.
 */
function spaltenBilden(box) {
  if (box.dataset.spalten || !box.parentElement?.classList.contains('overlay--ergebnis')) return;
  const kinder = [...box.children];
  const text = kinder.findIndex((k) => k.classList.contains('overlay__text'));
  if (text < 0 || text === kinder.length - 1) return;
  box.dataset.spalten = '1';
  const links = document.createElement('div');
  links.className = 'ergebnis-spalte ergebnis-spalte--links';
  const rechts = document.createElement('div');
  rechts.className = 'ergebnis-spalte ergebnis-spalte--rechts';
  const knoepfe = kinder.filter((k) => k.classList.contains('overlay__actions'));
  links.append(...kinder.slice(0, text + 1), ...knoepfe);
  rechts.append(...kinder.slice(text + 1).filter((k) => !knoepfe.includes(k)));
  box.append(links, rechts);
}

function aufnehmen(box) {
  if (fenster.has(box)) return;
  fenster.add(box);
  spaltenBilden(box);
  groessenBeobachter?.observe(box);
  einpassen(box);
}

/** Einmal beim Start (js/main.js). */
export function fensterEinpassenStarten() {
  if (typeof MutationObserver !== 'function' || !CSS.supports?.('scale', '0.5')) return;

  // Das Fenster selbst wird größer oder kleiner (z. B. gedreht).
  if (typeof ResizeObserver === 'function') groessenBeobachter = new ResizeObserver(planen);

  // Neue Fenster aufnehmen - und neu rechnen, wenn sich in einem Fenster
  // etwas ändert (Beute rollt herein, Text wird getauscht).
  new MutationObserver((aenderungen) => {
    let geaendert = false;
    aenderungen.forEach((a) => {
      if (!geaendert && fenster.size && a.target.closest?.(FENSTER)) geaendert = true;
      a.addedNodes.forEach((knoten) => {
        if (knoten.nodeType !== 1) return;
        if (knoten.matches(FENSTER)) aufnehmen(knoten);
        knoten.querySelectorAll?.(FENSTER).forEach(aufnehmen);
      });
    });
    if (geaendert) planen();
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  document.querySelectorAll(FENSTER).forEach(aufnehmen);
  addEventListener('resize', alleEinpassen);
  addEventListener('orientationchange', alleEinpassen);
}
