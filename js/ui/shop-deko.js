/**
 * Die Ausstattung des Shops - alles gezeichnet, keine Bilddateien.
 *
 *   shopKulisse()  Nachtmarkt: Sternenhimmel, Mond, Burg mit Lichtern,
 *                  links ein Trankstand mit Laterne, rechts ein Stand mit
 *                  Banner und leuchtenden Kristallen, dazu Glühwürmchen
 *   shopTitel()    das Schild "Shop" mit Lorbeer
 *   zierEcken()    goldene Eckverzierungen für die Rahmen
 *   sockelSvg()    der Steinsockel mit Gras, auf dem eine Truhe steht
 *   REITER_ICONS   die Bildchen in den Reitern
 *
 * Gestaltet und bewegt wird das alles in css/shop.css.
 */

import { truheSvg } from './truhen.js';

/** Sterne am Himmel: [x, y, Größe] - fest, damit nichts springt. */
const STERNE = [
  [22, 40, 1.2], [58, 18, 0.9], [96, 62, 1.4], [134, 26, 1], [170, 54, 0.8], [204, 14, 1.3],
  [238, 44, 0.9], [262, 92, 1.1], [352, 30, 1.2], [372, 78, 0.8], [318, 120, 1], [40, 104, 0.9],
  [120, 110, 0.8], [190, 96, 1.1], [80, 150, 0.7], [300, 168, 0.8], [350, 196, 1], [20, 190, 0.8],
];

/** Fenster der Burg, in denen Licht brennt: [x, y]. */
const BURGFENSTER = [
  [168, 222], [181, 204], [196, 186], [196, 214], [211, 204], [224, 222], [150, 248],
  [242, 248], [188, 244], [204, 244],
];

/** Glühwürmchen: [links %, oben %, Verzögerung s]. */
const GLUEHWUERMCHEN = [
  [8, 34, 0], [22, 62, 2.4], [88, 30, 1.2], [76, 58, 3.4], [50, 46, 4.6], [94, 76, 0.8], [4, 84, 2.9], [64, 88, 5.2],
];

/** Der Nachtmarkt hinter dem Shop. */
export function shopKulisse() {
  const kulisse = document.createElement('div');
  kulisse.className = 'scenery shop-kulisse';
  kulisse.setAttribute('aria-hidden', 'true');

  const sterne = STERNE.map(([x, y, r], i) =>
    `<circle class="shop-kulisse__stern" cx="${x}" cy="${y}" r="${r}" style="animation-delay:${(i * 0.37) % 3}s" />`).join('');
  const fenster = BURGFENSTER.map(([x, y]) =>
    `<rect x="${x}" y="${y}" width="4" height="6" rx="2" />`).join('');

  kulisse.innerHTML = `
    <svg class="shop-kulisse__himmel" viewBox="0 0 390 520" preserveAspectRatio="xMidYMin slice">
      <defs>
        <linearGradient id="shop-himmel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#090f2e" />
          <stop offset="0.42" stop-color="#1a2660" />
          <stop offset="0.62" stop-color="#3a3374" />
          <stop offset="1" stop-color="#0b1030" />
        </linearGradient>
        <radialGradient id="shop-mond">
          <stop offset="0" stop-color="#fff4cf" stop-opacity="0.55" />
          <stop offset="1" stop-color="#fff4cf" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="shop-stadtlicht" cx="0.5" cy="1" r="0.7">
          <stop offset="0" stop-color="#ffb35a" stop-opacity="0.38" />
          <stop offset="1" stop-color="#ffb35a" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="390" height="520" fill="url(#shop-himmel)" />
      <g fill="#fff6dc">${sterne}</g>
      <circle cx="318" cy="70" r="60" fill="url(#shop-mond)" />
      <circle cx="318" cy="70" r="19" fill="#fff1c4" />
      <circle cx="311" cy="64" r="4" fill="#efdca2" opacity="0.7" />
      <circle cx="324" cy="78" r="2.6" fill="#efdca2" opacity="0.7" />
      <g transform="translate(0 -60)">
      <!-- ferne Berge -->
      <path d="M0 250 L48 206 L92 236 L140 190 L196 230 L250 186 L300 228 L344 198 L390 232 V320 H0 Z" fill="#202a64" />
      <!-- Lichtschein der Stadt -->
      <ellipse cx="196" cy="280" rx="190" ry="90" fill="url(#shop-stadtlicht)" />
      <!-- Burg -->
      <g fill="#151b48">
        <path d="M140 270 V236 H152 V226 L158 214 L164 226 V236 H176 V214 H172 L184 186 L196 160 L208 186 L220 214 H216 V236 H228 V226 L234 214 L240 226 V236 H252 V270 Z" />
        <rect x="176" y="196" width="40" height="40" />
        <path d="M190 160 V140 L196 128 L202 140 V160 Z" />
      </g>
      <path d="M196 128 V116 L206 120 L196 124" fill="#e04b55" />
      <g class="shop-kulisse__fenster" fill="#ffcf6b">${fenster}</g>
      <!-- Häuser vor der Burg -->
      <path d="M0 300 V278 L18 264 L36 278 V270 L54 256 L72 270 V284 L96 268 L118 284 V276 L140 262 L160 276 V290 H232 V274 L254 260 L276 274 V282 L298 266 L320 282 V272 L340 258 L362 272 V266 L390 250 V300 Z" fill="#11163c" />
      <g fill="#ffbf5e" opacity="0.9">
        <rect x="14" y="282" width="4" height="5" rx="1" /><rect x="58" y="274" width="4" height="5" rx="1" />
        <rect x="102" y="284" width="4" height="5" rx="1" /><rect x="142" y="280" width="4" height="5" rx="1" />
        <rect x="258" y="278" width="4" height="5" rx="1" /><rect x="304" y="284" width="4" height="5" rx="1" />
        <rect x="344" y="276" width="4" height="5" rx="1" /><rect x="372" y="270" width="4" height="5" rx="1" />
      </g>
      </g>
      <!-- Pflaster, das ins Dunkel ausläuft -->
      <rect y="238" width="390" height="282" fill="#0d1234" />
    </svg>

    <svg class="shop-kulisse__stand shop-kulisse__stand--links" viewBox="0 0 150 180">
      <defs>
        <radialGradient id="shop-laterne">
          <stop offset="0" stop-color="#ffd46b" stop-opacity="0.85" />
          <stop offset="1" stop-color="#ff9a2e" stop-opacity="0" />
        </radialGradient>
      </defs>
      <!-- Pfosten und Theke -->
      <rect x="6" y="40" width="9" height="140" fill="#4a2c16" />
      <rect x="122" y="54" width="8" height="126" fill="#4a2c16" />
      <rect x="0" y="122" width="140" height="12" rx="2" fill="#6b4122" />
      <rect x="0" y="132" width="140" height="48" fill="#3c2414" />
      <path d="M0 146 H140 M0 162 H140" stroke="#2a180c" stroke-width="2" />
      <!-- Tränke auf der Theke -->
      <g class="shop-kulisse__traenke">
        <path d="M30 122 V112 Q24 108 26 100 Q28 94 34 94 Q40 94 42 100 Q44 108 38 112 V122 Z" fill="#ff5f8a" />
        <rect x="31" y="88" width="6" height="7" rx="1" fill="#c9a27a" />
        <path d="M54 122 V104 Q50 102 50 96 H62 Q62 102 58 104 V122 Z" fill="#6be0ff" />
        <rect x="53" y="90" width="6" height="6" rx="1" fill="#c9a27a" />
        <circle cx="80" cy="113" r="9" fill="#9b6bff" />
        <rect x="77" y="100" width="6" height="6" rx="1" fill="#c9a27a" />
        <path d="M100 122 V108 L96 100 H108 L104 108 V122 Z" fill="#7ee06a" />
        <path d="M27 104 Q30 98 34 98 M51 100 H55 M74 110 Q76 106 80 106" stroke="#ffffff" stroke-width="1.6" fill="none" opacity="0.6" />
      </g>
      <!-- Markise, rot-weiß gestreift, mit Bogenrand -->
      <path d="M-6 20 L146 44 L146 62 Q137 72 128 62 Q119 72 110 60 Q101 70 92 58 Q83 68 74 56 Q65 66 56 54 Q47 64 38 52 Q29 62 20 50 Q11 60 2 48 Q-4 52 -6 50 Z" fill="#b8323a" />
      <path d="M14 22 L6 52 M40 26 L34 56 M66 30 L60 58 M92 34 L88 60 M118 38 L116 64" stroke="#f3dcb0" stroke-width="10" opacity="0.85" />
      <path d="M-6 20 L146 44" stroke="#7a1a22" stroke-width="4" />
      <!-- Laterne -->
      <circle class="shop-kulisse__laternenschein" cx="34" cy="88" r="36" fill="url(#shop-laterne)" />
      <path d="M34 58 V70" stroke="#2a180c" stroke-width="2" />
      <path d="M26 72 H42 L40 76 V96 L42 100 H26 L28 96 V76 Z" fill="#3a2614" />
      <rect class="shop-kulisse__flamme" x="29" y="77" width="10" height="18" rx="3" fill="#ffd46b" />
    </svg>

    <svg class="shop-kulisse__stand shop-kulisse__stand--rechts" viewBox="0 0 150 180">
      <defs>
        <radialGradient id="shop-kristall">
          <stop offset="0" stop-color="#7fe6ff" stop-opacity="0.8" />
          <stop offset="1" stop-color="#3aa0ff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect x="135" y="40" width="9" height="140" fill="#4a2c16" />
      <rect x="20" y="54" width="8" height="126" fill="#4a2c16" />
      <rect x="10" y="122" width="150" height="12" rx="2" fill="#6b4122" />
      <rect x="10" y="132" width="150" height="48" fill="#3c2414" />
      <path d="M10 146 H150 M10 162 H150" stroke="#2a180c" stroke-width="2" />
      <!-- Kristalle -->
      <circle class="shop-kulisse__kristallschein" cx="96" cy="104" r="42" fill="url(#shop-kristall)" />
      <g class="shop-kulisse__kristalle">
        <path d="M80 122 L84 96 L92 88 L96 100 L92 122 Z" fill="#6fd8ff" />
        <path d="M92 122 L96 82 L104 72 L110 86 L106 122 Z" fill="#9fe9ff" />
        <path d="M106 122 L110 100 L118 94 L120 108 L116 122 Z" fill="#4fb8ff" />
        <path d="M96 82 L104 72 L104 122 H96 Z" fill="#ffffff" opacity="0.35" />
      </g>
      <!-- Markise, blau-gold -->
      <path d="M156 20 L4 44 L4 62 Q13 72 22 62 Q31 72 40 60 Q49 70 58 58 Q67 68 76 56 Q85 66 94 54 Q103 64 112 52 Q121 62 130 50 Q139 60 148 48 Q154 52 156 50 Z" fill="#2c3a8f" />
      <path d="M136 22 L144 52 M110 26 L116 56 M84 30 L90 58 M58 34 L62 60 M32 38 L34 64" stroke="#e7b84a" stroke-width="8" opacity="0.8" />
      <path d="M156 20 L4 44" stroke="#151d52" stroke-width="4" />
      <!-- Banner mit Wappen -->
      <g class="shop-kulisse__banner">
        <path d="M40 60 H70 V112 L55 102 L40 112 Z" fill="#8f1d2c" stroke="#e7b84a" stroke-width="2" />
        <path d="M48 72 L52 82 L55 74 L58 82 L62 72 L62 88 H48 Z" fill="#e7b84a" />
      </g>
    </svg>

    ${GLUEHWUERMCHEN.map(([x, y, t]) =>
      `<span class="shop-kulisse__gluehwurm" style="left:${x}%;top:${y}%;animation-delay:${t}s"></span>`).join('')}
  `;
  return kulisse;
}

/** Ein Lorbeerzweig, nach links gebogen (rechts wird er gespiegelt). */
const LORBEER = `
  <svg class="shop-titel__lorbeer" viewBox="0 0 24 34" aria-hidden="true">
    <path d="M20 32 Q6 24 8 4" stroke="#e7b84a" stroke-width="1.8" fill="none" stroke-linecap="round" />
    <g fill="#ffd25a" stroke="#8a5a10" stroke-width="0.8">
      <path d="M8.5 6 Q3 6 2 1 Q7 1 8.5 6 Z" /><path d="M8 12 Q2 13 0 8 Q6 7 8 12 Z" />
      <path d="M9 18 Q3 20 1 15 Q7 14 9 18 Z" /><path d="M12 24 Q6 27 3 22 Q9 20 12 24 Z" />
      <path d="M9 9 Q14 6 14 2 Q9 3 9 9 Z" /><path d="M10 16 Q15 13 16 9 Q11 10 10 16 Z" />
      <path d="M13 22 Q18 20 19 15 Q14 16 13 22 Z" />
    </g>
  </svg>`;

/** Das Schild über dem Shop. */
export function shopTitel(text) {
  return `<span class="shop-titel">${LORBEER}<span class="shop-titel__text">${text}</span>${LORBEER}</span>`;
}

/** Vier goldene Eckverzierungen - als letzte Kinder in einen Rahmen setzen. */
const ECKE = `<svg viewBox="0 0 22 22" aria-hidden="true">
  <path d="M2 20 V8 Q2 2 8 2 H20" stroke="#ffd25a" stroke-width="2.4" fill="none" stroke-linecap="round" />
  <path d="M6 18 V10 Q6 6 10 6 H18" stroke="#a8721a" stroke-width="1.4" fill="none" stroke-linecap="round" />
  <path d="M2 8 L5 5 L8 8 L5 11 Z" fill="#ffe68a" stroke="#8a5a10" stroke-width="0.8" />
</svg>`;

export function zierEcken() {
  return ['lo', 'ro', 'lu', 'ru'].map((ecke) =>
    `<span class="zier-ecke zier-ecke--${ecke}" aria-hidden="true">${ECKE}</span>`).join('');
}

/** Steinsockel mit Grasbüscheln, auf dem eine Truhe im Shop steht. */
export function sockelSvg() {
  return `
    <svg class="sockel" viewBox="0 0 120 40" aria-hidden="true">
      <ellipse class="sockel__schein" cx="60" cy="14" rx="58" ry="14" />
      <path d="M8 16 L18 8 H102 L112 16 L104 30 H16 Z" fill="#3a4266" stroke="#1a1e36" stroke-width="2" stroke-linejoin="round" />
      <path d="M8 16 L18 8 H102 L112 16 L102 22 H18 Z" fill="#6b7398" />
      <path d="M18 8 H102" stroke="#9aa3c6" stroke-width="2" stroke-linecap="round" />
      <path d="M40 12 L46 16 L44 21 M78 10 L74 15 L80 19" stroke="#3a4266" stroke-width="1.2" fill="none" />
      <path d="M18 22 L16 30 M44 22 V30 M76 22 V30 M102 22 L104 30" stroke="#1a1e36" stroke-width="1.4" />
      <g fill="#3f8f2c">
        <path d="M2 30 Q4 18 8 26 Q8 14 13 25 Q16 18 16 30 Z" />
        <path d="M104 30 Q106 16 110 25 Q112 14 115 24 Q119 18 118 30 Z" />
      </g>
      <g fill="#66c447">
        <path d="M6 30 Q8 22 10 28 Q11 20 13 30 Z" /><path d="M108 30 Q110 21 112 28 Q114 22 115 30 Z" />
      </g>
      <circle cx="11" cy="22" r="1.8" fill="#ff8ad8" /><circle cx="112" cy="20" r="1.6" fill="#ffd25a" />
    </svg>`;
}

/** Bildchen in den Reitern. */
export const REITER_ICONS = {
  truhen: () => truheSvg('holz'),
  studio: () => `
    <svg viewBox="0 0 28 26" aria-hidden="true">
      <rect x="3" y="10" width="22" height="14" rx="2" fill="#e9eef8" stroke="#1b2450" stroke-width="1.6" />
      <path d="M3 15 H25" stroke="#9aa8d4" stroke-width="1.4" />
      <path d="M3 10 L24 4 L25 8.5 L4 14.5 Z" fill="#2b3778" stroke="#1b2450" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M8 8.6 L11 12.5 M13 7.2 L16 11 M18 5.8 L21 9.6" stroke="#ffffff" stroke-width="2" />
      <circle cx="9" cy="20" r="2" fill="#ff5f8a" /><circle cx="14" cy="20" r="2" fill="#ffd25a" /><circle cx="19" cy="20" r="2" fill="#5ecbff" />
    </svg>`,
  besitz: () => `
    <svg viewBox="0 0 26 28" aria-hidden="true">
      <path d="M9 7 V5 Q9 2 13 2 Q17 2 17 5 V7" stroke="#1b2450" stroke-width="2" fill="none" />
      <path d="M4 12 Q4 6 13 6 Q22 6 22 12 V24 Q22 26 20 26 H6 Q4 26 4 24 Z" fill="#5ecbff" stroke="#1b2450" stroke-width="1.6" />
      <rect x="7.5" y="15" width="11" height="8" rx="2" fill="#2f8fd8" stroke="#1b2450" stroke-width="1.4" />
      <path d="M7.5 18 H18.5" stroke="#1b2450" stroke-width="1.2" />
      <circle cx="13" cy="18" r="1.4" fill="#ffd25a" />
      <path d="M7 10 Q9 8 12 8" stroke="#ffffff" stroke-width="1.6" fill="none" opacity="0.7" stroke-linecap="round" />
    </svg>`,
};
