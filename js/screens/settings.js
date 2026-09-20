/**
 * Einstellungen.
 *
 * Zwei Reiter:
 *   "Spiel"     - Schalter, Ton-Test, Fortschritt, Zurücksetzen
 *   "Datenbank" - Name und der Spielstand in der Datenbank (Codes)
 */

import { showScreen } from '../core/screens.js';
import { createScenery } from '../ui/scenery.js';
import { createTopbar } from '../ui/hud.js';
import {
  gameState,
  getTotalStars,
  resetProgress,
  setSetting,
  setSpielername,
  NAME_MAX,
} from '../core/state.js';
import {
  cloudAktiv,
  cloudBeobachten,
  cloudCodeEinloesen,
  cloudCodeErstellen,
} from '../core/cloud.js';
import { spielstandUebernehmenVonCode } from '../core/sync.js';
import { LEVELS } from '../data/levels.js';
import { spieleKlang, tonEinstellungenAnwenden, tonStatus } from '../core/audio.js';
import { MUENZE } from '../data/items.js';

/** Die Schalter. Neue Einstellung = hier einen Eintrag ergänzen. */
const TOGGLES = [
  {
    key: 'animations',
    name: 'Animationen',
    hint: 'Treffer- und Bewegungseffekte im Kampf',
  },
  {
    key: 'sound',
    name: 'Klänge',
    hint: 'Treffer, Knöpfe, Belohnungen',
    probe: 'bestaetigen', // beim Einschalten kurz vorspielen
  },
  {
    key: 'musik',
    name: 'Musik',
    hint: 'Ruhige Hintergrundmusik, je Welt eine andere',
  },
  {
    key: 'vibration',
    name: 'Vibration',
    hint: 'Kurzes Vibrieren bei Treffern (nur auf Geräten, die das können)',
  },
];

/** Die beiden Reiter. */
const REITER = [
  { id: 'spiel', label: 'Spiel', bauen: baueSpiel },
  { id: 'datenbank', label: 'Datenbank', bauen: baueDatenbank },
];

export const settingsScreen = {
  mount(root, params = {}) {
    // Ein alter Melder kann hier nicht mehr liegen - unmount raeumt ihn weg.
    melderAbmelden();

    const screen = document.createElement('div');
    screen.className = 'screen screen--page';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('Einstellungen', () => showScreen('start')));

    const reiterLeiste = document.createElement('div');
    reiterLeiste.className = 'tabs';
    screen.appendChild(reiterLeiste);

    const content = document.createElement('div');
    content.className = 'page__content';
    screen.appendChild(content);

    // Mit dem passenden Reiter starten - z. B. direkt "Datenbank", wenn man
    // aus dem Willkommens-Pop-up dorthin geschickt wird.
    let aktiv = REITER.some((r) => r.id === params.tab) ? params.tab : 'spiel';

    function zeichne() {
      // Vor jedem Neubau den alten Datenbank-Melder abmelden.
      melderAbmelden();

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
      REITER.find((reiter) => reiter.id === aktiv).bauen(content, screen, zeichne);
      content.scrollTop = 0;
    }

    zeichne();
    root.appendChild(screen);
  },

  unmount() {
    // Der Zustandsmelder der Datenbank laeuft sonst weiter und schreibt in
    // einen Bildschirm, den es nicht mehr gibt.
    melderAbmelden();
  },
};

/* ------------------------------------------------------------------ */
/*  Reiter 1: Spiel                                                    */
/* ------------------------------------------------------------------ */

function baueSpiel(content, screen) {
  /* ---------- Schalter ---------- */
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = '<div class="panel__title">Spiel</div>';

  TOGGLES.forEach((toggle) => {
    const row = document.createElement('div');
    row.className = 'setting-row';
    row.innerHTML = `
      <span class="setting-row__label">
        <span class="setting-row__name">${toggle.name}</span>
        <span class="setting-row__hint">${toggle.hint}</span>
      </span>
    `;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `switch${gameState.settings[toggle.key] ? ' is-on' : ''}`;
    button.setAttribute('aria-label', toggle.name);
    // Der Schalter spielt seinen eigenen Klang, nicht den Standard-Tipp.
    button.dataset.klang = 'keiner';
    button.addEventListener('click', () => {
      const value = !gameState.settings[toggle.key];
      setSetting(toggle.key, value);
      button.classList.toggle('is-on', value);
      applySettings();
      // Beim Einschalten einmal hörbar machen, was man gerade angeschaltet hat.
      if (value && toggle.probe) spieleKlang(toggle.probe);
    });

    row.appendChild(button);
    panel.appendChild(row);
  });

  /* ---------- Ton-Test ---------- */
  // Damit man unterscheiden kann: liegt es am Spiel oder am Geraet?
  const testZeile = document.createElement('div');
  testZeile.className = 'setting-row';
  testZeile.innerHTML = `
    <span class="setting-row__label">
      <span class="setting-row__name">Ton testen</span>
      <span class="setting-row__hint" id="ton-befund">Antippen - du solltest zwei Töne hören.</span>
    </span>
  `;

  const testKnopf = document.createElement('button');
  testKnopf.type = 'button';
  testKnopf.className = 'btn btn--small';
  testKnopf.textContent = '🔊 Test';
  testKnopf.dataset.klang = 'keiner';
  testKnopf.addEventListener('click', () => {
    spieleKlang('bestaetigen');
    // Kurz warten: der Tonkanal wacht erst mit dieser Berührung auf.
    setTimeout(() => {
      testZeile.querySelector('#ton-befund').innerHTML = befundText(tonStatus());
    }, 250);
  });

  testZeile.appendChild(testKnopf);
  panel.appendChild(testZeile);
  content.appendChild(panel);

  /* ---------- Fortschritt ---------- */
  const progress = document.createElement('div');
  progress.className = 'panel';
  progress.innerHTML = `
    <div class="panel__title">Fortschritt</div>
    <div class="stat-row">
      <span class="stat-row__label">Geschaffte Level</span>
      <span class="stat-row__value">${gameState.clearedLevels.length} / ${LEVELS.length}</span>
    </div>
    <div class="stat-row">
      <span class="stat-row__label">Sterne</span>
      <span class="stat-row__value">${getTotalStars()} / ${LEVELS.length * 3}</span>
    </div>
    <div class="stat-row">
      <span class="stat-row__label">Münzen</span>
      <span class="stat-row__value">${MUENZE} ${gameState.coins}</span>
    </div>
  `;
  content.appendChild(progress);

  const resetButton = document.createElement('button');
  resetButton.className = 'btn btn--danger';
  resetButton.type = 'button';
  resetButton.textContent = 'Fortschritt zurücksetzen';
  resetButton.addEventListener('click', () => askReset(screen));
  content.appendChild(resetButton);

  const note = document.createElement('p');
  note.className = 'map__info-text';
  note.style.textAlign = 'center';
  note.textContent = 'MonsterQuest · Phase 1';
  content.appendChild(note);
}

/* ------------------------------------------------------------------ */
/*  Reiter 2: Datenbank                                                */
/* ------------------------------------------------------------------ */

function baueDatenbank(content, screen, neuZeichnen) {
  content.appendChild(namePanel(neuZeichnen));
  content.appendChild(spielstandBlock());
}

/**
 * Der Name des Spielers. Er steht oben in der Spielerleiste und - wenn eine
 * Datenbank eingetragen ist - in deiner Übersicht statt der langen Nummer.
 */
function namePanel(neuZeichnen) {
  const block = document.createElement('div');
  block.className = 'panel';
  block.innerHTML = '<div class="panel__title">Dein Name</div>';

  const row = document.createElement('div');
  row.className = 'setting-row setting-row--breit';
  row.innerHTML = `
    <span class="setting-row__label">
      <span class="setting-row__hint" id="name-befund">So erscheinst du im Spiel und in der Übersicht.</span>
    </span>
  `;

  const feld = document.createElement('input');
  feld.type = 'text';
  feld.className = 'eingabe';
  feld.maxLength = NAME_MAX;
  feld.placeholder = 'Dein Name';
  feld.value = gameState.name;
  feld.autocapitalize = 'words';
  feld.autocomplete = 'off';
  feld.spellcheck = false;
  feld.setAttribute('aria-label', 'Dein Name');
  feld.style.flex = '1';

  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'btn btn--small btn--green';
  knopf.textContent = 'Speichern';

  function speichern() {
    setSpielername(feld.value);
    // Neu zeichnen, damit das Feld den gekürzten/getrimmten Namen zeigt.
    neuZeichnen();
    // Kurze Rückmeldung - der Reiter ist ja schon wieder aufgebaut, deshalb
    // per Timeout nach dem Neuzeichnen.
    setTimeout(() => {
      const befund = document.getElementById('name-befund');
      if (befund) befund.textContent = 'Gespeichert.';
    }, 0);
  }

  knopf.addEventListener('click', speichern);
  feld.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      speichern();
    }
  });

  const gruppe = document.createElement('span');
  gruppe.className = 'eingabe-gruppe';
  gruppe.style.flex = '1 1 100%';
  gruppe.append(feld, knopf);
  row.appendChild(gruppe);
  block.appendChild(row);

  return block;
}

/* ------------------------------------------------------------------ */
/*  Spielstand-Block (Datenbank-Reiter)                                */
/* ------------------------------------------------------------------ */

/** Meldet den Statustext wieder ab, wenn der Bildschirm oder Reiter wechselt. */
let abmelden = null;

function melderAbmelden() {
  if (abmelden) {
    abmelden();
    abmelden = null;
  }
}

/** Wie der Zustand aus cloud.js auf Deutsch heisst. */
const STATUS_TEXT = {
  aus: 'Nur auf diesem Gerät gespeichert.',
  bereit: 'Mit der Datenbank verbunden.',
  sendet: 'Wird gespeichert …',
  gespeichert: 'In der Datenbank gespeichert.',
  wartet: 'Kein Netz - wird nachgeholt.',
  fehler: 'Die Datenbank ist gerade nicht erreichbar. Dein Spielstand liegt sicher auf dem Gerät.',
};

/**
 * Der Block "Spielstand": zeigt, ob der Stand in der Datenbank liegt, und
 * bringt ihn mit einem kurzen Code auf ein anderes Geraet.
 */
function spielstandBlock() {
  const block = document.createElement('div');
  block.className = 'panel';
  block.innerHTML = '<div class="panel__title">Spielstand</div>';

  const zustand = document.createElement('p');
  zustand.className = 'setting-row__hint';
  zustand.id = 'cloud-zustand';
  block.appendChild(zustand);

  if (!cloudAktiv()) {
    zustand.textContent = STATUS_TEXT.aus;
    const hinweis = document.createElement('p');
    hinweis.className = 'setting-row__hint';
    hinweis.style.marginTop = '6px';
    hinweis.textContent =
      'Eine Datenbank ist noch nicht eingetragen. Wie das geht, steht in datenbank/ANLEITUNG.md.';
    block.appendChild(hinweis);
    return block;
  }

  abmelden = cloudBeobachten((status) => {
    zustand.textContent = STATUS_TEXT[status] ?? status;
  });

  /* --- Auf ein anderes Geraet mitnehmen --- */
  const raus = document.createElement('div');
  raus.className = 'setting-row';
  raus.innerHTML = `
    <span class="setting-row__label">
      <span class="setting-row__name">Auf ein anderes Gerät</span>
      <span class="setting-row__hint" id="code-anzeige">Code erstellen und dort eingeben.</span>
    </span>
  `;
  const codeKnopf = document.createElement('button');
  codeKnopf.type = 'button';
  codeKnopf.className = 'btn btn--small';
  codeKnopf.textContent = 'Code';
  codeKnopf.addEventListener('click', async () => {
    const anzeige = raus.querySelector('#code-anzeige');
    codeKnopf.disabled = true;
    anzeige.textContent = 'Wird erstellt …';
    try {
      const code = await cloudCodeErstellen();
      anzeige.innerHTML = `<strong class="spielstand-code">${code}</strong> · 30 Minuten gültig`;
    } catch (fehler) {
      console.warn('Code konnte nicht erstellt werden:', fehler);
      anzeige.textContent = 'Hat nicht geklappt. Später noch einmal versuchen.';
    } finally {
      codeKnopf.disabled = false;
    }
  });
  raus.appendChild(codeKnopf);
  block.appendChild(raus);

  /* --- Von einem anderen Geraet holen --- */
  const rein = document.createElement('div');
  // --breit: Feld und Knopf kommen unter die Beschriftung. Nebeneinander
  // bliebe fuer "Von einem anderen Geraet" nur eine schmale Spalte.
  rein.className = 'setting-row setting-row--breit';
  rein.innerHTML = `
    <span class="setting-row__label">
      <span class="setting-row__name">Von einem anderen Gerät</span>
      <span class="setting-row__hint" id="hol-befund">Code vom anderen Gerät eintippen.</span>
    </span>
  `;
  const feld = document.createElement('input');
  feld.type = 'text';
  feld.className = 'eingabe eingabe--code';
  feld.maxLength = 8;
  feld.placeholder = 'ABCD2345';
  feld.autocapitalize = 'characters';
  feld.autocomplete = 'off';
  feld.spellcheck = false;
  feld.setAttribute('aria-label', 'Übertragungscode');

  const holKnopf = document.createElement('button');
  holKnopf.type = 'button';
  holKnopf.className = 'btn btn--small btn--green';
  holKnopf.textContent = 'Holen';
  holKnopf.addEventListener('click', async () => {
    const befund = rein.querySelector('#hol-befund');
    const code = feld.value.trim().toUpperCase();
    if (code.length !== 8) {
      befund.textContent = 'Der Code hat genau 8 Zeichen.';
      return;
    }
    holKnopf.disabled = true;
    befund.textContent = 'Wird geholt …';
    try {
      const ergebnis = await cloudCodeEinloesen(code);
      if (!ergebnis) {
        befund.textContent = 'Der Code stimmt nicht oder ist abgelaufen.';
        return;
      }
      spielstandUebernehmenVonCode(ergebnis);
      showScreen('start');
    } catch (fehler) {
      console.warn('Spielstand konnte nicht geholt werden:', fehler);
      befund.textContent = 'Hat nicht geklappt. Später noch einmal versuchen.';
    } finally {
      holKnopf.disabled = false;
    }
  });

  const gruppe = document.createElement('span');
  gruppe.className = 'eingabe-gruppe';
  gruppe.append(feld, holKnopf);
  rein.appendChild(gruppe);
  block.appendChild(rein);

  const warnung = document.createElement('p');
  warnung.className = 'setting-row__hint';
  warnung.style.marginTop = '8px';
  warnung.textContent =
    'Achtung: Der geholte Spielstand ersetzt den Stand auf diesem Gerät.';
  block.appendChild(warnung);

  return block;
}

/**
 * Sagt in einem Satz, warum man nichts hört.
 * Der häufigste Grund ist der Stummschalter des Geräts - und genau den
 * sieht man dem Spiel nicht an.
 */
function befundText(status) {
  if (!status.moeglich) return 'Dieser Browser kann keinen Ton abspielen.';
  if (!status.klaengeAn) return 'Die Klänge sind oben ausgeschaltet.';
  if (!status.aufgebaut) return 'Der Ton ist noch nicht gestartet. Tippe noch einmal.';
  if (status.zustand !== 'running') {
    return `Der Ton ist angehalten (${status.zustand}). Tippe noch einmal.`;
  }
  return 'Der Ton läuft. Hörst du nichts, prüfe die Lautstärke und den '
    + 'Stummschalter: Kontrollzentrum öffnen und das Glockensymbol ausschalten.';
}

/** Sicherheitsabfrage, damit niemand aus Versehen alles löscht. */
function askReset(screen) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay__box">
      <div class="overlay__icon">⚠️</div>
      <h3 class="overlay__title">Wirklich zurücksetzen?</h3>
      <p class="overlay__text">
        Alle Level, Sterne und Münzen gehen verloren. Das lässt sich nicht rückgängig machen.
      </p>
      <div class="overlay__actions">
        <button class="btn btn--ghost" id="btn-cancel" type="button">Abbrechen</button>
        <button class="btn btn--danger" id="btn-confirm" type="button">Ja, alles löschen</button>
      </div>
    </div>
  `;

  overlay.querySelector('#btn-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#btn-confirm').addEventListener('click', () => {
    resetProgress();
    showScreen('start');
  });

  screen.appendChild(overlay);
}

/**
 * Wendet die Einstellungen auf die Seite an.
 * Ist "Animationen" aus, bekommt der Körper eine Klasse, die alle
 * Animationen abschaltet (siehe css/base.css).
 */
export function applySettings() {
  document.body.classList.toggle('no-animations', !gameState.settings.animations);
  tonEinstellungenAnwenden();
}
