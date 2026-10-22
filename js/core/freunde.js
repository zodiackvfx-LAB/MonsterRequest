/**
 * Freunde und 2v2-Einladungen.
 *
 * WIE ES FUNKTIONIERT
 * Jeder Spieler hat eine Freundes-ID wie "MQ-58291". Sie ist nur zum
 * Suchen da - wer sie kennt, kommt damit an nichts heran. Alles, was etwas
 * verändert, schickt die eigene geheime Spielernummer mit (js/core/cloud.js)
 * und darf in der Datenbank nur Einträge ändern, an denen dieser Spieler
 * selbst beteiligt ist (datenbank/schema.sql, Abschnitt "Freunde").
 *
 * Solange das Spiel offen und online ist, fragt es alle paar Sekunden
 * "Was gibt es Neues?" (mq_freunde). Dabei meldet es auch "ich bin da" -
 * daraus wird der Onlinestatus der Freunde (🟢 online, 🟡 im Kampf,
 * ⚫ offline).
 *
 * KLINGEL: Damit Einladungen und Anfragen nicht erst beim nächsten
 * Nachfragen ankommen, horcht jedes Spiel auf einem eigenen kleinen Kanal
 * (Supabase Realtime, wie das 2v2 - js/core/netz.js), benannt nach der
 * Freundes-ID. Wer etwas schickt, klingelt dort kurz, und der Freund fragt
 * sofort nach. Die Klingel trägt KEINE Daten: Was es Neues gibt, steht
 * nur in der Datenbank. Eine falsche Klingel bewirkt also höchstens ein
 * Nachfragen.
 *
 * 2v2-EINLADUNG
 * Eine Einladung trägt einfach den Code der eigenen 2v2-Lobby. Nimmt der
 * Freund an, tritt er über genau diesen Code bei - wie mit dem
 * Einladungscode von Hand. Es gibt also nur EINE Lobby-Art.
 *
 * Ohne Datenbank oder ohne Netz passiert hier einfach nichts; das übrige
 * Spiel (auch das Solo-2v2) merkt davon nichts.
 */

import { cloudAktiv, cloudFreunde, cloudJetztSenden } from './cloud.js';
import { geraetOnline, netzArt, raumOeffnen } from './netz.js';
import { aktuellerScreenName } from './screens.js';
import { saveProgress } from './state.js';

/** So oft wird nachgefragt (ms), solange das Spiel zu sehen ist. */
const NACHFRAGEN_MS = 15000;

/** Hier merkt sich der Browser, welche Anfragen und Freunde er schon kennt. */
const BEKANNT_KEY = 'monsterquest.freunde.bekannt';

/** Bildschirme, auf denen man "im Kampf" ist. */
const KAMPF_SCREENS = ['battle', 'duell'];

/**
 * Der Zustand:
 *   'aus'     - keine Datenbank eingetragen
 *   'offline' - kein Netz
 *   'laedt'   - erste Antwort steht noch aus
 *   'bereit'  - Liste ist da
 *   'fehlt'   - die Datenbank kennt die Freundes-Funktionen noch nicht
 *   'fehler'  - hat nicht geklappt
 */
let zustand = cloudAktiv() ? 'laedt' : 'aus';
let lage = null;
let laufend = null;
let uhr = null;

const beobachter = new Set();
const melder = new Set();

/* ------------------------------------------------------------------ */
/*  Zustand nach außen                                                 */
/* ------------------------------------------------------------------ */

/** Gibt es Freunde in diesem Spiel überhaupt (Datenbank eingetragen)? */
export function freundeMoeglich() {
  return cloudAktiv();
}

export function freundeZustand() {
  if (!cloudAktiv()) return 'aus';
  if (!geraetOnline()) return 'offline';
  return zustand;
}

/**
 * Die letzte Antwort der Datenbank oder null:
 * { kennung, freunde, erhalten, gesendet, einladungen, antworten }
 */
export function freundeLage() {
  return lage;
}

/** Meldet sich für jede neue Lage an. Gibt die Abmeldung zurück. */
export function freundeBeobachten(fn) {
  beobachter.add(fn);
  return () => beobachter.delete(fn);
}

/**
 * Meldet sich für Neuigkeiten an: fn({ art, profil }) mit art =
 * 'anfrage' | 'angenommen' | 'einladung_angenommen' | 'einladung_abgelehnt'.
 */
export function freundeMeldungen(fn) {
  melder.add(fn);
  return () => melder.delete(fn);
}

/** Wie viele Dinge auf eine Antwort warten (für das Abzeichen). */
export function offeneAnzahl() {
  return (lage?.erhalten.length ?? 0) + (lage?.einladungen.length ?? 0);
}

/** Online zuerst, dann im Kampf, dann offline - jeweils nach Name. */
export function freundeSortiert(liste = lage?.freunde ?? []) {
  const rang = { online: 0, kampf: 1, offline: 2 };
  return [...liste].sort((a, b) => (rang[a.status] ?? 2) - (rang[b.status] ?? 2) || a.name.localeCompare(b.name, 'de'));
}

/**
 * Macht aus einer Eingabe eine Freundes-ID: "mq 58291", "MQ-58291" und
 * "58291" werden zu "MQ-58291". Unsinn ergibt null.
 */
export function kennungPruefen(eingabe) {
  const ziffern = String(eingabe ?? '').toUpperCase().replace(/^\s*MQ/, '').replace(/[\s-]/g, '');
  return /^[0-9]{5,7}$/.test(ziffern) ? `MQ-${ziffern}` : null;
}

/* ------------------------------------------------------------------ */
/*  Die Leitung                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ruft eine Freundes-Funktion auf. Kennt die Datenbank diesen Spieler noch
 * nicht (noch nie gespeichert), wird der Spielstand erst hochgeschickt.
 */
async function rufe(name, parameter) {
  try {
    return await cloudFreunde(name, parameter);
  } catch (fehler) {
    if (!String(fehler?.message).includes('kein_spielstand')) throw fehler;
    saveProgress();
    await cloudJetztSenden();
    return cloudFreunde(name, parameter);
  }
}

/** Holt die aktuelle Lage. Läuft schon eine Anfrage, wird auf sie gewartet. */
export function freundeAktualisieren() {
  if (!cloudAktiv() || !geraetOnline()) return Promise.resolve(lage);
  if (laufend) return laufend;
  const ichBin = KAMPF_SCREENS.includes(aktuellerScreenName()) ? 'kampf' : 'online';
  laufend = rufe('mq_freunde', { p_zustand: ichBin })
    .then((antwort) => {
      if (!antwort || typeof antwort !== 'object') throw new Error('Leere Antwort');
      const neu = {
        kennung: String(antwort.kennung ?? ''),
        freunde: liste(antwort.freunde),
        erhalten: liste(antwort.erhalten),
        gesendet: liste(antwort.gesendet),
        einladungen: liste(antwort.einladungen).filter((e) => typeof e.id === 'string' && typeof e.code === 'string'),
        antworten: liste(antwort.antworten),
      };
      neuigkeitenMelden(neu);
      lage = neu;
      zustand = 'bereit';
      klingelHoeren(neu.kennung);
      return lage;
    })
    .catch((fehler) => {
      zustand = fehler?.status === 404 ? 'fehlt' : 'fehler';
      if (fehler?.status !== 404) console.warn('Freunde nicht geladen:', fehler);
      return lage;
    })
    .finally(() => {
      laufend = null;
      beobachter.forEach((fn) => {
        try {
          fn(lage);
        } catch (fehler) {
          console.warn('Freunde-Beobachter:', fehler);
        }
      });
    });
  return laufend;
}

/** Nur Einträge mit Freundes-ID und Name - alles andere fliegt raus. */
function liste(wert) {
  return Array.isArray(wert)
    ? wert.filter((e) => e && typeof e.kennung === 'string' && typeof e.name === 'string')
    : [];
}

/* ------------------------------------------------------------------ */
/*  Neuigkeiten                                                        */
/* ------------------------------------------------------------------ */

function bekanntLesen() {
  try {
    const gemerkt = JSON.parse(localStorage.getItem(BEKANNT_KEY));
    if (gemerkt && Array.isArray(gemerkt.erhalten) && Array.isArray(gemerkt.freunde)) return gemerkt;
  } catch {
    /* nichts gemerkt */
  }
  return null;
}

/** Wen man selbst gerade angenommen hat - das braucht keine Meldung. */
const selbstAngenommen = new Set();

function neuigkeitenMelden(neu) {
  const bekannt = bekanntLesen();
  const meldungen = [];
  // Beim allerersten Mal auf diesem Gerät nur merken, nicht melden.
  if (bekannt) {
    neu.erhalten
      .filter((p) => !bekannt.erhalten.includes(p.kennung))
      .forEach((profil) => meldungen.push({ art: 'anfrage', profil }));
    neu.freunde
      .filter((p) => !bekannt.freunde.includes(p.kennung) && !selbstAngenommen.has(p.kennung))
      .forEach((profil) => meldungen.push({ art: 'angenommen', profil }));
  }
  neu.antworten.forEach((profil) => meldungen.push({ art: profil.angenommen ? 'einladung_angenommen' : 'einladung_abgelehnt', profil }));
  selbstAngenommen.clear();

  try {
    localStorage.setItem(BEKANNT_KEY, JSON.stringify({
      erhalten: neu.erhalten.map((p) => p.kennung),
      freunde: neu.freunde.map((p) => p.kennung),
    }));
  } catch {
    /* privater Modus - dann eben ohne Gedächtnis */
  }

  meldungen.forEach((m) => melder.forEach((fn) => {
    try {
      fn(m);
    } catch (fehler) {
      console.warn('Freunde-Meldung:', fehler);
    }
  }));
}

/* ------------------------------------------------------------------ */
/*  Klingel                                                            */
/* ------------------------------------------------------------------ */

const KLINGEL_RAUM = 'mqk-';
/** So oft fragt eine Klingel höchstens nach - auch bei Sturmklingeln. */
const KLINGEL_ABSTAND_MS = 2000;

let klingelRaum = null;
let klingelKennung = null;
let letzteKlingel = 0;
let klingelPlan = null;

/** Horcht auf dem eigenen Kanal. Einmal je Freundes-ID. */
function klingelHoeren(kennung) {
  if (!kennung || klingelKennung === kennung || !netzArt()) return;
  klingelRaum?.schliessen();
  klingelKennung = kennung;
  try {
    klingelRaum = raumOeffnen(KLINGEL_RAUM + kennung);
  } catch {
    klingelRaum = null;
    return;
  }
  klingelRaum.an((nachricht) => {
    if (nachricht.typ === 'klingel') geklingelt();
  });
}

function geklingelt() {
  const warten = letzteKlingel + KLINGEL_ABSTAND_MS - Date.now();
  if (warten > 0) {
    if (!klingelPlan) {
      klingelPlan = setTimeout(() => {
        klingelPlan = null;
        geklingelt();
      }, warten);
    }
    return;
  }
  letzteKlingel = Date.now();
  freundeAktualisieren();
}

/** Klingelt kurz bei einem Freund: Kanal auf, "klingel", Kanal zu. */
function klingeln(kennung) {
  if (!kennung || !netzArt() || !geraetOnline()) return;
  let raum;
  try {
    raum = raumOeffnen(KLINGEL_RAUM + kennung);
  } catch {
    return;
  }
  // Kommt keine Verbindung zustande, nach ein paar Sekunden aufgeben -
  // dann kommt die Neuigkeit eben beim nächsten Nachfragen an.
  const aufgeben = setTimeout(() => raum.schliessen(), 6000);
  const senden = () => {
    raum.senden('klingel', {});
    setTimeout(() => {
      clearTimeout(aufgeben);
      raum.schliessen();
    }, 300);
  };
  if (raum.status === 'verbunden') {
    senden();
    return;
  }
  const abmelden = raum.beobachten((status) => {
    if (status !== 'verbunden') return;
    abmelden();
    senden();
  });
}

/* ------------------------------------------------------------------ */
/*  Aktionen                                                           */
/* ------------------------------------------------------------------ */

/** Danach gleich die neue Lage holen. */
async function undNeuLaden(ergebnis) {
  await freundeAktualisieren();
  return ergebnis;
}

/** Sucht einen Spieler. @returns {Promise<object|null>} Profil oder null */
export async function freundSuchen(kennung) {
  const sauber = kennungPruefen(kennung);
  if (!sauber) return null;
  const profil = await rufe('mq_freund_suchen', { p_kennung: sauber });
  return profil && typeof profil === 'object' && profil.kennung ? profil : null;
}

/**
 * @returns {Promise<string>} 'gesendet' | 'unbekannt' | 'selbst' |
 *   'schon_freunde' | 'schon_gesendet' | 'gegenanfrage' | 'zu_viele'
 */
export async function anfrageSenden(kennung) {
  const sauber = kennungPruefen(kennung);
  if (!sauber) return 'unbekannt';
  const antwort = await rufe('mq_anfrage_senden', { p_kennung: sauber });
  if (antwort === 'gesendet') klingeln(sauber);
  return undNeuLaden(antwort);
}

export async function anfrageAntworten(kennung, annehmen) {
  if (annehmen) selbstAngenommen.add(kennung);
  const antwort = await rufe('mq_anfrage_antworten', { p_kennung: kennung, p_annehmen: Boolean(annehmen) });
  if (antwort === true) klingeln(kennung);
  return undNeuLaden(antwort);
}

export async function anfrageZurueckziehen(kennung) {
  return undNeuLaden(await rufe('mq_anfrage_zurueckziehen', { p_kennung: kennung }));
}

export async function freundEntfernen(kennung) {
  const antwort = await rufe('mq_freund_entfernen', { p_kennung: kennung });
  if (antwort === true) klingeln(kennung);
  return undNeuLaden(antwort);
}

/** Lädt einen Freund in die eigene 2v2-Lobby (Code) ein. */
export async function einladungSenden(kennung, code) {
  const antwort = await rufe('mq_einladung_senden', { p_kennung: kennung, p_code: code });
  if (antwort === 'gesendet') klingeln(kennung);
  return antwort;
}

/**
 * Beantwortet eine 2v2-Einladung.
 * @returns {Promise<string|null>} beim Annehmen der Lobby-Code, sonst
 *   'abgelehnt'; null = abgelaufen oder schon beantwortet
 */
export async function einladungAntworten(id, annehmen) {
  const von = lage?.einladungen.find((e) => e.id === id)?.kennung;
  const antwort = await rufe('mq_einladung_antworten', { p_einladung: id, p_annehmen: Boolean(annehmen) });
  // Dem Gastgeber gleich Bescheid geben ("angenommen" / "abgelehnt").
  if (typeof antwort === 'string') klingeln(von);
  if (lage) lage = { ...lage, einladungen: lage.einladungen.filter((e) => e.id !== id) };
  freundeAktualisieren();
  return typeof antwort === 'string' ? antwort : null;
}

/* ------------------------------------------------------------------ */
/*  Regelmäßig nachfragen                                              */
/* ------------------------------------------------------------------ */

/** Startet das Nachfragen. Ohne Datenbank passiert nichts. */
export function freundeStarten() {
  if (!cloudAktiv() || uhr) return;
  const tick = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    // Kennt die Datenbank die Freunde noch nicht, nicht ständig nachfragen -
    // der Freunde-Bildschirm fragt beim Öffnen trotzdem noch einmal.
    if (zustand === 'fehlt') return;
    freundeAktualisieren();
  };
  uhr = setInterval(tick, NACHFRAGEN_MS);
  // Kurz warten: Beim Start gleicht sich erst der Spielstand ab.
  setTimeout(tick, 2500);
  addEventListener('online', tick);
  document.addEventListener('visibilitychange', tick);
}
