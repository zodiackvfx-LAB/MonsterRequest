/**
 * Die Leitung zwischen zwei Geräten für den 2v2-Koop.
 *
 * WARUM SO
 * Das Spiel hat keinen eigenen Spielserver. Es hat eine Supabase-Datenbank
 * (js/data/cloud-config.js) - und Supabase bringt "Realtime Broadcast" mit:
 * Alle Geräte, die denselben Kanal betreten, bekommen die Nachrichten der
 * anderen in Echtzeit über eine WebSocket-Verbindung. Dafür reicht der
 * öffentliche Schlüssel, der ohnehin im Spiel steht - es kommt KEIN neuer
 * Schlüssel in den Browsercode. Gespeichert wird dabei nichts.
 *
 * Diese Datei kennt keine Spielregeln. Sie verschickt kleine Nachrichten
 * { typ, ...daten } an alle anderen im selben Raum.
 *
 * DREI WEGE (alle mit derselben Schnittstelle)
 *   'supabase' - echtes Online-Spiel über Supabase Realtime
 *   'lokal'    - zwei Tabs im selben Browser (BroadcastChannel); zum
 *                Ausprobieren ohne Netz: Spiel mit ?netz=lokal öffnen
 *   'speicher' - im Arbeitsspeicher, für die Tests ohne Browser
 *
 * Die Verbindung baut sich nach einem Abbruch von selbst wieder auf
 * (mit wachsender Wartezeit). Wer die Leitung benutzt, sieht am Status,
 * ob sie gerade steht.
 */

import { CLOUD } from '../data/cloud-config.js';

/** Abstand der Lebenszeichen an Supabase (Phoenix-Herzschlag). */
const HERZSCHLAG_MS = 25000;
/** Wartezeiten zwischen Verbindungsversuchen. */
const WIEDERHOLEN_MS = [500, 1000, 2000, 4000, 8000];

/** Welche Leitung möglich ist: 'supabase', 'lokal' oder null (keine). */
export function netzArt() {
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('netz') === 'lokal') {
      return typeof BroadcastChannel === 'function' ? 'lokal' : null;
    }
  } catch {
    /* kein location - z. B. in Node */
  }
  if (CLOUD.url && CLOUD.schluessel && typeof WebSocket === 'function') return 'supabase';
  return null;
}

/** Ist das Gerät gerade (laut Browser) überhaupt online? */
export function geraetOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/**
 * Öffnet einen Raum.
 * @param {string} raum - Name des Raums (z. B. 'mq2v2-ABC123')
 * @param {object} [optionen]
 * @param {string} [optionen.art] - 'supabase' | 'lokal' | 'speicher' (Standard: netzArt())
 * @param {object} [optionen.bus] - nur 'speicher': ein gemeinsamer Bus (speicherBus())
 * @returns {{senden, an, status, beobachten, schliessen}}
 */
export function raumOeffnen(raum, { art = netzArt(), bus = null } = {}) {
  if (art === 'supabase') return supabaseRaum(raum);
  if (art === 'lokal') return lokalerRaum(raum);
  if (art === 'speicher') return speicherRaum(raum, bus);
  throw new Error('Keine Online-Verbindung möglich');
}

/** Grundgerüst, das alle drei Wege teilen: Empfänger und Status. */
function grundgeruest() {
  const empfaenger = new Set();
  const statusHoerer = new Set();
  let status = 'verbinde';
  return {
    empfangen(nachricht) {
      if (!nachricht || typeof nachricht !== 'object' || typeof nachricht.typ !== 'string') return;
      empfaenger.forEach((fn) => {
        try {
          fn(nachricht);
        } catch (fehler) {
          console.warn('Nachricht nicht verarbeitet:', fehler);
        }
      });
    },
    setzeStatus(neu) {
      if (neu === status) return;
      status = neu;
      statusHoerer.forEach((fn) => fn(status));
    },
    schnittstelle(senden, schliessen) {
      return {
        senden,
        an(fn) {
          empfaenger.add(fn);
          return () => empfaenger.delete(fn);
        },
        get status() {
          return status;
        },
        beobachten(fn) {
          statusHoerer.add(fn);
          return () => statusHoerer.delete(fn);
        },
        schliessen,
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Supabase Realtime (Phoenix-Protokoll, ohne fremde Bibliothek)      */
/* ------------------------------------------------------------------ */

function supabaseRaum(raum) {
  const g = grundgeruest();
  const thema = `realtime:${raum}`;
  const adresse = `${CLOUD.url.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(CLOUD.schluessel)}&vsn=1.0.0`;
  let ws = null;
  let ref = 0;
  let joinRef = null;
  let herz = null;
  let versuch = 0;
  let zu = false;
  let wiederTimer = null;

  function roh(nachricht) {
    if (ws?.readyState !== 1) return false;
    ws.send(JSON.stringify({ ...nachricht, ref: String(++ref) }));
    return true;
  }

  function verbinden() {
    if (zu) return;
    g.setzeStatus('verbinde');
    try {
      ws = new WebSocket(adresse);
    } catch {
      planeNeu();
      return;
    }
    ws.onopen = () => {
      joinRef = String(++ref);
      ws.send(JSON.stringify({
        topic: thema,
        event: 'phx_join',
        payload: { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, private: false } },
        ref: joinRef,
        join_ref: joinRef,
      }));
      herz = setInterval(() => roh({ topic: 'phoenix', event: 'heartbeat', payload: {} }), HERZSCHLAG_MS);
    };
    ws.onmessage = (ereignis) => {
      let n;
      try {
        n = JSON.parse(ereignis.data);
      } catch {
        return;
      }
      if (n.topic !== thema) return;
      if (n.event === 'phx_reply' && n.ref === joinRef) {
        if (n.payload?.status === 'ok') {
          versuch = 0;
          g.setzeStatus('verbunden');
        } else {
          g.setzeStatus('fehler');
          ws.close();
        }
      } else if (n.event === 'broadcast' && n.payload?.type === 'broadcast') {
        g.empfangen({ ...n.payload.payload, typ: n.payload.event });
      } else if (n.event === 'phx_error' || n.event === 'phx_close') {
        ws.close();
      }
    };
    ws.onclose = () => {
      clearInterval(herz);
      herz = null;
      if (!zu) planeNeu();
    };
    ws.onerror = () => {
      /* onclose folgt und plant den nächsten Versuch */
    };
  }

  function planeNeu() {
    g.setzeStatus('getrennt');
    const warten = WIEDERHOLEN_MS[Math.min(versuch, WIEDERHOLEN_MS.length - 1)];
    versuch += 1;
    clearTimeout(wiederTimer);
    wiederTimer = setTimeout(verbinden, warten);
  }

  // Kommt das Netz zurück, nicht auf den Wecker warten.
  const online = () => {
    if (!zu && g && ws?.readyState !== 1) {
      clearTimeout(wiederTimer);
      versuch = 0;
      verbinden();
    }
  };
  if (typeof addEventListener === 'function') addEventListener('online', online);

  verbinden();

  return g.schnittstelle(
    (typ, daten = {}) => roh({ topic: thema, event: 'broadcast', payload: { type: 'broadcast', event: typ, payload: daten } }),
    () => {
      zu = true;
      clearTimeout(wiederTimer);
      clearInterval(herz);
      if (typeof removeEventListener === 'function') removeEventListener('online', online);
      try {
        roh({ topic: thema, event: 'phx_leave', payload: {} });
        ws?.close();
      } catch {
        /* egal - wir gehen ohnehin */
      }
      g.setzeStatus('zu');
    }
  );
}

/* ------------------------------------------------------------------ */
/*  Lokal: zwei Tabs im selben Browser                                 */
/* ------------------------------------------------------------------ */

function lokalerRaum(raum) {
  const g = grundgeruest();
  const kanal = new BroadcastChannel(raum);
  kanal.onmessage = (ereignis) => g.empfangen(ereignis.data);
  // Kurz versetzt - wie eine echte Verbindung, die erst aufgebaut wird.
  setTimeout(() => g.setzeStatus('verbunden'), 50);
  return g.schnittstelle(
    (typ, daten = {}) => {
      kanal.postMessage({ ...daten, typ });
      return true;
    },
    () => {
      kanal.close();
      g.setzeStatus('zu');
    }
  );
}

/* ------------------------------------------------------------------ */
/*  Speicher: für Tests - mit absichtlichen Verbindungsabbrüchen       */
/* ------------------------------------------------------------------ */

/** Ein gemeinsamer "Server" für Tests. Mehrere Räume, mehrere Teilnehmer. */
export function speicherBus() {
  return { raeume: new Map(), gesendet: 0 };
}

function speicherRaum(raum, bus) {
  if (!bus) throw new Error('speicherRaum braucht einen Bus (speicherBus())');
  const g = grundgeruest();
  if (!bus.raeume.has(raum)) bus.raeume.set(raum, new Set());
  const teilnehmer = bus.raeume.get(raum);
  const ich = {
    online: true,
    zustellen(nachricht) {
      if (ich.online) g.empfangen(nachricht);
    },
  };
  teilnehmer.add(ich);
  queueMicrotask(() => g.setzeStatus('verbunden'));

  const schnitt = g.schnittstelle(
    (typ, daten = {}) => {
      if (!ich.online) return false;
      bus.gesendet += 1;
      // Kopie wie über ein echtes Netz - niemand teilt Objekte.
      const text = JSON.stringify({ ...daten, typ });
      teilnehmer.forEach((t) => {
        if (t !== ich) queueMicrotask(() => t.zustellen(JSON.parse(text)));
      });
      return true;
    },
    () => {
      teilnehmer.delete(ich);
      g.setzeStatus('zu');
    }
  );
  // Nur für Tests: Netz kappen und wiederherstellen.
  schnitt.trennen = () => {
    ich.online = false;
    g.setzeStatus('getrennt');
  };
  schnitt.verbinden = () => {
    ich.online = true;
    g.setzeStatus('verbunden');
  };
  return schnitt;
}
