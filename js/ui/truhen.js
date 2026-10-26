/**
 * Die gezeichneten Truhen - eigene SVG-Grafiken statt Emojis.
 *
 * Jede Truhe besteht aus Körper, Deckel, Metallbändern mit Nieten,
 * Eckbeschlägen, Füßen und einem Schloss. Wertvolle Truhen haben einen
 * geschliffenen Stein, ein Wappen auf dem Deckel und einen Schimmer (.truhe__aura).
 * Der Deckel ist eine eigene Gruppe (.truhe__deckel): Beim Öffnen klappt er
 * per CSS nach oben, und aus dem Inneren strahlt Licht (.truhe__licht).
 * Gestaltet wird die Bewegung in css/erlebnis.css (Abschnitt 7).
 *
 * Die Zeichenfläche hat oben 26 Einheiten Luft (viewBox beginnt bei -26):
 * Dort hinein klappt der Deckel. Ohne diesen Platz schneidet Safari den
 * offenen Deckel am Bildrand ab.
 *
 * Neue Truhe = einen Eintrag in DESIGNS ergänzen und in js/data/shop.js
 * als "design" eintragen.
 */

/**
 * Farben je Truhe.
 *   holz/holzDunkel - Körper und Deckel (Verlauf von oben nach unten)
 *   band/bandDunkel - Metallbänder, Ecken, Füße und Schloss
 *   stein           - geschliffener Edelstein im Schloss (null = Schlüsselloch)
 *   licht           - Farbe des Scheins beim Öffnen
 *   aura            - Schimmer hinter der Truhe (null = keiner)
 *   funkeln         - Farbe der funkelnden Sterne (null = keine)
 *   bretter         - Holzmaserung und Bretterfugen zeichnen
 *   krone           - Krone auf dem Deckel (Bosstruhe)
 */
const DESIGNS = {
  holz: {
    holz: '#d9934f', holzDunkel: '#74401c', band: '#c9d1de', bandDunkel: '#56607a',
    stein: null, licht: '#ffe9a8', aura: null, funkeln: null, bretter: true, krone: false,
  },
  silber: {
    holz: '#6f93d6', holzDunkel: '#1f2f63', band: '#f2f6fc', bandDunkel: '#7d8cab',
    stein: '#5ee0ff', licht: '#bfe9ff', aura: '#5ecbff', funkeln: '#d8f6ff', bretter: false, krone: false,
  },
  gold: {
    holz: '#e24a4f', holzDunkel: '#741126', band: '#ffe68a', bandDunkel: '#c06f0e',
    stein: '#ff2d6a', licht: '#fff2b0', aura: '#ffc53d', funkeln: '#fff6c9', bretter: false, krone: false,
  },
  boss: {
    holz: '#8d55d6', holzDunkel: '#2d1350', band: '#ffd25a', bandDunkel: '#a8721a',
    stein: '#e08dff', licht: '#ffd6ff', aura: '#c77dff', funkeln: '#fff6c9', bretter: false, krone: true,
  },
};

/** Welche Truhen es gibt (für Tests). */
export const TRUHEN_DESIGNS = Object.keys(DESIGNS);

const KONTUR = '#24160c';

/** Ein Niet: dunkler Punkt mit hellem Glanz. */
const niet = (x, y, r = 1.8) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${KONTUR}" /><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.45}" fill="#ffffff" opacity="0.7" />`;

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
  const band = `url(#${id('band')})`;

  // Holz: Bretterfugen, Maserung und ein Astloch. Metall: eine eingravierte
  // Zierlinie und ein Glanzstreifen.
  const maserung = d.bretter
    ? `<path d="M10 61 H110 M10 76 H110" stroke="${KONTUR}" stroke-width="1.6" opacity="0.45" />
       <path d="M14 55 Q30 53 44 56 M76 68 Q92 66 106 69 M14 82 Q26 80 40 83" stroke="${d.holzDunkel}" stroke-width="1.4" fill="none" opacity="0.6" />
       <ellipse cx="80" cy="56" rx="3" ry="1.6" fill="none" stroke="${d.holzDunkel}" stroke-width="1.2" opacity="0.7" />`
    : `<rect x="14" y="52" width="92" height="28" rx="4" fill="none" stroke="#ffffff" stroke-width="1.4" opacity="0.28" />
       <rect x="15.5" y="53.5" width="89" height="25" rx="3" fill="none" stroke="${KONTUR}" stroke-width="1" opacity="0.3" />`;
  const deckelMaserung = d.bretter
    ? `<path d="M10 33 H110" stroke="${KONTUR}" stroke-width="1.6" opacity="0.4" />
       <path d="M16 26 Q40 21 58 24 M66 38 Q84 36 104 39" stroke="${d.holzDunkel}" stroke-width="1.4" fill="none" opacity="0.6" />`
    : '';

  // Schloss: ein Schild aus Metall - mit geschliffenem Stein oder Schlüsselloch.
  const schloss = d.stein
    ? `<path d="M55 50 H65 L69 56 L60 66 L51 56 Z" fill="url(#${id('stein')})" stroke="${KONTUR}" stroke-width="2" stroke-linejoin="round" />
       <path d="M51 56 H69 M55 50 L58 56 L60 66 M65 50 L62 56 L60 66" stroke="#ffffff" stroke-width="0.9" fill="none" opacity="0.5" />
       <path d="M55.5 51 L58 55 L53.5 55 Z" fill="#ffffff" opacity="0.85" />`
    : `<circle cx="60" cy="54" r="3.6" fill="${KONTUR}" />
       <path d="M58 55 H62 L63 63 H57 Z" fill="${KONTUR}" />`;

  // Wappen in der Mitte des Deckels (nur die wertvollen Truhen).
  const wappen = d.stein && !d.krone
    ? `<path d="M60 17 L66 24 L60 31 L54 24 Z" fill="${band}" stroke="${KONTUR}" stroke-width="2" stroke-linejoin="round" />
       <path d="M60 20.5 L63 24 L60 27.5 L57 24 Z" fill="${d.stein}" />`
    : '';

  const krone = d.krone
    ? `<path d="M44 22 L48 9 L54 17 L60 4 L66 17 L72 9 L76 22 Z" fill="${band}" stroke="${KONTUR}" stroke-width="2" stroke-linejoin="round" />
       ${niet(52, 19, 1.4)}${niet(68, 19, 1.4)}
       <circle cx="60" cy="5" r="2.6" fill="${d.stein}" stroke="${KONTUR}" stroke-width="1.2" />`
    : '';

  const aura = d.aura
    ? `<ellipse class="truhe__aura" cx="60" cy="58" rx="58" ry="44" fill="url(#${id('aura')})" />`
    : '';

  const funkeln = d.funkeln
    ? `<path class="truhe__funkeln" d="M104 8 L106 14 L112 16 L106 18 L104 24 L102 18 L96 16 L102 14 Z" fill="${d.funkeln}" />
       <path class="truhe__funkeln truhe__funkeln--2" d="M14 34 L15.5 38 L19.5 39.5 L15.5 41 L14 45 L12.5 41 L8.5 39.5 L12.5 38 Z" fill="${d.funkeln}" />
       <path class="truhe__funkeln truhe__funkeln--3" d="M100 74 L101 77 L104 78 L101 79 L100 82 L99 79 L96 78 L99 77 Z" fill="${d.funkeln}" />`
    : '';

  return `
    <svg class="truhe truhe--${design}${offen ? ' ist-offen' : ''}${className ? ` ${className}` : ''}"
         viewBox="0 -26 120 130" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="${id('holz')}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${d.holz}" />
          <stop offset="1" stop-color="${d.holzDunkel}" />
        </linearGradient>
        <linearGradient id="${id('band')}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${d.band}" />
          <stop offset="0.5" stop-color="${d.band}" />
          <stop offset="1" stop-color="${d.bandDunkel}" />
        </linearGradient>
        <radialGradient id="${id('stein')}" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.3" stop-color="${d.stein ?? '#ffffff'}" />
          <stop offset="1" stop-color="${KONTUR}" />
        </radialGradient>
        <radialGradient id="${id('licht')}" cx="0.5" cy="1" r="0.9">
          <stop offset="0" stop-color="${d.licht}" stop-opacity="0.95" />
          <stop offset="1" stop-color="${d.licht}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="${id('aura')}">
          <stop offset="0" stop-color="${d.aura ?? '#ffffff'}" stop-opacity="0.55" />
          <stop offset="1" stop-color="${d.aura ?? '#ffffff'}" stop-opacity="0" />
        </radialGradient>
        <!-- Glanzlicht von links oben über Körper und Deckel -->
        <linearGradient id="${id('glanz')}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.32" />
          <stop offset="0.35" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="0.8" stop-color="#000000" stop-opacity="0" />
          <stop offset="1" stop-color="#000000" stop-opacity="0.22" />
        </linearGradient>
      </defs>

      ${aura}

      <!-- Schatten am Boden -->
      <ellipse cx="60" cy="98" rx="52" ry="6" fill="#000000" opacity="0.32" />

      <!-- Licht aus dem Inneren - nur sichtbar, wenn die Truhe offen ist -->
      <path class="truhe__licht" d="M16 46 L-6 -8 L126 -8 L104 46 Z" fill="url(#${id('licht')})" />

      <!-- Deckel: klappt beim Öffnen auf -->
      <g class="truhe__deckel">
        <path d="M10 48 V32 Q10 12 60 12 Q110 12 110 32 V48 Z" fill="url(#${id('holz')})" stroke="${KONTUR}" stroke-width="3" stroke-linejoin="round" />
        ${deckelMaserung}
        <path d="M10 48 V32 Q10 12 60 12 Q110 12 110 32 V48 Z" fill="url(#${id('glanz')})" />
        <path d="M20 22 Q60 11 100 22" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.4" stroke-linecap="round" />
        <path d="M22 48 V19 Q28 16 34 15 V48 Z" fill="${band}" stroke="${KONTUR}" stroke-width="2" stroke-linejoin="round" />
        <path d="M86 48 V15 Q92 16 98 19 V48 Z" fill="${band}" stroke="${KONTUR}" stroke-width="2" stroke-linejoin="round" />
        <path d="M24.5 44 V21 M88.5 44 V18" stroke="#ffffff" stroke-width="1.4" opacity="0.55" stroke-linecap="round" />
        ${niet(28, 24)}${niet(92, 24)}
        <rect x="7" y="41" width="106" height="10" rx="3.5" fill="${band}" stroke="${KONTUR}" stroke-width="2" />
        <path d="M11 43.5 H109" stroke="#ffffff" stroke-width="1.2" opacity="0.5" stroke-linecap="round" />
        ${niet(14, 46)}${niet(46, 46)}${niet(74, 46)}${niet(106, 46)}
        ${wappen}
        ${krone}
      </g>
      <!-- Körper - nach dem Deckel gezeichnet, damit das Schloss über
           dessen Rand hängt -->
      <g class="truhe__koerper">
        <!-- Das Innere mit Schätzen - erst bei offener Truhe zu sehen -->
        <g class="truhe__innen">
          <path d="M13 48 Q60 32 107 48 Z" fill="#160b05" stroke="${KONTUR}" stroke-width="2" stroke-linejoin="round" />
          <circle cx="40" cy="44" r="5" fill="#ffd34d" stroke="#a8721a" stroke-width="1.5" />
          <circle cx="50" cy="40" r="5" fill="#ffe27a" stroke="#a8721a" stroke-width="1.5" />
          <circle cx="80" cy="44" r="5" fill="#ffd34d" stroke="#a8721a" stroke-width="1.5" />
          <circle cx="72" cy="39" r="4.5" fill="#ffe27a" stroke="#a8721a" stroke-width="1.5" />
          <path d="M58 43 L62 35 L66 43 L62 47 Z" fill="${d.stein ?? '#7ee0ff'}" stroke="${KONTUR}" stroke-width="1.2" />
        </g>
        <!-- Füße -->
        <rect x="13" y="89" width="14" height="8" rx="2.5" fill="${band}" stroke="${KONTUR}" stroke-width="2" />
        <rect x="93" y="89" width="14" height="8" rx="2.5" fill="${band}" stroke="${KONTUR}" stroke-width="2" />
        <rect x="10" y="46" width="100" height="46" rx="6" fill="url(#${id('holz')})" stroke="${KONTUR}" stroke-width="3" />
        ${maserung}
        <rect x="10" y="46" width="100" height="46" rx="6" fill="url(#${id('glanz')})" />
        <!-- Bänder mit Nieten -->
        <rect x="22" y="46" width="12" height="46" fill="${band}" stroke="${KONTUR}" stroke-width="2" />
        <rect x="86" y="46" width="12" height="46" fill="${band}" stroke="${KONTUR}" stroke-width="2" />
        <path d="M24.5 50 V80 M88.5 50 V80" stroke="#ffffff" stroke-width="1.4" opacity="0.55" stroke-linecap="round" />
        ${niet(28, 58)}${niet(28, 72)}${niet(92, 58)}${niet(92, 72)}
        <!-- Eckbeschläge oben -->
        <path d="M7 50 Q7 46 11 46 H18 V52 H13 V58 H7 Z" fill="${band}" stroke="${KONTUR}" stroke-width="2" stroke-linejoin="round" />
        <path d="M113 50 Q113 46 109 46 H102 V52 H107 V58 H113 Z" fill="${band}" stroke="${KONTUR}" stroke-width="2" stroke-linejoin="round" />
        <!-- Unteres Band -->
        <rect x="7" y="83" width="106" height="10" rx="3.5" fill="${band}" stroke="${KONTUR}" stroke-width="2" />
        <path d="M11 85.5 H109" stroke="#ffffff" stroke-width="1.2" opacity="0.5" stroke-linecap="round" />
        ${niet(14, 88)}${niet(46, 88)}${niet(74, 88)}${niet(106, 88)}
        <!-- Schloss -->
        <path d="M47 42 H73 V60 Q73 68 60 74 Q47 68 47 60 Z" fill="${band}" stroke="${KONTUR}" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M50 45 H70 V59.5 Q70 65.5 60 70.5 Q50 65.5 50 59.5 Z" fill="none" stroke="${KONTUR}" stroke-width="1" opacity="0.35" />
        <path d="M50 46 V58" stroke="#ffffff" stroke-width="1.4" opacity="0.55" stroke-linecap="round" />
        ${schloss}
      </g>

      ${funkeln}
    </svg>
  `;
}
