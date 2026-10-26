/**
 * Alles, was sich auf der Weltkarte bewegt: fließendes Wasser, Wolken und
 * ihre Schatten, wiegendes Gras, Schmetterlinge, fallende Blüten, Glitzer,
 * flackernde Laternen, die wehende Fahne - und die Parallaxe beim Scrollen.
 *
 * Bewegt wird fast nur über transform und opacity (CSS-Animationen in
 * css/weltkarte.css). Die laufen auf der Grafikkarte und kosten das Spiel
 * kaum etwas. Es gibt drei Stufen:
 *   'hoch'    - alles
 *   'niedrig' - weniger Teilchen, kein Wasserfließen, keine Wolkenschatten
 *   'aus'     - nichts bewegt sich (Einstellung "Animationen" aus oder
 *               "Weniger Bewegung" am Gerät)
 */

import { r, wuerfel, zwischen } from './geometrie.js';

/** Welche Stufe passt zu diesem Gerät? */
export function qualitaetErmitteln() {
  if (document.body.classList.contains('no-animations')) return 'aus';
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'aus';
  } catch {
    // Ohne matchMedia einfach weiter.
  }
  const kerne = navigator.hardwareConcurrency ?? 4;
  const speicher = navigator.deviceMemory ?? 4;
  return kerne <= 2 || speicher <= 2 ? 'niedrig' : 'hoch';
}

/**
 * Misst nach dem Aufbau kurz die Bildrate. Ruckelt es (unter etwa 45
 * Bildern pro Sekunde), wird auf 'niedrig' zurückgeschaltet.
 *
 * @param {(stufe: string) => void} melden
 * @returns {() => void} Abbrechen
 */
export function leistungPruefen(melden) {
  let laeuft = true;
  let id = 0;
  const zeiten = [];
  let letzte = 0;
  const start = setTimeout(() => {
    const schritt = (jetzt) => {
      if (!laeuft) return;
      if (letzte) zeiten.push(jetzt - letzte);
      letzte = jetzt;
      if (zeiten.length < 60) {
        id = requestAnimationFrame(schritt);
        return;
      }
      zeiten.sort((a, b) => a - b);
      const mitte = zeiten[Math.floor(zeiten.length / 2)];
      if (mitte > 22) melden('niedrig');
    };
    id = requestAnimationFrame(schritt);
  }, 900);
  return () => {
    laeuft = false;
    clearTimeout(start);
    cancelAnimationFrame(id);
  };
}

/**
 * Hängt alle bewegten Teile an die Kartenfläche.
 *
 * @param {HTMLElement} flaeche - die Kartenfläche (Pixel-Koordinaten)
 * @param {object} karte  - Plan aus layout.js
 * @param {object} thema  - aus js/data/weltkarten.js
 * @param {number} m      - Maßstab: Pixel je Karteneinheit
 * @param {string} stufe  - 'hoch' | 'niedrig' | 'aus'
 */
export function lebenAnlegen(flaeche, karte, thema, m, stufe) {
  const f = thema.farben;
  // Ohne Bewegung bleiben nur Fahne und Laternenschein - stehend.
  const leben = stufe === 'aus' ? {} : thema.leben;
  const zufall = wuerfel(thema.id * 4243 + 11);
  const voll = stufe === 'hoch';
  const px = (wert) => `${r(wert * m)}px`;
  const teile = document.createDocumentFragment();

  const element = (klasse, x, y, html = '', stil = '') => {
    const el = document.createElement('span');
    el.className = klasse;
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = `left:${px(x)};top:${px(y)};${stil}`;
    el.innerHTML = html;
    teile.appendChild(el);
    return el;
  };

  /* ---------- Wasser ---------- */
  if (stufe !== 'aus' && (karte.fluesse.length || karte.see)) {
    let wasser = '';
    for (const fluss of karte.fluesse) {
      if (voll) {
        wasser += `<path class="wk-fliessen" d="${fluss.d}" stroke="#ffffff" stroke-width="3.5" stroke-dasharray="20 74" opacity="0.75" transform="translate(-10 -2)"/>`;
        wasser += `<path class="wk-fliessen wk-fliessen--langsam" d="${fluss.d}" stroke="${f.wasserHell}" stroke-width="5" stroke-dasharray="34 96" opacity="0.6" transform="translate(12 3)"/>`;
        if (fluss.quelle) wasser += `<path class="wk-fliessen" d="${fluss.quelle.d}" stroke="#ffffff" stroke-width="3" stroke-dasharray="16 60" opacity="0.7"/>`;
      }
      if (fluss.wasserfall) {
        const w = fluss.wasserfall;
        const oben = w.y - w.hoehe;
        const faeden = [-3, -2, -1, 0, 1, 2, 3]
          .map((i) => `<path d="M${r(w.x + i * w.breite * 0.12)} ${r(oben - 440)} l${r(i * 0.6)} ${r(w.hoehe + 450)}" stroke="#ffffff" stroke-width="${i % 2 ? 2.5 : 4}" stroke-dasharray="${i % 2 ? '26 34' : '40 30'}" opacity="0.8"/>`)
          .join('');
        wasser += `<clipPath id="wk-fall-${r(w.x)}"><path d="M${r(w.x - w.breite * 0.42)} ${r(oben)} L${r(w.x + w.breite * 0.42)} ${r(oben)} L${r(w.x + w.breite * 0.62)} ${r(w.y)} L${r(w.x - w.breite * 0.62)} ${r(w.y)} Z"/></clipPath>
          <g clip-path="url(#wk-fall-${r(w.x)})"><g class="wk-fall-faeden">${faeden}</g></g>`;
        // Gischt, die auf und ab wallt.
        for (let i = 0; i < 4; i++) {
          wasser += `<circle class="wk-gischt" style="animation-delay:${(i * -0.45).toFixed(2)}s" cx="${r(w.x + (i - 1.5) * 20)}" cy="${r(w.y + 4)}" r="${14 + (i % 2) * 6}" fill="#ffffff" opacity="0.85"/>`;
        }
      }
    }
    if (karte.see) {
      const { x, y, rx, ry } = karte.see;
      for (let i = 0; i < (voll ? 5 : 2); i++) {
        const gx = x + zwischen(zufall, -rx * 0.6, rx * 0.6);
        const gy = y + zwischen(zufall, -ry * 0.5, ry * 0.5);
        wasser += `<ellipse class="wk-glanz" style="animation-delay:${(-i * 1.3).toFixed(1)}s" cx="${r(gx)}" cy="${r(gy)}" rx="${r(zwischen(zufall, 14, 26))}" ry="3" fill="#ffffff"/>`;
      }
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'wk-wasser');
    svg.setAttribute('viewBox', `0 0 ${karte.breite} ${karte.hoehe}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.width = px(karte.breite);
    svg.style.height = px(karte.hoehe);
    svg.innerHTML = `<g fill="none" stroke-linecap="round">${wasser}</g>`;
    teile.appendChild(svg);
  }

  /* ---------- Wolken am Himmel ---------- */
  if (leben.wolken) {
    const zahl = voll ? 4 : 2;
    for (let i = 0; i < zahl; i++) {
      const y = zwischen(zufall, karte.horizont * 0.15, karte.horizont * 0.7);
      const g = zwischen(zufall, 0.7, 1.25);
      const dauer = zwischen(zufall, 110, 180);
      element('wk-wolke', 0, y, wolkeSvg(f), `width:${px(300 * g)};height:${px(138 * g)};animation-duration:${r(dauer)}s;animation-delay:-${r(dauer * (i / zahl + zufall() * 0.2))}s`);
    }
  }

  /* ---------- Wolkenschatten über der Wiese ---------- */
  if (leben.wolkenschatten && voll) {
    for (let y = karte.horizont + 500; y < karte.hoehe; y += zwischen(zufall, 700, 1000)) {
      const dauer = zwischen(zufall, 70, 110);
      element('wk-wolkenschatten', 0, y, '', `width:${px(560)};height:${px(260)};animation-duration:${r(dauer)}s;animation-delay:-${r(dauer * zufall())}s`);
    }
  }

  /* ---------- Wiegendes Gras ---------- */
  if (leben.grasWiegen) {
    const halme = karte.deko.filter((d) => d.art === 'gras' && d.wiegt);
    halme.forEach((d, i) => {
      element('wk-halm', d.x, d.y, grasSvg(f, d.v), `width:${px(30 * d.s)};height:${px(42 * d.s)};animation-delay:-${r((i * 0.37) % 3)}s`);
    });
  }

  /* ---------- Laternen und Fahne ---------- */
  for (const d of karte.deko) {
    if (d.art === 'laterne') element('wk-lichtschein', d.x + 22, d.y - 87, '', `width:${px(110)};height:${px(110)};animation-delay:-${r(zufall() * 2)}s`);
    if (d.art === 'fahne') element('wk-fahne', d.x + 4, d.y - 166, fahneSvg(f), `width:${px(64)};height:${px(86)}`);
  }

  /* ---------- Glitzer bei Ruinen und am Weg ---------- */
  if (leben.glitzer) {
    const orte = karte.deko.filter((d) => d.art === 'tor' || d.art === 'ruine').map((d) => ({ x: d.x, y: d.y - 90 }));
    karte.stationen.forEach((s, i) => i % 2 === 0 && orte.push({ x: s.x, y: s.y - 80 }));
    const proOrt = voll ? 3 : 1;
    orte.forEach((o, i) => {
      for (let k = 0; k < proOrt; k++) {
        element('wk-glitzer', o.x + zwischen(zufall, -120, 120), o.y + zwischen(zufall, -80, 60), '', `--g:${r(zwischen(zufall, 0.6, 1.1))};animation-delay:-${r(zwischen(zufall, 0, 4))}s;animation-duration:${r(zwischen(zufall, 2.6, 4.2))}s`);
      }
    });
  }

  /* ---------- Schmetterlinge ---------- */
  if (leben.schmetterlinge && karte.schmetterlinge?.length) {
    const zahl = voll ? 8 : 3;
    karte.schmetterlinge.slice(0, zahl).forEach((p, i) => {
      const farbe = f.blumen[i % f.blumen.length] === '#ffffff' ? '#ffe27a' : f.blumen[i % f.blumen.length];
      element(
        'wk-falter',
        p.x,
        p.y,
        '<span class="wk-falter__fluegel wk-falter__fluegel--l"></span><span class="wk-falter__fluegel wk-falter__fluegel--r"></span>',
        `--farbe:${farbe};--weg-x:${r(zwischen(zufall, 30, 70) * m * 2)}px;--weg-y:${r(zwischen(zufall, 20, 50) * m * 2)}px;animation-duration:${r(zwischen(zufall, 9, 15))}s;animation-delay:-${r(zufall() * 10)}s`
      );
    });
  }

  flaeche.appendChild(teile);
}

/**
 * Fallende Blüten oder Blätter über dem ganzen Bildschirm (sie scrollen
 * nicht mit - wie Wind vor der Kamera).
 */
export function teilchenAnlegen(ebene, thema, stufe) {
  if (stufe === 'aus' || !thema.leben.blaetter) return;
  const zufall = wuerfel(thema.id * 71 + 5);
  const zahl = stufe === 'hoch' ? 9 : 4;
  const f = thema.farben;
  const farben = {
    bluete: [f.bluete, f.blueteHell, f.blueteDunkel],
    blatt: [f.laub, f.laubHell, f.laubDunkel],
    flocke: ['#ffffff', '#e8f6ff'],
    glut: ['#ffb347', '#ff7a1f'],
    funke: [f.glitzer, '#ffffff'],
    stern: ['#fff3b0', '#ffffff'],
  }[thema.teilchen] ?? [f.laub];
  for (let i = 0; i < zahl; i++) {
    const el = document.createElement('span');
    el.className = `wk-teilchen wk-teilchen--${thema.teilchen}`;
    el.setAttribute('aria-hidden', 'true');
    const dauer = zwischen(zufall, 10, 17);
    el.style.cssText = `left:${r(zwischen(zufall, -5, 95))}%;--farbe:${farben[i % farben.length]};--drift:${r(zwischen(zufall, 30, 120))}px;--g:${r(zwischen(zufall, 0.7, 1.2))};animation-duration:${r(dauer)}s;animation-delay:-${r(zufall() * dauer)}s`;
    ebene.appendChild(el);
  }
}

/**
 * Parallaxe: Der Hintergrund läuft beim Scrollen langsamer mit, der
 * Vordergrund schneller.
 *
 * @returns {() => void} Aufräumen
 */
export function parallaxStarten(scroller, fern, vorn) {
  let geplant = false;
  const setzen = () => {
    geplant = false;
    const st = scroller.scrollTop;
    if (fern) fern.style.transform = `translate3d(0, ${(st * 0.38).toFixed(1)}px, 0)`;
    if (vorn) vorn.style.transform = `translate3d(0, ${(-st * 0.16).toFixed(1)}px, 0)`;
  };
  const beimScrollen = () => {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(setzen);
  };
  scroller.addEventListener('scroll', beimScrollen, { passive: true });
  setzen();
  return () => scroller.removeEventListener('scroll', beimScrollen);
}

/* ---------- kleine Grafiken ---------- */

function wolkeSvg(f) {
  return `<svg viewBox="0 0 240 110" aria-hidden="true"><defs><linearGradient id="wk-wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.65" stop-color="#ffffff"/><stop offset="1" stop-color="${f.himmelUnten}"/></linearGradient></defs>
    <g fill="url(#wk-wg)"><circle cx="70" cy="62" r="34"/><circle cx="112" cy="46" r="42"/><circle cx="160" cy="58" r="34"/><circle cx="196" cy="72" r="24"/><circle cx="40" cy="78" r="22"/><rect x="36" y="64" width="176" height="36" rx="18"/></g></svg>`;
}

function grasSvg(f, v) {
  const neig = (v % 7) - 3;
  return `<svg viewBox="0 0 24 34" aria-hidden="true">
    <path d="M6 34 Q6 18 ${3 + neig} 4 Q9 18 10 34 Z" fill="${f.wieseDunkel}"/>
    <path d="M10 34 Q12 14 ${14 + neig} 0 Q15 16 15 34 Z" fill="${f.laub}"/>
    <path d="M14 34 Q17 20 ${21 + neig} 8 Q18 22 19 34 Z" fill="${f.wieseDunkel}"/>
    <path d="M12 30 Q13 16 ${14 + neig} 6" stroke="${f.wieseHell}" stroke-width="1.2" fill="none"/></svg>`;
}

function fahneSvg(f) {
  return `<svg viewBox="0 0 60 80" aria-hidden="true">
    <path class="wk-fahne__tuch" d="M0 0 L56 0 L56 62 L28 50 L0 62 Z" fill="${f.laubDunkel}" stroke="#ffd76a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M28 12 C18 20 18 34 28 42 C38 34 38 20 28 12 Z" fill="#ffd76a"/>
    <path d="M28 14 L28 42" stroke="${f.laubDunkel}" stroke-width="2"/>
  </svg>`;
}
