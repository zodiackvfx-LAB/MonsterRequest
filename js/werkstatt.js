/**
 * Das Skin-Studio (werkstatt.html): eigene Outfits für Timo.
 *
 * Wählen: Name, Seltenheit, Beschreibung, Kleidungsfarbe, Muster, Hut.
 * Farben sind kostenlos. Hüte und Muster muss man freischalten - im Shop
 * oder aus Truhen; gesperrte zeigt das Studio mit Schloss und Preis und
 * verkauft sie auf Wunsch gleich hier (js/core/studio-teile.js).
 * Speichern & tragen: sofort im Spiel anziehen.
 *
 * Gerechnet wird in js/core/outfit.js. Diese Datei ist nur die Seite.
 */

import { HUETE, MUSTER, POSEN } from './core/outfit.js';
import { MAX_EIGENE, eigeneOutfits, outfitLoeschen, outfitSpeichern, rezeptSchluessel } from './core/eigene-skins.js';
import { gameState, getAktiverSkin, loadProgress, setAktiverSkin } from './core/state.js';
import { teilFrei, teilKaufen, teilPreis } from './core/studio-teile.js';
import { STUDIO_GRATIS, studioTeilFuer } from './data/studio-teile.js';
import { MUENZE, SELTENHEITEN } from './data/items.js';
import { alsBildAdresse, aufLeinwand, originaleLaden, vorschauPose } from './ui/outfit-bilder.js';

/** Fertige Farben zum Antippen. null = Original. */
const KLEIDUNG_FARBEN = [null, '#3a7bd5', '#d8323c', '#2e9d4e', '#7a3fc9', '#e08a1e', '#f2c94c',
  '#e85d9c', '#20b2aa', '#8b5a2b', '#e8e8f0', '#1b1f3a'];
const AKZENT_FARBEN = ['#ffffff', '#1b1f3a', '#d8323c', '#ff8a1f', '#ffc93d', '#3fbf5f', '#2f7bff',
  '#6b3fc9', '#ff4fa3', '#9a6233'];
const HUT_FARBEN = [null, ...AKZENT_FARBEN];

const KURZ_POSEN = ['stand', 'schlag-2', 'strahl-3', 'treffer-3'];

const NAMEN = ['Blitzheld', 'Nachtfalke', 'Sonnenkind', 'Sturmläufer', 'Feuerfuchs', 'Eiswolf',
  'Sternenjäger', 'Waldgeist', 'Donnerfaust', 'Glückspilz'];

const $ = (id) => document.getElementById(id);

const LEER = {
  kleidung: '#3a7bd5', helligkeit: 0, muster: 'keins', musterFarbe: '#ffffff', hut: 'keiner', hutFarbe: null,
};

/* ---------- Zustand der Seite ---------- */
let rezept = { ...LEER };
let seltenheit = 'episch';
let bearbeiteId = null; // gesetzt, wenn ein gespeicherter Skin geändert wird
let allePosen = false;
let originale = null; // Pose -> Pixel der Originalbilder

/* ---------- Vorschau ---------- */
let geplant = false;

/** Vorschau neu zeichnen - höchstens einmal pro Bild, auch beim Schieben. */
function vorschauPlanen() {
  if (geplant || !originale) return;
  geplant = true;
  requestAnimationFrame(() => {
    geplant = false;
    aufLeinwand($('vorschau-front'), vorschauPose(originale, 'front', rezept));
    $('vorschau-posen').querySelectorAll('canvas').forEach((canvas) => {
      aufLeinwand(canvas, vorschauPose(originale, canvas.dataset.pose, rezept));
    });
  });
}

function muenzenZeichnen() {
  $('muenzen').innerHTML = `${MUENZE} ${gameState.coins}`;
}

function posenAufbauen() {
  const box = $('vorschau-posen');
  box.classList.toggle('ist-alle', allePosen);
  box.innerHTML = '';
  (allePosen ? POSEN.filter((p) => p !== 'front') : KURZ_POSEN).forEach((pose) => {
    const feld = document.createElement('div');
    feld.className = 'ws-pose';
    const canvas = document.createElement('canvas');
    canvas.dataset.pose = pose;
    feld.appendChild(canvas);
    box.appendChild(feld);
  });
  $('alle-posen').textContent = allePosen ? 'Weniger Posen zeigen' : 'Alle 14 Posen zeigen';
  vorschauPlanen();
}

/* ---------- Farbknöpfe ---------- */
function farbKnoepfe(box, farben, aktuell, waehlen, originalText) {
  box.innerHTML = '';
  const eigeneFarbe = aktuell && !farben.includes(aktuell);
  farben.forEach((f) => {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = `ws-farbe${f ? '' : ' ws-farbe--original'}`;
    knopf.setAttribute('role', 'radio');
    knopf.setAttribute('aria-checked', String(f === aktuell));
    knopf.setAttribute('aria-label', f ?? originalText);
    knopf.title = f ?? originalText;
    if (f) knopf.style.setProperty('--farbe', f);
    knopf.addEventListener('click', () => waehlen(f));
    box.appendChild(knopf);
  });
  // Ganz eigene Farbe: Regenbogen-Knopf mit dem Farbwähler des Geräts.
  const eigen = document.createElement('label');
  eigen.className = 'ws-farbe ws-farbe--eigen';
  eigen.setAttribute('role', 'radio');
  eigen.setAttribute('aria-checked', String(eigeneFarbe));
  eigen.title = 'Eigene Farbe';
  if (eigeneFarbe) eigen.style.background = aktuell;
  eigen.innerHTML = `<input type="color" value="${aktuell ?? '#3a7bd5'}" aria-label="Eigene Farbe">`;
  eigen.querySelector('input').addEventListener('input', (e) => waehlen(e.target.value, true));
  box.appendChild(eigen);
}

/** Beim Ziehen im Farbwähler nicht alles neu bauen - nur die Markierung setzen. */
function markiereEigen(box, f) {
  box.querySelectorAll('.ws-farbe').forEach((k) => k.setAttribute('aria-checked', 'false'));
  const eigen = box.querySelector('.ws-farbe--eigen');
  eigen.setAttribute('aria-checked', 'true');
  eigen.style.background = f;
}

function farbFeld(boxId, feld, farben, originalText, danach = () => {}) {
  farbKnoepfe($(boxId), farben, rezept[feld], (f, live) => {
    rezept[feld] = f;
    if (live) markiereEigen($(boxId), f);
    else farbFeld(boxId, feld, farben, originalText, danach);
    danach();
    vorschauPlanen();
  }, originalText);
}

/* ---------- Auswahl-Kacheln (Muster, Hüte) ---------- */
function kachel(box, { aktiv, icon, name, gesperrt, preis, seltenheit, beimTippen }) {
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = `ws-hut${gesperrt ? ' ist-gesperrt' : ''}`;
  knopf.setAttribute('role', 'radio');
  knopf.setAttribute('aria-checked', String(aktiv));
  if (seltenheit) knopf.style.setProperty('--farbe', SELTENHEITEN[seltenheit].farbe);
  knopf.innerHTML = `
    <span class="ws-hut__icon">${icon}</span>
    <span class="ws-hut__name"></span>
    ${gesperrt ? `<span class="ws-hut__preis">🔒 ${MUENZE} ${preis}</span>` : ''}
  `;
  knopf.querySelector('.ws-hut__name').textContent = name;
  knopf.addEventListener('click', beimTippen);
  box.appendChild(knopf);
}

/** Ein gesperrtes Teil: fragen, ob es gekauft werden soll. */
function kaufenAnbieten(teil, name, danach) {
  const preis = teilPreis(teil);
  if (gameState.coins < preis) {
    melden(`${name} kostet ${preis} Münzen - du hast ${gameState.coins}. Oder zieh es aus einer Truhe!`, true);
    return;
  }
  if (!confirm(`${name} für ${preis} Münzen freischalten?`)) return;
  const ergebnis = teilKaufen(teil.id);
  if (!ergebnis.ok) {
    melden(ergebnis.grund, true);
    return;
  }
  muenzenZeichnen();
  melden(`${name} freigeschaltet!`);
  danach();
}

function auswahlZeichnen(boxId, liste, art, feld, danach) {
  const box = $(boxId);
  box.innerHTML = '';
  Object.entries(liste).forEach(([id, eintrag]) => {
    const teil = studioTeilFuer(art, id);
    const frei = teilFrei(art, id);
    kachel(box, {
      aktiv: rezept[feld] === id,
      icon: eintrag.icon,
      name: eintrag.name,
      gesperrt: !frei,
      preis: teil ? teilPreis(teil) : 0,
      seltenheit: teil?.seltenheit,
      beimTippen: () => {
        if (!frei) {
          kaufenAnbieten(teil, eintrag.name, () => { rezept[feld] = id; danach(); });
          return;
        }
        rezept[feld] = id;
        danach();
      },
    });
  });
}

function musterZeichnen() {
  auswahlZeichnen('muster', MUSTER, 'muster', 'muster', () => {
    musterZeichnen();
    vorschauPlanen();
  });
  const mitMuster = rezept.muster !== STUDIO_GRATIS.muster;
  $('musterfarbe-block').hidden = !mitMuster;
  if (mitMuster) farbFeld('muster-farben', 'musterFarbe', AKZENT_FARBEN, 'Weiß');
}

function hueteZeichnen() {
  auswahlZeichnen('huete', HUETE, 'hut', 'hut', () => {
    rezept.hutFarbe = null; // jeder Hut startet in seiner eigenen Farbe
    hueteZeichnen();
    vorschauPlanen();
  });
  $('hutfarbe-block').hidden = !HUETE[rezept.hut]?.farbe;
  if (!$('hutfarbe-block').hidden) farbFeld('hut-farben', 'hutFarbe', HUT_FARBEN, 'Originalfarbe');
}

function kleidungZeichnen() {
  farbFeld('kleidung-farben', 'kleidung', KLEIDUNG_FARBEN, 'Originalkleidung', () => {
    $('helligkeit').disabled = !rezept.kleidung;
  });
  $('helligkeit').value = rezept.helligkeit;
  $('helligkeit').disabled = !rezept.kleidung;
}

function seltenheitZeichnen() {
  const box = $('seltenheiten');
  box.innerHTML = '';
  Object.values(SELTENHEITEN).forEach((s) => {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'ws-seltenheit';
    knopf.style.setProperty('--farbe', s.farbe);
    knopf.setAttribute('role', 'radio');
    knopf.setAttribute('aria-checked', String(s.id === seltenheit));
    knopf.textContent = s.name;
    knopf.addEventListener('click', () => {
      seltenheit = s.id;
      seltenheitZeichnen();
    });
    box.appendChild(knopf);
  });
  const marke = $('seltenheit-marke');
  marke.textContent = SELTENHEITEN[seltenheit].name;
  marke.style.setProperty('--farbe', SELTENHEITEN[seltenheit].farbe);
}

function allesZeichnen() {
  muenzenZeichnen();
  seltenheitZeichnen();
  kleidungZeichnen();
  musterZeichnen();
  hueteZeichnen();
  vorschauPlanen();
}

/* ---------- Meldung ---------- */
let meldungTimer = null;
function melden(text, fehler = false) {
  const m = $('meldung');
  m.textContent = text;
  m.classList.toggle('ist-fehler', fehler);
  m.classList.add('ist-sichtbar');
  clearTimeout(meldungTimer);
  meldungTimer = setTimeout(() => m.classList.remove('ist-sichtbar'), 3000);
}

/* ---------- Speichern, Liste, Export ---------- */
function speichern() {
  const name = $('name').value.trim() || 'Mein Skin';
  const ergebnis = outfitSpeichern({ id: bearbeiteId, name, seltenheit, text: $('text').value, rezept: { ...rezept } });
  if (!ergebnis.ok) {
    melden(ergebnis.grund, true);
    return;
  }
  bearbeiteId = ergebnis.id;
  setAktiverSkin('timo', ergebnis.id);
  listeZeichnen();
  melden(`„${name}“ gespeichert - Timo trägt ihn jetzt im Spiel!`);
}

function neuAnfangen() {
  rezept = { ...LEER };
  seltenheit = 'episch';
  bearbeiteId = null;
  $('name').value = '';
  $('text').value = '';
  allesZeichnen();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Kleine Vorschaubilder für die Liste - je Rezept nur einmal gebaut. */
const listenBilder = new Map();
async function listenBild(outfit) {
  const schluessel = rezeptSchluessel(outfit.rezept);
  if (!listenBilder.has(schluessel)) {
    listenBilder.set(schluessel, alsBildAdresse(vorschauPose(originale, 'front', outfit.rezept)));
  }
  return listenBilder.get(schluessel);
}

function listeZeichnen() {
  const box = $('liste');
  const liste = eigeneOutfits();
  const getragen = getAktiverSkin('timo');
  if (!liste.length) {
    box.innerHTML = `<p class="ws-leer">Noch keine Skins. Bau oben einen und tippe auf „Speichern“! (Platz für ${MAX_EIGENE})</p>`;
    return;
  }
  box.innerHTML = '';
  liste.forEach((outfit) => {
    const s = SELTENHEITEN[outfit.seltenheit] ?? SELTENHEITEN.episch;
    const zeile = document.createElement('div');
    zeile.className = `ws-eintrag${outfit.id === getragen ? ' ist-getragen' : ''}`;
    zeile.style.setProperty('--farbe', s.farbe);
    zeile.innerHTML = `
      <img alt="">
      <span class="ws-eintrag__name"></span>
      ${outfit.id === getragen ? '' : '<button class="btn btn--green" data-aktion="tragen" type="button">Tragen</button>'}
      <button class="btn btn--ghost" data-aktion="aendern" type="button" aria-label="Ändern">✏️</button>
      <button class="btn btn--ghost" data-aktion="loeschen" type="button" aria-label="Löschen">🗑️</button>
    `;
    listenBild(outfit).then((bild) => { zeile.querySelector('img').src = bild; });
    // Name als Text einsetzen - so kann er kein HTML enthalten.
    const name = zeile.querySelector('.ws-eintrag__name');
    name.textContent = outfit.name;
    name.insertAdjacentHTML('beforeend', `<small style="color:${s.farbe}">${s.name}${outfit.id === getragen ? ' · ✓ getragen' : ''}</small>`);

    zeile.querySelector('[data-aktion="tragen"]')?.addEventListener('click', () => {
      setAktiverSkin('timo', outfit.id);
      listeZeichnen();
      melden(`Timo trägt jetzt „${outfit.name}“.`);
    });
    zeile.querySelector('[data-aktion="aendern"]').addEventListener('click', () => {
      rezept = { ...LEER, ...outfit.rezept };
      seltenheit = outfit.seltenheit ?? 'episch';
      bearbeiteId = outfit.id;
      $('name').value = outfit.name;
      $('text').value = outfit.text ?? '';
      allesZeichnen();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      melden(`Du änderst „${outfit.name}“.`);
    });
    zeile.querySelector('[data-aktion="loeschen"]').addEventListener('click', () => {
      if (!confirm(`„${outfit.name}“ wirklich löschen?`)) return;
      outfitLoeschen(outfit.id);
      if (getAktiverSkin('timo') === outfit.id) setAktiverSkin('timo', null);
      if (bearbeiteId === outfit.id) bearbeiteId = null;
      listeZeichnen();
    });
    box.appendChild(zeile);
  });
}

/* ---------- Zufall ---------- */
const zufall = (liste) => liste[Math.floor(Math.random() * liste.length)];

function zufallsSkin() {
  const farbe = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
  rezept = {
    ...LEER,
    kleidung: Math.random() < 0.6 ? zufall(KLEIDUNG_FARBEN.filter(Boolean)) : farbe,
    helligkeit: Math.round((Math.random() * 0.24 - 0.12) * 50) / 50,
    // Nur, was der Spieler schon hat - Farben gehen immer.
    muster: Math.random() < 0.5 ? 'keins' : zufall(Object.keys(MUSTER).filter((id) => teilFrei('muster', id))),
    musterFarbe: zufall(AKZENT_FARBEN),
    hut: zufall(Object.keys(HUETE).filter((id) => teilFrei('hut', id))),
    hutFarbe: Math.random() < 0.5 ? null : zufall(AKZENT_FARBEN),
  };
  seltenheit = zufall(Object.keys(SELTENHEITEN));
  bearbeiteId = null;
  $('name').value = zufall(NAMEN);
  $('text').value = '';
  allesZeichnen();
}

/* ---------- Los geht's ---------- */
async function start() {
  loadProgress();
  $('helligkeit').addEventListener('input', (e) => {
    rezept.helligkeit = Number(e.target.value);
    vorschauPlanen();
  });
  $('alle-posen').addEventListener('click', () => {
    allePosen = !allePosen;
    posenAufbauen();
  });
  $('zufall').addEventListener('click', zufallsSkin);
  $('speichern').addEventListener('click', speichern);
  $('neu').addEventListener('click', neuAnfangen);

  try {
    originale = await originaleLaden();
  } catch (fehler) {
    melden('Die Bilder von Timo konnten nicht geladen werden. Bist du online?', true);
    console.error(fehler);
    return;
  }
  allesZeichnen();
  posenAufbauen();
  listeZeichnen();
}

start();
