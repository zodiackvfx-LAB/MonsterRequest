/**
 * Baut die Hintergrund-Kulisse eines Bildschirms.
 *
 * Die Kulisse besteht aus Ebenen (Himmel, Sonne, Wolken, Berge, Hügel, Boden),
 * die in css/scenery.css gestaltet sind. Willst du später echte Grafiken
 * statt CSS verwenden, tauschst du dort den Hintergrund einer Ebene aus -
 * dieser Code bleibt gleich.
 *
 * @param {object} options
 * @param {boolean} [options.dimmed]  - true = abgedunkelt, damit Menüs lesbar bleiben
 * @param {boolean} [options.skyOnly] - true = nur Himmel, Sonne und Wolken.
 *        Das nutzt der Kampfbildschirm: dort bringt die Arena ihren eigenen
 *        Boden mit, und zwei Horizonte würden sich beißen.
 * @returns {HTMLElement}
 */
export function createScenery({ dimmed = false, skyOnly = false, deko = false } = {}) {
  const scenery = document.createElement('div');
  scenery.className = 'scenery';
  if (dimmed) scenery.classList.add('scenery--gedimmt');

  const himmel = `
    <div class="scenery__sky"></div>
    <div class="scenery__strahlen"></div>
    <div class="scenery__sun"></div>
    <div class="scenery__cloud"></div>
    <div class="scenery__cloud"></div>
    <div class="scenery__cloud"></div>
  `;

  // Zwei Bergreihen statt einer: die hintere ist heller und etwas versetzt.
  // Das gibt Tiefe, ohne dass die Berge auffälliger werden.
  const landschaft = `
    <div class="scenery__mountains scenery__mountains--fern"></div>
    <div class="scenery__mountains"></div>
    <div class="scenery__hills"></div>
    <div class="scenery__hills scenery__hills--second"></div>
    <div class="scenery__ground"></div>
  `;

  scenery.innerHTML = skyOnly ? himmel : himmel + landschaft;
  if (deko && !skyOnly) scenery.appendChild(wiesenDeko());

  return scenery;
}

/**
 * Die Verzierung der "Verzauberten Wiese": Grasbüschel, Blumen, Steine,
 * ein paar Kristalle und schwebende Lichtpunkte.
 *
 * Die Plätze sind FEST eingetragen und nicht gewürfelt. Zwei Gründe:
 * Die Wiese soll aufgeräumt aussehen statt zufällig, und der Bereich in der
 * Mitte bleibt frei - dort steht die Figur, und nichts darf sie verdecken.
 *
 * Jeder Eintrag: [Klasse, Abstand von links in %, Abstand von unten in %, Größe]
 *
 * Die Zahlen sind auf die Lobby abgestimmt: Die Wiese ist nur zwischen
 * 40 und 48 Prozent Hoehe frei - darunter liegen Aufgabenbanner, Startknopf
 * und Menue, darueber beginnt der Himmel.
 */
const WIESE = [
  // Links neben Timo. Die Hoehe folgt der Kuppe des Huegels: aussen
  // liegt sie tiefer, zur Mitte hin hoeher.
  ['gras', 6, 43.6, 1.15],
  ['kristall', 11, 44.9, 0.9],
  ['blume', 16, 45.7, 1],
  ['gras', 21, 46.3, 0.95],
  ['stein', 26, 46.8, 0.9],
  // Rechts gespiegelt.
  ['gras', 94, 43.6, 1.15],
  ['kristall', 89, 44.9, 0.9],
  ['blume', 84, 45.7, 1],
  ['gras', 79, 46.3, 0.95],
  ['stein', 74, 46.8, 0.9],
];

/**
 * Schwebende Lichtpunkte, [von links %, von unten %].
 *
 * Nur am linken und rechten Rand: Timo steht zwischen 28 und 72 Prozent,
 * und vor seinem Gesicht soll nichts schweben.
 */
const FUNKEN = [
  [6, 52], [14, 58], [22, 55], [11, 65],
  [94, 52], [86, 58], [78, 55], [89, 65],
];

function wiesenDeko() {
  const deko = document.createElement('div');
  deko.className = 'scenery__deko';

  // Zwei Zusatzklassen, damit enge Bildschirme einzelne Stuecke ausblenden
  // koennen: "rechts" (im Querformat liegt dort die Knopfspalte) und
  // "aussen" (die untersten Stuecke, die auf kurzen Bildschirmen hinter
  // dem Aufgabenbanner verschwinden wuerden).
  deko.innerHTML =
    WIESE.map(([art, links, unten, groesse], i) => {
      const seite = links > 50 ? ' deko--rechts' : '';
      const aussen = links < 8 || links > 92 ? ' deko--aussen' : '';
      return `<span class="deko deko--${art}${seite}${aussen}" style="left:${links}%; bottom:${unten}%; --gr:${groesse}"></span>`;
    }).join('') +
    FUNKEN.map(
      ([links, unten], i) =>
        `<span class="funke${links > 50 ? ' funke--rechts' : ''}" style="left:${links}%; bottom:${unten}%; animation-delay:${i * 0.9}s"></span>`
    ).join('') +
    // Zwei Blätter, die gemächlich vorbeiziehen.
    '<span class="blatt blatt--1"></span><span class="blatt blatt--2"></span>';

  return deko;
}

/**
 * Setzt die Farbwelt einer Region auf einen Bildschirm.
 *
 * Die Klasse gehört auf den Bildschirm und nicht auf die Kulisse, damit
 * Kulisse UND Arena dieselben Farben erben (siehe .region--... in
 * css/scenery.css).
 *
 * @param {HTMLElement} screen
 * @param {string} region - 'wald' (Standard) | 'sumpf' | 'vulkan'
 */
export function applyRegion(screen, region = 'wald', welt = null) {
  // Die Form der Kulisse (Tannen, Kristalle, Kakteen) kommt aus dem CSS.
  if (region && region !== 'wald') screen.classList.add(`region--${region}`);

  if (!welt) return;

  applyWorldColors(screen, welt);

  // Eigenes Hintergrundbild statt der gezeichneten Kulisse.
  if (welt.hintergrund) {
    // Die Adresse wird hier zur vollen Adresse gemacht. Grund: Ein url() in
    // einer CSS-Variablen rechnet vom STYLESHEET aus, nicht von der Seite -
    // 'bilder/welten/x.png' waere sonst 'css/bilder/welten/x.png' geworden.
    const adresse = new URL(welt.hintergrund, document.baseURI).href;
    screen.style.setProperty('--welt-bild', `url("${adresse}")`);
    screen.classList.add('region--eigenes-bild');
  }
}

/**
 * Setzt nur die Farben einer Welt auf ein beliebiges Element.
 *
 * Gebraucht wird das ueberall dort, wo eine Welt in klein vorkommt -
 * zum Beispiel die Vorschau auf einer Weltkarte in der Weltauswahl.
 * Ohne diesen Aufruf wuerde jede Vorschau die Standardfarben zeigen
 * und alle Welten saehen gleich aus.
 *
 * @param {HTMLElement} el
 * @param {object} welt - ein Eintrag aus js/data/worlds.js
 */
export function applyWorldColors(el, welt) {
  if (!welt || !welt.farben) return;
  Object.entries(FARB_NAMEN).forEach(([name, variable]) => {
    const wert = welt.farben[name];
    if (wert) el.style.setProperty(variable, wert);
  });
}

/**
 * Welcher Farbname aus worlds.js gehoert zu welcher CSS-Variablen.
 * Die deutschen Namen stehen in der Datendatei, die CSS-Variablen im
 * Stylesheet - hier treffen sich beide.
 */
const FARB_NAMEN = {
  himmelOben: '--s-sky-top',
  himmelUnten: '--s-sky-bottom',
  wiese: '--s-grass',
  wieseDunkel: '--s-grass-dark',
  wieseHell: '--s-grass-light',
  fels: '--s-rock',
  felsDunkel: '--s-rock-dark',
  baum: '--s-tree',
  baumDunkel: '--s-tree-dark',
  schnee: '--snow',
};

/**
 * Die Ebenen der Kampfarena: Hügel, Baumreihe, Wiese und Kampfplatz.
 *
 * Die Wiese läuft absichtlich über die Arena hinaus bis zum unteren
 * Bildschirmrand - dadurch wirkt der Kampf wie eine durchgehende Landschaft
 * und nicht wie ein Kasten.
 *
 * Die Bäume stehen in zwei Reihen: kleine, blasse Tannen am Horizont
 * (hinter der Wiese) und wenige große weiter vorn (vor der Wiese, mit
 * sichtbarem Stamm). Das ergibt die Tiefenwirkung.
 *
 * @param {number} [farTrees] - Anzahl der Bäume in der hinteren Reihe
 * @returns {HTMLElement[]} Ebenen in der Reihenfolge von hinten nach vorn
 */
export function createArenaLayers(farTrees = 11) {
  const layers = document.createElement('div');
  layers.innerHTML = `
    <div class="arena__hills"></div>
    <div class="arena__treeline arena__treeline--fern">${trees(farTrees)}</div>
    <div class="arena__ground"></div>
    <div class="arena__ring"></div>
    <div class="arena__treeline arena__treeline--nah">${trees(3)}</div>
    <span class="arena__flower"></span>
    <span class="arena__flower"></span>
    <span class="arena__flower"></span>
    <span class="arena__flower"></span>
    <span class="arena__flower"></span>
  `;
  return [...layers.children];
}

/** Eine Tanne besteht aus Stamm und Krone - die Krone wird beschnitten,
 *  der Stamm nicht. Deshalb sind es zwei getrennte Teile. */
function trees(count) {
  return Array.from(
    { length: count },
    () => '<span class="arena__tree"><span class="arena__tree-trunk"></span><span class="arena__tree-top"></span></span>'
  ).join('');
}
