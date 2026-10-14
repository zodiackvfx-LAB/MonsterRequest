/**
 * Die lebendige Kampfumgebung: Arena-Variante, Tageszeit, Wetter und
 * kleine Tiere am Rand.
 *
 * Alles hier ist REINE OPTIK. Nichts davon ändert Schaden, Energie oder
 * Tempo - das Wetter ist Stimmung, keine Regel.
 *
 * Welche Variante und welches Wetter möglich sind, steht je Welt in
 * STIMMUNGEN. Die Tageszeit richtet sich nach der Uhr des Geräts: morgens
 * warmes Licht, abends lila Dämmerung.
 *
 * Gestaltet wird alles in css/erlebnis.css (Abschnitt 4).
 */

/**
 * Je Welt (id aus js/data/worlds.js):
 *   varianten - drei Arena-Layouts [art, Anzeigename]. Die art bestimmt die
 *               Bausteine (siehe baueVariante), die Farben kommen von der Welt.
 *                 wiese    Büsche, Blumen, ein Holzzaun
 *                 bach     ein Wasserlauf quer über die Wiese (Lava im Vulkan)
 *                 lichtung Lichtstrahlen, Baumstümpfe und Steine
 *   wetter    - mögliche Wetterlagen mit Gewicht
 *   tiere     - was am Rand herumflattert ('falter', 'gluehwurm' oder keine)
 *   voegel    - ob ab und zu ein Vogel durch den Himmel zieht
 */
const STIMMUNGEN = {
  1: {
    varianten: [['wiese', 'Blumenwiese'], ['bach', 'Bachrand'], ['lichtung', 'Sonnige Lichtung']],
    wetter: { sonnig: 5, bewoelkt: 3, regen: 2, nebel: 2 },
    tiere: 'falter',
    voegel: true,
  },
  2: {
    varianten: [['wiese', 'Kristallgrotte'], ['bach', 'Leuchtender Bach'], ['lichtung', 'Lichtschacht']],
    wetter: { sonnig: 4, nebel: 3, glitzer: 3 },
    tiere: 'gluehwurm',
    voegel: false,
  },
  3: {
    varianten: [['wiese', 'Aschefeld'], ['bach', 'Lavastrom'], ['lichtung', 'Glutkessel']],
    wetter: { glut: 6, nebel: 2 },
    tiere: null,
    voegel: false,
  },
  4: {
    varianten: [['wiese', 'Schneefeld'], ['bach', 'Gefrorener Bach'], ['lichtung', 'Polarlichtung']],
    wetter: { schnee: 5, sonnig: 3, nebel: 2 },
    tiere: null,
    voegel: true,
  },
  5: {
    varianten: [['wiese', 'Nebelmoor'], ['bach', 'Schattenbach'], ['lichtung', 'Mondlichtung']],
    wetter: { nebel: 5, regen: 3, bewoelkt: 2 },
    tiere: 'gluehwurm',
    voegel: false,
  },
  6: {
    varianten: [['wiese', 'Dünenmeer'], ['bach', 'Oase'], ['lichtung', 'Sonnenplateau']],
    wetter: { sonnig: 6, sand: 3, bewoelkt: 1 },
    tiere: 'falter',
    voegel: true,
  },
  7: {
    varianten: [['wiese', 'Wolkenwiese'], ['bach', 'Wolkenfluss'], ['lichtung', 'Sonnenterrasse']],
    wetter: { sonnig: 5, bewoelkt: 3, regen: 1 },
    tiere: 'falter',
    voegel: true,
  },  8: {
    varianten: [['wiese', 'Sandgrund'], ['bach', 'Strömungsrinne'], ['lichtung', 'Lichtkegel']],
    wetter: { glitzer: 4, nebel: 3, sonnig: 3 }, // Glitzer = leuchtendes Plankton
    tiere: 'gluehwurm',
    voegel: false,
  },
  9: {
    varianten: [['wiese', 'Nebelsumpf'], ['bach', 'Moorbach'], ['lichtung', 'Irrlichtlichtung']],
    wetter: { nebel: 6, regen: 3, bewoelkt: 1 },
    tiere: 'gluehwurm',
    voegel: false,
  },
  10: {
    varianten: [['wiese', 'Werkhof'], ['bach', 'Ölkanal'], ['lichtung', 'Dampfplatz']],
    wetter: { bewoelkt: 4, nebel: 3, glut: 2 }, // Nebel = Dampf, Glut = Funkenflug
    tiere: null,
    voegel: true,
  },
  11: {
    varianten: [['wiese', 'Bonbonwiese'], ['bach', 'Schokofluss'], ['lichtung', 'Zuckerlichtung']],
    wetter: { sonnig: 5, glitzer: 3, schnee: 2 }, // Schnee = Puderzucker
    tiere: 'falter',
    voegel: true,
  },
  12: {
    varianten: [['wiese', 'Mondfeld'], ['bach', 'Milchstraße'], ['lichtung', 'Sternenlichtung']],
    wetter: { glitzer: 6, nebel: 2 },
    tiere: 'gluehwurm',
    voegel: false,
  },
};

/** Anzeigenamen des Wetters (für die Zeile im Kampf-Log). */
const WETTER_NAMEN = {
  sonnig: 'sonnig',
  bewoelkt: 'bewölkt',
  regen: 'leichter Regen',
  nebel: 'leichter Nebel',
  schnee: 'Schneefall',
  glut: 'Glutregen',
  glitzer: 'Kristallstaub',
  sand: 'leichter Sandwind',
};

/**
 * Die Tageszeit nach der Uhr des Geräts.
 * @param {number} [stunde] - zum Testen vorgebbar
 * @returns {'morgen'|'tag'|'abend'}
 */
export function tageszeitFuer(stunde = new Date().getHours()) {
  if (stunde >= 5 && stunde < 10) return 'morgen';
  if (stunde >= 10 && stunde < 18) return 'tag';
  return 'abend';
}

/** Würfelt einen Schlüssel aus { schluessel: gewicht }. */
function gewichtet(tabelle, zufall) {
  const eintraege = Object.entries(tabelle);
  const summe = eintraege.reduce((s, [, g]) => s + g, 0);
  let wurf = zufall() * summe;
  for (const [schluessel, gewicht] of eintraege) {
    wurf -= gewicht;
    if (wurf < 0) return schluessel;
  }
  return eintraege[0][0];
}

/**
 * Würfelt die Stimmung für einen Kampf: Variante, Wetter, Tageszeit.
 *
 * @param {object} welt - Eintrag aus js/data/worlds.js
 * @param {function} [zufall] - Zufallsquelle (für Tests)
 * @returns {{variante: string, variantenName: string, wetter: string, wetterName: string, tageszeit: string, tiere: string|null, voegel: boolean}}
 */
export function waehleStimmung(welt, zufall = Math.random, stunde) {
  const daten = STIMMUNGEN[welt?.id] ?? STIMMUNGEN[1];
  const [variante, variantenName] = daten.varianten[Math.floor(zufall() * daten.varianten.length)];
  const wetter = gewichtet(daten.wetter, zufall);
  return {
    variante,
    variantenName,
    wetter,
    wetterName: WETTER_NAMEN[wetter] ?? wetter,
    tageszeit: tageszeitFuer(stunde),
    tiere: daten.tiere,
    voegel: daten.voegel,
  };
}

/** Alle Stimmungen - für den Test, dass jede Welt drei Varianten hat. */
export const ALLE_STIMMUNGEN = STIMMUNGEN;

/* ------------------------------------------------------------------ */
/*  Aufbau im Kampf                                                    */
/* ------------------------------------------------------------------ */

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

/** Bausteine der drei Arena-Varianten (liegen in der Arena hinter den Figuren). */
function baueVariante(art) {
  switch (art) {
    case 'bach':
      return `
        <span class="umgebung-bach"><span class="umgebung-bach__glanz"></span></span>
        <span class="umgebung-kiesel" style="left:14%; top:71%"></span>
        <span class="umgebung-kiesel" style="left:83%; top:63%; --gr:0.8"></span>
        <span class="umgebung-kiesel" style="left:61%; top:75%; --gr:0.6"></span>
      `;
    case 'lichtung':
      return `
        <span class="umgebung-lichtstrahlen"></span>
        <span class="umgebung-stumpf" style="left:5%; top:62%"></span>
        <span class="umgebung-stein" style="left:86%; top:66%"></span>
        <span class="umgebung-stein" style="left:24%; top:57%; --gr:0.7"></span>
      `;
    default:
      return `
        <span class="umgebung-zaun"></span>
        <span class="umgebung-busch" style="left:4%; top:58%"></span>
        <span class="umgebung-busch" style="left:90%; top:60%; --gr:0.85"></span>
        <span class="umgebung-blume" style="left:40%; top:62%"></span>
        <span class="umgebung-blume" style="left:12%; top:76%; --farbe:#ffd36b"></span>
        <span class="umgebung-blume" style="left:78%; top:86%; --farbe:#9fd2ff"></span>
      `;
  }
}

/**
 * Baut Variante, Wetter, Licht und Tiere in den Kampfbildschirm.
 *
 * @param {HTMLElement} screen - der Kampfbildschirm
 * @param {HTMLElement} arena - die Arena (#arena)
 * @param {object} stimmung - aus waehleStimmung(), dazu boss: true im Bosskampf
 * @returns {{reagieren: function(number): void, aufraeumen: function(): void}}
 */
export function baueUmgebung(screen, arena, stimmung) {
  const timer = new Set();
  const bewegt = animationenAn();

  screen.classList.add(`tageszeit--${stimmung.tageszeit}`, `wetter--${stimmung.wetter}`, `variante--${stimmung.variante}`);
  // Bosskämpfe bekommen eine aufwendigere Arena: Glutfunken, ein
  // pulsierendes Licht hinter dem Boss und eine dunklere Stimmung.
  if (stimmung.boss) screen.classList.add('ist-bosskampf');

  // 1. Variante: liegt direkt hinter den Figuren (vor dem Boden).
  const variante = document.createElement('div');
  variante.className = `umgebung-variante umgebung-variante--${stimmung.variante}`;
  variante.innerHTML = baueVariante(stimmung.variante);
  // Im Bosskampf dreht sich hinter dem Boss ein Strahlenkranz.
  if (stimmung.boss) variante.insertAdjacentHTML('afterbegin', '<span class="umgebung-boss-licht"></span>');
  arena.querySelector('.arena__ring')?.after(variante);

  // 2. Licht und Wetter: eine Ebene über Himmel und Arena, unter den Leisten.
  const himmel = document.createElement('div');
  himmel.className = 'umgebung-himmel';
  himmel.setAttribute('aria-hidden', 'true');
  himmel.innerHTML = `
    <span class="umgebung-licht"></span>
    <span class="umgebung-wetter"></span>
    ${stimmung.tageszeit === 'abend' ? '<span class="umgebung-stern"></span><span class="umgebung-stern umgebung-stern--2"></span>' : ''}
    ${bewegt && (stimmung.wetter === 'glut' || stimmung.boss) ? Array.from({ length: 10 }, (_, i) => `<span class="umgebung-glut" style="left:${6 + i * 9.5}%; animation-delay:${(i * 0.7) % 4}s; animation-duration:${3.4 + (i % 3) * 0.8}s"></span>`).join('') : ''}

  `;
  screen.querySelector('.battlefield')?.after(himmel);

  // 3. Tiere: Falter oder Glühwürmchen, die man antippen kann.
  const tiere = [];
  if (stimmung.tiere) {
    const plaetze = [[10, 40], [86, 34], [70, 58]];
    plaetze.forEach(([links, oben], i) => {
      const tier = document.createElement('button');
      tier.type = 'button';
      tier.className = `umgebung-tier umgebung-tier--${stimmung.tiere}`;
      tier.dataset.klang = 'keiner';
      tier.setAttribute('aria-label', stimmung.tiere === 'falter' ? 'Schmetterling' : 'Glühwürmchen');
      tier.style.left = `${links}%`;
      tier.style.top = `${oben}%`;
      tier.style.animationDelay = `${-i * 1.3}s`;
      tier.innerHTML = '<span class="umgebung-tier__koerper"></span>';
      // Antippen: es flattert davon und kommt später wieder.
      tier.addEventListener('click', () => {
        if (tier.classList.contains('fliegt-weg')) return;
        tier.classList.add('fliegt-weg');
        const t = setTimeout(() => {
          tier.classList.remove('fliegt-weg');
          timer.delete(t);
        }, 9000);
        timer.add(t);
      });
      arena.appendChild(tier);
      tiere.push(tier);
    });
  }

  // 4. Ab und zu zieht ein Vogel durch den Himmel - rein dekorativ.
  if (stimmung.voegel && bewegt) {
    const vogel = document.createElement('span');
    vogel.className = 'umgebung-vogel';
    himmel.appendChild(vogel);
  }

  // 5. Geheimnis: Hinter einem Baum lugt manchmal ein kleines Wesen hervor.
  //    Antippen lässt es kichernd verschwinden. Keine Belohnung - nur Spaß.
  const wicht = document.createElement('button');
  wicht.type = 'button';
  wicht.className = 'umgebung-wicht';
  wicht.dataset.klang = 'keiner';
  wicht.setAttribute('aria-label', 'Ein kleines Wesen');
  wicht.innerHTML = '<span class="umgebung-wicht__augen"></span>';
  wicht.addEventListener('click', () => {
    wicht.classList.remove('ist-da');
    wicht.classList.add('huscht-weg');
    const t = setTimeout(() => {
      wicht.classList.remove('huscht-weg');
      timer.delete(t);
    }, 700);
    timer.add(t);
  });
  arena.appendChild(wicht);

  if (bewegt) {
    const lugen = () => {
      if (!screen.classList.contains('ist-pausiert')) wicht.classList.add('ist-da');
      const weg = setTimeout(() => {
        wicht.classList.remove('ist-da');
        timer.delete(weg);
      }, 2600);
      timer.add(weg);
    };
    // Selten genug, dass es eine Überraschung bleibt.
    const intervall = setInterval(lugen, 17000);
    timer.add({ intervall });
  }

  /**
   * Die Umgebung reagiert auf einen Treffer: Bäume, Büsche und Blumen
   * wackeln, Falter schrecken auf. Stärke 0..1 wie beim Beben.
   */
  let reaktionsTimer = null;
  function reagieren(staerke) {
    if (!bewegt) return;
    const klasse = staerke >= 0.18 ? 'umgebung-wackelt--stark' : 'umgebung-wackelt';
    arena.classList.remove('umgebung-wackelt', 'umgebung-wackelt--stark');
    void arena.offsetWidth;
    arena.classList.add(klasse);
    clearTimeout(reaktionsTimer);
    reaktionsTimer = setTimeout(() => arena.classList.remove(klasse), 700);
    if (staerke >= 0.18) {
      tiere.forEach((tier) => tier.classList.add('schreckt-auf'));
      const t = setTimeout(() => {
        tiere.forEach((tier) => tier.classList.remove('schreckt-auf'));
        timer.delete(t);
      }, 800);
      timer.add(t);
    }
  }

  function aufraeumen() {
    timer.forEach((t) => (t?.intervall ? clearInterval(t.intervall) : clearTimeout(t)));
    timer.clear();
    clearTimeout(reaktionsTimer);
  }

  return { reagieren, aufraeumen };
}
