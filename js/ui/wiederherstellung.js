/**
 * 🔑 Wiederherstellungs-Code: anzeigen, erstellen und daran erinnern.
 *
 * Der Code (z. B. K7QM-X2PA-9RTD) holt den Spielstand jederzeit zurück -
 * auch wenn Safari die Daten im Browser gelöscht hat. Die Regeln stehen in
 * js/core/cloud.js und datenbank/schema.sql; hier ist nur die Anzeige:
 *   - wiederherstellungZeile(): die Zeile in den Einstellungen
 *   - sicherungErinnern(): ein Fenster auf der Startseite für alle, die
 *     schon etwas erspielt, aber noch keinen Code haben (höchstens einmal
 *     pro Woche)
 */

import {
  cloudAktiv,
  cloudWiederherstellungErstellen,
  cloudWiederherstellungStatus,
  wiederherstellungGemerkt,
} from '../core/cloud.js';
import { geraetOnline } from '../core/netz.js';
import { aktuellerScreenName } from '../core/screens.js';
import { gameState, saveProgress } from '../core/state.js';

/** Wann zuletzt erinnert wurde (ms) - nur auf diesem Gerät. */
const ERINNERT_KEY = 'monsterquest.wiederherstellung.erinnert';
const WOCHE = 7 * 24 * 60 * 60 * 1000;
/** Ab so vielen geschafften Kämpfen lohnt sich die Sicherung. */
const AB_KAEMPFEN = 3;

/** Erstellt einen Code; vorher den Spielstand sicher hochschicken. */
async function erstellen() {
  saveProgress();
  return cloudWiederherstellungErstellen();
}

/** Kopiert den Code und sagt am Knopf Bescheid. */
async function kopieren(knopf, code) {
  try {
    await navigator.clipboard.writeText(code);
    knopf.textContent = '✔ Kopiert';
  } catch {
    knopf.textContent = code;
  }
}

/** Die Zeile "🔑 Wiederherstellungs-Code" in den Einstellungen. */
export function wiederherstellungZeile() {
  const zeile = document.createElement('div');
  zeile.className = 'setting-row setting-row--breit';
  let neuSicher = false;

  function zeichnen(code, schonWoanders = false) {
    zeile.innerHTML = `
      <span class="setting-row__label">
        <span class="setting-row__name">🔑 Wiederherstellungs-Code</span>
        <span class="setting-row__hint" data-text>${code
          ? `<strong class="spielstand-code">${code}</strong><br>Aufschreiben oder abfotografieren! Damit holst du deinen Spielstand immer zurück - unter „Von einem anderen Gerät“.`
          : schonWoanders
            ? 'Du hast schon einen Code (auf einem anderen Gerät erstellt). Ein neuer ersetzt ihn.'
            : 'Holt deinen Spielstand immer zurück - auch wenn dieses Gerät alles vergisst. Läuft nie ab.'}</span>
      </span>
      <span class="eingabe-gruppe">
        ${code ? '<button class="btn btn--small" type="button" data-aktion="kopieren">📋 Kopieren</button>' : ''}
        <button class="btn btn--small${code ? ' btn--ghost' : ' btn--green'}" type="button" data-aktion="neu">${code || schonWoanders ? 'Neuer Code' : 'Code erstellen'}</button>
      </span>
    `;
    zeile.querySelector('[data-aktion="kopieren"]')?.addEventListener('click', (e) => kopieren(e.currentTarget, code));
    const neu = zeile.querySelector('[data-aktion="neu"]');
    neu.addEventListener('click', async () => {
      // Ein neuer Code macht den alten ungültig - erst nachfragen.
      if ((code || schonWoanders) && !neuSicher) {
        neuSicher = true;
        neu.textContent = 'Alter Code wird ungültig - sicher?';
        return;
      }
      neuSicher = false;
      neu.disabled = true;
      zeile.querySelector('[data-text]').textContent = 'Wird erstellt …';
      try {
        zeichnen(await erstellen());
      } catch (fehler) {
        console.warn('Wiederherstellungs-Code nicht erstellt:', fehler);
        zeile.querySelector('[data-text]').textContent = fehler?.status === 404
          ? 'Ist in der Datenbank noch nicht eingerichtet. (Für den Spielebauer: datenbank/schema.sql neu einspielen.)'
          : 'Hat nicht geklappt. Bist du online?';
        neu.disabled = false;
      }
    });
  }

  const gemerkt = wiederherstellungGemerkt();
  zeichnen(gemerkt);
  // Nichts gemerkt: Vielleicht gibt es auf einem anderen Gerät schon einen.
  if (!gemerkt && geraetOnline()) {
    cloudWiederherstellungStatus()
      .then((gibtEs) => {
        if (gibtEs && zeile.isConnected && !wiederherstellungGemerkt()) zeichnen(null, true);
      })
      .catch(() => {});
  }
  return zeile;
}

/* ------------------------------------------------------------------ */
/*  Erinnerung                                                         */
/* ------------------------------------------------------------------ */

function zuletztErinnert() {
  try {
    return Number(localStorage.getItem(ERINNERT_KEY)) || 0;
  } catch {
    return Date.now(); // ohne Speicher lieber nicht ständig nerven
  }
}

/**
 * Einmal nach dem Start (js/main.js): Wer schon etwas erspielt hat und
 * noch keinen Code hat, bekommt ein kleines Fenster - höchstens einmal
 * pro Woche, nur auf der Startseite, nur online.
 */
export async function sicherungErinnern() {
  if (!cloudAktiv() || !geraetOnline() || wiederherstellungGemerkt()) return;
  if ((gameState.clearedLevels?.length ?? 0) < AB_KAEMPFEN) return;
  if (Date.now() - zuletztErinnert() < WOCHE) return;
  if (aktuellerScreenName() !== 'lobby' || document.querySelector('.overlay')) return;
  try {
    if (await cloudWiederherstellungStatus()) return;
  } catch {
    return;
  }
  try {
    localStorage.setItem(ERINNERT_KEY, String(Date.now()));
  } catch {
    /* egal */
  }
  fensterZeigen();
}

function fensterZeigen() {
  const el = document.createElement('div');
  el.className = 'overlay overlay--sicherung';
  el.innerHTML = `
    <div class="overlay__box" role="dialog" aria-label="Spielstand sichern">
      <div class="overlay__icon">🔑</div>
      <h3 class="overlay__title">Sichere deinen Spielstand!</h3>
      <p class="overlay__text" data-text>
        Mit einem Wiederherstellungs-Code bekommst du deinen Spielstand immer zurück -
        auch auf einem neuen Handy oder wenn der Browser alles vergisst.
      </p>
      <div class="overlay__actions">
        <button class="btn btn--big btn--green" type="button" data-aktion="erstellen">Code erstellen</button>
        <button class="btn btn--ghost" type="button" data-aktion="spaeter">Später</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  const zu = () => el.remove();
  el.querySelector('[data-aktion="spaeter"]').addEventListener('click', zu);
  const knopf = el.querySelector('[data-aktion="erstellen"]');
  knopf.addEventListener('click', async () => {
    knopf.disabled = true;
    const text = el.querySelector('[data-text]');
    text.textContent = 'Wird erstellt …';
    try {
      const code = await erstellen();
      text.innerHTML = `<strong class="spielstand-code">${code}</strong><br><br>
        Schreib ihn auf oder mach ein Foto! Du findest ihn auch später unter Optionen → Datenbank.`;
      el.querySelector('.overlay__actions').innerHTML = `
        <button class="btn btn--big btn--green" type="button" data-aktion="fertig">Fertig</button>
        <button class="btn" type="button" data-aktion="kopieren">📋 Kopieren</button>`;
      el.querySelector('[data-aktion="fertig"]').addEventListener('click', zu);
      el.querySelector('[data-aktion="kopieren"]').addEventListener('click', (e) => kopieren(e.currentTarget, code));
    } catch (fehler) {
      console.warn('Wiederherstellungs-Code nicht erstellt:', fehler);
      text.textContent = 'Hat nicht geklappt. Du kannst es später unter Optionen → Datenbank nochmal versuchen.';
      knopf.disabled = false;
    }
  });
}
