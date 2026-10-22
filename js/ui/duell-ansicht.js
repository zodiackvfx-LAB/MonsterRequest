/**
 * Kleine Bausteine, die Lobby (js/screens/duell-lobby.js) und Arena
 * (js/screens/duell.js) des 2v2-Modus gemeinsam nutzen.
 */

import { getSkin } from '../data/items.js';
import { getAttack } from '../data/attacks.js';
import { rezeptSchluessel, outfitBilder } from '../core/eigene-skins.js';
import { zahlAusText } from '../core/zufall.js';
import { outfitVorbereiten } from './outfit-bilder.js';
import { createSprite } from './sprite.js';
import { showScreen } from '../core/screens.js';

/**
 * Macht Text sicher fürs Einsetzen in HTML. Namen kommen im Koop vom
 * ANDEREN Gerät - sie dürfen nie als HTML wirken.
 */
export function sicher(text) {
  return String(text ?? '').replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[z]);
}

/** Outfits, deren Bilder gerade gebaut werden. */
const inArbeit = new Set();

/**
 * Der Skin aus einem Profil ({ id } oder { id, rezept }) als Skin-Objekt.
 * Eigene Outfits eines anderen Spielers werden aus ihrem Rezept gebaut -
 * bis die Bilder fertig sind, zeigt das Spiel das Original. Ist der Bau
 * fertig, wird fertig() aufgerufen (z. B. um die Figur neu zu zeichnen).
 */
export function skinAusProfil(info, fertig = null) {
  if (!info?.id) return null;
  if (!info.rezept) return getSkin(info.id) ?? null;
  // Eine eigene Kennung je Rezept - so kommt sich nichts mit den eigenen
  // Outfits in die Quere, und gleiche Rezepte teilen ihre Bilder.
  const outfit = { id: `rz-${zahlAusText(rezeptSchluessel(info.rezept)).toString(36)}`, rezept: info.rezept };
  const bilder = outfitBilder(outfit);
  if (!bilder && fertig && !inArbeit.has(outfit.id)) {
    // Jedes Rezept nur einmal bauen, auch wenn die Lobby oft neu zeichnet.
    inArbeit.add(outfit.id);
    outfitVorbereiten(outfit)
      .then(() => fertig())
      .catch(() => {})
      .finally(() => inArbeit.delete(outfit.id));
  }
  return { id: outfit.id, eigen: true, look: {}, filter: null, rezept: info.rezept, bilder };
}

/**
 * Eine Spielerfigur als Bild - Vorderansicht (Lobby) oder Kampfhaltung.
 * skin weggelassen = der eigene getragene Skin; null = ohne Skin.
 */
export function figurBild(monster, skin, { kampf = false } = {}) {
  const optionen = { bild: kampf ? monster.bildKampf ?? monster.image : monster.image };
  if (skin !== undefined) optionen.skin = skin;
  return createSprite(monster, optionen);
}

/** Die acht Karten eines Decks als kleine Symbolreihe. */
export function deckReihe(deck) {
  return `<span class="duell-deck">${deck
    .map((id) => {
      try {
        const a = getAttack(id);
        return `<span class="duell-deck__karte" title="${sicher(a.name)} (${a.cost})">${a.icon}</span>`;
      } catch {
        return '';
      }
    })
    .join('')}</span>`;
}

/* ------------------------------------------------------------------ */
/*  "Zurück zur 2v2-Lobby" - wenn man zwischendurch das Deck bearbeitet */
/* ------------------------------------------------------------------ */

let pille = null;

/** Zeigt unten einen Knopf, der zurück in die laufende Lobby führt. */
export function rueckkehrZeigen() {
  if (pille) return;
  pille = document.createElement('button');
  pille.type = 'button';
  pille.className = 'duell-rueckkehr';
  pille.innerHTML = '⚔️ Zurück zur 2v2-Lobby';
  pille.addEventListener('click', () => showScreen('duell-lobby'));
  document.body.appendChild(pille);
}

export function rueckkehrEntfernen() {
  pille?.remove();
  pille = null;
}
