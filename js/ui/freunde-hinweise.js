/**
 * Was von den Freunden kommt, egal auf welchem Bildschirm man gerade ist:
 *   - kurze Hinweise (neue Anfrage, angenommen, 2v2-Antwort)
 *   - das Fenster "X lädt dich zum 2v2 ein" mit Annehmen / Ablehnen
 *   - die Zahl am Freunde-Knopf der Spielerleiste
 *
 * Während eines Kampfes erscheint keine Einladung - sie wartet, bis man
 * wieder im Menü ist (oder läuft nach ein paar Minuten ab).
 */

import { aktuellerScreenName, showScreen } from '../core/screens.js';
import { spieleKlang } from '../core/audio.js';
import { codePruefen } from '../core/duell-sitzung.js';
import { einladungAntworten, freundeBeobachten, freundeMeldungen, freundeStarten, offeneAnzahl } from '../core/freunde.js';
import { zeigeHinweisToast } from './toast.js';
import { profilBild, profilText } from '../screens/freunde.js';
import { sicher } from './duell-ansicht.js';

/** Hier erscheint nie eine Einladung. */
const KEINE_EINLADUNG = ['battle', 'duell'];

/** Einladungen, die schon beantwortet oder weggeklickt wurden. */
const erledigt = new Set();
let fenster = null;

const MELDUNG = {
  anfrage: (p) => ({ icon: '👥', label: 'Neue Freundschaftsanfrage', text: `${p.name} möchte dein Freund sein` }),
  angenommen: (p) => ({ icon: '🤝', label: 'Anfrage angenommen', text: `${p.name} ist jetzt dein Freund!` }),
  einladung_angenommen: (p) => ({ icon: '⚔️', label: '2v2-Einladung angenommen', text: `${p.name} kommt in deine Lobby` }),
  einladung_abgelehnt: (p) => ({ icon: '✋', label: '2v2-Einladung abgelehnt', text: `${p.name} kann gerade nicht` }),
};

/** Einmal beim Start (js/main.js). Ohne Datenbank passiert nichts. */
export function freundeHinweiseStarten() {
  freundeMeldungen(({ art, profil }) => {
    const m = MELDUNG[art]?.(profil);
    if (!m) return;
    spieleKlang('aufgabe');
    zeigeHinweisToast(m);
  });
  freundeBeobachten((lage) => {
    abzeichenSetzen();
    einladungPruefen(lage);
  });
  freundeStarten();
}

/** Die Zahl am Freunde-Knopf (js/ui/hud.js) auf den neuesten Stand. */
export function abzeichenSetzen() {
  const zahl = offeneAnzahl();
  document.querySelectorAll('[data-freunde-zahl]').forEach((el) => {
    el.textContent = zahl > 9 ? '9+' : String(zahl);
    el.hidden = zahl === 0;
  });
}

function einladungPruefen(lage) {
  const imKampf = KEINE_EINLADUNG.includes(aktuellerScreenName());
  if (fenster) {
    // Im Kampf weg damit - sie kommt danach wieder, solange sie gilt.
    if (imKampf || !lage?.einladungen.some((e) => e.id === fenster.id)) fensterZu();
    return;
  }
  if (imKampf) return;
  const einladung = lage?.einladungen.find((e) => !erledigt.has(e.id));
  if (einladung) fensterAuf(einladung);
}

function fensterZu() {
  clearInterval(fenster?.uhr);
  fenster?.el.remove();
  fenster = null;
}

function fensterAuf(einladung) {
  const el = document.createElement('div');
  el.className = 'overlay overlay--einladung';
  el.innerHTML = `
    <div class="overlay__box einladung" role="dialog" aria-label="2v2-Einladung">
      <span class="einladung__bild"></span>
      <h3 class="overlay__title">2v2-Einladung!</h3>
      <p class="overlay__text"><strong>${sicher(einladung.name)}</strong> lädt dich zum 2v2 Monster-Duell ein.</p>
      <p class="duell-klein">${profilText(einladung)}</p>
      <p class="duell-klein einladung__zeit"></p>
      <div class="overlay__actions">
        <button class="btn btn--big btn--green" type="button" data-aktion="annehmen">✔ Annehmen</button>
        <button class="btn btn--ghost" type="button" data-aktion="ablehnen">Ablehnen</button>
      </div>
    </div>
  `;
  el.querySelector('.einladung__bild').replaceWith(profilBild(einladung));
  document.body.appendChild(el);
  spieleKlang('aufgabe');

  const ende = Date.now() + einladung.sekunden * 1000;
  const zeit = el.querySelector('.einladung__zeit');
  const ticken = () => {
    const rest = Math.max(0, Math.round((ende - Date.now()) / 1000));
    zeit.textContent = `Gilt noch ${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`;
    if (rest === 0) {
      erledigt.add(einladung.id);
      fensterZu();
    }
  };
  fenster = { id: einladung.id, el, uhr: setInterval(ticken, 1000) };
  ticken();

  const knoepfe = el.querySelectorAll('button');
  const antworten = async (annehmen) => {
    knoepfe.forEach((k) => (k.disabled = true));
    erledigt.add(einladung.id);
    let antwort = null;
    try {
      antwort = await einladungAntworten(einladung.id, annehmen);
    } catch (fehler) {
      console.warn('Einladung nicht beantwortet:', fehler);
      erledigt.delete(einladung.id); // nochmal versuchen dürfen
      knoepfe.forEach((k) => (k.disabled = false));
      zeigeHinweisToast({ icon: '📡', label: 'Hat nicht geklappt', text: 'Bist du online? Versuch es gleich nochmal.' });
      return;
    }
    fensterZu();
    if (!annehmen) return;
    const code = codePruefen(antwort);
    if (!code) {
      zeigeHinweisToast({ icon: '⌛', label: 'Einladung abgelaufen', text: 'Die Einladung gilt nicht mehr.' });
      return;
    }
    // Derselbe Weg wie mit dem Einladungscode von Hand.
    showScreen('duell-lobby', { beitreten: code });
  };
  el.querySelector('[data-aktion="annehmen"]').addEventListener('click', () => antworten(true));
  el.querySelector('[data-aktion="ablehnen"]').addEventListener('click', () => antworten(false));
}
