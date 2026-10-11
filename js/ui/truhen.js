/**
 * Die gezeichneten Truhen - eigene SVG-Grafiken statt Emojis.
 *
 * Jede Truhe besteht aus Körper, Deckel, Metallbändern und einem Schloss.
 * Der Deckel ist eine eigene Gruppe (.truhe__deckel): Beim Öffnen klappt er
 * per CSS nach oben, und aus dem Inneren strahlt Licht (.truhe__licht).
 * Gestaltet wird die Bewegung in css/erlebnis.css (Abschnitt 7).
 *
 * Neue Truhe = einen Eintrag in DESIGNS ergänzen und in js/data/shop.js
 * als "design" eintragen.
 */

/**
 * Farben je Truhe.
 *   holz/holzDunkel - Körper und Deckel (Verlauf von oben nach unten)
 *   band/bandDunkel - Metallbänder und Rand
 *   stein           - Edelstein im Schloss (null = schlichtes Schlüsselloch)
 *   licht           - Farbe des Scheins beim Öffnen
 *   bretter         - Holzmaserung zeichnen
 *   krone           - Krone auf dem Deckel (Bosstruhe)
 */
const DESIGNS = {
  holz: {
    holz: '#c47f45', holzDunkel: '#7a4321', band: '#9aa4b6', bandDunkel: '#5d6678',
    stein: null, licht: '#ffe9a8', bretter: true, krone: false,
  },
  silber: {
    holz: '#eef3fa', holzDunkel: '#8e9db5', band: '#5b86d6', bandDunkel: '#2f4f95',
    stein: '#59c8ff', licht: '#bfe9ff', bretter: false, krone: false,
  },
  gold: {
    holz: '#ffe27a', holzDunkel: '#d08a14', band: '#b5452f', bandDunkel: '#6e2216',
    stein: '#ff3d6a', licht: '#fff2b0', bretter: false, krone: false,
  },
  boss: {
    holz: '#7d4ac2', holzDunkel: '#2d1350', band: '#ffc53d', bandDunkel: '#a8721a',
    stein: '#d77dff', licht: '#ffd6ff', bretter: false, krone: true,
  },
};

/** Welche Truhen es gibt (für Tests). */
export const TRUHEN_DESIGNS = Object.keys(DESIGNS);

const KONTUR = '#24160c';

/**
 * Baut das SVG einer Truhe.
 *
 * @param {string} design - 'holz' | 'silber' | 'gold' | 'boss'
 * @param {object} [optionen]
 * @param {boolean} [optionen.offen] - gleich geöffnet zeigen (ohne Animation)
 * @param {string} [optionen.className] - zusätzliche Klassen
 * @returns {string} SVG als Text
 */
export function truheSvg(design, { offen = false, className = '' } = {}) {
  const d = DESIGNS[design] ?? DESIGNS.holz;
  // Ids mit dem Namen der Truhe: Mehrere gleiche Truhen auf einer Seite
  // teilen sich dieselben (identischen) Verläufe - das ist unbedenklich.
  const id = (name) => `truhe-${design}-${name}`;

  const maserung = d.bretter
    ? `<path d="M14 62 H106 M14 76 H106" stroke="${d.holzDunkel}" stroke-width="2" opacity="0.55" />
       <path d="M18 30 Q60 22 102 30" stroke="${d.holzDunkel}" stroke-width="2" fill="none" opacity="0.5" />`
    : `<path d="M16 50 H104" stroke="#ffffff" stroke-width="2" opacity="0.35" />`;

  const schloss = d.stein
    ? `<circle cx="60" cy="55" r="6.5" fill="url(#${id('stein')})" stroke="${KONTUR}" stroke-width="2" />
       <circle cx="58" cy="53" r="2" fill="#ffffff" opacity="0.85" />`
    : `<circle cx="60" cy="53" r="3" fill="${KONTUR}" />
       <path d="M58.5 54 L61.5 54 L62 60 L58 60 Z" fill="${KONTUR}" />`;

  const krone = d.krone
    ? `<path d="M46 26 L50 16 L55 23 L60 12 L65 23 L70 16 L74 26 Z" fill="url(#${id('band')})" stroke="${KONTUR}" stroke-width="2" stroke-linejoin="round" />
       <circle cx="60" cy="12" r="2.4" fill="${d.stein}" stroke="${KONTUR}" stroke-width="1.2" />`
    : '';

  const funkeln = design === 'gold' || design === 'boss'
    ? `<path class="truhe__funkeln" d="M100 10 L102 16 L108 18 L102 20 L100 26 L98 20 L92 18 L98 16 Z" fill="#fff6c9" />
       <path class="truhe__funkeln truhe__funkeln--2" d="M18 34 L19.5 38 L23 39.5 L19.5 41 L18 45 L16.5 41 L13 39.5 L16.5 38 Z" fill="#fff6c9" />`
    : '';

  return `
    <svg class="truhe truhe--${design}${offen ? ' ist-offen' : ''}${className ? ` ${className}` : ''}"
         viewBox="0 0 120 104" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="${id('holz')}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${d.holz}" />
          <stop offset="1" stop-color="${d.holzDunkel}" />
        </linearGradient>
        <linearGradient id="${id('band')}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${d.band}" />
          <stop offset="1" stop-color="${d.bandDunkel}" />
        </linearGradient>
        <radialGradient id="${id('stein')}" cx="0.35" cy="0.35" r="0.75">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.35" stop-color="${d.stein ?? '#ffffff'}" />
          <stop offset="1" stop-color="${KONTUR}" />
        </radialGradient>
        <radialGradient id="${id('licht')}" cx="0.5" cy="1" r="0.9">
          <stop offset="0" stop-color="${d.licht}" stop-opacity="0.95" />
          <stop offset="1" stop-color="${d.licht}" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Schatten am Boden -->
      <ellipse cx="60" cy="97" rx="48" ry="6" fill="#000000" opacity="0.28" />

      <!-- Licht aus dem Inneren - nur sichtbar, wenn die Truhe offen ist -->
      <path class="truhe__licht" d="M18 46 L-4 -6 L124 -6 L102 46 Z" fill="url(#${id('licht')})" />

      <!-- Deckel: klappt beim Öffnen auf -->
      <g class="truhe__deckel">
        <path d="M12 48 V34 Q12 14 60 14 Q108 14 108 34 V48 Z" fill="url(#${id('holz')})" stroke="${KONTUR}" stroke-width="3" stroke-linejoin="round" />
        <path d="M20 26 Q60 16 100 26" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.35" stroke-linecap="round" />
        <path d="M24 48 V20 Q29 17 35 16 V48 Z" fill="url(#${id('band')})" stroke="${KONTUR}" stroke-width="2" />
        <path d="M85 48 V16 Q91 17 96 20 V48 Z" fill="url(#${id('band')})" stroke="${KONTUR}" stroke-width="2" />
        <rect x="10" y="42" width="100" height="8" rx="3" fill="url(#${id('band')})" stroke="${KONTUR}" stroke-width="2" />
        ${krone}
      </g>
      <!-- Körper - nach dem Deckel gezeichnet, damit das Schloss über
           dessen Rand hängt -->
      <g class="truhe__koerper">
        <!-- Das Innere mit Schätzen - erst bei offener Truhe zu sehen -->
        <g class="truhe__innen">
          <path d="M15 48 Q60 34 105 48 Z" fill="#160b05" stroke="${KONTUR}" stroke-width="2" stroke-linejoin="round" />
          <circle cx="44" cy="44" r="5" fill="#ffd34d" stroke="#a8721a" stroke-width="1.5" />
          <circle cx="54" cy="41" r="5" fill="#ffe27a" stroke="#a8721a" stroke-width="1.5" />
          <circle cx="76" cy="44" r="5" fill="#ffd34d" stroke="#a8721a" stroke-width="1.5" />
          <path d="M64 44 L68 37 L72 44 L68 48 Z" fill="${d.stein ?? '#7ee0ff'}" stroke="${KONTUR}" stroke-width="1.2" />
        </g>
        <rect x="12" y="46" width="96" height="46" rx="7" fill="url(#${id('holz')})" stroke="${KONTUR}" stroke-width="3" />
        ${maserung}
        <rect x="24" y="46" width="11" height="46" fill="url(#${id('band')})" stroke="${KONTUR}" stroke-width="2" />
        <rect x="85" y="46" width="11" height="46" fill="url(#${id('band')})" stroke="${KONTUR}" stroke-width="2" />
        <rect x="12" y="84" width="96" height="8" rx="3" fill="url(#${id('band')})" stroke="${KONTUR}" stroke-width="2" />
        <circle cx="29.5" cy="56" r="1.6" fill="${KONTUR}" /><circle cx="29.5" cy="76" r="1.6" fill="${KONTUR}" />
        <circle cx="90.5" cy="56" r="1.6" fill="${KONTUR}" /><circle cx="90.5" cy="76" r="1.6" fill="${KONTUR}" />
        <!-- Schloss -->
        <path d="M50 44 H70 V64 Q60 72 50 64 Z" fill="url(#${id('band')})" stroke="${KONTUR}" stroke-width="2.5" stroke-linejoin="round" />
        ${schloss}
      </g>

      ${funkeln}
    </svg>
  `;
}
