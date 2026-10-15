/**
 * Regeln der Kampf-Modi: Tägliche Herausforderung, Boss-Rush, Zeitangriff.
 *
 * Die Werte stehen in js/data/modi.js. Diese Datei entscheidet, wer einen
 * Modus spielen darf, welche Gegner kommen und was es am Ende gibt. Der
 * Kampf selbst läuft über den normalen Kampfbildschirm
 * (js/screens/battle.js) - dort heißt das params.modus.
 *
 * Ein laufender Modus ist ein kleines Objekt:
 *   { id, schritt, datum, welt, hp, zeit }
 *     schritt - der wievielte Kampf (ab 1)
 *     datum   - der Tag, an dem der Lauf begann (gilt bis zum Ende)
 *     welt    - die höchste Welt beim Start (bestimmt die Gegner)
 *     hp      - Lebenspunkte aus dem vorigen Kampf (oder null = voll)
 *     zeit    - bisher gebrauchte Sekunden (nur Zeitangriff)
 */

import { MODI, bossRushGegner, tagesHerausforderung, zeitGegner } from '../data/modi.js';
import { WORLDS, getWorld } from '../data/worlds.js';
import { bossLevelOf } from '../data/levels.js';
import { truheNachId } from '../data/shop.js';
import { gameState, isLevelCleared, saveProgress } from './state.js';
import { heute } from './aufgaben.js';
import { truheEinlagern } from './truhenplaetze.js';

/** Welten, deren Boss schon besiegt ist. */
export function besiegteBossWelten() {
  return WORLDS.map((w) => w.id).filter((id) => {
    const boss = bossLevelOf(id);
    return boss && isLevelCleared(boss.id);
  });
}

/** Darf man diesen Modus spielen? Sonst steht in grund, was fehlt. */
export function modusFrei(id) {
  if (id === 'bossrush' && besiegteBossWelten().length === 0) {
    return { frei: false, grund: 'Besiege zuerst den Boss von Welt 1.' };
  }
  return { frei: Boolean(MODI[id]), grund: '' };
}

/** Die Parameter für den ersten Kampf eines neuen Laufs. */
export function modusStarten(id, jetzt = new Date()) {
  return { id, schritt: 1, datum: heute(jetzt), welt: gameState.unlockedWorld, hp: null, zeit: 0 };
}

/** Alle Gegner eines Laufs, in der Reihenfolge der Kämpfe. */
export function modusGegner(modus) {
  if (modus.id === 'tages') return [tagesHerausforderung(modus.datum, modus.welt).gegner];
  if (modus.id === 'bossrush') return bossRushGegner(besiegteBossWelten());
  if (modus.id === 'zeit') return zeitGegner(modus.datum, modus.welt);
  return [];
}

/**
 * Das "Level" für einen Kampf im Modus - so, wie es der Kampfbildschirm
 * erwartet (wie bei der Arena, siehe js/data/arena.js).
 */
export function modusLevel(modus) {
  const def = MODI[modus.id];
  const liste = modusGegner(modus);
  const gegner = liste[modus.schritt - 1];
  if (!def || !gegner) return null;
  const welt = getWorld(gegner.worldId) ?? getWorld(1);
  return {
    id: `modus-${modus.id}-${modus.schritt}`,
    modus: { ...modus, anzahl: liste.length },
    worldId: gegner.worldId,
    number: modus.schritt,
    name: gegner.name,
    enemyId: gegner.id,
    isBoss: Boolean(gegner.isBoss),
    scenery: welt.scenery,
    music: welt.music,
    gegner,
    kniff: modus.id === 'tages' ? tagesHerausforderung(modus.datum, modus.welt).kniff : null,
    titel: `${def.icon} ${def.kurz}${liste.length > 1 ? ` · ${modus.schritt}/${liste.length}` : ''}`,
  };
}

/** Eine gewonnene Truhe in die Truhenplätze legen (geht nie verloren). */
function truheGeben(id) {
  const wohin = truheEinlagern(id, { warteschlange: true });
  return { truhe: truheNachId(id), truheWartet: wohin === 'warteschlange' };
}

/**
 * Was nach einem Kampf im Modus passiert.
 *
 * @param {object} modus - der laufende Modus (params.modus)
 * @param {'win'|'lose'} ergebnis
 * @param {{zeit: number, hp: number, maxHp: number}} kampf - Werte am Kampfende
 * @returns {{
 *   gewonnen: boolean,
 *   weiter: object|null,      // Parameter für den nächsten Kampf, sonst null
 *   truhe: object|null,       // gewonnene Truhe
 *   truheWartet: boolean,     // alle Plätze voll - sie steht in der Warteschlange
 *   schonGeholt: boolean,     // die Tagesbelohnung gab es heute schon
 *   zeitGesamt: number,       // Zeitangriff: Sekunden für den ganzen Lauf
 *   bestzeit: number|null,
 *   rekord: boolean,
 * }}
 */
export function modusErgebnis(modus, ergebnis, kampf) {
  const gewonnen = ergebnis === 'win';
  const anzahl = modusGegner(modus).length;
  const letzter = modus.schritt >= anzahl;
  const zeitGesamt = Math.round(((modus.zeit ?? 0) + (kampf.zeit ?? 0)) * 10) / 10;
  const aus = {
    gewonnen,
    weiter: null,
    truhe: null,
    truheWartet: false,
    schonGeholt: false,
    zeitGesamt,
    bestzeit: null,
    rekord: false,
  };
  const modi = gameState.modi;

  if (modus.id === 'zeit') aus.bestzeit = modi.zeitRekorde[modus.welt] ?? null;
  if (!gewonnen) return aus;

  // Es geht weiter: nächster Gegner.
  if (!letzter) {
    let hp = null; // null = mit vollen Lebenspunkten
    if (modus.id === 'bossrush') {
      hp = Math.min(kampf.maxHp, Math.round(kampf.hp + kampf.maxHp * MODI.bossrush.heilung));
    }
    aus.weiter = { ...modus, schritt: modus.schritt + 1, hp, zeit: zeitGesamt };
    return aus;
  }

  // Geschafft - die Belohnung.
  if (modus.id === 'tages') {
    if (modi.tagesDatum === modus.datum) aus.schonGeholt = true;
    else {
      modi.tagesDatum = modus.datum;
      Object.assign(aus, truheGeben(MODI.tages.belohnung));
    }
  } else if (modus.id === 'bossrush') {
    if (modi.bossrushDatum === modus.datum) aus.schonGeholt = true;
    else {
      modi.bossrushDatum = modus.datum;
      Object.assign(aus, truheGeben(anzahl >= MODI.bossrush.goldAb ? 'goldtruhe' : 'silbertruhe'));
    }
  } else if (modus.id === 'zeit') {
    if (aus.bestzeit === null || zeitGesamt < aus.bestzeit) {
      aus.rekord = true;
      modi.zeitRekorde[modus.welt] = zeitGesamt;
      aus.bestzeit = zeitGesamt;
      Object.assign(aus, truheGeben(MODI.zeit.belohnung));
    }
  }
  saveProgress();
  return aus;
}

/** Sekunden als "1:05,3". */
export function zeitText(sekunden) {
  const zehntel = Math.round(sekunden * 10);
  const minuten = Math.floor(zehntel / 600);
  const rest = (zehntel % 600) / 10;
  const sek = rest.toFixed(1).replace('.', ',');
  return `${minuten}:${rest < 10 ? '0' : ''}${sek}`;
}

/** Ein kurzer Satz für das Auswahlfenster "Spielmodi". */
export function modusInfo(id, jetzt = new Date()) {
  const frei = modusFrei(id);
  if (!frei.frei) return `🔒 ${frei.grund}`;
  const datum = heute(jetzt);
  const modi = gameState.modi;
  if (id === 'tages') {
    if (modi.tagesDatum === datum) return '✅ Heute geschafft - morgen wartet ein neuer Gegner';
    const { gegner, kniff } = tagesHerausforderung(datum, gameState.unlockedWorld);
    return `Heute: ${gegner.name} · ${kniff.icon} ${kniff.name}`;
  }
  if (id === 'bossrush') {
    const n = besiegteBossWelten().length;
    return `${n} ${n === 1 ? 'Boss' : 'Bosse'} · ${modi.bossrushDatum === datum ? '✅ Truhe heute geholt' : `Belohnung: ${n >= MODI.bossrush.goldAb ? 'Goldtruhe' : 'Silbertruhe'}`}`;
  }
  if (id === 'zeit') {
    const best = modi.zeitRekorde[gameState.unlockedWorld];
    return best != null ? `Bestzeit Welt ${gameState.unlockedWorld}: ${zeitText(best)}` : `Welt ${gameState.unlockedWorld}: noch keine Bestzeit`;
  }
  return '';
}
