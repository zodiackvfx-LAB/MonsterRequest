/**
 * Baut Skins aus dem Skin-Studio ins Spiel ein - für alle Spieler.
 *
 * Im Skin-Studio (werkstatt.html) entstehen Skins mit Farbe, Muster und Hut.
 * "Skin-Paket herunterladen" speichert sie als JSON-Datei. Dieses Werkzeug
 * macht daraus echte Skins:
 *
 *   1. Für jeden Skin werden alle 14 Posen von Timo gebaut - mit demselben
 *      Code wie im Studio (js/core/outfit.js), also genau so, wie es dort
 *      in der Vorschau aussah.
 *   2. Die Bilder landen in bilder/timo/skins/<ordner>/.
 *   3. Der Skin wird in js/data/studio-skins.js eingetragen. Von dort holt
 *      ihn js/data/items.js in SKINS - damit gibt es ihn in Truhen, in der
 *      Sammlung und unter Figur -> Aussehen, mit der gewählten Seltenheit.
 *
 * Ein Skin mit demselben Namen wie ein schon eingebauter ersetzt diesen
 * (zum Nachbessern). Danach: Tests laufen lassen, sw.js-Version erhöhen,
 * dist neu bauen (node werkzeuge/eine-datei-bauen.mjs).
 *
 * Aufruf (im Projektordner):
 *   node werkzeuge/skins-einbauen.mjs monsterquest-skins-2026-10-14.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { POSEN, importBildSaeubern, outfitBauen } from '../js/core/outfit.js';
import { pngAusAdresse, pngLesen, pngSchreiben } from './png.mjs';

const WURZEL = new URL('..', import.meta.url).pathname;
const ZIEL_DATEI = join(WURZEL, 'js/data/studio-skins.js');
const SELTENHEITEN = ['gewoehnlich', 'selten', 'episch', 'legendaer'];

/** Diese Ordner gehören den festen Outfits (werkzeuge/timo-skins-bauen.py). */
const BELEGT = ['winter', 'koenig', 'zauberer', 'cowboy', 'wikinger', 'ninja', 'sportler'];

function abbrechen(text) {
  console.error(`Fehler: ${text}`);
  process.exit(1);
}

/** "König Blitz!" -> "koenig-blitz" */
function ordnerName(name) {
  return String(name).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'skin';
}

/* ---------- Paket lesen und prüfen ---------- */
const pfad = process.argv[2];
if (!pfad) abbrechen('Bitte die Paket-Datei angeben: node werkzeuge/skins-einbauen.mjs <datei.json>');
let paket;
try {
  paket = JSON.parse(readFileSync(pfad, 'utf8'));
} catch (fehler) {
  abbrechen(`Die Datei ist kein gültiges Skin-Paket (${fehler.message})`);
}
if (paket?.format !== 'monsterquest-skins' || !Array.isArray(paket.skins)) {
  abbrechen('Das ist kein Skin-Paket aus dem Skin-Studio.');
}

/* ---------- Timos Originalbilder ---------- */
const originale = {};
POSEN.forEach((pose) => {
  originale[pose] = pngLesen(readFileSync(join(WURZEL, `bilder/timo/${pose}.png`)));
});

/* ---------- Was schon eingebaut ist ---------- */
const { STUDIO_SKINS: bisher } = existsSync(ZIEL_DATEI)
  ? await import(`${ZIEL_DATEI}?t=${Date.now()}`)
  : { STUDIO_SKINS: [] };
const eintraege = new Map(bisher.map((s) => [s.ordner, s]));

/* ---------- Jeden Skin bauen ---------- */
const koepfe = new Map();
paket.skins.forEach((skin) => {
  const rezept = skin.rezept ?? {};
  let ordner = ordnerName(skin.name);
  if (BELEGT.includes(ordner)) ordner = `${ordner}-2`;

  // Importierte Bilder aus dem Paket - Hüte wie im Studio gesäubert.
  const bild = (wert) => {
    const id = typeof wert === 'string' && wert.startsWith('import:') ? wert.slice(7) : null;
    const eintrag = id && paket.bilder?.[id];
    if (id && !eintrag) console.warn(`  Achtung: Bild ${id} fehlt im Paket - ${skin.name} kommt ohne aus.`);
    return eintrag ? pngAusAdresse(eintrag.bild) : undefined;
  };
  const hutBild = bild(rezept.hut);
  const extras = { hutBild: hutBild && importBildSaeubern(hutBild), musterBild: bild(rezept.muster) };

  const posen = outfitBauen(originale, rezept, koepfe, extras);
  const verzeichnis = join(WURZEL, 'bilder/timo/skins', ordner);
  mkdirSync(verzeichnis, { recursive: true });
  POSEN.forEach((pose) => writeFileSync(join(verzeichnis, `${pose}.png`), pngSchreiben(posen[pose])));

  eintraege.set(ordner, {
    id: `skin-${ordner}`,
    name: String(skin.name ?? 'Skin').slice(0, 20),
    monsterId: 'timo',
    seltenheit: SELTENHEITEN.includes(skin.seltenheit) ? skin.seltenheit : 'episch',
    text: String(skin.text ?? '').slice(0, 80),
    look: {},
    filter: null,
    ordner,
    rezept,
    bilder: POSEN.map((pose) => `bilder/timo/skins/${ordner}/${pose}.png`),
  });
  console.log(`gebaut: ${skin.name} -> bilder/timo/skins/${ordner}/ (${skin.seltenheit})`);
});

/* ---------- js/data/studio-skins.js schreiben ---------- */
const liste = [...eintraege.values()];
const text = `/**
 * Skins aus dem Skin-Studio (werkstatt.html), eingebaut für alle Spieler.
 *
 * NICHT VON HAND ÄNDERN: erzeugt von werkzeuge/skins-einbauen.mjs aus einem
 * Skin-Paket. js/data/items.js nimmt sie in SKINS auf (Truhen, Sammlung,
 * Figur -> Aussehen). "rezept" steht nur zur Erinnerung dabei - so lässt sich
 * ein Skin im Studio nachbauen. Jeder Bildpfad steht ausgeschrieben da, damit
 * die Einzeldatei-Version die Bilder findet.
 */

export const STUDIO_SKINS = ${JSON.stringify(liste, null, 2)};
`;
writeFileSync(ZIEL_DATEI, text);
console.log(`\n${liste.length} Studio-Skin(s) in js/data/studio-skins.js. Nächste Schritte: Tests, sw.js-Version erhöhen, dist neu bauen.`);
