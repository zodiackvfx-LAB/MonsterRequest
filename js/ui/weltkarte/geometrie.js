/**
 * Rechenhilfen für die Weltkarte - ohne HTML, ohne Browser.
 *
 * Alles hier arbeitet in "Karteneinheiten": Die Spur, auf der die Kämpfe
 * liegen, ist immer 1000 Einheiten breit. Wie viele Pixel das sind, legt
 * erst die Karte selbst fest (js/ui/weltkarte/karte.js).
 */

/**
 * Würfel mit festem Startwert. Dieselbe Welt sieht dadurch bei jedem Besuch
 * gleich aus - Bäume und Felsen springen nicht herum.
 *
 * @param {number} seed
 * @returns {() => number} liefert Zahlen von 0 (inklusive) bis 1 (exklusive)
 */
export function wuerfel(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Zufallszahl zwischen von und bis. */
export function zwischen(zufall, von, bis) {
  return von + (bis - von) * zufall();
}

/** Rundet auf eine Nachkommastelle - hält die SVG-Texte kurz. */
export function r(zahl) {
  return Math.round(zahl * 10) / 10;
}

/**
 * Weiche Kurve durch alle Punkte (Catmull-Rom, als Bézier-Stücke).
 *
 * @param {{x:number, y:number}[]} punkte
 * @param {number} [schritt] - Abstand der Proben in Einheiten
 * @returns {{d: string, proben: {x:number, y:number}[]}}
 *   d      - der Pfad für SVG (path d="...")
 *   proben - Punkte entlang der Kurve, für Abstände und Schnitte
 */
export function kurve(punkte, schritt = 8) {
  if (punkte.length < 2) {
    const p = punkte[0] ?? { x: 0, y: 0 };
    return { d: `M${r(p.x)} ${r(p.y)}`, proben: [p] };
  }
  let d = `M${r(punkte[0].x)} ${r(punkte[0].y)}`;
  const proben = [punkte[0]];

  for (let i = 0; i < punkte.length - 1; i++) {
    const p0 = punkte[i - 1] ?? punkte[i];
    const p1 = punkte[i];
    const p2 = punkte[i + 1];
    const p3 = punkte[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p2.x)} ${r(p2.y)}`;

    const laenge = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const stuecke = Math.max(2, Math.ceil(laenge / schritt));
    for (let s = 1; s <= stuecke; s++) {
      proben.push(bezierPunkt(p1, c1, c2, p2, s / stuecke));
    }
  }
  return { d, proben };
}

function bezierPunkt(a, b, c, d, t) {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
}

/** Kürzester Abstand eines Punktes zu einer Linie aus Proben. */
export function abstandZuLinie(p, proben) {
  let best = Infinity;
  for (let i = 0; i < proben.length - 1; i++) {
    best = Math.min(best, abstandZuStrecke(p, proben[i], proben[i + 1]));
  }
  if (proben.length === 1) best = Math.hypot(p.x - proben[0].x, p.y - proben[0].y);
  return best;
}

function abstandZuStrecke(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Alle Stellen, an denen sich zwei Linien aus Proben kreuzen. */
export function schnittpunkte(a, b) {
  const treffer = [];
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      const p = streckenSchnitt(a[i], a[i + 1], b[j], b[j + 1]);
      if (p) treffer.push(p);
    }
  }
  return treffer;
}

function streckenSchnitt(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (d === 0) return null;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

/**
 * Pfad als Zeichenkette in Pixeln statt Einheiten - für CSS offset-path,
 * das keine viewBox kennt.
 */
export function pfadInPixeln(proben, massstab) {
  return proben
    .map((p, i) => `${i ? 'L' : 'M'}${r(p.x * massstab)} ${r(p.y * massstab)}`)
    .join(' ');
}
