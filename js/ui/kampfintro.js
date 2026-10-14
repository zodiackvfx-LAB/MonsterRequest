/**
 * Auftritte, eigene Bewegungen und das Intro vor jedem Kampf.
 *
 * Reine Darstellung: Hier wird nichts gerechnet. Der Kampf startet erst,
 * wenn das Intro fertig ist (oder übersprungen wurde) - bis dahin läuft
 * keine Energie und kein Gegnerzug.
 *
 * Jede Pixel-Figur hat eine Grundform (siehe FORMEN in js/ui/sprite.js).
 * Aus ihr ergibt sich, WIE ein Gegner auftritt und wie er sich im Kampf
 * bewegt - ein Geist schwebt, ein Golem stampft, ein Flügler flattert.
 * Neue Form = hier einen Eintrag ergänzen (und die Bewegung in
 * css/erlebnis.css).
 */

import { aussehenVon } from './sprite.js';

/**
 * Bewegung je Grundform.
 *   ruhe     - Dauerbewegung im Kampf (Klasse ruhe--...)
 *   auftritt - wie die Figur ins Bild kommt (Klasse auftritt--...):
 *              busch   springt aus einem Busch
 *              rollen  rollt von der Seite herein
 *              landen  landet von oben
 *              stein   lugt hinter einem Stein hervor
 *              gleiten gleitet sanft ins Bild
 */
const BEWEGUNG = {
  klecks: { ruhe: 'wabbeln', auftritt: 'busch' },
  vierbeiner: { ruhe: 'stampfen', auftritt: 'busch' },
  fluegler: { ruhe: 'flattern', auftritt: 'landen' },
  gestalt: { ruhe: 'atmen', auftritt: 'stein' },
  schlange: { ruhe: 'schlaengeln', auftritt: 'gleiten' },
  golem: { ruhe: 'stampfen', auftritt: 'rollen' },
  kaefer: { ruhe: 'wackeln', auftritt: 'stein' },
  geist: { ruhe: 'schweben', auftritt: 'gleiten' },
  drache: { ruhe: 'flattern', auftritt: 'landen' },
  herrscher: { ruhe: 'atmen', auftritt: 'landen' },

  // Neue Formen ab Welt 7
  qualle: { ruhe: 'schweben', auftritt: 'gleiten' },
  fisch: { ruhe: 'schlaengeln', auftritt: 'gleiten' },
  vogel: { ruhe: 'flattern', auftritt: 'landen' },
  krabbe: { ruhe: 'wackeln', auftritt: 'stein' },
  roboter: { ruhe: 'stampfen', auftritt: 'rollen' },
  stern: { ruhe: 'wackeln', auftritt: 'rollen' },
  baer: { ruhe: 'stampfen', auftritt: 'busch' },
  hase: { ruhe: 'wabbeln', auftritt: 'busch' },
  flamme: { ruhe: 'wabbeln', auftritt: 'gleiten' },
  wurm: { ruhe: 'schlaengeln', auftritt: 'busch' },
  kugel: { ruhe: 'wackeln', auftritt: 'rollen' },
  wolke: { ruhe: 'schweben', auftritt: 'gleiten' },
  drachling: { ruhe: 'flattern', auftritt: 'landen' },

  // Neue Boss-Formen ab Welt 7
  sturmriese: { ruhe: 'schweben', auftritt: 'landen' },
  krake: { ruhe: 'wabbeln', auftritt: 'landen' },
  hexe: { ruhe: 'atmen', auftritt: 'landen' },
  koloss: { ruhe: 'stampfen', auftritt: 'landen' },
  koenigin: { ruhe: 'atmen', auftritt: 'landen' },
  kaiser: { ruhe: 'atmen', auftritt: 'landen' },
};

/** Wie bewegt sich dieser Gegner? Bosse landen immer - mit Wucht. */
export function bewegungVon(gegner) {
  const form = aussehenVon(gegner).form;
  const bewegung = BEWEGUNG[form] ?? { ruhe: 'atmen', auftritt: 'gleiten' };
  return gegner.isBoss ? { ...bewegung, auftritt: 'landen' } : bewegung;
}

/** Dauer des normalen Intros und des Boss-Intros in Millisekunden. */
const DAUER_NORMAL = 1500;
const DAUER_BOSS = 2900;

/** Sind Animationen gerade erlaubt? (gleiche Regel wie js/ui/effekte.js) */
function animationenAn() {
  if (document.body.classList.contains('no-animations')) return false;
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch {
    // ohne matchMedia eben mit Animation
  }
  return true;
}

/**
 * Spielt das Intro vor dem Kampf.
 *
 * Normaler Kampf (ca. 1,5 s): kurzer Schleier, die Silhouette des Gegners,
 * sein Name, dann sein Auftritt.
 * Bosskampf (ca. 2,9 s): der Himmel verdunkelt sich, eine Krone fällt,
 * die Kamera zoomt auf den Boss, er landet, ein großes Banner erscheint,
 * die Kamera fährt zurück.
 *
 * Ein Tipp irgendwohin überspringt das Intro. Sind Animationen aus, läuft
 * der Kampf sofort los.
 *
 * @param {HTMLElement} screen - der Kampfbildschirm
 * @param {object} optionen
 * @param {object} optionen.gegner - der Gegner (Name, isBoss, Form)
 * @param {HTMLElement} optionen.sprite - der Kasten mit der Gegnerfigur
 * @param {function} optionen.fertig - wird genau EINMAL gerufen
 * @returns {function} Abbrechen (ohne fertig) - für das Verlassen des Kampfs
 */
export function spieleKampfIntro(screen, { gegner, sprite, fertig }) {
  const { auftritt } = bewegungVon(gegner);
  const boss = Boolean(gegner.isBoss);
  const buehne = sprite.parentElement;
  const kamera = screen.querySelector('.battlefield');
  const timer = [];
  let erledigt = false;

  if (!animationenAn()) {
    fertig();
    return () => {};
  }

  // Bis zum Auftritt ist nur die schwarze Silhouette zu sehen.
  sprite.classList.add('ist-silhouette');

  // Requisite für den Auftritt: ein Busch oder Stein vor der Figur.
  let requisite = null;
  if (auftritt === 'busch' || auftritt === 'stein') {
    requisite = document.createElement('span');
    requisite.className = `auftritt-requisite auftritt-requisite--${auftritt}`;
    buehne.appendChild(requisite);
  }

  const schleier = document.createElement('div');
  schleier.className = `kampf-intro${boss ? ' kampf-intro--boss' : ''}`;
  schleier.innerHTML = boss
    ? `<span class="kampf-intro__krone">👑</span>
       <div class="kampf-intro__banner kampf-intro__banner--boss">
         <span class="kampf-intro__oben">BOSSKAMPF</span>
         <span class="kampf-intro__name">${gegner.name}</span>
       </div>
       <span class="kampf-intro__tipp">Tippen zum Überspringen</span>`
    : `<div class="kampf-intro__banner">
         <span class="kampf-intro__oben">Ein wildes Monster!</span>
         <span class="kampf-intro__name">${gegner.name}</span>
       </div>`;
  screen.appendChild(schleier);
  if (boss) kamera?.classList.add('kamera-intro-zoom');

  function auftreten() {
    sprite.classList.remove('ist-silhouette');
    sprite.classList.add(`auftritt--${auftritt}`);
    requisite?.classList.add('ist-weg');
    if (boss) buehne.classList.add('ist-gelandet');
  }

  function abschluss() {
    timer.forEach(clearTimeout);
    timer.length = 0;
    sprite.classList.remove('ist-silhouette', `auftritt--${auftritt}`);
    buehne.classList.remove('ist-gelandet');
    kamera?.classList.remove('kamera-intro-zoom');
    requisite?.remove();
    schleier.remove();
  }

  function beenden() {
    if (erledigt) return;
    erledigt = true;
    abschluss();
    fertig();
  }

  const plan = boss
    ? [
        [900, auftreten],
        [1400, () => schleier.classList.add('zeige-banner')],
        [2100, () => kamera?.classList.remove('kamera-intro-zoom')],
        [DAUER_BOSS, beenden],
      ]
    : [
        [180, () => schleier.classList.add('zeige-banner')],
        [620, auftreten],
        [DAUER_NORMAL, beenden],
      ];
  plan.forEach(([zeit, schritt]) => timer.push(setTimeout(schritt, zeit)));

  schleier.addEventListener('click', beenden);

  return () => {
    if (erledigt) return;
    erledigt = true;
    abschluss();
  };
}
