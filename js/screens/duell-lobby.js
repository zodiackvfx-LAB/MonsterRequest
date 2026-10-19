/**
 * Die 2v2-Lobby.
 *
 * Erst wählt man, WIE gespielt wird: Lobby erstellen (Einladungscode an
 * einen Freund), Code eingeben, oder solo mit einer KI-Partnerin. In einer
 * eigenen Lobby kann man außerdem Freunde aus der Freundesliste einladen -
 * die Einladung trägt einfach den Einladungscode (js/core/freunde.js). Danach
 * zeigt die Lobby beide Spieler (Figur, Level, Boss-Kraft, Deck, bereit?)
 * und den Kampf (Welt, Gegnerteam, Boss-Duell, Schwierigkeit). Sind beide
 * bereit, startet der Kampf auf beiden Geräten.
 *
 * Diese Datei ist reine Darstellung. Was in der Lobby gilt, steht in
 * js/core/duell-sitzung.js.
 */

import { showScreen } from '../core/screens.js';
import { createScenery } from '../ui/scenery.js';
import { createTopbar } from '../ui/hud.js';
import { spieleKlang } from '../core/audio.js';
import { gameState, figurFrei, getAktiveFigur, saveProgress, setAktiveFigur, setBossKraft } from '../core/state.js';
import { MONSTERS, getMonster } from '../data/monsters.js';
import { WORLDS, getWorld } from '../data/worlds.js';
import { getKraft } from '../data/kraefte.js';
import { DUELL, DUELL_GRADE, GEGNER_PAARE, ROLLEN, paarGegner } from '../data/duell.js';
import { empfohlenesLevel, teamAusgleich } from '../core/duell-aufbau.js';
import { aktuelleSitzung, codePruefen, letzteLobby, sitzungStarten } from '../core/duell-sitzung.js';
import { duellBelohnung } from '../core/duell-belohnung.js';
import { geraetOnline, netzArt } from '../core/netz.js';
import { createSprite } from '../ui/sprite.js';
import { einladungSenden, freundeAktualisieren, freundeBeobachten, freundeLage, freundeMoeglich, freundeSortiert, freundeZustand } from '../core/freunde.js';
import { zeigeHinweisToast } from '../ui/toast.js';
import { STATUS } from './freunde.js';
import { deckReihe, figurBild, rueckkehrEntfernen, rueckkehrZeigen, sicher, skinAusProfil } from '../ui/duell-ansicht.js';

/** Abmelde-Funktionen der gerade gezeigten Lobby. */
let aufraeumen = [];
/** Wohin der Bildschirm verlassen wird - zum Deck bleibt die Sitzung offen. */
let bleibtOffen = false;
/** Wer in welche Lobby (Code) schon eingeladen wurde - für "✔ Eingeladen". */
const eingeladen = new Map();

/** Die zuletzt gewählte Welt usw. - passend zum eigenen Fortschritt. */
function gemerkteWahl() {
  const w = gameState.duell?.wahl ?? {};
  return {
    welt: Math.min(Math.max(1, w.welt ?? gameState.unlockedWorld), gameState.unlockedWorld),
    paar: w.paar ?? 0,
    bossDuell: false,
    schwierigkeit: DUELL_GRADE.some((g) => g.id === w.schwierigkeit) ? w.schwierigkeit : 'normal',
  };
}

function wahlMerken(wahl) {
  gameState.duell.wahl = { ...gameState.duell.wahl, ...wahl };
  saveProgress();
}

/** Eine neue Sitzung mit den Einstellungen dieses Geräts. */
function starten(art, code = null) {
  const sitzung = sitzungStarten({
    art,
    code,
    wahl: gemerkteWahl(),
    belohnen: (daten) => duellBelohnung(daten),
  });
  if (art === 'solo') {
    const partner = gameState.duell?.wahl?.partner;
    const figur = partner && figurFrei(partner) ? partner : getAktiveFigur() === 'timo' && figurFrei('rocco') ? 'rocco' : 'timo';
    sitzung.partnerFigur(figur);
  }
  return sitzung;
}

export const duellLobbyScreen = {
  /**
   * @param {object} [params]
   * @param {string} [params.beitreten] - Code: gleich dieser Lobby beitreten
   *        (nach einer angenommenen Freundes-Einladung)
   * @param {string} [params.einladen] - Freundes-ID: eigene Lobby öffnen und
   *        diesen Freund einladen (aus der Freundesliste)
   */
  mount(root, params = {}) {
    rueckkehrEntfernen();
    bleibtOffen = false;

    const screen = document.createElement('div');
    screen.className = 'screen screen--page screen--duell-lobby';
    screen.appendChild(createScenery({ dimmed: true }));
    screen.appendChild(createTopbar(`${DUELL.icon} 2v2 Monster-Duell`, verlassen));
    const content = document.createElement('div');
    content.className = 'page__content duell-lobby';
    screen.appendChild(content);
    root.appendChild(screen);

    let sitzung = aktuelleSitzung();
    let abmelden = null;

    function verlassen() {
      sitzung?.verlassen();
      showScreen('start');
    }

    function verbinden(neu) {
      abmelden?.();
      sitzung = neu;
      if (!sitzung) {
        zeichnen();
        return;
      }
      // Eigene Figur, Deck oder Kraft könnten sich (z. B. im Deckmenü) geändert haben.
      sitzung.profilAktualisieren();
      abmelden = sitzung.beobachten(() => zeichnen());
      zeichnen();
    }
    aufraeumen.push(() => abmelden?.());

    /** Baut den Inhalt je nach Zustand neu. */
    function zeichnen() {
      if (!sitzung || sitzung.info.phase === 'geschlossen') {
        sitzung = null;
        auswahlZeichnen();
        return;
      }
      const info = sitzung.info;
      if (info.phase === 'match' || info.phase === 'ergebnis') {
        bleibtOffen = true;
        // Erst nach dem Aufbau wechseln - nie mitten in mount().
        setTimeout(() => {
          if (aktuelleSitzung() === sitzung) showScreen('duell');
        }, 0);
        return;
      }
      if (info.phase === 'verbinde') return verbindeZeichnen(info);
      if (info.phase === 'fehler') return fehlerZeichnen(info);
      lobbyZeichnen(info);
    }

    /* ---------------- Auswahl: wie wird gespielt? ---------------- */
    function auswahlZeichnen() {
      const onlineMoeglich = Boolean(netzArt()) && geraetOnline();
      const letzte = letzteLobby();
      content.innerHTML = `
        <div class="panel duell-intro">
          <div class="duell-intro__bild" aria-hidden="true"></div>
          <p class="map__info-text">
            Ihr kämpft <strong>zu zweit</strong> gegen <strong>zwei Monster</strong>. Jeder hat sein
            eigenes Deck und seine eigene Energie. Trefft ihr denselben Gegner kurz nacheinander,
            gibt es eine <strong>Team-Kombo</strong>!
          </p>
        </div>

        <div class="panel">
          <div class="panel__title">👥 Online mit einem Freund</div>
          ${onlineMoeglich
            ? `<button class="btn btn--big btn--green" data-aktion="erstellen" type="button">Lobby erstellen</button>
               <form class="duell-code" data-aktion="beitreten" autocomplete="off">
                 <input class="duell-code__feld" name="code" inputmode="text" maxlength="${DUELL.netz.codeLaenge + 2}"
                        placeholder="CODE" aria-label="Einladungscode" autocapitalize="characters" spellcheck="false">
                 <button class="btn" type="submit">Beitreten</button>
               </form>
               ${freundeMoeglich() ? '<button class="btn btn--small duell-letzte" data-aktion="freunde" type="button">👥 Freund aus der Freundesliste einladen</button>' : ''}
               ${letzte ? `<button class="btn btn--ghost btn--small duell-letzte" data-aktion="letzte" type="button">↩ Lobby ${sicher(letzte.code)} erneut betreten</button>` : ''}`
            : `<p class="map__info-text duell-hinweis">📡 Online-Koop braucht eine Internetverbindung. Solo mit KI-Partner geht immer - auch offline.</p>`}
        </div>

        <div class="panel">
          <div class="panel__title">🤖 Solo mit KI-Partner</div>
          <p class="map__info-text">Eine verbündete KI kämpft an deiner Seite - ganz ohne Internet.</p>
          <button class="btn btn--big" data-aktion="solo" type="button">Solo spielen</button>
        </div>
      `;
      const bild = content.querySelector('.duell-intro__bild');
      const ich = getMonster(getAktiveFigur());
      bild.appendChild(figurBild(ich, undefined));
      paarGegner(gameState.unlockedWorld, 0).forEach(({ gegner }) => bild.appendChild(createSprite(gegner)));

      content.querySelector('[data-aktion="erstellen"]')?.addEventListener('click', () => verbinden(starten('host')));
      // Eine eigene Lobby - darin steht dann die Freundesliste zum Einladen.
      content.querySelector('[data-aktion="freunde"]')?.addEventListener('click', () => verbinden(starten('host')));
      content.querySelector('[data-aktion="solo"]').addEventListener('click', () => verbinden(starten('solo')));
      content.querySelector('[data-aktion="letzte"]')?.addEventListener('click', () => verbinden(starten(letzte.art === 'host' ? 'host' : 'gast', letzte.code)));
      const form = content.querySelector('form[data-aktion="beitreten"]');
      form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const code = codePruefen(form.code.value);
        if (!code) {
          spieleKlang('gesperrt');
          form.classList.remove('shake');
          void form.offsetWidth;
          form.classList.add('shake');
          return;
        }
        verbinden(starten('gast', code));
      });
    }

    function verbindeZeichnen(info) {
      content.innerHTML = `
        <div class="panel duell-warten">
          <div class="duell-warten__kreis" aria-hidden="true"></div>
          <p class="overlay__text">${info.art === 'gast' ? `Suche Lobby <strong>${sicher(info.code)}</strong> …` : 'Verbinde …'}</p>
          <button class="btn btn--ghost" data-aktion="abbrechen" type="button">Abbrechen</button>
        </div>
      `;
      content.querySelector('[data-aktion="abbrechen"]').addEventListener('click', () => {
        sitzung.verlassen();
        verbinden(null);
      });
    }

    function fehlerZeichnen(info) {
      content.innerHTML = `
        <div class="panel duell-warten">
          <div class="overlay__icon">📡</div>
          <p class="overlay__text">${sicher(info.fehler)}</p>
          <button class="btn btn--big" data-aktion="zurueck" type="button">Zurück</button>
        </div>
      `;
      content.querySelector('[data-aktion="zurueck"]').addEventListener('click', () => {
        sitzung.schliessen();
        verbinden(null);
      });
    }

    /* ---------------- Die eigentliche Lobby ---------------- */
    function lobbyZeichnen(info) {
      const host = info.art !== 'gast';
      const solo = info.art === 'solo';
      const ich = info.spieler[info.ich];
      const partner = info.spieler[1 - info.ich];
      const profile = info.spieler.filter(Boolean).map((s) => s.profil);
      const teamLevel = profile.length ? Math.round(profile.reduce((s, p) => s + p.level, 0) / profile.length) : 1;
      const empfohlen = empfohlenesLevel(info.wahl.welt);
      const ausgleich = profile.length === 2 ? teamAusgleich(profile, info.wahl.welt) : null;
      const hoechsteWelt = Math.max(1, ...profile.map((p) => p.welt ?? 1));
      const paare = GEGNER_PAARE[info.wahl.welt] ?? [];
      const bossErlaubt = profile.some((p) => p.bossWelten?.includes(info.wahl.welt));
      const gegner = paarGegner(info.wahl.welt, info.wahl.paar, info.wahl.bossDuell);
      const beideBereit = info.spieler.every((s) => s?.bereit);

      content.innerHTML = `
        ${!solo ? `
          <div class="panel panel--tight duell-einladung">
            <div class="duell-einladung__text">
              <span class="duell-einladung__label">Einladungscode</span>
              <strong class="duell-einladung__code">${sicher(info.code)}</strong>
            </div>
            ${host ? `<div class="duell-einladung__knoepfe">
              <button class="btn btn--small" data-aktion="kopieren" type="button">📋 Kopieren</button>
              ${navigator.share ? '<button class="btn btn--small" data-aktion="teilen" type="button">📤 Teilen</button>' : ''}
            </div>` : `<span class="duell-verbindung ${info.partnerOnline ? 'ist-online' : ''}">${info.partnerOnline ? '● verbunden' : '○ warte …'}</span>`}
          </div>` : ''}

        ${info.hinweis ? `<p class="duell-hinweis duell-hinweis--band">${sicher(info.hinweis)}</p>` : ''}

        <div class="panel duell-team">
          <div class="panel__title">🔵 Team Blau</div>
          <div class="duell-team__reihe">
            ${spielerKarte(info.spieler[0], 0, info)}
            ${spielerKarte(info.spieler[1], 1, info)}
          </div>
        </div>

        ${host && !solo && !partner && freundeMoeglich() ? freundePanel(info.code) : ''}

        <div class="panel duell-wahl-panel">
          <div class="panel__title">🎯 Deine Figur und Boss-Kraft</div>
          <div class="duell-chips" data-gruppe="figur">
            ${Object.values(MONSTERS).map((m) => `
              <button class="duell-chip${ich?.profil.figur === m.id ? ' is-aktiv' : ''}" type="button" data-figur="${m.id}" ${figurFrei(m.id) ? '' : 'disabled'}>
                ${m.icon} ${sicher(m.name)}${figurFrei(m.id) ? '' : ' 🔒'}
              </button>`).join('')}
            <button class="duell-chip duell-chip--deck" type="button" data-aktion="deck">🃏 Deck bearbeiten</button>
          </div>
          <div class="duell-chips" data-gruppe="kraft">
            <button class="duell-chip${!ich?.profil.kraft ? ' is-aktiv' : ''}" type="button" data-kraft="">Keine Kraft</button>
            ${gameState.bossPowers.map((id) => getKraft(id)).filter(Boolean).map((k) => `
              <button class="duell-chip${ich?.profil.kraft === k.id ? ' is-aktiv' : ''}" type="button" data-kraft="${k.id}" title="${sicher(k.text)}">${k.icon} ${sicher(k.name)}</button>`).join('')}
          </div>
          ${solo ? `
            <div class="panel__title duell-unter">🤖 KI-Partner</div>
            <div class="duell-chips" data-gruppe="partner">
              ${Object.values(MONSTERS).filter((m) => figurFrei(m.id)).map((m) => `
                <button class="duell-chip${partner?.profil.figur === m.id ? ' is-aktiv' : ''}" type="button" data-partner="${m.id}">${m.icon} ${sicher(m.name)}</button>`).join('')}
            </div>` : ''}
        </div>

        <div class="panel duell-wahl-panel">
          <div class="panel__title">🗺️ Kampf ${host ? '' : '<small class="duell-klein">(wählt Spieler 1)</small>'}</div>
          <div class="duell-chips duell-chips--welten" data-gruppe="welt">
            ${WORLDS.filter((w) => w.id <= hoechsteWelt).map((w) => `
              <button class="duell-chip${info.wahl.welt === w.id ? ' is-aktiv' : ''}" type="button" data-welt="${w.id}" ${host ? '' : 'disabled'} title="${sicher(w.name)}">${w.icon} ${w.id}</button>`).join('')}
          </div>
          <div class="duell-chips" data-gruppe="paar">
            ${paare.map((p, i) => `
              <button class="duell-chip${!info.wahl.bossDuell && info.wahl.paar === i ? ' is-aktiv' : ''}" type="button" data-paar="${i}" ${host ? '' : 'disabled'}>${sicher(p.name)}</button>`).join('')}
            <button class="duell-chip duell-chip--boss${info.wahl.bossDuell ? ' is-aktiv' : ''}" type="button" data-boss="1" ${host && bossErlaubt ? '' : 'disabled'}
                    title="${bossErlaubt ? 'Boss und Untergebener' : 'Erst den Boss dieser Welt besiegen'}">👑 Boss-Duell${bossErlaubt ? '' : ' 🔒'}</button>
          </div>
          <div class="duell-gegner">
            ${gegner.map(({ gegner: g, rolle }) => `
              <div class="duell-gegner__eintrag">
                <span class="duell-gegner__bild" data-gegner="${sicher(g.id)}"></span>
                <span class="duell-gegner__name">${sicher(g.name)}</span>
                <span class="duell-gegner__rolle">${ROLLEN[rolle].icon} ${ROLLEN[rolle].name}</span>
              </div>`).join('<span class="duell-gegner__vs">&amp;</span>')}
          </div>
          <p class="duell-klein duell-gegner__text">${info.wahl.bossDuell ? 'Der Boss setzt seine Kraft ein und wird ab der Hälfte wütend (Phase 2).' : sicher(paare[info.wahl.paar]?.text ?? '')}</p>
          <div class="duell-chips" data-gruppe="grad">
            ${DUELL_GRADE.map((g) => `
              <button class="duell-chip${info.wahl.schwierigkeit === g.id ? ' is-aktiv' : ''}" type="button" data-grad="${g.id}" ${host ? '' : 'disabled'} title="${sicher(g.text)}">${g.icon} ${g.name}</button>`).join('')}
          </div>
          <p class="duell-klein">${sicher(DUELL_GRADE.find((g) => g.id === info.wahl.schwierigkeit)?.text ?? '')}</p>
          <p class="duell-klein duell-teamlevel">
            Team-Level <strong>${teamLevel}</strong> · Welt ${info.wahl.welt} empfiehlt ab <strong>${empfohlen}</strong>
            ${ausgleich ? ` · ${ausgleichText(ausgleich)}` : ''}
          </p>
          ${info.wahlFehler ? `<p class="duell-hinweis">⚠️ ${sicher(info.wahlFehler)}</p>` : ''}
        </div>

        <div class="duell-start">
          ${info.phase === 'countdown'
            ? `<div class="duell-countdown">Los geht’s …</div>`
            : solo
              ? `<button class="btn btn--big btn--green" data-aktion="bereit" type="button" ${info.wahlFehler ? 'disabled' : ''}>⚔️ Kampf starten</button>`
              : `<button class="btn btn--big ${ich?.bereit ? 'btn--ghost' : 'btn--green'}" data-aktion="bereit" type="button" ${!partner || info.wahlFehler ? 'disabled' : ''}>
                   ${ich?.bereit ? '✋ Doch nicht bereit' : '✅ Bereit!'}
                 </button>
                 <p class="duell-klein duell-start__text">${!partner ? 'Warte auf Spieler 2 - schick ihm den Code.' : beideBereit ? 'Beide bereit!' : ich?.bereit ? 'Warte, bis dein Teamkamerad bereit ist.' : 'Der Kampf startet, sobald ihr beide bereit seid.'}</p>`}
        </div>
      `;

      // Bilder einsetzen.
      info.spieler.forEach((s, i) => {
        const platz = content.querySelector(`[data-spieler-bild="${i}"]`);
        if (!platz || !s) return;
        const monster = getMonster(s.profil.figur);
        const skin = skinAusProfil(s.profil.skin, () => zeichnen());
        platz.appendChild(figurBild(monster, skin));
      });
      gegner.forEach(({ gegner: g }) => content.querySelector(`[data-gegner="${CSS.escape(g.id)}"]`)?.appendChild(createSprite(g)));

      // Knöpfe.
      const sitz = sitzung;
      content.querySelector('[data-aktion="kopieren"]')?.addEventListener('click', async (event) => {
        try {
          await navigator.clipboard.writeText(info.code);
          event.target.textContent = '✔ Kopiert';
        } catch {
          event.target.textContent = info.code;
        }
      });
      content.querySelector('[data-aktion="teilen"]')?.addEventListener('click', () => {
        navigator.share?.({ title: 'MonsterQuest 2v2', text: `Kämpf mit mir im 2v2 Monster-Duell! Code: ${info.code}`, url: location.href.split('?')[0] }).catch(() => {});
      });
      content.querySelectorAll('[data-figur]').forEach((knopf) => knopf.addEventListener('click', () => {
        if (setAktiveFigur(knopf.dataset.figur)) sitz.profilAktualisieren();
      }));
      content.querySelectorAll('[data-kraft]').forEach((knopf) => knopf.addEventListener('click', () => {
        setBossKraft(knopf.dataset.kraft || null);
        sitz.profilAktualisieren();
      }));
      content.querySelectorAll('[data-partner]').forEach((knopf) => knopf.addEventListener('click', () => {
        sitz.partnerFigur(knopf.dataset.partner);
        wahlMerken({ partner: knopf.dataset.partner });
      }));
      content.querySelector('[data-aktion="deck"]').addEventListener('click', () => {
        // Wer sein Deck umbaut, ist nicht bereit - sonst startet der Kampf ohne ihn.
        sitz.bereitSetzen(false);
        bleibtOffen = true;
        rueckkehrZeigen();
        showScreen('deck');
      });
      if (host) {
        const aendern = (teil) => {
          sitz.wahlAendern(teil);
          wahlMerken(sitz.info.wahl);
        };
        content.querySelectorAll('[data-welt]').forEach((k) => k.addEventListener('click', () => aendern({ welt: Number(k.dataset.welt), paar: 0, bossDuell: false })));
        content.querySelectorAll('[data-paar]').forEach((k) => k.addEventListener('click', () => aendern({ paar: Number(k.dataset.paar), bossDuell: false })));
        content.querySelector('[data-boss]')?.addEventListener('click', () => aendern({ bossDuell: true }));
        content.querySelectorAll('[data-grad]').forEach((k) => k.addEventListener('click', () => aendern({ schwierigkeit: k.dataset.grad })));
      }
      content.querySelector('[data-aktion="bereit"]')?.addEventListener('click', () => sitz.bereitSetzen(!ich?.bereit));
      content.querySelectorAll('[data-einladen]').forEach((k) => k.addEventListener('click', () => freundEinladen(k.dataset.einladen)));
    }

    /** Schickt einem Freund den Code der eigenen Lobby. */
    async function freundEinladen(kennung, name = null) {
      const sitz = sitzung;
      if (!sitz || sitz.info.art !== 'host') return;
      const freund = freundeLage()?.freunde.find((f) => f.kennung === kennung);
      const wer = freund?.name ?? name ?? kennung;
      let antwort = null;
      try {
        antwort = await einladungSenden(kennung, sitz.info.code);
      } catch (fehler) {
        console.warn('Einladung nicht gesendet:', fehler);
      }
      if (antwort === 'gesendet') {
        if (!eingeladen.has(sitz.info.code)) eingeladen.set(sitz.info.code, new Set());
        eingeladen.get(sitz.info.code).add(kennung);
        zeigeHinweisToast({ icon: '📨', label: '2v2-Einladung gesendet', text: `an ${wer} - gilt 5 Minuten` });
      } else {
        zeigeHinweisToast({
          icon: '📡',
          label: 'Einladung nicht gesendet',
          text: antwort === 'kein_freund' ? `${wer} ist nicht (mehr) dein Freund.` : antwort === 'zu_viele' ? 'Zu viele Einladungen - warte kurz.' : 'Bist du online? Versuch es gleich nochmal.',
        });
      }
      if (aktuelleSitzung() === sitz) zeichnen();
    }

    // Neue Freundesliste: nur neu zeichnen, wenn sie gerade zu sehen ist.
    const freundeAus = freundeBeobachten(() => {
      const info = sitzung?.info;
      if (content.isConnected && info && info.art === 'host' && ['verbinde', 'lobby'].includes(info.phase) && !info.spieler[1]) zeichnen();
    });
    aufraeumen.push(freundeAus);
    if (freundeMoeglich()) freundeAktualisieren();

    const beitreten = codePruefen(params.beitreten);
    if (beitreten) {
      // Angenommene Freundes-Einladung: derselbe Weg wie "Code eingeben".
      verbinden(starten('gast', beitreten));
    } else if (params.einladen) {
      // Aus der Freundesliste: in die eigene offene Lobby einladen, sonst eine neue erstellen.
      const offen = sitzung && sitzung.info.art === 'host' && ['verbinde', 'lobby'].includes(sitzung.info.phase);
      if (!offen && !(netzArt() && geraetOnline())) {
        verbinden(sitzung);
        zeigeHinweisToast({ icon: '📡', label: 'Offline', text: 'Freunde einladen geht nur mit Internet.' });
      } else {
        verbinden(offen ? sitzung : starten('host'));
        freundEinladen(params.einladen, params.einladenName);
      }
    } else {
      verbinden(sitzung);
    }
  },

  unmount() {
    aufraeumen.forEach((fn) => fn());
    aufraeumen = [];
    // Wer die Lobby anders als zum Deck oder in den Kampf verlässt, hat
    // dafür den Zurück-Knopf (der die Sitzung schließt). Bleibt sie offen,
    // führt der Knopf unten zurück.
    if (bleibtOffen && aktuelleSitzung()?.info.phase !== 'match' && aktuelleSitzung()?.info.phase !== 'ergebnis') rueckkehrZeigen();
  },
};

/** Die Freundesliste in der eigenen Lobby: online zuerst, mit "Einladen". */
function freundePanel(code) {
  const lage = freundeLage();
  const zustand = freundeZustand();
  const schon = eingeladen.get(code) ?? new Set();
  const liste = freundeSortiert(lage?.freunde ?? []);
  const inhalt = !lage
    ? `<p class="duell-klein">${zustand === 'offline' ? '📡 Offline - Freunde einladen geht gerade nicht.' : zustand === 'fehlt' ? 'Die Freundesliste ist in der Datenbank noch nicht eingerichtet.' : 'Freundesliste lädt …'}</p>`
    : !liste.length
      ? '<p class="duell-klein">Noch keine Freunde - füge sie unter 👥 Freunde hinzu. Oder schick den Code oben.</p>'
      : `<ul class="duell-freunde__liste">${liste.map((f) => `
          <li class="duell-freunde__eintrag freund--${f.status}">
            <span class="duell-freunde__name">${STATUS[f.status]?.icon ?? '⚫'} ${sicher(f.name)} <small>Lv ${Number(f.level) || 1}</small></span>
            ${schon.has(f.kennung)
              ? '<span class="duell-klein">✔ Eingeladen</span>'
              : `<button class="btn btn--small btn--green" type="button" data-einladen="${sicher(f.kennung)}" ${zustand === 'offline' ? 'disabled' : ''}>Einladen</button>`}
          </li>`).join('')}</ul>`;
  return `
    <div class="panel duell-freunde">
      <div class="panel__title">👥 Freund einladen</div>
      ${inhalt}
    </div>`;
}

/** Kurzer Text, wie sich die Gegner an das Team anpassen. */
function ausgleichText(a) {
  if (a.schaden === 1 && a.hp === 1) return 'Gegner unverändert';
  const prozent = (f) => `${f > 1 ? '+' : '−'}${Math.round(Math.abs(f - 1) * 100)} %`;
  return `Gegner passen sich an: Schaden ${prozent(a.schaden)}, Leben ${prozent(a.hp)}`;
}

/** Die Karte eines Spielers in Team Blau. */
function spielerKarte(s, index, info) {
  if (!s) {
    return `
      <div class="duell-spieler duell-spieler--leer">
        <div class="duell-spieler__bild duell-spieler__bild--leer">?</div>
        <div class="duell-spieler__name">Spieler ${index + 1}</div>
        <div class="duell-klein">Wartet auf Beitritt …</div>
      </div>`;
  }
  const p = s.profil;
  const kraft = p.kraft ? getKraft(p.kraft) : null;
  const ich = index === info.ich;
  const status = s.ki ? '🤖 KI-Partner' : !s.online ? '📡 getrennt' : s.bereit ? '✅ bereit' : '⏳ wählt noch';
  const monster = MONSTERS[p.figur];
  return `
    <div class="duell-spieler${ich ? ' ist-ich' : ''}${s.bereit ? ' ist-bereit' : ''}${s.online || s.ki ? '' : ' ist-offline'}">
      <div class="duell-spieler__bild" data-spieler-bild="${index}"></div>
      <div class="duell-spieler__name">${sicher(p.name)}${ich ? ' <small>(du)</small>' : ''}</div>
      <div class="duell-klein">Spieler ${index + 1} · ${monster?.icon ?? ''} ${sicher(monster?.name ?? p.figur)} · Lv ${p.level}</div>
      <div class="duell-klein duell-spieler__kraft">${kraft ? `${kraft.icon} ${sicher(kraft.name)}` : 'keine Boss-Kraft'}</div>
      ${deckReihe(p.deck)}
      <div class="duell-spieler__status">${status}</div>
    </div>`;
}

/** Zum Registrieren in js/main.js: Welt der Lobby für die Musik. */
export function duellWeltMusik() {
  const sitzung = aktuelleSitzung();
  const welt = getWorld(sitzung?.info.match?.setup?.welt ?? sitzung?.info.wahl?.welt ?? 1);
  return welt?.music ?? 'menue';
}
