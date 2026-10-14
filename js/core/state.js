/**
 * Spielfortschritt.
 *
 * Hält fest, wie weit der Spieler ist, und speichert das im Browser
 * (localStorage). Für den Prototypen reicht das; die Struktur ist so
 * gehalten, dass später ein richtiger Server dahinter kann - dafür müssten
 * nur loadProgress und saveProgress ausgetauscht werden.
 */

import { LEVELS, bossLevelOf } from '../data/levels.js';
import { WORLDS } from '../data/worlds.js';
import { getKraft, kraftFuerWelt } from '../data/kraefte.js';
import { MONSTERS } from '../data/monsters.js';
import { BOSS_TRUHE, TRUHEN, TRUHEN_PLAETZE, ZEIT_TRUHEN } from '../data/shop.js';
import { stufenId } from '../data/attacks.js';
import { ALTES_LEVEL_NEU, KARTEN_MAX_LEVEL, kopienFuer } from '../data/karten.js';
import { TROPHAEEN_MAX, trophaeenFuerSieg } from '../data/trophaeen.js';
import { HUETE } from './outfit.js';

/** Alle Truhen, die in einem Truhenplatz liegen dürfen. */
const TRUHEN_IDS = [...TRUHEN.map((truhe) => truhe.id), BOSS_TRUHE.id];
import { cloudMerken } from './cloud.js';

const STORAGE_KEY = 'monsterquest.save.v3';
const ALTER_KEY = 'monsterquest.save.v2'; // Vorgängerversion, wird übernommen

/**
 * Zweite, lokale Sicherung des Spielstands.
 *
 * Sie liegt im SELBEN Browser wie der Spielstand. Sie hilft, wenn der
 * Hauptspeicher einmal kaputtgeht (abgebrochenes Schreiben, beschädigte
 * Daten) - NICHT, wenn jemand alle Browserdaten löscht. Dafür gibt es die
 * Übertragungscodes (Einstellungen → Datenbank).
 *
 * Inhalt: { zeit: Millisekunden, stand: <Spielstand> }
 */
const SICHERUNG_KEY = 'monsterquest.save.v3.sicherung';
/** Höchstens so oft wird die Sicherung während des Spielens erneuert. */
const SICHERUNG_ABSTAND = 60 * 1000;
let letzteSicherung = 0;

/** Woher der Stand beim Start kam - die Einstellungen zeigen das an. */
let geladenAus = null; // null | 'speicher' | 'sicherung' | 'alt'

/** Version des Speicherformats. Steigt, wenn sich der Aufbau ändert. */
const SPEICHER_VERSION = 5; // 5: Karten-Level bis 15 (siehe js/data/karten.js)

/** Frischer Spielstand - auch die Grundlage fürs Zurücksetzen. */
function createNewGame() {
  return {
    /* Zaehler, der bei jedem Speichern um eins steigt. Er entscheidet beim
       Start, ob der Stand aus der Datenbank neuer ist als der im Browser -
       siehe js/core/cloud.js. */
    revision: 0,
    version: SPEICHER_VERSION, // Speicherformat (siehe uebernehmen)
    name: '', // vom Spieler beim ersten Start gewählt (siehe js/ui/willkommen.js)
    aktiveFigur: 'timo', // die gewählte Spielfigur (siehe js/data/monsters.js)
    unlockedWorld: 1, // höchste freigeschaltete Welt
    clearedLevels: [], // Level-ids wie "1-3"
    stars: {}, // { "1-3": 2 }
    coins: 0,
    trophaeen: 0, // Trophäen für Liga und Rangliste (siehe js/core/trophaeen.js)
    trophaeenRekord: 0, // die höchste je erreichte Zahl
    materials: 0, // Material (💠) für Aufwertungen - siehe js/core/progression.js
    ownedAttacks: [], // aus Truhen freigeschaltete Attacken
    gratisTruheZaehler: 0, // Siege seit der letzten Gratis-Truhe (siehe js/core/belohnung.js)
    // Truhenplätze (siehe js/core/truhenplaetze.js): je Platz null oder
    // { id, bereitAb } - bereitAb ist null (noch nicht gestartet) oder der
    // Zeitpunkt in Millisekunden, ab dem die Truhe offen ist.
    truhenPlaetze: Array(TRUHEN_PLAETZE).fill(null),
    truhenWarteschlange: [], // Bosstruhen, die gerade keinen Platz finden
    // Zeit-Truhen (siehe js/core/zeittruhen.js): je Truhen-id der Zeitpunkt
    // in Millisekunden, ab dem die nächste bereitsteht. Fehlt er: sofort.
    zeitTruhen: {},
    // Kampf-Modi (siehe js/core/modi.js): an welchem Tag die Tagesbelohnung
    // zuletzt geholt wurde, und die Bestzeiten im Zeitangriff je Welt.
    modi: { tagesDatum: null, bossrushDatum: null, zeitRekorde: {} },
    bossPowers: [], // freigeschaltete Boss-Kräfte (siehe js/data/kraefte.js)
    bossPower: null, // die getragene Boss-Kraft (id) oder null
    ownedSkins: ['skin-standard'],
    activeSkin: {}, // { monsterId: skinId }
    // Selbst gebaute Outfits aus der Skin-Werkstatt (werkstatt.html) - nur
    // das Rezept, die Bilder baut das Spiel daraus (js/core/eigene-skins.js).
    eigeneOutfits: [], // [{ id: 'eigen-…', name, rezept: { kleidung, helligkeit, hut, hutFarbe } }]
    decks: {}, // { monsterId: [8 Attacken-ids] } - leer = Standarddeck
    characters: {}, // { monsterId: { level, xp, upgrades } } - siehe progression.js
    attackLevels: {}, // { attackId: level } - 1 bis 15
    kartenKopien: {}, // { attackId: Kopien für das nächste Level } (siehe js/data/karten.js)
    // Einmal-Hinweise (z. B. das Kampf-Tutorial), die nur beim ersten Mal
    // erscheinen. Schlüssel = Hinweis-id, Wert = true, sobald gesehen.
    gesehen: {},
    // Statistik und Erfolge - siehe js/core/statistik.js und js/data/erfolge.js.
    statistik: {
      kaempfe: 0,
      siege: 0,
      niederlagen: 0,
      krits: 0,
      schaden: 0,
      karten: 0,
      bosse: 0,
      arenaBest: 0, // beste Rundenzahl in der Endlos-Arena
      erfolge: [], // ids der freigeschalteten Erfolge
    },
    // Tagesaufgaben - siehe js/core/aufgaben.js
    dailies: {
      datum: null, // "JJJJ-MM-TT" des Tages, fuer den die Aufgaben gelten
      aufgaben: [], // die ids der heutigen Aufgaben
      fortschritt: {}, // { aufgabenId: Anzahl }
      abgeholt: [], // ids, deren Belohnung schon geholt wurde
    },
    settings: {
      sound: true, // Klänge im Spiel
      musik: true, // Hintergrundmusik
      animations: true,
      vibration: true, // kurzes Vibrieren bei Treffern (nur wo das Gerät es kann)
      schwierigkeit: 'normal', // 'leicht' | 'normal' | 'schwer' (siehe js/data/schwierigkeit.js)
      deckSortierung: 'deck', // Anzeige im Deckmenü (siehe js/core/sortierung.js)
      rangliste: true, // mit Name und Trophäen in der Rangliste erscheinen
    },
  };
}

export const gameState = createNewGame();

/**
 * Lädt den gespeicherten Fortschritt, falls vorhanden.
 *
 * @returns {boolean} true, wenn schon ein Spielstand da war. false heisst:
 *   erster Start auf diesem Gerät - dann fragt das Spiel nach einem Namen
 *   (siehe js/main.js und js/ui/willkommen.js).
 */
export function loadProgress() {
  // 1. Der normale Spielstand. Nur ein lesbares Objekt zählt - kaputte
  //    oder abgeschnittene Daten fallen auf die Sicherung zurück.
  const haupt = lesen(STORAGE_KEY);
  if (haupt) {
    uebernehmen(haupt);
    geladenAus = 'speicher';
    sicherungSchreiben(true); // gelesen und gültig: gleich als Sicherung ablegen
    return true;
  }

  // 2. Der Hauptspeicher fehlt oder ist kaputt: die zweite Sicherung.
  const sicherung = lesen(SICHERUNG_KEY);
  if (sicherung?.stand && typeof sicherung.stand === 'object') {
    uebernehmen(sicherung.stand);
    geladenAus = 'sicherung';
    console.warn('Spielstand war beschädigt - aus der lokalen Sicherung wiederhergestellt.');
    speichernLokal(); // den Hauptspeicher reparieren
    return true;
  }

  // 3. Alter Spielstand (3 Level ohne Welten): in die neue Form bringen.
  const saved = lesen(ALTER_KEY);
  if (saved) {
    uebernehmen({
      unlockedWorld: 1,
      clearedLevels: (saved.clearedLevels ?? []).map((nummer) => `1-${nummer}`),
      stars: Object.fromEntries(
        Object.entries(saved.stars ?? {}).map(([nummer, wert]) => [`1-${nummer}`, wert])
      ),
      coins: saved.coins,
      settings: saved.settings,
    });
    geladenAus = 'alt';
    saveProgress();
    return true;
  }
  return false;
}

/**
 * Liest einen Eintrag aus dem Browser-Speicher. Gibt nur ein echtes Objekt
 * zurück - alles andere (fehlt, kaputtes JSON, gesperrter Speicher) wird null.
 */
function lesen(schluessel) {
  try {
    const raw = localStorage.getItem(schluessel);
    if (!raw) return null;
    const daten = JSON.parse(raw);
    return daten && typeof daten === 'object' && !Array.isArray(daten) ? daten : null;
  } catch (error) {
    console.warn(`Gespeicherte Daten unter "${schluessel}" sind unlesbar:`, error);
    return null;
  }
}

/** Schreibt die Sicherung - höchstens einmal pro Minute, außer erzwungen. */
function sicherungSchreiben(erzwingen = false) {
  const jetzt = Date.now();
  if (!erzwingen && jetzt - letzteSicherung < SICHERUNG_ABSTAND) return;
  try {
    localStorage.setItem(SICHERUNG_KEY, JSON.stringify({ zeit: jetzt, stand: gameState }));
    letzteSicherung = jetzt;
  } catch (error) {
    console.warn('Lokale Sicherung konnte nicht geschrieben werden:', error);
  }
}

/** Schreibt den Spielstand in den Browser (ohne Datenbank). */
function speichernLokal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  } catch (error) {
    console.warn('Spielstand konnte nicht gespeichert werden:', error);
  }
}

/**
 * Stand der lokalen Sicherung - für die Anzeige in den Einstellungen.
 * @returns {{vorhanden: boolean, zeit: number|null, geladenAus: string|null}}
 */
export function sicherungsInfo() {
  const sicherung = lesen(SICHERUNG_KEY);
  return {
    vorhanden: Boolean(sicherung?.stand),
    zeit: Number(sicherung?.zeit) || null,
    geladenAus,
  };
}

/** Frueherer Name der Spielerfigur -> heutiger Name. */
const ALTE_FIGUR = 'glutwelpe';
const NEUE_FIGUR = 'timo';

/**
 * Timos Attacken hiessen frueher anders - sie passten zu einem Tier, nicht
 * zu einem Menschen. Werte und Kosten sind gleich geblieben, nur die Namen
 * und ids haben gewechselt. Ohne diese Tabelle zeigte ein gespeichertes Deck
 * auf Attacken, die es nicht mehr gibt.
 */
const ALTE_ATTACKEN = {
  krallenhieb: 'fausthieb',
  biss: 'ellbogenstoss',
  feuerball: 'wirbelkick',
  flammenstoss: 'aufwaertshaken',
  schutzschild: 'deckung',
  feuersturm: 'energiestoss',
  lavabombe: 'druckwelle',
  meteor: 'sturmfaust',
};

/** Uebersetzt eine Attacken-id, falls sie aus der alten Zeit stammt. */
function attackeUmbenennen(id) {
  return ALTE_ATTACKEN[id] ?? id;
}

/**
 * Zieht einen Eintrag von der alten auf die neue Figur um.
 * Betrifft alles, was nach Figur abgelegt ist: Deck, Charakterfortschritt
 * und der getragene Skin. Ein bereits umgezogener Spielstand bleibt, wie er ist.
 */
function figurUmbenennen(eintrag) {
  if (!eintrag || typeof eintrag !== 'object') return {};
  if (!(ALTE_FIGUR in eintrag)) return eintrag;

  const { [ALTE_FIGUR]: alt, ...rest } = eintrag;
  // Gibt es den neuen Eintrag schon, hat er Vorrang.
  return { [NEUE_FIGUR]: alt, ...rest };
}

function uebernehmen(saved) {
  gameState.revision = Number(saved.revision) || 0;
  // Ältere Stände (ohne Versionsnummer) laufen durch dieselben Umzüge wie
  // bisher - fehlende Felder bekommen unten ihre Standardwerte.
  gameState.version = SPEICHER_VERSION;
  gameState.name = typeof saved.name === 'string' ? saved.name : '';
  gameState.aktiveFigur =
    typeof saved.aktiveFigur === 'string' && MONSTERS[saved.aktiveFigur] ? saved.aktiveFigur : 'timo';
  gameState.unlockedWorld = Number(saved.unlockedWorld) || 1;
  gameState.clearedLevels = Array.isArray(saved.clearedLevels) ? saved.clearedLevels.map(String) : [];
  gameState.stars = saved.stars && typeof saved.stars === 'object' ? saved.stars : {};
  gameState.coins = Number(saved.coins) || 0;
  trophaeenUebernehmen(saved);
  gameState.materials = Number(saved.materials) || 0;
  gameState.ownedAttacks = Array.isArray(saved.ownedAttacks) ? saved.ownedAttacks : [];
  gameState.gratisTruheZaehler = Math.max(0, Math.floor(Number(saved.gratisTruheZaehler) || 0));
  truhenUebernehmen(saved);
  zeitTruhenUebernehmen(saved);
  modiUebernehmen(saved);
  // Nur bekannte Kraft-ids übernehmen, damit ein alter Spielstand keine
  // Geister-Kraft einschleppt.
  gameState.bossPowers = Array.isArray(saved.bossPowers)
    ? saved.bossPowers.filter((id) => getKraft(id))
    : [];
  gameState.bossPower =
    saved.bossPower && gameState.bossPowers.includes(saved.bossPower) ? saved.bossPower : null;
  gameState.ownedSkins = Array.isArray(saved.ownedSkins) ? saved.ownedSkins : ['skin-standard'];
  gameState.activeSkin = figurUmbenennen(saved.activeSkin ?? {});
  gameState.eigeneOutfits = eigeneOutfitsPruefen(saved.eigeneOutfits);
  // Die Spielerfigur hiess frueher "glutwelpe" und heisst jetzt "timo".
  // Alte Spielstaende werden umgezogen, damit Level, Deck und Skin bleiben.
  // Decks: erst die Figur umziehen, dann die Attacken darin uebersetzen.
  gameState.decks = Object.fromEntries(
    Object.entries(figurUmbenennen(saved.decks ?? {})).map(([figur, deck]) => [
      figur,
      Array.isArray(deck) ? deck.map(attackeUmbenennen) : deck,
    ])
  );
  gameState.characters = figurUmbenennen(saved.characters ?? {});
  // Aufgewertete Attacken behalten ihr Level unter dem neuen Namen.
  // Vor Version 5 gab es nur 5 Level mit +20 % - umrechnen, damit keine
  // Karte durch den Umstieg schwächer wird (siehe ALTES_LEVEL_NEU).
  const alteLevel = (Number(saved.version) || 0) < 5;
  gameState.attackLevels = Object.fromEntries(
    Object.entries(saved.attackLevels ?? {}).map(([id, level]) => {
      const zahl = Math.max(1, Math.floor(Number(level) || 1));
      const neu = alteLevel ? ALTES_LEVEL_NEU[Math.min(5, zahl)] ?? 1 : zahl;
      return [attackeUmbenennen(id), Math.min(KARTEN_MAX_LEVEL, neu)];
    })
  );
  gameState.kartenKopien = Object.fromEntries(
    Object.entries(saved.kartenKopien && typeof saved.kartenKopien === 'object' ? saved.kartenKopien : {})
      .map(([id, anzahl]) => [id, Math.max(0, Math.floor(Number(anzahl) || 0))])
  );
  // Fehlt der Block in einem aelteren Spielstand, legt aufgaben.js ihn beim
  // ersten Blick auf die Aufgaben selbst an.
  gameState.dailies = {
    datum: saved.dailies?.datum ?? null,
    aufgaben: Array.isArray(saved.dailies?.aufgaben) ? saved.dailies.aufgaben : [],
    fortschritt: saved.dailies?.fortschritt ?? {},
    abgeholt: Array.isArray(saved.dailies?.abgeholt) ? saved.dailies.abgeholt : [],
  };
  gameState.gesehen = saved.gesehen && typeof saved.gesehen === 'object' ? { ...saved.gesehen } : {};
  // Statistik: fehlende Zähler bekommen 0, damit ein alter Stand nicht bricht.
  const st = saved.statistik && typeof saved.statistik === 'object' ? saved.statistik : {};
  gameState.statistik = {
    kaempfe: Number(st.kaempfe) || 0,
    siege: Number(st.siege) || 0,
    niederlagen: Number(st.niederlagen) || 0,
    krits: Number(st.krits) || 0,
    schaden: Number(st.schaden) || 0,
    karten: Number(st.karten) || 0,
    bosse: Number(st.bosse) || 0,
    arenaBest: Number(st.arenaBest) || 0,
    erfolge: Array.isArray(st.erfolge) ? st.erfolge.map(String) : [],
  };
  // Einstellungen: neue Schalter behalten ihren Standardwert, wenn ein alter
  // Stand sie noch nicht kennt. Nur Einträge mit passendem Typ zählen.
  const standard = createNewGame().settings;
  const gespeichert = saved.settings && typeof saved.settings === 'object' ? saved.settings : {};
  gameState.settings = { ...standard };
  Object.keys(standard).forEach((key) => {
    if (typeof gespeichert[key] === typeof standard[key]) gameState.settings[key] = gespeichert[key];
  });
}

/**
 * Truhenplätze aus dem Spielstand übernehmen. Nur bekannte Truhen zählen -
 * eine unbekannte id ließe sich nie öffnen.
 *
 * Ältere Stände kannten statt der Plätze ein Lager ohne Wartezeit
 * (truhenLager). Diese Truhen wurden unter der alten Regel gewonnen - sie
 * kommen deshalb gleich FERTIG in die Plätze, der Rest in die Warteschlange.
 */
function truhenUebernehmen(saved) {
  const bekannt = (id) => TRUHEN_IDS.includes(id);
  const plaetze = Array.isArray(saved.truhenPlaetze) ? saved.truhenPlaetze : [];
  gameState.truhenPlaetze = Array.from({ length: TRUHEN_PLAETZE }, (_, i) => {
    const platz = plaetze[i];
    if (!platz || !bekannt(platz.id)) return null;
    const bereitAb = Number(platz.bereitAb);
    return { id: platz.id, bereitAb: platz.bereitAb === null || !Number.isFinite(bereitAb) ? null : bereitAb };
  });
  gameState.truhenWarteschlange = Array.isArray(saved.truhenWarteschlange)
    ? saved.truhenWarteschlange.filter(bekannt)
    : [];

  const altesLager = Array.isArray(saved.truhenLager) ? saved.truhenLager.filter(bekannt) : [];
  altesLager.forEach((id) => {
    const frei = gameState.truhenPlaetze.indexOf(null);
    if (frei >= 0) gameState.truhenPlaetze[frei] = { id, bereitAb: 0 };
    else gameState.truhenWarteschlange.push(id);
  });
}

/**
 * Eigene Outfits übernehmen - nur gültige Rezepte. Ein kaputtes Rezept
 * fliegt raus, statt später beim Bauen der Bilder abzustürzen.
 */
function eigeneOutfitsPruefen(liste) {
  if (!Array.isArray(liste)) return [];
  const farbe = (wert) => (typeof wert === 'string' && /^#[0-9a-f]{6}$/i.test(wert) ? wert.toLowerCase() : null);
  return liste
    .filter((e) => e && typeof e.id === 'string' && /^eigen-[a-z0-9]{1,20}$/.test(e.id) && e.rezept && typeof e.rezept === 'object')
    .slice(0, 8)
    .map((e) => ({
      id: e.id,
      name: String(e.name ?? '').trim().slice(0, 20) || 'Mein Outfit',
      rezept: {
        kleidung: farbe(e.rezept.kleidung),
        helligkeit: Math.max(-0.2, Math.min(0.2, Number(e.rezept.helligkeit) || 0)),
        hut: Object.hasOwn(HUETE, e.rezept.hut) ? e.rezept.hut : 'keiner',
        hutFarbe: farbe(e.rezept.hutFarbe),
      },
    }));
}

/** Kampf-Modi übernehmen - nur Daten in der erwarteten Form. */
function modiUebernehmen(saved) {
  const m = saved.modi && typeof saved.modi === 'object' ? saved.modi : {};
  const datum = (wert) => (typeof wert === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(wert) ? wert : null);
  const zeitRekorde = {};
  if (m.zeitRekorde && typeof m.zeitRekorde === 'object') {
    Object.entries(m.zeitRekorde).forEach(([welt, sekunden]) => {
      const zahl = Number(sekunden);
      if (WORLDS.some((w) => String(w.id) === welt) && Number.isFinite(zahl) && zahl > 0) zeitRekorde[welt] = zahl;
    });
  }
  gameState.modi = { tagesDatum: datum(m.tagesDatum), bossrushDatum: datum(m.bossrushDatum), zeitRekorde };
}

/**
 * Zeit-Truhen übernehmen: nur bekannte ids mit einer echten Zahl. Liegt der
 * Zeitpunkt weiter weg als eine ganze Wartezeit (Uhr am Gerät verstellt),
 * wird er auf eine Wartezeit ab jetzt gekürzt - sonst wartet man ewig.
 */
function zeitTruhenUebernehmen(saved) {
  const gespeichert = saved.zeitTruhen && typeof saved.zeitTruhen === 'object' ? saved.zeitTruhen : {};
  const jetzt = Date.now();
  gameState.zeitTruhen = {};
  ZEIT_TRUHEN.forEach(({ id, minuten }) => {
    const ab = Number(gespeichert[id]);
    if (!Number.isFinite(ab)) return;
    gameState.zeitTruhen[id] = Math.min(ab, jetzt + minuten * 60 * 1000);
  });
}

/**
 * Trophäen aus dem Spielstand übernehmen.
 *
 * Ältere Stände kennen noch keine Trophäen. Damit niemand, der schon weit
 * ist, bei null anfängt, bekommt er die Trophäen für jeden Kampf, den er
 * schon einmal gewonnen hat - so, als hätte es sie damals schon gegeben.
 */
function trophaeenUebernehmen(saved) {
  const zahl = (wert) => Math.max(0, Math.min(TROPHAEEN_MAX, Math.floor(Number(wert) || 0)));
  if (saved.trophaeen === undefined) {
    gameState.trophaeen = zahl(
      gameState.clearedLevels.reduce((summe, id) => {
        const level = LEVELS.find((eintrag) => eintrag.id === id);
        return level ? summe + trophaeenFuerSieg(level, true) : summe;
      }, 0)
    );
  } else {
    gameState.trophaeen = zahl(saved.trophaeen);
  }
  gameState.trophaeenRekord = Math.max(gameState.trophaeen, zahl(saved.trophaeenRekord));
}

/** Wurde dieser Einmal-Hinweis schon gezeigt? */
export function hinweisGesehen(id) {
  return gameState.gesehen[id] === true;
}

/** Merkt sich, dass ein Einmal-Hinweis gezeigt wurde. */
export function merkeHinweis(id) {
  gameState.gesehen[id] = true;
  saveProgress();
}

/**
 * Speichert den aktuellen Fortschritt.
 *
 * Erst in den Browser - das geht sofort und klappt auch ohne Netz. Danach
 * wird der Stand der Datenbank gemeldet; die sammelt kurz und schickt dann
 * gebuendelt (siehe js/core/cloud.js). Ist keine Datenbank eingetragen,
 * passiert dort nichts.
 */
export function saveProgress() {
  gameState.revision = (Number(gameState.revision) || 0) + 1;

  speichernLokal();
  sicherungSchreiben();

  cloudMerken(JSON.parse(JSON.stringify(gameState)));
}

/**
 * Uebernimmt einen fremden Spielstand - aus der Datenbank oder ueber einen
 * Uebertragungscode. Geht durch dieselbe Pruefung wie ein gespeicherter
 * Stand, damit kaputte Daten das Spiel nicht umwerfen.
 *
 * @param {object} daten
 * @param {boolean} [speichern] - false, wenn der Stand gerade erst von dort
 *        kam und nicht sofort wieder hochgeschickt werden soll
 */
export function spielstandUebernehmen(daten, speichern = true) {
  if (!daten || typeof daten !== 'object') return false;
  uebernehmen(daten);
  if (speichern) {
    saveProgress();
  } else {
    speichernLokal();
  }
  sicherungSchreiben(true);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Welten                                                             */
/* ------------------------------------------------------------------ */

/** Ist diese Welt betretbar? */
export function isWorldUnlocked(worldId) {
  return Number(worldId) <= gameState.unlockedWorld;
}

/** Wie viele Kämpfe einer Welt sind geschafft? */
export function clearedInWorld(worldId) {
  return LEVELS.filter(
    (level) => level.worldId === Number(worldId) && isLevelCleared(level.id)
  ).length;
}

/** Ist die Welt komplett durchgespielt? */
export function isWorldCleared(worldId) {
  const boss = bossLevelOf(worldId);
  return Boolean(boss) && isLevelCleared(boss.id);
}

/* ------------------------------------------------------------------ */
/*  Spielfigur                                                         */
/* ------------------------------------------------------------------ */

/**
 * Ist diese Figur schon wählbar? Timo immer; jede andere erst, wenn ihr
 * Freischalt-Level geschafft ist (siehe freischaltLevel in js/data/monsters.js).
 */
export function figurFrei(id) {
  const monster = MONSTERS[id];
  if (!monster) return false;
  if (!monster.freischaltLevel) return true;
  return isLevelCleared(monster.freischaltLevel);
}

/** Die aktuell gewählte Figur - fällt auf Timo zurück, falls etwas nicht passt. */
export function getAktiveFigur() {
  const id = gameState.aktiveFigur;
  return MONSTERS[id] && figurFrei(id) ? id : 'timo';
}

/** Wählt eine (freigeschaltete) Figur aus. Gibt true zurück, wenn es klappte. */
export function setAktiveFigur(id) {
  if (!MONSTERS[id] || !figurFrei(id)) return false;
  gameState.aktiveFigur = id;
  saveProgress();
  return true;
}

/**
 * Der Anzeigename der eigenen Spielfigur - IMMER der Spielername (wie in der
 * Lobby), damit die eigene Figur überall gleich heißt, egal welche Figur man
 * gerade trägt. Die Figuren haben zwar eigene Namen (Timo, Rocco) - die dienen
 * aber nur der Unterscheidung in der Auswahl. Nur solange noch kein Name gesetzt
 * ist, greift der Eigenname der Figur als Rückfall.
 */
export function figurAnzeigeName(monster) {
  const name = (gameState.name ?? '').trim();
  return name || monster?.name || 'Held';
}

/* ------------------------------------------------------------------ */
/*  Level                                                              */
/* ------------------------------------------------------------------ */

/**
 * Ein Kampf ist offen, wenn seine Welt offen ist und der Kampf davor
 * geschafft wurde. Der erste Kampf einer Welt ist immer offen.
 */
export function isLevelUnlocked(levelId) {
  const level = LEVELS.find((entry) => entry.id === String(levelId));
  if (!level || !isWorldUnlocked(level.worldId)) return false;
  if (level.number === 1) return true;
  return isLevelCleared(`${level.worldId}-${level.number - 1}`);
}

/** Wurde dieser Kampf schon gewonnen? */
export function isLevelCleared(levelId) {
  return gameState.clearedLevels.includes(String(levelId));
}

/** Bisher beste Sternewertung eines Kampfes (0 = noch nicht geschafft). */
export function getStars(levelId) {
  return gameState.stars[String(levelId)] ?? 0;
}

/** Sterne einer Welt - oder aller Welten, wenn nichts angegeben wird. */
export function getTotalStars(worldId = null) {
  return LEVELS.filter((level) => worldId === null || level.worldId === Number(worldId)).reduce(
    (summe, level) => summe + getStars(level.id),
    0
  );
}

/** Der nächste offene, noch nicht geschaffte Kampf einer Welt. */
export function nextLevelOf(worldId) {
  return LEVELS.find(
    (level) =>
      level.worldId === Number(worldId) && isLevelUnlocked(level.id) && !isLevelCleared(level.id)
  );
}

/**
 * Sterne aus dem Kampfergebnis berechnen:
 * 3 Sterne für einen fast unbeschadeten Sieg, mindestens 1 für einen Sieg.
 */
export function calculateStars(hpLeft, maxHp) {
  const share = hpLeft / maxHp;
  if (share >= 0.7) return 3;
  if (share >= 0.35) return 2;
  return 1;
}

/**
 * Kampf als geschafft markieren, Sterne und Münzen gutschreiben.
 * War es ein Bosskampf, wird die nächste Welt freigeschaltet.
 *
 * @returns {{stars: number, coins: number, isNew: boolean, newWorld: object|null}}
 */
export function completeLevel(levelId, { stars = 1, reward = 0 } = {}) {
  const id = String(levelId);
  const level = LEVELS.find((entry) => entry.id === id);
  const isNew = !isLevelCleared(id);

  if (isNew) gameState.clearedLevels.push(id);
  if (stars > getStars(id)) gameState.stars[id] = stars;

  // Beim ersten Sieg gibt es die volle Belohnung, danach ein Viertel.
  const coins = isNew ? reward : Math.round(reward * 0.25);
  gameState.coins += coins;

  // Boss besiegt: nächste Welt öffnen.
  let newWorld = null;
  if (level?.isBoss) {
    const naechste = WORLDS.find((world) => world.id === level.worldId + 1);
    if (naechste && naechste.id > gameState.unlockedWorld) {
      gameState.unlockedWorld = naechste.id;
      newWorld = naechste;
    }
  }

  saveProgress();
  return { stars, coins, isNew, newWorld };
}

/* ------------------------------------------------------------------ */
/*  Besitz: Münzen, Material, Attacken, Skins                          */
/* ------------------------------------------------------------------ */

/** Reichen die Münzen? */
export function kannBezahlen(preis) {
  return gameState.coins >= preis;
}

/** Münzen abziehen. Gibt false zurück, wenn es nicht reicht. */
export function bezahlen(preis) {
  if (!kannBezahlen(preis)) return false;
  gameState.coins -= preis;
  saveProgress();
  return true;
}

export function besitztAttacke(id) {
  return gameState.ownedAttacks.includes(id);
}

export function besitztSkin(id) {
  return gameState.ownedSkins.includes(id);
}

/**
 * Schreibt ein Beutestück gut.
 *
 * Attacken und Skins, die man schon hat, werden zu Münzen - das entscheidet
 * schon js/core/loot.js, hier wird nur noch eingetragen.
 *
 * @returns {object} das gutgeschriebene Stück
 */
export function beuteGutschreiben(stueck) {
  switch (stueck.art) {
    case 'muenzen':
      gameState.coins += stueck.menge;
      break;
    case 'material':
      gameState.materials += stueck.menge;
      break;
    case 'attacke':
      if (!besitztAttacke(stueck.id)) gameState.ownedAttacks.push(stueck.id);
      break;
    case 'karte':
      // Kopien einer Karte - genug davon heben sie ein Level höher.
      stueck.ergebnis = karteGutschreiben(stueck.id, stueck.menge ?? 1);
      break;
    case 'skin':
      if (!besitztSkin(stueck.id)) gameState.ownedSkins.push(stueck.id);
      break;
    default:
      break;
  }

  saveProgress();
  return stueck;
}

/**
 * Schreibt Kopien einer Karte gut. Reichen sie für das nächste Level, steigt
 * die Karte - auch mehrere Level auf einmal. Auf Level 15 ist Schluss.
 *
 * @returns {{levelVorher: number, level: number, kopien: number, benoetigt: number}}
 */
export function karteGutschreiben(attackId, menge = 1) {
  const key = stufenId(attackId);
  const levelVorher = Number(gameState.attackLevels[key]) || 1;
  let level = levelVorher;
  let kopien = (Number(gameState.kartenKopien[key]) || 0) + Math.max(0, menge);
  while (level < KARTEN_MAX_LEVEL && kopien >= kopienFuer(level)) {
    kopien -= kopienFuer(level);
    level += 1;
  }
  if (level >= KARTEN_MAX_LEVEL) kopien = 0;
  gameState.attackLevels[key] = level;
  gameState.kartenKopien[key] = kopien;
  return { levelVorher, level, kopien, benoetigt: kopienFuer(level) };
}

/* ------------------------------------------------------------------ */
/*  Deck und Skin eines Monsters                                       */
/* ------------------------------------------------------------------ */

/** Das aktuelle Deck eines Monsters - oder sein Standarddeck. */
export function getDeck(monster) {
  const eigenes = gameState.decks[monster.id];
  return Array.isArray(eigenes) && eigenes.length === 8 ? eigenes : monster.deck;
}

/** Ein Deck speichern. Es muss genau 8 Attacken enthalten. */
export function setDeck(monsterId, attacken) {
  if (attacken.length !== 8) {
    throw new Error(`Ein Deck braucht genau 8 Attacken, bekommen: ${attacken.length}`);
  }
  gameState.decks[monsterId] = [...attacken];
  saveProgress();
}

/** Der aktive Skin eines Monsters (oder null). */
export function getAktiverSkin(monsterId) {
  return gameState.activeSkin[monsterId] ?? null;
}

/** Skin auswählen. */
export function setAktiverSkin(monsterId, skinId) {
  gameState.activeSkin[monsterId] = skinId;
  saveProgress();
}

/* ------------------------------------------------------------------ */
/*  Boss-Kräfte                                                        */
/* ------------------------------------------------------------------ */

/** Ist diese Boss-Kraft freigeschaltet? */
export function besitztKraft(id) {
  return gameState.bossPowers.includes(id);
}

/**
 * Schaltet die Boss-Kraft einer Welt frei - wird nach dem ersten Sieg über
 * ihren Boss aufgerufen (siehe js/core/belohnung.js).
 *
 * Trägt der Spieler noch keine Kraft, wird die neue gleich angelegt - so hat
 * man sie sofort im nächsten Kampf dabei, ohne sie erst auszuwählen.
 *
 * @returns {object|null} die neu freigeschaltete Kraft, oder null wenn es
 *   für die Welt keine gibt oder sie schon da war
 */
export function bossKraftFreischalten(worldId) {
  const kraft = kraftFuerWelt(worldId);
  if (!kraft || besitztKraft(kraft.id)) return null;

  gameState.bossPowers.push(kraft.id);
  if (!gameState.bossPower) gameState.bossPower = kraft.id;
  saveProgress();
  return kraft;
}

/** Die getragene Boss-Kraft als Objekt - oder null. */
export function getBossKraft() {
  return gameState.bossPower && besitztKraft(gameState.bossPower)
    ? getKraft(gameState.bossPower)
    : null;
}

/**
 * Legt die getragene Boss-Kraft fest. null = keine tragen. Nur eine
 * freigeschaltete Kraft (oder null) wird angenommen.
 */
export function setBossKraft(id) {
  if (id === null || besitztKraft(id)) {
    gameState.bossPower = id;
    saveProgress();
  }
}

/** Eine Einstellung ändern (z. B. Ton an/aus). */
export function setSetting(key, value) {
  gameState.settings[key] = value;
  saveProgress();
}

/** Der Name, unter dem der Spieler auftritt - höchstens 16 Zeichen. */
export const NAME_MAX = 16;

/**
 * Setzt den Spielernamen. Leerzeichen am Rand fallen weg, zu lange Namen
 * werden gekürzt. Ein leerer Name ist erlaubt (dann zeigt das Spiel keinen).
 */
export function setSpielername(name) {
  gameState.name = String(name ?? '').trim().slice(0, NAME_MAX);
  saveProgress();
}

/** Setzt den gesamten Fortschritt zurück. */
export function resetProgress() {
  // Der Zaehler laeuft weiter. Setzte man ihn auf 0 zurueck, waere der alte
  // Stand in der Datenbank "neuer" und wuerde das Zuruecksetzen beim
  // naechsten Start wieder rueckgaengig machen.
  const bisher = Number(gameState.revision) || 0;
  Object.assign(gameState, createNewGame());
  gameState.revision = bisher;
  saveProgress();
  // Die Sicherung sofort mit zurücksetzen - sonst holte ein späterer
  // Speicherfehler den alten Stand wieder hervor.
  sicherungSchreiben(true);
}
