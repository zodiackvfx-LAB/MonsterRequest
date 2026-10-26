/**
 * Eine Kampfstation auf der Weltkarte: steinerne Plattform mit goldenem
 * Band, leuchtendem Ring und einem Emblem obendrauf.
 *
 *   geschafft     - grünes Emblem mit Haken, darunter drei Sterne
 *   freigeschaltet- goldenes Emblem mit gekreuzten Schwertern, Ring pulsiert
 *   gesperrt      - dunkler Stein, Schloss, kein Leuchten
 *   Boss          - größer, mit Edelsteinen; der Boss steht selbst darauf
 *
 * Die Verläufe liegen EINMAL in stationsDefs() - alle Stationen greifen
 * darauf zu, statt jede ihre eigenen mitzubringen.
 */

import { createSprite } from '../sprite.js';

/** Unsichtbares SVG mit allen Verläufen der Stationen. Einmal pro Karte. */
export function stationsDefs() {
  return `<svg class="wk-defs" aria-hidden="true" focusable="false" width="0" height="0"><defs>
    <linearGradient id="wk-seite" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5d574e"/><stop offset="0.28" stop-color="#9c9484"/><stop offset="0.55" stop-color="#857d6e"/><stop offset="1" stop-color="#4b463f"/>
    </linearGradient>
    <linearGradient id="wk-seite-dunkel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#34323a"/><stop offset="0.3" stop-color="#5a5763"/><stop offset="1" stop-color="#2a2830"/>
    </linearGradient>
    <linearGradient id="wk-seite-boss" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3e3550"/><stop offset="0.3" stop-color="#7a6c8f"/><stop offset="0.6" stop-color="#5e5272"/><stop offset="1" stop-color="#2c2539"/>
    </linearGradient>
    <radialGradient id="wk-oben" cx="0.42" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#e2dccd"/><stop offset="0.6" stop-color="#b9b19f"/><stop offset="1" stop-color="#8e8676"/>
    </radialGradient>
    <radialGradient id="wk-oben-dunkel" cx="0.42" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#8a8794"/><stop offset="1" stop-color="#4a4752"/>
    </radialGradient>
    <radialGradient id="wk-oben-boss" cx="0.42" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#cfc3dc"/><stop offset="0.6" stop-color="#9886ab"/><stop offset="1" stop-color="#65557a"/>
    </radialGradient>
    <linearGradient id="wk-gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a8741c"/><stop offset="0.3" stop-color="#ffe9a0"/><stop offset="0.55" stop-color="#ffc53d"/><stop offset="1" stop-color="#9c6512"/>
    </linearGradient>
    <radialGradient id="wk-schatten"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="wk-mulde-gruen" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#d6ff9a"/><stop offset="0.5" stop-color="#5fd447"/><stop offset="1" stop-color="#1f7a1f"/></radialGradient>
    <radialGradient id="wk-mulde-gold" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#fff6c0"/><stop offset="0.5" stop-color="#ffcf4a"/><stop offset="1" stop-color="#b8740f"/></radialGradient>
    <radialGradient id="wk-mulde-dunkel" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#5b5868"/><stop offset="1" stop-color="#26242e"/></radialGradient>
    <radialGradient id="wk-mulde-boss" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#ffb3c8"/><stop offset="0.5" stop-color="#d43a6a"/><stop offset="1" stop-color="#5a1036"/></radialGradient>
    <radialGradient id="wk-kuppel-gruen" cx="0.4" cy="0.3" r="0.75"><stop offset="0" stop-color="#e6ffb8"/><stop offset="0.35" stop-color="#7fe05a"/><stop offset="0.8" stop-color="#2c9a2a"/><stop offset="1" stop-color="#17631a"/></radialGradient>
    <radialGradient id="wk-kuppel-gold" cx="0.4" cy="0.3" r="0.75"><stop offset="0" stop-color="#fffbe0"/><stop offset="0.35" stop-color="#ffd85a"/><stop offset="0.8" stop-color="#e09a1c"/><stop offset="1" stop-color="#9a5c08"/></radialGradient>
    <radialGradient id="wk-kuppel-dunkel" cx="0.4" cy="0.3" r="0.75"><stop offset="0" stop-color="#8c8a99"/><stop offset="0.5" stop-color="#55535f"/><stop offset="1" stop-color="#2a2832"/></radialGradient>
    <radialGradient id="wk-kuppel-boss" cx="0.4" cy="0.3" r="0.75"><stop offset="0" stop-color="#ffd0e0"/><stop offset="0.35" stop-color="#ff5c8a"/><stop offset="0.8" stop-color="#a51e52"/><stop offset="1" stop-color="#5e0c2e"/></radialGradient>
    <linearGradient id="wk-stern" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a8"/><stop offset="0.5" stop-color="#ffc93d"/><stop offset="1" stop-color="#e08a0c"/></linearGradient>
    <linearGradient id="wk-stern-grau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9ccd8"/><stop offset="1" stop-color="#7d8296"/></linearGradient>
    <linearGradient id="wk-edelstein" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd0f0"/><stop offset="0.5" stop-color="#d43a9a"/><stop offset="1" stop-color="#6a0c4a"/></linearGradient>
  </defs></svg>`;
}

/**
 * Die steinerne Plattform als SVG. Breite 140, Höhe 124; die Mitte der
 * Oberseite liegt bei (70, 58).
 *
 * @param {'gruen'|'gold'|'dunkel'|'boss'} art
 * @param {number} variante - kleine Unterschiede (Moos, Fugen) je Station
 */
function sockel(art, variante) {
  const seite = art === 'dunkel' ? 'wk-seite-dunkel' : art === 'boss' ? 'wk-seite-boss' : 'wk-seite';
  const oben = art === 'dunkel' ? 'wk-oben-dunkel' : art === 'boss' ? 'wk-oben-boss' : 'wk-oben';
  const mulde = `wk-mulde-${art}`;
  const fuge = art === 'dunkel' ? 'rgba(0,0,0,0.5)' : 'rgba(40,32,24,0.45)';
  const licht = art === 'dunkel' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.28)';

  // Fugen: obere Reihe und versetzte untere Reihe. Die Variante verschiebt sie.
  const versatz = (variante % 3) * 6;
  const reihe = (yOben, yUnten, start) =>
    [0, 1, 2, 3, 4]
      .map((i) => {
        const x = 22 + start + i * 24;
        if (x > 122) return '';
        // Auf der gekrümmten Wand liegen die Fugen tiefer, je weiter sie zur Mitte sind.
        const bogen = Math.sin(((x - 12) / 116) * Math.PI) * 18;
        return `<path d="M${x} ${yOben + bogen} L${x} ${yUnten + bogen}" stroke="${fuge}" stroke-width="1.6"/><path d="M${x + 1.6} ${yOben + bogen} L${x + 1.6} ${yUnten + bogen}" stroke="${licht}" stroke-width="1"/>`;
      })
      .join('');

  // Moos auf dem Rand - an einer von drei Stellen.
  const moos = art === 'dunkel'
    ? ''
    : [
        '<path d="M16 60 q8 -8 20 -4 q6 2 4 8 q-10 4 -24 -4 Z" fill="#5c9e34"/><path d="M18 64 q2 8 -2 12" stroke="#4a8a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
        '<path d="M100 74 q10 -4 20 -12 q6 4 0 10 q-10 6 -20 2 Z" fill="#5c9e34"/><circle cx="112" cy="80" r="2.5" fill="#6fb03e"/>',
        '<path d="M50 77 q12 4 24 2 q-2 6 -12 6 q-10 0 -12 -8 Z" fill="#5c9e34"/>',
      ][variante % 3];

  const boss =
    art === 'boss'
      ? `<path d="M10 58 L4 40 L18 52 Z M130 58 L136 40 L122 52 Z" fill="url(#wk-gold)" stroke="#6b4210" stroke-width="1"/>
         <path d="M64 96 l6 -9 l6 9 l-6 7 Z" fill="url(#wk-edelstein)" stroke="#ffd76a" stroke-width="1.5"/>
         <circle cx="30" cy="86" r="4" fill="url(#wk-edelstein)" stroke="#ffd76a" stroke-width="1.2"/>
         <circle cx="110" cy="86" r="4" fill="url(#wk-edelstein)" stroke="#ffd76a" stroke-width="1.2"/>`
      : '';

  const gold = art === 'dunkel' ? 'rgba(150,140,120,0.5)' : 'url(#wk-gold)';
  return `<svg class="station__sockel" viewBox="0 0 140 124" aria-hidden="true" focusable="false">
    <ellipse cx="74" cy="104" rx="64" ry="15" fill="url(#wk-schatten)"/>
    <path d="M12 58 L12 88 A58 20 0 0 0 128 88 L128 58 Z" fill="url(#${seite})"/>
    <path d="M12 74 A58 20 0 0 0 128 74" stroke="${fuge}" stroke-width="1.6" fill="none"/>
    <path d="M12 75.5 A58 20 0 0 0 128 75.5" stroke="${licht}" stroke-width="1" fill="none"/>
    ${reihe(58, 74, versatz)}${reihe(76, 90, versatz + 12)}
    <path d="M12 88 A58 20 0 0 0 128 88" stroke="rgba(0,0,0,0.35)" stroke-width="2" fill="none"/>
    <path d="M12 62 A58 20 0 0 0 128 62" stroke="${gold}" stroke-width="4" fill="none"/>
    ${art === 'dunkel' ? '' : [26, 48, 70, 92, 114].map((x) => `<circle cx="${x}" cy="${62 + Math.sin(((x - 12) / 116) * Math.PI) * 19.5}" r="2.6" fill="#ffe9a0" stroke="#8a5a10" stroke-width="0.8"/>`).join('')}
    <ellipse cx="70" cy="58" rx="58" ry="21" fill="url(#${oben})"/>
    <ellipse cx="70" cy="58" rx="58" ry="21" fill="none" stroke="${licht}" stroke-width="1.5"/>
    <ellipse cx="70" cy="58" rx="50" ry="17.5" fill="none" stroke="${fuge}" stroke-width="1.4"/>
    ${[0.2, 0.75, 1.3, 1.85, 2.4, 2.95, 3.5, 4.05, 4.6, 5.15, 5.7].map((w) => `<path d="M${(70 + Math.cos(w) * 50).toFixed(1)} ${(58 + Math.sin(w) * 17.5).toFixed(1)} L${(70 + Math.cos(w) * 58).toFixed(1)} ${(58 + Math.sin(w) * 21).toFixed(1)}" stroke="${fuge}" stroke-width="1.2"/>`).join('')}
    <ellipse cx="70" cy="59" rx="42" ry="14.5" fill="rgba(20,16,30,0.55)"/>
    <ellipse cx="70" cy="59.5" rx="37" ry="12.5" fill="url(#${mulde})"/>
    ${moos}${boss}
  </svg>`;
}

/** Das Emblem: eine glänzende Kuppel mit Symbol. */
function emblem(art, symbol) {
  return `<svg class="station__emblem" viewBox="0 0 64 56" aria-hidden="true" focusable="false">
    <ellipse cx="32" cy="34" rx="29" ry="21" fill="rgba(0,0,0,0.35)"/>
    <ellipse cx="32" cy="30" rx="29" ry="22" fill="url(#wk-gold)"/>
    <ellipse cx="32" cy="29" rx="25.5" ry="19" fill="url(#wk-kuppel-${art})"/>
    <ellipse cx="25" cy="20" rx="12" ry="6" fill="#ffffff" opacity="0.45"/>
    ${SYMBOLE[symbol] ?? ''}
  </svg>`;
}

const SYMBOLE = {
  haken: `<path d="M19 30 L28 39 L46 21" stroke="rgba(10,60,10,0.45)" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 2)"/>
          <path d="M19 30 L28 39 L46 21" stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  schwerter: `<g stroke-linecap="round" transform="translate(0 1)">
      <path d="M21 39 L43 17" stroke="#6b4210" stroke-width="6"/><path d="M43 39 L21 17" stroke="#6b4210" stroke-width="6"/>
      <path d="M22 38 L42 18" stroke="#ffffff" stroke-width="3.5"/><path d="M42 38 L22 18" stroke="#ffffff" stroke-width="3.5"/>
      <path d="M19 34 L26 41 M45 34 L38 41" stroke="#6b4210" stroke-width="4.5"/>
      <path d="M19 34 L26 41 M45 34 L38 41" stroke="#ffe27a" stroke-width="2.5"/></g>`,
  schloss: `<path d="M24 27 v-5 a8 8 0 0 1 16 0 v5" stroke="#c9c6d6" stroke-width="4" fill="none"/>
          <rect x="20" y="26" width="24" height="17" rx="4" fill="#d9d5e6" stroke="#3a3846" stroke-width="1.5"/>
          <circle cx="32" cy="33" r="2.6" fill="#3a3846"/><path d="M32 34 v4" stroke="#3a3846" stroke-width="2.4" stroke-linecap="round"/>`,
  krone: `<path d="M18 38 L16 22 L24 29 L32 18 L40 29 L48 22 L46 38 Z" fill="#ffd76a" stroke="#6b4210" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="32" cy="31" r="3" fill="#ff5c8a"/><path d="M18 38 L46 38" stroke="#6b4210" stroke-width="3"/>`,
};

/** Drei Sterne im Bogen; erreichte golden, fehlende grau. */
export function sterneSvg(anzahl) {
  // Die Lage steht auf einer Gruppe drumherum: So kann CSS den Stern selbst
  // aufploppen lassen, ohne seine Position zu überschreiben.
  const stern = (cx, cy, g, an, i) =>
    `<g transform="translate(${cx} ${cy}) scale(${g})"><path class="station__stern${an ? ' ist-an' : ''}" data-i="${i}" style="--i:${i}"
      d="M0 -10 L2.9 -3.6 L9.8 -3.1 L4.6 1.5 L6.1 8.3 L0 4.7 L-6.1 8.3 L-4.6 1.5 L-9.8 -3.1 L-2.9 -3.6 Z"
      fill="url(#${an ? 'wk-stern' : 'wk-stern-grau'})" stroke="${an ? '#7a4a06' : '#4a4e60'}" stroke-width="1.6" stroke-linejoin="round"/></g>`;
  return `<svg class="station__sterne" viewBox="0 0 76 30" aria-hidden="true" focusable="false">
    ${stern(14, 17, 1.05, anzahl >= 1, 0)}${stern(62, 17, 1.05, anzahl >= 3, 2)}${stern(38, 13, 1.25, anzahl >= 2, 1)}
  </svg>`;
}

/**
 * Baut die Station als Knopf.
 *
 * @param {object} o
 * @param {object} o.level     - Eintrag aus js/data/levels.js
 * @param {object} o.gegner    - Gegner des Kampfes (für den Boss auf seinem Sockel)
 * @param {boolean} o.offen    - freigeschaltet?
 * @param {boolean} o.geschafft
 * @param {number} o.sterne    - 0 bis 3
 * @param {boolean} o.aktuell  - der nächste offene Kampf
 * @returns {HTMLButtonElement}
 */
export function stationBauen({ level, gegner, offen, geschafft, sterne, aktuell }) {
  const art = !offen ? 'dunkel' : level.isBoss ? 'boss' : geschafft ? 'gruen' : 'gold';
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = [
    'station',
    `station--${art}`,
    offen ? 'ist-offen' : 'ist-gesperrt',
    geschafft ? 'ist-geschafft' : '',
    level.isBoss ? 'ist-boss' : '',
    aktuell ? 'ist-aktuell' : '',
  ]
    .filter(Boolean)
    .join(' ');
  knopf.disabled = !offen;
  knopf.dataset.level = level.id;
  knopf.setAttribute(
    'aria-label',
    `${level.isBoss ? 'Bosskampf' : `Kampf ${level.number}`}: ${gegner.name} (${geschafft ? `geschafft, ${sterne} Sterne` : offen ? 'offen' : 'gesperrt'})`
  );

  const symbol = !offen ? 'schloss' : geschafft ? 'haken' : level.isBoss ? 'krone' : 'schwerter';
  knopf.innerHTML = `
    <span class="station__koerper">
      <span class="station__schein" aria-hidden="true"></span>
      ${sockel(art, level.number)}
      <span class="station__ring" aria-hidden="true"></span>
      ${level.isBoss ? '<span class="station__boss" aria-hidden="true"></span>' : ''}
      ${emblem(art, symbol)}
    </span>
    ${geschafft ? sterneSvg(sterne) : ''}
    <span class="station__name">${level.isBoss ? 'BOSS' : `Kampf ${level.number}`}</span>
  `;

  if (level.isBoss) {
    // Der Boss wartet auf seinem Sockel - gesperrt nur als Schatten.
    const figur = createSprite(gegner, { className: 'station__boss-figur' });
    knopf.querySelector('.station__boss').appendChild(figur);
  }
  return knopf;
}
