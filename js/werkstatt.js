/**
 * Das Skin-Studio (werkstatt.html): neue Skins für Timo erstellen - ohne Code.
 *
 * Wählen: Name, Seltenheit, Beschreibung, Kleidungsfarbe, Muster, Hut.
 * Importieren: eigene Hut- und Musterbilder.
 * Speichern & tragen: sofort im eigenen Spiel ausprobieren.
 * Skin-Paket herunterladen: alle Skins samt Bildern als Datei - daraus baut
 * werkzeuge/skins-einbauen.mjs echte Skins für alle Spieler.
 *
 * Gerechnet wird in js/core/outfit.js. Diese Datei ist nur die Seite.
 */

import { HUETE, MUSTER, POSEN, importBildSaeubern } from './core/outfit.js';
import {
  MAX_EIGENE,
  eigeneOutfits,
  importBildLoeschen,
  importBildSpeichern,
  importBilder,
  outfitLoeschen,
  outfitSpeichern,
  rezeptSchluessel,
  skinPaket,
} from './core/eigene-skins.js';
import { getAktiverSkin, loadProgress, setAktiverSkin } from './core/state.js';
import { SELTENHEITEN } from './data/items.js';
import { alsBildAdresse, aufLeinwand, bildZuPixel, extrasFuer, originaleLaden, vorschauPose } from './ui/outfit-bilder.js';

/** Fertige Farben zum Antippen. null = Original. */
const KLEIDUNG_FARBEN = [null, '#3a7bd5', '#d8323c', '#2e9d4e', '#7a3fc9', '#e08a1e', '#f2c94c',
  '#e85d9c', '#20b2aa', '#8b5a2b', '#e8e8f0', '#1b1f3a'];
const AKZENT_FARBEN = ['#ffffff', '#1b1f3a', '#d8323c', '#ff8a1f', '#ffc93d', '#3fbf5f', '#2f7bff',
  '#6b3fc9', '#ff4fa3', '#9a6233'];
const HUT_FARBEN = [null, ...AKZENT_FARBEN];

const KURZ_POSEN = ['stand', 'schlag-2', 'strahl-3', 'treffer-3'];

const NAMEN = ['Blitzheld', 'Nachtfalke', 'Sonnenkind', 'Sturmläufer', 'Feuerfuchs', 'Eiswolf',
  'Sternenjäger', 'Waldgeist', 'Donnerfaust', 'Glückspilz'];

/** So groß werden importierte Bilder höchstens gespeichert (Pixel). */
const IMPORT_MAX = { hut: 64, muster: 24 };

const $ = (id) => document.getElementById(id);

const LEER = {
  kleidung: '#3a7bd5', helligkeit: 0, muster: 'keins', musterFarbe: '#ffffff',
  hut: 'krone', hutFarbe: null, hutGroesse: 1, hutSitz: 0,
};

/* ---------- Zustand der Seite ---------- */
let rezept = { ...LEER };
let seltenheit = 'episch';
let bearbeiteId = null; // gesetzt, wenn ein gespeicherter Skin geändert wird
let allePosen = false;
let originale = null; // Pose -> Pixel der Originalbilder
let extras = {}; // importierte Bilder als Pixel (Hut, Muster) für das aktuelle Rezept

/* ---------- Vorschau ---------- */
let geplant = false;
let extrasStand = '';

/** Vorschau neu zeichnen - höchstens einmal pro Bild, auch beim Schieben. */
function vorschauPlanen() {
  if (geplant || !originale) return;
  geplant = true;
  requestAnimationFrame(async () => {
    // Importierte Bilder nur neu laden, wenn sich die Auswahl geändert hat.
    const stand = `${rezept.hut}|${rezept.muster}`;
    if (stand !== extrasStand) {
      extras = await extrasFuer(rezept);
      extrasStand = stand;
    }
    geplant = false;
    aufLeinwand($('vorschau-front'), vorschauPose(originale, 'front', rezept, extras));
    $('vorschau-posen').querySelectorAll('canvas').forEach((canvas) => {
      aufLeinwand(canvas, vorschauPose(originale, canvas.dataset.pose, rezept, extras));
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

/* ---------- Auswahl-Kacheln (Muster, Hüte) mit Import ---------- */
function kachel(box, { aktiv, icon, bild, name, beimTippen, loeschen }) {
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'ws-hut';
  knopf.setAttribute('role', 'radio');
  knopf.setAttribute('aria-checked', String(aktiv));
  knopf.innerHTML = `
    <span class="ws-hut__icon">${bild ? `<img src="${bild}" alt="">` : icon}</span>
    <span class="ws-hut__name"></span>
    ${loeschen ? '<span class="ws-hut__weg" role="button" aria-label="Bild löschen">✕</span>' : ''}
  `;
  knopf.querySelector('.ws-hut__name').textContent = name;
  knopf.addEventListener('click', (e) => {
    if (e.target.closest('.ws-hut__weg')) {
      loeschen();
      return;
    }
    beimTippen();
  });
  box.appendChild(knopf);
}

function auswahlZeichnen(boxId, liste, art, feld, dateiId, danach) {
  const box = $(boxId);
  box.innerHTML = '';
  Object.entries(liste).forEach(([id, eintrag]) => {
    kachel(box, {
      aktiv: rezept[feld] === id,
      icon: eintrag.icon,
      name: eintrag.name,
      beimTippen: () => { rezept[feld] = id; danach(); },
    });
  });
  // Importierte Bilder dieser Art.
  Object.entries(importBilder()).filter(([, b]) => b.art === art).forEach(([id, b]) => {
    kachel(box, {
      aktiv: rezept[feld] === `import:${id}`,
      bild: b.bild,
      name: b.name,
      beimTippen: () => { rezept[feld] = `import:${id}`; danach(); },
      loeschen: () => {
        if (!confirm(`Das Bild „${b.name}“ löschen?`)) return;
        importBildLoeschen(id);
        if (rezept[feld] === `import:${id}`) rezept[feld] = art === 'hut' ? 'keiner' : 'keins';
        danach();
      },
    });
  });
  kachel(box, {
    aktiv: false,
    icon: '📥',
    name: art === 'hut' ? 'Hut importieren' : 'Muster importieren',
    beimTippen: () => $(dateiId).click(),
  });
}

function musterZeichnen() {
  auswahlZeichnen('muster', MUSTER, 'muster', 'muster', 'datei-muster', () => {
    musterZeichnen();
    vorschauPlanen();
  });
  const eingebaut = rezept.muster in MUSTER && rezept.muster !== 'keins';
  $('musterfarbe-block').hidden = !eingebaut;
  if (eingebaut) farbFeld('muster-farben', 'musterFarbe', AKZENT_FARBEN, 'Weiß');
}

function hueteZeichnen() {
  auswahlZeichnen('huete', HUETE, 'hut', 'hut', 'datei-hut', () => {
    rezept.hutFarbe = null; // jeder Hut startet in seiner eigenen Farbe
    hueteZeichnen();
    vorschauPlanen();
  });
  const importiert = rezept.hut.startsWith('import:');
  $('hutfarbe-block').hidden = importiert || !HUETE[rezept.hut]?.farbe;
  $('hutlage-block').hidden = !importiert;
  if (!$('hutfarbe-block').hidden) farbFeld('hut-farben', 'hutFarbe', HUT_FARBEN, 'Originalfarbe');
  $('hut-groesse').value = rezept.hutGroesse;
  $('hut-sitz').value = rezept.hutSitz;
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
  seltenheitZeichnen();
  kleidungZeichnen();
  musterZeichnen();
  hueteZeichnen();
  vorschauPlanen();
}

/* ---------- Bilder importieren ---------- */
async function importieren(datei, art) {
  if (!datei) return;
  try {
    const adresse = await new Promise((fertig, fehler) => {
      const leser = new FileReader();
      leser.onload = () => fertig(leser.result);
      leser.onerror = fehler;
      leser.readAsDataURL(datei);
    });
    let pixel = await bildZuPixel(adresse);
    // Hüte: Ränder weg, Hintergrund weg. Muster bleiben, wie sie sind.
    if (art === 'hut') pixel = importBildSaeubern(pixel);
    // Verkleinern - scharf, ohne weiche Kanten (Pixelgrafik).
    const max = IMPORT_MAX[art];
    const faktor = Math.min(1, max / Math.max(pixel.width, pixel.height));
    const zielW = Math.max(1, Math.round(pixel.width * faktor));
    const zielH = Math.max(1, Math.round(pixel.height * faktor));
    const quelle = document.createElement('canvas');
    aufLeinwand(quelle, pixel);
    const ziel = document.createElement('canvas');
    ziel.width = zielW;
    ziel.height = zielH;
    const ctx = ziel.getContext('2d');
    ctx.imageSmoothingEnabled = faktor < 0.5; // große Fotos weich verkleinern, Pixelbilder scharf
    ctx.drawImage(quelle, 0, 0, zielW, zielH);
    const name = datei.name.replace(/\.[^.]+$/, '').slice(0, 24) || (art === 'hut' ? 'Mein Hut' : 'Mein Muster');
    const ergebnis = importBildSpeichern({ art, name, bild: ziel.toDataURL('image/png') });
    if (!ergebnis.ok) {
      melden(ergebnis.grund, true);
      return;
    }
    if (art === 'hut') rezept.hut = `import:${ergebnis.id}`;
    else rezept.muster = `import:${ergebnis.id}`;
    allesZeichnen();
    melden(art === 'hut' ? 'Hut importiert! Mit „Größe“ und „Sitz“ rückst du ihn zurecht.' : 'Muster importiert!');
  } catch (fehler) {
    console.error(fehler);
    melden('Das Bild konnte nicht gelesen werden.', true);
  }
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
    const ex = await extrasFuer(outfit.rezept);
    listenBilder.set(schluessel, alsBildAdresse(vorschauPose(originale, 'front', outfit.rezept, ex)));
  }
  return listenBilder.get(schluessel);
}

function listeZeichnen() {
  const box = $('liste');
  const liste = eigeneOutfits();
  const getragen = getAktiverSkin('timo');
  $('exportieren').disabled = !liste.length;
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

function exportieren() {
  const paket = skinPaket();
  if (!paket.skins.length) return;
  const datei = new Blob([JSON.stringify(paket, null, 1)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(datei);
  link.download = `monsterquest-skins-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  melden(`${paket.skins.length} Skin${paket.skins.length === 1 ? '' : 's'} exportiert - schick die Datei an Claude!`);
}

/* ---------- Zufall ---------- */
const zufall = (liste) => liste[Math.floor(Math.random() * liste.length)];

function zufallsSkin() {
  const farbe = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
  rezept = {
    ...LEER,
    kleidung: Math.random() < 0.6 ? zufall(KLEIDUNG_FARBEN.filter(Boolean)) : farbe,
    helligkeit: Math.round((Math.random() * 0.24 - 0.12) * 50) / 50,
    muster: Math.random() < 0.5 ? 'keins' : zufall(Object.keys(MUSTER)),
    musterFarbe: zufall(AKZENT_FARBEN),
    hut: zufall(Object.keys(HUETE).filter((id) => id !== 'keiner')),
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
  $('hut-groesse').addEventListener('input', (e) => {
    rezept.hutGroesse = Number(e.target.value);
    vorschauPlanen();
  });
  $('hut-sitz').addEventListener('input', (e) => {
    rezept.hutSitz = Number(e.target.value);
    vorschauPlanen();
  });
  $('alle-posen').addEventListener('click', () => {
    allePosen = !allePosen;
    posenAufbauen();
  });
  $('zufall').addEventListener('click', zufallsSkin);
  $('speichern').addEventListener('click', speichern);
  $('neu').addEventListener('click', neuAnfangen);
  $('exportieren').addEventListener('click', exportieren);
  $('datei-hut').addEventListener('change', (e) => { importieren(e.target.files[0], 'hut'); e.target.value = ''; });
  $('datei-muster').addEventListener('change', (e) => { importieren(e.target.files[0], 'muster'); e.target.value = ''; });

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
