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
export function applyRegion(screen, region = 'wald') {
  if (region && region !== 'wald') screen.classList.add(`region--${region}`);
}

/**
 * Die Ebenen der Kampfarena: Hügel, Baumreihe, Wiese und Kampfplatz.
 *
 * Die Wiese läuft absichtlich über die Arena hinaus bis zum unteren
 * Bildschirmrand - dadurch wirkt der Kampf wie eine durchgehende Landschaft
 * und nicht wie ein Kasten.
 *
 * @param {number} [trees] - Anzahl der Bäume am Horizont
 * @returns {HTMLElement[]} Ebenen in der Reihenfolge von hinten nach vorn
 */
export function createArenaLayers(trees = 9) {
  const layers = document.createElement('div');
  layers.innerHTML = `
    <div class="arena__hills"></div>
    <div class="arena__ground"></div>
    <div class="arena__treeline">
      ${Array.from({ length: trees }, () => '<span class="arena__tree"></span>').join('')}
    </div>
    <div class="arena__ring"></div>
    <span class="arena__flower"></span>
    <span class="arena__flower"></span>
    <span class="arena__flower"></span>
    <span class="arena__flower"></span>
    <span class="arena__flower"></span>
  `;
  return [...layers.children];
}
