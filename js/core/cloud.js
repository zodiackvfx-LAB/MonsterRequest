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
      throw new Error(`${name}: ${antwort.status} ${text.slice(0, 200)}`);
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
