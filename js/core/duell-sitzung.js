/**
 * Eine 2v2-Sitzung: Lobby und Match - solo, als Gastgeber oder als Gast.
 *
 * WER ENTSCHEIDET?
 * Es gibt genau EINE verbindliche Kampfsimulation: die des Gastgebers
 * (Spieler 1, der die Lobby erstellt hat). Spieler 2 schickt nur Absichten
 * ("Karte 3 auf Gegner links", jede mit eigener Aktions-id). Der Gastgeber
 * prüft sie mit denselben Regeln wie seine eigenen Züge (aktion() in
 * js/core/duell.js), führt sie aus und antwortet. Lebenspunkte,
 * Gegnerzüge, Boss-Phasen und das Ergebnis kommen 8-mal pro Sekunde als
 * Zustand zurück. So sehen beide immer dasselbe, und gleichzeitige Aktionen
 * werden in der Reihenfolge ausgeführt, in der sie beim Gastgeber ankommen.
 *
 * Ehrlich benannt: Der Gastgeber ist ein Browser, kein Server. Ein
 * vertrauenswürdiger Server, der dieselbe Engine laufen lässt, wäre die
 * stärkere Lösung - die Engine ist dafür vorbereitet (sie läuft ohne Browser,
 * siehe tests/duell.test.mjs). Bis dahin gilt: Der Gast kann nichts
 * vorgeben, was der Gastgeber nicht prüft.
 *
 * VERBINDUNG
 *   - Lebenszeichen alle 1,5 s. Ohne Nachricht für 5 s gilt der andere als
 *     getrennt.
 *   - Gast getrennt: Der Kampf läuft weiter, seine Figur wartet. Nach 15 s
 *     übernimmt die (schwächere) KI-Partnerin. Kommt er zurück, bekommt er
 *     den kompletten Zustand und übernimmt wieder selbst.
 *   - Gastgeber verliert selbst die Leitung: Der Kampf pausiert. Ist sie
 *     nach 60 s nicht zurück, endet das Match kontrolliert ohne Belohnung.
 *   - Belohnungen gibt es pro Match-id genau einmal (js/core/duell-belohnung.js).
 *
 * Diese Datei kennt kein HTML. Die Bildschirme lesen info() und hören auf
 * beobachten() und ereignisse().
 */

import { createDuell, zustandUebernehmen } from './duell.js';
import { duellSetup, kiPartnerProfil, meinProfil, profilPruefen, wahlErlaubt } from './duell-aufbau.js';
import { raumOeffnen } from './netz.js';
import { DUELL } from '../data/duell.js';
import { zufallsKennung } from './zufall.js';

/** Version des Nachrichtenformats - beide Geräte müssen sie teilen. */
export const PROTOKOLL = 1;

const CODE_ZEICHEN = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const GERAET_KEY = 'monsterquest.geraet';
const LETZTE_LOBBY_KEY = 'monsterquest.duell.lobby';

/** Wie oft unbeantwortete Aktionen des Gastes neu geschickt werden. */
const AKTION_WIEDERHOLEN = 0.7;
const AKTION_VERSUCHE = 4;
/** So lange zählt der Countdown, wenn beide bereit sind. */
const COUNTDOWN = 2;
/** So lange wird der Endstand wiederholt, damit er sicher ankommt. */
const ENDE_WIEDERHOLEN = 1.5;

/** Ein neuer Einladungscode. */
export function neuerCode(zufall = Math.random) {
  let code = '';
  for (let i = 0; i < DUELL.netz.codeLaenge; i++) code += CODE_ZEICHEN[Math.floor(zufall() * CODE_ZEICHEN.length)];
  return code;
}

/** Bringt einen eingetippten Code in Form - oder gibt null zurück. */
export function codePruefen(eingabe) {
  const code = String(eingabe ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== DUELL.netz.codeLaenge) return null;
  return [...code].every((z) => CODE_ZEICHEN.includes(z)) ? code : null;
}

/**
 * Die Kennung dieses Geräts für den Koop. Bewusst NICHT die Spielernummer
 * aus js/core/cloud.js - die ist das Passwort zum Spielstand und darf nie
 * an andere Geräte gehen.
 *
 * Sie gilt je Tab (sessionStorage): Lädt man die Seite neu, bleibt sie
 * gleich - so erkennt der Gastgeber den Rückkehrer. Zwei Tabs sind zwei
 * Spieler.
 */
export function geraetId() {
  try {
    const gemerkt = sessionStorage.getItem(GERAET_KEY);
    if (gemerkt && /^[a-z0-9]{16}$/.test(gemerkt)) return gemerkt;
    const neu = zufallsKennung(16);
    sessionStorage.setItem(GERAET_KEY, neu);
    return neu;
  } catch {
    return zufallsKennung(16);
  }
}

/** Die zuletzt betretene Lobby (für "erneut beitreten" nach einem Neuladen). */
export function letzteLobby() {
  try {
    const daten = JSON.parse(sessionStorage.getItem(LETZTE_LOBBY_KEY) ?? 'null');
    if (daten && Date.now() - daten.zeit < 15 * 60 * 1000 && codePruefen(daten.code)) return daten;
  } catch {
    /* nichts gemerkt */
  }
  return null;
}

function lobbyMerken(daten) {
  try {
    if (daten) sessionStorage.setItem(LETZTE_LOBBY_KEY, JSON.stringify({ ...daten, zeit: Date.now() }));
    else sessionStorage.removeItem(LETZTE_LOBBY_KEY);
  } catch {
    /* privater Modus - dann eben nicht */
  }
}

/**
 * Erzeugt eine Sitzung.
 *
 * @param {object} o
 * @param {'solo'|'host'|'gast'} o.art
 * @param {string} [o.code] - nur Gast: der Einladungscode
 * @param {object} [o.raumOptionen] - an raumOeffnen (z. B. { art: 'speicher', bus })
 * @param {string} [o.geraet] - Kennung (Standard: geraetId())
 * @param {function} [o.profil] - liefert das eigene Profil (Standard: meinProfil)
 * @param {function} [o.partnerProfil] - nur solo: Profil der KI-Partnerin
 * @param {function} [o.belohnen] - ({matchId, ende, ich, setup}) => Belohnung | Promise
 * @param {boolean} [o.automatisch] - true: eigene Uhr (Browser). Tests rufen takt() selbst.
 */
export function createSitzung({
  art,
  code = null,
  raumOptionen = {},
  geraet = geraetId(),
  profil = () => meinProfil(),
  partnerProfil = (figur) => kiPartnerProfil(figur),
  belohnen = null,
  automatisch = true,
  wahl: startWahl = null,
}) {
  const host = art === 'host' || art === 'solo';
  const online = art !== 'solo';
  const meinIndex = art === 'gast' ? 1 : 0;

  const info = {
    art,
    phase: online ? 'verbinde' : 'lobby',
    code: art === 'host' ? neuerCode() : code,
    lobbyId: host ? zufallsKennung(10) : null,
    ich: meinIndex,
    spieler: [null, null],
    wahl: { welt: 1, paar: 0, bossDuell: false, schwierigkeit: 'normal', ...(startWahl ?? {}) },
    wahlFehler: '',
    verbindung: online ? 'verbinde' : 'verbunden',
    partnerOnline: !online,
    hinweis: '',
    fehler: '',
    countdown: null,
    match: null, // { matchId, setup }
    ergebnis: null, // { ende, belohnung }
    rev: 0,
  };

  const hoerer = new Set();
  const ereignisHoerer = new Set();
  let uhr = 0; // eigene Uhr in Sekunden (läuft über takt)
  let raum = null;
  let abmelden = [];
  let geschlossen = false;

  // Match
  let engine = null; // Gastgeber/Solo: die echte Engine - Gast: nur ein Spiegel
  let sendeTakt = 0;
  let pingTakt = 0;
  let ereignisPuffer = [];
  let letzteSeq = 0;
  let endeVerarbeitet = null; // matchId, deren Ende schon verbucht ist
  let endeSenden = 0;
  const offeneAktionen = new Map(); // Gast: aktionId -> { aktion, zeit, versuche }
  let aktionZaehler = 0;

  // Verbindung zum anderen Gerät
  let partnerZuletzt = 0; // Uhrzeit der letzten Nachricht vom Partner
  let partnerGeraet = null;
  let eigeneLeitungWegSeit = null; // Gastgeber: seit wann die eigene Leitung fehlt
  let gastWegSeit = null; // Gastgeber: seit wann der Gast schweigt (im Match)
  let anfrageSeit = 0; // Gast: seit wann er auf die Lobby wartet

  /* ---------------- Benachrichtigen ---------------- */

  function geaendert() {
    info.rev += 1;
    hoerer.forEach((fn) => {
      try {
        fn(info);
      } catch (fehler) {
        console.warn('Sitzungs-Zuhörer:', fehler);
      }
    });
  }

  function ereignisWeitergeben(e) {
    ereignisHoerer.forEach((fn) => {
      try {
        fn(e);
      } catch (fehler) {
        console.warn('Ereignis-Zuhörer:', fehler);
      }
    });
  }

  function senden(typ, daten = {}) {
    if (!raum) return false;
    return raum.senden(typ, { ...daten, geraet, v: PROTOKOLL });
  }

  /* ---------------- Lobby ---------------- */

  function lobbyNachricht() {
    return {
      lobbyId: info.lobbyId,
      code: info.code,
      phase: info.phase,
      spieler: info.spieler.map((s) => (s ? { geraet: s.geraet, profil: s.profil, bereit: s.bereit } : null)),
      wahl: info.wahl,
      matchId: info.match?.matchId ?? null,
    };
  }

  function lobbySenden() {
    if (art === 'host') senden('lobby', lobbyNachricht());
  }

  /** Prüft die Wahl (Welt, Boss-Duell) gegen beide Profile. */
  function wahlPruefen() {
    const profile = info.spieler.filter(Boolean).map((s) => s.profil);
    const erlaubt = wahlErlaubt(info.wahl, profile);
    info.wahlFehler = erlaubt.ok ? '' : erlaubt.grund;
    return erlaubt.ok;
  }

  function eigenesProfilEintragen() {
    const p = profilPruefen(profil());
    const alt = info.spieler[meinIndex];
    info.spieler[meinIndex] = { geraet, profil: p, bereit: alt?.bereit ?? false, online: true, ki: false };
  }

  /** Startet den Countdown, sobald beide bereit sind (nur Gastgeber). */
  function bereitPruefen() {
    if (!host || info.phase !== 'lobby' && info.phase !== 'countdown') return;
    const alleBereit = info.spieler.every((s) => s && s.bereit && (s.online || s.ki));
    if (alleBereit && wahlPruefen()) {
      if (info.phase !== 'countdown') {
        info.phase = 'countdown';
        info.countdown = art === 'solo' ? 0 : COUNTDOWN;
      }
    } else if (info.phase === 'countdown') {
      info.phase = 'lobby';
      info.countdown = null;
    }
  }

  /* ---------------- Match: Gastgeber und Solo ---------------- */

  function matchStarten() {
    const matchId = `${info.lobbyId}-${zufallsKennung(8)}`;
    const profile = info.spieler.map((s) => profilPruefen(s.profil));
    const setup = duellSetup({
      matchId,
      welt: info.wahl.welt,
      paar: info.wahl.paar,
      bossDuell: info.wahl.bossDuell,
      schwierigkeit: info.wahl.schwierigkeit,
      profile,
      steuerung: info.spieler.map((s) => (s.ki ? 'ki' : 'mensch')),
    });
    info.match = { matchId, setup };
    info.ergebnis = null;
    info.phase = 'match';
    info.countdown = null;
    info.hinweis = '';
    ereignisPuffer = [];
    letzteSeq = 0;
    gastWegSeit = null;
    engine = createDuell(setup, {
      onEvent: (e) => {
        letzteSeq = e.seq;
        if (online) ereignisPuffer.push(e);
        ereignisWeitergeben(e);
      },
    });
    if (online) {
      senden('start', { matchId, setup });
      zustandSenden();
    }
    geaendert();
  }

  function zustandSenden() {
    if (!engine || art !== 'host') return;
    senden('zustand', { matchId: info.match.matchId, z: engine.zustand(), ev: ereignisPuffer });
    ereignisPuffer = [];
  }

  /** Das Ende eines Matches verbuchen - genau einmal je Match-id. */
  async function endeVerbuchen(ende) {
    const matchId = info.match?.matchId;
    if (!matchId || endeVerarbeitet === matchId) return;
    endeVerarbeitet = matchId;
    info.phase = 'ergebnis';
    info.ergebnis = { ende, belohnung: null, laedt: true };
    geaendert();
    let belohnung = null;
    try {
      belohnung = belohnen ? await belohnen({ matchId, ende, ich: `p${meinIndex + 1}`, setup: info.match.setup }) : null;
    } catch (fehler) {
      console.warn('Belohnung nicht verbucht:', fehler);
    }
    if (info.match?.matchId !== matchId) return; // schon weiter
    info.ergebnis = { ende, belohnung, laedt: false };
    geaendert();
  }

  /* ---------------- Nachrichten ---------------- */

  function empfangen(n) {
    if (geschlossen || n.geraet === geraet) return;
    if (n.v !== PROTOKOLL) {
      if (n.typ === 'beitreten' && art === 'host') senden('abgelehnt', { an: n.geraet, grund: 'version' });
      return;
    }
    if (n.an && n.an !== geraet) return;
    if (art === 'host') hostEmpfaengt(n);
    else gastEmpfaengt(n);
  }

  function hostEmpfaengt(n) {
    const gast = info.spieler[1];
    const istGast = gast && gast.geraet === n.geraet;
    if (n.typ === 'beitreten') {
      if (gast && !istGast && gast.online) {
        senden('abgelehnt', { an: n.geraet, grund: 'voll' });
        return;
      }
      partnerGeraet = n.geraet;
      partnerZuletzt = uhr;
      info.spieler[1] = { geraet: n.geraet, profil: profilPruefen(n.profil), bereit: false, online: true, ki: false };
      info.partnerOnline = true;
      info.hinweis = '';
      if (info.phase === 'match' && info.match && engine && !engine.state.ende) {
        // Er kommt in ein laufendes Match zurück (z. B. nach Neuladen).
        info.spieler[1].bereit = true;
        engine.setSteuerung('p2', 'mensch');
        gastWegSeit = null;
        senden('start', { an: n.geraet, matchId: info.match.matchId, setup: info.match.setup });
        zustandSenden();
      } else if (info.phase === 'countdown') {
        info.phase = 'lobby';
        info.countdown = null;
      }
      wahlPruefen();
      lobbySenden();
      geaendert();
      return;
    }
    if (!istGast) return; // Fremde dürfen nichts verändern
    partnerZuletzt = uhr;
    if (!info.spieler[1].online) {
      info.spieler[1].online = true;
      info.partnerOnline = true;
      gastZurueck();
    }
    switch (n.typ) {
      case 'profil':
        if (info.phase === 'match') break;
        info.spieler[1].profil = profilPruefen(n.profil);
        info.spieler[1].bereit = false;
        wahlPruefen();
        bereitPruefen();
        lobbySenden();
        geaendert();
        break;
      case 'bereit':
        if (info.phase !== 'lobby' && info.phase !== 'countdown') break;
        info.spieler[1].bereit = Boolean(n.bereit);
        bereitPruefen();
        lobbySenden();
        geaendert();
        break;
      case 'aktion': {
        if (!engine || info.match?.matchId !== n.matchId || !n.aktion) break;
        const aktion = { ...n.aktion, aktionId: `p2:${String(n.aktion.aktionId ?? '').slice(0, 40)}` };
        const ergebnis = engine.aktion('p2', aktion);
        senden('antwort', { an: n.geraet, aktionId: n.aktion.aktionId, ok: ergebnis.ok, grund: ergebnis.grund ?? null });
        break;
      }
      case 'signal':
        if (engine && info.match?.matchId === n.matchId) signalVerteilen('p2', n.signal, false);
        break;
      case 'hallo':
        // Der Gast war kurz weg und meldet sich zurück: alles neu schicken.
        lobbySenden();
        if (info.match && engine && (info.phase === 'match' || info.phase === 'ergebnis')) {
          senden('start', { an: n.geraet, matchId: info.match.matchId, setup: info.match.setup });
          zustandSenden();
        }
        break;
      case 'verlassen':
        info.spieler[1].online = false;
        info.partnerOnline = false;
        if (engine && info.phase === 'match' && !engine.state.ende) {
          engine.setSteuerung('p2', 'ki');
          info.hinweis = 'Dein Teamkamerad hat das Match verlassen - die KI übernimmt.';
        } else {
          info.spieler[1] = null;
          info.hinweis = 'Dein Teamkamerad hat die Lobby verlassen.';
          if (info.phase === 'countdown') {
            info.phase = 'lobby';
            info.countdown = null;
          }
        }
        geaendert();
        break;
      default:
        break;
    }
  }

  function gastZurueck() {
    if (engine && info.phase === 'match' && !engine.state.ende) {
      engine.setSteuerung('p2', 'mensch');
      info.hinweis = 'Dein Teamkamerad ist wieder da!';
      senden('start', { an: partnerGeraet, matchId: info.match.matchId, setup: info.match.setup });
      zustandSenden();
    }
    gastWegSeit = null;
    geaendert();
  }

  function gastEmpfaengt(n) {
    // Der Gast hört nur auf den Gastgeber seiner Lobby.
    if (partnerGeraet && n.geraet !== partnerGeraet && n.typ !== 'abgelehnt') return;
    switch (n.typ) {
      case 'lobby': {
        if (n.code !== info.code) return;
        const ichDrin = n.spieler?.[1]?.geraet === geraet;
        if (!ichDrin) return;
        partnerGeraet = n.geraet;
        partnerZuletzt = uhr;
        info.partnerOnline = true;
        info.lobbyId = n.lobbyId;
        info.wahl = { ...info.wahl, ...n.wahl };
        const host0 = n.spieler[0];
        info.spieler[0] = host0 ? { geraet: host0.geraet, profil: profilPruefen(host0.profil), bereit: Boolean(host0.bereit), online: true, ki: false } : null;
        info.spieler[1] = { ...(info.spieler[1] ?? {}), geraet, profil: info.spieler[1]?.profil ?? profilPruefen(profil()), bereit: Boolean(n.spieler[1].bereit), online: true, ki: false };
        wahlPruefen();
        if (info.phase === 'verbinde') {
          info.phase = 'lobby';
          lobbyMerken({ code: info.code, art: 'gast' });
        }
        // Nach dem Ergebnis zurück in die Lobby, wenn der Gastgeber das tut.
        if (n.phase === 'lobby' || n.phase === 'countdown') {
          if (info.phase === 'ergebnis' || info.phase === 'countdown' || info.phase === 'lobby') info.phase = n.phase;
          info.countdown = n.phase === 'countdown' ? COUNTDOWN : null;
        }
        info.fehler = '';
        geaendert();
        break;
      }
      case 'abgelehnt':
        if (n.an !== geraet) return;
        info.phase = 'fehler';
        info.fehler = n.grund === 'version'
          ? 'Eure Spielversionen passen nicht zusammen. Bitte beide die Seite neu laden.'
          : 'Diese Lobby ist schon voll.';
        geaendert();
        break;
      case 'start': {
        if (!n.setup || !n.matchId) return;
        partnerGeraet = n.geraet;
        partnerZuletzt = uhr;
        const neu = info.match?.matchId !== n.matchId;
        if (neu) {
          info.match = { matchId: n.matchId, setup: n.setup };
          info.ergebnis = null;
          // Der Spiegel: dieselben Figuren, aber er rechnet nicht selbst.
          engine = createDuell(n.setup);
          engine.setLaeuft(false);
          letzteSeq = 0;
          offeneAktionen.clear();
        }
        if (info.phase !== 'ergebnis' || neu) info.phase = 'match';
        info.hinweis = '';
        geaendert();
        break;
      }
      case 'zustand': {
        if (!engine || n.matchId !== info.match?.matchId || !n.z) return;
        partnerZuletzt = uhr;
        // Ereignisse nur einmal weitergeben (nach Nummer).
        for (const e of n.ev ?? []) {
          if (e.seq > letzteSeq) {
            letzteSeq = e.seq;
            ereignisWeitergeben(e);
          }
        }
        zustandUebernehmen(engine.state, n.z);
        if (n.z.ende && info.phase === 'match') endeVerbuchen(n.z.ende);
        break;
      }
      case 'antwort': {
        const offen = offeneAktionen.get(n.aktionId);
        if (!offen) return;
        offeneAktionen.delete(n.aktionId);
        if (!n.ok) ereignisWeitergeben({ typ: 'abgelehnt', aktionId: n.aktionId, grund: n.grund, aktion: offen.aktion });
        geaendert();
        break;
      }
      case 'signal':
        ereignisWeitergeben({ typ: 'signal', von: 'p1', signal: n.signal });
        break;
      case 'ping':
        partnerZuletzt = uhr;
        break;
      case 'verlassen':
        info.partnerOnline = false;
        if (info.phase === 'match' && engine && !engine.state.ende) {
          // Ohne Gastgeber gibt es keinen Kampf mehr: kontrolliert beenden.
          const ende = { ergebnis: 'abbruch', grund: 'gastgeber-weg', zeit: engine.state.zeit, statistik: {} };
          engine.state.ende = ende;
          info.hinweis = 'Spieler 1 hat das Match verlassen.';
          endeVerbuchen(ende);
        } else {
          info.phase = 'fehler';
          info.fehler = 'Spieler 1 hat die Lobby geschlossen.';
          lobbyMerken(null);
        }
        geaendert();
        break;
      default:
        if (n.typ !== 'ping') partnerZuletzt = uhr;
        break;
    }
  }

  /** Ein Team-Signal an alle - und an die KI-Partnerin. */
  function signalVerteilen(von, signalId, weitersenden = true) {
    engine?.signal?.(von, signalId);
    if (weitersenden && online) senden('signal', { matchId: info.match?.matchId, signal: signalId });
    ereignisWeitergeben({ typ: 'signal', von, signal: signalId });
  }

  /* ---------------- Uhr ---------------- */

  /**
   * Ein Zeitschritt der Sitzung: Kampf rechnen, Zustand senden, Verbindung
   * überwachen. Im Browser ruft die eigene Uhr das auf, in Tests der Test.
   */
  function takt(dt) {
    if (geschlossen) return;
    uhr += dt;

    // Countdown in der Lobby.
    if (host && info.phase === 'countdown') {
      info.countdown = Math.max(0, (info.countdown ?? 0) - dt);
      if (info.countdown <= 0) matchStarten();
    }

    // Kampf rechnen (Gastgeber und Solo).
    if (host && engine && info.phase === 'match') {
      let rest = Math.min(dt, 2);
      while (rest > 0) {
        const schritt = Math.min(rest, 0.1);
        engine.schritt(schritt);
        rest -= schritt;
      }
      if (online) {
        sendeTakt += dt;
        if (sendeTakt >= 1 / DUELL.netz.zustandProSekunde) {
          sendeTakt = 0;
          zustandSenden();
        }
      }
      if (engine.state.ende) {
        endeSenden = ENDE_WIEDERHOLEN;
        endeVerbuchen(engine.state.ende);
      }
    } else if (host && engine && endeSenden > 0) {
      // Den Endstand noch ein paar Mal schicken - falls einer verloren geht.
      endeSenden -= dt;
      sendeTakt += dt;
      if (sendeTakt >= 0.4) {
        sendeTakt = 0;
        zustandSenden();
      }
    }

    if (!online) return;

    // Lebenszeichen.
    pingTakt += dt;
    if (pingTakt >= DUELL.netz.pingAlle) {
      pingTakt = 0;
      if (!(art === 'host' && info.phase === 'match')) senden('ping', { matchId: info.match?.matchId ?? null });
      if (art === 'gast' && info.phase === 'verbinde') senden('beitreten', { profil: profilPruefen(profil()) });
    }

    // Gast: unbeantwortete Aktionen erneut schicken (dieselbe id - doppelt
    // ausgeführt wird beim Gastgeber trotzdem nichts).
    if (art === 'gast') {
      for (const [id, offen] of offeneAktionen) {
        if (uhr - offen.zeit < AKTION_WIEDERHOLEN) continue;
        if (offen.versuche >= AKTION_VERSUCHE) {
          offeneAktionen.delete(id);
          ereignisWeitergeben({ typ: 'abgelehnt', aktionId: id, grund: 'keine-antwort', aktion: offen.aktion });
          continue;
        }
        offen.zeit = uhr;
        offen.versuche += 1;
        senden('aktion', { matchId: info.match?.matchId, aktion: offen.aktion });
      }
      if (info.phase === 'verbinde' && uhr - anfrageSeit > 8) {
        info.phase = 'fehler';
        info.fehler = 'Keine Lobby mit diesem Code gefunden. Stimmt der Code?';
        geaendert();
      }
    }

    verbindungUeberwachen();
  }

  function verbindungUeberwachen() {
    const netz = DUELL.netz;
    const partnerDa = info.spieler[1 - meinIndex] && !info.spieler[1 - meinIndex].ki;
    if (!partnerDa || info.phase === 'verbinde' || info.phase === 'fehler') return;
    const still = uhr - partnerZuletzt;
    const vorher = info.partnerOnline;
    info.partnerOnline = still < netz.getrenntNach && info.verbindung === 'verbunden';

    if (art === 'host') {
      const gast = info.spieler[1];
      if (gast) gast.online = info.partnerOnline;
      // Die eigene Leitung ist weg: Kampf anhalten, nach Frist beenden.
      if (info.verbindung !== 'verbunden') {
        eigeneLeitungWegSeit ??= uhr;
        if (engine && info.phase === 'match' && !engine.state.ende) {
          engine.setLaeuft(false);
          info.hinweis = 'Verbindung unterbrochen - der Kampf wartet …';
          if (uhr - eigeneLeitungWegSeit > netz.abbruchNach) {
            engine.setLaeuft(true);
            engine.abbrechen('verbindung');
          }
        }
      } else if (eigeneLeitungWegSeit !== null) {
        eigeneLeitungWegSeit = null;
        if (engine && info.phase === 'match' && !engine.state.ende) {
          engine.setLaeuft(true);
          info.hinweis = '';
          zustandSenden();
        }
      }
      // Der Gast schweigt im Match: warten, dann die KI übernehmen lassen.
      if (engine && info.phase === 'match' && !engine.state.ende && info.verbindung === 'verbunden') {
        if (!info.partnerOnline) {
          gastWegSeit ??= uhr;
          const weg = uhr - gastWegSeit + netz.getrenntNach;
          if (weg >= netz.kiErsatzNach) {
            if (engine.kaempfer('p2')?.steuerung !== 'ki') engine.setSteuerung('p2', 'ki');
            info.hinweis = 'Dein Teamkamerad ist nicht erreichbar - die KI spielt für ihn.';
          } else {
            if (engine.kaempfer('p2')?.steuerung === 'mensch') engine.setSteuerung('p2', 'leer');
            info.hinweis = `Dein Teamkamerad hat die Verbindung verloren - KI übernimmt in ${Math.ceil(netz.kiErsatzNach - weg)} s`;
          }
        }
      }
      // In der Lobby: ein Gast, der lange schweigt, macht den Platz frei.
      if (info.phase !== 'match' && gast && !info.partnerOnline && still > netz.abbruchNach / 2) {
        info.spieler[1] = null;
        info.hinweis = 'Dein Teamkamerad hat die Verbindung verloren.';
        if (info.phase === 'countdown') {
          info.phase = 'lobby';
          info.countdown = null;
        }
        geaendert();
        return;
      }
      if (info.phase === 'countdown' && !info.partnerOnline) bereitPruefen();
    } else {
      // Gast: Der Gastgeber schweigt.
      if (!info.partnerOnline && info.phase === 'match' && engine && !engine.state.ende) {
        info.hinweis = still > netz.getrenntNach ? `Warte auf Spieler 1 … (${Math.floor(still)} s)` : info.hinweis;
        if (still > netz.abbruchNach) {
          const ende = { ergebnis: 'abbruch', grund: 'verbindung', zeit: engine.state.zeit, statistik: {} };
          engine.state.ende = ende;
          info.hinweis = 'Die Verbindung zu Spieler 1 ist abgerissen.';
          endeVerbuchen(ende);
        }
      } else if (info.partnerOnline && info.hinweis.startsWith('Warte auf Spieler 1')) {
        info.hinweis = '';
      }
      if (info.phase !== 'match' && info.phase !== 'ergebnis' && still > netz.abbruchNach) {
        info.phase = 'fehler';
        info.fehler = 'Die Verbindung zur Lobby ist abgerissen.';
      }
    }
    if (vorher !== info.partnerOnline) geaendert();
  }

  /* ---------------- Öffnen ---------------- */

  function oeffnen() {
    eigenesProfilEintragen();
    if (art === 'solo') {
      const figur = info.spieler[0].profil.figur;
      info.spieler[1] = { geraet: 'ki', profil: profilPruefen(partnerProfil(figur)), bereit: true, online: true, ki: true };
      wahlPruefen();
      return;
    }
    raum = raumOeffnen(`mq2v2-${info.code}`, raumOptionen);
    abmelden.push(raum.an(empfangen));
    abmelden.push(raum.beobachten((status) => {
      const vorher = info.verbindung;
      info.verbindung = status === 'verbunden' ? 'verbunden' : status === 'verbinde' ? 'verbinde' : 'getrennt';
      if (status === 'verbunden') {
        if (art === 'host') {
          if (info.phase === 'verbinde') {
            info.phase = 'lobby';
            lobbyMerken({ code: info.code, art: 'host' });
          }
          lobbySenden();
          if (engine && info.phase === 'match') zustandSenden();
        } else if (info.phase === 'verbinde') {
          anfrageSeit = uhr;
          senden('beitreten', { profil: profilPruefen(profil()) });
        } else if (vorher !== 'verbunden') {
          // Wieder da nach einer Lücke: den Gastgeber um den Stand bitten.
          senden('hallo', { matchId: info.match?.matchId ?? null });
        }
      }
      geaendert();
    }));
    if (art === 'host') wahlPruefen();
  }

  /* ---------------- Eigene Uhr im Browser ---------------- */

  let intervall = null;
  if (automatisch) {
    let zuletzt = performance.now();
    // setInterval statt requestAnimationFrame: läuft (gedrosselt) auch
    // weiter, wenn das Spiel im Hintergrund liegt - sonst stünde beim
    // Gastgeber der Kampf für beide still.
    intervall = setInterval(() => {
      const jetzt = performance.now();
      const dt = Math.min(2, (jetzt - zuletzt) / 1000);
      zuletzt = jetzt;
      takt(dt);
    }, 50);
  }

  oeffnen();

  /* ---------------- Schnittstelle ---------------- */

  return {
    info,
    takt,
    beobachten(fn) {
      hoerer.add(fn);
      return () => hoerer.delete(fn);
    },
    ereignisse(fn) {
      ereignisHoerer.add(fn);
      return () => ereignisHoerer.delete(fn);
    },
    /** Der Kampfzustand zum Anzeigen (Gastgeber: echt, Gast: Spiegel). */
    matchState: () => engine?.state ?? null,
    /** Die Handkarten einer Figur mit ihren Leveln. */
    handAttacken: (id) => engine?.handAttacken(id) ?? [],
    meineFigur: () => `p${meinIndex + 1}`,
    offeneAktionen: () => [...offeneAktionen.values()].map((o) => o.aktion),

    /** Eigene Figur, Deck oder Boss-Kraft haben sich geändert. */
    profilAktualisieren() {
      if (info.phase === 'match') return;
      const p = profilPruefen(profil());
      info.spieler[meinIndex] = { ...info.spieler[meinIndex], profil: p, bereit: false };
      if (art === 'solo') {
        info.spieler[1] = { ...info.spieler[1], profil: profilPruefen(partnerProfil(info.spieler[1].profil.figur)) };
      }
      wahlPruefen();
      bereitPruefen();
      if (art === 'gast') senden('profil', { profil: p });
      lobbySenden();
      geaendert();
    },

    /** Nur solo: die Figur der KI-Partnerin. */
    partnerFigur(figur) {
      if (art !== 'solo' || info.phase === 'match') return;
      info.spieler[1] = { ...info.spieler[1], profil: profilPruefen(partnerProfil(figur)) };
      geaendert();
    },

    /** Welt, Gegnerteam, Boss-Duell, Schwierigkeit - nur der Gastgeber. */
    wahlAendern(teil) {
      if (!host || (info.phase !== 'lobby' && info.phase !== 'countdown')) return;
      info.wahl = { ...info.wahl, ...teil };
      // Ändert sich die Wahl, muss jeder neu zustimmen.
      info.spieler.forEach((s) => {
        if (s && !s.ki) s.bereit = false;
      });
      wahlPruefen();
      bereitPruefen();
      lobbySenden();
      geaendert();
    },

    bereitSetzen(bereit) {
      if (info.phase !== 'lobby' && info.phase !== 'countdown') return;
      const ich = info.spieler[meinIndex];
      if (!ich) return;
      ich.bereit = Boolean(bereit);
      if (art === 'gast') senden('bereit', { bereit: ich.bereit });
      else {
        bereitPruefen();
        lobbySenden();
      }
      geaendert();
    },

    /** Eine Aktion im Kampf: { typ:'karte', hand, karte, ziel } usw. */
    aktion(aktion) {
      if (info.phase !== 'match' || !engine) return { ok: false, grund: 'kein-match' };
      if (host) return engine.aktion(`p${meinIndex + 1}`, { ...aktion, aktionId: `p1:${++aktionZaehler}` });
      const mitId = { ...aktion, aktionId: `${geraet.slice(0, 6)}-${++aktionZaehler}` };
      offeneAktionen.set(mitId.aktionId, { aktion: mitId, zeit: uhr, versuche: 1 });
      senden('aktion', { matchId: info.match.matchId, aktion: mitId });
      return { ok: true, wartet: true, aktionId: mitId.aktionId };
    },

    signal(signalId) {
      if (info.phase !== 'match') return;
      signalVerteilen(`p${meinIndex + 1}`, signalId);
    },

    /** Solo: anhalten / fortsetzen. Online gibt es keine Pause. */
    pausieren(an) {
      if (art !== 'solo' || !engine) return false;
      engine.setLaeuft(!an);
      return true;
    },

    /** Nach dem Ergebnis zurück in die Lobby (für "Nochmal"). */
    zurLobby() {
      if (info.phase !== 'ergebnis') return;
      if (art === 'gast') {
        // Der Gast wartet, bis der Gastgeber die Lobby wieder öffnet.
        info.hinweis = 'Warte auf Spieler 1 …';
        geaendert();
        return;
      }
      engine = null;
      endeSenden = 0;
      info.phase = 'lobby';
      info.spieler.forEach((s) => {
        if (s && !s.ki) s.bereit = false;
      });
      if (art === 'host' && info.spieler[1] && !info.spieler[1].online) info.spieler[1] = null;
      info.hinweis = '';
      lobbySenden();
      geaendert();
    },

    /** Kampf aufgeben bzw. Lobby verlassen. */
    verlassen() {
      if (geschlossen) return;
      if (host && engine && info.phase === 'match' && !engine.state.ende) engine.abbrechen('verlassen');
      senden('verlassen', {});
      this.schliessen();
    },

    schliessen() {
      geschlossen = true;
      clearInterval(intervall);
      abmelden.forEach((fn) => fn());
      abmelden = [];
      raum?.schliessen();
      raum = null;
      if (online) lobbyMerken(null);
      info.phase = 'geschlossen';
      geaendert();
      hoerer.clear();
      ereignisHoerer.clear();
    },

    /** Nur für Tests: die Engine des Gastgebers. */
    _engine: () => engine,
  };
}

/* ------------------------------------------------------------------ */
/*  Die eine Sitzung der App                                           */
/* ------------------------------------------------------------------ */

let aktiv = null;

/** Startet eine neue Sitzung (eine alte wird vorher sauber verlassen). */
export function sitzungStarten(optionen) {
  if (aktiv) aktiv.verlassen();
  aktiv = createSitzung(optionen);
  aktiv.beobachten((info) => {
    if (info.phase === 'geschlossen') aktiv = null;
  });
  return aktiv;
}

export function aktuelleSitzung() {
  return aktiv;
}
