/**
 * Aufbau eines 2v2-Kampfes: aus Spielerprofilen und der Lobby-Wahl wird
 * das "Setup", das die Engine (js/core/duell.js) startet.
 *
 * PROFIL
 * Jeder Spieler beschreibt sich mit einem kleinen Profil: Figur, Level,
 * Aufwertungen, Deck, Karten-Level, Boss-Kraft und Aussehen. Das sind
 * ROHDATEN aus seinem Spielstand - keine fertigen Kampfwerte. Die Werte
 * rechnet der Gastgeber selbst aus, mit derselben Formel wie im Abenteuer
 * (werteBerechnen in js/core/progression.js). Ein fremdes Profil geht vorher
 * durch profilPruefen(): Unbekanntes fliegt raus, alles wird auf die
 * erlaubten Grenzen gestutzt.
 *
 * Grenze dieses Ansatzes (ehrlich benannt): Ob jemand seinen Spielstand im
 * eigenen Browser verändert hat, kann ohne Server mit eigener Spielstand-
 * Hoheit niemand prüfen - auch das Abenteuer nicht. Geprüft wird, dass das
 * Profil im Rahmen des Möglichen liegt.
 */

import { MONSTERS, getMonster } from '../data/monsters.js';
import { nameFiltern } from '../data/namensfilter.js';
import { ATTACKS, ROCCO_ATTACKEN, START_ATTACKEN, stufenId } from '../data/attacks.js';
import { BEUTE_ATTACKEN, getSkin } from '../data/items.js';
import { BOSS_KRAEFTE, kraftFuerWelt } from '../data/kraefte.js';
import { WORLDS, getWorld } from '../data/worlds.js';
import { DUELL, KI_PARTNER, ROLLEN, TEAM_AUSGLEICH, getDuellGrad, paarGegner } from '../data/duell.js';
import { KARTEN_MAX_LEVEL, levelFaktor } from '../data/karten.js';
import { enemiesOfWorld } from '../data/enemies.js';
import { GEGNER_ARTEN } from '../data/gegnerarten.js';
import { MAX_LEVEL, MAX_STUFE, getAttackenLevel, getCharakter, werteBerechnen } from './progression.js';
import { figurAnzeigeName, figurFrei, gameState, getAktiveFigur, getAktiverSkin, getBossKraft, getDeck, rezeptPruefen } from './state.js';
import { eigenerSkin, istEigenerSkin } from './eigene-skins.js';
import { besiegteBossWelten } from './modi.js';

/** Version des Profil-Formats - steigt, wenn sich der Aufbau ändert. */
export const PROFIL_VERSION = 1;

/** Alle Karten, die ein Spieler im Deck haben darf (keine Gegner-Attacken). */
const SPIELER_KARTEN = new Set([...START_ATTACKEN, ...ROCCO_ATTACKEN.map((a) => a.id), ...BEUTE_ATTACKEN.map((a) => a.id)]);

/** Das eigene Profil - aus dem Spielstand. */
export function meinProfil(figurId = getAktiveFigur()) {
  const figur = MONSTERS[figurId] && figurFrei(figurId) ? figurId : 'timo';
  const basis = getMonster(figur);
  const charakter = getCharakter(figur);
  const deck = [...getDeck(basis)];
  const skinId = getAktiverSkin(figur);
  let skin = null;
  if (skinId && istEigenerSkin(skinId)) {
    const eigen = eigenerSkin(skinId);
    if (eigen) skin = { id: skinId, rezept: eigen.rezept };
  } else if (skinId && getSkin(skinId)) {
    skin = { id: skinId };
  }
  return {
    v: PROFIL_VERSION,
    name: figurAnzeigeName(basis),
    figur,
    level: charakter.level,
    upgrades: { ...charakter.upgrades },
    deck,
    kartenLevel: Object.fromEntries(deck.map((id) => [stufenId(id), getAttackenLevel(id)])),
    kraft: getBossKraft()?.id ?? null,
    skin,
    welt: gameState.unlockedWorld,
    bossWelten: besiegteBossWelten(),
  };
}

/** Eine ganze Zahl in Grenzen - alles andere wird zum Standard. */
function ganzzahl(wert, min, max, standard) {
  const n = Math.floor(Number(wert));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : standard;
}

/**
 * Bringt ein fremdes Profil in sichere Form. Kaputte oder unmögliche
 * Angaben werden ersetzt, nie übernommen.
 */
export function profilPruefen(roh) {
  const p = roh && typeof roh === 'object' ? roh : {};
  const figur = typeof p.figur === 'string' && MONSTERS[p.figur] ? p.figur : 'timo';
  const basis = getMonster(figur);
  const up = p.upgrades && typeof p.upgrades === 'object' ? p.upgrades : {};
  const deckOk = Array.isArray(p.deck) && p.deck.length === 8 && p.deck.every((id) => typeof id === 'string' && SPIELER_KARTEN.has(id));
  const deck = deckOk ? [...p.deck] : [...basis.deck];
  const kartenLevel = {};
  for (const id of deck) {
    const key = stufenId(id);
    kartenLevel[key] = ganzzahl(p.kartenLevel?.[key], 1, KARTEN_MAX_LEVEL, 1);
  }
  let skin = null;
  if (p.skin && typeof p.skin.id === 'string') {
    if (istEigenerSkin(p.skin.id) && /^eigen-[a-z0-9]{1,20}$/.test(p.skin.id)) skin = { id: p.skin.id, rezept: rezeptPruefen(p.skin.rezept) };
    else if (getSkin(p.skin.id)?.monsterId === figur) skin = { id: p.skin.id };
  }
  return {
    v: PROFIL_VERSION,
    // Der Name kommt vom anderen Gerät - unpassende Namen zeigen wir nicht.
    name: nameFiltern(String(p.name ?? '').trim().slice(0, 16) || basis.name, 'Spieler'),
    figur,
    level: ganzzahl(p.level, 1, MAX_LEVEL, 1),
    upgrades: {
      hp: ganzzahl(up.hp, 0, MAX_STUFE, 0),
      angriff: ganzzahl(up.angriff, 0, MAX_STUFE, 0),
      verteidigung: ganzzahl(up.verteidigung, 0, MAX_STUFE, 0),
      tempo: ganzzahl(up.tempo, 0, MAX_STUFE, 0),
    },
    deck,
    kartenLevel,
    kraft: typeof p.kraft === 'string' && BOSS_KRAEFTE.some((k) => k.id === p.kraft) ? p.kraft : null,
    skin,
    welt: ganzzahl(p.welt, 1, WORLDS.length, 1),
    bossWelten: Array.isArray(p.bossWelten) ? [...new Set(p.bossWelten.map(Number).filter((w) => WORLDS.some((x) => x.id === w)))] : [],
  };
}

/** Profil der KI-Teamkameradin im Solo-Modus: die eigene Figur, ohne Boss-Kraft. */
export function kiPartnerProfil(figurId) {
  return { ...meinProfil(figurId), name: 'KI-Partner', kraft: null, skin: null };
}

/** Kampfmonster eines Spielers (so kämpft er) - aus einem geprüften Profil. */
export function kampfMonsterAus(profil) {
  const basis = getMonster(profil.figur);
  const werte = werteBerechnen(basis, profil.level, profil.upgrades);
  return {
    ...basis,
    figur: profil.figur,
    name: profil.name,
    maxHp: werte.maxHp,
    damageFactor: werte.damageFactor,
    defense: werte.defense,
    energieProSekunde: werte.energieProSekunde,
    deck: [...profil.deck],
    kartenLevel: { ...profil.kartenLevel },
  };
}

/* ------------------------------------------------------------------ */
/*  Team-Ausgleich (siehe TEAM_AUSGLEICH in js/data/duell.js)          */
/* ------------------------------------------------------------------ */

/**
 * Kampfkraft eines Spielers: wie viel er austeilt mal wie viel er aushält.
 * Alles aus denselben Formeln wie im Abenteuer.
 */
export function kampfkraft(profil) {
  const m = kampfMonsterAus(profil);
  const karten = profil.deck.map((id) => levelFaktor(profil.kartenLevel[stufenId(id)] ?? 1));
  const kartenStaerke = karten.reduce((summe, f) => summe + f, 0) / Math.max(1, karten.length);
  const kraft = profil.kraft ? TEAM_AUSGLEICH.kraftFaktor : 1;
  return (m.damageFactor * kartenStaerke * m.energieProSekunde * m.maxHp * kraft) / (1 - m.defense);
}

/**
 * Ein Spieler, wie ihn eine Welt bei diesem Level erwartet (für die
 * Richtwerte). Ab Welt 2 hat man schon einen Boss besiegt - also eine Kraft.
 */
function richtProfil(level, mitKraft = false) {
  const basis = getMonster('timo');
  const kartenLevel = Math.max(1, Math.round(level / 3));
  return {
    figur: 'timo',
    level,
    upgrades: { hp: Math.floor(level / 5), angriff: Math.floor(level / 5), verteidigung: Math.floor(level / 8), tempo: Math.floor(level / 8) },
    deck: [...basis.deck],
    kartenLevel: Object.fromEntries(basis.deck.map((id) => [stufenId(id), kartenLevel])),
    kraft: mitKraft ? 'rindenpanzer' : null,
  };
}

/** Mittlere Lebenspunkte der normalen Gegner einer Welt. */
export function mittlereGegnerHp(weltId) {
  const gegner = enemiesOfWorld(weltId).filter((g) => !g.isBoss);
  return gegner.reduce((summe, g) => summe + g.maxHp, 0) / Math.max(1, gegner.length);
}

/** Stärke einer Welt: Schaden pro Energie × mittlere Lebenspunkte ihrer Gegner. */
export function weltStaerke(weltId) {
  const welt = getWorld(weltId) ?? WORLDS[0];
  return welt.powerPerXp * mittlereGegnerHp(welt.id);
}

/**
 * Die Kampfkraft, die eine Welt von jedem der beiden Spieler erwartet.
 * Bezugspunkt ist ein Neuling in Welt 1 (Level 1, ohne Boss-Kraft) - dort
 * ist das Duell ausgeglichen; jede Welt verlangt so viel mehr, wie sie
 * stärker ist.
 */
export function richtKraft(weltId) {
  const welt = getWorld(weltId) ?? WORLDS[0];
  return kampfkraft(richtProfil(1)) * (weltStaerke(welt.id) / weltStaerke(1));
}

/** Ab diesem Charakter-Level passt ein Team zu der Welt (v ≥ 1). */
export function empfohlenesLevel(weltId) {
  const welt = getWorld(weltId) ?? WORLDS[0];
  const ziel = richtKraft(welt.id);
  for (let level = 1; level < MAX_LEVEL; level++) {
    if (kampfkraft(richtProfil(level, welt.id > 1)) >= ziel) return level;
  }
  return MAX_LEVEL;
}

/**
 * Wie stark ist das Team im Vergleich zur Welt - und wie passen sich die
 * Gegner an? Gibt { verhaeltnis, schaden, hp } zurück.
 */
export function teamAusgleich(profile, weltId) {
  const team = profile.reduce((summe, p) => summe + kampfkraft(p), 0);
  const verhaeltnis = team / (profile.length * richtKraft(weltId));
  const regel = (r) => Math.min(r.max, Math.max(r.min, Math.pow(verhaeltnis, r.hoch)));
  return {
    verhaeltnis: Math.round(verhaeltnis * 100) / 100,
    schaden: Math.round(regel(TEAM_AUSGLEICH.schaden) * 100) / 100,
    hp: Math.round(regel(TEAM_AUSGLEICH.hp) * 100) / 100,
  };
}

/** Die beiden Gegner, an Rolle, Schwierigkeit und Team angepasst. */
export function gegnerAufbau({ welt, paar = 0, bossDuell = false, schwierigkeit = 'normal', ausgleich = { schaden: 1, hp: 1 } }) {
  const grad = getDuellGrad(schwierigkeit);
  // Normale Gegner gehen von den mittleren Lebenspunkten ihrer Welt aus (mal
  // ihrer Variante) - so ist jedes Paar einer Welt ähnlich stark, egal ob
  // es aus frühen oder späten Gegnern besteht. Bosse behalten ihre Werte.
  const mittelHp = mittlereGegnerHp(welt);
  return paarGegner(welt, paar, bossDuell).map(({ gegner, rolle }, i) => {
    const r = ROLLEN[rolle];
    const grundHp = gegner.isBoss ? gegner.maxHp : mittelHp * (GEGNER_ARTEN[gegner.art]?.hp ?? 1);
    return {
      id: `g${i + 1}`,
      rolle,
      kraft: rolle === 'boss' ? kraftFuerWelt(gegner.worldId)?.id ?? null : null,
      faehigkeiten: [...r.faehigkeiten],
      monster: {
        ...gegner,
        maxHp: Math.max(1, Math.round(grundHp * r.hp * grad.hp * DUELL.teamHpFaktor * ausgleich.hp)),
        damageFactor: (gegner.damageFactor ?? 1) * r.schaden * grad.schaden * ausgleich.schaden,
        defense: Math.min(0.5, (gegner.defense ?? 0) + r.abwehr),
        reactionTime: Number(((gegner.reactionTime ?? 1) * r.reaktion).toFixed(2)),
        patience: gegner.patience ?? 2,
        kartenLevel: {}, // Gegner kämpfen immer mit Level-1-Karten - unabhängig vom Spielstand
      },
    };
  });
}

/** Darf diese Lobby-Wahl gespielt werden? Sonst steht der Grund dabei. */
export function wahlErlaubt({ welt, bossDuell }, profile) {
  const hoechste = Math.max(...profile.map((p) => p?.welt ?? 1));
  if (!getWorld(welt)) return { ok: false, grund: 'Diese Welt gibt es nicht.' };
  if (welt > hoechste) return { ok: false, grund: 'Diese Welt hat noch keiner von euch freigeschaltet.' };
  if (bossDuell && !profile.some((p) => p?.bossWelten?.includes(welt))) {
    return { ok: false, grund: 'Boss-Duell: Einer von euch muss diesen Boss schon besiegt haben.' };
  }
  return { ok: true, grund: '' };
}

/**
 * Das vollständige Setup für die Engine. Reine Daten - der Gastgeber
 * schickt es so auch an den Gast, damit beide dieselben Figuren sehen.
 *
 * @param {object} o
 * @param {string} o.matchId
 * @param {number} o.welt
 * @param {number} [o.paar]
 * @param {boolean} [o.bossDuell]
 * @param {string} [o.schwierigkeit]
 * @param {object[]} o.profile - zwei geprüfte Profile (Spieler 1, Spieler 2)
 * @param {string[]} [o.steuerung] - je Spieler 'mensch' oder 'ki'
 */
export function duellSetup({ matchId, welt, paar = 0, bossDuell = false, schwierigkeit = 'normal', profile, steuerung = ['mensch', 'mensch'] }) {
  const w = getWorld(welt) ?? WORLDS[0];
  const ausgleich = teamAusgleich(profile, w.id);
  return {
    matchId,
    seed: matchId,
    welt: w.id,
    paar,
    bossDuell: Boolean(bossDuell),
    schwierigkeit: getDuellGrad(schwierigkeit).id,
    staerke: w.powerPerXp,
    kiPartner: { ...KI_PARTNER },
    ausgleich,
    team: profile.map((profil, i) => ({
      id: `p${i + 1}`,
      monster: kampfMonsterAus(profil),
      kraft: profil.kraft,
      steuerung: steuerung[i] ?? 'mensch',
      skin: profil.skin,
      level: profil.level,
    })),
    gegner: gegnerAufbau({ welt: w.id, paar, bossDuell, schwierigkeit, ausgleich }),
  };
}
