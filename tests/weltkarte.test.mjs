/**
 * Test der Weltkarte - ohne Browser, direkt mit Node ausführbar:
 *
 *     node tests/weltkarte.test.mjs
 *
 * Geprüft wird die Planung der Karte (js/ui/weltkarte/layout.js) und dass
 * für jede Welt eine fehlerfreie Landschaft entsteht: Stationen liegen auf
 * der Karte, der Fluss kreuzt den Weg genau einmal an seiner Brücke, keine
 * Verzierung steht auf einer Station, und in den Zeichnungen steckt keine
 * kaputte Zahl oder Farbe.
 */

import { WORLDS, fightsInWorld } from '../js/data/worlds.js';
import { kartenThema, mischen } from '../js/data/weltkarten.js';
import { karteAnlegen, SCHRITT } from '../js/ui/weltkarte/layout.js';
import { abstandZuLinie, schnittpunkte } from '../js/ui/weltkarte/geometrie.js';
import { bodenZeichnen, defsZeichnen, hintergrundZeichnen } from '../js/ui/weltkarte/zeichnen.js';
import { hatEigeneSzene, szeneZeichnen } from '../js/ui/weltbilder/szenen.js';
import { hintergrundZeichnen as weltenHintergrund } from '../js/ui/weltbilder/hintergrund.js';
import { eindeutig } from '../js/ui/weltbilder/karten.js';

let bestanden = 0;
let fehler = 0;

function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    bestanden++;
    console.log(`  ok   ${beschreibung}`);
  } else {
    fehler++;
    console.log(`  FEHL ${beschreibung}`);
  }
}

/** Dieselben Maße, die das Spiel auf einem iPhone (390 px breit) nutzt. */
function karteFuer(welt, breitePx = 390) {
  const m = Math.min(breitePx, 560) / 1000;
  const station = 101;
  const thema = kartenThema(welt);
  const frei = { x: (station * 0.6) / m + 10, oben: (station * 0.62) / m, unten: (station * 0.5 + 34) / m };
  const karte = karteAnlegen({
    anzahl: fightsInWorld(welt),
    breite: breitePx / m,
    oben: (160 + 400) / m,
    unten: (260 + station * 1.05 + 16) / m,
    seed: welt.id,
    deko: thema.deko,
    frei,
  });
  return { karte, thema, frei };
}

console.log('\nThemen');
pruefe('Farben mischen: Kurzschreibweise (#fff) geht auch', mischen('#000000', '#fff', 0.5) === '#808080');
for (const welt of WORLDS) {
  const thema = kartenThema(welt);
  const kaputt = Object.entries(thema.farben).filter(([, wert]) =>
    Array.isArray(wert) ? wert.some((f) => !/^#[0-9a-f]{6}$/i.test(f)) : !/^#[0-9a-f]{6}$/i.test(wert)
  );
  pruefe(`Welt ${welt.id} (${welt.name}): alle Kartenfarben sind gültig`, kaputt.length === 0);
}
pruefe('Grünes Tal ist vollständig ausgestaltet', kartenThema(WORLDS[0]).ausgearbeitet);

console.log('\nPlanung');
for (const welt of WORLDS) {
  for (const breite of [390, 1180]) {
    const { karte, frei } = karteFuer(welt, breite);
    const n = fightsInWorld(welt);
    const name = `Welt ${welt.id}, ${breite} px`;

    pruefe(`${name}: eine Station je Kampf`, karte.stationen.length === n);
    pruefe(
      `${name}: alle Stationen liegen auf der Karte`,
      karte.stationen.every((s) => s.x > 0 && s.x < karte.breite && s.y > karte.horizont && s.y < karte.hoehe)
    );
    pruefe(
      `${name}: Kampf 1 unten, Boss oben, gleichmäßiger Abstand`,
      karte.stationen.every((s, i) => i === 0 || Math.abs(karte.stationen[i - 1].y - s.y - SCHRITT) < 0.01)
    );
    pruefe(
      `${name}: der Weg führt durch jede Station`,
      karte.stationen.every((s) => abstandZuLinie(s, karte.weg.proben) < 1)
    );
    pruefe(`${name}: ein Wegstück zwischen je zwei Stationen`, karte.weg.abschnitte.length === n - 1);

    for (const fluss of karte.fluesse) {
      const kreuzungen = schnittpunkte(fluss.proben, karte.weg.proben).filter(
        (p, i, alle) => alle.findIndex((q) => Math.hypot(q.x - p.x, q.y - p.y) < 30) === i
      );
      pruefe(`${name}: der Fluss kreuzt den Weg genau einmal`, kreuzungen.length === 1);
      pruefe(
        `${name}: ... und zwar an der Brücke`,
        kreuzungen.length === 1 && Math.hypot(kreuzungen[0].x - fluss.bruecke.x, kreuzungen[0].y - fluss.bruecke.y) < 60
      );
      pruefe(
        `${name}: keine Station steht im Fluss`,
        karte.stationen.every((s) => abstandZuLinie(s, fluss.proben) > 150)
      );
    }

    const aufStation = karte.deko.filter((d) =>
      ['baum', 'bluetenbaum', 'fels', 'busch', 'ruine', 'tor'].includes(d.art) &&
      karte.stationen.some((s) => Math.abs(d.x - s.x) < frei.x && d.y - s.y > -frei.oben && d.y - s.y < frei.unten)
    );
    pruefe(`${name}: keine Bäume, Felsen oder Ruinen auf einer Station`, aufStation.length === 0);
    pruefe(`${name}: die Karte ist nicht leer`, karte.deko.filter((d) => d.art === 'baum').length >= 5);
  }
}

const a = karteFuer(WORLDS[0]).karte;
const b = karteFuer(WORLDS[0]).karte;
pruefe('Dieselbe Welt sieht bei jedem Besuch gleich aus', JSON.stringify(a.deko) === JSON.stringify(b.deko));
pruefe('Grünes Tal hat Fluss, Wasserfall, Brücke und See', a.fluesse.length >= 1 && a.fluesse[0].wasserfall && a.see);

console.log('\nZeichnungen');
for (const welt of WORLDS) {
  const { karte, thema } = karteFuer(welt);
  const svg =
    defsZeichnen(karte, thema.farben) +
    hintergrundZeichnen(karte, thema.farben, thema).svg +
    bodenZeichnen(karte, thema.farben, thema).map((t) => t.svg).join('');
  pruefe(`Welt ${welt.id}: keine kaputten Zahlen oder Farben im Bild`, !/NaN|undefined|Infinity/.test(svg));
}

console.log('\nWeltenauswahl');
for (const welt of WORLDS) {
  const { bild, leben } = szeneZeichnen(welt);
  pruefe(`Welt ${welt.id} (${welt.name}): eigene Landschaft`, hatEigeneSzene(welt.id));
  pruefe(`Welt ${welt.id}: Landschaft ohne kaputte Zahlen`, !/NaN|undefined|Infinity/.test(bild + leben) && bild.length > 2000);
  pruefe(`Welt ${welt.id}: es bewegt sich etwas`, /class="wb-/.test(leben));
}
const zweiMal = eindeutig('<g id="a"/><path fill="url(#a)"/>', 'w1-');
pruefe('Ids der bewegten Ebene werden je Karte eindeutig', zweiMal === '<g id="w1-a"/><path fill="url(#w1-a)"/>');
const hg = weltenHintergrund();
pruefe('Hintergrund der Weltenauswahl: alle Ebenen ohne kaputte Zahlen', !/NaN|undefined/.test(hg.himmel + hg.land + hg.vorn + hg.leben));

console.log(`\n${bestanden} bestanden, ${fehler} fehlgeschlagen\n`);
process.exit(fehler > 0 ? 1 : 0);
