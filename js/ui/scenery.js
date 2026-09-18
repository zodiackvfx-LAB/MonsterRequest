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
export function createScenery({ dimmed = false, skyOnly = false } = {}) {
  const scenery = document.createElement('div');
  scenery.className = 'scenery';
  if (dimmed) scenery.classList.add('scenery--gedimmt');

  const himmel = `
    <div class="scenery__sky"></div>
    <div class="scenery__sun"></div>
    <div class="scenery__cloud"></div>
    <div class="scenery__cloud"></div>
    <div class="scenery__cloud"></div>
  `;

  const landschaft = `
    <div class="scenery__mountains"></div>
    <div class="scenery__hills"></div>
    <div class="scenery__hills scenery__hills--second"></div>
    <div class="scenery__ground"></div>
  `;

  scenery.innerHTML = skyOnly ? himmel : himmel + landschaft;
  return scenery;
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

  // Die Farben kommen aus js/data/worlds.js und werden hier gesetzt.
  // So steht alles ueber eine Welt an einer Stelle.
  if (welt.farben) {
    Object.entries(FARB_NAMEN).forEach(([name, variable]) => {
      const wert = welt.farben[name];
      if (wert) screen.style.setProperty(variable, wert);
    });
  }

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
