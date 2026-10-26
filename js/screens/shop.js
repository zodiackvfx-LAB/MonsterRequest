/**
 * Shop - in drei Reitern, wie die Sammlung. Hinter allem liegt ein
 * Nachtmarkt (js/ui/shop-deko.js), gestaltet in css/shop.css.
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
import { REITER_ICONS, shopKulisse, shopTitel, sockelSvg, zierEcken } from '../ui/shop-deko.js';
import { createHud, createTopbar } from '../ui/hud.js';
import { spritesNeuZeichnen } from '../ui/sprite.js';
import { STUDIO_TEILE } from '../data/studio-teile.js';
import { teilAnzeige, teilKaufen, teilPreis, teileZaehlen } from '../core/studio-teile.js';
import { besitztStudioTeil } from '../core/state.js';

export const shopScreen = {
  mount(root, params = {}) {
    const screen = document.createElement('div');
    screen.className = 'screen screen--page screen--shop';
    screen.appendChild(shopKulisse());
    screen.appendChild(createTopbar(shopTitel('Shop'), () => showScreen('start')));
    screen.appendChild(createHud());

    const reiterLeiste = document.createElement('div');
    reiterLeiste.className = 'tabs tabs--shop';
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
        knopf.innerHTML = `<span class="tab__icon">${REITER_ICONS[reiter.id]()}</span><span>${reiter.label}</span>`;
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
      hinweis.className = 'shop-info';
      hinweis.innerHTML = `
        <span class="shop-info__i" aria-hidden="true">i</span>
        <p class="shop-info__text">
          Münzen verdienst du in Kämpfen. Jede Truhe enthält
          <strong>5 Beutestücke</strong>: einmal <strong>150 bis 500 Münzen</strong>,
          einmal Material und <strong>Fähigkeitskarten</strong> (ab und zu ein Skin, Hut oder Muster).
          Doppelte Karten leveln deine Karte hoch - bis Level 15.
          <br>🎁 <strong>Jeder 2. Sieg</strong> bringt eine Holztruhe gratis –
          noch ${siegeBisGratisTruhe()} Sieg${siegeBisGratisTruhe() === 1 ? '' : 'e'}.
        </p>
        ${zierEcken()}
      `;
      content.appendChild(hinweis);

      TRUHEN.forEach((truhe) => {
        const karte = document.createElement('div');
        karte.className = `chest-card chest-card--${truhe.design}`;
        karte.innerHTML = `
          <div class="chest-card__buehne">
            <span class="chest-card__strahlen" aria-hidden="true"></span>
            ${sockelSvg()}
            <div class="chest-card__icon">${truheSvg(truhe.design)}</div>
          </div>
          <div class="chest-card__body">
            <div class="chest-card__name">${truhe.name}</div>
            <div class="chest-card__text">${truhe.text}</div>
            <div class="chest-card__odds">${chancenText(truhe)}</div>
          </div>
          ${zierEcken()}
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
      kopf.className = 'shop-info shop-info--studio';
      kopf.innerHTML = `
        <span class="shop-info__i" aria-hidden="true">i</span>
        <p class="shop-info__text">
          Hüte und Muster für dein eigenes Outfit im <strong>Skin-Studio</strong>.
          Farben sind dort immer kostenlos. Alles hier gibt es auch aus Truhen.
          <br>Freigeschaltet: <strong>${hat} von ${alle}</strong>
        </p>
        <a class="btn btn--small studio-shop__link" href="werkstatt.html">🎨 Zum Skin-Studio</a>
        ${zierEcken()}
      `;
      content.appendChild(kopf);

      [['hut', '🎩 Hüte'], ['muster', '🧵 Muster']].forEach(([art, titel]) => {
        const block = document.createElement('div');
        block.className = 'shop-rahmen';
        block.innerHTML = `<div class="shop-rahmen__titel">${titel}</div><div class="studio-shop"></div>${zierEcken()}`;
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
      const { hat, alle } = teileZaehlen();
      const KACHELN = [
        { icon: MUENZE, wert: gameState.coins, name: 'Münzen', farbe: '#ffc53d' },
        { icon: '💠', wert: gameState.materials, name: 'Material', farbe: '#5ecbff' },
        { icon: '🃏', wert: gameState.ownedAttacks.length, name: 'Attacken aus Truhen', farbe: '#c07bff' },
        { icon: '👕', wert: gameState.ownedSkins.length, name: 'Skins', farbe: '#7ee06a' },
        { icon: '🎩', wert: `${hat} / ${alle}`, name: 'Hüte und Muster', farbe: '#ff8ad8' },
      ];
      const besitz = document.createElement('div');
      besitz.className = 'shop-rahmen';
      besitz.innerHTML = `
        <div class="shop-rahmen__titel">🎒 Dein Besitz</div>
        <div class="besitz">
          ${KACHELN.map((k) => `
            <div class="besitz__kachel" style="--farbe:${k.farbe}">
              <span class="besitz__icon">${k.icon}</span>
              <span class="besitz__wert">${k.wert}</span>
              <span class="besitz__name">${k.name}</span>
            </div>`).join('')}
        </div>
        ${zierEcken()}
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
    ? ` · <strong style="color:${SELTENHEITEN[truhe.garantie].farbe}">garantiert ${SELTENHEITEN[truhe.garantie].name}</strong>`
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
