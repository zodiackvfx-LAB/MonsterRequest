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
  },
};
