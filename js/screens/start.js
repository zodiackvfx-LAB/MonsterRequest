/**
 * Startbildschirm: Logo, Spielerleiste, Tagesaufgaben, großer Startknopf
 * und der Knopf für die Spielmodi.
 *
 * Das Menü (Shop, Deck, Figur ...) steht nicht mehr hier, sondern in der
 * Leiste am unteren Rand - siehe js/screens/lobby.js. Dieser Bildschirm ist
 * dort die mittlere Seite.
 */

import { showScreen } from '../core/screens.js';
import { createScenery } from '../ui/scenery.js';
import { createHud } from '../ui/hud.js';
import { getMonster } from '../data/monsters.js';
import { createSprite } from '../ui/sprite.js';
import { parallaxAktivieren } from '../ui/parallax.js';
import { LOGO_MONSTER, LOGO_QUEST } from '../ui/logo-pfade.js';
import { figurAnzeigeName, gameState, getAktiveFigur } from '../core/state.js';
import { TRUHEN_PLAETZE, truheNachId } from '../data/shop.js';
import { MUENZE } from '../data/items.js';
import { truheSvg } from '../ui/truhen.js';
import {
  alleZustaende,
  dauerText,
  freischaltenLaeuft,
  freischaltenStarten,
  platzZustand,
  restText,
  sofortPreis,
  truheAusPlatz,
} from '../core/truhenplaetze.js';
import { spieleKlang } from '../core/audio.js';
import { zeigeTruhenOeffnung } from '../ui/truhe-oeffnen.js';
import { spritesNeuZeichnen } from '../ui/sprite.js';
import { pruefeNeueErfolge, statistikSpeichern } from '../core/statistik.js';
import { zeigeErfolgToast } from '../ui/toast.js';
import { getTagesAufgaben, offeneBelohnungen } from '../core/aufgaben.js';
import { zeigeSpielmodi } from '../ui/spielmodi.js';

/** Raeumt den Tiefeneffekt beim Verlassen der Lobby wieder weg. */
let parallaxAus = () => {};

/** Das Logo springt nur beim ersten Öffnen ins Bild, nicht bei jeder Rückkehr. */
let logoGezeigt = false;

/** Timer der Sternschnuppe, damit sie beim Verlassen nicht weiterläuft. */
let schnuppenTimer = null;

/** Wie lange der Aufleucht-Effekt dauert, bevor die Karte kommt (ms). */
const START_EFFEKT = 240;

/**
 * Streut kleine Funken aus dem Knopf. Sie raeumen sich selbst wieder weg,
 * damit nichts liegenbleibt.
 */
function funkenStreuen(knopf) {
  const anzahl = 10;
  for (let i = 0; i < anzahl; i++) {
    const winkel = (Math.PI * 2 * i) / anzahl;
    const weite = 34 + Math.random() * 22;
    const funke = document.createElement('span');
    funke.className = 'startfunke';
    funke.style.left = `${20 + Math.random() * 60}%`;
    funke.style.top = '50%';
    funke.style.setProperty('--fx', `${Math.cos(winkel) * weite}px`);
    funke.style.setProperty('--fy', `${Math.sin(winkel) * weite}px`);
    knopf.appendChild(funke);
    setTimeout(() => funke.remove(), 520);
  }
}

/** Tickt jede Sekunde, solange die Startseite offen ist (Restzeit der Truhen). */
let platzTimer = null;

/**
 * Öffnet die Truhe aus einem Platz mit der großen Animation. Sind danach
 * noch weitere Truhen bereit, kann man direkt die nächste öffnen.
 *
 * @param {boolean} sofort - noch nicht fertig: mit Münzen sofort öffnen
 */
function truheOeffnen(screen, index, sofort = false) {
  const id = truheAusPlatz(index, { sofort });
  if (!id) {
    spieleKlang('gesperrt');
    return;
  }
  const naechsteBereit = () => alleZustaende().findIndex((p) => p.zustand === 'bereit');
  zeigeTruhenOeffnung(screen, truheNachId(id), {
    weitere: alleZustaende().filter((p) => p.zustand === 'bereit').length,
    fertig: (naechste) => {
      spritesNeuZeichnen();
      const neueErfolge = pruefeNeueErfolge();
      if (neueErfolge.length) {
        statistikSpeichern();
        zeigeErfolgToast(neueErfolge);
      }
      if (naechste && naechsteBereit() >= 0) truheOeffnen(screen, naechsteBereit());
      else showScreen('start');
    },
  });
}

/**
 * Das Fenster zu einer Truhe, die noch nicht fertig ist: Freischalten
 * starten oder sofort mit Münzen öffnen.
 */
function truhenDialog(screen, index) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay overlay--truhenplatz';
  screen.appendChild(overlay);

  let uhr = null;
  const schliessen = () => {
    clearInterval(uhr);
    overlay.remove();
  };

  function zeichnen() {
    const { zustand, truhe, rest, dauer } = platzZustand(index);
    if (zustand === 'leer') return schliessen();
    if (zustand === 'bereit') {
      schliessen();
      truheOeffnen(screen, index);
      return;
    }
    const preis = sofortPreis(index);
    const andereLaeuft = zustand === 'wartet' && freischaltenLaeuft();
    const genugMuenzen = gameState.coins >= preis;

    overlay.innerHTML = `
      <div class="overlay__box truhenplatz-dialog">
        <div class="truhenplatz-dialog__truhe">${truheSvg(truhe.design)}</div>
        <h3 class="overlay__title">${truhe.name}</h3>
        ${zustand === 'laeuft'
          ? `<p class="truhenplatz-dialog__zeit">⏳ Offen in <strong>${restText(rest)}</strong></p>
             <span class="truhenplatz-dialog__balken" style="--anteil:${1 - rest / dauer}"></span>`
          : `<p class="overlay__text">Braucht <strong>${dauerText(dauer)}</strong> zum Freischalten.</p>`}
        ${andereLaeuft ? '<p class="truhenplatz-dialog__hinweis">Es wird immer nur eine Truhe gleichzeitig freigeschaltet.</p>' : ''}
        <div class="overlay__actions">
          ${zustand === 'wartet' && !andereLaeuft
            ? '<button class="btn btn--big btn--green" data-aktion="starten" type="button">⏳ Freischalten starten</button>'
            : ''}
          <button class="btn${genugMuenzen ? '' : ' btn--ghost'}" data-aktion="sofort" type="button" ${genugMuenzen ? '' : 'disabled'}>
            Sofort öffnen: ${MUENZE} ${preis}
          </button>
          <button class="btn btn--ghost" data-aktion="zu" type="button">Schließen</button>
        </div>
      </div>
    `;
    overlay.querySelector('[data-aktion="starten"]')?.addEventListener('click', () => {
      freischaltenStarten(index);
      schliessen();
      showScreen('start');
    });
    overlay.querySelector('[data-aktion="sofort"]').addEventListener('click', () => {
      schliessen();
      truheOeffnen(screen, index, true);
    });
    overlay.querySelector('[data-aktion="zu"]').addEventListener('click', schliessen);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) schliessen();
  });
  zeichnen();
  // Die Restzeit und der Preis laufen im offenen Fenster mit.
  uhr = setInterval(() => {
    if (!overlay.isConnected) return clearInterval(uhr);
    zeichnen();
  }, 1000);
}

/** Inhalt eines Platzes je nach Zustand. */
function platzInhalt(p) {
  if (p.zustand === 'leer') {
    return '<span class="truhenplatz__leer">Truhenplatz</span>';
  }
  const unten = {
    wartet: `<span class="truhenplatz__text">${dauerText(p.dauer)}</span>`,
    laeuft: `<span class="truhenplatz__text truhenplatz__text--zeit">${restText(p.rest)}</span>
             <span class="truhenplatz__balken" style="--anteil:${1 - p.rest / p.dauer}"></span>`,
    bereit: '<span class="truhenplatz__text truhenplatz__text--bereit">Öffnen!</span>',
  }[p.zustand];
  return `
    <span class="truhenplatz__truhe">${truheSvg(p.truhe.design)}</span>
    ${unten}
  `;
}

/**
 * Die Reihe mit den 4 Truhenplätzen. Wartet eine Truhe und läuft gerade
 * keine, zeigt der Platz "Tippen" - so weiß man, dass man starten kann.
 */
function baueTruhenplaetze(screen) {
  const reihe = document.createElement('div');
  reihe.className = 'truhenplaetze';
  reihe.setAttribute('role', 'group');
  reihe.setAttribute('aria-label', 'Truhenplätze');

  const knoepfe = Array.from({ length: TRUHEN_PLAETZE }, (_, index) => {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.dataset.klang = 'keiner';
    knopf.addEventListener('click', () => {
      const p = platzZustand(index);
      if (p.zustand === 'leer') return;
      spieleKlang('tipp');
      if (p.zustand === 'bereit') truheOeffnen(screen, index);
      else truhenDialog(screen, index);
    });
    reihe.appendChild(knopf);
    return knopf;
  });

  /** Baut die Plätze neu - nur die, deren Anzeige sich geändert hat. */
  function aktualisieren() {
    const laeuft = freischaltenLaeuft();
    alleZustaende().forEach((p, index) => {
      const knopf = knoepfe[index];
      const startbar = p.zustand === 'wartet' && !laeuft;
      const klasse = `truhenplatz truhenplatz--${p.zustand}${startbar ? ' ist-startbar' : ''}${p.truhe ? ` truhenplatz--${p.truhe.design}` : ''}`;
      const html = platzInhalt(p);
      if (knopf.className !== klasse) knopf.className = klasse;
      if (knopf.dataset.html !== html) {
        knopf.innerHTML = html;
        knopf.dataset.html = html;
      }
      knopf.disabled = p.zustand === 'leer';
      knopf.setAttribute(
        'aria-label',
        p.zustand === 'leer'
          ? 'Leerer Truhenplatz'
          : `${p.truhe.name}: ${{ wartet: 'Freischalten starten', laeuft: `offen in ${restText(p.rest)}`, bereit: 'jetzt öffnen' }[p.zustand]}`
      );
    });
  }

  aktualisieren();
  clearInterval(platzTimer);
  platzTimer = setInterval(aktualisieren, 1000);
  return reihe;
}

export const startScreen = {
  mount(root) {
    const starter = getMonster(getAktiveFigur());

    const screen = document.createElement('div');
    screen.className = 'screen screen--start';
    // deko: true - nur die Lobby bekommt die verzauberte Wiese.
    screen.appendChild(createScenery({ deko: true }));
    screen.appendChild(createHud());

    const content = document.createElement('div');
    content.className = 'start__logo';
    /* Das Logo besteht aus festen Pfaden, nicht aus Schrift.
       Grund: Die Buchstaben haben eine dicke Kontur, die sich mit der des
       Nachbarn ueberschneidet. Welche Kontur dann obenauf liegt, entscheidet
       jeder Browser anders - auf dem iPhone wurde aus dem Wort ein weisser
       Klumpen. Mit Pfaden gibt es diese Frage nicht mehr.

       Drei Lagen je Wort, von hinten nach vorn:
         1. goldener Rand  (nur Strich, am breitesten)
         2. dunkle Kontur  (Strich UND Fuellung - ergibt die Silhouette)
         3. Farbfuellung   (ohne Strich - die Buchstaben bleiben getrennt,
                            dazwischen sieht man die dunkle Kontur)

       Die Pfade erzeugt werkzeuge/logo-bauen.py. */
    content.innerHTML = `
      <svg class="logo${logoGezeigt ? '' : ' logo--rein'}" viewBox="0 0 300 108" role="img" aria-label="MonsterQuest">
        <defs>
          <linearGradient id="logo-monster" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.35" stop-color="#ffffff" />
            <stop offset="1" stop-color="#9ecdff" />
          </linearGradient>
          <linearGradient id="logo-quest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.3" stop-color="#ffe98a" />
            <stop offset="1" stop-color="#ff9e18" />
          </linearGradient>
          <clipPath id="logo-schrift">
            <path d="${LOGO_MONSTER}" />
            <path d="${LOGO_QUEST}" />
          </clipPath>
        </defs>
        <!-- Tiefe: eine dunkle Kopie, etwas nach unten versetzt - die
             Buchstaben wirken dadurch wie dicke Klötzchen. -->
        <g class="logo__tiefe" transform="translate(0 5)">
          <path d="${LOGO_MONSTER}" />
          <path d="${LOGO_QUEST}" />
        </g>
        <path class="logo__rand" d="${LOGO_MONSTER}" />
        <path class="logo__rand" d="${LOGO_QUEST}" />
        <path class="logo__kontur" d="${LOGO_MONSTER}" />
        <path class="logo__kontur" d="${LOGO_QUEST}" />
        <path class="logo__fuellung" d="${LOGO_MONSTER}" fill="url(#logo-monster)" />
        <path class="logo__fuellung" d="${LOGO_QUEST}" fill="url(#logo-quest)" />
        <!-- Ein Lichtstreif wandert ab und zu über die Buchstaben. -->
        <g clip-path="url(#logo-schrift)">
          <rect class="logo__glanz" x="-70" y="-10" width="34" height="130" />
        </g>
      </svg>
      <span class="logo-stern logo-stern--1" aria-hidden="true">✦</span>
      <span class="logo-stern logo-stern--2" aria-hidden="true">✦</span>
      <span class="logo-stern logo-stern--3" aria-hidden="true">✧</span>
      <span class="logo-stern logo-stern--4" aria-hidden="true">✦</span>
      <p class="logo__claim">Kleine Monster. Große Abenteuer.</p>
    `;
    screen.appendChild(content);
    logoGezeigt = true;

    // Geheimnis: Ein kleiner Stern am Himmel blinkt. Wer ihn antippt,
    // schickt ihn als Sternschnuppe davon. Keine Belohnung - nur Freude.
    const stern = document.createElement('button');
    stern.type = 'button';
    stern.className = 'himmels-stern';
    stern.setAttribute('aria-label', 'Ein funkelnder Stern');
    stern.addEventListener('click', () => {
      if (stern.classList.contains('ist-schnuppe')) return;
      stern.classList.add('ist-schnuppe');
      clearTimeout(schnuppenTimer);
      schnuppenTimer = setTimeout(() => stern.classList.remove('ist-schnuppe'), 6000);
    });
    screen.appendChild(stern);

    const hero = document.createElement('div');
    hero.className = 'start__hero';
    hero.innerHTML = `
      <div class="hero-buehne">
        <span class="hero-schatten"></span>
        <div class="sprite sprite--large hero-atmen" id="hero-sprite"></div>
      </div>
      <p class="start__hero-name">Deine Figur: ${figurAnzeigeName(starter)}</p>
    `;
    hero.querySelector('#hero-sprite').appendChild(createSprite(starter));
    screen.appendChild(hero);

    const actions = document.createElement('div');
    actions.className = 'start__actions';

    // Banner fuer die Tagesaufgaben - liegt bewusst ueber dem Startknopf,
    // damit man abholbereite Belohnungen nicht uebersieht.
    const aufgaben = getTagesAufgaben();
    const offen = offeneBelohnungen();
    const erledigt = aufgaben.filter((e) => e.fertig).length;

    const aufgabenKnopf = document.createElement('button');
    aufgabenKnopf.type = 'button';
    aufgabenKnopf.className = `tagesbanner${offen > 0 ? ' is-ready' : ''}`;
    aufgabenKnopf.innerHTML = `
      <span class="tagesbanner__icon">📋</span>
      <span class="tagesbanner__body">
        <span class="tagesbanner__title">Tagesaufgaben</span>
        <span class="tagesbanner__text">${
          offen > 0
            ? `${offen} Belohnung${offen > 1 ? 'en' : ''} abholbereit`
            : `${erledigt} von ${aufgaben.length} geschafft`
        }</span>
      </span>
      ${offen > 0 ? `<span class="tagesbanner__punkt">${offen}</span>` : '<span class="tagesbanner__pfeil">›</span>'}
    `;
    aufgabenKnopf.addEventListener('click', () => showScreen('daily'));
    actions.appendChild(aufgabenKnopf);

    // Eine Reihe wie bei Clash Royale: links der kleine Knopf für die
    // Spielmodi, rechts der große Startknopf fürs Abenteuer.
    const startReihe = document.createElement('div');
    startReihe.className = 'start__reihe';

    const modiKnopf = document.createElement('button');
    modiKnopf.className = 'btn modi-knopf';
    modiKnopf.type = 'button';
    modiKnopf.setAttribute('aria-label', 'Spielmodi');
    modiKnopf.innerHTML = '<span class="modi-knopf__icon">🎮</span><span class="modi-knopf__text">Modi</span>';
    modiKnopf.addEventListener('click', () => zeigeSpielmodi(screen));
    startReihe.appendChild(modiKnopf);

    const startButton = document.createElement('button');
    startButton.className = 'btn btn--big btn--abenteuer';
    startButton.type = 'button';
    startButton.textContent = '▶  SPIEL STARTEN';
    // Direkt in die zuletzt freigeschaltete Welt - die Weltauswahl
    // erreicht man von der Karte aus.
    startButton.addEventListener('click', () => {
      // Kurz aufleuchten, Funken streuen, dann wie bisher die Karte oeffnen.
      startButton.classList.add('is-gestartet');
      funkenStreuen(startButton);
      setTimeout(
        () => showScreen('map', { worldId: gameState.unlockedWorld }),
        START_EFFEKT
      );
    });
    startReihe.appendChild(startButton);
    actions.appendChild(startReihe);

    // Die 4 Truhenplätze wie bei Clash Royale - direkt unter "Spiel starten".
    actions.appendChild(baueTruhenplaetze(screen));

    screen.appendChild(actions);
    root.appendChild(screen);

    // Leichter Tiefeneffekt beim Wischen. Wird beim Verlassen abgeschaltet.
    parallaxAus = parallaxAktivieren(screen);
  },

  unmount() {
    parallaxAus();
    parallaxAus = () => {};
    clearTimeout(schnuppenTimer);
    schnuppenTimer = null;
    clearInterval(platzTimer);
    platzTimer = null;
  },
};
