/**
 * Hüte und Muster fürs Skin-Studio (werkstatt.html) - zum Freischalten.
 *
 * Farben sind im Studio immer kostenlos, ebenso "Einfarbig" und "Kein Hut".
 * Hüte und Muster muss man erst bekommen:
 *   - im Shop kaufen (Reiter "Studio", Preis je Seltenheit unten), oder
 *   - aus Truhen ziehen (siehe truheOeffnen in js/core/loot.js).
 *
 * HIER STELLST DU EIN, wie selten und wie teuer ein Teil ist. Aussehen,
 * Name und Symbol kommen aus HUETE und MUSTER in js/core/outfit.js.
 *
 *   id         - eindeutige Kennung (so steht es im Spielstand)
 *   art        - 'hut' oder 'muster'
 *   wert       - der Schlüssel in HUETE bzw. MUSTER
 *   seltenheit - 'gewoehnlich' | 'selten' | 'episch' | 'legendaer'
 */

/** Preis im Shop je Seltenheit (Münzen). */
export const STUDIO_PREISE = { gewoehnlich: 500, selten: 1200, episch: 2500, legendaer: 5000 };

/** Was es ohne Freischalten gibt. */
export const STUDIO_GRATIS = { hut: 'keiner', muster: 'keins' };

export const STUDIO_TEILE = [
  // Hüte
  { id: 'hut-schweissband', art: 'hut', wert: 'schweissband', seltenheit: 'gewoehnlich' },
  { id: 'hut-wintermuetze', art: 'hut', wert: 'wintermuetze', seltenheit: 'gewoehnlich' },
  { id: 'hut-ninjaband', art: 'hut', wert: 'ninjaband', seltenheit: 'selten' },
  { id: 'hut-cowboyhut', art: 'hut', wert: 'cowboyhut', seltenheit: 'selten' },
  { id: 'hut-partyhut', art: 'hut', wert: 'partyhut', seltenheit: 'selten' },
  { id: 'hut-piratenhut', art: 'hut', wert: 'piratenhut', seltenheit: 'episch' },
  { id: 'hut-wikingerhelm', art: 'hut', wert: 'wikingerhelm', seltenheit: 'episch' },
  { id: 'hut-zauberhut', art: 'hut', wert: 'zauberhut', seltenheit: 'episch' },
  { id: 'hut-krone', art: 'hut', wert: 'krone', seltenheit: 'legendaer' },
  // Muster
  { id: 'muster-streifen', art: 'muster', wert: 'streifen', seltenheit: 'gewoehnlich' },
  { id: 'muster-laengs', art: 'muster', wert: 'laengs', seltenheit: 'gewoehnlich' },
  { id: 'muster-punkte', art: 'muster', wert: 'punkte', seltenheit: 'gewoehnlich' },
  { id: 'muster-karo', art: 'muster', wert: 'karo', seltenheit: 'selten' },
  { id: 'muster-zickzack', art: 'muster', wert: 'zickzack', seltenheit: 'selten' },
  { id: 'muster-tarn', art: 'muster', wert: 'tarn', seltenheit: 'episch' },
  { id: 'muster-flammen', art: 'muster', wert: 'flammen', seltenheit: 'legendaer' },
];

export function studioTeil(id) {
  return STUDIO_TEILE.find((teil) => teil.id === id);
}

/** Das Teil zu einem Hut- oder Musterschlüssel (oder undefined, wenn gratis). */
export function studioTeilFuer(art, wert) {
  return STUDIO_TEILE.find((teil) => teil.art === art && teil.wert === wert);
}
