/**
 * Die Skin-Werkstatt (werkstatt.html): eigene Outfits für Timo bauen.
 *
 * Kleidungsfarbe, Helligkeit, Kopfbedeckung und Hutfarbe wählen - die
 * Vorschau zeigt Timo sofort in den Posen. "Speichern & tragen" legt das
 * Rezept im Spielstand ab (js/core/eigene-skins.js) und zieht das Outfit im
 * Spiel gleich an. Die Bilder baut das Spiel selbst aus dem Rezept.
 *
 * Gerechnet wird in js/core/outfit.js. Diese Datei ist nur die Seite.
 */

import { HUETE, POSEN } from './core/outfit.js';
import { MAX_EIGENE, eigeneOutfits, outfitLoeschen, outfitSpeichern, rezeptSchluessel } from './core/eigene-skins.js';
import { getAktiverSkin, loadProgress, setAktiverSkin } from './core/state.js';
import { alsBildAdresse, aufLeinwand, originaleLaden, vorschauPose } from './ui/outfit-bilder.js';

/** Fertige Farben zum Antippen. null = Originalkleidung. */
const KLEIDUNG_FARBEN = [null, '#3a7bd5', '#d8323c', '#2e9d4e', '#7a3fc9', '#e08a1e', '#f2c94c',
  '#e85d9c', '#20b2aa', '#8b5a2b', '#e8e8f0', '#1b1f3a'];
const HUT_FARBEN = [null, '#d8323c', '#ff8a1f', '#ffc93d', '#3fbf5f', '#2f7bff', '#6b3fc9', '#ff4fa3',
  '#f4f1ec', '#2a2a33', '#9a6233'];

/** Diese Posen zeigt die Vorschau unter der großen Figur. */
const KURZ_POSEN = ['stand', 'schlag-2', 'strahl-3', 'treffer-3'];

const NAMEN = ['Blitzheld', 'Nachtfalke', 'Sonnenkind', 'Sturmläufer', 'Feuerfuchs', 'Eiswolf',
  'Sternenjäger', 'Waldgeist', 'Donnerfaust', 'Glückspilz'];

const $ = (id) => document.getElementById(id);

/* ---------- Zustand der Seite ---------- */
let rezept = { kleidung: '#3a7bd5', helligkeit: 0, hut: 'krone', hutFarbe: null };
let bearbeiteId = null; // gesetzt, wenn ein gespeichertes Outfit geändert wird
let allePosen = false;
let originale = null; // Pose -> Pixel der Originalbilder (js/ui/outfit-bilder.js)

/* ---------- Zeichnen ---------- */
let geplant = false;
/** Vorschau neu zeichnen - höchstens einmal pro Bild, auch beim Schieben. */
function vorschauPlanen() {
  if (geplant) return;
  geplant = true;
  requestAnimationFrame(() => {
    geplant = false;
    aufLeinwand($('vorschau-front'), vorschauPose(originale, 'front', rezept));
    $('vorschau-posen').querySelectorAll('canvas').forEach((canvas) => {
      aufLeinwand(canvas, vorschauPose(originale, canvas.dataset.pose, rezept));
    });
  });
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

function kleidungZeichnen() {
  farbKnoepfe($('kleidung-farben'), KLEIDUNG_FARBEN, rezept.kleidung, (f, live) => {
    rezept.kleidung = f;
    if (!live) kleidungZeichnen();
    else markiereEigen($('kleidung-farben'), f);
    vorschauPlanen();
  }, 'Originalkleidung');
  $('helligkeit').value = rezept.helligkeit;
  $('helligkeit').disabled = !rezept.kleidung;
}

function hutFarbeZeichnen() {
  const hut = HUETE[rezept.hut];
  $('hutfarbe-block').hidden = !hut?.farbe;
  farbKnoepfe($('hut-farben'), HUT_FARBEN, rezept.hutFarbe, (f, live) => {
    rezept.hutFarbe = f;
    if (!live) hutFarbeZeichnen();
    else markiereEigen($('hut-farben'), f);
    vorschauPlanen();
  }, 'Originalfarbe');
}

/** Beim Ziehen im Farbwähler nicht alles neu bauen - nur die Markierung setzen. */
function markiereEigen(box, f) {
  box.querySelectorAll('.ws-farbe').forEach((k) => k.setAttribute('aria-checked', 'false'));
  const eigen = box.querySelector('.ws-farbe--eigen');
  eigen.setAttribute('aria-checked', 'true');
  eigen.style.background = f;
}

function hueteZeichnen() {
  const box = $('huete');
  box.innerHTML = '';
  Object.entries(HUETE).forEach(([id, hut]) => {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'ws-hut';
    knopf.setAttribute('role', 'radio');
    knopf.setAttribute('aria-checked', String(id === rezept.hut));
    knopf.innerHTML = `<span class="ws-hut__icon">${hut.icon}</span><span class="ws-hut__name">${hut.name}</span>`;
    knopf.addEventListener('click', () => {
      rezept.hut = id;
      rezept.hutFarbe = null; // jeder Hut startet in seiner eigenen Farbe
      hueteZeichnen();
      hutFarbeZeichnen();
      vorschauPlanen();
    });
    box.appendChild(knopf);
  });
}

function allesZeichnen() {
  kleidungZeichnen();
  hueteZeichnen();
  hutFarbeZeichnen();
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
  meldungTimer = setTimeout(() => m.classList.remove('ist-sichtbar'), 2600);
}

/* ---------- Speichern und Liste ---------- */
function speichern() {
  const name = $('name').value.trim() || 'Mein Outfit';
  const ergebnis = outfitSpeichern({ id: bearbeiteId, name, rezept: { ...rezept } });
  if (!ergebnis.ok) {
    melden(ergebnis.grund, true);
    return;
  }
  bearbeiteId = ergebnis.id;
  setAktiverSkin('timo', ergebnis.id);
  listeZeichnen();
  melden(`„${name}“ gespeichert - Timo trägt es jetzt im Spiel!`);
}

/** Kleine Vorschaubilder für die Liste - je Rezept nur einmal gebaut. */
const listenBilder = new Map();
function listenBild(outfit) {
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
    box.innerHTML = `<p class="ws-leer">Noch keine eigenen Outfits. Bau oben eins und tippe auf „Speichern“! (Platz für ${MAX_EIGENE})</p>`;
    return;
  }
  box.innerHTML = '';
  liste.forEach((outfit) => {
    const zeile = document.createElement('div');
    zeile.className = `ws-eintrag${outfit.id === getragen ? ' ist-getragen' : ''}`;
    zeile.innerHTML = `
      <img src="${listenBild(outfit)}" alt="">
      <span class="ws-eintrag__name"></span>
      ${outfit.id === getragen ? '' : '<button class="btn btn--green" data-aktion="tragen" type="button">Tragen</button>'}
      <button class="btn btn--ghost" data-aktion="aendern" type="button" aria-label="Ändern">✏️</button>
      <button class="btn btn--ghost" data-aktion="loeschen" type="button" aria-label="Löschen">🗑️</button>
    `;
    // Name als Text einsetzen - so kann er kein HTML enthalten.
    const name = zeile.querySelector('.ws-eintrag__name');
    name.textContent = outfit.name;
    if (outfit.id === getragen) name.insertAdjacentHTML('beforeend', '<small>✓ Wird getragen</small>');

    zeile.querySelector('[data-aktion="tragen"]')?.addEventListener('click', () => {
      setAktiverSkin('timo', outfit.id);
      listeZeichnen();
      melden(`Timo trägt jetzt „${outfit.name}“.`);
    });
    zeile.querySelector('[data-aktion="aendern"]').addEventListener('click', () => {
      rezept = { kleidung: null, helligkeit: 0, hut: 'keiner', hutFarbe: null, ...outfit.rezept };
      bearbeiteId = outfit.id;
      $('name').value = outfit.name;
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

function zufallsOutfit() {
  const farbe = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
  rezept = {
    kleidung: Math.random() < 0.6 ? zufall(KLEIDUNG_FARBEN.filter(Boolean)) : farbe,
    helligkeit: Math.round((Math.random() * 0.24 - 0.12) * 50) / 50,
    hut: zufall(Object.keys(HUETE).filter((id) => id !== 'keiner')),
    hutFarbe: Math.random() < 0.5 ? null : zufall(HUT_FARBEN.filter(Boolean)),
  };
  bearbeiteId = null;
  $('name').value = zufall(NAMEN);
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
  $('zufall').addEventListener('click', zufallsOutfit);
  $('speichern').addEventListener('click', speichern);

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
