/**
 * Sammlung: alles, was es im Spiel zu finden gibt - in drei Reitern.
 *
 *   Monster   alle Kreaturen, nach Welten sortiert
 *   Attacken  die acht Startattacken und alle Beute-Attacken
 *   Skins     alle Aussehen für dein Monster
 *
 * Ein Gegner gilt als entdeckt, sobald sein Kampf gewonnen wurde. Noch nicht
 * Entdecktes bleibt verdeckt - man sieht nur, dass es das gibt.
 */

import { showScreen } from '../core/screens.js';
import { MONSTERS, STARTER_MONSTER_ID } from '../data/monsters.js';
import { WORLDS } from '../data/worlds.js';
import { LEVELS } from '../data/levels.js';
import { getEnemy } from '../data/enemies.js';
import { getAttack, START_ATTACKEN } from '../data/attacks.js';
import { BEUTE_ATTACKEN, SELTENHEITEN, SKINS } from '../data/items.js';
import { createScenery } from '../ui/scenery.js';
import { createTopbar } from '../ui/hud.js';
import { createSprite } from '../ui/sprite.js';
import {
  besitztAttacke,
  besitztSkin,
  getAktiverSkin,
  isLevelCleared,
  isWorldUnlocked,
} from '../core/state.js';
import { attackeMitLevel, getAttackenLevel, charakterWerte } from '../core/progression.js';

/** Die drei Reiter. Ein neuer Reiter = hier einen Eintrag ergänzen. */
const REITER = [
  { id: 'monster', label: '🐾 Monster', bauen: baueMonster },
  { id: 'attacken', label: '🃏 Attacken', bauen: baueAttacken },
  { id: 'skins', label: '🎨 Skins', bauen: baueSkins },
];

export const collectionScreen = {
  mount(root, params = {}) {
    let aktiv = REITER.some((r) => r.id === params.tab) ? params.tab : 'monster';

    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Sammlung', () => showScreen('start')));

    const reiterLeiste = document.createElement('div');
    reiterLeiste.className = 'tabs';
    screen.appendChild(reiterLeiste);

    const content = document.createElement('div');
    content.className = 'page__content';
    screen.appendChild(content);

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
    root.appendChild(screen);
  },
};

/* ====================================================================
   Reiter 1: Monster
   ==================================================================== */

function baueMonster(content) {
  // Entdeckt ist, wessen Kampf gewonnen wurde.
  const entdeckt = new Set();
  LEVELS.forEach((level) => {
    if (isLevelCleared(level.id)) entdeckt.add(level.enemyId);
  });

  const eigene = Object.values(MONSTERS);
  const gesamt = LEVELS.length + eigene.length;

  content.appendChild(
    zaehler(`Entdeckt: <strong>${entdeckt.size + eigene.length} von ${gesamt}</strong> Kreaturen.
      Gewinne einen Kampf, um den Gegner freizuschalten.`)
  );

  content.appendChild(
    gruppe(
      'Deine Figur',
      eigene.map((monster) => ({
        monster,
        bekannt: true,
        notiz: `Level ${charakterWerte(monster).level}`,
      }))
    )
  );

  WORLDS.forEach((world) => {
    const sichtbar = isWorldUnlocked(world.id);
    const eintraege = LEVELS.filter((level) => level.worldId === world.id).map((level) => {
      const monster = getEnemy(level.enemyId);
      return {
        monster,
        bekannt: sichtbar && entdeckt.has(level.enemyId),
        notiz: `${monster.maxHp} LP`,
      };
    });
    content.appendChild(gruppe(`${world.icon} ${world.name}`, eintraege));
  });
}

/** Eine Überschrift mit einem Raster aus Kreaturen. */
function gruppe(titel, eintraege) {
  const block = document.createElement('div');
  block.className = 'panel';

  const gefunden = eintraege.filter((eintrag) => eintrag.bekannt).length;
  block.innerHTML = `<div class="panel__title">${titel} <span class="panel__count">${gefunden}/${eintraege.length}</span></div>`;

  const grid = document.createElement('div');
  grid.className = 'collection';

  eintraege.forEach(({ monster, bekannt, notiz }) => {
    const item = document.createElement('div');
    item.className = `collection-item${bekannt ? '' : ' is-locked'}${monster.isBoss ? ' is-boss' : ''}`;
    item.innerHTML = `
      <span class="collection-item__sprite"></span>
      <span class="collection-item__name">${bekannt ? monster.name : '???'}</span>
      <span class="collection-item__note">${bekannt ? notiz : 'Unentdeckt'}</span>
    `;
    const bild = item.querySelector('.collection-item__sprite');
    if (bekannt) bild.appendChild(createSprite(monster));
    else bild.textContent = '❓';
    grid.appendChild(item);
  });

  block.appendChild(grid);
  return block;
}

/* ====================================================================
   Reiter 2: Attacken
   ==================================================================== */

function baueAttacken(content) {
  const start = START_ATTACKEN.map((id) => getAttack(id));
  const beute = BEUTE_ATTACKEN.map((attacke) => getAttack(attacke.id));
  const besessen = beute.filter((attacke) => besitztAttacke(attacke.id)).length;

  content.appendChild(
    zaehler(`Gefunden: <strong>${start.length + besessen} von ${start.length + beute.length}</strong> Attacken.
      Neue Attacken kommen aus Truhen im Shop.`)
  );

  content.appendChild(attackenBlock('Startattacken', start, () => true));
  content.appendChild(attackenBlock('Aus Truhen', beute, (attacke) => besitztAttacke(attacke.id)));
}

function attackenBlock(titel, attacken, istBesessen) {
  const block = document.createElement('div');
  block.className = 'panel';
  const anzahl = attacken.filter(istBesessen).length;
  block.innerHTML = `<div class="panel__title">${titel} <span class="panel__count">${anzahl}/${attacken.length}</span></div>`;

  const liste = document.createElement('div');
  liste.className = 'katalog';

  attacken.forEach((attacke) => {
    const besessen = istBesessen(attacke);
    const seltenheit = SELTENHEITEN[attacke.seltenheit] ?? SELTENHEITEN.gewoehnlich;
    const level = getAttackenLevel(attacke.id);
    const stark = attackeMitLevel(attacke);

    const zeile = document.createElement('div');
    zeile.className = `katalog-item${besessen ? '' : ' is-locked'}`;
    zeile.style.setProperty('--seltenheit', seltenheit.farbe);
    zeile.innerHTML = `
      <span class="katalog-item__icon">${besessen ? attacke.icon : '❓'}</span>
      <span class="katalog-item__body">
        <span class="katalog-item__name">
          ${besessen ? attacke.name : '???'}
          ${besessen && level > 1 ? `<span class="deck-item__level">Lv.&nbsp;${level}</span>` : ''}
        </span>
        <span class="katalog-item__text">${besessen ? wirkungsText(stark) : 'Noch nicht gefunden'}</span>
        <span class="katalog-item__rarity">${seltenheit.name}</span>
      </span>
      <span class="katalog-item__cost">${attacke.cost}</span>
    `;
    liste.appendChild(zeile);
  });

  block.appendChild(liste);
  return block;
}

/** "17 Schaden" / "heilt 22" / "fängt 26 Schaden ab" */
function wirkungsText(attacke) {
  if (attacke.heal > 0) return `heilt ${attacke.heal} LP`;
  if (attacke.shield > 0) return `fängt ${attacke.shield} Schaden ab`;
  return `${attacke.damage} Schaden`;
}

/* ====================================================================
   Reiter 3: Skins
   ==================================================================== */

function baueSkins(content) {
  const besessen = SKINS.filter((skin) => besitztSkin(skin.id)).length;
  // Ohne Auswahl gilt der Standard-Skin - genauso wie im Monster-Bildschirm.
  const aktiv = getAktiverSkin(STARTER_MONSTER_ID) ?? 'skin-standard';

  content.appendChild(
    zaehler(`Freigeschaltet: <strong>${besessen} von ${SKINS.length}</strong> Skins.
      Skins ändern nur das Aussehen, nie die Kampfwerte.`)
  );

  const block = document.createElement('div');
  block.className = 'panel';
  block.innerHTML = '<div class="panel__title">Glutwelpe</div>';

  const grid = document.createElement('div');
  grid.className = 'collection';

  const basis = MONSTERS[STARTER_MONSTER_ID];
  SKINS.forEach((skin) => {
    const hat = besitztSkin(skin.id);
    const seltenheit = SELTENHEITEN[skin.seltenheit] ?? SELTENHEITEN.gewoehnlich;
    const istAktiv = aktiv === skin.id;

    const item = document.createElement('div');
    item.className = `collection-item${hat ? '' : ' is-locked'}${istAktiv ? ' is-active' : ''}`;
    item.style.setProperty('--seltenheit', seltenheit.farbe);
    item.innerHTML = `
      <span class="collection-item__sprite"></span>
      <span class="collection-item__name">${hat ? skin.name : '???'}</span>
      <span class="collection-item__note">${istAktiv ? 'Getragen' : seltenheit.name}</span>
    `;
    const bild = item.querySelector('.collection-item__sprite');
    // Die Vorschau zeigt das Monster mit genau diesem Skin - nicht mit dem
    // gerade getragenen (deshalb die ausdrueckliche Vorgabe).
    if (hat) bild.appendChild(createSprite(basis, { skin }));
    else bild.textContent = '❓';
    grid.appendChild(item);
  });

  block.appendChild(grid);
  content.appendChild(block);
}

/* ==================================================================== */

/** Die Info-Zeile über jedem Reiter. */
function zaehler(html) {
  const panel = document.createElement('div');
  panel.className = 'panel panel--tight';
  panel.innerHTML = `<p class="map__info-text">${html}</p>`;
  return panel;
}
