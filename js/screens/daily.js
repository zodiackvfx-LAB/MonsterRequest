/**
 * Tägliche Aufgaben.
 *
 * Zeigt die drei Aufgaben des Tages mit Fortschrittsbalken. Ist eine
 * geschafft, lässt sich die Belohnung abholen. Um Mitternacht gibt es
 * neue Aufgaben (siehe js/core/aufgaben.js).
 */

import { showScreen } from '../core/screens.js';
import { createScenery } from '../ui/scenery.js';
import { balkenFuellen, createTopbar } from '../ui/hud.js';
import { gameState } from '../core/state.js';
import { aufgabeAbholen, getTagesAufgaben } from '../core/aufgaben.js';
import { spieleKlang } from '../core/audio.js';
import { MUENZE } from '../data/items.js';

export const dailyScreen = {
  mount(root) {
    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Tagesaufgaben', () => showScreen('start')));

    const content = document.createElement('div');
    content.className = 'page__content';
    screen.appendChild(content);

    function zeichnen() {
      content.innerHTML = '';
      const aufgaben = getTagesAufgaben();
      const fertig = aufgaben.filter((e) => e.fertig).length;

      const kopf = document.createElement('div');
      kopf.className = 'panel panel--tight';
      kopf.innerHTML = `
        <p class="map__info-text">
          Geschafft: <strong>${fertig} von ${aufgaben.length}</strong>.
          Morgen gibt es neue Aufgaben.
        </p>
        <p class="map__info-text">${MUENZE} ${gameState.coins} · 💠 ${gameState.materials}</p>
      `;
      content.appendChild(kopf);

      const liste = document.createElement('div');
      liste.className = 'panel';
      liste.innerHTML = '<div class="panel__title">Heute</div>';

      aufgaben.forEach(({ aufgabe, stand, fertig: erledigt, abgeholt }) => {
        liste.appendChild(aufgabenZeile(aufgabe, stand, erledigt, abgeholt, zeichnen));
      });

      content.appendChild(liste);
    }

    zeichnen();
    root.appendChild(screen);
  },
};

/** Eine Aufgabenzeile mit Balken und Abhol-Knopf. */
function aufgabenZeile(aufgabe, stand, erledigt, abgeholt, neuZeichnen) {
  const zeile = document.createElement('div');
  zeile.className = `aufgabe${abgeholt ? ' is-done' : ''}`;
  zeile.innerHTML = `
    <span class="aufgabe__icon">${abgeholt ? '✅' : aufgabe.icon}</span>
    <span class="aufgabe__body">
      <span class="aufgabe__name">${aufgabe.name}</span>
      <span class="aufgabe__text">${aufgabe.text}</span>
      <span class="bar bar--schmal"><span class="bar__fill"></span></span>
      <span class="aufgabe__stand">${stand} / ${aufgabe.ziel}</span>
    </span>
  `;

  balkenFuellen(zeile.querySelector('.bar__fill'), stand / aufgabe.ziel);

  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'btn btn--small aufgabe__lohn';

  if (abgeholt) {
    knopf.classList.add('btn--ghost');
    knopf.disabled = true;
    knopf.textContent = 'Geholt';
  } else if (erledigt) {
    knopf.classList.add('btn--green');
    knopf.innerHTML = `${MUENZE}&nbsp;${aufgabe.muenzen}<br>💠&nbsp;${aufgabe.material}`;
    // data-klang="keiner": der eigene Abhol-Klang statt des Knopfklangs
    knopf.dataset.klang = 'keiner';
    knopf.addEventListener('click', () => {
      if (aufgabeAbholen(aufgabe.id)) spieleKlang('aufgabe');
      neuZeichnen();
    });
  } else {
    knopf.classList.add('btn--ghost');
    knopf.disabled = true;
    knopf.innerHTML = `${MUENZE}&nbsp;${aufgabe.muenzen}<br>💠&nbsp;${aufgabe.material}`;
  }

  zeile.appendChild(knopf);
  return zeile;
}
