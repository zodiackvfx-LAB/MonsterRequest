/**
 * Die KI des 2v2-Modus - für die Gegner (Team Rot) und für die
 * KI-Teamkameradin (Solo-Modus, Ersatz bei Verbindungsabbruch).
 *
 * FAIR STATT ALLWISSEND
 * Die KI bekommt nur eine "Sicht" (siehe sichtFuer in js/core/duell.js):
 * Lebenspunkte, Schilde, Energie, Effekte und Ankündigungen - also genau
 * das, was auch auf dem Bildschirm steht. Die Handkarten der Spieler und
 * ihre künftigen Aktionen kennt sie nicht. Jeder Zug läuft danach durch
 * dieselben Prüfungen wie ein Spielerzug und kostet echte Energie.
 *
 * WIE SIE DENKT
 * Jede mögliche Handlung (Karte auf Ziel X, Fähigkeit, Boss-Kraft) bekommt
 * einen Wert in "Schadenspunkten". Die beste wird gespielt - es sei denn,
 * in den nächsten Sekunden wäre etwas Besseres bezahlbar (dann spart sie,
 * wie ein Spieler, der auf die große Karte wartet).
 *
 * Der Schwierigkeitsgrad (js/data/duell.js) macht sie klüger:
 *   fehler       - wie oft sie etwas Zufälliges statt des Besten tut
 *   fokus        - wie stark sie angeschlagene Spieler gezielt bedrängt
 *   kombo        - ob sie Treffer mit dem Partner abstimmt
 *   schuetzen    - ob sie den bedrängten Partner beschützt
 *   unterbrechen - ob sie gefährliche Spieler (volle Kraft/Energie) stoppt
 *   planen       - gemeinsames Fokusziel beider Gegner
 */

/** Gegenüber: lebende Kämpfer des anderen Teams. */
function feinde(sicht) {
  return sicht.kaempfer.filter((k) => k.team !== sicht.team && !k.ko);
}
function freunde(sicht) {
  return sicht.kaempfer.filter((k) => k.team === sicht.team && !k.ko);
}
function finde(sicht, id) {
  return sicht.kaempfer.find((k) => k.id === id) ?? null;
}
const anteil = (k) => (k.maxHp ? k.hp / k.maxHp : 0);

/** Schaden, der bei diesem Ziel wohl ankommt (ohne Krit, Schild halb gewertet). */
function erwarteterSchaden(sicht, roh, ziel) {
  const schaden = roh * (sicht.damageFactor ?? 1) * (1 - (ziel.defense ?? 0));
  // Ein Schild schluckt einen Teil - der Treffer ist dann weniger wert.
  return Math.max(1, schaden - Math.min(schaden, ziel.shield) * 0.6);
}

/**
 * Wie lohnend ist dieses Ziel? 1 = neutral. Hier steckt die Taktik.
 */
function zielWert(sicht, ziel, schaden, grad, rolle) {
  let wert = 1;
  // Angeschlagene Spieler gezielt unter Druck setzen (je Grad stärker).
  wert += (1 - anteil(ziel)) * (grad.fokus ?? 0) * 0.9;
  // Besiegen ist besonders viel wert - aber nur, wenn der Grad das plant.
  if (schaden >= ziel.hp + ziel.shield && (grad.fokus ?? 0) > 0) wert += 0.5 + grad.fokus * 0.5;
  // Verlangsamte, geschwächte oder gesperrte Ziele nutzen (Angreifer besonders).
  const schwach = ziel.gesperrt || ziel.status.verlangsamt > 0 || ziel.status.geschwaecht > 0;
  if (schwach && (grad.fokus ?? 0) >= 0.35) wert += rolle === 'angreifer' ? 0.35 : 0.2;
  // Team-Kombo: hat der Partner dieses Ziel eben getroffen?
  if (grad.kombo && sicht.komboBereit) {
    const t = sicht.teamTreffer?.[ziel.id];
    if (t && t.von !== sicht.ich && t.vor <= sicht.komboFenster * 0.9) wert += rolle === 'angreifer' ? 0.5 : 0.35;
  }
  // Gemeinsames Fokusziel (nur beim Planen).
  if (grad.planen && sicht.gedaechtnis?.fokus === ziel.id && sicht.gedaechtnis.fokusBis > sicht.zeit) wert += 0.4;
  // Wer gleich seine Boss-Kraft zündet, ist gefährlich.
  if (grad.unterbrechen && ziel.kraftBereit) wert += 0.15;
  return wert;
}

/**
 * Auf die eigene Rollen-Fähigkeit (z. B. Elementarwelle, Wutschlag) darf ein
 * Gegner länger sparen als auf eine Karte - sie ist sein Markenzeichen.
 */
const FAEHIGKEIT_GEDULD = 4;

/** Alle Handlungen eines Gegners mit ihrem Wert. */
function gegnerOptionen(sicht, ich, grad) {
  const optionen = [];
  const spieler = feinde(sicht);
  const team = freunde(sicht);
  const partner = finde(sicht, sicht.partner);
  if (spieler.length === 0) return optionen;

  // Karten aus dem eigenen Deck.
  sicht.hand.forEach((karte, hand) => {
    if (karte.zielArt === 'verbuendeter' || karte.zielArt === 'selbst' || karte.zielArt === 'partner' || karte.zielArt === 'beideVerbuendete') {
      for (const ziel of team) {
        let wert = 0;
        if (karte.heal > 0) {
          const fehlt = ziel.maxHp - ziel.hp;
          wert += Math.min(karte.heal, fehlt) * (anteil(ziel) < 0.5 ? 1.4 : 0.7);
        }
        if (karte.shield > 0) {
          const bedraengt = ziel.druck > 0 || anteil(ziel) < 0.5;
          const darf = ziel.id === ich.id || grad.schuetzen;
          wert += darf && bedraengt && ziel.shield < karte.shield * 0.5 ? karte.shield * 0.9 : karte.shield * 0.15;
        }
        optionen.push({ zug: { typ: 'karte', hand, ziel: ziel.id }, kosten: karte.cost, wert });
      }
      return;
    }
    const flaeche = karte.zielArt === 'beideGegner' || karte.zielArt === 'arena';
    for (const ziel of flaeche ? [spieler[0]] : spieler) {
      const schaden = erwarteterSchaden(sicht, karte.damage, ziel);
      const wert = flaeche
        ? spieler.reduce((s, z) => s + erwarteterSchaden(sicht, karte.damage * 0.6, z), 0)
        : schaden * zielWert(sicht, ziel, schaden, grad, ich.rolle);
      optionen.push({ zug: { typ: 'karte', hand, ziel: ziel.id }, kosten: karte.cost, wert, schaden: karte.damage > 0 });
    }
  });

  // Rollen-Fähigkeiten.
  const vorher = optionen.length;
  for (const f of sicht.faehigkeiten) {
    if (f.pause > 0) continue;
    switch (f.id) {
      case 'wutschlag':
        for (const ziel of spieler) {
          const schaden = erwarteterSchaden(sicht, f.wert, ziel);
          // Etwas Abzug: eine Ankündigung kann unterbrochen werden.
          optionen.push({ zug: { typ: 'faehigkeit', id: f.id, ziel: ziel.id }, kosten: f.kosten, wert: schaden * zielWert(sicht, ziel, schaden, grad, ich.rolle) * 0.9, schaden: true });
        }
        break;
      case 'schutzwall':
        for (const ziel of team) {
          const fremd = ziel.id !== ich.id;
          if (fremd && !grad.schuetzen) continue;
          const bedraengt = ziel.druck > ziel.maxHp * 0.08 || anteil(ziel) < 0.55 || Boolean(feinde(sicht).find((s) => s.kraftBereit));
          if (ziel.shield > f.wert * 0.5) continue;
          optionen.push({ zug: { typ: 'faehigkeit', id: f.id, ziel: ziel.id }, kosten: f.kosten, wert: bedraengt ? f.wert * (fremd ? 1.15 : 0.9) : f.wert * 0.15 });
        }
        break;
      case 'schildstoss':
        for (const ziel of spieler) {
          if (ziel.gesperrt || (ziel.status && ziel.status.betaeubt)) continue;
          const gefaehrlich = ziel.kraftBereit || ziel.energie >= 8;
          const wert = grad.unterbrechen && gefaehrlich ? f.wert * 3 + 20 : erwarteterSchaden(sicht, f.wert, ziel) * 0.8;
          optionen.push({ zug: { typ: 'faehigkeit', id: f.id, ziel: ziel.id }, kosten: f.kosten, wert, schaden: true });
        }
        break;
      case 'elementarwelle':
      case 'bosszorn': {
        const summe = spieler.reduce((s, z) => s + erwarteterSchaden(sicht, f.wert, z), 0);
        optionen.push({ zug: { typ: 'faehigkeit', id: f.id, ziel: null }, kosten: f.kosten, wert: summe * (f.id === 'bosszorn' ? 1.25 : 1.12), schaden: true });
        break;
      }
      case 'heilung':
        for (const ziel of team) {
          const fehlt = ziel.maxHp - ziel.hp;
          if (fehlt < f.wert * 0.4) continue;
          optionen.push({ zug: { typ: 'faehigkeit', id: f.id, ziel: ziel.id }, kosten: f.kosten, wert: Math.min(f.wert, fehlt) * (anteil(ziel) < 0.5 ? 1.35 : 0.8) });
        }
        break;
      case 'staerkung':
        if (partner && !partner.ko && !(partner.status.verstaerkt > 0)) {
          optionen.push({ zug: { typ: 'faehigkeit', id: f.id, ziel: partner.id }, kosten: f.kosten, wert: 10 + partner.energie * 2.2 });
        }
        break;
      case 'fluch': {
        const ziel = [...spieler].filter((s) => !(s.status.geschwaecht > 0)).sort((a, b) => b.energie - a.energie)[0];
        if (ziel) optionen.push({ zug: { typ: 'faehigkeit', id: f.id, ziel: ziel.id }, kosten: f.kosten, wert: 10 + ziel.energie * 1.6 + (ziel.kraftBereit ? 6 : 0) });
        break;
      }
      default:
        break;
    }
  }
  for (let i = vorher; i < optionen.length; i++) optionen[i].geduld = FAEHIGKEIT_GEDULD;
  return optionen;
}

/** Bestes Ziel für eine Boss-Kraft des Gegners. */
function kraftZiel(sicht, grad) {
  const spieler = feinde(sicht);
  if (sicht.kraftArt === 'schild') return null;
  if (sicht.kraftArt === 'frost' || sicht.kraftArt === 'energieraub') {
    // Wer viel Energie hat, verliert am meisten - sofern nicht schon geschützt.
    const kandidaten = spieler.filter((s) => !s.gesperrt);
    return ([...kandidaten].sort((a, b) => b.energie - a.energie)[0] ?? spieler[0])?.id ?? null;
  }
  const bewertet = spieler.map((z) => ({ z, w: zielWert(sicht, z, 30, grad, 'boss') }));
  bewertet.sort((a, b) => b.w - a.w);
  return bewertet[0]?.z.id ?? null;
}

/**
 * Lohnt sich Warten? Ja, wenn bald (patience Sekunden) etwas Wertvolleres
 * bezahlbar ist als das Beste, was jetzt geht. Gemessen ab dem Energiestand,
 * bei dem das Sparen begann - sonst spart sie sich endlos hoch.
 */
function lieberSparen(sicht, ich, alle, bester, patience) {
  const start = sicht.sparen.sparenAb ?? ich.energie;
  const besser = alle.some((o) => o.kosten > ich.energie && o.kosten <= start + patience + (o.geduld ?? 0) && o.wert > (bester?.wert ?? 0) * 1.15);
  if (besser) {
    if (sicht.sparen.sparenAb === null) sicht.sparen.sparenAb = ich.energie;
    return true;
  }
  sicht.sparen.sparenAb = null;
  return false;
}

/**
 * Der nächste Zug - oder null für "abwarten".
 *
 * @param {object} sicht - siehe sichtFuer in js/core/duell.js
 * @param {object} o - { grad, partnerKi, zufall, kiPartner }
 */
export function kiZug(sicht, { grad, partnerKi = false, zufall = Math.random, kiPartner = {} } = {}) {
  const ich = finde(sicht, sicht.ich);
  if (!ich || ich.ko || ich.gesperrt) return null;
  if (partnerKi) return partnerZug(sicht, ich, { zufall, kiPartner });

  // Die Boss-Kraft hat Vorrang (wie im Abenteuer).
  if (sicht.kraftBereit) return { typ: 'kraft', ziel: kraftZiel(sicht, grad) };

  const alle = gegnerOptionen(sicht, ich, grad).filter((o) => o.wert > 0);
  const bezahlbar = alle.filter((o) => o.kosten <= ich.energie);

  // Fehler: manchmal etwas Zufälliges (nie etwas Unbezahlbares).
  if (bezahlbar.length && zufall() < (grad.fehler ?? 0)) {
    return bezahlbar[Math.floor(zufall() * bezahlbar.length)].zug;
  }

  bezahlbar.sort((a, b) => b.wert - a.wert);
  const bester = bezahlbar[0] ?? null;
  if (lieberSparen(sicht, ich, alle, bester, sicht.patience ?? 2)) return null;
  if (!bester) return null;

  // Beim Planen merken sich die Gegner ein gemeinsames Ziel.
  if (grad.planen && bester.schaden && bester.zug.ziel) {
    sicht.gedaechtnis.fokus = bester.zug.ziel;
    sicht.gedaechtnis.fokusBis = sicht.zeit + 5;
  }
  return bester.zug;
}

/* ------------------------------------------------------------------ */
/*  KI-Teamkameradin                                                   */
/* ------------------------------------------------------------------ */

/**
 * Die verbündete KI: hilft, statt zu glänzen. Sie folgt Team-Signalen und
 * dem Ziel ihres menschlichen Partners, heilt ihn, wenn es eng wird, und spielt sonst solide - etwas langsamer und fehlerhafter
 * als ein aufmerksamer Mensch (siehe KI_PARTNER in js/data/duell.js).
 */
function partnerZug(sicht, ich, { zufall, kiPartner }) {
  const gegner = feinde(sicht);
  if (gegner.length === 0) return null;

  // Ziel: Signal > Ziel des Partners > wer gerade etwas ankündigt > der Schwächste.
  const signal = sicht.gedaechtnis?.signalBis > sicht.zeit ? finde(sicht, sicht.gedaechtnis.signalZiel) : null;
  const vomPartner = finde(sicht, sicht.zielWahlPartner);
  const ankuender = gegner.find((g) => g.ansage);
  const schwaechster = [...gegner].sort((a, b) => anteil(a) - anteil(b))[0];
  const ziel = [signal, vomPartner, ankuender, schwaechster].find((z) => z && !z.ko && z.team !== sicht.team);

  // Boss-Kraft einsetzen, sobald sie bereit ist.
  if (sicht.kraftBereit) return { typ: 'kraft', ziel: ziel?.id ?? null };

  const optionen = [];
  sicht.hand.forEach((karte, hand) => {
    if (karte.cost > ich.energie && karte.cost > ich.energie + (kiPartner.patience ?? 2)) return;
    if (karte.zielArt === 'verbuendeter') {
      for (const f of freunde(sicht)) {
        let wert = 0;
        if (karte.heal > 0 && anteil(f) < 0.45) wert += Math.min(karte.heal, f.maxHp - f.hp) * 1.3;
        if (karte.shield > 0 && (f.druck > 0 || gegner.some((g) => g.ansage?.ziel === f.id)) && f.shield < karte.shield * 0.5) wert += karte.shield * 0.9;
        optionen.push({ zug: { typ: 'karte', hand, ziel: f.id }, kosten: karte.cost, wert });
      }
      return;
    }
    const flaeche = karte.zielArt === 'beideGegner' || karte.zielArt === 'arena';
    let wert = flaeche
      ? gegner.reduce((s, g) => s + erwarteterSchaden(sicht, karte.damage * 0.6, g), 0)
      : erwarteterSchaden(sicht, karte.damage, ziel ?? gegner[0]);
    // Eine laufende Ankündigung mit einer großen Karte unterbrechen.
    if (ankuender && karte.cost >= 5 && (ziel?.id === ankuender.id || flaeche)) wert *= 1.4;
    optionen.push({ zug: { typ: 'karte', hand, ziel: (ziel ?? gegner[0]).id }, kosten: karte.cost, wert });
  });

  const bezahlbar = optionen.filter((o) => o.kosten <= ich.energie && o.wert > 0);
  if (bezahlbar.length && zufall() < (kiPartner.fehler ?? 0.15)) {
    return bezahlbar[Math.floor(zufall() * bezahlbar.length)].zug;
  }
  bezahlbar.sort((a, b) => b.wert - a.wert);
  const bester = bezahlbar[0] ?? null;
  if (lieberSparen(sicht, ich, optionen, bester, kiPartner.patience ?? 2)) return null;
  return bester?.zug ?? null;
}
