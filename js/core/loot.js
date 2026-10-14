/**
 * Truhen öffnen: was kommt heraus?
 *
 * Jede Truhe enthält:
 *   - genau EINMAL Münzen (150 bis 500)
 *   - genau EINMAL Material
 *   - auf allen übrigen Plätzen Fähigkeitskarten (mindestens eine), ab und
 *     zu stattdessen einen Skin
 *
 * Diese Datei kennt nur Regeln und Wahrscheinlichkeiten - keine Anzeige.
 * Die Öffnung zeigt js/ui/truhe-oeffnen.js.
 */

import { BEUTE_ATTACKEN, MATERIAL_BEUTE, MUENZE, SKINS, TRUHEN_MUENZEN } from '../data/items.js';
import { STUDIO_TEILE } from '../data/studio-teile.js';
import { teilAnzeige } from './studio-teile.js';
import { getAttack } from '../data/attacks.js';
import { MONSTERS } from '../data/monsters.js';
import { KOPIEN_JE_SELTENHEIT } from '../data/karten.js';
import { besitztAttacke, besitztSkin, besitztStudioTeil, getAktiveFigur } from './state.js';
import { MAX_ATTACKEN_LEVEL, getAttackenLevel } from './progression.js';

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

/** Reihenfolge der Seltenheiten - zum Ausweichen, wenn eine leer ist. */
const SELTENHEIT_REIHE = ['gewoehnlich', 'selten', 'episch', 'legendaer'];

/**
 * Alle Karten, die aus Truhen kommen können: die Startattacken der aktiven
 * Figur und alle Beute-Attacken. Roccos Karten teilen ihr Level mit Timos
 * (siehe stufenId in js/data/attacks.js).
 */
function kartenPool() {
  const figur = MONSTERS[getAktiveFigur()] ?? MONSTERS.timo;
  return [...figur.deck.map((id) => getAttack(id)), ...BEUTE_ATTACKEN.map((a) => getAttack(a.id))];
}

/**
 * Zieht eine Fähigkeitskarte. Gibt es in der gewürfelten Seltenheit keine
 * passende mehr (alle schon gezogen oder auf Level 15), wird auf eine
 * benachbarte Seltenheit ausgewichen.
 *
 * Eine Beute-Attacke, die man noch nicht hat, wird freigeschaltet ("Neu!").
 * Sonst gibt es Kopien, die die Karte hochleveln.
 */
function zieheKarte(seltenheit, schonGezogen) {
  const pool = kartenPool().filter((a) => !schonGezogen.has(a.id));
  const nochOffen = pool.filter((a) => getAttackenLevel(a.id) < MAX_ATTACKEN_LEVEL || !istGefunden(a));
  const quelle = nochOffen.length ? nochOffen : pool;
  if (!quelle.length) return null;

  // Erst die gewürfelte Seltenheit, dann die Nachbarn - die nächste zuerst.
  const start = SELTENHEIT_REIHE.indexOf(seltenheit);
  const reihe = [...SELTENHEIT_REIHE].sort(
    (a, b) => Math.abs(SELTENHEIT_REIHE.indexOf(a) - start) - Math.abs(SELTENHEIT_REIHE.indexOf(b) - start)
  );
  const stufe = reihe.find((s) => quelle.some((a) => (a.seltenheit ?? 'gewoehnlich') === s));
  const karte = zufall(quelle.filter((a) => (a.seltenheit ?? 'gewoehnlich') === stufe));
  const echteSeltenheit = karte.seltenheit ?? 'gewoehnlich';

  if (!istGefunden(karte)) {
    return { art: 'attacke', seltenheit: echteSeltenheit, id: karte.id, name: karte.name, icon: karte.icon, neu: true };
  }
  const menge = zwischen(...KOPIEN_JE_SELTENHEIT[echteSeltenheit]);
  return { art: 'karte', seltenheit: echteSeltenheit, id: karte.id, name: karte.name, icon: karte.icon, menge };
}

/** Hat der Spieler diese Karte schon? Startattacken immer, Beute erst nach dem Fund. */
function istGefunden(attacke) {
  return !BEUTE_ATTACKEN.some((b) => b.id === attacke.id) || besitztAttacke(attacke.id);
}

/** Ein Skin dieser Seltenheit, den man noch nicht hat - oder null. */
function zieheSkin(seltenheit, schonGezogen) {
  const skins = SKINS.filter(
    (s) => s.seltenheit === seltenheit && !besitztSkin(s.id) && !schonGezogen.has(s.id)
  );
  if (!skins.length) return null;
  const skin = zufall(skins);
  return { art: 'skin', seltenheit, id: skin.id, name: `Skin: ${skin.name}`, icon: '🎨', skin };
}

/** Ein Hut oder Muster fürs Skin-Studio, das der Spieler noch nicht hat. */
function zieheStudioTeil(seltenheit, schonGezogen) {
  const teile = STUDIO_TEILE.filter(
    (t) => t.seltenheit === seltenheit && !besitztStudioTeil(t.id) && !schonGezogen.has(t.id)
  );
  if (!teile.length) return null;
  const teil = zufall(teile);
  const { name, icon, artName } = teilAnzeige(teil);
  return { art: 'studio', seltenheit, id: teil.id, name: `${artName}: ${name}`, icon, teil };
}

/** Das eine Materialstück einer Truhe - die Menge richtet sich nach der Seltenheit. */
function materialStueck(seltenheit) {
  const menge = zwischen(...MATERIAL_BEUTE[seltenheit]);
  return { art: 'material', seltenheit, menge, name: `${menge} Material`, icon: '💠' };
}

/**
 * Das eine Münzstück einer Truhe: 150 bis 500 Münzen. Die Farbe des Feldes
 * richtet sich nach der Höhe - ein großer Betrag leuchtet heller.
 */
function muenzStueck() {
  const menge = zwischen(TRUHEN_MUENZEN.min, TRUHEN_MUENZEN.max);
  const seltenheit = menge >= 400 ? 'episch' : menge >= 250 ? 'selten' : 'gewoehnlich';
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
  // Genau einmal Münzen und genau einmal Material ...
  const stuecke = [muenzStueck(), materialStueck(wuerfleSeltenheit(truhe.chancen))];
  const gezogen = new Set();

  // ... und der Rest sind Fähigkeitskarten - mindestens eine, immer.
  // Ab dem zweiten Platz kann statt einer Karte auch ein Skin oder ein
  // Hut/Muster fürs Skin-Studio kommen.
  const plaetze = Math.max(1, truhe.anzahl - 2);
  for (let i = 0; i < plaetze; i++) {
    const seltenheit =
      i === 0 && truhe.garantie ? truhe.garantie : wuerfleSeltenheit(truhe.chancen);
    const wurf = Math.random();
    const skin = i > 0 && wurf < SKIN_CHANCE ? zieheSkin(seltenheit, gezogen) : null;
    const studio = !skin && i > 0 && wurf >= SKIN_CHANCE && wurf < SKIN_CHANCE + STUDIO_CHANCE
      ? zieheStudioTeil(seltenheit, gezogen)
      : null;
    const stueck = skin ?? studio ?? zieheKarte(seltenheit, gezogen);
    if (!stueck) continue;
    gezogen.add(stueck.id);
    stuecke.push(stueck);
  }

  return mischen(stuecke);
}

/** Wie oft ein freier Platz ein Skin statt einer Karte ist (solange es welche gibt). */
const SKIN_CHANCE = 0.25;

/** Wie oft ein freier Platz ein Hut oder Muster fürs Skin-Studio ist. */
const STUDIO_CHANCE = 0.2;
