/**
 * Was es nach einem 2v2-Kampf gibt - für jeden Spieler auf SEINEM Gerät.
 *
 * Genutzt wird das vorhandene System: Münzen, Erfahrung (für die Figur, die
 * man gespielt hat), Material, Truhenplätze, Tagesaufgaben. Die Werte
 * stehen in DUELL_BELOHNUNG (js/data/duell.js).
 *
 * Absichtlich NICHT:
 *   - keine Trophäen (die Liga bleibt dem Abenteuer vorbehalten)
 *   - kein Zähler für die Gratis-Truhe und keine Tages-Gratistruhe
 *   - keine geschafften Level und keine neuen Welten
 * Nur das erste gewonnene Boss-Duell des Tages bringt eine Silbertruhe.
 * Nach einigen Siegen am Tag gibt es weniger - so bleiben die anderen Modi
 * lohnend.
 *
 * GENAU EINMAL
 * Jede Match-id wird nur einmal belohnt: Das Gerät merkt sich die ids
 * (gameState.duell.belohnt), und ist eine Datenbank eingetragen, fragt es
 * zusätzlich dort nach (cloudDuellBelohnung) - dann hilft auch kein zweites
 * Gerät und kein erneutes Verbinden.
 */

import { DUELL_BELOHNUNG, getDuellGrad } from '../data/duell.js';
import { getWorld } from '../data/worlds.js';
import { truheNachId } from '../data/shop.js';
import { MUENZE } from '../data/items.js';
import { gameState, saveProgress } from './state.js';
import { xpGutschreiben } from './progression.js';
import { fortschrittMelden, heute } from './aufgaben.js';
import { truheEinlagern } from './truhenplaetze.js';
import { pruefeNeueErfolge, statErhoehen } from './statistik.js';
import { cloudDuellBelohnung } from './cloud.js';
import { mittlereGegnerHp } from './duell-aufbau.js';

function zwischen([min, max], wuerfeln) {
  return min + Math.floor(wuerfeln() * (max - min + 1));
}

/** Sterne für einen Sieg: 3 ohne Ausfall mit viel Leben, 1 knapp. */
export function duellSterne(ende) {
  if (!ende || ende.ergebnis !== 'sieg') return 0;
  if (ende.teamKo === 0 && ende.teamAnteil >= 0.5) return 3;
  if (ende.teamKo === 0 || ende.teamAnteil >= 0.25) return 2;
  return 1;
}

/** Hat dieses Gerät die Belohnung für dieses Match schon verbucht? */
export function schonBelohnt(matchId) {
  return gameState.duell.belohnt.includes(matchId);
}

/**
 * Berechnet die Belohnung, schreibt sie gut und gibt sie zum Anzeigen zurück.
 *
 * @param {object} o
 * @param {string} o.matchId
 * @param {object} o.ende - state.ende der Engine
 * @param {string} o.ich - 'p1' oder 'p2' (wessen Statistik zählt)
 * @param {object} o.setup - das Setup des Matches (Welt, Grad, Figuren)
 * @param {object} [optionen]
 * @param {function} [optionen.wuerfeln] - Zufall (Tests)
 * @param {Date} [optionen.jetzt]
 * @param {function|null} [optionen.server] - Einmal-Prüfung in der Datenbank
 */
export async function duellBelohnung({ matchId, ende, ich, setup }, { wuerfeln = Math.random, jetzt = new Date(), server = cloudDuellBelohnung } = {}) {
  if (!ende || !matchId) return null;
  if (ende.ergebnis === 'abbruch') return { keine: true, grund: ende.grund ?? 'abbruch' };
  if (schonBelohnt(matchId)) return { schonVergeben: true };

  // Erst merken, dann (vielleicht) warten - so kann ein zweiter Aufruf
  // während des Wartens nicht doppelt buchen.
  gameState.duell.belohnt = [...gameState.duell.belohnt, matchId].slice(-60);
  const sieg = ende.ergebnis === 'sieg';
  const meine = ende.statistik?.[ich] ?? {};
  if (server) {
    const erstesMal = await server(matchId, { ergebnis: ende.ergebnis, welt: setup.welt, grad: setup.schwierigkeit, boss: Boolean(setup.bossDuell) });
    if (erstesMal === false) {
      saveProgress();
      return { schonVergeben: true };
    }
  }

  const welt = getWorld(setup.welt);
  const grad = getDuellGrad(setup.schwierigkeit);
  const boss = Boolean(setup.bossDuell);
  const b = DUELL_BELOHNUNG;
  const datum = heute(jetzt);
  const d = gameState.duell;
  if (d.tag !== datum) {
    d.tag = datum;
    d.siegeHeute = 0;
  }

  // Nach einigen vollen Siegen am Tag gibt es weniger.
  const voll = !sieg || d.siegeHeute < b.volleSiegeProTag;
  const tagesFaktor = voll ? 1 : b.spaeterFaktor;
  if (sieg) d.siegeHeute += 1;

  const sterne = duellSterne(ende);
  const grundMuenzen = (welt?.reward ?? 25) * b.muenzen * grad.belohnung * (boss ? b.bossFaktor : 1);
  const grundXp = mittlereGegnerHp(setup.welt) * 0.8 * b.erfahrung * grad.belohnung * (boss ? 1.5 : 1);
  const muenzen = Math.round(sieg ? grundMuenzen * (1 + sterne * b.sternBonus) * tagesFaktor : grundMuenzen * b.niederlage.muenzen);
  const erfahrung = Math.round(sieg ? grundXp * tagesFaktor : grundXp * b.niederlage.erfahrung);

  let material = 0;
  if (sieg && boss) material = zwischen(b.bossMaterial, wuerfeln);
  else if (sieg && wuerfeln() < b.material.chance * (voll ? 1 : 0.5)) material = zwischen(b.material.menge, wuerfeln);

  // Gutschreiben - über die vorhandenen Wege.
  const figur = setup.team?.find((t) => t.id === ich)?.monster?.figur ?? 'timo';
  gameState.coins += muenzen;
  gameState.materials += material;
  const xpErgebnis = xpGutschreiben(figur, erfahrung);

  let truhe = null;
  if (sieg && boss && d.bossTruheDatum !== datum) {
    d.bossTruheDatum = datum;
    const wohin = truheEinlagern(b.bossTruhe, { warteschlange: true });
    truhe = { ...truheNachId(b.bossTruhe), wartet: wohin === 'warteschlange' };
  }

  // Beste Sterne je Welt und Grad.
  const key = `${setup.welt}-${grad.id}`;
  if (sterne > (d.besteSterne[key] ?? 0)) d.besteSterne[key] = sterne;

  // 2v2-Statistik (eigene Zähler) und allgemeine Zähler, die passen.
  d.statistik.kaempfe += 1;
  if (sieg) d.statistik.siege += 1;
  else d.statistik.niederlagen += 1;
  d.statistik.kombos += meine.kombos ?? 0;
  d.statistik.wiederbelebt += meine.wiederbelebt ?? 0;
  if (sieg && boss) d.statistik.bosse += 1;
  if (sieg && ende.teamKo === 0) d.statistik.makellos += 1;
  statErhoehen('schaden', meine.schaden ?? 0);
  statErhoehen('karten', meine.karten ?? 0);

  // Tagesaufgaben: die 2v2-Aufgaben - und Schaden/Karten für die normalen.
  if (sieg) fortschrittMelden('duellSieg');
  if (sieg && ende.teamKo === 0) fortschrittMelden('duellMakellos');
  if (sieg && boss) fortschrittMelden('duellBoss');
  if (meine.kombos) fortschrittMelden('teamKombo', meine.kombos);
  if (meine.teamHeilung) fortschrittMelden('teamHeilung', meine.teamHeilung);
  if (meine.schaden) fortschrittMelden('schaden', meine.schaden);
  if (meine.karten) fortschrittMelden('attacke', meine.karten);

  const neueErfolge = pruefeNeueErfolge();
  saveProgress();

  const stuecke = [
    { art: 'muenzen', menge: muenzen, name: `${muenzen} Münzen`, icon: MUENZE, seltenheit: 'gewoehnlich' },
    { art: 'erfahrung', menge: erfahrung, name: `${erfahrung} Erfahrung`, icon: '⭐', seltenheit: 'selten' },
  ];
  if (material > 0) stuecke.push({ art: 'material', menge: material, name: `${material} Material`, icon: '💠', seltenheit: 'gewoehnlich' });

  return { sieg, sterne, stuecke, truhe, tagesFaktor, xpErgebnis, neueErfolge, meine };
}
