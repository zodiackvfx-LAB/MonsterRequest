/**
 * Test der Spielstand-Datenbank - ohne Browser, direkt mit Node:
 *
 *     node tests/datenbank.test.mjs
 *
 * Der Test startet werkzeuge/test-datenbank.mjs (die Datenbank zum
 * Ausprobieren) und spielt damit alles durch, was das Spiel spaeter auch
 * tut: speichern, laden, Code erstellen, Code einloesen.
 *
 * Gegen die echte Datenbank laeuft derselbe Ablauf - die Funktionen in
 * datenbank/schema.sql heissen gleich und antworten gleich.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PORT = 8125;
const SCHLUESSEL = 'test-schluessel';

/* localStorage nachbauen - cloud.js merkt sich dort die Spielernummer. */
let speicher = new Map();
globalThis.localStorage = {
  getItem(key) { return speicher.has(key) ? speicher.get(key) : null; },
  setItem(key, value) { speicher.set(key, String(value)); },
  removeItem(key) { speicher.delete(key); },
};

const { CLOUD } = await import('../js/data/cloud-config.js');
CLOUD.url = `http://localhost:${PORT}`;
CLOUD.schluessel = SCHLUESSEL;

const cloud = await import('../js/core/cloud.js');

let bestanden = 0;
let fehler = 0;

function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    bestanden++;
    console.log(`  ok   ${beschreibung}`);
  } else {
    fehler++;
    console.log(`  FEHL ${beschreibung}`);
  }
}

/** Wartet, bis der Server antwortet - hoechstens 5 Sekunden. */
async function warteAufServer() {
  for (let versuch = 0; versuch < 50; versuch++) {
    try {
      const antwort = await fetch(`http://localhost:${PORT}/uebersicht`);
      if (antwort.ok) return true;
    } catch {
      // noch nicht da
    }
    await new Promise((fertig) => setTimeout(fertig, 100));
  }
  return false;
}

const server = spawn(
  process.execPath,
  [fileURLToPath(new URL('../werkzeuge/test-datenbank.mjs', import.meta.url))],
  { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' }
);

try {
  if (!await warteAufServer()) {
    console.log('\nFEHL Der Testserver ist nicht gestartet.\n');
    process.exit(1);
  }

  console.log('\nSpielernummer');
  {
    const erste = cloud.spielerId();
    pruefe('Beim ersten Aufruf entsteht eine Nummer',
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(erste));
    pruefe('Beim zweiten Aufruf kommt dieselbe zurueck', cloud.spielerId() === erste);
    pruefe('Die Datenbank ist eingetragen', cloud.cloudAktiv() === true);
  }

  console.log('\nSpeichern und Laden');
  {
    pruefe('Vor dem ersten Speichern gibt es nichts', (await cloud.cloudLaden()) === null);

    cloud.cloudMerken({ revision: 1, coins: 120, unlockedWorld: 2 });
    await cloud.cloudJetztSenden();

    const geladen = await cloud.cloudLaden();
    pruefe('Der Spielstand kommt zurueck', geladen?.coins === 120);
    pruefe('Der Zaehler kommt mit', geladen?.revision === 1);

    cloud.cloudMerken({ revision: 2, coins: 300, unlockedWorld: 3 });
    await cloud.cloudJetztSenden();
    const zweiter = await cloud.cloudLaden();
    pruefe('Ein neuer Stand ersetzt den alten', zweiter?.coins === 300 && zweiter?.revision === 2);
  }

  console.log('\nSammeln statt einzeln senden');
  {
    // Drei Aenderungen kurz hintereinander duerfen nur EINE Anfrage werden.
    const vorher = await zaehleSpeicherungen();
    cloud.cloudMerken({ revision: 3, coins: 1 });
    cloud.cloudMerken({ revision: 4, coins: 2 });
    cloud.cloudMerken({ revision: 5, coins: 3 });
    await cloud.cloudJetztSenden();
    const nachher = await zaehleSpeicherungen();
    pruefe('Drei Aenderungen ergeben eine Speicherung', nachher - vorher === 1);
    const stand = await cloud.cloudLaden();
    pruefe('Gespeichert wird der letzte Stand', stand?.coins === 3 && stand?.revision === 5);
  }

  console.log('\nUebertragungscode');
  {
    const code = await cloud.cloudCodeErstellen();
    pruefe('Der Code hat 8 Zeichen', typeof code === 'string' && code.length === 8);
    pruefe('Der Code hat keine verwechselbaren Zeichen', !/[IO01]/.test(code));

    const geholt = await cloud.cloudCodeEinloesen(code);
    pruefe('Der Code gibt den Spielstand heraus', geholt?.daten?.coins === 3);
    pruefe('Der Code gibt die Spielernummer heraus', geholt?.id === cloud.spielerId());

    pruefe('Derselbe Code geht kein zweites Mal',
      (await cloud.cloudCodeEinloesen(code)) === null);
    pruefe('Ein erfundener Code ergibt nichts',
      (await cloud.cloudCodeEinloesen('ZZZZZZZZ')) === null);
    pruefe('Ein zu kurzer Code ergibt nichts',
      (await cloud.cloudCodeEinloesen('ABC')) === null);
    pruefe('Kleinbuchstaben werden trotzdem erkannt', await kleinSchreibenGeht());
  }

  console.log('\nZweites Geraet');
  {
    // Wir tun so, als waere das ein frischer Browser: neue Nummer, leer.
    const ersteNummer = cloud.spielerId();
    const code = await cloud.cloudCodeErstellen();

    speicher = new Map(); // "anderes Geraet"
    globalThis.localStorage.getItem = (k) => (speicher.has(k) ? speicher.get(k) : null);
    globalThis.localStorage.setItem = (k, v) => speicher.set(k, String(v));
    const zweiteNummer = cloud.spielerId();
    pruefe('Das zweite Geraet hat eine eigene Nummer', zweiteNummer !== ersteNummer);
    pruefe('Und noch keinen Spielstand', (await cloud.cloudLaden()) === null);

    const geholt = await cloud.cloudCodeEinloesen(code);
    cloud.spielerIdSetzen(geholt.id);
    pruefe('Nach dem Code gehoert es zur ersten Nummer', cloud.spielerId() === ersteNummer);
    pruefe('Und der Spielstand ist da', (await cloud.cloudLaden())?.coins === 3);
  }

  console.log('\nGrenzen');
  {
    pruefe('Ein zu grosser Spielstand wird abgelehnt', await zuGrossWirdAbgelehnt());
    pruefe('Ohne Schluessel kommt man nicht heran', await ohneSchluesselGesperrt());
  }
} finally {
  server.kill();
}

console.log(`\n${bestanden} bestanden, ${fehler} fehlgeschlagen\n`);
process.exit(fehler > 0 ? 1 : 0);

/* ------------------------------------------------------------------ */
/*  Helfer                                                             */
/* ------------------------------------------------------------------ */

async function ruf(name, parameter, schluessel = SCHLUESSEL) {
  const antwort = await fetch(`http://localhost:${PORT}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: schluessel },
    body: JSON.stringify(parameter),
  });
  return { status: antwort.status, wert: await antwort.json() };
}

/** Wie oft wurde fuer diese Nummer schon gespeichert? Aus der Uebersicht. */
async function zaehleSpeicherungen() {
  const seite = await (await fetch(`http://localhost:${PORT}/uebersicht`)).text();
  const kurz = cloud.spielerId().slice(0, 8);
  const zeile = seite.split('<tr>').find((t) => t.includes(kurz));
  if (!zeile) return 0;
  const spalten = [...zeile.matchAll(/<td>(.*?)<\/td>/g)].map((t) => t[1]);
  return Number(spalten[6]) || 0;
}

async function kleinSchreibenGeht() {
  const code = await cloud.cloudCodeErstellen();
  const geholt = await cloud.cloudCodeEinloesen(code.toLowerCase());
  return geholt !== null;
}

async function zuGrossWirdAbgelehnt() {
  const riesig = { revision: 9, muell: 'x'.repeat(70000) };
  const { status } = await ruf('mq_speichern', { p_id: cloud.spielerId(), p_daten: riesig });
  return status === 400;
}

async function ohneSchluesselGesperrt() {
  const { status } = await ruf('mq_laden', { p_id: cloud.spielerId() }, 'falsch');
  return status === 401;
}
