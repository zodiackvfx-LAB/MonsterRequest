/**
 * Startbildschirm: Logo, Spielerleiste, großer Startknopf und das Hauptmenü.
 */

import { showScreen } from '../core/screens.js';
import { createScenery } from '../ui/scenery.js';
import { createHud } from '../ui/hud.js';
import { getMonster, STARTER_MONSTER_ID } from '../data/monsters.js';
import { createSprite } from '../ui/sprite.js';
import { parallaxAktivieren } from '../ui/parallax.js';
import { LOGO_MONSTER, LOGO_QUEST } from '../ui/logo-pfade.js';
import { gameState } from '../core/state.js';
import { getTagesAufgaben, offeneBelohnungen } from '../core/aufgaben.js';

/** Die vier Menüknöpfe. Neuer Menüpunkt = hier einen Eintrag ergänzen. */
const MENU = [
  { bild: 'bilder/menue/welten.png', label: 'Welten', screen: 'worlds' },
  { bild: 'bilder/menue/figur.png', label: 'Figur', screen: 'monster' },
  { bild: 'bilder/menue/deck.png', label: 'Deck', screen: 'deck' },
  { bild: 'bilder/menue/sammlung.png', label: 'Sammlung', screen: 'collection' },
  { bild: 'bilder/menue/shop.png', label: 'Shop', screen: 'shop' },
  { bild: 'bilder/menue/einstellungen.png', label: 'Einstellungen', screen: 'settings' },
];

/** Raeumt den Tiefeneffekt beim Verlassen der Lobby wieder weg. */
let parallaxAus = () => {};

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

/** Die Adressen der Menuegrafiken - main.js laedt sie beim Start vor. */
export const MENU_BILDER = MENU.map((eintrag) => eintrag.bild).filter(Boolean);

export const startScreen = {
  mount(root) {
    const starter = getMonster(STARTER_MONSTER_ID);

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
      <svg class="logo" viewBox="0 0 300 108" role="img" aria-label="MonsterQuest">
        <defs>
          <linearGradient id="logo-monster" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.35" stop-color="#ffffff" />
            <stop offset="1" stop-color="#9ecdff" />
          </linearGradient>
          <linearGradient id="logo-quest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.3" stop-color="#ffe98a" />
            <stop offset="1" stop-color="#ff9e18" />
          </linearGradient>
        </defs>
        <path class="logo__rand" d="${LOGO_MONSTER}" />
        <path class="logo__rand" d="${LOGO_QUEST}" />
        <path class="logo__kontur" d="${LOGO_MONSTER}" />
        <path class="logo__kontur" d="${LOGO_QUEST}" />
        <path class="logo__fuellung" d="${LOGO_MONSTER}" fill="url(#logo-monster)" />
        <path class="logo__fuellung" d="${LOGO_QUEST}" fill="url(#logo-quest)" />
      </svg>
      <p class="logo__claim">Kleine Monster. Große Abenteuer.</p>
    `;
    screen.appendChild(content);

    const hero = document.createElement('div');
    hero.className = 'start__hero';
    hero.innerHTML = `
      <div class="hero-buehne">
        <span class="hero-schatten"></span>
        <div class="sprite sprite--large hero-atmen" id="hero-sprite"></div>
      </div>
      <p class="start__hero-name">Deine Figur: ${starter.name}</p>
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
    actions.appendChild(startButton);

    // Zweiter Spielmodus: die Endlos-Arena. Als eigener Knopf, damit er neben
    // dem Abenteuer klar sichtbar ist.
    const arenaButton = document.createElement('button');
    arenaButton.className = 'btn btn--arena';
    arenaButton.type = 'button';
    arenaButton.innerHTML = '🏟️&nbsp; Endlos-Arena';
    arenaButton.addEventListener('click', () => showScreen('arena'));
    actions.appendChild(arenaButton);

    const menu = document.createElement('div');
    menu.className = 'start__menu';
    MENU.forEach((entry) => {
      const button = document.createElement('button');
      button.className = 'icon-btn';
      button.type = 'button';
      button.innerHTML = `
        <span class="icon-btn__circle"></span>
        <span class="icon-btn__label">${entry.label}</span>
      `;

      const kreis = button.querySelector('.icon-btn__circle');
      if (entry.bild) {
        // Die Grafik bringt ihren eigenen runden Rahmen mit - der Knopf
        // zeichnet deshalb keinen zweiten (siehe .icon-btn__circle--bild).
        kreis.classList.add('icon-btn__circle--bild');
        const bild = document.createElement('img');
        bild.src = entry.bild;
        bild.alt = '';
        bild.draggable = false;
        kreis.appendChild(bild);
      } else {
        kreis.textContent = entry.icon;
      }
      button.addEventListener('click', () => showScreen(entry.screen));
      menu.appendChild(button);
    });
    actions.appendChild(menu);

    screen.appendChild(actions);
    root.appendChild(screen);

    // Leichter Tiefeneffekt beim Wischen. Wird beim Verlassen abgeschaltet.
    parallaxAus = parallaxAktivieren(screen);
  },

  unmount() {
    parallaxAus();
    parallaxAus = () => {};
  },
};
