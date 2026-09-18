/**
 * Truhen öffnen: was kommt heraus?
 *
 * Diese Datei kennt nur Regeln und Wahrscheinlichkeiten - keine Anzeige.
 * Der Shop-Bildschirm (js/screens/shop.js) zeigt das Ergebnis an.
 */

import { BEUTE_ATTACKEN, MATERIAL_BEUTE, MUENZE, MUENZ_BEUTE, SKINS } from '../data/items.js';
import { besitztAttacke, besitztSkin } from './state.js';

/** Zufallszahl zwischen min und max (beide eingeschlossen). */
function zwischen(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function zufall(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

/** Würfelt eine Seltenheit anhand der Chancen einer Truhe. */
function wuerfleSeltenheit(chancen) {
  const summe = Object.values(chancen).reduce((a, b) => a + b, 0);
  let wurf = Math.random() * summe;
  for (const [seltenheit, chance] of Object.entries(chancen)) {
    wurf -= chance;
    if (wurf <= 0) return seltenheit;
  }
  return 'gewoehnlich';
}

/**
 * Zieht ein Beutestück einer bestimmten Seltenheit.
 *
 * Attacken und Skins, die man schon hat, werden zu Münzen - sonst wäre eine
 * Truhe irgendwann wertlos.
 */
function ziehe(seltenheit) {
  const attacken = BEUTE_ATTACKEN.filter(
    (a) => a.seltenheit === seltenheit && !besitztAttacke(a.id)
  );
  const skins = SKINS.filter((s) => s.seltenheit === seltenheit && !besitztSkin(s.id));

  // Gewichte: Münzen und Material kommen immer vor, Attacken und Skins nur,
  // solange es noch welche zu holen gibt.
  const topf = [
    { art: 'muenzen', gewicht: 35 },
    { art: 'material', gewicht: 30 },
    ...(attacken.length ? [{ art: 'attacke', gewicht: 22 }] : []),
    ...(skins.length ? [{ art: 'skin', gewicht: 16 }] : []),
  ];

  const summe = topf.reduce((a, b) => a + b.gewicht, 0);
  let wurf = Math.random() * summe;
  let art = 'muenzen';
  for (const eintrag of topf) {
    wurf -= eintrag.gewicht;
    if (wurf <= 0) {
      art = eintrag.art;
      break;
    }
  }

  if (art === 'attacke') {
    const attacke = zufall(attacken);
    return { art: 'attacke', seltenheit, id: attacke.id, name: attacke.name, icon: attacke.icon };
  }

  if (art === 'skin') {
    const skin = zufall(skins);
    return { art: 'skin', seltenheit, id: skin.id, name: `Skin: ${skin.name}`, icon: '🎨', skin };
  }

  if (art === 'material') {
    const menge = zwischen(...MATERIAL_BEUTE[seltenheit]);
    return { art: 'material', seltenheit, menge, name: `${menge} Material`, icon: '💠' };
  }

  const menge = zwischen(...MUENZ_BEUTE[seltenheit]);
  return { art: 'muenzen', seltenheit, menge, name: `${menge} Münzen`, icon: MUENZE };
}

/** Mischt eine Liste (damit das garantierte Stück nicht immer vorne liegt). */
function mischen(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

/**
 * Öffnet eine Truhe und gibt die Beutestücke zurück.
 * Die Stücke sind noch NICHT gutgeschrieben - das macht der Shop, damit er
 * sie einzeln aufdecken kann.
 */
export function truheOeffnen(truhe) {
  const stuecke = [];

  for (let i = 0; i < truhe.anzahl; i++) {
    const seltenheit =
      i === 0 && truhe.garantie ? truhe.garantie : wuerfleSeltenheit(truhe.chancen);
    stuecke.push(ziehe(seltenheit));
  }

  return mischen(stuecke);
}
