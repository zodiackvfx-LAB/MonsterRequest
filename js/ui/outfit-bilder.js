/**
 * Baut die Bilder der eigenen Outfits (Skin-Werkstatt) im Browser.
 *
 * Das Rezept liegt im Spielstand (js/core/eigene-skins.js), das Rechnen auf
 * den Pixeln macht js/core/outfit.js. Hier passiert nur, was einen Browser
 * braucht: Timos Originalbilder laden und die fertigen Pixel wieder in
 * Bilder (data:-Adressen) verwandeln.
 */

import { POSEN, poseImOutfit } from '../core/outfit.js';
import { eigeneOutfits, importBild, importId, outfitBilder, outfitBilderSetzen } from '../core/eigene-skins.js';
import { MONSTERS } from '../data/monsters.js';

let originaleVersprechen = null;
const koepfe = new Map();

/** Timos 14 Originalbilder als Pixel - einmal geladen, dann gemerkt. */
export function originaleLaden() {
  if (originaleVersprechen) return originaleVersprechen;
  const timo = MONSTERS.timo;
  const pfade = [timo.image, timo.bildKampf, ...timo.bildSchlag, ...timo.bildStrahl, ...timo.bildTreffer];
  originaleVersprechen = Promise.all(pfade.map((pfad) => new Promise((fertig, fehler) => {
    const img = new Image();
    img.onload = () => fertig(img);
    img.onerror = () => fehler(new Error(`Bild fehlt: ${pfad}`));
    img.src = pfad;
  }))).then((bilder) => {
    const originale = {};
    bilder.forEach((img, i) => {
      const leinwand = document.createElement('canvas');
      leinwand.width = img.naturalWidth;
      leinwand.height = img.naturalHeight;
      const ctx = leinwand.getContext('2d');
      ctx.drawImage(img, 0, 0);
      originale[POSEN[i]] = ctx.getImageData(0, 0, leinwand.width, leinwand.height);
    });
    return originale;
  });
  // Schlägt das Laden fehl (offline), beim nächsten Mal neu versuchen.
  originaleVersprechen.catch(() => { originaleVersprechen = null; });
  return originaleVersprechen;
}

/** Ein Bild (Adresse) in Pixel verwandeln. */
export function bildZuPixel(adresse) {
  return new Promise((fertig, fehler) => {
    const img = new Image();
    img.onload = () => {
      const leinwand = document.createElement('canvas');
      leinwand.width = img.naturalWidth;
      leinwand.height = img.naturalHeight;
      const ctx = leinwand.getContext('2d');
      ctx.drawImage(img, 0, 0);
      fertig(ctx.getImageData(0, 0, leinwand.width, leinwand.height));
    };
    img.onerror = () => fehler(new Error('Bild nicht lesbar'));
    img.src = adresse;
  });
}

const importPixel = new Map(); // Bild-Kennung -> Pixel

/**
 * Die importierten Bilder, die ein Rezept braucht, als Pixel:
 * { hutBild, musterBild } - fehlt eins (z. B. auf einem anderen Gerät),
 * bleibt es weg und das Outfit kommt ohne aus.
 */
export async function extrasFuer(rezept) {
  const laden = async (id) => {
    if (!id) return undefined;
    if (!importPixel.has(id)) {
      const eintrag = importBild(id);
      if (!eintrag) return undefined;
      importPixel.set(id, await bildZuPixel(eintrag.bild).catch(() => undefined));
    }
    return importPixel.get(id);
  };
  return { hutBild: await laden(importId(rezept.hut)), musterBild: await laden(importId(rezept.muster)) };
}

/** Pixel -> Leinwand (für die Vorschau in der Werkstatt). */
export function aufLeinwand(canvas, bild) {
  canvas.width = bild.width;
  canvas.height = bild.height;
  canvas.getContext('2d').putImageData(new ImageData(bild.data, bild.width, bild.height), 0, 0);
}

/** Pixel -> data:-Adresse. */
export function alsBildAdresse(bild) {
  const canvas = document.createElement('canvas');
  aufLeinwand(canvas, bild);
  return canvas.toDataURL('image/png');
}

/** Eine Pose im Outfit (für die Werkstatt-Vorschau). */
export function vorschauPose(originale, pose, rezept, extras = {}) {
  return poseImOutfit(originale, pose, rezept, koepfe, extras);
}

/** Baut alle 14 Posen eines Outfits - falls nicht schon geschehen. */
export async function outfitVorbereiten(outfit) {
  if (!outfit || outfitBilder(outfit)) return;
  const originale = await originaleLaden();
  const extras = await extrasFuer(outfit.rezept);
  const bilder = POSEN.map((pose) => alsBildAdresse(poseImOutfit(originale, pose, outfit.rezept, koepfe, extras)));
  outfitBilderSetzen(outfit.id, outfit.rezept, bilder);
}

/** Ein eigenes Outfit per id vorbereiten (z. B. das getragene beim Start). */
export async function outfitVorbereitenId(id) {
  await outfitVorbereiten(eigeneOutfits().find((e) => e.id === id));
}

/**
 * Alle eigenen Outfits vorbereiten - eins nach dem anderen, mit einer
 * kleinen Pause dazwischen, damit die Seite nicht hängt.
 * @returns {Promise<boolean>} true, wenn etwas neu gebaut wurde
 */
export async function alleOutfitsVorbereiten() {
  let neu = false;
  for (const outfit of eigeneOutfits()) {
    if (outfitBilder(outfit)) continue;
    await new Promise((weiter) => setTimeout(weiter, 0));
    await outfitVorbereiten(outfit);
    neu = true;
  }
  return neu;
}
