/**
 * 👥 Freunde: die eigene Freundes-ID, die Freundesliste, Anfragen und
 * "Freund hinzufügen". Erreichbar über den Freunde-Knopf in der
 * Spielerleiste.
 *
 * Diese Datei ist reine Darstellung - was gilt, steht in
 * js/core/freunde.js und datenbank/schema.sql.
 */

import { showScreen } from '../core/screens.js';
import { createScenery } from '../ui/scenery.js';
import { createTopbar } from '../ui/hud.js';
import { spieleKlang } from '../core/audio.js';
import { MONSTERS } from '../data/monsters.js';
import { getSkin } from '../data/items.js';
import { figurBild, sicher } from '../ui/duell-ansicht.js';
import { zeigeHinweisToast } from '../ui/toast.js';
import {
  anfrageAntworten,
  anfrageSenden,
  anfrageZurueckziehen,
  freundEntfernen,
  freundSuchen,
  freundeAktualisieren,
  freundeBeobachten,
  freundeLage,
  freundeSortiert,
  freundeZustand,
  kennungPruefen,
} from '../core/freunde.js';

/** Der zuletzt gewählte Reiter - bleibt beim Zurückkommen erhalten. */
let reiter = 'freunde';
let abmelden = null;

/** So sieht man, ob jemand da ist. */
export const STATUS = {
  online: { icon: '🟢', text: 'Online' },
  kampf: { icon: '🟡', text: 'Im Kampf' },
  offline: { icon: '⚫', text: 'Offline' },
};

/** Antworten der Datenbank beim Senden einer Anfrage, für Menschen. */
const ANFRAGE_TEXT = {
  gesendet: 'Freundschaftsanfrage gesendet!',
  unbekannt: 'Zu dieser Freundes-ID gibt es keinen Spieler.',
  selbst: 'Das ist deine eigene Freundes-ID.',
  schon_freunde: 'Ihr seid schon befreundet.',
  schon_gesendet: 'Du hast schon eine Anfrage geschickt.',
  gegenanfrage: 'Dieser Spieler hat dir schon eine Anfrage geschickt - nimm sie unter „Anfragen“ an.',
  zu_viele: 'Du hast gerade zu viele offene Anfragen oder Freunde.',
};

/** Figur, Level und Skin eines Spielers als eine Zeile Text. */
export function profilText(p) {
  const monster = MONSTERS[p.figur] ?? MONSTERS.timo;
  const skin = p.skin ? getSkin(p.skin) : null;
  return `Lv ${Number(p.level) || 1} · ${monster.icon} ${sicher(monster.name)}${skin && skin.id !== 'skin-standard' ? ` · ${sicher(skin.name)}` : ''}`;
}

/** Die Figur eines Spielers - mit Skin, wenn dieses Spiel ihn kennt. */
export function profilBild(p) {
  const monster = MONSTERS[p.figur] ?? MONSTERS.timo;
  const span = document.createElement('span');
  span.className = 'freund__bild';
  span.appendChild(figurBild(monster, p.skin ? getSkin(p.skin) ?? null : null));
  return span;
}

export const freundeScreen = {
  mount(root) {
    const screen = document.createElement('div');
    screen.className = 'screen screen--page screen--freunde';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar('👥 Freunde', () => showScreen('start')));
    const content = document.createElement('div');
    content.className = 'page__content freunde';
    screen.appendChild(content);
    root.appendChild(screen);

    content.innerHTML = `
      <div class="panel panel--tight freunde-ich"></div>
      <p class="duell-hinweis freunde__hinweis" hidden></p>
      <div class="tabs freunde__tabs" role="tablist">
        <button class="tab" type="button" data-reiter="freunde">Meine Freunde</button>
        <button class="tab" type="button" data-reiter="anfragen">Anfragen</button>
        <button class="tab" type="button" data-reiter="hinzufuegen">Hinzufügen</button>
      </div>
      <div class="panel freunde__inhalt"></div>
    `;
    const kopf = content.querySelector('.freunde-ich');
    const hinweis = content.querySelector('.freunde__hinweis');
    const inhalt = content.querySelector('.freunde__inhalt');
    const knoepfe = [...content.querySelectorAll('[data-reiter]')];
    knoepfe.forEach((k) => k.addEventListener('click', () => {
      reiter = k.dataset.reiter;
      zeichnen(true);
    }));

    /** Baut alles neu - das Hinzufügen-Formular nur, wenn nötig (Tippen nicht stören). */
    function zeichnen(alles = false) {
      const lage = freundeLage();
      const zustand = freundeZustand();
      const offen = lage?.erhalten.length ?? 0;
      knoepfe.forEach((k) => k.classList.toggle('is-active', k.dataset.reiter === reiter));
      knoepfe[0].textContent = `Meine Freunde${lage ? ` (${lage.freunde.length})` : ''}`;
      knoepfe[1].innerHTML = `Anfragen${offen ? ` <span class="freunde__zahl">${offen}</span>` : ''}`;

      kopf.innerHTML = lage?.kennung
        ? `<div class="freunde-ich__text">
             <span class="freunde-ich__label">Deine Freundes-ID</span>
             <strong class="freunde-ich__id">${sicher(lage.kennung)}</strong>
           </div>
           <button class="btn btn--small" data-aktion="kopieren" type="button">📋 Kopieren</button>`
        : `<p class="map__info-text">${hinweisText(zustand)}</p>
           ${zustand === 'fehler' ? '<button class="btn btn--small" type="button" data-aktion="nochmal">Nochmal versuchen</button>' : ''}`;
      kopf.querySelector('[data-aktion="kopieren"]')?.addEventListener('click', async (event) => {
        try {
          await navigator.clipboard.writeText(lage.kennung);
          event.target.textContent = '✔ Kopiert';
        } catch {
          event.target.textContent = lage.kennung;
        }
      });
      kopf.querySelector('[data-aktion="nochmal"]')?.addEventListener('click', () => freundeAktualisieren());

      // Die Liste ist da, aber gerade veraltet: kurz sagen, warum die Knöpfe gesperrt sind.
      hinweis.hidden = !lage || !['offline', 'fehler'].includes(zustand);
      if (!hinweis.hidden) hinweis.textContent = hinweisText(zustand);

      if (!lage) {
        inhalt.innerHTML = '';
        inhalt.hidden = true;
        return;
      }
      inhalt.hidden = false;
      if (reiter === 'freunde') freundeZeichnen(inhalt, lage, zustand);
      else if (reiter === 'anfragen') anfragenZeichnen(inhalt, lage, zustand);
      else if (alles || !inhalt.querySelector('form')) hinzufuegenZeichnen(inhalt, zustand);
    }

    abmelden?.();
    abmelden = freundeBeobachten(() => {
      if (content.isConnected) zeichnen();
    });
    zeichnen(true);
    freundeAktualisieren();
  },

  unmount() {
    abmelden?.();
    abmelden = null;
  },
};

/** Warum es (noch) keine Liste gibt. */
function hinweisText(zustand) {
  return {
    aus: 'Freunde brauchen die Online-Datenbank. Sie ist in diesem Spiel nicht eingerichtet.',
    offline: '📡 Du bist offline. Freunde hinzufügen und einladen geht wieder, sobald du online bist. Alles andere - auch das Solo-2v2 - funktioniert weiter.',
    fehlt: 'Die Freundesliste ist in der Datenbank noch nicht eingerichtet. (Für den Spielebauer: datenbank/schema.sql einmal neu einspielen.)',
    fehler: 'Die Freundesliste ist gerade nicht erreichbar. Bist du online?',
  }[zustand] ?? 'Lädt …';
}

/** Online-Aktionen sperren, solange kein Netz da ist. */
function gesperrt(zustand) {
  return zustand === 'offline' ? 'disabled' : '';
}

/** Führt eine Aktion aus und sperrt dabei den Knopf. */
async function mitKnopf(knopf, aktion) {
  knopf.disabled = true;
  try {
    return await aktion();
  } catch (fehler) {
    console.warn('Freunde-Aktion fehlgeschlagen:', fehler);
    zeigeHinweisToast({ icon: '📡', label: 'Hat nicht geklappt', text: 'Bist du online? Versuch es gleich nochmal.' });
    return null;
  } finally {
    if (knopf.isConnected) knopf.disabled = false;
  }
}

/* ---------------- Meine Freunde ---------------- */
function freundeZeichnen(inhalt, lage, zustand) {
  const liste = freundeSortiert(lage.freunde);
  if (!liste.length) {
    inhalt.innerHTML = `
      <div class="panel__title">Meine Freunde</div>
      <p class="map__info-text">Noch keine Freunde. Gib unter „Hinzufügen“ die Freundes-ID eines Freundes ein - oder schick ihm deine.</p>`;
    return;
  }
  inhalt.innerHTML = `
    <div class="panel__title">Meine Freunde</div>
    <ul class="freunde__liste">
      ${liste.map((f) => `
        <li class="freund freund--${f.status}" data-kennung="${sicher(f.kennung)}">
          <span class="freund__platz"></span>
          <span class="freund__text">
            <span class="freund__name">${sicher(f.name)}</span>
            <span class="freund__info">${profilText(f)}</span>
            <span class="freund__status">${STATUS[f.status]?.icon ?? '⚫'} ${STATUS[f.status]?.text ?? 'Offline'} · ${sicher(f.kennung)}</span>
          </span>
          <span class="freund__knoepfe">
            <button class="btn btn--small btn--green" type="button" data-aktion="einladen" ${gesperrt(zustand)}>⚔️ Zum 2v2 einladen</button>
            <button class="btn btn--small btn--ghost" type="button" data-aktion="entfernen" ${gesperrt(zustand)}>Entfernen</button>
          </span>
        </li>`).join('')}
    </ul>`;
  inhalt.querySelectorAll('.freund').forEach((zeile, i) => {
    const f = liste[i];
    zeile.querySelector('.freund__platz').replaceWith(profilBild(f));
    zeile.querySelector('[data-aktion="einladen"]').addEventListener('click', () => {
      showScreen('duell-lobby', { einladen: f.kennung, einladenName: f.name });
    });
    const weg = zeile.querySelector('[data-aktion="entfernen"]');
    weg.addEventListener('click', async () => {
      // Erst nachfragen - ein Tipp aus Versehen soll keinen Freund kosten.
      if (!weg.classList.contains('ist-sicher')) {
        weg.classList.add('ist-sicher');
        weg.textContent = 'Wirklich entfernen?';
        return;
      }
      const ok = await mitKnopf(weg, () => freundEntfernen(f.kennung));
      if (ok !== null) zeigeHinweisToast({ icon: '👋', label: 'Freund entfernt', text: f.name });
    });
  });
}

/* ---------------- Anfragen ---------------- */
function anfragenZeichnen(inhalt, lage, zustand) {
  inhalt.innerHTML = `
    <div class="panel__title">Erhaltene Anfragen</div>
    ${lage.erhalten.length
      ? `<ul class="freunde__liste">${lage.erhalten.map((p) => `
          <li class="freund" data-kennung="${sicher(p.kennung)}">
            <span class="freund__platz"></span>
            <span class="freund__text">
              <span class="freund__name">${sicher(p.name)}</span>
              <span class="freund__info">${profilText(p)}</span>
              <span class="freund__status">${sicher(p.kennung)}</span>
            </span>
            <span class="freund__knoepfe">
              <button class="btn btn--small btn--green" type="button" data-aktion="annehmen" ${gesperrt(zustand)}>✔ Annehmen</button>
              <button class="btn btn--small btn--ghost" type="button" data-aktion="ablehnen" ${gesperrt(zustand)}>Ablehnen</button>
            </span>
          </li>`).join('')}</ul>`
      : '<p class="map__info-text">Keine neuen Anfragen.</p>'}
    <div class="panel__title freunde__unter">Gesendete Anfragen</div>
    ${lage.gesendet.length
      ? `<ul class="freunde__liste">${lage.gesendet.map((p) => `
          <li class="freund" data-kennung="${sicher(p.kennung)}">
            <span class="freund__platz"></span>
            <span class="freund__text">
              <span class="freund__name">${sicher(p.name)}</span>
              <span class="freund__status">⏳ wartet auf Antwort · ${sicher(p.kennung)}</span>
            </span>
            <span class="freund__knoepfe">
              <button class="btn btn--small btn--ghost" type="button" data-aktion="zurueckziehen" ${gesperrt(zustand)}>Zurückziehen</button>
            </span>
          </li>`).join('')}</ul>`
      : '<p class="map__info-text">Keine offenen Anfragen.</p>'}
  `;
  const profile = [...lage.erhalten, ...lage.gesendet];
  inhalt.querySelectorAll('.freund').forEach((zeile, i) => {
    const p = profile[i];
    zeile.querySelector('.freund__platz').replaceWith(profilBild(p));
    zeile.querySelector('[data-aktion="annehmen"]')?.addEventListener('click', async (e) => {
      if (await mitKnopf(e.currentTarget, () => anfrageAntworten(p.kennung, true))) {
        spieleKlang('aufgabe');
        zeigeHinweisToast({ icon: '🤝', label: 'Neuer Freund', text: `${p.name} ist jetzt dein Freund!` });
      }
    });
    zeile.querySelector('[data-aktion="ablehnen"]')?.addEventListener('click', (e) => mitKnopf(e.currentTarget, () => anfrageAntworten(p.kennung, false)));
    zeile.querySelector('[data-aktion="zurueckziehen"]')?.addEventListener('click', (e) => mitKnopf(e.currentTarget, () => anfrageZurueckziehen(p.kennung)));
  });
}

/* ---------------- Hinzufügen ---------------- */
function hinzufuegenZeichnen(inhalt, zustand) {
  inhalt.innerHTML = `
    <div class="panel__title">Freund hinzufügen</div>
    <p class="map__info-text">Frag deinen Freund nach seiner Freundes-ID (steht bei ihm oben unter „Freunde“).</p>
    <form class="duell-code freunde__suche" autocomplete="off">
      <input class="duell-code__feld" name="kennung" inputmode="text" maxlength="12" placeholder="MQ-12345"
             aria-label="Freundes-ID" autocapitalize="characters" spellcheck="false" ${gesperrt(zustand)}>
      <button class="btn" type="submit" ${gesperrt(zustand)}>🔍 Suchen</button>
    </form>
    <div class="freunde__ergebnis" aria-live="polite"></div>
  `;
  const form = inhalt.querySelector('form');
  const ergebnis = inhalt.querySelector('.freunde__ergebnis');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const kennung = kennungPruefen(form.kennung.value);
    if (!kennung) {
      spieleKlang('gesperrt');
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
      ergebnis.innerHTML = '<p class="duell-hinweis">Eine Freundes-ID sieht so aus: MQ-12345</p>';
      return;
    }
    form.kennung.value = kennung;
    ergebnis.innerHTML = '<p class="map__info-text">Suche …</p>';
    const knopf = form.querySelector('button');
    const profil = await mitKnopf(knopf, () => freundSuchen(kennung));
    if (!ergebnis.isConnected) return;
    if (!profil) {
      ergebnis.innerHTML = `<p class="duell-hinweis">${ANFRAGE_TEXT.unbekannt}</p>`;
      return;
    }
    const status = profil.ich ? ANFRAGE_TEXT.selbst
      : profil.freund ? ANFRAGE_TEXT.schon_freunde
        : profil.gesendet ? ANFRAGE_TEXT.schon_gesendet
          : profil.erhalten ? ANFRAGE_TEXT.gegenanfrage : '';
    ergebnis.innerHTML = `
      <div class="freund freund--gefunden">
        <span class="freund__platz"></span>
        <span class="freund__text">
          <span class="freund__name">${sicher(profil.name)}</span>
          <span class="freund__info">${profilText(profil)}</span>
          <span class="freund__status">${sicher(profil.kennung)}</span>
        </span>
      </div>
      ${status
        ? `<p class="map__info-text freunde__meldung">${status}</p>`
        : '<button class="btn btn--big btn--green" type="button" data-aktion="senden">➕ Freundschaftsanfrage senden</button>'}
    `;
    ergebnis.querySelector('.freund__platz').replaceWith(profilBild(profil));
    ergebnis.querySelector('[data-aktion="senden"]')?.addEventListener('click', async (e) => {
      const knopf2 = e.currentTarget;
      const antwort = await mitKnopf(knopf2, () => anfrageSenden(profil.kennung));
      if (antwort === null || !ergebnis.isConnected) return;
      knopf2.replaceWith(Object.assign(document.createElement('p'), {
        className: 'map__info-text freunde__meldung',
        textContent: ANFRAGE_TEXT[antwort] ?? 'Hat nicht geklappt.',
      }));
      if (antwort === 'gesendet') spieleKlang('aufgabe');
    });
  });
}
