/**
 * Die 2v2-Kampf-Engine: Team Blau (zwei Spieler) gegen Team Rot (zwei KI-Monster).
 *
 * Wie js/core/battle.js enthält diese Datei NUR Regeln - kein HTML, kein DOM,
 * keine Zeitschleife. Wer den Kampf laufen lässt, ruft schritt(sekunden) auf:
 * der Kampfbildschirm im Solo-Modus, im Online-Koop der Gastgeber (siehe
 * js/core/duell-sitzung.js), in den Tests einfach eine Schleife.
 *
 * Gleiche Grundregeln wie im Abenteuer - jeder Kämpfer ist ein ganz normaler
 * Kämpfer aus js/core/fighter.js:
 *   - eigenes Deck aus 8 Karten, 4 auf der Hand, sofort nachziehen
 *   - EIGENE Energie: höchstens 10, 1 pro Sekunde (Tempo-Aufwertungen zählen)
 *   - Karten kosten ihre Energie - niemand kann Energie eines anderen ausgeben
 *
 * Neu im 2v2:
 *   - Ziele: ein Gegner, beide Gegner, man selbst, der Teamkamerad ...
 *   - Team-Kombo: beide treffen denselben Gegner kurz nacheinander
 *   - Kampfunfähig und Wiederbeleben
 *   - Status-Effekte (verlangsamt, geschwächt, verstärkt, Gift, Brand, Sperren)
 *   - Gegner-Rollen mit Fähigkeiten und angekündigten Spezialangriffen
 *   - Boss-Duell mit Phase 2
 *
 * Jede Aktion eines Spielers läuft durch aktion() und wird dort geprüft:
 * Gehört die Figur dem Absender, liegt die Karte wirklich an dieser Stelle,
 * reicht SEINE Energie, ist das Ziel gültig? Jede Aktion trägt eine
 * Aktions-id; dieselbe id wird nie zweimal ausgeführt.
 */

import { createFighter, MAX_ENERGIE } from './fighter.js';
import { KRIT_CHANCE, KRIT_FAKTOR } from './battle.js';
import { getAttack } from '../data/attacks.js';
import { getKraft } from '../data/kraefte.js';
import { DUELL, FAEHIGKEITEN, KARTEN_ZIELE, STATUS, WELT_ELEMENT, getDuellGrad } from '../data/duell.js';
import { erzeugeZufall } from './zufall.js';
import { kiZug } from './duell-ki.js';

export { MAX_ENERGIE };

/** So viele Ladepunkte braucht die Boss-Kraft eines Spielers (wie im Abenteuer). */
const KRAFT_MAX = 16;
/** Wie lange "zuletzt angegriffen" für die KI zählt (Sekunden). */
const DRUCK_FENSTER = 4;

/** Welche Ziele eine Karte im 2v2 hat (siehe KARTEN_ZIELE in js/data/duell.js). */
export function zielArtVon(attacke) {
  if (KARTEN_ZIELE[attacke.id]) return KARTEN_ZIELE[attacke.id];
  if (attacke.damage > 0 || attacke.gift || attacke.stun) return 'gegner';
  if (attacke.heal > 0 || attacke.shield > 0) return 'verbuendeter';
  return 'gegner';
}

/**
 * Startet einen 2v2-Kampf.
 *
 * @param {object} setup - siehe duellSetup in js/core/duell-aufbau.js:
 *   { matchId, seed, welt, staerke, schwierigkeit, bossDuell,
 *     team:   [{ id:'p1', monster, kraft, steuerung }, { id:'p2', ... }],
 *     gegner: [{ id:'g1', monster, rolle, faehigkeiten, kraft }, { id:'g2', ... }] }
 * @param {object} [optionen]
 * @param {function} [optionen.onEvent] - jedes Kampfereignis (für Anzeige und Netz)
 */
export function createDuell(setup, { onEvent } = {}) {
  const zufall = erzeugeZufall(setup.seed ?? setup.matchId ?? 'duell');
  const grad = getDuellGrad(setup.schwierigkeit);
  const element = WELT_ELEMENT[setup.welt] ?? WELT_ELEMENT[1];
  const staerke = setup.staerke ?? 4;

  /** Alle vier Kämpfer, nach id. */
  const kaempfer = new Map();
  const reihenfolge = [];

  function kaempferAnlegen(def, team, index) {
    const fighter = createFighter(def.monster, { zufall });
    const s = fighter.state;
    // Öffentlicher Zustand - alles, was Anzeige, Netz und KI sehen dürfen.
    Object.assign(s, {
      id: def.id,
      team,
      index,
      rolle: def.rolle ?? null,
      figur: def.monster.figur ?? null,
      status: {}, // name -> Restsekunden
      sperrSchutz: 0,
      ko: false,
      wiederbelebt: 0,
      kraftId: def.kraft ?? null,
      kraft: 0, // 0..1 Ladung der Boss-Kraft
      kraftBereit: false,
      ansage: null, // { art, id, name, icon, ziel, rest, gesamt }
      steuerung: def.steuerung ?? (team === 'rot' ? 'gegnerKi' : 'mensch'),
      druck: 0, // Schaden der letzten Sekunden - zeigt, wer gerade unter Beschuss steht
    });
    const k = {
      id: def.id,
      team,
      fighter,
      s,
      partnerId: null,
      kraftDef: def.kraft ? getKraft(def.kraft) ?? null : null,
      kraftPunkte: 0,
      kraftMax: team === 'rot' ? Math.round((getKraft(def.kraft)?.gegnerLadung ?? 24) * DUELL.gegnerKraftLadung) : KRAFT_MAX,
      faehigkeiten: def.faehigkeiten ?? [],
      pausen: {}, // Fähigkeit -> Restsekunden Abklingzeit
      dots: [], // Gift und Brand
      treffer: [], // [{zeit, menge}] für den "Druck"
      heilungen: 0,
      geheiltBekommen: 0,
      reaktion: def.monster.reactionTime ?? 1,
      patience: def.monster.patience ?? 2,
      denkTimer: 0.6 + index * 0.35,
      ki: { sparenAb: null },
      zielWahl: null, // zuletzt gewähltes Ziel eines Menschen (für den KI-Ersatz)
      statistik: { schaden: 0, geheilt: 0, teamHeilung: 0, kombos: 0, besiegt: 0, ko: 0, karten: 0, wiederbelebt: 0 },
    };
    kaempfer.set(def.id, k);
    reihenfolge.push(k);
    return k;
  }

  setup.team.forEach((def, i) => kaempferAnlegen(def, 'blau', i));
  setup.gegner.forEach((def, i) => kaempferAnlegen(def, 'rot', i));
  for (const team of ['blau', 'rot']) {
    const paar = reihenfolge.filter((k) => k.team === team);
    if (paar.length === 2) {
      paar[0].partnerId = paar[1].id;
      paar[1].partnerId = paar[0].id;
    }
  }

  const state = {
    matchId: setup.matchId ?? null,
    zeit: 0,
    seq: 0,
    laeuft: true,
    phase: 1,
    kombo: { blau: 0, rot: 0 }, // Restsekunden Abklingzeit je Team
    ende: null,
    kaempfer: Object.fromEntries(reihenfolge.map((k) => [k.id, k.s])),
    reihenfolge: reihenfolge.map((k) => k.id),
  };

  /** Wer hat wen zuletzt getroffen (für Team-Kombos): [team][zielId] = {von, zeit} */
  const letzterTreffer = { blau: {}, rot: {} };
  /** Gemeinsames Gedächtnis der Gegner-KI (Fokusziel u. Ä.) und der Partner-KI. */
  const kiTeam = { rot: { fokus: null, fokusBis: 0 }, blau: { signalZiel: null, signalBis: 0 } };
  /** Erledigte Aktions-ids -> Ergebnis. Schützt gegen doppelte Ausführung. */
  const erledigt = new Map();

  /* ------------------------------------------------------------------ */
  /*  Hilfen                                                             */
  /* ------------------------------------------------------------------ */

  function emit(ereignis) {
    state.seq += 1;
    const e = { seq: state.seq, zeit: Math.round(state.zeit * 100) / 100, ...ereignis };
    if (onEvent) onEvent(e);
    return e;
  }

  const lebt = (k) => k && !k.s.ko;
  const gegnerVon = (k) => reihenfolge.filter((x) => x.team !== k.team);
  const verbuendeteVon = (k) => reihenfolge.filter((x) => x.team === k.team);
  const partnerVon = (k) => (k.partnerId ? kaempfer.get(k.partnerId) : null);
  const gesperrt = (k) => (k.s.status.betaeubt ?? 0) > 0 || (k.s.status.gefroren ?? 0) > 0;

  /** Schadensfaktor aus Status-Effekten. */
  function statusFaktor(k) {
    let f = 1;
    if (k.s.status.verstaerkt > 0) f *= STATUS.verstaerkt.faktor;
    if (k.s.status.geschwaecht > 0) f *= STATUS.geschwaecht.faktor;
    return f;
  }

  function quelleText(quelle) {
    return quelle?.name ?? 'Angriff';
  }

  /* ------------------------------------------------------------------ */
  /*  Wirkungen                                                          */
  /* ------------------------------------------------------------------ */

  /** Lädt die Boss-Kraft eines Kämpfers (Spieler und Boss gleich). */
  function kraftLaden(k, punkte) {
    if (!k.kraftDef || state.ende || k.s.ko) return;
    k.kraftPunkte = Math.min(k.kraftMax, k.kraftPunkte + punkte);
    k.s.kraft = k.kraftPunkte / k.kraftMax;
    k.s.kraftBereit = k.kraftPunkte >= k.kraftMax;
  }

  /**
   * Prüft die Team-Kombo: Hat der Partner des Angreifers dieses Ziel gerade
   * eben getroffen und ist die Kombo des Teams bereit?
   */
  function komboPruefen(von, ziel) {
    const team = von.team;
    const letzter = letzterTreffer[team][ziel.id];
    letzterTreffer[team][ziel.id] = { von: von.id, zeit: state.zeit };
    if (!letzter || letzter.von === von.id) return false;
    if (state.zeit - letzter.zeit > DUELL.kombo.fenster) return false;
    if (state.kombo[team] > 0) return false;
    state.kombo[team] = DUELL.kombo.cooldown;
    return true;
  }

  /**
   * Ein Treffer: Angriffswert, Status, Abwehr, Krit, Team-Kombo, Schild.
   * @param {object} quelle - { art: 'karte'|'faehigkeit'|'kraft'|'dot', id, name, icon, kosten }
   * @returns {number} angerichteter Schaden
   */
  function treffer(von, ziel, roh, quelle, { krit: kannKrit = true, kombo: kannKombo = true } = {}) {
    if (!lebt(ziel) || state.ende) return 0;
    const angriff = (von?.s.damageFactor ?? 1) * (von ? statusFaktor(von) : 1);
    let schaden = Math.max(1, Math.round(roh * angriff * (1 - (ziel.s.defense ?? 0))));
    const krit = kannKrit && zufall() < KRIT_CHANCE;
    if (krit) schaden = Math.round(schaden * KRIT_FAKTOR);

    // Die Kombo gibt es nur für echte Angriffe (Karte, Fähigkeit, Kraft) -
    // nie für Gift, Brand oder den Kombo-Bonus selbst. Keine Kettenreaktion.
    let kombo = false;
    if (von && kannKombo && quelle.art !== 'dot') {
      kombo = komboPruefen(von, ziel);
      if (kombo) schaden += Math.max(1, Math.round(schaden * DUELL.kombo.bonus));
    }

    const angewendet = ziel.fighter.takeDamage(schaden);
    ziel.treffer.push({ zeit: state.zeit, menge: schaden });
    if (von) von.statistik.schaden += schaden;
    if (kombo && von) von.statistik.kombos += 1;
    // Getroffen werden lädt die eigene Boss-Kraft (wie im Abenteuer).
    kraftLaden(ziel, ziel.team === 'rot' ? DUELL.gegnerKraftProTreffer : 2);

    emit({
      typ: 'treffer',
      von: von?.id ?? null,
      ziel: ziel.id,
      menge: schaden,
      krit,
      kombo,
      absorbiert: angewendet.shield,
      quelle: { art: quelle.art, id: quelle.id ?? null, name: quelle.name ?? null, icon: quelle.icon ?? null, kosten: quelle.kosten ?? 0 },
    });
    if (kombo) emit({ typ: 'kombo', team: von.team, von: von.id, ziel: ziel.id, bonus: DUELL.kombo.bonus });

    // Große Treffer unterbrechen eine laufende Ankündigung des Getroffenen.
    if (ziel.s.ansage && quelle.art !== 'dot' && (quelle.kosten ?? 0) >= DUELL.unterbrechenAbKosten) {
      unterbrechen(ziel, von);
    }

    if (ziel.s.hp <= 0) kampfunfaehig(ziel, von);
    return schaden;
  }

  /** Heilt. Gegner-Heilung nutzt sich ab und ist gedeckelt (kein endloses Heilen). */
  function heilen(von, ziel, menge, quelle) {
    if (!lebt(ziel) || state.ende) return 0;
    let wert = Math.round(menge);
    if (ziel.team === 'rot') {
      wert = Math.round(wert * Math.pow(DUELL.heilAbnutzung, ziel.heilungen));
      const rest = Math.max(0, Math.round(ziel.s.maxHp * DUELL.heilGrenze) - ziel.geheiltBekommen);
      wert = Math.min(wert, rest);
    }
    wert = Math.min(wert, ziel.s.maxHp - ziel.s.hp);
    if (wert <= 0) return 0;
    ziel.fighter.heal(wert);
    ziel.heilungen += 1;
    ziel.geheiltBekommen += wert;
    if (von) {
      von.statistik.geheilt += wert;
      if (von.id !== ziel.id) von.statistik.teamHeilung += wert;
    }
    emit({ typ: 'heilung', von: von?.id ?? null, ziel: ziel.id, menge: wert, quelle: quelle ? { art: quelle.art, name: quelle.name, icon: quelle.icon } : null });
    return wert;
  }

  function schuetzen(von, ziel, menge, quelle) {
    if (!lebt(ziel) || state.ende) return;
    const wert = Math.max(1, Math.round(menge));
    ziel.fighter.addShield(wert);
    emit({ typ: 'schild', von: von?.id ?? null, ziel: ziel.id, menge: wert, quelle: quelle ? { art: quelle.art, name: quelle.name, icon: quelle.icon } : null });
  }

  /**
   * Setzt einen Status-Effekt. Betäubung und Frost greifen nicht, solange
   * der Sperr-Schutz läuft - so gibt es keine Dauerbetäubung.
   */
  function statusSetzen(ziel, name, dauer, von = null) {
    if (!lebt(ziel) || state.ende || dauer <= 0) return false;
    const sperre = name === 'betaeubt' || name === 'gefroren';
    if (sperre && (ziel.s.sperrSchutz > 0 || gesperrt(ziel))) {
      emit({ typ: 'immun', ziel: ziel.id, status: name });
      return false;
    }
    ziel.s.status[name] = Math.max(ziel.s.status[name] ?? 0, dauer);
    emit({ typ: 'status', ziel: ziel.id, von: von?.id ?? null, status: name, dauer });
    // Eine Sperre unterbricht jede Ankündigung.
    if (sperre && ziel.s.ansage) unterbrechen(ziel, von);
    return true;
  }

  /** Gift oder Brand: Schaden in Abständen. Ein neuer ersetzt den alten derselben Art. */
  function dotSetzen(von, ziel, typ, { tick, male, intervall = 1 }) {
    if (!lebt(ziel)) return;
    ziel.dots = ziel.dots.filter((d) => d.typ !== typ);
    ziel.dots.push({ typ, tick, rest: male, timer: intervall, intervall, von: von?.id ?? null });
    ziel.s.status[typ] = male * intervall;
    emit({ typ: 'status', ziel: ziel.id, von: von?.id ?? null, status: typ, dauer: male * intervall });
  }

  function unterbrechen(k, von) {
    const ansage = k.s.ansage;
    if (!ansage) return;
    k.s.ansage = null;
    emit({ typ: 'unterbrochen', ziel: k.id, von: von?.id ?? null, name: ansage.name, icon: ansage.icon });
  }

  /** Ein Kämpfer fällt auf 0 Lebenspunkte. */
  function kampfunfaehig(k, von) {
    if (k.s.ko) return;
    k.s.ko = true;
    k.s.hp = 0;
    k.s.ansage = null;
    k.dots = [];
    k.s.status = {};
    k.statistik.ko += 1;
    if (k.team === 'rot' && von) von.statistik.besiegt += 1;
    emit({ typ: k.team === 'rot' ? 'besiegt' : 'ko', ziel: k.id, von: von?.id ?? null });
    endePruefen();
  }

  function endePruefen() {
    if (state.ende) return;
    const blau = reihenfolge.filter((k) => k.team === 'blau');
    const rot = reihenfolge.filter((k) => k.team === 'rot');
    if (rot.every((k) => k.s.ko)) beenden('sieg');
    else if (blau.every((k) => k.s.ko)) beenden('niederlage');
  }

  function beenden(ergebnis, grund = null) {
    if (state.ende) return;
    const blau = reihenfolge.filter((k) => k.team === 'blau');
    const teamHp = blau.reduce((summe, k) => summe + k.s.hp, 0);
    const teamMax = blau.reduce((summe, k) => summe + k.s.maxHp, 0);
    state.ende = {
      ergebnis,
      grund,
      zeit: Math.round(state.zeit * 10) / 10,
      teamAnteil: teamMax ? teamHp / teamMax : 0,
      teamKo: blau.reduce((summe, k) => summe + k.statistik.ko, 0),
      bossDuell: Boolean(setup.bossDuell),
      statistik: Object.fromEntries(blau.map((k) => [k.id, { ...k.statistik }])),
      gegnerBesiegt: reihenfolge.filter((k) => k.team === 'rot' && k.s.ko).length,
    };
    state.laeuft = false;
    emit({ typ: 'ende', ergebnis, grund });
  }

  /* ------------------------------------------------------------------ */
  /*  Karten, Kräfte, Fähigkeiten                                        */
  /* ------------------------------------------------------------------ */

  /** Löst ein Ziel für eine Zielart auf. Ungültige Ziele fallen sinnvoll zurück. */
  function zieleFuer(k, zielArt, zielId) {
    const feinde = gegnerVon(k).filter(lebt);
    const freunde = verbuendeteVon(k).filter(lebt);
    const gewaehlt = zielId ? kaempfer.get(zielId) : null;
    switch (zielArt) {
      case 'beideGegner':
      case 'arena':
        return feinde;
      case 'selbst':
        return [k];
      case 'partner': {
        const p = partnerVon(k);
        return lebt(p) ? [p] : [];
      }
      case 'beideVerbuendete':
        return freunde;
      case 'verbuendeter':
        return gewaehlt && gewaehlt.team === k.team && lebt(gewaehlt) ? [gewaehlt] : [k];
      case 'gegner':
      default:
        if (gewaehlt && gewaehlt.team !== k.team && lebt(gewaehlt)) return [gewaehlt];
        return feinde.length ? [feinde[0]] : [];
    }
  }

  /** Wendet eine gespielte Karte an. */
  function karteWirken(k, attacke, zielId) {
    const zielArt = zielArtVon(attacke);
    const ziele = zieleFuer(k, zielArt, zielId);
    const quelle = { art: 'karte', id: attacke.id, name: attacke.name, icon: attacke.icon, kosten: attacke.cost };
    const flaeche = ziele.length > 1 && (zielArt === 'beideGegner' || zielArt === 'arena');
    emit({ typ: 'karte', von: k.id, karte: attacke.id, name: attacke.name, icon: attacke.icon, kosten: attacke.cost, ziele: ziele.map((z) => z.id), zielArt });

    for (const ziel of ziele) {
      if (attacke.damage > 0) {
        treffer(k, ziel, attacke.damage * (flaeche ? DUELL.flaechenAnteil : 1), quelle);
      }
      if (attacke.heal > 0) heilen(k, ziel, attacke.heal, quelle);
      if (attacke.shield > 0) schuetzen(k, ziel, attacke.shield, quelle);
      if (attacke.gift && ziel.team !== k.team) dotSetzen(k, ziel, 'gift', attacke.gift);
      if (attacke.stun && ziel.team !== k.team) statusSetzen(ziel, 'betaeubt', attacke.stun, k);
    }
    // "Die ganze Arena": alle Verbündeten bekommen dazu ein kleines Schild.
    if (zielArt === 'arena' && attacke.damage > 0) {
      verbuendeteVon(k).filter(lebt).forEach((f) => schuetzen(k, f, attacke.damage * 0.2, quelle));
    }
  }

  /**
   * Eine Boss-Kraft wirkt (Spieler ODER Boss). Ziel ist der gewählte Gegner;
   * Schild-Kräfte schützen das ganze eigene Team.
   */
  function kraftWirken(k, kraft, zielId) {
    const quelle = { art: 'kraft', id: kraft.id, name: kraft.name, icon: kraft.icon, kosten: 10 };
    const ziel = zieleFuer(k, 'gegner', zielId)[0] ?? null;
    emit({ typ: 'kraft', von: k.id, kraft: kraft.id, name: kraft.name, icon: kraft.icon, art: kraft.art, ziel: ziel?.id ?? null });

    switch (kraft.art) {
      case 'schild': {
        const menge = k.s.maxHp * kraft.wert;
        schuetzen(k, k, menge, quelle);
        const p = partnerVon(k);
        if (lebt(p)) schuetzen(k, p, menge * 0.6, quelle);
        break;
      }
      case 'schildbruch':
        if (ziel) {
          ziel.fighter.entferneSchild();
          treffer(k, ziel, kraft.wert, quelle);
        }
        break;
      case 'lebensraub':
        if (ziel) heilen(k, k, treffer(k, ziel, kraft.wert, quelle), quelle);
        break;
      case 'energiesturm':
        // Spieler füllen ihre Energie auf. Gegner bekommen im 2v2 nie
        // Energie geschenkt - bei ihnen trifft der Sturm dafür härter.
        if (k.team === 'blau') k.fighter.energieVoll();
        if (ziel) treffer(k, ziel, kraft.wert * (k.team === 'blau' ? 1 : 1.3), quelle);
        break;
      case 'energieraub':
        if (ziel) {
          treffer(k, ziel, kraft.wert, quelle);
          ziel.fighter.energieLeeren();
        }
        break;
      case 'brand':
        if (ziel) {
          treffer(k, ziel, kraft.wert.sofort, quelle);
          dotSetzen(k, ziel, 'brand', { tick: kraft.wert.tick, male: kraft.wert.male, intervall: 0.6 });
        }
        break;
      case 'frost':
        if (ziel) statusSetzen(ziel, 'gefroren', kraft.wert, k);
        break;
      default:
        break;
    }
  }

  /** Eine Rollen-Fähigkeit eines Gegners wirkt (nach ihrer Ankündigung). */
  function faehigkeitWirken(k, id, zielId) {
    const f = FAEHIGKEITEN[id];
    if (!f) return;
    const quelle = { art: 'faehigkeit', id, name: f.name, icon: f.icon, kosten: f.kosten };
    const grundwert = f.kosten * staerke * (f.wert ?? 1);
    emit({ typ: 'faehigkeit', von: k.id, faehigkeit: id, name: f.name, icon: f.icon, ziel: zielId ?? null });

    switch (id) {
      case 'wutschlag': {
        const ziel = zieleFuer(k, 'gegner', zielId)[0];
        if (ziel) treffer(k, ziel, grundwert, quelle);
        break;
      }
      case 'schutzwall': {
        const ziel = zieleFuer(k, 'verbuendeter', zielId)[0];
        if (ziel) schuetzen(k, ziel, grundwert, quelle);
        break;
      }
      case 'schildstoss': {
        const ziel = zieleFuer(k, 'gegner', zielId)[0];
        if (ziel) {
          treffer(k, ziel, grundwert, quelle);
          statusSetzen(ziel, 'betaeubt', f.betaeubung, k);
        }
        break;
      }
      case 'elementarwelle':
      case 'bosszorn': {
        for (const ziel of gegnerVon(k).filter(lebt)) {
          treffer(k, ziel, grundwert, quelle, { kombo: false });
          if (id === 'elementarwelle') elementWirken(k, ziel);
        }
        break;
      }
      case 'heilung': {
        const ziel = zieleFuer(k, 'verbuendeter', zielId)[0];
        if (ziel) heilen(k, ziel, grundwert, quelle);
        break;
      }
      case 'staerkung': {
        const ziel = zieleFuer(k, 'partner', zielId)[0] ?? k;
        statusSetzen(ziel, 'verstaerkt', f.dauer, k);
        break;
      }
      case 'fluch': {
        const ziel = zieleFuer(k, 'gegner', zielId)[0];
        if (ziel) statusSetzen(ziel, 'geschwaecht', f.dauer, k);
        break;
      }
      default:
        break;
    }
  }

  /** Was das Element der Welt bei einer Elementarwelle zusätzlich bewirkt. */
  function elementWirken(von, ziel) {
    switch (element.status) {
      case 'gift':
        dotSetzen(von, ziel, 'gift', { tick: Math.round(staerke * 1.2), male: 4, intervall: 1 });
        break;
      case 'brand':
        dotSetzen(von, ziel, 'brand', { tick: Math.round(staerke * 1.5), male: 3, intervall: 0.8 });
        break;
      case 'verlangsamt':
        statusSetzen(ziel, 'verlangsamt', STATUS.verlangsamt.dauer, von);
        break;
      case 'geschwaecht':
        statusSetzen(ziel, 'geschwaecht', STATUS.geschwaecht.dauer, von);
        break;
      case 'energieentzug':
        ziel.fighter.energieAendern(-2);
        emit({ typ: 'energieentzug', ziel: ziel.id, menge: 2 });
        break;
      default:
        break;
    }
  }

  /** Startet eine Ankündigung (Spezialangriff oder Boss-Kraft eines Gegners). */
  function ankuendigen(k, ansage) {
    const dauer = grad.ansage ?? DUELL.ansageStandard;
    k.s.ansage = { ...ansage, rest: dauer, gesamt: dauer };
    emit({ typ: 'ansage', von: k.id, art: ansage.art, id: ansage.id, name: ansage.name, icon: ansage.icon, ziel: ansage.ziel ?? null, dauer });
  }

  /* ------------------------------------------------------------------ */
  /*  Züge - von Menschen (geprüft) und von der KI                       */
  /* ------------------------------------------------------------------ */

  /** Spielt eine Karte. Prüft alles, was ein Mensch falsch machen könnte. */
  function karteSpielen(k, hand, karteId, zielId) {
    if (!Number.isInteger(hand) || hand < 0 || hand >= k.s.hand.length) return { ok: false, grund: 'ungueltig' };
    if (karteId && k.s.hand[hand] !== karteId) return { ok: false, grund: 'karte-veraltet' };
    const vorher = k.fighter.handAttacks()[hand];
    if (!k.fighter.canAfford(vorher.cost)) return { ok: false, grund: 'zu-wenig-energie' };
    const zielArt = zielArtVon(vorher);
    if (zieleFuer(k, zielArt, zielId).length === 0) return { ok: false, grund: 'kein-ziel' };

    const attacke = k.fighter.useCard(hand);
    if (!attacke) return { ok: false, grund: 'zu-wenig-energie' };
    k.statistik.karten += 1;
    if (zielId) k.zielWahl = zielId;
    kraftLaden(k, attacke.cost);
    karteWirken(k, attacke, zielId);
    return { ok: true };
  }

  function kraftEinsetzen(k, zielId) {
    if (!k.kraftDef) return { ok: false, grund: 'keine-kraft' };
    if (k.kraftPunkte < k.kraftMax) return { ok: false, grund: 'kraft-nicht-bereit' };
    k.kraftPunkte = 0;
    k.s.kraft = 0;
    k.s.kraftBereit = false;
    kraftWirken(k, k.kraftDef, zielId);
    return { ok: true };
  }

  function wiederbeleben(k, zielId) {
    const ziel = kaempfer.get(zielId);
    if (!ziel || ziel.team !== k.team || ziel.id === k.id) return { ok: false, grund: 'ungueltig' };
    if (!ziel.s.ko) return { ok: false, grund: 'nicht-kampfunfaehig' };
    if (ziel.s.wiederbelebt >= DUELL.wiederbelebung.proSpieler) return { ok: false, grund: 'schon-wiederbelebt' };
    if (!k.fighter.canAfford(DUELL.wiederbelebung.kosten)) return { ok: false, grund: 'zu-wenig-energie' };
    k.fighter.energieAendern(-DUELL.wiederbelebung.kosten);
    ziel.s.ko = false;
    ziel.s.wiederbelebt += 1;
    ziel.s.hp = Math.max(1, Math.round(ziel.s.maxHp * DUELL.wiederbelebung.leben));
    ziel.s.shield = 0;
    k.statistik.wiederbelebt += 1;
    k.statistik.teamHeilung += ziel.s.hp;
    emit({ typ: 'wiederbelebt', von: k.id, ziel: ziel.id, hp: ziel.s.hp });
    return { ok: true };
  }

  /** Startet eine Fähigkeit eines Gegners (Energie wird sofort bezahlt). */
  function faehigkeitStarten(k, id, zielId) {
    const f = FAEHIGKEITEN[id];
    if (!f || !k.faehigkeiten.includes(id)) return { ok: false, grund: 'unbekannt' };
    if ((k.pausen[id] ?? 0) > 0) return { ok: false, grund: 'abklingzeit' };
    if (f.nurPhase2 && state.phase < 2) return { ok: false, grund: 'phase' };
    if (!k.fighter.canAfford(f.kosten)) return { ok: false, grund: 'zu-wenig-energie' };
    k.fighter.energieAendern(-f.kosten);
    k.pausen[id] = f.pause * (grad.faehigkeitPause ?? 1);
    kraftLaden(k, f.kosten);
    if (f.ansage) ankuendigen(k, { art: 'faehigkeit', id, name: f.name, icon: f.icon, ziel: zielId ?? null });
    else faehigkeitWirken(k, id, zielId);
    return { ok: true };
  }

  /** Ein Zug der KI - läuft durch dieselben Funktionen wie ein Mensch. */
  function kiAusfuehren(k, zug) {
    if (!zug) return;
    switch (zug.typ) {
      case 'karte': karteSpielen(k, zug.hand, k.s.hand[zug.hand], zug.ziel); break;
      case 'faehigkeit': faehigkeitStarten(k, zug.id, zug.ziel); break;
      case 'wiederbeleben': wiederbeleben(k, zug.ziel); break;
      case 'kraft':
        if (k.team === 'rot') {
          // Der Boss kündigt seine Kraft an - man kann reagieren.
          if (k.kraftPunkte >= k.kraftMax) {
            k.kraftPunkte = 0;
            k.s.kraft = 0;
            k.s.kraftBereit = false;
            ankuendigen(k, { art: 'kraft', id: k.kraftDef.id, name: k.kraftDef.name, icon: k.kraftDef.icon, ziel: zug.ziel ?? null });
          }
        } else {
          kraftEinsetzen(k, zug.ziel);
        }
        break;
      default:
        break;
    }
  }

  /**
   * Was die KI sehen darf: alles, was auch auf dem Bildschirm steht -
   * Lebenspunkte, Schilde, Energie, Effekte, Ankündigungen. NICHT die Hand
   * der Spieler und nichts über künftige Aktionen.
   */
  function sichtFuer(k) {
    const oeffentlich = reihenfolge.map((x) => ({
      id: x.id,
      team: x.team,
      rolle: x.s.rolle,
      hp: x.s.hp,
      maxHp: x.s.maxHp,
      shield: x.s.shield,
      energie: x.s.energie,
      defense: x.s.defense,
      ko: x.s.ko,
      wiederbelebt: x.s.wiederbelebt,
      status: { ...x.s.status },
      gesperrt: gesperrt(x),
      kraftBereit: x.s.kraftBereit,
      ansage: x.s.ansage ? { name: x.s.ansage.name, ziel: x.s.ansage.ziel, rest: x.s.ansage.rest } : null,
      druck: x.s.druck,
    }));
    return {
      zeit: state.zeit,
      phase: state.phase,
      ich: k.id,
      team: k.team,
      partner: k.partnerId,
      kaempfer: oeffentlich,
      // Eigene Dinge kennt jeder Kämpfer natürlich:
      hand: k.fighter.handAttacks().map((a) => ({ ...a, zielArt: zielArtVon(a) })),
      faehigkeiten: k.faehigkeiten
        .filter((id) => FAEHIGKEITEN[id] && !(FAEHIGKEITEN[id].nurPhase2 && state.phase < 2))
        .map((id) => ({ id, ...FAEHIGKEITEN[id], pause: k.pausen[id] ?? 0, wert: FAEHIGKEITEN[id].kosten * staerke * (FAEHIGKEITEN[id].wert ?? 1) })),
      kraftBereit: k.kraftPunkte >= k.kraftMax && Boolean(k.kraftDef),
      kraftArt: k.kraftDef?.art ?? null,
      damageFactor: k.s.damageFactor * statusFaktor(k),
      komboBereit: state.kombo[k.team] <= 0,
      komboFenster: DUELL.kombo.fenster,
      // Wen das eigene Team zuletzt getroffen hat (eigenes Wissen, keine Spionage).
      teamTreffer: Object.fromEntries(Object.entries(letzterTreffer[k.team]).map(([ziel, t]) => [ziel, { von: t.von, vor: state.zeit - t.zeit }])),
      gedaechtnis: kiTeam[k.team],
      zielWahlPartner: k.partnerId ? kaempfer.get(k.partnerId)?.zielWahl ?? null : null,
      wiederbelebKosten: DUELL.wiederbelebung.kosten,
      wiederbelebMax: DUELL.wiederbelebung.proSpieler,
      patience: k.patience,
      sparen: k.ki,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Zeit                                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Ein Schritt der Spielzeit. Wird von aussen aufgerufen (Bildschirm,
   * Gastgeber oder Test) - die Engine hat keine eigene Uhr.
   */
  function schritt(dt) {
    if (!state.laeuft || state.ende) return;
    const d = Math.max(0, Math.min(dt, 0.25));
    state.zeit += d;
    state.kombo.blau = Math.max(0, state.kombo.blau - d);
    state.kombo.rot = Math.max(0, state.kombo.rot - d);

    for (const k of reihenfolge) {
      if (state.ende) break;
      if (k.s.ko) continue;

      // Status-Effekte laufen ab. Endet eine Sperre, beginnt der Sperr-Schutz.
      for (const [name, rest] of Object.entries(k.s.status)) {
        if (name === 'gift' || name === 'brand') continue; // laufen über die dots
        const neu = rest - d;
        if (neu <= 0) {
          delete k.s.status[name];
          if (name === 'betaeubt' || name === 'gefroren') k.s.sperrSchutz = DUELL.sperrSchutz;
        } else {
          k.s.status[name] = neu;
        }
      }
      if (k.s.sperrSchutz > 0 && !gesperrt(k)) k.s.sperrSchutz = Math.max(0, k.s.sperrSchutz - d);

      // Energie: jeder lädt seine EIGENE auf - verlangsamt langsamer, gesperrt gar nicht.
      if (!gesperrt(k)) {
        k.fighter.energieAufladen(d * (k.s.status.verlangsamt > 0 ? STATUS.verlangsamt.faktor : 1));
      }

      for (const id of Object.keys(k.pausen)) k.pausen[id] = Math.max(0, k.pausen[id] - d);

      // Gift und Brand.
      for (const dot of k.dots) {
        dot.timer -= d;
        while (dot.timer <= 0 && dot.rest > 0 && !k.s.ko && !state.ende) {
          const von = dot.von ? kaempfer.get(dot.von) : null;
          treffer(von, k, dot.tick, { art: 'dot', id: dot.typ, name: STATUS[dot.typ].name, icon: STATUS[dot.typ].icon }, { krit: false, kombo: false });
          dot.rest -= 1;
          dot.timer += dot.intervall;
        }
        if (dot.rest > 0) k.s.status[dot.typ] = dot.rest * dot.intervall;
      }
      k.dots = k.dots.filter((dot) => {
        if (dot.rest > 0 && !k.s.ko) return true;
        delete k.s.status[dot.typ];
        return false;
      });
      if (k.s.ko || state.ende) continue;

      // "Druck": wie viel Schaden in den letzten Sekunden ankam.
      k.treffer = k.treffer.filter((t) => state.zeit - t.zeit <= DRUCK_FENSTER);
      k.s.druck = k.treffer.reduce((summe, t) => summe + t.menge, 0);

      // Eine laufende Ankündigung zählt herunter und wirkt dann.
      if (k.s.ansage) {
        if (!gesperrt(k)) k.s.ansage.rest -= d;
        if (k.s.ansage && k.s.ansage.rest <= 0) {
          const ansage = k.s.ansage;
          k.s.ansage = null;
          if (ansage.art === 'kraft') kraftWirken(k, k.kraftDef, ansage.ziel);
          else faehigkeitWirken(k, ansage.id, ansage.ziel);
        }
        continue; // wer ankündigt, tut sonst nichts
      }

      // KI-gesteuerte Kämpfer überlegen in festen Abständen.
      if (k.s.steuerung === 'gegnerKi' || k.s.steuerung === 'ki') {
        k.denkTimer -= d;
        if (k.denkTimer <= 0 && !gesperrt(k)) {
          const partnerKi = k.s.steuerung === 'ki';
          const grundZeit = partnerKi ? setup.kiPartner?.reaktion ?? 1.3 : k.reaktion * (grad.reaktion ?? 1);
          k.denkTimer = grundZeit * (0.85 + zufall() * 0.3);
          kiAusfuehren(k, kiZug(sichtFuer(k), { grad, partnerKi, zufall, kiPartner: setup.kiPartner }));
        }
      }
    }

    bossPhasePruefen();
  }

  /** Boss-Duell: Fällt der Boss unter die Hälfte, beginnt Phase 2. */
  function bossPhasePruefen() {
    if (!setup.bossDuell || state.phase >= 2 || state.ende) return;
    const boss = reihenfolge.find((k) => k.s.rolle === 'boss');
    if (!boss || boss.s.ko || boss.s.hp > boss.s.maxHp * DUELL.bossPhaseAb) return;
    state.phase = 2;
    boss.reaktion *= 0.8;
    statusSetzen(boss, 'verstaerkt', 9999, boss);
    const helfer = partnerVon(boss);
    if (lebt(helfer)) statusSetzen(helfer, 'verstaerkt', 8, boss);
    emit({ typ: 'phase', phase: 2, von: boss.id, text: `${boss.s.name} wird wütend!` });
  }

  /* ------------------------------------------------------------------ */
  /*  Aussen: Aktionen, Steuerung, Zustand                               */
  /* ------------------------------------------------------------------ */

  /**
   * Eine Aktion eines Spielers (oder eines Netzwerk-Gastes).
   *
   * @param {string} vonId - die Figur, die handelt ('p1' oder 'p2'). Wer
   *        welche Figur steuern darf, entscheidet die Sitzung - hier wird
   *        nur geprüft, dass es eine Spielerfigur ist.
   * @param {object} a - { aktionId, typ: 'karte'|'kraft'|'wiederbeleben', hand, karte, ziel }
   * @returns {{ok: boolean, grund?: string}}
   */
  function aktion(vonId, a = {}) {
    if (a.aktionId && erledigt.has(a.aktionId)) return { ...erledigt.get(a.aktionId), doppelt: true };
    const ergebnis = aktionPruefenUndAusfuehren(vonId, a);
    if (a.aktionId) {
      erledigt.set(a.aktionId, ergebnis);
      if (erledigt.size > 600) erledigt.delete(erledigt.keys().next().value);
    }
    return ergebnis;
  }

  function aktionPruefenUndAusfuehren(vonId, a) {
    if (state.ende) return { ok: false, grund: 'vorbei' };
    if (!state.laeuft) return { ok: false, grund: 'pausiert' };
    const k = kaempfer.get(vonId);
    if (!k || k.team !== 'blau') return { ok: false, grund: 'keine-figur' };
    if (k.s.ko) return { ok: false, grund: 'kampfunfaehig' };
    if (gesperrt(k)) return { ok: false, grund: 'gesperrt' };
    switch (a.typ) {
      case 'karte': return karteSpielen(k, Number(a.hand), a.karte, a.ziel);
      case 'kraft': return kraftEinsetzen(k, a.ziel);
      case 'wiederbeleben': return wiederbeleben(k, a.ziel);
      default: return { ok: false, grund: 'unbekannt' };
    }
  }

  /**
   * Wer steuert eine Spielerfigur: 'mensch', 'ki' (KI-Ersatz/Partner) oder
   * 'leer' (gerade getrennt, wartet auf Wiederverbindung).
   */
  function setSteuerung(id, steuerung) {
    const k = kaempfer.get(id);
    if (!k || k.team !== 'blau' || k.s.steuerung === steuerung) return;
    k.s.steuerung = steuerung;
    k.denkTimer = 1;
    emit({ typ: 'steuerung', ziel: id, steuerung });
  }

  /** Ein Team-Signal ("Greif links an!") - die KI-Partnerin hört darauf. */
  function signal(vonId, signalId) {
    const gegner = reihenfolge.filter((k) => k.team === 'rot');
    const ziel = signalId === 'links' ? gegner[0] : signalId === 'rechts' ? gegner[1] : null;
    if (ziel) {
      kiTeam.blau.signalZiel = ziel.id;
      kiTeam.blau.signalBis = state.zeit + 6;
    }
  }

  /** Kampf kontrolliert beenden (z. B. Verbindung endgültig verloren). */
  function abbrechen(grund) {
    beenden('abbruch', grund);
  }

  function setLaeuft(laeuft) {
    if (state.ende) return;
    state.laeuft = laeuft;
  }

  /**
   * Der komplette Zustand als kleines, reines Datenobjekt - für das Netz
   * (Gastgeber -> Gast) und zum Wiederaufsetzen nach einer Verbindungslücke.
   */
  function zustand() {
    return zustandAus(state);
  }

  return {
    state,
    schritt,
    aktion,
    setSteuerung,
    signal,
    abbrechen,
    setLaeuft,
    zustand,
    kaempfer: (id) => kaempfer.get(id)?.s ?? null,
    handAttacken: (id) => kaempfer.get(id)?.fighter.handAttacks() ?? [],
  };
}

/** Rundet für das Netz auf zwei Stellen. */
const r2 = (x) => Math.round(x * 100) / 100;

/** Der Zustand als reines Datenobjekt (auch für Tests nutzbar). */
export function zustandAus(state) {
  const k = {};
  for (const id of state.reihenfolge) {
    const s = state.kaempfer[id];
    k[id] = {
      hp: s.hp,
      maxHp: s.maxHp,
      shield: s.shield,
      energie: s.energie,
      ef: r2(s.energieFortschritt),
      hand: [...s.hand],
      hv: s.handVersion,
      st: Object.fromEntries(Object.entries(s.status).map(([n, v]) => [n, r2(v)])),
      ss: r2(s.sperrSchutz),
      ko: s.ko,
      wb: s.wiederbelebt,
      kr: r2(s.kraft),
      kb: s.kraftBereit,
      an: s.ansage ? { ...s.ansage, rest: r2(s.ansage.rest) } : null,
      steu: s.steuerung,
    };
  }
  return { t: r2(state.zeit), seq: state.seq, phase: state.phase, kombo: { blau: r2(state.kombo.blau), rot: r2(state.kombo.rot) }, ende: state.ende, laeuft: state.laeuft, k };
}

/**
 * Übernimmt einen empfangenen Zustand in einen Spiegel-Zustand (beim Gast).
 * Der Spiegel hat dieselbe Form wie engine.state, damit die Anzeige beides
 * gleich behandeln kann.
 */
export function zustandUebernehmen(spiegel, z) {
  spiegel.zeit = z.t;
  spiegel.seq = Math.max(spiegel.seq ?? 0, z.seq);
  spiegel.phase = z.phase;
  spiegel.kombo = z.kombo;
  spiegel.ende = z.ende;
  spiegel.laeuft = z.laeuft;
  for (const [id, w] of Object.entries(z.k)) {
    const s = spiegel.kaempfer[id];
    if (!s) continue;
    s.hp = w.hp;
    s.maxHp = w.maxHp;
    s.shield = w.shield;
    s.energie = w.energie;
    s.energieFortschritt = w.ef;
    if (s.handVersion !== w.hv || s.hand.join() !== w.hand.join()) {
      s.hand = [...w.hand];
      s.handVersion = w.hv;
    }
    s.status = { ...w.st };
    s.sperrSchutz = w.ss;
    s.ko = w.ko;
    s.wiederbelebt = w.wb;
    s.kraft = w.kr;
    s.kraftBereit = w.kb;
    s.ansage = w.an;
    s.steuerung = w.steu;
  }
}
