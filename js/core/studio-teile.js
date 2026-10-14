/**
 * Regeln für die Studio-Teile: Was darf ein Spieler im Skin-Studio benutzen,
 * was kostet es, und wie kommt es in den Besitz.
 *
 * Die Liste und die Preise stehen in js/data/studio-teile.js.
 */

import { STUDIO_GRATIS, STUDIO_PREISE, STUDIO_TEILE, studioTeil, studioTeilFuer } from '../data/studio-teile.js';
import { HUETE, MUSTER } from './outfit.js';
import { bezahlen, besitztStudioTeil, kannBezahlen, studioTeilFreischalten } from './state.js';

/** Name und Symbol eines Teils (für Shop, Truhe und Studio). */
export function teilAnzeige(teil) {
  const quelle = teil.art === 'hut' ? HUETE[teil.wert] : MUSTER[teil.wert];
  return {
    name: quelle?.name ?? teil.wert,
    icon: quelle?.icon ?? '❔',
    artName: teil.art === 'hut' ? 'Hut' : 'Muster',
  };
}

export function teilPreis(teil) {
  return STUDIO_PREISE[teil.seltenheit] ?? STUDIO_PREISE.episch;
}

/** Darf der Spieler diesen Hut / dieses Muster im Studio benutzen? */
export function teilFrei(art, wert) {
  if (wert === STUDIO_GRATIS[art]) return true;
  const teil = studioTeilFuer(art, wert);
  return Boolean(teil && besitztStudioTeil(teil.id));
}

/** Nutzt ein Rezept nur, was der Spieler hat? */
export function rezeptErlaubt(rezept) {
  return teilFrei('hut', rezept.hut ?? 'keiner') && teilFrei('muster', rezept.muster ?? 'keins');
}

/**
 * Ein Teil mit Münzen kaufen.
 * @returns {{ok: true} | {ok: false, grund: string}}
 */
export function teilKaufen(id) {
  const teil = studioTeil(id);
  if (!teil) return { ok: false, grund: 'Dieses Teil gibt es nicht.' };
  if (besitztStudioTeil(id)) return { ok: false, grund: 'Das hast du schon.' };
  const preis = teilPreis(teil);
  if (!kannBezahlen(preis) || !bezahlen(preis)) {
    return { ok: false, grund: `Dafür brauchst du ${preis} Münzen. Hüte und Muster gibt es auch in Truhen!` };
  }
  studioTeilFreischalten(id);
  return { ok: true };
}

/** Wie viele Teile der Spieler hat - und wie viele es gibt. */
export function teileZaehlen() {
  return { hat: STUDIO_TEILE.filter((t) => besitztStudioTeil(t.id)).length, alle: STUDIO_TEILE.length };
}
