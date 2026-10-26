/**
 * Bausteine der Weltenauswahl:
 *
 *   weltkarteBauen()   - die Karte einer Welt (Landschaft links, Text rechts)
 *   bildEinsetzen()    - setzt die Landschaft erst ein, wenn die Karte in
 *                        die Nähe des Bildschirms kommt (Lazy Loading)
 *   hintergrundBauen() - Himmel, Schloss, Berge und Vordergrund der Seite
 *   eindeutig()        - macht ids in einem SVG-Stück einmalig
 *
 * Die stehenden Landschaften werden als Bild eingebunden (einmal gerastert),
 * nur die bewegten Teile liegen als kleines SVG darüber. Die Bewegungen
 * laufen nur, solange eine Karte zu sehen ist (Klasse ist-sichtbar).
 */

import { B, H, szeneZeichnen } from './szenen.js';
import { BREITE as HG_BREITE, hintergrundZeichnen } from './hintergrund.js';

/**
 * Rahmenfarbe, Leuchten und kleines Ziersymbol je Welt. Fehlt eine Welt,
 * bekommt sie Gold.
 */
const STIL = {
  1: { rahmen: '#b8e86a', glut: 'rgba(150, 230, 90, 0.55)', zier: 'blatt' },
  2: { rahmen: '#c79cff', glut: 'rgba(170, 120, 255, 0.55)', zier: 'kristall' },
  3: { rahmen: '#ff9a4a', glut: 'rgba(255, 110, 40, 0.55)', zier: 'flamme' },
  4: { rahmen: '#a8e4ff', glut: 'rgba(130, 210, 255, 0.5)', zier: 'flocke' },
  5: { rahmen: '#b48cff', glut: 'rgba(150, 100, 255, 0.5)', zier: 'mond' },
  6: { rahmen: '#ffcf6a', glut: 'rgba(255, 190, 80, 0.5)', zier: 'sonne' },
  7: { rahmen: '#9fdcff', glut: 'rgba(140, 210, 255, 0.5)', zier: 'feder' },
  8: { rahmen: '#ff9ab0', glut: 'rgba(255, 120, 150, 0.5)', zier: 'muschel' },
  9: { rahmen: '#a8e07a', glut: 'rgba(160, 230, 110, 0.45)', zier: 'irrlicht' },
  10: { rahmen: '#e6b85a', glut: 'rgba(230, 170, 70, 0.5)', zier: 'zahnrad' },
  11: { rahmen: '#ff9ad5', glut: 'rgba(255, 140, 210, 0.5)', zier: 'bonbon' },
  12: { rahmen: '#ffe27a', glut: 'rgba(255, 220, 110, 0.5)', zier: 'stern' },
};

/** Kleine gezeichnete Symbole (statt Emoji). Verläufe stehen in symbolDefs(). */
export const SYMBOLE = {
  schwerter: `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 23 L22 6 M23 23 L6 6" stroke="#2a1a08" stroke-width="5" stroke-linecap="round"/><path d="M5 23 L22 6 M23 23 L6 6" stroke="#e8eeff" stroke-width="2.6" stroke-linecap="round"/><path d="M3 19 l6 6 M25 19 l-6 6" stroke="#ffd76a" stroke-width="3" stroke-linecap="round"/></svg>`,
  stern: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8 L15 8.3 L22.1 9 L16.8 13.8 L18.3 20.8 L12 17.2 L5.7 20.8 L7.2 13.8 L1.9 9 L9 8.3 Z" fill="url(#wbi-gold)" stroke="#7a4a06" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.5 9.4 L12 4.6 L13.3 7.6" stroke="#fffbe0" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.8"/></svg>`,
  haken: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 L10 17.5 L19 7" stroke="#ffffff" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  schloss: `<svg viewBox="0 0 40 44" aria-hidden="true"><path d="M11 20 v-6 a9 9 0 0 1 18 0 v6" stroke="#d8dcef" stroke-width="5" fill="none"/><rect x="6" y="19" width="28" height="22" rx="5" fill="url(#wbi-gold)" stroke="#6b4210" stroke-width="1.5"/><circle cx="20" cy="28" r="3" fill="#6b4210"/><path d="M20 29 v6" stroke="#6b4210" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  lorbeer: `<svg viewBox="0 0 30 40" aria-hidden="true"><path d="M24 38 C10 34 4 22 8 4" stroke="#ffe08a" stroke-width="2" fill="none" stroke-linecap="round"/>${[
    [9, 8, -40], [7, 15, -25], [8, 22, -10], [11, 29, 10], [16, 34, 30],
  ]
    .map(([x, y, w]) => `<ellipse cx="${x - 3}" cy="${y}" rx="5" ry="2.4" transform="rotate(${w - 60} ${x - 3} ${y})" fill="#ffe08a"/><ellipse cx="${x + 4}" cy="${y + 1}" rx="5" ry="2.4" transform="rotate(${w + 30} ${x + 4} ${y + 1})" fill="#f5c84a"/>`)
    .join('')}</svg>`,
  zier: {
    blatt: '<path d="M4 20 C4 10 10 4 20 3 C19 13 13 19 4 20 Z" fill="#8fe05a" stroke="#3a7a22" stroke-width="1.2"/><path d="M4 20 L16 8" stroke="#3a7a22" stroke-width="1.2"/>',
    kristall: '<path d="M12 2 L18 9 L12 22 L6 9 Z" fill="#c79cff" stroke="#5a2a9e" stroke-width="1.2"/><path d="M12 2 L12 22 M6 9 L18 9" stroke="#f0e0ff" stroke-width="1"/>',
    flamme: '<path d="M12 2 C16 8 19 11 18 16 A6 6 0 0 1 6 16 C5 12 8 10 9 6 C10 9 11 10 12 10 C12 7 11 4 12 2 Z" fill="#ff8a3a" stroke="#a8320a" stroke-width="1.1"/><path d="M12 12 C14 14 15 16 14 18 A2.5 2.5 0 0 1 10 18 C9 16 11 14 12 12 Z" fill="#ffe08a"/>',
    flocke: '<g stroke="#e8f8ff" stroke-width="1.8" stroke-linecap="round"><path d="M12 2 V22 M3.3 7 L20.7 17 M3.3 17 L20.7 7"/><path d="M9.5 4 L12 6.5 L14.5 4 M9.5 20 L12 17.5 L14.5 20"/></g>',
    mond: '<path d="M15 3 A9 9 0 1 0 21 17 A7 7 0 1 1 15 3 Z" fill="#e2d4ff" stroke="#6a4ab0" stroke-width="1.1"/>',
    sonne: '<circle cx="12" cy="12" r="5" fill="#ffd84a"/><g stroke="#ffb02e" stroke-width="2" stroke-linecap="round"><path d="M12 2 V4.5 M12 19.5 V22 M2 12 H4.5 M19.5 12 H22 M5 5 L6.8 6.8 M17.2 17.2 L19 19 M5 19 L6.8 17.2 M17.2 6.8 L19 5"/></g>',
    feder: '<path d="M19 3 C10 5 5 12 5 20 L7 20 C8 14 12 9 19 3 Z" fill="#e8f6ff" stroke="#6aa8d8" stroke-width="1.1"/><path d="M5 21 L14 10" stroke="#6aa8d8" stroke-width="1"/>',
    muschel: '<path d="M12 4 C6 4 3 10 4 16 L12 20 L20 16 C21 10 18 4 12 4 Z" fill="#ffc0cc" stroke="#c8506a" stroke-width="1.1"/><path d="M12 4 L12 20 M8 6 L9 19 M16 6 L15 19" stroke="#c8506a" stroke-width="0.9"/>',
    irrlicht: '<circle cx="12" cy="12" r="7" fill="#b6ff8a" opacity="0.4"/><circle cx="12" cy="12" r="3.5" fill="#f0ffe0"/>',
    zahnrad: '<path d="M12 3 l1.6 2.4 2.8 -0.7 0.7 2.8 2.4 1.6 -1.2 2.6 1.2 2.6 -2.4 1.6 -0.7 2.8 -2.8 -0.7 L12 21 l-1.6 -2.4 -2.8 0.7 -0.7 -2.8 -2.4 -1.6 1.2 -2.6 -1.2 -2.6 2.4 -1.6 0.7 -2.8 2.8 0.7 Z" fill="#e6b85a" stroke="#7a5a1a" stroke-width="1"/><circle cx="12" cy="12" r="3" fill="#7a5a1a"/>',
    bonbon: '<circle cx="12" cy="12" r="6" fill="#ff6fa8" stroke="#a82a6a" stroke-width="1.1"/><path d="M6 12 L2 9 L2 15 Z M18 12 L22 9 L22 15 Z" fill="#ffd0e4"/><path d="M9 9 Q12 12 15 15" stroke="#ffffff" stroke-width="1.6"/>',
    stern: '<path d="M12 2 L14.6 9.4 L22 9.6 L16 14 L18.2 21.4 L12 17 L5.8 21.4 L8 14 L2 9.6 L9.4 9.4 Z" fill="#ffe27a" stroke="#a8741c" stroke-width="1.1"/>',
  },
};

/** Gemeinsame Verläufe der Symbole - einmal pro Bildschirm. */
export function symbolDefs() {
  return `<svg class="wb-defs" aria-hidden="true" focusable="false" width="0" height="0"><defs>
    <linearGradient id="wbi-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a8"/><stop offset="0.5" stop-color="#ffc93d"/><stop offset="1" stop-color="#e08a0c"/></linearGradient>
  </defs></svg>`;
}

/** Hängt an alle ids eines SVG-Stücks ein Präfix - damit sich die Karten nicht in die Quere kommen. */
export function eindeutig(svg, praefix) {
  return svg.replace(/id="([^"]+)"/g, `id="${praefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${praefix}$1)`);
}

/** Alle <defs>-Blöcke eines SVG-Stücks. */
function nurDefs(svg) {
  return (svg.match(/<defs>[\s\S]*?<\/defs>/g) ?? []).join('');
}

/** Ein SVG-Text als Bildadresse (Blob) - wird beim Aufräumen wieder freigegeben. */
function bildAdresse(svg, adressen) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  adressen.push(url);
  return url;
}

/**
 * Die Karte einer Welt.
 *
 * @param {object} welt
 * @param {{offen:boolean, geschafft:number, gesamt:number, sterne:number, fertig:boolean}} stand
 * @param {(welt) => void} beiWahl
 * @returns {HTMLButtonElement}
 */
export function weltkarteBauen(welt, stand, beiWahl) {
  const stil = STIL[welt.id] ?? { rahmen: '#ffd76a', glut: 'rgba(255, 210, 100, 0.5)', zier: 'stern' };
  const { offen, geschafft, gesamt, sterne, fertig } = stand;
  const anteil = gesamt ? geschafft / gesamt : 0;

  const karte = document.createElement('button');
  karte.type = 'button';
  karte.className = `wkarte ${fertig ? 'ist-fertig' : offen ? 'ist-offen' : 'ist-gesperrt'}`;
  karte.disabled = !offen;
  karte.dataset.welt = welt.id;
  karte.style.setProperty('--rahmen', stil.rahmen);
  karte.style.setProperty('--glut', stil.glut);
  karte.setAttribute(
    'aria-label',
    `Welt ${welt.id}: ${welt.name}. ${offen ? `${geschafft} von ${gesamt} Kämpfen, ${sterne} von ${gesamt * 3} Sternen${fertig ? ', geschafft' : ''}` : 'gesperrt'}`
  );

  let status;
  if (fertig) {
    status = `<span class="wkarte__geschafft"><span class="wkarte__lorbeer">${SYMBOLE.lorbeer}</span><span class="wkarte__badge">${SYMBOLE.haken}Geschafft</span><span class="wkarte__lorbeer wkarte__lorbeer--r">${SYMBOLE.lorbeer}</span></span>`;
  } else if (offen) {
    status = `<span class="wkarte__fortschritt"><span class="wkarte__balken"><span class="wkarte__fuellung" style="--anteil:${anteil.toFixed(3)}"></span></span><span class="wkarte__prozent">${geschafft ? `${Math.round(anteil * 100)} %` : 'Neu!'}</span></span>`;
  } else {
    status = '<span class="wkarte__sperre">Besiege den Boss der Welt davor.</span>';
  }

  karte.innerHTML = `
    <span class="wkarte__bild" aria-hidden="true"><span class="wkarte__buehne"></span></span>
    <span class="wkarte__schleier" aria-hidden="true"></span>
    ${offen ? '' : `<span class="wkarte__nebel" aria-hidden="true"></span><span class="wkarte__schloss" aria-hidden="true">${SYMBOLE.schloss}</span>`}
    <span class="wkarte__zier" aria-hidden="true"><svg viewBox="0 0 24 24">${SYMBOLE.zier[stil.zier]}</svg></span>
    <span class="wkarte__inhalt">
      <span class="wkarte__name">Welt ${welt.id} · ${welt.name}</span>
      <span class="wkarte__text">${offen ? welt.text : 'Noch verschlossen.'}</span>
      <span class="wkarte__werte">
        <span class="wkarte__chip"><span class="wkarte__chip-icon">${SYMBOLE.schwerter}</span>${geschafft} / ${gesamt} Kämpfe</span>
        <span class="wkarte__chip"><span class="wkarte__chip-icon">${SYMBOLE.stern}</span>${sterne} / ${gesamt * 3}</span>
      </span>
      ${status}
    </span>
  `;

  if (offen) {
    let gewaehlt = false;
    karte.addEventListener('click', () => {
      if (gewaehlt) return;
      gewaehlt = true;
      // Kurz aufleuchten lassen, dann zur Weltkarte.
      karte.classList.add('ist-angetippt');
      const warten = document.body.classList.contains('no-animations') ? 0 : 330;
      setTimeout(() => beiWahl(welt), warten);
    });
  }
  return karte;
}

/**
 * Setzt die Landschaft in eine Karte ein (einmal).
 * @param {HTMLElement} karte
 * @param {object} welt
 * @param {string} stufe - 'hoch' | 'niedrig' | 'aus'
 * @param {string[]} adressen - sammelt die Blob-Adressen fürs Aufräumen
 */
export function bildEinsetzen(karte, welt, stufe, adressen) {
  const buehne = karte.querySelector('.wkarte__buehne');
  if (!buehne || buehne.childElementCount) return;
  const { bild, leben } = szeneZeichnen(welt);

  const img = new Image();
  img.alt = '';
  img.decoding = 'async';
  img.className = 'wkarte__szene';
  img.addEventListener('load', () => karte.classList.add('ist-geladen'), { once: true });
  img.src = bildAdresse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${B} ${H}" preserveAspectRatio="xMidYMid slice">${bild}</svg>`, adressen);
  buehne.appendChild(img);

  if (stufe !== 'aus' && karte.classList.contains('ist-gesperrt') === false) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'wkarte__leben');
    svg.setAttribute('viewBox', `0 0 ${B} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = eindeutig(nurDefs(bild) + leben, `w${welt.id}-`);
    buehne.appendChild(svg);
  }
}

/**
 * Der Seitenhintergrund mit drei Ebenen.
 * @returns {{element: HTMLElement, verschieben: (scrollTop:number) => void}}
 */
export function hintergrundBauen(stufe, adressen) {
  const { himmel, land, vorn, leben, hoehe } = hintergrundZeichnen();
  const huelle = document.createElement('div');
  huelle.className = 'wb-hintergrund';
  huelle.setAttribute('aria-hidden', 'true');

  const ebene = (klasse, svg, vb, aspekt) => {
    const el = document.createElement('div');
    el.className = `wb-ebene ${klasse}`;
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.src = bildAdresse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="${aspekt}">${svg}</svg>`, adressen);
    el.appendChild(img);
    huelle.appendChild(el);
    return el;
  };

  const himmelEbene = ebene('wb-ebene--himmel', himmel, `0 0 ${HG_BREITE} ${hoehe}`, 'xMidYMin slice');
  const landEbene = ebene('wb-ebene--land', land, `0 0 ${HG_BREITE} ${hoehe}`, 'xMidYMin slice');
  if (stufe !== 'aus') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'wb-hintergrund__leben');
    svg.setAttribute('viewBox', `0 0 ${HG_BREITE} ${hoehe}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMin slice');
    svg.innerHTML = eindeutig(nurDefs(himmel) + leben, 'wbh-');
    landEbene.appendChild(svg);
  }
  const vornEbene = ebene('wb-ebene--vorn', vorn, `0 0 ${HG_BREITE} 140`, 'xMidYMax slice');

  return {
    element: huelle,
    verschieben(st) {
      if (stufe === 'aus') return;
      // Begrenzt: Die Ebenen sind nur 40 px höher als der Bildschirm.
      himmelEbene.style.transform = `translate3d(0, ${Math.max(-20, -st * 0.03).toFixed(1)}px, 0)`;
      landEbene.style.transform = `translate3d(0, ${Math.max(-38, -st * 0.08).toFixed(1)}px, 0)`;
      vornEbene.style.transform = `translate3d(0, ${Math.min(30, st * 0.06).toFixed(1)}px, 0)`;
    },
  };
}
