/**
 * Spielstand in der Datenbank.
 *
 * Das Spiel speichert weiterhin sofort im Browser (localStorage) - das ist
 * schnell und funktioniert auch ohne Netz. Zusaetzlich schickt dieses Modul
 * den Spielstand an die Datenbank, damit er nicht weg ist, wenn Safari den
 * Speicher aufraeumt oder das Geraet gewechselt wird.
 *
 * WER IST WER?
 * Es gibt keine Anmeldung. Beim ersten Start wuerfelt sich der Browser eine
 * lange Zufallszahl aus (eine UUID) und merkt sie sich. Diese Nummer ist
 * gleichzeitig das Passwort: Nur wer sie kennt, kommt an diesen Spielstand.
 *
 * WER GEWINNT BEI ZWEI STAENDEN?
 * Jeder Spielstand hat einen Zaehler ("revision"), der bei jedem Speichern
 * um eins steigt. Beim Start gewinnt die hoehere Zahl. Absichtlich KEIN
 * Zeitvergleich: Auf einer falsch gestellten Geraeteuhr waere der ein
 * Gluecksspiel, der Zaehler dagegen stimmt immer.
 *
 * Dieses Modul kennt den Spielstand nicht - es bekommt ihn gereicht. So
 * kann es state.js benutzen, ohne dass beide sich gegenseitig importieren.
 */

import { CLOUD } from '../data/cloud-config.js';

const SPIELER_KEY = 'monsterquest.spieler';
/** Der Wiederherstellungs-Code dieses Spielers - nur zum Wieder-Anzeigen. */
const WIEDERHERSTELLUNG_KEY = 'monsterquest.wiederherstellung';

/** So lange wird nach einer Aenderung gewartet, bevor gesendet wird. */
const WARTEZEIT = 2500;

/** Nach dieser Zeit gilt eine Anfrage als gescheitert. */
const ZEITGRENZE = 8000;

/**
 * Der Zustand, den die Einstellungen anzeigen:
 *   'aus'         - keine Datenbank eingetragen
 *   'bereit'      - verbunden, nichts zu tun
 *   'sendet'      - gerade unterwegs
 *   'gespeichert' - zuletzt erfolgreich gespeichert
 *   'wartet'      - kein Netz, wird nachgeholt
 *   'fehler'      - hat nicht geklappt
 */
let status = 'aus';
const zuhoerer = new Set();

let offen = null; // Spielstand, der noch gesendet werden muss
let uhr = null; // laufender Timer
let sendet = false; // gerade eine Anfrage unterwegs?

/* ------------------------------------------------------------------ */
/*  Zustand nach aussen                                                */
/* ------------------------------------------------------------------ */

/** Ist eine Datenbank eingetragen? */
export function cloudAktiv() {
  return Boolean(CLOUD.url && CLOUD.schluessel);
}

export function cloudStatus() {
  return status;
}

/**
 * Meldet sich fuer Aenderungen am Zustand an.
 * Gibt eine Funktion zurueck, mit der man sich wieder abmeldet.
 */
export function cloudBeobachten(rueckruf) {
  zuhoerer.add(rueckruf);
  rueckruf(status);
  return () => zuhoerer.delete(rueckruf);
}

function setzeStatus(neu) {
  if (neu === status) return;
  status = neu;
  zuhoerer.forEach((fn) => {
    try {
      fn(status);
    } catch (fehler) {
      console.warn('Zuhoerer hat sich verschluckt:', fehler);
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Die Spielernummer                                                  */
/* ------------------------------------------------------------------ */

/**
 * Baut eine UUID.
 *
 * crypto.randomUUID gibt es nur auf sicheren Seiten (https oder localhost).
 * Oeffnet man das Spiel im Heimnetz ueber eine IP-Adresse, fehlt es - dann
 * wird die Nummer aus Zufallsbytes zusammengesetzt.
 */
function neueNummer() {
  const zufall = globalThis.crypto;
  if (zufall?.randomUUID) return zufall.randomUUID();

  const bytes = new Uint8Array(16);
  if (zufall?.getRandomValues) {
    zufall.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variante
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const NUMMER_FORM = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Die Spielernummer dieses Browsers - beim ersten Aufruf gewuerfelt. */
export function spielerId() {
  try {
    const gemerkt = localStorage.getItem(SPIELER_KEY);
    if (gemerkt && NUMMER_FORM.test(gemerkt)) return gemerkt;

    const neu = neueNummer();
    localStorage.setItem(SPIELER_KEY, neu);
    return neu;
  } catch (fehler) {
    // Privater Modus ohne Speicher: Die Nummer gilt dann nur fuer diesen
    // Besuch. Besser als gar nicht zu speichern.
    console.warn('Spielernummer konnte nicht gemerkt werden:', fehler);
    return neueNummer();
  }
}

/** Uebernimmt eine fremde Spielernummer - nach dem Einloesen eines Codes. */
export function spielerIdSetzen(id) {
  if (!NUMMER_FORM.test(id)) throw new Error('Keine gueltige Spielernummer');
  try {
    // Ein gemerkter Wiederherstellungs-Code gehoert zum alten Spieler.
    if (localStorage.getItem(SPIELER_KEY) !== id) localStorage.removeItem(WIEDERHERSTELLUNG_KEY);
    localStorage.setItem(SPIELER_KEY, id);
  } catch (fehler) {
    console.warn('Spielernummer konnte nicht gemerkt werden:', fehler);
  }
}

/* ------------------------------------------------------------------ */
/*  Die Verbindung                                                     */
/* ------------------------------------------------------------------ */

/**
 * Ruft eine der Funktionen aus datenbank/schema.sql auf.
 *
 * @param {string} name      - z. B. 'mq_speichern'
 * @param {object} parameter - die Werte der Funktion
 * @param {boolean} [amEnde] - true beim Verlassen der Seite: Der Browser
 *        haelt die Anfrage dann offen, auch wenn die Seite schon zu ist.
 */
async function rufe(name, parameter, amEnde = false) {
  const abbruch = new AbortController();
  const wecker = setTimeout(() => abbruch.abort(), ZEITGRENZE);

  try {
    const antwort = await fetch(`${CLOUD.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CLOUD.schluessel,
        Authorization: `Bearer ${CLOUD.schluessel}`,
      },
      body: JSON.stringify(parameter),
      signal: abbruch.signal,
      keepalive: amEnde,
    });

    if (!antwort.ok) {
      const text = await antwort.text().catch(() => '');
      const fehler = new Error(`${name}: ${antwort.status} ${text.slice(0, 200)}`);
      fehler.status = antwort.status; // 404 = Funktion fehlt in der Datenbank
      throw fehler;
    }

    const text = await antwort.text();
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(wecker);
  }
}

/* ------------------------------------------------------------------ */
/*  Laden und Speichern                                                */
/* ------------------------------------------------------------------ */

/**
 * Holt den Spielstand dieses Browsers aus der Datenbank.
 * @returns {Promise<object|null>} null, wenn es dort noch keinen gibt
 */
export async function cloudLaden() {
  if (!cloudAktiv()) return null;
  const daten = await rufe('mq_laden', { p_id: spielerId() });
  return daten && typeof daten === 'object' ? daten : null;
}

/**
 * Merkt sich einen Spielstand zum Senden.
 *
 * Gesendet wird erst nach einer kurzen Pause. Waehrend eines Kampfes wird
 * oft hintereinander gespeichert - ohne diese Pause waere das ein Dutzend
 * Anfragen fuer denselben Stand.
 */
export function cloudMerken(daten) {
  if (!cloudAktiv()) return;
  offen = daten;
  if (uhr) clearTimeout(uhr);
  uhr = setTimeout(senden, WARTEZEIT);
}

/** Schickt sofort, ohne auf die Pause zu warten. */
export async function cloudJetztSenden(amEnde = false) {
  if (uhr) {
    clearTimeout(uhr);
    uhr = null;
  }
  return senden(amEnde);
}

async function senden(amEnde = false) {
  if (!cloudAktiv() || !offen) return;
  if (sendet) return; // laeuft schon - der offene Stand geht danach mit

  const daten = offen;
  sendet = true;
  setzeStatus('sendet');

  try {
    await rufe('mq_speichern', { p_id: spielerId(), p_daten: daten }, amEnde);
    // Nur wegwerfen, wenn inzwischen nichts Neueres gemeldet wurde.
    if (offen === daten) offen = null;
    setzeStatus('gespeichert');
  } catch (fehler) {
    console.warn('Spielstand konnte nicht hochgeladen werden:', fehler);
    // Der Stand bleibt offen und geht beim naechsten Versuch mit.
    setzeStatus(navigator.onLine === false ? 'wartet' : 'fehler');
  } finally {
    sendet = false;
    // Kam waehrenddessen etwas Neues, gleich hinterher.
    if (offen && offen !== daten) cloudMerken(offen);
  }
}

/* ------------------------------------------------------------------ */
/*  Spielstand auf ein anderes Geraet holen                            */
/* ------------------------------------------------------------------ */

/** Erzeugt einen 8-Zeichen-Code, der 30 Minuten gilt. */
export async function cloudCodeErstellen() {
  if (!cloudAktiv()) throw new Error('Keine Datenbank eingetragen');
  // Erst sicherstellen, dass der Stand oben ist - sonst gibt der Code
  // einen alten Stand heraus.
  await cloudJetztSenden();
  return rufe('mq_code_erstellen', { p_id: spielerId() });
}

/**
 * Holt einen Spielstand ueber einen Code.
 * @returns {Promise<object|null>} { id, daten } oder null bei falschem Code
 */
export async function cloudCodeEinloesen(code) {
  if (!cloudAktiv()) throw new Error('Keine Datenbank eingetragen');
  const sauber = String(code || '').trim().toUpperCase();
  if (sauber.length !== 8) return null;

  const ergebnis = await rufe('mq_code_einloesen', { p_code: sauber });
  if (!ergebnis || !ergebnis.id || !ergebnis.daten) return null;
  return ergebnis;
}

/* ------------------------------------------------------------------ */
/*  Wiederherstellungs-Code                                            */
/* ------------------------------------------------------------------ */

/*
 * Ein fester Code (z. B. K7QM-X2PA-9RTD), mit dem man den Spielstand
 * jederzeit zurueckholt - auch wenn der Browser alles vergessen hat. Die
 * Datenbank kennt nur seinen Fingerabdruck; im Klartext steht er nur hier
 * im Browser (damit die Einstellungen ihn wieder zeigen koennen) und beim
 * Spieler auf dem Zettel.
 */

/** Der Code auf diesem Geraet - oder null. */
export function wiederherstellungGemerkt() {
  try {
    return localStorage.getItem(WIEDERHERSTELLUNG_KEY);
  } catch {
    return null;
  }
}

function wiederherstellungMerken(code) {
  try {
    localStorage.setItem(WIEDERHERSTELLUNG_KEY, code);
  } catch {
    /* privater Modus - dann eben nur aufschreiben */
  }
}

/**
 * Erstellt einen neuen Code. Ein alter wird damit ungueltig.
 * @returns {Promise<string>} z. B. "K7QM-X2PA-9RTD"
 */
export async function cloudWiederherstellungErstellen() {
  if (!cloudAktiv()) throw new Error('Keine Datenbank eingetragen');
  // Der Stand muss oben sein - sonst gibt es zu dieser Nummer noch nichts.
  await cloudJetztSenden();
  const code = await rufe('mq_wiederherstellung_erstellen', { p_id: spielerId() });
  if (typeof code !== 'string') throw new Error('Kein Code erhalten');
  wiederherstellungMerken(code);
  return code;
}

/** Hat dieser Spieler schon einen Code (vielleicht auf einem anderen Geraet)? */
export async function cloudWiederherstellungStatus() {
  if (!cloudAktiv()) return false;
  return (await rufe('mq_wiederherstellung_status', { p_id: spielerId() })) === true;
}

/** Bringt Eingaben wie "k7qm x2pa 9rtd" in die Form "K7QM-X2PA-9RTD" - oder null. */
export function wiederherstellungsCode(eingabe) {
  const sauber = String(eingabe ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return sauber.length === 12 ? `${sauber.slice(0, 4)}-${sauber.slice(4, 8)}-${sauber.slice(8)}` : null;
}

/**
 * Holt einen Spielstand ueber den Wiederherstellungs-Code.
 * @returns {Promise<object|null>} { id, daten } oder null bei falschem Code
 */
export async function cloudWiederherstellen(eingabe) {
  if (!cloudAktiv()) throw new Error('Keine Datenbank eingetragen');
  const code = wiederherstellungsCode(eingabe);
  if (!code) return null;
  const ergebnis = await rufe('mq_wiederherstellen', { p_code: code });
  if (!ergebnis || !ergebnis.id || !ergebnis.daten) return null;
  return { ...ergebnis, code };
}

/** Nach dem Zurueckholen: Der Code gilt weiter - also gleich merken. */
export function wiederherstellungUebernehmen(code) {
  wiederherstellungMerken(code);
}

/* ------------------------------------------------------------------ */
/*  Rangliste                                                          */
/* ------------------------------------------------------------------ */

/**
 * Holt die Rangliste: die besten Spieler nach Trophäen und den eigenen
 * Platz. Vorher wird der eigene Stand hochgeschickt, damit die eigenen
 * Trophäen darin schon stimmen.
 *
 * @returns {Promise<{spitze: Array<{platz, name, trophaeen, ich}>, ich: {platz, trophaeen}|null, spieler: number}>}
 * @throws Fehler mit status 404, wenn die Funktion in der Datenbank fehlt
 *         (schema.sql ist noch nicht neu eingespielt)
 */
export async function cloudRangliste(anzahl = 50) {
  if (!cloudAktiv()) throw new Error('Keine Datenbank eingetragen');
  await cloudJetztSenden();
  const ergebnis = await rufe('mq_rangliste', { p_id: spielerId(), p_anzahl: anzahl });
  return {
    spitze: Array.isArray(ergebnis?.spitze) ? ergebnis.spitze : [],
    ich: ergebnis?.ich ?? null,
    spieler: Number(ergebnis?.spieler) || 0,
  };
}

/* ------------------------------------------------------------------ */
/*  2v2: Belohnung genau einmal                                        */
/* ------------------------------------------------------------------ */

/** So lange wartet das Ergebnisfenster höchstens auf die Datenbank. */
const DUELL_ZEITGRENZE = 3500;

/**
 * Meldet der Datenbank: "Ich hole mir die Belohnung für dieses Match."
 * Die Datenbank merkt sich jedes Paar aus Match und Spieler nur einmal -
 * ein zweites Gerät mit demselben Spielstand oder ein wiederholtes
 * Verbinden bekommt dieselbe Belohnung nicht noch einmal.
 *
 * @returns {Promise<true|false|null>} true = erstes Mal, false = gab es
 *   schon, null = keine Datenbank / nicht erreichbar / Funktion fehlt noch
 *   (dann schützt die lokale Liste in js/core/duell-belohnung.js)
 */
export async function cloudDuellBelohnung(matchId, daten = {}) {
  if (!cloudAktiv()) return null;
  try {
    const antwort = await Promise.race([
      rufe('mq_duell_belohnung', { p_id: spielerId(), p_match: matchId, p_daten: daten }),
      new Promise((fertig) => setTimeout(() => fertig(null), DUELL_ZEITGRENZE)),
    ]);
    return antwort === true ? true : antwort === false ? false : null;
  } catch (fehler) {
    if (fehler.status !== 404) console.warn('2v2-Belohnung nicht gemeldet:', fehler);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Freunde                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ruft eine der Freundes-Funktionen aus datenbank/schema.sql auf
 * (mq_freunde, mq_anfrage_senden, ...). Die eigene Spielernummer wird
 * dabei immer als p_id mitgeschickt - siehe js/core/freunde.js.
 */
export async function cloudFreunde(name, parameter = {}) {
  if (!cloudAktiv()) throw new Error('Keine Datenbank eingetragen');
  return rufe(name, { ...parameter, p_id: spielerId() });
}

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

/**
 * Meldet sich beim Browser an, damit nichts verloren geht:
 * beim Verlassen der Seite wird sofort gesendet, und sobald das Netz
 * wieder da ist, wird nachgeholt.
 */
export function cloudEreignisse() {
  if (!cloudAktiv()) return;

  // pagehide statt unload: Nur darauf ist auf dem iPhone Verlass.
  addEventListener('pagehide', () => {
    cloudJetztSenden(true);
  });

  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cloudJetztSenden(true);
  });

  addEventListener('online', () => {
    if (offen) cloudJetztSenden();
  });
}
