/**
 * Shop - in zwei Reitern, wie die Sammlung.
 *
 *   Truhen  Truhen kaufen und öffnen
 *   Besitz  Münzen, Material, gefundene Attacken und Skins auf einen Blick
 *
 * Bezahlt wird nur mit Münzen aus Kämpfen. Beim Öffnen erscheinen genau
 * fünf Beutestücke, die nacheinander aufgedeckt werden.
 */

import { showScreen } from '../core/screens.js';
import { TRUHEN } from '../data/shop.js';
import { MUENZE, SELTENHEITEN } from '../data/items.js';
import { truheOeffnen } from '../core/loot.js';
import { bezahlen, beuteGutschreiben, gameState, kannBezahlen } from '../core/state.js';
import { fortschrittMelden } from '../core/aufgaben.js';
import { spieleBeute, spieleKlang } from '../core/audio.js';
import { pruefeNeueErfolge, statistikSpeichern } from '../core/statistik.js';
import { zeigeErfolgToast } from '../ui/toast.js';
import { createScenery } from '../ui/scenery.js';
import { createHud, createTopbar } from '../ui/hud.js';
import { spritesNeuZeichnen } from '../ui/sprite.js';

/** Wie lange zwischen zwei aufgedeckten Stücken gewartet wird. */
const AUFDECK_TAKT = 520;

export const shopScreen = {
  mount(root, params = {}) {
    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Shop', () => showScreen('start')));
    screen.appendChild(createHud());

    const reiterLeiste = document.createElement('div');
    reiterLeiste.className = 'tabs';
    screen.appendChild(reiterLeiste);

    const content = document.createElement('div');
    content.className = 'page__content';
    screen.appendChild(content);
    root.appendChild(screen);

    const REITER = [
      { id: 'truhen', label: 'Truhen', bauen: baueTruhen },
      { id: 'besitz', label: 'Besitz', bauen: baueBesitz },
    ];
    let aktiv = REITER.some((r) => r.id === params.tab) ? params.tab : 'truhen';

    function zeichne() {
      reiterLeiste.innerHTML = '';
      REITER.forEach((reiter) => {
        const knopf = document.createElement('button');
        knopf.className = `tab${reiter.id === aktiv ? ' is-active' : ''}`;
        knopf.type = 'button';
        knopf.textContent = reiter.label;
        knopf.addEventListener('click', () => {
          if (aktiv === reiter.id) return;
          aktiv = reiter.id;
          zeichne();
        });
        reiterLeiste.appendChild(knopf);
      });

      content.innerHTML = '';
      REITER.find((reiter) => reiter.id === aktiv).bauen(content);
      content.scrollTop = 0;
    }

    zeichne();

    /* ---------- Reiter 1: Truhen ---------- */
    function baueTruhen(content) {
      const hinweis = document.createElement('div');
      hinweis.className = 'panel panel--tight';
      hinweis.innerHTML = `
        <p class="map__info-text">
          Münzen verdienst du in Kämpfen. Jede Truhe enthält
          <strong>5 Beutestücke</strong>: Münzen, Material, Attacken oder Skins.
          Was du schon besitzt, wird in Münzen umgewandelt.
        </p>
      `;
      content.appendChild(hinweis);

      TRUHEN.forEach((truhe) => {
        const karte = document.createElement('div');
        karte.className = 'chest-card';
        karte.innerHTML = `
          <div class="chest-card__icon">${truhe.icon}</div>
          <div class="chest-card__body">
            <div class="chest-card__name">${truhe.name}</div>
            <div class="chest-card__text">${truhe.text}</div>
            <div class="chest-card__odds">${chancenText(truhe)}</div>
          </div>
        `;

        const kaufen = document.createElement('button');
        kaufen.className = 'btn btn--small chest-card__buy';
        kaufen.type = 'button';
        kaufen.innerHTML = `${MUENZE} ${truhe.preis}`;
        kaufen.disabled = !kannBezahlen(truhe.preis);
        kaufen.addEventListener('click', () => {
          if (!bezahlen(truhe.preis)) {
            spieleKlang('gesperrt');
            return;
          }
          oeffnungZeigen(screen, truhe);
        });

        karte.appendChild(kaufen);
        content.appendChild(karte);
      });
    }

    /* ---------- Reiter 2: Besitz ---------- */
    function baueBesitz(content) {
      const besitz = document.createElement('div');
      besitz.className = 'panel';
      besitz.innerHTML = `
        <div class="panel__title">Dein Besitz</div>
        <div class="stat-row">
          <span class="stat-row__label">Münzen</span>
          <span class="stat-row__value">${MUENZE} ${gameState.coins}</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">Material</span>
          <span class="stat-row__value">💠 ${gameState.materials}</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">Attacken aus Truhen</span>
          <span class="stat-row__value">${gameState.ownedAttacks.length}</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">Skins</span>
          <span class="stat-row__value">${gameState.ownedSkins.length}</span>
        </div>
      `;
      content.appendChild(besitz);
    }
  },
};

/** Kurztext mit den Chancen einer Truhe. */
function chancenText(truhe) {
  const teile = Object.entries(truhe.chancen)
    .filter(([, chance]) => chance > 0)
    .map(([id, chance]) => {
      const seltenheit = SELTENHEITEN[id];
      return `<span style="color:${seltenheit.farbe}">${seltenheit.name} ${chance}%</span>`;
    });
  const garantie = truhe.garantie
    ? ` · garantiert ${SELTENHEITEN[truhe.garantie].name}`
    : '';
  return teile.join(' · ') + garantie;
}

/* ------------------------------------------------------------------ */
/*  Die Öffnungs-Animation                                             */
/* ------------------------------------------------------------------ */

/**
 * Zeigt das Öffnen einer Truhe:
 *   1. Die Truhe erscheint und wackelt
 *   2. Sie springt auf
 *   3. Die fünf Stücke werden nacheinander aufgedeckt
 *   4. Danach sieht man alles auf einen Blick
 */
function oeffnungZeigen(screen, truhe) {
  const stuecke = truheOeffnen(truhe);
  const timer = [];

  // Zaehlt fuer die Tagesaufgabe "Schatzsucher".
  fortschrittMelden('truhe');

  const overlay = document.createElement('div');
  overlay.className = 'overlay overlay--chest';
  overlay.innerHTML = `
    <div class="chest-open">
      <div class="chest-open__chest" id="chest">${truhe.icon}</div>
      <div class="chest-open__title" id="chest-title">${truhe.name} wird geöffnet…</div>
      <div class="loot-grid" id="loot"></div>
      <button class="btn btn--big btn--green chest-open__done" id="btn-done" type="button" hidden>
        Alles einsammeln
      </button>
    </div>
  `;
  screen.appendChild(overlay);

  const chest = overlay.querySelector('#chest');
  const titel = overlay.querySelector('#chest-title');
  const gitter = overlay.querySelector('#loot');
  const fertig = overlay.querySelector('#btn-done');

  // Platzhalter für die fünf Stücke - damit die Fläche nicht springt.
  stuecke.forEach(() => {
    const feld = document.createElement('div');
    feld.className = 'loot-item is-hidden';
    feld.innerHTML = '<span class="loot-item__icon">?</span>';
    gitter.appendChild(feld);
  });

  chest.classList.add('is-shaking');

  timer.push(
    setTimeout(() => {
      chest.classList.remove('is-shaking');
      chest.classList.add('is-open');
      titel.textContent = 'Du erhältst:';
      spieleKlang('truhe');
      stuecke.forEach((stueck, index) => {
        timer.push(setTimeout(() => aufdecken(gitter, stueck, index), index * AUFDECK_TAKT));
      });
      timer.push(
        setTimeout(() => {
          fertig.hidden = false;
        }, stuecke.length * AUFDECK_TAKT)
      );
    }, 850)
  );

  fertig.addEventListener('click', () => {
    timer.forEach(clearTimeout);
    // Ein Skin kann das Aussehen ändern - die gezeichneten Figuren neu bauen.
    spritesNeuZeichnen();
    overlay.remove();
    // Neue Attacken/Skins können einen Sammel-Erfolg auslösen.
    const neueErfolge = pruefeNeueErfolge();
    if (neueErfolge.length) {
      statistikSpeichern();
      zeigeErfolgToast(neueErfolge);
    }
    showScreen('shop');
  });
}

/** Deckt ein einzelnes Beutestück auf und schreibt es gut. */
function aufdecken(gitter, stueck, index) {
  beuteGutschreiben(stueck);
  // Seltene Stuecke klingen hoerbar wertvoller.
  spieleBeute(stueck.seltenheit);

  const seltenheit = SELTENHEITEN[stueck.seltenheit];
  const feld = gitter.children[index];
  feld.className = `loot-item is-${stueck.seltenheit}`;
  feld.style.setProperty('--rarity', seltenheit.farbe);
  feld.innerHTML = `
    <span class="loot-item__icon">${stueck.icon}</span>
    <span class="loot-item__name">${stueck.name}</span>
    <span class="loot-item__rarity">${seltenheit.name}</span>
  `;
}
