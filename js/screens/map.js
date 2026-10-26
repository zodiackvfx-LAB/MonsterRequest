/**
 * Weltkarte einer Welt: eine lebendige Landschaft, durch die ein goldener
 * Lichtpfad von Kampf zu Kampf führt - unten Kampf 1, oben der Boss.
 *
 * Dieser Bildschirm verbindet nur Spielstand und Darstellung:
 *   - welche Kämpfe offen, geschafft, mit wie vielen Sternen (core/state.js)
 *   - gezeichnet wird in js/ui/weltkarte/ (Landschaft, Stationen, Leben)
 *   - wie eine Welt aussieht, steht in js/data/weltkarten.js
 *
 * Kopfleiste und Kampfkarte liegen fest über der Karte; die Karte selbst
 * scrollt darunter durch.
 */

import { showScreen } from '../core/screens.js';
import { levelsOfWorld } from '../data/levels.js';
import { getWorld } from '../data/worlds.js';
import { getEnemy } from '../data/enemies.js';
import { kartenThema } from '../data/weltkarten.js';
import { applyRegion } from '../ui/scenery.js';
import { weltTeilchen } from '../ui/effekte.js';
import { weltkarteBauen } from '../ui/weltkarte/karte.js';
import { stationsDefs } from '../ui/weltkarte/station.js';
import { kampfkarteBauen, kopfleisteBauen } from '../ui/weltkarte/rahmen.js';
import { leistungPruefen, qualitaetErmitteln, teilchenAnlegen } from '../ui/weltkarte/leben.js';
import { getStars, getTotalStars, isLevelCleared, isLevelUnlocked, nextLevelOf, gameState } from '../core/state.js';

/**
 * Was die Karte beim letzten Besuch gezeigt hat - nur im Speicher, nicht im
 * Spielstand. Daran erkennt sie neue Sterne und frisch freigeschaltete
 * Kämpfe und spielt dafür eine kleine Animation.
 */
const zuletztGesehen = new Map();

let aufraeumen = () => {};

export const mapScreen = {
  // Auf der Karte läuft schon die Musik der Welt.
  musik: (params) => getWorld(Number(params.worldId) || gameState.unlockedWorld)?.music ?? 'menue',

  mount(root, params = {}) {
    const worldId = Number(params.worldId) || gameState.unlockedWorld;
    const world = getWorld(worldId);
    if (!world) throw new Error(`Welt ${worldId} gibt es nicht (siehe js/data/worlds.js)`);

    const thema = kartenThema(world);
    const levels = levelsOfWorld(worldId);
    const current = nextLevelOf(worldId);
    let stufe = qualitaetErmitteln();

    const screen = document.createElement('div');
    screen.className = `screen screen--map wk wk--${stufe}`;
    applyRegion(screen, world.scenery, world);
    screen.insertAdjacentHTML('afterbegin', stationsDefs());

    const scroller = document.createElement('div');
    scroller.className = 'wk-scroll';
    screen.appendChild(scroller);

    const teilchen = document.createElement('div');
    teilchen.className = 'wk-teilchen-ebene';
    teilchen.setAttribute('aria-hidden', 'true');
    screen.appendChild(teilchen);

    const kopf = kopfleisteBauen({
      welt: world,
      sterne: getTotalStars(worldId),
      sterneMax: levels.length * 3,
      zuWelten: () => showScreen('worlds'),
      zuRangliste: () => showScreen('rangliste'),
      zuShop: () => showScreen('shop'),
    });
    screen.appendChild(kopf);

    let selected = null;
    const fuss = kampfkarteBauen({
      zurueck: () => showScreen('start'),
      starten: () => {
        if (selected) showScreen('battle', { levelId: selected.id });
      },
    });
    screen.appendChild(fuss.element);
    root.appendChild(screen);

    /* ---------- Karte bauen (und bei Größenänderung neu) ---------- */
    const zustand = (level) => ({
      offen: isLevelUnlocked(level.id),
      geschafft: isLevelCleared(level.id),
      sterne: getStars(level.id),
    });
    let karte = null;

    function verdeckt() {
      const b = screen.getBoundingClientRect();
      return {
        oben: kopf.getBoundingClientRect().bottom - b.top,
        unten: b.bottom - fuss.element.getBoundingClientRect().top,
      };
    }

    function bauen() {
      const anteil = karte ? scroller.scrollTop / Math.max(1, scroller.scrollHeight) : null;
      karte?.aufraeumen();
      const { oben, unten } = verdeckt();
      karte = weltkarteBauen({
        scroller,
        welt: world,
        thema,
        levels,
        gegnerVon: (level) => getEnemy(level.enemyId),
        zustand,
        aktuellId: current?.id ?? null,
        obenPx: oben,
        untenPx: unten,
        stufe,
        beiWahl: (level) => waehlen(level, true),
      });
      if (selected) markieren(selected);
      if (anteil !== null) scroller.scrollTop = anteil * scroller.scrollHeight;
    }

    function markieren(level) {
      karte.knoepfe.forEach((knopf, id) => knopf.classList.toggle('ist-gewaehlt', id === level.id));
    }

    function waehlen(level, durchTipp) {
      selected = level;
      fuss.zeigen(level, getEnemy(level.enemyId), levels.length);
      markieren(level);
      if (durchTipp) {
        const knopf = karte.knoepfe.get(level.id);
        knopf.classList.remove('ist-angetippt');
        void knopf.offsetWidth;
        knopf.classList.add('ist-angetippt');
      }
    }

    bauen();

    const preselect = current ?? levels.findLast((level) => isLevelUnlocked(level.id)) ?? null;
    if (preselect) {
      waehlen(preselect, false);
      karte.zeigeStation(preselect.id);
    } else {
      fuss.leeren();
      scroller.scrollTop = scroller.scrollHeight;
    }

    neuesFeiern(levels, karte);
    teilchenAnlegen(teilchen, thema, stufe);
    // Beim Betreten weht kurz ein Schwall Teilchen der Welt über die Karte.
    weltTeilchen(screen, world.id);

    // Ruckelt es, schalten wir die teuren Effekte ab und bauen neu.
    const pruefungStop =
      stufe === 'hoch'
        ? leistungPruefen((neu) => {
            stufe = neu;
            screen.classList.replace('wk--hoch', `wk--${neu}`);
            bauen();
          })
        : () => {};

    // Dreht man das Gerät oder ändert die Fenstergröße, passt die Karte sich an.
    let letzteBreite = scroller.clientWidth;
    let timer = 0;
    const beobachter = new ResizeObserver(() => {
      if (Math.abs(scroller.clientWidth - letzteBreite) < 2) return;
      letzteBreite = scroller.clientWidth;
      clearTimeout(timer);
      timer = setTimeout(bauen, 150);
    });
    beobachter.observe(scroller);

    aufraeumen = () => {
      pruefungStop();
      beobachter.disconnect();
      clearTimeout(timer);
      karte?.aufraeumen();
    };
  },

  unmount() {
    aufraeumen();
    aufraeumen = () => {};
  },
};

/**
 * Vergleicht mit dem letzten Besuch: Neue Sterne ploppen golden auf,
 * frisch freigeschaltete Kämpfe sprühen kurz Funken. Beim allerersten
 * Besuch einer Welt wird nichts gefeiert - da ist alles "neu".
 */
function neuesFeiern(levels, karte) {
  levels.forEach((level) => {
    const jetzt = { offen: isLevelUnlocked(level.id), sterne: getStars(level.id) };
    const vorher = zuletztGesehen.get(level.id);
    zuletztGesehen.set(level.id, jetzt);
    if (!vorher) return;
    const knopf = karte.knoepfe.get(level.id);
    if (jetzt.offen && !vorher.offen) knopf.classList.add('ist-neu-frei');
    if (jetzt.sterne > vorher.sterne) {
      knopf.querySelectorAll('.station__stern.ist-an').forEach((stern) => {
        if (Number(stern.dataset.i) >= vorher.sterne) stern.classList.add('ist-neu');
      });
      knopf.classList.add('ist-neue-sterne');
    }
  });
}
