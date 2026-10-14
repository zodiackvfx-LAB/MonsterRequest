/**
 * Eigene Outfits aus der Skin-Werkstatt (werkstatt.html).
 *
 * Gespeichert wird nur das REZEPT (Kleidungsfarbe, Helligkeit, Hut,
 * Hutfarbe) - im Spielstand, also auch in der Datenbank und auf jedem
 * Gerät. Die Bilder baut das Spiel daraus selbst (js/ui/outfit-bilder.js)
 * und legt sie hier im Zwischenspeicher ab. So bleibt der Spielstand klein.
 *
 * Für das Spiel sieht ein eigenes Outfit aus wie jeder andere Skin (siehe
 * SKINS in js/data/items.js) - mit "bilder" statt "ordner".
 */

import { gameState, saveProgress } from './state.js';

/** Mehr eigene Outfits gibt es nicht. */
export const MAX_EIGENE = 8;

/** id -> { schluessel, bilder } - die fertig gebauten Bilder. */
const fertigeBilder = new Map();

/** Ändert sich das Rezept, passen die alten Bilder nicht mehr. */
export function rezeptSchluessel(rezept) {
  return JSON.stringify([rezept.kleidung, rezept.helligkeit, rezept.muster, rezept.musterFarbe,
    rezept.hut, rezept.hutFarbe, rezept.hutGroesse, rezept.hutSitz]);
}

/** Alle eigenen Outfits (die neuesten zuerst). */
export function eigeneOutfits() {
  return gameState.eigeneOutfits ?? [];
}

export function istEigenerSkin(id) {
  return typeof id === 'string' && id.startsWith('eigen-');
}

/**
 * Speichert ein Outfit (neu oder geändert).
 * @param {{id?: string, name: string, rezept: object}} outfit
 * @returns {{ok: true, id: string} | {ok: false, grund: string}}
 */
export function outfitSpeichern(outfit) {
  const liste = [...eigeneOutfits()];
  const alt = liste.findIndex((e) => e.id === outfit.id);
  if (alt < 0 && liste.length >= MAX_EIGENE) {
    return { ok: false, grund: `Höchstens ${MAX_EIGENE} eigene Outfits - lösche zuerst eins.` };
  }
  const id = alt >= 0 ? outfit.id : neueId(liste);
  const eintrag = {
    id,
    name: String(outfit.name ?? '').trim().slice(0, 20) || 'Mein Outfit',
    seltenheit: outfit.seltenheit ?? 'episch',
    text: String(outfit.text ?? '').trim().slice(0, 80),
    rezept: { ...outfit.rezept },
  };
  if (alt >= 0) liste.splice(alt, 1);
  liste.unshift(eintrag);
  gameState.eigeneOutfits = liste;
  saveProgress();
  return { ok: true, id };
}

export function outfitLoeschen(id) {
  gameState.eigeneOutfits = eigeneOutfits().filter((e) => e.id !== id);
  fertigeBilder.delete(id);
  saveProgress();
}

/** Die gebauten Bilder eines Outfits ablegen (von js/ui/outfit-bilder.js). */
export function outfitBilderSetzen(id, rezept, bilder) {
  fertigeBilder.set(id, { schluessel: rezeptSchluessel(rezept), bilder });
}

/** Die gebauten Bilder - oder null, solange sie noch nicht gebaut sind. */
export function outfitBilder(outfit) {
  const eintrag = fertigeBilder.get(outfit.id);
  return eintrag && eintrag.schluessel === rezeptSchluessel(outfit.rezept) ? eintrag.bilder : null;
}

/** Eine Kennung, die es noch nicht gibt - Zeit plus ein Stück Zufall. */
function neueId(liste) {
  let id;
  do {
    id = `eigen-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  } while (liste.some((e) => e.id === id));
  return id;
}

/** Ein eigenes Outfit als Skin für das Spiel - oder undefined. */
export function eigenerSkin(id) {
  if (!istEigenerSkin(id)) return undefined;
  const outfit = eigeneOutfits().find((e) => e.id === id);
  return outfit ? alsSkin(outfit) : undefined;
}

/** Alle eigenen Outfits als Skins. */
export function eigeneSkins() {
  return eigeneOutfits().map(alsSkin);
}

function alsSkin(outfit) {
  return {
    id: outfit.id,
    name: outfit.name,
    monsterId: 'timo',
    seltenheit: outfit.seltenheit ?? 'episch',
    text: outfit.text ?? '',
    eigen: true,
    look: {},
    filter: null,
    rezept: outfit.rezept,
    // null, solange die Bilder noch gebaut werden - dann zeigt das Spiel
    // kurz das Original (siehe skinBild in js/ui/sprite.js).
    bilder: outfitBilder(outfit),
  };
}

/* ------------------------------------------------------------------ */
/*  Importierte Bilder (Hüte und Muster)                                */
/*  Sie liegen nur auf diesem Gerät - im Spielstand wären sie zu groß.  */
/*  Das Rezept merkt sich nur die Kennung ("import:<id>").              */
/* ------------------------------------------------------------------ */

const BILDER_SCHLUESSEL = 'monsterquest.studio.bilder.v1';

/** Höchstens so viele importierte Bilder. */
export const MAX_IMPORT_BILDER = 24;

/** Alle importierten Bilder: { id: { art: 'hut'|'muster', name, bild } }. */
export function importBilder() {
  try {
    const alle = JSON.parse(localStorage.getItem(BILDER_SCHLUESSEL) ?? '{}');
    return alle && typeof alle === 'object' ? alle : {};
  } catch {
    return {};
  }
}

export function importBild(id) {
  return importBilder()[id] ?? null;
}

/**
 * Ein importiertes Bild ablegen.
 * @param {{art: 'hut'|'muster', name: string, bild: string}} eintrag - bild als data:-Adresse
 * @returns {{ok: true, id: string} | {ok: false, grund: string}}
 */
export function importBildSpeichern(eintrag) {
  const alle = importBilder();
  if (Object.keys(alle).length >= MAX_IMPORT_BILDER) {
    return { ok: false, grund: `Höchstens ${MAX_IMPORT_BILDER} Bilder - lösche zuerst eins.` };
  }
  const id = `${eintrag.art}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  alle[id] = { art: eintrag.art, name: String(eintrag.name || 'Bild').slice(0, 24), bild: eintrag.bild };
  try {
    localStorage.setItem(BILDER_SCHLUESSEL, JSON.stringify(alle));
  } catch {
    return { ok: false, grund: 'Der Speicher ist voll - lösche ein Bild.' };
  }
  return { ok: true, id };
}

export function importBildLoeschen(id) {
  const alle = importBilder();
  delete alle[id];
  localStorage.setItem(BILDER_SCHLUESSEL, JSON.stringify(alle));
}

/** Die Kennung hinter "import:<id>" - oder null. */
export function importId(wert) {
  return typeof wert === 'string' && wert.startsWith('import:') ? wert.slice(7) : null;
}

/* ------------------------------------------------------------------ */
/*  Skin-Paket: alles, was ins Spiel eingebaut werden soll              */
/* ------------------------------------------------------------------ */

/**
 * Packt Outfits samt den Bildern, die sie brauchen, in ein Paket - zum
 * Herunterladen und Einbauen mit werkzeuge/skins-einbauen.mjs.
 * @param {string[]} [ids] - nur diese Outfits (sonst alle)
 */
export function skinPaket(ids) {
  const outfits = eigeneOutfits().filter((o) => !ids || ids.includes(o.id));
  const bilder = {};
  outfits.forEach((o) => {
    [importId(o.rezept.hut), importId(o.rezept.muster)].filter(Boolean).forEach((id) => {
      const b = importBild(id);
      if (b) bilder[id] = b;
    });
  });
  return {
    format: 'monsterquest-skins',
    version: 1,
    erstellt: new Date().toISOString(),
    skins: outfits.map(({ name, seltenheit, text, rezept }) => ({ name, seltenheit, text, rezept })),
    bilder,
  };
}
