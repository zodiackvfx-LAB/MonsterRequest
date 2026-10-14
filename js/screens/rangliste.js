/**
 * Trophäen und Rangliste.
 *
 * Oben steht die eigene Liga mit dem Weg zur nächsten, darunter alle Ligen
 * und die Rangliste aller Spieler aus der Datenbank. Erreichbar über die
 * Trophäen in der Spielerleiste.
 *
 * Ohne Datenbank (oder ohne Netz) gibt es Liga und Trophäen trotzdem - nur
 * die Liste der anderen Spieler fehlt dann.
 */

import { showScreen } from '../core/screens.js';
import { createScenery } from '../ui/scenery.js';
import { balkenFuellen, createTopbar } from '../ui/hud.js';
import { gameState } from '../core/state.js';
import { cloudAktiv, cloudRangliste } from '../core/cloud.js';
import { LIGEN, TROPHAEEN, ligaVon, naechsteLiga } from '../data/trophaeen.js';
import { WORLDS } from '../data/worlds.js';

/** Wie viele Plätze die Liste zeigt. */
const ANZAHL = 50;

/** Name sicher ins HTML setzen - er kommt von anderen Spielern. */
function sicher(text) {
  return String(text).replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[z]);
}

/** Das runde Liga-Abzeichen. */
function abzeichen(liga, gross = false) {
  return `<span class="liga-abzeichen${gross ? ' liga-abzeichen--gross' : ''}" style="--liga-farbe:${liga.farbe}" aria-hidden="true">${liga.icon}</span>`;
}

export const ranglisteScreen = {
  mount(root) {
    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Rangliste', () => showScreen('start')));

    const content = document.createElement('div');
    content.className = 'page__content';
    screen.appendChild(content);

    content.appendChild(meineLiga());
    content.appendChild(ligenLeiste());
    const liste = document.createElement('div');
    liste.className = 'panel rangliste';
    content.appendChild(liste);
    root.appendChild(screen);

    listeLaden(liste);
  },
};

/** Eigene Liga, Trophäen und der Weg zur nächsten Liga. */
function meineLiga() {
  const t = gameState.trophaeen;
  const liga = ligaVon(t);
  const naechste = naechsteLiga(t);

  const block = document.createElement('div');
  block.className = 'panel meine-liga';
  block.style.setProperty('--liga-farbe', liga.farbe);
  block.innerHTML = `
    ${abzeichen(liga, true)}
    <div class="meine-liga__text">
      <span class="meine-liga__name">${liga.name}</span>
      <span class="meine-liga__zahl">🏆 ${t}</span>
      ${naechste
        ? `<span class="meine-liga__balken"><span class="meine-liga__fuellung"></span></span>
           <span class="meine-liga__ziel">Noch ${naechste.ab - t} bis zur ${naechste.name} ${naechste.icon}</span>`
        : '<span class="meine-liga__ziel">Höchste Liga erreicht!</span>'}
      <span class="meine-liga__rekord">Rekord: ${gameState.trophaeenRekord}</span>
    </div>
  `;
  if (naechste) {
    balkenFuellen(block.querySelector('.meine-liga__fuellung'), (t - liga.ab) / (naechste.ab - liga.ab));
  }
  return block;
}

/** Alle Ligen nebeneinander - die eigene hervorgehoben. */
function ligenLeiste() {
  const eigene = ligaVon(gameState.trophaeen);
  const block = document.createElement('div');
  block.className = 'panel panel--tight';
  block.innerHTML = `
    <div class="panel__title">Ligen</div>
    <div class="ligen-leiste">
      ${LIGEN.map((liga) => `
        <span class="ligen-leiste__liga${liga.id === eigene.id ? ' is-eigene' : ''}${liga.ab > gameState.trophaeen ? ' is-offen' : ''}">
          ${abzeichen(liga)}
          <span class="ligen-leiste__ab">${liga.ab}</span>
        </span>`).join('')}
    </div>
    <p class="map__info-text ligen-leiste__regel">
      Sieg: bis zu ${TROPHAEEN.GRUND + TROPHAEEN.JE_WELT * WORLDS.length} 🏆 beim ersten Mal (Boss doppelt),
      ${TROPHAEEN.WIEDERHOLUNG} beim Wiederholen. Niederlage: −${TROPHAEEN.NIEDERLAGE} -
      aber nie unter die Grenze deiner Liga.
    </p>
  `;
  return block;
}

/** Lädt die Rangliste aus der Datenbank und zeigt sie an. */
async function listeLaden(behaelter) {
  const titel = '<div class="panel__title">Alle Spieler</div>';

  if (!cloudAktiv()) {
    behaelter.innerHTML = `${titel}<p class="map__info-text">Die Rangliste braucht die Datenbank. Sie ist in diesem Spiel nicht eingerichtet.</p>`;
    return;
  }

  behaelter.innerHTML = `${titel}<p class="map__info-text rangliste__laedt">Lädt …</p>`;
  let daten;
  try {
    daten = await cloudRangliste(ANZAHL);
  } catch (fehler) {
    console.warn('Rangliste konnte nicht geladen werden:', fehler);
    if (!behaelter.isConnected) return;
    const fehlt = fehler?.status === 404;
    behaelter.innerHTML = `${titel}
      <p class="map__info-text">${fehlt
        ? 'Die Rangliste ist in der Datenbank noch nicht eingerichtet. (Für den Spielebauer: datenbank/schema.sql einmal neu einspielen.)'
        : 'Die Rangliste ist gerade nicht erreichbar. Bist du online?'}</p>
      ${fehlt ? '' : '<button class="btn btn--small" type="button" data-aktion="nochmal">Nochmal versuchen</button>'}`;
    behaelter.querySelector('[data-aktion="nochmal"]')?.addEventListener('click', () => listeLaden(behaelter));
    return;
  }
  if (!behaelter.isConnected) return;

  const versteckt = gameState.settings.rangliste === false;
  const zeilen = daten.spitze.map((e) => zeile(e.platz, e.name, e.trophaeen, e.ich)).join('');
  // Steht man selbst nicht unter den ersten 50, kommt die eigene Zeile darunter.
  const eigeneUnten = daten.ich && !daten.spitze.some((e) => e.ich)
    ? `<li class="rangliste__luecke" aria-hidden="true">⋯</li>${zeile(daten.ich.platz, gameState.name || 'Spieler', daten.ich.trophaeen, true)}`
    : '';

  behaelter.innerHTML = `
    ${titel}
    ${zeilen
      ? `<ol class="rangliste__liste">${zeilen}${eigeneUnten}</ol>`
      : '<p class="map__info-text">Noch niemand hat Trophäen. Gewinne einen Kampf und sei die Nummer 1!</p>'}
    <p class="map__info-text rangliste__fuss">
      ${versteckt
        ? 'Du bist ausgeblendet. Einschalten unter Optionen → „In der Rangliste zeigen“.'
        : daten.ich
          ? `Dein Platz: <strong>${daten.ich.platz}</strong> von ${daten.spieler}`
          : 'Gewinne einen Kampf, dann stehst du auch hier.'}
    </p>
  `;
}

/** Eine Zeile der Rangliste. Die ersten drei leuchten in Gold, Silber, Bronze. */
function zeile(platz, name, trophaeen, ich) {
  return `
    <li class="rangliste__zeile${ich ? ' is-ich' : ''}${platz <= 3 ? ` is-platz-${platz}` : ''}">
      <span class="rangliste__platz">${platz}</span>
      ${abzeichen(ligaVon(trophaeen))}
      <span class="rangliste__name">${sicher(name)}${ich ? ' <small>(du)</small>' : ''}</span>
      <span class="rangliste__trophaeen">🏆 ${trophaeen}</span>
    </li>
  `;
}
