/**
 * Ton-Maschine.
 *
 * Erzeugt alle Klänge und die Musik direkt im Browser (Web Audio API).
 * Es wird nichts heruntergeladen - deshalb gibt es keine Ladezeit, keine
 * fremden Rechte und alles funktioniert ohne Internet.
 *
 * WICHTIG für iPhone und iPad: Safari erlaubt Ton erst, nachdem der Nutzer
 * die Seite einmal berührt hat. Deshalb wird die Ton-Maschine nicht beim
 * Laden gestartet, sondern beim ersten Tippen (siehe tonFreischalten()).
 *
 * Von außen braucht man nur drei Dinge:
 *
 *     spieleKlang('tipp');          // einen Klang abspielen
 *     musikStarten('wald');         // Hintergrundmusik einer Welt
 *     musikStoppen();
 */

import { getKlang } from '../data/sounds.js';
import { MUSTER_LAENGE, getMusik } from '../data/musik.js';
import { gameState } from './state.js';

/** Grundlautstärke. Bewusst niedrig - lieber zu leise als zu laut. */
const KLANG_LAUTSTAERKE = 0.55;
const MUSIK_LAUTSTAERKE = 0.1;

let ctx = null; // AudioContext, erst nach der ersten Berührung
let klangBus = null; // Lautstärkeregler für Klänge
let musikBus = null; // Lautstärkeregler für Musik
let rauschen = null; // ein Stück weißes Rauschen, wird wiederverwendet
let freigeschaltet = false;

/* ------------------------------------------------------------------ */
/*  Aufbau                                                             */
/* ------------------------------------------------------------------ */

function aufbauen() {
  if (ctx) return true;

  const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioCtx) return false; // sehr alter Browser - dann eben ohne Ton

  try {
    ctx = new AudioCtx();
  } catch (error) {
    console.warn('Ton nicht verfügbar:', error);
    return false;
  }

  // Ein Begrenzer am Ende verhindert Knacken, wenn mehrere Klänge
  // gleichzeitig laufen (z. B. Treffer während der Siegesfanfare).
  const begrenzer = ctx.createDynamicsCompressor();
  begrenzer.threshold.value = -12;
  begrenzer.ratio.value = 12;
  begrenzer.attack.value = 0.003;
  begrenzer.release.value = 0.2;
  begrenzer.connect(ctx.destination);

  klangBus = ctx.createGain();
  klangBus.gain.value = KLANG_LAUTSTAERKE;
  klangBus.connect(begrenzer);

  musikBus = ctx.createGain();
  musikBus.gain.value = 0; // fährt beim Start sanft hoch
  musikBus.connect(begrenzer);

  // Weißes Rauschen einmal erzeugen und für alle Zisch-Klänge wiederverwenden.
  const laenge = Math.floor(ctx.sampleRate * 1.0);
  rauschen = ctx.createBuffer(1, laenge, ctx.sampleRate);
  const daten = rauschen.getChannelData(0);
  for (let i = 0; i < laenge; i++) daten[i] = Math.random() * 2 - 1;

  return true;
}

/**
 * Schaltet den Ton bei der ersten Berührung frei.
 * Wird einmal beim Start aufgerufen (js/main.js).
 */
const FREISCHALT_EREIGNISSE = ['pointerdown', 'touchend', 'click', 'keydown'];

export function tonFreischalten() {
  if (freigeschaltet) return;
  freigeschaltet = true;

  // Bewusst OHNE { once: true }: klappt der erste Versuch nicht, muss der
  // zweite Fingertipp es erneut probieren duerfen. Die Handler entfernen
  // sich erst, wenn der Ton wirklich laeuft.
  // In der Auffang-Phase (true): so ist der Ton schon bereit, wenn kurz
  // darauf der Knopfklang gespielt wird.
  FREISCHALT_EREIGNISSE.forEach((name) =>
    document.addEventListener(name, freischaltVersuch, true)
  );
}

function freischaltVersuch() {
  // Schon frei? Dann nur noch aufraeumen.
  if (ctx && ctx.state === 'running') {
    FREISCHALT_EREIGNISSE.forEach((name) =>
      document.removeEventListener(name, freischaltVersuch, true)
    );
    if (gewuenschteMusik) musikStarten(gewuenschteMusik);
    return;
  }

  if (!aufbauen()) return;

  iosStummschalterUmgehen();

  // Safari startet den Kontext angehalten - hier, in der Nutzeraktion, darf
  // er laufen. Manche iOS-Versionen bleiben trotzdem stumm, bis einmal ein
  // Puffer gespielt wurde - deshalb der stumme Anstoss.
  anstossSpielen();
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      if (gewuenschteMusik) musikStarten(gewuenschteMusik);
    }, () => {});
  } else if (gewuenschteMusik) {
    musikStarten(gewuenschteMusik);
  }
}

/** Ein Sample Stille - manche iOS-Versionen brauchen das zum Aufwachen. */
function anstossSpielen() {
  try {
    const puffer = ctx.createBuffer(1, 1, 22050);
    const quelle = ctx.createBufferSource();
    quelle.buffer = puffer;
    quelle.connect(ctx.destination);
    quelle.start(0);
  } catch (error) {
    /* nicht schlimm - dann eben ohne Anstoss */
  }
}

/* ------------------------------------------------------------------ */
/*  Der Stummschalter von iPhone und iPad                              */
/* ------------------------------------------------------------------ */

let stilleSpur = null;

/**
 * Auf iPhone und iPad schaltet der Stummschalter (das Glockensymbol im
 * Kontrollzentrum) den Web-Audio-Ton komplett ab - ein stummes Spiel,
 * obwohl alles richtig programmiert ist. Musik und Videos sind davon nicht
 * betroffen, weil sie in einer anderen Tonkategorie laufen.
 *
 * Wir schalten deshalb auf genau diese Kategorie um. Zwei Wege:
 *   1. navigator.audioSession (Safari ab 16.4) - der saubere Weg
 *   2. eine stumme, endlos laufende Tonspur - der Weg fuer aeltere Geraete
 */
function iosStummschalterUmgehen() {
  // Weg 1
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch (error) {
    /* kennt der Browser nicht - dann Weg 2 */
  }

  // Weg 2
  if (stilleSpur) {
    if (stilleSpur.paused) stilleSpur.play().catch(() => {});
    return;
  }

  try {
    stilleSpur = new Audio(stilleWavAdresse());
    stilleSpur.loop = true;
    stilleSpur.volume = 0.001; // nicht 0 - manche Browser pausieren dann
    stilleSpur.setAttribute('playsinline', '');
    stilleSpur.play().catch(() => {});
  } catch (error) {
    stilleSpur = null;
  }
}

/**
 * Baut eine winzige stille WAV-Datei im Speicher.
 * Bewusst im Code erzeugt statt als Datei mitgeliefert - so bleibt das
 * Spiel ohne einzige Mediendatei.
 */
function stilleWavAdresse() {
  const rate = 8000;
  const samples = 800; // 0,1 Sekunden
  const bytes = new Uint8Array(44 + samples);
  const sicht = new DataView(bytes.buffer);

  const text = (pos, wert) => {
    for (let i = 0; i < wert.length; i++) sicht.setUint8(pos + i, wert.charCodeAt(i));
  };

  text(0, 'RIFF');
  sicht.setUint32(4, 36 + samples, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  sicht.setUint32(16, 16, true); // Laenge des Formatblocks
  sicht.setUint16(20, 1, true); // unkomprimiert
  sicht.setUint16(22, 1, true); // ein Kanal
  sicht.setUint32(24, rate, true);
  sicht.setUint32(28, rate, true); // Bytes pro Sekunde
  sicht.setUint16(32, 1, true); // Bytes pro Sample
  sicht.setUint16(34, 8, true); // Bits pro Sample
  text(36, 'data');
  sicht.setUint32(40, samples, true);
  bytes.fill(128, 44); // 128 ist bei 8 Bit die Null-Linie = Stille

  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}

/**
 * Sagt, in welchem Zustand der Ton gerade ist.
 * Wird vom Ton-Test in den Einstellungen benutzt.
 */
export function tonStatus() {
  return {
    moeglich: Boolean(window.AudioContext ?? window.webkitAudioContext),
    aufgebaut: Boolean(ctx),
    zustand: ctx ? ctx.state : 'noch nicht gestartet',
    klaengeAn: gameState.settings.sound !== false,
    musikAn: gameState.settings.musik !== false,
    stummschalterUmgangen: Boolean(stilleSpur && !stilleSpur.paused),
  };
}

/** Ist der Ton gerade erwünscht und benutzbar? */
function tonAn() {
  if (!ctx) return false;
  // Safari haelt den Kontext manchmal wieder an (Anruf, Tab-Wechsel).
  // Hier ist der Aufruf immer noch in einer Nutzeraktion - also erlaubt.
  if (ctx.state === 'suspended') ctx.resume();
  return gameState.settings.sound !== false;
}

/* ------------------------------------------------------------------ */
/*  Klänge                                                             */
/* ------------------------------------------------------------------ */

/**
 * Spielt einen Klang aus js/data/sounds.js.
 * Unbekannte Namen werden still übergangen - ein fehlender Klang darf
 * niemals das Spiel anhalten.
 *
 * @param {string} name
 */
export function spieleKlang(name) {
  if (!tonAn()) return;

  const ebenen = getKlang(name);
  if (!ebenen) return;

  const jetzt = ctx.currentTime;
  ebenen.forEach((ebene) => ebeneSpielen(ebene, jetzt));
}

/** Eine einzelne Ebene eines Klangs erzeugen. */
function ebeneSpielen(ebene, jetzt) {
  const start = jetzt + (ebene.start ?? 0);
  const dauer = Math.max(0.01, ebene.dauer);
  const ende = start + dauer;

  // Quelle: entweder eine Schwingung oder ein Stück Rauschen.
  let quelle;
  if (ebene.form === 'rauschen') {
    quelle = ctx.createBufferSource();
    quelle.buffer = rauschen;
    // Zufälliger Einstieg, damit zwei Treffer nicht identisch klingen.
    quelle.playbackRate.value = 0.8 + Math.random() * 0.4;
  } else {
    quelle = ctx.createOscillator();
    quelle.type = ebene.form;
    quelle.frequency.setValueAtTime(ebene.von, start);
    if (ebene.bis && ebene.bis !== ebene.von) {
      // exponentiell klingt für Ohren natürlicher als linear
      quelle.frequency.exponentialRampToValueAtTime(Math.max(1, ebene.bis), ende);
    }
  }

  // Hüllkurve: sanft einsetzen, dann ausklingen.
  const huelle = ctx.createGain();
  const spitze = Math.max(0.0001, ebene.lautstaerke);
  const anstieg = Math.min(ebene.anstieg ?? 0.004, dauer * 0.5);
  huelle.gain.setValueAtTime(0.0001, start);
  huelle.gain.linearRampToValueAtTime(spitze, start + anstieg);
  // Auf 0 darf exponentiell nicht gefahren werden - deshalb fast 0.
  huelle.gain.exponentialRampToValueAtTime(0.0001, ende);

  // Optionaler Filter, z. B. damit ein Treffer dumpf statt spitz klingt.
  let letzter = quelle;
  if (ebene.filter) {
    const filter = ctx.createBiquadFilter();
    filter.type = ebene.filter.typ;
    filter.Q.value = ebene.filter.q ?? 1;
    filter.frequency.setValueAtTime(ebene.filter.von, start);
    if (ebene.filter.bis && ebene.filter.bis !== ebene.filter.von) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, ebene.filter.bis), ende);
    }
    quelle.connect(filter);
    letzter = filter;
  }

  letzter.connect(huelle);
  huelle.connect(klangBus);

  quelle.start(start);
  quelle.stop(ende + 0.02);
  // Aufräumen, damit keine Knoten liegenbleiben.
  quelle.onended = () => {
    try {
      quelle.disconnect();
      huelle.disconnect();
    } catch (error) {
      /* schon getrennt - egal */
    }
  };
}

/**
 * Spielt den Treffer-Klang passend zur Stärke.
 * @param {number} schaden
 */
export function spieleTreffer(schaden) {
  spieleKlang(schaden >= 30 ? 'trefferStark' : 'treffer');
}

/**
 * Spielt den Beute-Klang passend zur Seltenheit.
 * @param {string} seltenheit
 */
export function spieleBeute(seltenheit) {
  spieleKlang(seltenheit === 'episch' || seltenheit === 'legendaer' ? 'beuteSelten' : 'beute');
}

/* ------------------------------------------------------------------ */
/*  Musik                                                              */
/* ------------------------------------------------------------------ */

let musikTakt = null; // Taktgeber (setInterval)
let musikStil = null; // die gerade laufende Kategorie
let gewuenschteMusik = null; // was laufen soll, sobald der Ton frei ist
let naechsterSchritt = 0; // Zeitpunkt des nächsten Tons
let schrittNummer = 0;

/** Wie weit im Voraus Töne eingeplant werden (Sekunden). */
const VORLAUF = 0.25;

/**
 * Startet die Hintergrundmusik einer Kategorie ('wald', 'vulkan', 'menue' ...).
 * Läuft dieselbe Musik schon, passiert nichts.
 */
export function musikStarten(kategorie) {
  gewuenschteMusik = kategorie;

  if (!ctx || gameState.settings.musik === false || gameState.settings.sound === false) return;
  if (musikStil === kategorie && musikTakt !== null) return;

  musikStoppen({ merken: true });
  musikStil = kategorie;

  const stil = getMusik(kategorie);
  const schrittDauer = 60 / stil.tempo / 2; // Achtelnoten
  naechsterSchritt = ctx.currentTime + 0.1;
  schrittNummer = 0;

  // Sanft einblenden, damit die Musik nicht anspringt.
  musikBus.gain.cancelScheduledValues(ctx.currentTime);
  musikBus.gain.setValueAtTime(musikBus.gain.value, ctx.currentTime);
  musikBus.gain.linearRampToValueAtTime(
    MUSIK_LAUTSTAERKE * stil.lautstaerke,
    ctx.currentTime + 1.5
  );

  // Taktgeber: plant immer ein Stück in die Zukunft. Das ist nötig, weil
  // setInterval ungenau ist, die Web-Audio-Uhr aber exakt.
  musikTakt = setInterval(() => {
    if (!ctx) return;
    // War der Tab im Hintergrund, bremst der Browser setInterval aus. Ohne
    // diese Zeile wuerden danach alle verpassten Toene auf einmal losgehen.
    if (naechsterSchritt < ctx.currentTime) naechsterSchritt = ctx.currentTime + 0.05;

    while (naechsterSchritt < ctx.currentTime + VORLAUF) {
      schrittSpielen(stil, schrittNummer, naechsterSchritt);
      naechsterSchritt += schrittDauer;
      schrittNummer += 1;
    }
  }, 60);
}

/** Hält die Musik an. */
export function musikStoppen({ merken = false } = {}) {
  if (!merken) gewuenschteMusik = null;
  if (musikTakt !== null) {
    clearInterval(musikTakt);
    musikTakt = null;
  }
  musikStil = null;
  if (ctx && musikBus) {
    musikBus.gain.cancelScheduledValues(ctx.currentTime);
    musikBus.gain.setValueAtTime(musikBus.gain.value, ctx.currentTime);
    musikBus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  }
}

/** Rechnet einen Platz in der Tonleiter in eine Frequenz um. */
function tonhoehe(stil, platz, oktave = 1) {
  const halbton = stil.skala[platz % stil.skala.length];
  return stil.grundton * Math.pow(2, halbton / 12) * oktave;
}

/**
 * Ein Achtelschritt des Motivs.
 * Die Melodie folgt dem festen Muster der Welt, der Bass einer kleinen
 * Akkordfolge - dadurch klingt es nach Musik statt nach Zufall.
 */
function schrittSpielen(stil, nummer, zeit) {
  const imTakt = nummer % MUSTER_LAENGE;
  const durchgang = Math.floor(nummer / MUSTER_LAENGE);

  // Bass auf Schlag 1 und 3. Die Folge wechselt je Durchgang die Stufe.
  if (imTakt === 0 || imTakt === 8) {
    const haelfte = imTakt === 8 ? 1 : 0;
    const platz = stil.bassfolge[(durchgang * 2 + haelfte) % stil.bassfolge.length];
    musikTon(stil.bassForm, tonhoehe(stil, platz) / 2, zeit, 0.9, 0.45);
  }

  // Melodie nach Muster. null bedeutet Pause.
  const platz = stil.muster[imTakt];
  if (platz === null || platz === undefined) return;

  // Jeder vierte Durchgang klingt eine Oktave höher - das bringt Abwechslung,
  // ohne dass das Motiv verlorengeht.
  const oktave = durchgang % 4 === 3 ? 2 : 1;
  musikTon(stil.form, tonhoehe(stil, platz, oktave), zeit, 0.45, 0.2);
}

/** Ein einzelner Musikton, weich ein- und ausklingend. */
function musikTon(form, frequenz, zeit, dauer, lautstaerke) {
  const oszi = ctx.createOscillator();
  oszi.type = form;
  oszi.frequency.value = frequenz;

  // Dämpft die Schärfe von sawtooth und square ab.
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(6000, frequenz * 6);

  const huelle = ctx.createGain();
  huelle.gain.setValueAtTime(0.0001, zeit);
  huelle.gain.linearRampToValueAtTime(lautstaerke, zeit + 0.04);
  huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);

  oszi.connect(filter);
  filter.connect(huelle);
  huelle.connect(musikBus);

  oszi.start(zeit);
  oszi.stop(zeit + dauer + 0.02);
  oszi.onended = () => {
    try {
      oszi.disconnect();
      filter.disconnect();
      huelle.disconnect();
    } catch (error) {
      /* schon getrennt - egal */
    }
  };
}

/**
 * Nach einer Änderung in den Einstellungen anwenden.
 * Ton aus heißt: Musik sofort anhalten. Ton wieder an: Musik nachholen.
 */
export function tonEinstellungenAnwenden() {
  const an = gameState.settings.sound !== false && gameState.settings.musik !== false;

  if (!an) {
    const merken = gewuenschteMusik;
    musikStoppen();
    gewuenschteMusik = merken; // gemerkt, falls wieder eingeschaltet wird
  } else if (gewuenschteMusik) {
    musikStarten(gewuenschteMusik);
  }
}
