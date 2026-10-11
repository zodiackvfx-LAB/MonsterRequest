/**
 * Was es nach einem gewonnenen Kampf gibt.
 *
 * Diese Datei kennt nur Regeln - keine Anzeige. Der Kampfbildschirm
 * (js/screens/battle.js) zeigt das Ergebnis an.
 *
 * Die Belohnung besteht immer aus "Beutestücken" im selben Format wie bei
 * den Truhen (siehe js/core/loot.js). So kann die Anzeige überall dieselbe
 * sein: Symbol, Name, Seltenheit.
 *
 * Grundregeln:
 *   - Münzen und Erfahrung gibt es bei jedem Sieg.
 *   - Sterne erhöhen die Münzen um bis zu 30 Prozent.
 *   - Ein Wiederholungssieg bringt weniger (siehe completeLevel in state.js)
 *     und keine Bosstruhe - sonst könnte man einen leichten Kampf endlos
 *     wiederholen.
 *   - Bosse geben deutlich mehr: die Grundbelohnung ist bereits vervierfacht
 *     (js/data/levels.js), dazu kommt sicher Material und beim ersten Sieg
 *     eine Bosstruhe.
 *   - Jeder 2. Sieg bringt zusätzlich eine Gratis-Truhe (Holztruhe) - auch
 *     beim Wiederholen. Sie kommt getrennt zurück (gratisTruhe), damit das
 *     Ergebnisfenster sie als eigene Truhe zeigen kann.
 */

import { MATERIAL_BEUTE, MUENZE } from '../data/items.js';
import { BOSS_TRUHE, GRATIS_TRUHE_ID, SIEGE_PRO_GRATIS_TRUHE, getTruhe } from '../data/shop.js';
import { truheOeffnen } from './loot.js';
import { beuteGutschreiben, bossKraftFreischalten, completeLevel, gameState, isLevelCleared, saveProgress } from './state.js';
import { fortschrittMelden } from './aufgaben.js';
import { xpGutschreiben } from './progression.js';

/** Wie oft ein normaler Kampf Material abwirft. */
export const MATERIAL_CHANCE = 0.35;

/** Wie viel Material ein Boss sicher abwirft. */
export const BOSS_MATERIAL = [5, 8];

/** Münz-Aufschlag je Stern (3 Sterne = +30 Prozent). */
export const STERN_BONUS = 0.1;

function zwischen(min, max, wuerfeln) {
  return min + Math.floor(wuerfeln() * (max - min + 1));
}

/** Ein Beutestück für die Anzeige bauen. */
function stueck(art, menge, name, icon, seltenheit) {
  return { art, menge, name, icon, seltenheit };
}

/**
 * Berechnet die Belohnung, schreibt sie gut und gibt sie zum Anzeigen zurück.
 *
 * @param {object} level     - der gewonnene Level (js/data/levels.js)
 * @param {number} sterne    - 0 bis 3
 * @param {string} monsterId - wessen Erfahrungskonto steigt
 * @param {function} [wuerfeln] - Zufallsquelle (für Tests austauschbar)
 * @returns {{stuecke: Array, newWorld: object|null, xpErgebnis: object, erstesMal: boolean}}
 */
export function siegBelohnung(level, sterne, monsterId, wuerfeln = Math.random) {
  // Vor completeLevel abfragen - danach gilt der Level als geschafft.
  const erstesMal = !isLevelCleared(level.id);

  // Die Bosstruhe wird VOR dem Gutschreiben geöffnet: truheOeffnen()
  // überspringt Attacken und Skins, die man schon besitzt.
  const truhenBeute = level.isBoss && erstesMal ? truheOeffnen(BOSS_TRUHE) : [];

  const muenzBonus = 1 + sterne * STERN_BONUS;
  const { coins, newWorld } = completeLevel(level.id, {
    stars: sterne,
    reward: Math.round((level.reward ?? 0) * muenzBonus),
  });

  // Erfahrung gibt es bei jedem Sieg, auch beim Wiederholen.
  const xpErgebnis = xpGutschreiben(monsterId, level.xp ?? 0);

  // Münzen und Erfahrung sind durch completeLevel und xpGutschreiben schon
  // auf dem Konto - sie werden nur noch angezeigt.
  const bereitsGebucht = [
    stueck('muenzen', coins, `${coins} Münzen`, MUENZE, 'gewoehnlich'),
    stueck('erfahrung', level.xp ?? 0, `${level.xp ?? 0} Erfahrung`, '⭐', 'selten'),
  ];

  // Alles Weitere muss noch gutgeschrieben werden.
  const nochBuchen = [];
  const material = materialBelohnung(level, erstesMal, wuerfeln);
  if (material > 0) {
    nochBuchen.push(stueck('material', material, `${material} Material`, '💠', 'gewoehnlich'));
  }
  nochBuchen.push(...truhenBeute);
  nochBuchen.forEach((eintrag) => beuteGutschreiben(eintrag));

  // Beim ERSTEN Boss-Sieg gibt es die Boss-Kraft dieser Welt.
  const neueKraft = level.isBoss && erstesMal ? bossKraftFreischalten(level.worldId) : null;

  // Erst NACH der übrigen Beute öffnen: truheOeffnen() überspringt, was man
  // besitzt - so kommt nichts aus der Bosstruhe gleich noch einmal.
  const gratisTruhe = gratisTruheZaehlen();

  return { stuecke: [...bereitsGebucht, ...nochBuchen], newWorld, xpErgebnis, erstesMal, neueKraft, gratisTruhe };
}

/**
 * Zählt einen Sieg für die Gratis-Truhe. Ist es der 2. Sieg, wird die Truhe
 * geöffnet und gutgeschrieben.
 *
 * @returns {{truhe: object, stuecke: Array}|null} die geöffnete Truhe oder null
 */
function gratisTruheZaehlen() {
  gameState.gratisTruheZaehler = (Number(gameState.gratisTruheZaehler) || 0) + 1;
  if (gameState.gratisTruheZaehler < SIEGE_PRO_GRATIS_TRUHE) {
    saveProgress();
    return null;
  }

  gameState.gratisTruheZaehler = 0;
  const truhe = getTruhe(GRATIS_TRUHE_ID);
  const stuecke = truheOeffnen(truhe);
  stuecke.forEach((eintrag) => beuteGutschreiben(eintrag));
  // Zählt wie jede geöffnete Truhe für die Tagesaufgabe "Schatzsucher".
  fortschrittMelden('truhe');
  return { truhe, stuecke };
}

/** Wie viele Siege noch bis zur nächsten Gratis-Truhe fehlen (1 oder 2). */
export function siegeBisGratisTruhe() {
  return SIEGE_PRO_GRATIS_TRUHE - (Number(gameState.gratisTruheZaehler) || 0);
}

/** Wie viel Material dieser Kampf abwirft (0, wenn keins). */
export function materialBelohnung(level, erstesMal, wuerfeln = Math.random) {
  if (level.isBoss) return zwischen(...BOSS_MATERIAL, wuerfeln);

  // Beim Wiederholen halbierte Chance - wie bei den Münzen.
  const chance = erstesMal ? MATERIAL_CHANCE : MATERIAL_CHANCE / 2;
  if (wuerfeln() >= chance) return 0;
  return zwischen(...MATERIAL_BEUTE.gewoehnlich, wuerfeln);
}
