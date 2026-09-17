/**
 * Baut die Hintergrund-Kulisse eines Bildschirms.
 *
 * Die Kulisse besteht aus Ebenen (Himmel, Sonne, Wolken, Berge, Hügel, Boden),
 * die in css/scenery.css gestaltet sind. Willst du später echte Grafiken
 * statt CSS verwenden, tauschst du dort den Hintergrund einer Ebene aus -
 * dieser Code bleibt gleich.
 *
 * @param {object} options
 * @param {string} [options.region]  - 'wald' | 'sumpf' | 'vulkan' (siehe scenery.css)
 * @param {boolean} [options.dimmed] - true = abgedunkelt, damit Menüs lesbar bleiben
 * @returns {HTMLElement}
 */
export function createScenery({ region = 'wald', dimmed = false } = {}) {
  const scenery = document.createElement('div');
  scenery.className = 'scenery';
  if (region !== 'wald') scenery.classList.add(`scenery--${region}`);
  if (dimmed) scenery.classList.add('scenery--gedimmt');

  scenery.innerHTML = `
    <div class="scenery__sky"></div>
    <div class="scenery__sun"></div>
    <div class="scenery__cloud"></div>
    <div class="scenery__cloud"></div>
    <div class="scenery__cloud"></div>
    <div class="scenery__mountains"></div>
    <div class="scenery__hills"></div>
    <div class="scenery__hills scenery__hills--second"></div>
    <div class="scenery__ground"></div>
  `;

  return scenery;
}
