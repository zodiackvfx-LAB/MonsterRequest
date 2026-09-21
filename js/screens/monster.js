/**
 * Figur-Bildschirm - in vier Reitern, wie die Sammlung.
 *
 *   Werte      Steckbrief (Bild, Level, Erfahrung) und die Kampfwerte
 *   Aufwerten  Lebenspunkte, Angriff usw. mit Münzen und Material stärken
 *   Aussehen   die Skins der Figur
 *   Kräfte     die getragene Boss-Kraft wählen
 *
 * Wichtig für das Verständnis: Es gibt zwei getrennte Systeme.
 *   1. Das Charakter-LEVEL steigt durch Erfahrung aus Kämpfen.
 *   2. Die AUFWERTUNGEN kauft man einzeln mit Münzen und Material.
 * Beide zusammen ergeben die Kampfwerte (siehe js/core/progression.js).
 */

import { showScreen } from '../core/screens.js';
import { getMonster, SPIELER_FIGUREN } from '../data/monsters.js';
import { getAttack } from '../data/attacks.js';
import { MUENZE, SELTENHEITEN, SKINS } from '../data/items.js';
import { BOSS_KRAEFTE } from '../data/kraefte.js';
import { getWorld } from '../data/worlds.js';
import { createScenery } from '../ui/scenery.js';
import { createHud, createTopbar } from '../ui/hud.js';
import { createSprite, spritesNeuZeichnen } from '../ui/sprite.js';
import { spieleKlang } from '../core/audio.js';
import {
  besitztKraft,
  besitztSkin,
  figurFrei,
  gameState,
  getAktiveFigur,
  getAktiverSkin,
  getDeck,
  setAktiveFigur,
  setAktiverSkin,
  setBossKraft,
} from '../core/state.js';
import {
  MAX_STUFE,
  WERTE,
  aufwertungsKosten,
  charakterWerte,
  getCharakter,
  wertAufwerten,
  xpFuerNaechstesLevel,
} from '../core/progression.js';

export const monsterScreen = {
  mount(root, params = {}) {
    // Die gerade gewählte Figur. Wechselt man sie, wird der Bildschirm neu
    // aufgebaut (showScreen), damit auch Kopfzeile und Auswahl frisch sind.
    const monster = getMonster(getAktiveFigur());

    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Deine Figur', () => showScreen('start')));
    screen.appendChild(createHud());

    // Figur-Auswahl: nur zeigen, wenn es mehr als eine Figur gibt.
    if (SPIELER_FIGUREN.length > 1) {
      screen.appendChild(baueFigurWahl());
    }

    const reiterLeiste = document.createElement('div');
    reiterLeiste.className = 'tabs';
    screen.appendChild(reiterLeiste);

    const content = document.createElement('div');
    content.className = 'page__content';
    screen.appendChild(content);
    root.appendChild(screen);

    const REITER = [
      { id: 'werte', label: 'Werte', bauen: baueWerte },
      { id: 'aufwerten', label: 'Aufwerten', bauen: baueAufwerten },
      { id: 'aussehen', label: 'Aussehen', bauen: baueAussehen },
      { id: 'kraefte', label: 'Kräfte', bauen: baueKraefte },
    ];
    let aktiv = REITER.some((r) => r.id === params.tab) ? params.tab : 'werte';

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

    /* ------------------------------------------------------------------ */
    /*  Figur-Auswahl (über den Reitern)                                   */
    /* ------------------------------------------------------------------ */

    function baueFigurWahl() {
      const wahl = document.createElement('div');
      wahl.className = 'figur-wahl';

      SPIELER_FIGUREN.forEach((id) => {
        const m = getMonster(id);
        const frei = figurFrei(id);
        const istAktiv = monster.id === id;

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `figur-chip${istAktiv ? ' is-active' : ''}${frei ? '' : ' is-locked'}`;
        chip.disabled = istAktiv || !frei;
        chip.innerHTML = `
          <span class="figur-chip__sprite"></span>
          <span class="figur-chip__text">
            <span class="figur-chip__name">${frei ? m.name : '🔒 ' + m.name}</span>
            <span class="figur-chip__hint">${frei ? (istAktiv ? '✓ Aktiv' : 'Wählen') : freischaltHinweis(m)}</span>
          </span>
        `;
        chip.querySelector('.figur-chip__sprite').appendChild(createSprite(m));

        if (frei && !istAktiv) {
          chip.addEventListener('click', () => {
            setAktiveFigur(id);
            // Ganzen Bildschirm neu bauen (Kopfzeile, Auswahl, Werte) - Reiter merken.
            showScreen('monster', { tab: aktiv });
          });
        }
        wahl.appendChild(chip);
      });

      return wahl;
    }

    /** Kurzer Hinweis, wie eine gesperrte Figur freigeschaltet wird. */
    function freischaltHinweis(m) {
      const welt = m.freischaltLevel ? m.freischaltLevel.split('-')[0] : '';
      return welt ? `Boss von Welt ${welt} besiegen` : 'Noch gesperrt';
    }

    /* ------------------------------------------------------------------ */
    /*  Reiter 1: Werte                                                    */
    /* ------------------------------------------------------------------ */

    function baueWerte(content) {
      const charakter = getCharakter(monster.id);
      const werte = charakterWerte(monster);
      const deck = getDeck(monster).map(getAttack);
      const staerkste = deck.reduce((best, a) => (a.damage > best.damage ? a : best));
      const xpNoetig = xpFuerNaechstesLevel(charakter.level);
      const xpAnteil = xpNoetig === Infinity ? 1 : charakter.xp / xpNoetig;

      /* ---------- Steckbrief ---------- */
      const kopf = document.createElement('div');
      kopf.className = 'panel monster-head';
      kopf.innerHTML = `
        <div class="sprite sprite--large idle-bob" id="monster-sprite"></div>
        <div class="monster-head__name">${monster.name}</div>
        <div class="start__hero-name">${monster.element} · Level ${werte.level}</div>
        <p class="map__info-text">${monster.text}</p>
        <div class="wert-leiste" style="width:100%">
          <div class="wert-leiste__kopf">
            <span class="wert-leiste__titel">ERFAHRUNG</span>
            <span class="wert-leiste__wert">${
              xpNoetig === Infinity ? 'Höchstlevel' : `${charakter.xp} / ${xpNoetig}`
            }</span>
          </div>
          <div class="bar"><div class="bar__fill" style="--fuellung:${Math.min(1, xpAnteil)}"></div></div>
        </div>
      `;
      kopf.querySelector('#monster-sprite').appendChild(createSprite(monster));
      content.appendChild(kopf);

      /* ---------- Kampfwerte ---------- */
      const werteBlock = document.createElement('div');
      werteBlock.className = 'panel';
      werteBlock.innerHTML = `
        <div class="panel__title">Kampfwerte</div>
        ${zeile('❤️ Lebenspunkte', werte.maxHp)}
        ${zeile('⚔️ Angriff', `${Math.round(werte.damageFactor * 100)} %`)}
        ${zeile('🛡️ Verteidigung', `${Math.round(werte.defense * 100)} % weniger Schaden`)}
        ${zeile('⚡ Tempo', `${werte.energieProSekunde.toFixed(2)} Energie pro Sekunde`)}
        ${zeile('🃏 Stärkste Attacke', `${staerkste.icon} ${staerkste.name}`)}
      `;
      content.appendChild(werteBlock);

      const deckKnopf = document.createElement('button');
      deckKnopf.className = 'btn btn--ghost';
      deckKnopf.type = 'button';
      deckKnopf.textContent = 'Deck und Attacken';
      deckKnopf.addEventListener('click', () => showScreen('deck'));
      content.appendChild(deckKnopf);
    }

    /* ------------------------------------------------------------------ */
    /*  Reiter 2: Aufwerten                                                */
    /* ------------------------------------------------------------------ */

    function baueAufwerten(content) {
      const charakter = getCharakter(monster.id);

      const upgrade = document.createElement('div');
      upgrade.className = 'panel';
      upgrade.innerHTML = `
        <div class="panel__title">
          Aufwertungen
          <span class="panel__count">${MUENZE} ${gameState.coins} · 💠 ${gameState.materials}</span>
        </div>
      `;

      Object.entries(WERTE).forEach(([schluessel, wert]) => {
        const stufe = charakter.upgrades[schluessel] ?? 0;
        const voll = stufe >= MAX_STUFE;
        const kosten = aufwertungsKosten(stufe);
        const bezahlbar =
          !voll && gameState.coins >= kosten.muenzen && gameState.materials >= kosten.material;

        const reihe = document.createElement('div');
        reihe.className = 'upgrade-row';
        reihe.innerHTML = `
          <span class="upgrade-row__label">
            <span class="upgrade-row__name">${wert.icon} ${wert.name}</span>
            <span class="upgrade-row__hint">
              Stufe ${stufe} / ${MAX_STUFE}
              ${voll ? '' : `· nächste: +${wert.proStufe} ${wert.einheit}`}
            </span>
          </span>
        `;

        const knopf = document.createElement('button');
        knopf.type = 'button';
        knopf.className = `btn btn--small${bezahlbar ? '' : ' btn--ghost'}`;
        knopf.disabled = voll || !bezahlbar;
        knopf.innerHTML = voll
          ? 'Maximum'
          : `${MUENZE} ${kosten.muenzen}<br><span class="upgrade-row__mat">💠 ${kosten.material}</span>`;
        knopf.addEventListener('click', () => {
          if (wertAufwerten(monster.id, schluessel)) {
            spieleKlang('kauf');
            zeichne();
          } else {
            spieleKlang('gesperrt');
          }
        });

        reihe.appendChild(knopf);
        upgrade.appendChild(reihe);
      });

      content.appendChild(upgrade);
    }

    /* ------------------------------------------------------------------ */
    /*  Reiter 3: Aussehen (Skins)                                         */
    /* ------------------------------------------------------------------ */

    function baueAussehen(content) {
      const skinBlock = document.createElement('div');
      skinBlock.className = 'panel';
      skinBlock.innerHTML = '<div class="panel__title">Skins</div>';

      const eigeneSkins = SKINS.filter((skin) => skin.monsterId === monster.id);
      if (eigeneSkins.length === 0) {
        skinBlock.innerHTML +=
          '<p class="map__info-text">Für diese Figur gibt es noch keine Skins.</p>';
        content.appendChild(skinBlock);
        return;
      }

      const skinListe = document.createElement('div');
      skinListe.className = 'skin-list';

      eigeneSkins.forEach((skin) => {
        const besitzt = besitztSkin(skin.id);
        const aktiv = (getAktiverSkin(monster.id) ?? 'skin-standard') === skin.id;
        const seltenheit = SELTENHEITEN[skin.seltenheit];

        const knopf = document.createElement('button');
        knopf.type = 'button';
        knopf.className = `skin-chip${aktiv ? ' is-active' : ''}${besitzt ? '' : ' is-locked'}`;
        knopf.disabled = !besitzt;
        knopf.style.setProperty('--rarity', seltenheit.farbe);
        knopf.innerHTML = `
          <span class="skin-chip__vorschau"></span>
          <span class="skin-chip__name">${besitzt ? skin.name : '🔒 ' + skin.name}</span>
        `;
        // Die Vorschau zeigt genau diesen Skin, nicht den getragenen.
        knopf.querySelector('.skin-chip__vorschau').appendChild(createSprite(monster, { skin }));
        knopf.addEventListener('click', () => {
          setAktiverSkin(monster.id, skin.id);
          spritesNeuZeichnen();
          zeichne();
        });

        skinListe.appendChild(knopf);
      });

      skinBlock.appendChild(skinListe);
      content.appendChild(skinBlock);
    }

    /* ------------------------------------------------------------------ */
    /*  Reiter 4: Boss-Kräfte                                              */
    /* ------------------------------------------------------------------ */

    function baueKraefte(content) {
      const kraftBlock = document.createElement('div');
      kraftBlock.className = 'panel';
      kraftBlock.innerHTML =
        '<div class="panel__title">Boss-Kräfte</div>' +
        '<p class="setting-row__hint" style="margin-bottom:10px">' +
        'Besiege einen Boss, um seine Kraft freizuschalten. Du trägst eine davon in den Kampf.</p>';

      BOSS_KRAEFTE.forEach((kraft) => {
        const hat = besitztKraft(kraft.id);
        const getragen = gameState.bossPower === kraft.id;
        const welt = getWorld(kraft.welt);

        const knopf = document.createElement('button');
        knopf.type = 'button';
        knopf.className = `kraft-item${getragen ? ' is-active' : ''}${hat ? '' : ' is-locked'}`;
        knopf.disabled = !hat;
        knopf.innerHTML = `
          <span class="kraft-item__icon">${hat ? kraft.icon : '🔒'}</span>
          <span class="kraft-item__body">
            <span class="kraft-item__name">${kraft.name}</span>
            <span class="kraft-item__text">${
              hat ? kraft.text : `Besiege ${kraft.boss} in Welt ${kraft.welt} · ${welt?.name ?? ''}`
            }</span>
          </span>
          <span class="kraft-item__stand">${getragen ? '✓ Getragen' : hat ? 'Anlegen' : ''}</span>
        `;
        if (hat) {
          knopf.addEventListener('click', () => {
            // Tippt man die getragene Kraft an, legt man sie ab.
            setBossKraft(getragen ? null : kraft.id);
            zeichne();
          });
        }
        kraftBlock.appendChild(knopf);
      });

      content.appendChild(kraftBlock);
    }
  },
};

function zeile(name, wert) {
  return `
    <div class="stat-row">
      <span class="stat-row__label">${name}</span>
      <span class="stat-row__value">${wert}</span>
    </div>
  `;
}
