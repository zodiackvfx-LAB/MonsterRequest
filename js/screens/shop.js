/**
 * Shop - in zwei Reitern, wie die Sammlung.
 *
 *   Truhen  Truhen kaufen und öffnen
 *   Studio  Hüte und Muster fürs Skin-Studio kaufen (js/data/studio-teile.js)
 *   Besitz  Münzen, Material, gefundene Attacken und Skins auf einen Blick
 *
 * Bezahlt wird nur mit Münzen aus Kämpfen. Geöffnet wird mit der großen
 * Animation aus js/ui/truhe-oeffnen.js.
 */

import { showScreen } from '../core/screens.js';
import { TRUHEN } from '../data/shop.js';
import { MUENZE, SELTENHEITEN } from '../data/items.js';
import { zeigeTruhenOeffnung } from '../ui/truhe-oeffnen.js';
import { siegeBisGratisTruhe } from '../core/belohnung.js';
import { truheSvg } from '../ui/truhen.js';
import { bezahlen, gameState, kannBezahlen } from '../core/state.js';
import { spieleKlang } from '../core/audio.js';
import { pruefeNeueErfolge, statistikSpeichern } from '../core/statistik.js';
import { zeigeErfolgToast } from '../ui/toast.js';
import { createScenery } from '../ui/scenery.js';
import { createHud, createTopbar } from '../ui/hud.js';
import { spritesNeuZeichnen } from '../ui/sprite.js';
import { STUDIO_TEILE } from '../data/studio-teile.js';
import { teilAnzeige, teilKaufen, teilPreis, teileZaehlen } from '../core/studio-teile.js';
import { besitztStudioTeil } from '../core/state.js';

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
      { id: 'studio', label: 'Studio', bauen: baueStudio },
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
          <strong>5 Beutestücke</strong>: einmal <strong>150 bis 500 Münzen</strong>,
          einmal Material und <strong>Fähigkeitskarten</strong> (ab und zu ein Skin, Hut oder Muster).
          Doppelte Karten leveln deine Karte hoch - bis Level 15.
          <br>🎁 <strong>Jeder 2. Sieg</strong> bringt eine Holztruhe gratis –
          noch ${siegeBisGratisTruhe()} Sieg${siegeBisGratisTruhe() === 1 ? '' : 'e'}.
        </p>
      `;
      content.appendChild(hinweis);

      TRUHEN.forEach((truhe) => {
        const karte = document.createElement('div');
        karte.className = 'chest-card';
        karte.innerHTML = `
          <div class="chest-card__icon">${truheSvg(truhe.design)}</div>
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
          zeigeTruhenOeffnung(screen, truhe, { fertig: nachDemOeffnen });
        });

        karte.appendChild(kaufen);
        content.appendChild(karte);
      });
    }

    /* ---------- Reiter 2: Studio-Teile ---------- */
    function baueStudio(content) {
      const { hat, alle } = teileZaehlen();
      const kopf = document.createElement('div');
      kopf.className = 'panel panel--tight';
      kopf.innerHTML = `
        <p class="map__info-text">
          Hüte und Muster für dein eigenes Outfit im <strong>Skin-Studio</strong>.
          Farben sind dort immer kostenlos. Alles hier gibt es auch aus Truhen.
          <br>Freigeschaltet: <strong>${hat} von ${alle}</strong>
        </p>
        <a class="btn btn--small studio-shop__link" href="werkstatt.html">🎨 Zum Skin-Studio</a>
      `;
      content.appendChild(kopf);

      [['hut', '🎩 Hüte'], ['muster', '🧵 Muster']].forEach(([art, titel]) => {
        const block = document.createElement('div');
        block.className = 'panel';
        block.innerHTML = `<div class="panel__title">${titel}</div><div class="studio-shop"></div>`;
        const gitter = block.querySelector('.studio-shop');
        STUDIO_TEILE.filter((t) => t.art === art).forEach((teil) => {
          const { name, icon } = teilAnzeige(teil);
          const seltenheit = SELTENHEITEN[teil.seltenheit];
          const hatEs = besitztStudioTeil(teil.id);
          const preis = teilPreis(teil);
          const feld = document.createElement('div');
          feld.className = `studio-teil${hatEs ? ' is-owned' : ''}`;
          feld.style.setProperty('--rarity', seltenheit.farbe);
          feld.innerHTML = `
            <span class="studio-teil__icon">${icon}</span>
            <span class="studio-teil__name">${name}</span>
            <span class="studio-teil__rarity">${seltenheit.name}</span>
          `;
          if (hatEs) {
            feld.insertAdjacentHTML('beforeend', '<span class="studio-teil__hat">✓ Freigeschaltet</span>');
          } else {
            const knopf = document.createElement('button');
            knopf.type = 'button';
            knopf.className = 'btn btn--small studio-teil__kaufen';
            knopf.innerHTML = `${MUENZE} ${preis}`;
            knopf.disabled = !kannBezahlen(preis);
            knopf.addEventListener('click', () => {
              if (!teilKaufen(teil.id).ok) {
                spieleKlang('gesperrt');
                return;
              }
              spieleKlang('kauf');
              zeichne();
            });
            feld.appendChild(knopf);
          }
          gitter.appendChild(feld);
        });
        content.appendChild(block);
      });
    }

    /* ---------- Reiter 3: Besitz ---------- */
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
        <div class="stat-row">
          <span class="stat-row__label">Hüte und Muster</span>
          <span class="stat-row__value">${teileZaehlen().hat} / ${teileZaehlen().alle}</span>
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

/** Nach dem Öffnen: Skins neu zeichnen, Erfolge prüfen, Shop neu zeigen. */
function nachDemOeffnen() {
  // Ein Skin kann das Aussehen ändern - die gezeichneten Figuren neu bauen.
  spritesNeuZeichnen();
  // Neue Attacken/Skins können einen Sammel-Erfolg auslösen.
  const neueErfolge = pruefeNeueErfolge();
  if (neueErfolge.length) {
    statistikSpeichern();
    zeigeErfolgToast(neueErfolge);
  }
  showScreen('shop');
}
