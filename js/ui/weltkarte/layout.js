/**
 * Plant eine Weltkarte: wo die Kämpfe liegen, wie der Weg verläuft, wo
 * Fluss, Wasserfall, Brücke, See, Bäume, Felsen und Blumen stehen.
 *
 * Das Ergebnis sind NUR Zahlen - gezeichnet wird in zeichnen.js. So lässt
 * sich die Planung ohne Browser testen (tests/weltkarte.test.mjs).
 *
 * Koordinaten in Karteneinheiten: Die Spur mit den Kämpfen ist 1000 breit.
 * Ist die Karte breiter (Tablet, Querformat), liegt die Spur in der Mitte
 * und links und rechts wächst die Landschaft einfach weiter.
 *
 * Kampf 1 liegt unten, der Boss oben - man wandert auf die Berge zu.
 */

import { abstandZuLinie, kurve, schnittpunkte, wuerfel, zwischen } from './geometrie.js';

/**
 * x-Position der Kämpfe auf der Spur (0 bis 1000), von unten nach oben.
 * Der Weg schlängelt sich, macht aber auch mal einen weiten Bogen - dort
 * passt dann eine Brücke über einen Fluss hin.
 */
const MUSTER = [330, 560, 760, 610, 300, 220, 470, 720, 790, 560, 300, 460, 700, 560, 380];

/** Senkrechter Abstand zweier Kämpfe in Einheiten. */
export const SCHRITT = 360;

/**
 * @param {object} o
 * @param {number} o.anzahl   - Kämpfe dieser Welt (der letzte ist der Boss)
 * @param {number} [o.breite] - Breite der Karte in Einheiten (mindestens 1000)
 * @param {number} o.oben     - Platz über dem Boss (Himmel, Berge, Horizont)
 * @param {number} o.unten    - Platz unter Kampf 1 (dort liegt die Kampfkarte)
 * @param {number} [o.seed]   - Startwert des Würfels
 * @param {object} [o.deko]   - welche Dinge die Welt hat (siehe js/data/weltkarten.js)
 * @param {{x:number, oben:number, unten:number}} [o.frei]
 *        Bereich um jede Station, der frei bleiben muss (Plattform, Sterne, Name)
 */
export function karteAnlegen({
  anzahl,
  breite = 1000,
  oben,
  unten,
  seed = 1,
  deko = {},
  frei = { x: 140, oben: 120, unten: 170 },
}) {
  const zufall = wuerfel(seed * 7919 + anzahl);
  const ox = (Math.max(1000, breite) - 1000) / 2;
  const hoehe = Math.round(oben + (anzahl - 1) * SCHRITT + unten);
  const horizont = Math.max(120, oben - 180);

  const stationen = [];
  for (let i = 0; i < anzahl; i++) {
    const istBoss = i === anzahl - 1;
    stationen.push({
      x: ox + (istBoss ? 500 : MUSTER[i % MUSTER.length]),
      y: hoehe - unten - i * SCHRITT,
    });
  }

  const karte = {
    breite: Math.max(1000, breite),
    hoehe,
    ox,
    horizont,
    stationen,
    fluesse: [],
    see: null,
    deko: [],
    vordergrund: [],
    frei,
  };

  // Erst Flüsse (sie verbiegen den Weg für ihre Brücke), dann der Weg.
  const bruecken = deko.fluss ? fluesseSuchen(karte, deko) : [];
  karte.weg = wegBauen(karte, bruecken);
  // Die Proben sind für die Prüfungen da, nicht zum Zeichnen.
  karte.fluesse = karte.fluesse.filter((fluss) => flussPasst(karte, fluss, karte.weg.proben));

  if (deko.see) karte.see = seeSuchen(karte, zufall);
  dekoVerteilen(karte, zufall, deko);
  vordergrundVerteilen(karte, zufall, deko);

  // Von hinten nach vorn sortiert: Was weiter unten steht, verdeckt das
  // Dahinterliegende - wie in echt.
  karte.deko.sort((a, b) => a.y - b.y);
  return karte;
}

/* ------------------------------------------------------------------ */
/*  Weg                                                                */
/* ------------------------------------------------------------------ */

/**
 * Der Weg läuft von unten ins Bild, durch alle Stationen und über jede
 * Brücke. Vor und hinter einer Brücke liegt er waagerecht - so schaut man
 * von vorn auf den Bogen der Brücke.
 */
function wegBauen(karte, bruecken) {
  const { stationen, hoehe } = karte;
  const punkte = [{ x: stationen[0].x - 70, y: hoehe + 60 }];
  stationen.forEach((station, i) => {
    punkte.push(station);
    const bruecke = bruecken.find((b) => b.nach === i);
    if (bruecke) punkte.push(bruecke.a, bruecke.b);
  });
  const weg = kurve(punkte, 6);

  // Abschnitte zwischen den Stationen - für "bis hierhin freigeschaltet".
  weg.abschnitte = [];
  for (let i = 0; i < stationen.length - 1; i++) {
    const teil = [stationen[i]];
    const bruecke = bruecken.find((b) => b.nach === i);
    if (bruecke) teil.push(bruecke.a, bruecke.b);
    teil.push(stationen[i + 1]);
    // Für weiche Übergänge die Nachbarn als Führung mitgeben.
    const vor = i === 0 ? punkte[0] : stationen[i - 1];
    const nach = stationen[i + 2] ?? stationen[i + 1];
    const voll = kurve([vor, ...teil, nach], 6);
    weg.abschnitte.push(ausschneiden(voll.proben, teil[0], teil[teil.length - 1]));
  }
  weg.bruecken = bruecken;
  return weg;
}

/** Schneidet aus einer Probenliste das Stück zwischen zwei Punkten aus. */
function ausschneiden(proben, von, bis) {
  const naechster = (p) =>
    proben.reduce((best, q, i) => (Math.hypot(q.x - p.x, q.y - p.y) < best.d ? { d: Math.hypot(q.x - p.x, q.y - p.y), i } : best), { d: Infinity, i: 0 }).i;
  const a = naechster(von);
  const b = naechster(bis);
  return proben.slice(Math.min(a, b), Math.max(a, b) + 1);
}

/* ------------------------------------------------------------------ */
/*  Fluss, Wasserfall, Brücke                                          */
/* ------------------------------------------------------------------ */

/**
 * Sucht Stellen, an denen ein Fluss den Weg genau einmal kreuzt.
 *
 * Der Fluss stürzt oben an der Seite über eine Felskante (Wasserfall),
 * schlängelt sich schräg über die Karte, läuft senkrecht unter der Brücke
 * durch und verlässt die Karte am anderen Rand. Passt eine Variante nicht
 * (zu nah an einer Station, kreuzt den Weg zweimal ...), wird die nächste
 * probiert. Passt keine, gibt es an dieser Stelle eben keinen Fluss.
 */
function fluesseSuchen(karte, deko) {
  const { stationen } = karte;
  const n = stationen.length;
  const wunschZahl = n >= 9 ? 2 : 1;
  const bruecken = [];

  // Kandidaten: Abschnitte mit weitem Seitwärtsbogen, nicht ganz am Anfang
  // und nicht direkt vor dem Boss.
  const kandidaten = [];
  for (let i = 1; i < n - 2; i++) {
    const dx = stationen[i + 1].x - stationen[i].x;
    if (Math.abs(dx) >= 200) kandidaten.push(i);
  }
  // Erst die Mitte des unteren Drittels, dann die des oberen.
  const ziele = [n * 0.3, n * 0.72];

  for (const ziel of ziele.slice(0, wunschZahl)) {
    const sortiert = [...kandidaten].sort((a, b) => Math.abs(a - ziel) - Math.abs(b - ziel));
    for (const i of sortiert) {
      if (bruecken.some((b) => Math.abs(b.nach - i) < 3)) continue;
      const versuch = flussVersuchen(karte, i, bruecken, deko);
      if (versuch) {
        bruecken.push(versuch.bruecke);
        karte.fluesse.push(versuch.fluss);
        break;
      }
    }
  }
  return bruecken;
}

function flussVersuchen(karte, i, bisher, deko) {
  const { stationen, breite, ox } = karte;
  const unten = stationen[i];
  const oben = stationen[i + 1];
  const seite = Math.sign(oben.x - unten.x); // wohin der Weg hier läuft
  const c = { x: (unten.x + oben.x) / 2, y: (unten.y + oben.y) / 2 };
  const bruecke = {
    nach: i,
    x: c.x,
    y: c.y,
    a: { x: c.x - seite * 78, y: c.y + 8 },
    b: { x: c.x + seite * 78, y: c.y - 8 },
  };

  for (const a1 of [330, 270, 210]) {
    for (const h1 of [520, 440, 380]) {
      for (const a2 of [320, 240]) {
        const fall = { x: clamp(c.x - seite * a1, ox + 70, ox + 930), y: c.y - h1 };
        const punkte = [
          fall,
          { x: c.x - seite * 50, y: c.y - 150 },
          { x: c.x - seite * 8, y: c.y - 40 },
          { x: c.x + seite * 8, y: c.y + 40 },
          { x: c.x + seite * 60, y: c.y + 150 },
          { x: c.x + seite * a2, y: c.y + 330 },
          { x: seite > 0 ? breite + 120 : -120, y: c.y + 470 },
        ];
        const fluss = {
          ...kurve(punkte, 8),
          punkte,
          seite,
          bruecke,
          wasserfall: deko.wasserfall ? { x: fall.x, y: fall.y, hoehe: 210, breite: 84 } : null,
        };
        // Über dem Wasserfall: ein kurzer Bach vom Kartenrand zur Kante.
        if (fluss.wasserfall) {
          const kante = fall.y - fluss.wasserfall.hoehe;
          fluss.quelle = kurve(
            [
              { x: seite > 0 ? -120 : breite + 120, y: kante - 160 },
              { x: fall.x - seite * 110, y: kante - 40 },
              { x: fall.x, y: kante + 4 },
            ],
            8
          );
          fluss.klippe = {
            x1: Math.min(fall.x - 170, seite > 0 ? -40 : fall.x - 170),
            x2: Math.max(fall.x + 170, seite > 0 ? fall.x + 170 : breite + 40),
            y1: kante - 20,
            y2: fall.y + 10,
          };
        }
        if (bisher.some((b) => Math.abs(b.y - c.y) < 700)) return null;
        // Schnelltest gegen einen Weg mit dieser Brücke.
        const probeWeg = wegBauen(karte, [...bisher, bruecke]);
        if (flussPasst(karte, fluss, probeWeg.proben)) return { fluss, bruecke };
      }
    }
  }
  return null;
}

/** Prüft, ob ein Fluss den Weg genau einmal (an seiner Brücke) kreuzt. */
function flussPasst(karte, fluss, wegProben) {
  const { stationen } = karte;
  const kreuzungen = zusammenfassen(schnittpunkte(fluss.proben, wegProben));
  if (kreuzungen.length !== 1) return false;
  const k = kreuzungen[0];
  if (Math.hypot(k.x - fluss.bruecke.x, k.y - fluss.bruecke.y) > 60) return false;

  // Stationen bleiben trocken.
  for (const s of stationen) {
    if (abstandZuLinie(s, fluss.proben) < 175) return false;
    if (fluss.quelle && abstandZuLinie(s, fluss.quelle.proben) < 175) return false;
  }
  // Außer an der Brücke hält der Fluss Abstand zum Weg.
  for (const p of wegProben) {
    if (Math.hypot(p.x - fluss.bruecke.x, p.y - fluss.bruecke.y) < 170) continue;
    if (abstandZuLinie(p, fluss.proben) < 75) return false;
    if (fluss.quelle && abstandZuLinie(p, fluss.quelle.proben) < 75) return false;
  }
  // Die Felskante mit dem Wasserfall darf weder Weg noch Station berühren.
  if (fluss.klippe) {
    const { x1, x2, y1, y2 } = fluss.klippe;
    const imKasten = (p, rand) => p.x > x1 - rand && p.x < x2 + rand && p.y > y1 - rand && p.y < y2 + rand;
    if (wegProben.some((p) => imKasten(p, 40))) return false;
    if (stationen.some((s) => imKasten(s, 120))) return false;
    if (y1 < karte.horizont + 60) return false;
  }
  return true;
}

/** Fasst Schnittpunkte zusammen, die praktisch an derselben Stelle liegen. */
function zusammenfassen(punkte) {
  const ergebnis = [];
  for (const p of punkte) {
    if (!ergebnis.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 30)) ergebnis.push(p);
  }
  return ergebnis;
}

/* ------------------------------------------------------------------ */
/*  See                                                                */
/* ------------------------------------------------------------------ */

function seeSuchen(karte, zufall) {
  let best = null;
  for (let v = 0; v < 260; v++) {
    const rx = zwischen(zufall, 130, 175);
    const ry = rx * 0.5;
    const p = {
      x: zwischen(zufall, karte.ox + 40, karte.ox + 960),
      y: zwischen(zufall, karte.horizont + 500, karte.hoehe - 260),
    };
    const wert = freiheit(karte, p, rx + 60);
    if (wert < 0) continue;
    // Lieber am Rand als in der Mitte.
    const randNaehe = Math.abs(p.x - karte.breite / 2);
    const punkte = wert + randNaehe * 0.2;
    if (!best || punkte > best.punkte) best = { x: p.x, y: p.y, rx, ry, punkte };
  }
  return best && { x: best.x, y: best.y, rx: best.rx, ry: best.ry };
}

/**
 * Wie viel Platz ist an diesem Punkt? Negativ = verboten (Weg, Station,
 * Fluss oder Klippe zu nah), sonst der Abstand zum Weg.
 */
function freiheit(karte, p, radius, wegRand = radius, { ohneStationen = false } = {}) {
  const { frei } = karte;
  for (const s of ohneStationen ? [] : karte.stationen) {
    const dx = Math.abs(p.x - s.x);
    const dy = p.y - s.y;
    if (dx < frei.x + radius * 0.8 && dy > -frei.oben - radius && dy < frei.unten + radius * 0.4) return -1;
  }
  const wegAbstand = abstandZuLinie(p, karte.weg.proben);
  if (wegAbstand < wegRand) return -1;
  for (const fluss of karte.fluesse) {
    if (abstandZuLinie(p, fluss.proben) < radius * 0.7 + 45) return -1;
    if (fluss.quelle && abstandZuLinie(p, fluss.quelle.proben) < radius * 0.7 + 40) return -1;
    if (fluss.klippe) {
      const { x1, x2, y1, y2 } = fluss.klippe;
      if (p.x > x1 - radius * 0.6 && p.x < x2 + radius * 0.6 && p.y > y1 - radius * 0.3 && p.y < y2 + radius * 0.9) return -1;
    }
    const b = fluss.bruecke;
    if (Math.hypot(p.x - b.x, p.y - b.y) < radius + 110) return -1;
  }
  if (karte.see) {
    const { x, y, rx, ry } = karte.see;
    const nx = (p.x - x) / (rx + radius * 0.8);
    const ny = (p.y - y) / (ry + radius * 0.5);
    if (nx * nx + ny * ny < 1) return -1;
  }
  return wegAbstand;
}

/* ------------------------------------------------------------------ */
/*  Bäume, Felsen, Blumen ...                                          */
/* ------------------------------------------------------------------ */

/**
 * Verteilt die Verzierung. Jede Art hat:
 *   radius - wie viel Platz sie braucht
 *   weg    - Mindestabstand zum Weg
 *   dichte - Anzahl je 1000 x 1000 Einheiten (aus den Weltdaten)
 *   rand   - Anteil, der bevorzugt an den Kartenrand gestellt wird
 */
const ARTEN = {
  baum: { radius: 110, weg: 150, rand: 0.75, abstand: 150 },
  bluetenbaum: { radius: 100, weg: 140, rand: 0.6, abstand: 150 },
  busch: { radius: 50, weg: 75, rand: 0.3, abstand: 70 },
  fels: { radius: 50, weg: 70, rand: 0.3, abstand: 80 },
  blumen: { radius: 60, weg: 42, rand: 0, abstand: 60 },
  gras: { radius: 18, weg: 34, rand: 0, abstand: 26 },
  pilze: { radius: 26, weg: 40, rand: 0.2, abstand: 50 },
  ruine: { radius: 95, weg: 135, rand: 0.5, abstand: 220 },
};

function dekoVerteilen(karte, zufall, deko) {
  const flaeche = (karte.breite * (karte.hoehe - karte.horizont)) / 1e6;
  const belegt = [];
  const platzFrei = (p, radius, abstand) =>
    belegt.every((b) => Math.hypot(b.x - p.x, (b.y - p.y) * 1.4) >= Math.max(abstand, b.abstand) * 0.5 + (radius + b.radius) * 0.5);

  // Feste Stücke zuerst: Ruine am Horizont, Laternen, Fahne, Zäune.
  if (deko.ruinen) {
    const boss = karte.stationen[karte.stationen.length - 1];
    const seite = boss.x > karte.breite / 2 ? -1 : 1;
    const p = { x: boss.x + seite * 300, y: karte.horizont + 150 };
    if (freiheit(karte, p, 80, 130) >= 0) {
      karte.deko.push({ art: 'tor', x: p.x, y: p.y, s: 1.15, v: 0 });
      belegt.push({ ...p, radius: 150, abstand: 200 });
    }
  }
  if (deko.fahne) {
    const boss = karte.stationen[karte.stationen.length - 1];
    for (const seite of [1, -1]) {
      const p = { x: boss.x + seite * 205, y: boss.y + 60 };
      if (abstandZuLinie(p, karte.weg.proben) > 60) {
        karte.deko.push({ art: 'fahne', x: p.x, y: p.y, s: 1, v: seite });
        belegt.push({ ...p, radius: 30, abstand: 60 });
        break;
      }
    }
  }
  if (deko.laternen) {
    // Eine Laterne am Anfang des Weges und danach an jeder vierten Station.
    karte.stationen.forEach((s, i) => {
      if (i === karte.stationen.length - 1 || i % 4 !== 0) return;
      for (const seite of [-1, 1]) {
        const p = { x: s.x + seite * 172, y: s.y + 60 };
        if (freiheit(karte, p, 20, 55, { ohneStationen: true }) < 0) continue;
        karte.deko.push({ art: 'laterne', x: p.x, y: p.y, s: 1, v: 0 });
        belegt.push({ ...p, radius: 30, abstand: 60 });
        break;
      }
    });
  }
  if (deko.zaeune) zaeuneSetzen(karte, zufall, belegt);

  const plan = [
    ['ruine', deko.ruinen ? 0.35 : 0],
    ['baum', deko.baeume ?? 0],
    ['bluetenbaum', deko.bluetenbaeume ?? 0],
    ['fels', deko.felsen ?? 0],
    ['busch', deko.buesche ?? 0],
    ['pilze', deko.pilze ?? 0],
    ['blumen', deko.blumen ?? 0],
    ['gras', deko.gras ?? 0],
  ];

  for (const [art, dichte] of plan) {
    const regel = ARTEN[art];
    const ziel = Math.round(dichte * flaeche);
    let gesetzt = 0;
    for (let v = 0; v < ziel * 30 && gesetzt < ziel; v++) {
      const amRand = zufall() < regel.rand;
      let x;
      if (amRand) {
        // Äußere Streifen: links oder rechts der Spur (auf breiten Karten
        // reicht das bis ganz an den Rand).
        const links = zufall() < 0.5;
        x = links ? zwischen(zufall, -40, karte.ox + 170) : zwischen(zufall, karte.ox + 830, karte.breite + 40);
      } else {
        x = zwischen(zufall, -20, karte.breite + 20);
      }
      const y = zwischen(zufall, karte.horizont + 90, karte.hoehe + 40);
      const s = zwischen(zufall, 0.8, 1.2);
      const radius = regel.radius * s;
      const p = { x, y };
      if (freiheit(karte, p, radius, regel.weg * (0.85 + s * 0.15)) < 0) continue;
      if (!platzFrei(p, radius, regel.abstand)) continue;
      const stueck = { art, x: Math.round(x), y: Math.round(y), s: Math.round(s * 100) / 100, v: Math.floor(zufall() * 1000) };
      // Jedes dritte Grasbüschel wiegt sich im Wind (js/ui/weltkarte/leben.js).
      if (art === 'gras' && gesetzt % 3 === 0) stueck.wiegt = true;
      karte.deko.push(stueck);
      belegt.push({ x, y, radius, abstand: regel.abstand });
      gesetzt++;
    }
  }

  // Schmetterlinge flattern über den Blumen, Glitzer schwebt bei Ruinen.
  karte.schmetterlinge = karte.deko
    .filter((d) => d.art === 'blumen')
    .filter((_, i) => i % 3 === 0)
    .map((d) => ({ x: d.x, y: d.y - 40 }));
}

/** Kurze Holzzäune neben dem Weg, je einer in jedem Drittel der Karte. */
function zaeuneSetzen(karte, zufall, belegt) {
  const proben = karte.weg.proben;
  const zahl = Math.max(2, Math.round(karte.stationen.length / 4));
  for (let z = 0; z < zahl; z++) {
    for (let versuch = 0; versuch < 40; versuch++) {
      const i = Math.floor(zwischen(zufall, 0.08, 0.92) * (proben.length - 12));
      const a = proben[i];
      const b = proben[i + 10];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l = Math.hypot(dx, dy) || 1;
      const seite = zufall() < 0.5 ? 1 : -1;
      const nx = (-dy / l) * seite * 62;
      const ny = (dx / l) * seite * 62;
      const p = { x: a.x + nx, y: a.y + ny };
      if (freiheit(karte, p, 40, 50) < 0) continue;
      if (belegt.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 160)) continue;
      // Ein steiler Zaun sähe von schräg oben komisch aus - nur flache Stücke.
      const winkel = (Math.atan2(dy, dx) * 180) / Math.PI;
      const flach = ((winkel + 360) % 180);
      if (flach > 50 && flach < 130) continue;
      karte.deko.push({ art: 'zaun', x: Math.round(p.x), y: Math.round(p.y), s: 1, v: Math.round(winkel > 90 || winkel < -90 ? winkel + 180 : winkel) });
      belegt.push({ ...p, radius: 60, abstand: 120 });
      break;
    }
  }
}

/**
 * Große, unscharfe Blätter und Blüten ganz vorn am Bildrand. Sie bewegen
 * sich beim Scrollen schneller als die Karte - das gibt Tiefe.
 */
function vordergrundVerteilen(karte, zufall, deko) {
  if (!deko.vordergrund) return;
  let y = karte.horizont + 600;
  let links = zufall() < 0.5;
  while (y < karte.hoehe) {
    karte.vordergrund.push({
      x: links ? 0 : karte.breite,
      y: Math.round(y),
      s: Math.round(zwischen(zufall, 0.85, 1.25) * 100) / 100,
      v: Math.floor(zufall() * 1000),
      seite: links ? -1 : 1,
    });
    y += zwischen(zufall, 650, 950);
    links = !links;
  }
}

function clamp(wert, min, max) {
  return Math.max(min, Math.min(max, wert));
}
