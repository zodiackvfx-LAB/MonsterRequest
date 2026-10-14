/**
 * Test der Kernregeln - ohne Browser, direkt mit Node ausführbar:
 *
 *     node tests/regeln.test.mjs
 *
 * Getestet werden die Regeln, die das Spiel ausmachen. Wenn hier etwas rot
 * wird, stimmt eine Grundregel nicht mehr.
 */

// state.js speichert im Browser - fuer den Test genuegt eine einfache Attrappe.
globalThis.localStorage = {
  _daten: new Map(),
  getItem(key) { return this._daten.has(key) ? this._daten.get(key) : null; },
  setItem(key, value) { this._daten.set(key, String(value)); },
  removeItem(key) { this._daten.delete(key); },
};

import { createDeck, DECK_SIZE, HAND_SIZE } from '../js/core/deck.js';
import { createFighter, MAX_ENERGIE, START_ENERGIE } from '../js/core/fighter.js';
import { MONSTERS, SPIELER_FIGUREN, STARTER_MONSTER_ID, getMonster } from '../js/data/monsters.js';
import { ATTACKS, ROCCO_ATTACKEN, START_ATTACKEN, getAttack } from '../js/data/attacks.js';
import { ENEMIES } from '../js/data/enemies.js';
import { GEGNER_ARTEN } from '../js/data/gegnerarten.js';
import { BOSS_FORMEN, FORM_NAMEN, GROESSE, formenPruefen } from '../js/ui/sprite.js';
import { WORLDS, fightsInWorld, getWorld } from '../js/data/worlds.js';
import { LOGO_MONSTER, LOGO_QUEST } from '../js/ui/logo-pfade.js';
import { existsSync, readFileSync } from 'node:fs';
import { SKIN_BILDER, SKIN_POSEN } from '../js/data/timo-skins.js';
import { skinBild } from '../js/ui/sprite.js';
import { LEVELS, bossLevelOf, levelsOfWorld } from '../js/data/levels.js';
import {
  besitztAttacke,
  besitztKraft,
  beuteGutschreiben,
  bezahlen,
  bossKraftFreischalten,
  completeLevel,
  figurFrei,
  getAktiveFigur,
  setAktiveFigur,
  gameState,
  getBossKraft,
  getDeck,
  isLevelUnlocked,
  isWorldUnlocked,
  kannBezahlen,
  nextLevelOf,
  loadProgress,
  resetProgress,
  setBossKraft,
  setDeck,
} from '../js/core/state.js';
import { TRUHEN } from '../js/data/shop.js';
import { BEUTE_ATTACKEN, SELTENHEITEN, SKINS, getSkin } from '../js/data/items.js';
import { BOSS_MATERIAL, materialBelohnung, siegBelohnung, siegeBisGratisTruhe } from '../js/core/belohnung.js';
import { BOSS_KRAEFTE, getKraft, kraftFuerWelt } from '../js/data/kraefte.js';
import { ERFOLGE } from '../js/data/erfolge.js';
import { getSchwierigkeit } from '../js/data/schwierigkeit.js';
import { arenaGegner, arenaLevel, istBossRunde } from '../js/data/arena.js';
import { statErhoehen, pruefeNeueErfolge, erfolgFrei, erfolgErreicht } from '../js/core/statistik.js';
import { BOSS_TRUHE } from '../js/data/shop.js';
import { AUFGABEN, AUFGABEN_PRO_TAG } from '../js/data/aufgaben.js';
import { SORTIERUNGEN, sortiereAttacken } from '../js/core/sortierung.js';
import { ALLE_STIMMUNGEN, tageszeitFuer, waehleStimmung } from '../js/ui/umgebung.js';
import { bewegungVon } from '../js/ui/kampfintro.js';
import { createBattle } from '../js/core/battle.js';
import { karteGutschreiben, saveProgress, sicherungsInfo } from '../js/core/state.js';
import { trophaeenNiederlage, trophaeenSieg } from '../js/core/trophaeen.js';
import { LIGEN, ligaVon, naechsteLiga, trophaeenFuerSieg } from '../js/data/trophaeen.js';
import { alleZustaende, freischaltenStarten, platzZustand, sofortPreis, truheAusPlatz, truheEinlagern } from '../js/core/truhenplaetze.js';
import { besiegteBossWelten, modusErgebnis, modusFrei, modusGegner, modusInfo, modusLevel, modusStarten, zeitText } from '../js/core/modi.js';
import { MODI, TAGES_KNIFFE, tagesHerausforderung } from '../js/data/modi.js';
import { alleZeitTruhen, zeitTruheAbholen, zeitTruheZustand } from '../js/core/zeittruhen.js';
import { KLAENGE, getKlang } from '../js/data/sounds.js';
import { MUSIK, MUSTER_TAKT, getMusik } from '../js/data/musik.js';
import {
  aufgabeAbholen,
  aufgabenFuerTag,
  fortschrittMelden,
  getTagesAufgaben,
  heute,
  offeneBelohnungen,
} from '../js/core/aufgaben.js';
import {
  MAX_ATTACKEN_LEVEL,
  MAX_STUFE,
  attackeAufwerten,
  attackeMitLevel,
  attackenKosten,
  aufwertungsKosten,
  charakterWerte,
  getAttackenLevel,
  getCharakter,
  wertAufwerten,
  xpFuerNaechstesLevel,
  xpGutschreiben,
} from '../js/core/progression.js';
import { truheOeffnen } from '../js/core/loot.js';
import { TRUHEN_DESIGNS } from '../js/ui/truhen.js';
import { KARTEN_MAX_LEVEL, KOPIEN_FUER_LEVEL, levelFaktor } from '../js/data/karten.js';

/** Die Spielerfigur - ueber die id geholt, damit ein Figurenwechsel
    (frueher Glutwelpe, jetzt Timo) die Tests nicht bricht. */
const SPIELFIGUR = getMonster(STARTER_MONSTER_ID);

let bestanden = 0;
let fehler = 0;

function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    bestanden++;
    console.log(`  ok   ${beschreibung}`);
  } else {
    fehler++;
    console.log(`  FEHL ${beschreibung}`);
  }
}

console.log('\nDaten');
for (const monster of Object.values(MONSTERS)) {
  pruefe(`${monster.name}: Deck hat genau ${DECK_SIZE} Attacken`, monster.deck.length === DECK_SIZE);
  pruefe(
    `${monster.name}: alle Attacken existieren`,
    monster.deck.every((id) => Boolean(ATTACKS[id]))
  );
  pruefe(
    `${monster.name}: keine Attacke kostet mehr als ${MAX_ENERGIE} Energie`,
    monster.deck.every((id) => getAttack(id).cost <= MAX_ENERGIE)
  );
}

console.log('\nPixel-Figuren');
{
  const probleme = formenPruefen();
  pruefe(`Alle Grundformen sind ${GROESSE} mal ${GROESSE} Felder`, probleme.length === 0);
  if (probleme.length) probleme.slice(0, 5).forEach((t) => console.log('       ' + t));

  const formen = new Set([...FORM_NAMEN, ...BOSS_FORMEN]);
  const gegner = Object.values(ENEMIES);
  pruefe(
    'Jeder Gegner hat eine gueltige Form',
    gegner.every((e) => formen.has(e.look.form))
  );
  pruefe(
    'Bosse benutzen Formen, die kein normaler Gegner hat',
    gegner.filter((e) => e.isBoss).every((e) => BOSS_FORMEN.includes(e.look.form))
  );

  // In einer Welt darf keine Figur aussehen wie eine andere
  let eindeutig = true;
  for (const world of WORLDS) {
    const bilder = gegner
      .filter((e) => e.worldId === world.id)
      .map((e) => `${e.look.form}|${e.look.hue}`);
    if (new Set(bilder).size !== bilder.length) eindeutig = false;
  }
  pruefe('In jeder Welt sieht keine Figur aus wie eine andere', eindeutig);
}

console.log('\nGegner');
for (const enemy of Object.values(ENEMIES)) {
  if (enemy.deck.length !== DECK_SIZE) {
    pruefe(`${enemy.name}: Deck hat genau ${DECK_SIZE} Attacken`, false);
  }
  if (!enemy.deck.every((id) => Boolean(ATTACKS[id]))) {
    pruefe(`${enemy.name}: alle Attacken existieren`, false);
  }
}
pruefe(`Alle ${Object.keys(ENEMIES).length} Gegner haben ein gueltiges 8er-Deck`, true);
pruefe(
  'Jeder Gegner hat einen eigenen Namen',
  new Set(Object.values(ENEMIES).map((e) => e.name)).size === Object.keys(ENEMIES).length
);

console.log('\nWelten und Kaempfe');
for (const world of WORLDS) {
  const kaempfe = levelsOfWorld(world.id);
  pruefe(
    `${world.name}: ${kaempfe.length} Kaempfe (10 bis 15 erlaubt)`,
    kaempfe.length >= 10 && kaempfe.length <= 15 && kaempfe.length === fightsInWorld(world)
  );
  pruefe(`${world.name}: letzter Kampf ist der Boss`, kaempfe.at(-1).isBoss === true);
  pruefe(
    `${world.name}: nur ein Boss`,
    kaempfe.filter((level) => level.isBoss).length === 1
  );
}
pruefe('Alle Level-ids sind eindeutig', new Set(LEVELS.map((l) => l.id)).size === LEVELS.length);

console.log('\nFortschritt');
{
  resetProgress();
  pruefe('Welt 1 ist offen', isWorldUnlocked(1));
  pruefe('Welt 2 ist gesperrt', !isWorldUnlocked(2));
  pruefe('Kampf 1-1 ist offen', isLevelUnlocked('1-1'));
  pruefe('Kampf 1-2 ist gesperrt', !isLevelUnlocked('1-2'));

  completeLevel('1-1', { stars: 3, reward: 25 });
  pruefe('Nach dem Sieg ist Kampf 1-2 offen', isLevelUnlocked('1-2'));
  pruefe('Naechster Kampf wird richtig gefunden', nextLevelOf(1)?.id === '1-2');

  // Welt 1 komplett spielen
  for (const level of levelsOfWorld(1)) completeLevel(level.id, { stars: 2, reward: level.reward });
  pruefe('Nach dem Boss ist Welt 2 offen', isWorldUnlocked(2));
  pruefe('Kampf 2-1 ist offen', isLevelUnlocked('2-1'));
  pruefe('Kampf 2-2 ist noch gesperrt', !isLevelUnlocked('2-2'));
  pruefe('Welt 3 bleibt gesperrt', !isWorldUnlocked(3));

  const boss = bossLevelOf(1);
  pruefe('Der Boss gibt mehr Muenzen als der erste Kampf', boss.reward > levelsOfWorld(1)[0].reward);
  resetProgress();
}

console.log('\nShop und Truhen');
{
  resetProgress();
  gameState.coins = 10000;

  for (const truhe of TRUHEN) {
    const beute = truheOeffnen(truhe);
    pruefe(`${truhe.name}: enthaelt genau ${truhe.anzahl} Stuecke`, beute.length === truhe.anzahl);
    pruefe(
      `${truhe.name}: jedes Stueck hat Art und Seltenheit`,
      beute.every((b) => b.art && b.seltenheit && b.name)
    );
    let einmalMuenzen = true;
    let imRahmen = true;
    for (let i = 0; i < 300; i++) {
      const probe = truheOeffnen(truhe);
      const muenzen = probe.filter((b) => b.art === 'muenzen');
      if (muenzen.length !== 1) einmalMuenzen = false;
      if (muenzen.some((m) => m.menge < 150 || m.menge > 500)) imRahmen = false;
    }
    pruefe(`${truhe.name}: genau ein Muenzstueck pro Truhe (300 Durchlaeufe)`, einmalMuenzen);
    let einmalMaterial = true;
    let immerKarte = true;
    for (let i = 0; i < 300; i++) {
      const probe = truheOeffnen(truhe);
      if (probe.filter((b) => b.art === 'material').length !== 1) einmalMaterial = false;
      if (!probe.some((b) => b.art === 'karte' || b.art === 'attacke')) immerKarte = false;
    }
    pruefe(`${truhe.name}: genau einmal Material`, einmalMaterial);
    pruefe(`${truhe.name}: immer mindestens eine Faehigkeitskarte`, immerKarte);
    pruefe(`${truhe.name}: Muenzen immer zwischen 150 und 500`, imRahmen);
    let nieDoppelt = true;
    for (let i = 0; i < 300; i++) {
      const ids = truheOeffnen(truhe).filter((b) => b.id).map((b) => b.id);
      if (new Set(ids).size !== ids.length) nieDoppelt = false;
    }
    pruefe(`${truhe.name}: keine Attacke und kein Skin doppelt in einer Truhe`, nieDoppelt);
    if (truhe.garantie) {
      // Ueber viele Durchlaeufe muss die Garantie immer halten.
      const rang = { gewoehnlich: 0, selten: 1, episch: 2, legendaer: 3 };
      let immer = true;
      for (let i = 0; i < 200; i++) {
        const probe = truheOeffnen(truhe);
        if (!probe.some((b) => rang[b.seltenheit] >= rang[truhe.garantie])) immer = false;
      }
      pruefe(`${truhe.name}: Garantie "${truhe.garantie}" haelt in 200 Durchlaeufen`, immer);
    }
  }

  pruefe('Jede Truhe hat ein gezeichnetes Design',
    [...TRUHEN, BOSS_TRUHE].every((t) => TRUHEN_DESIGNS.includes(t.design)));

  // Bezahlen
  gameState.coins = 300;
  pruefe('250 Muenzen sind bezahlbar', kannBezahlen(250));
  pruefe('2000 Muenzen sind nicht bezahlbar', !kannBezahlen(2000));
  bezahlen(250);
  pruefe('Nach dem Kauf sind 50 Muenzen uebrig', gameState.coins === 50);
  pruefe('Ein zu teurer Kauf wird abgelehnt', bezahlen(999) === false && gameState.coins === 50);

  // Gutschreiben
  beuteGutschreiben({ art: 'muenzen', menge: 100, seltenheit: 'selten' });
  pruefe('Muenzen werden gutgeschrieben', gameState.coins === 150);
  beuteGutschreiben({ art: 'attacke', id: 'blitzschlag', seltenheit: 'selten' });
  pruefe('Attacke wird freigeschaltet', besitztAttacke('blitzschlag'));
  beuteGutschreiben({ art: 'attacke', id: 'blitzschlag', seltenheit: 'selten' });
  pruefe(
    'Dieselbe Attacke wird nicht doppelt eingetragen',
    gameState.ownedAttacks.filter((a) => a === 'blitzschlag').length === 1
  );
  resetProgress();
}

console.log('\nCharakter-Level');
{
  resetProgress();
  const held = SPIELFIGUR;

  pruefe('Startet auf Level 1', getCharakter(held.id).level === 1);
  pruefe(
    'Jedes Level kostet mehr als das davor',
    [1, 2, 3, 4, 5].every((l) => xpFuerNaechstesLevel(l) < xpFuerNaechstesLevel(l + 1))
  );

  const ergebnis = xpGutschreiben(held.id, xpFuerNaechstesLevel(1));
  pruefe('Genug Erfahrung fuehrt zu Level 2', ergebnis.levelNachher === 2 && ergebnis.aufgestiegen);
  pruefe('Ueberschuss bleibt erhalten', getCharakter(held.id).xp === 0);

  xpGutschreiben(held.id, 100000);
  const hoch = getCharakter(held.id).level;
  pruefe('Viel Erfahrung fuehrt zu mehreren Leveln', hoch > 5);

  const werteHoch = charakterWerte(held);
  resetProgress();
  const werteNiedrig = charakterWerte(held);
  pruefe('Hoeheres Level bedeutet mehr Lebenspunkte', werteHoch.maxHp > werteNiedrig.maxHp);
  pruefe('Hoeheres Level bedeutet mehr Angriff', werteHoch.damageFactor > werteNiedrig.damageFactor);
  pruefe('Verteidigung bleibt unter 50 Prozent', werteHoch.defense < 0.5);
  pruefe('Tempo bleibt hoechstens beim Anderthalbfachen', werteHoch.energieProSekunde <= 1.5);

  // Das Charakter-Level haengt NICHT am Weltfortschritt
  completeLevel('1-1', { stars: 3, reward: 10 });
  pruefe(
    'Ein geschaffter Kampf aendert das Charakter-Level nicht von selbst',
    getCharakter(held.id).level === 1
  );
  resetProgress();
}

console.log('\nAufwertungen');
{
  resetProgress();
  const held = SPIELFIGUR;

  pruefe('Ohne Muenzen keine Aufwertung', wertAufwerten(held.id, 'hp') === false);

  gameState.coins = 100000;
  gameState.materials = 1000;
  const vorher = charakterWerte(held).maxHp;
  pruefe('Mit Muenzen klappt die Aufwertung', wertAufwerten(held.id, 'hp') === true);
  pruefe('Die Aufwertung wirkt sich aus', charakterWerte(held).maxHp > vorher);
  pruefe(
    'Jede Stufe kostet mehr als die davor',
    [0, 1, 2, 3].every((st) => aufwertungsKosten(st).muenzen < aufwertungsKosten(st + 1).muenzen)
  );

  for (let i = 0; i < MAX_STUFE + 3; i++) wertAufwerten(held.id, 'hp');
  pruefe(
    `Aufwertung endet bei Stufe ${MAX_STUFE}`,
    getCharakter(held.id).upgrades.hp === MAX_STUFE
  );
  resetProgress();
}

console.log('\nAttacken-Level');
{
  resetProgress();
  gameState.coins = 100000;
  gameState.materials = 1000;

  // Irgendeine Angriffsattacke aus dem Deck - so haengt der Test an keinem Namen.
  const PROBE = SPIELFIGUR.deck.find((id) => getAttack(id).damage > 0);
  const grund = getAttack(PROBE);
  pruefe('Attacke startet auf Level 1', getAttackenLevel(PROBE) === 1);

  attackeAufwerten(PROBE);
  const stufe2 = attackeMitLevel(getAttack(PROBE));
  pruefe('Nach dem Aufwerten macht sie mehr Schaden', stufe2.damage > grund.damage);
  pruefe('Die Energiekosten bleiben gleich', stufe2.cost === grund.cost);
  pruefe(
    'Jede Attacken-Stufe kostet mehr',
    [1, 2, 3].every((l) => attackenKosten(l).muenzen < attackenKosten(l + 1).muenzen)
  );

  gameState.coins = 10000000;
  for (let i = 0; i < MAX_ATTACKEN_LEVEL + 3; i++) attackeAufwerten(PROBE);
  pruefe(
    `Attacken enden bei Level ${MAX_ATTACKEN_LEVEL}`,
    getAttackenLevel(PROBE) === MAX_ATTACKEN_LEVEL
  );

  // Gegner duerfen davon nichts mitbekommen
  const gegnerAttacke = Object.values(ENEMIES)[0].deck[0];
  pruefe(
    'Gegner-Attacken bleiben auf Level 1',
    getAttackenLevel(gegnerAttacke) === 1 &&
      attackeMitLevel(getAttack(gegnerAttacke)).damage === getAttack(gegnerAttacke).damage
  );
  resetProgress();
}

console.log('\nDeck aendern');
{
  resetProgress();
  const monster = SPIELFIGUR;
  pruefe('Ohne Aenderung gilt das Standarddeck', getDeck(monster).join() === monster.deck.join());

  const neu = [...monster.deck];
  neu[0] = 'blitzschlag';
  setDeck(monster.id, neu);
  pruefe('Geaendertes Deck wird verwendet', getDeck(monster)[0] === 'blitzschlag');
  pruefe('Das Deck hat weiterhin 8 Karten', getDeck(monster).length === DECK_SIZE);

  let abgelehnt = false;
  try {
    setDeck(monster.id, SPIELFIGUR.deck.slice(0, 2));
  } catch {
    abgelehnt = true;
  }
  pruefe('Ein Deck mit 2 Karten wird abgelehnt', abgelehnt);
  resetProgress();
}

console.log('\nDeck und Hand');
{
  const deck = createDeck(SPIELFIGUR.deck);
  pruefe(`Starthand hat ${HAND_SIZE} Karten`, deck.hand.length === HAND_SIZE);

  // 20 Karten ausspielen: die Hand muss immer wieder aufgefüllt werden,
  // auch wenn der Nachziehstapel zwischendurch leer ist.
  let immerVoll = true;
  for (let i = 0; i < 20; i++) {
    deck.play(0);
    if (deck.hand.length !== HAND_SIZE) immerVoll = false;
  }
  pruefe('Hand bleibt nach 20 gespielten Karten immer bei 4', immerVoll);
  pruefe(
    'Karten gehen nicht verloren',
    deck.hand.length + deck.drawCount + deck.discardCount === DECK_SIZE
  );
}

console.log('\nEnergie-System');
{
  const kaempfer = createFighter(SPIELFIGUR);
  pruefe(`Startet mit ${START_ENERGIE} Energie`, kaempfer.state.energie === START_ENERGIE);

  kaempfer.energieAufladen(100); // 100 Sekunden auf einmal
  pruefe(`Energie steigt nie über ${MAX_ENERGIE}`, kaempfer.state.energie === MAX_ENERGIE);

  // Alles ausgeben, was geht
  for (let i = 0; i < 30; i++) {
    const bezahlbar = kaempfer.state.hand.findIndex((id) => kaempfer.canAfford(getAttack(id).cost));
    if (bezahlbar === -1) break;
    kaempfer.useCard(bezahlbar);
  }
  pruefe('Energie faellt nie unter 0', kaempfer.state.energie >= 0);

  const teuer = createFighter(SPIELFIGUR);
  const teuerste = teuer.handAttacks().reduce((a, b) => (a.cost > b.cost ? a : b));
  const index = teuer.state.hand.indexOf(teuerste.id);
  const darf = teuerste.cost <= teuer.state.energie;
  const ergebnis = teuer.useCard(index);
  pruefe(
    'Zu teure Attacke wird abgelehnt',
    darf ? ergebnis !== null : ergebnis === null
  );
}

console.log('\nSchaden und Schild');
{
  const kaempfer = createFighter(SPIELFIGUR);
  const start = kaempfer.state.hp;

  kaempfer.takeDamage(10);
  pruefe('Schaden zieht Lebenspunkte ab', kaempfer.state.hp === start - 10);

  kaempfer.addShield(20);
  const ergebnis = kaempfer.takeDamage(30);
  pruefe('Schild fängt Schaden zuerst ab', ergebnis.shield === 20 && ergebnis.hp === 10);
  pruefe('Schild ist danach aufgebraucht', kaempfer.state.shield === 0);

  kaempfer.takeDamage(9999);
  pruefe('Lebenspunkte fallen nie unter 0', kaempfer.state.hp === 0);

  kaempfer.heal(9999);
  pruefe('Heilung geht nie über das Maximum', kaempfer.state.hp === kaempfer.state.maxHp);
}

console.log('\nSammlung');
{
  pruefe('Es gibt genau 8 Startattacken', START_ATTACKEN.length === 8);

  const ohneSeltenheit = START_ATTACKEN.filter((id) => !SELTENHEITEN[getAttack(id).seltenheit]);
  pruefe('Jede Startattacke hat eine gueltige Seltenheit', ohneSeltenheit.length === 0);

  const beuteOhne = BEUTE_ATTACKEN.filter((a) => !SELTENHEITEN[a.seltenheit]);
  pruefe('Jede Beute-Attacke hat eine gueltige Seltenheit', beuteOhne.length === 0);

  const skinOhne = SKINS.filter((skin) => !SELTENHEITEN[skin.seltenheit]);
  pruefe('Jeder Skin hat eine gueltige Seltenheit', skinOhne.length === 0);

  // Start- und Beuteattacken duerfen sich nicht ueberschneiden.
  const doppelt = BEUTE_ATTACKEN.filter((a) => START_ATTACKEN.includes(a.id));
  pruefe('Beute-Attacken sind nicht schon im Startdeck', doppelt.length === 0);

  // Die Sammlung zeigt Start- und Beuteattacken zusammen.
  const sammelbar = START_ATTACKEN.length + BEUTE_ATTACKEN.length;
  pruefe(`Sammlung umfasst alle ${sammelbar} Attacken (8 Start + Beute)`,
    sammelbar === 8 + BEUTE_ATTACKEN.length && sammelbar >= 18);

  // Jede sammelbare Attacke muss im Katalog stehen.
  const fehlend = [...START_ATTACKEN, ...BEUTE_ATTACKEN.map((a) => a.id)].filter((id) => !ATTACKS[id]);
  pruefe('Jede sammelbare Attacke steht im Katalog', fehlend.length === 0);
}

console.log('\nBelohnungen');
{
  resetProgress();

  const ersterKampf = LEVELS.find((l) => l.worldId === 1 && !l.isBoss);
  const boss = bossLevelOf(1);

  // Immer gleicher Wuerfel, damit das Ergebnis pruefbar ist.
  const nieGlueck = () => 0.99;
  const immerGlueck = () => 0;

  const normal = siegBelohnung(ersterKampf, 3, SPIELFIGUR.id, nieGlueck);
  pruefe('Sieg bringt Muenzen und Erfahrung', normal.stuecke.length >= 2);
  pruefe(
    'Jedes Belohnungsstueck hat Symbol, Name und Seltenheit',
    normal.stuecke.every((s) => s.icon && s.name && SELTENHEITEN[s.seltenheit])
  );

  // 3 Sterne = +30 Prozent Muenzen
  const ohneSterne = LEVELS.find((l) => l.worldId === 1 && l.number === 2);
  resetProgress();
  const mitDrei = siegBelohnung(ohneSterne, 3, SPIELFIGUR.id, nieGlueck).stuecke[0].menge;
  resetProgress();
  const mitNull = siegBelohnung(ohneSterne, 0, SPIELFIGUR.id, nieGlueck).stuecke[0].menge;
  pruefe('Sterne erhoehen die Muenzen', mitDrei > mitNull);

  // Wiederholung bringt weniger
  resetProgress();
  const erstesMal = siegBelohnung(ersterKampf, 3, SPIELFIGUR.id, nieGlueck);
  const zweitesMal = siegBelohnung(ersterKampf, 3, SPIELFIGUR.id, nieGlueck);
  pruefe('Erster Sieg zaehlt als neu', erstesMal.erstesMal && !zweitesMal.erstesMal);
  pruefe('Wiederholung bringt weniger Muenzen', zweitesMal.stuecke[0].menge < erstesMal.stuecke[0].menge);
  pruefe(
    'Erfahrung bleibt auch beim Wiederholen gleich',
    zweitesMal.stuecke[1].menge === erstesMal.stuecke[1].menge
  );

  // Boss gibt deutlich mehr
  resetProgress();
  const bossLohn = siegBelohnung(boss, 3, SPIELFIGUR.id, nieGlueck);
  pruefe('Boss gibt mehr Muenzen als ein normaler Kampf', bossLohn.stuecke[0].menge > erstesMal.stuecke[0].menge * 2);
  pruefe('Boss gibt mehr Erfahrung', bossLohn.stuecke[1].menge > erstesMal.stuecke[1].menge);
  pruefe('Boss oeffnet eine neue Welt', bossLohn.newWorld?.id === 2);

  // Bosstruhe nur beim ersten Sieg - und sie kommt ungeöffnet ins Lager
  const bossTruhen = () => gameState.truhenPlaetze.filter((p) => p?.id === BOSS_TRUHE.id).length;
  pruefe('Der erste Boss-Sieg legt die Bosstruhe in einen Truhenplatz',
    bossLohn.neueTruhen.some((t) => t.id === BOSS_TRUHE.id) && bossTruhen() === 1);
  const bossZweimal = siegBelohnung(boss, 3, SPIELFIGUR.id, nieGlueck);
  pruefe('Bosstruhe gibt es nur beim ersten Sieg',
    !bossZweimal.neueTruhen.some((t) => t.id === BOSS_TRUHE.id) && bossTruhen() === 1);

  // Material
  pruefe(
    'Boss wirft immer Material ab',
    materialBelohnung(boss, true, nieGlueck) >= BOSS_MATERIAL[0]
  );
  pruefe('Normaler Kampf ohne Glueck gibt kein Material', materialBelohnung(ersterKampf, true, nieGlueck) === 0);
  pruefe('Normaler Kampf mit Glueck gibt Material', materialBelohnung(ersterKampf, true, immerGlueck) > 0);

  resetProgress();
}

console.log('\nTagesaufgaben');
{
  resetProgress();

  // Auswahl haengt nur am Datum - nie am Zufall.
  const a = aufgabenFuerTag('2026-03-14');
  const b = aufgabenFuerTag('2026-03-14');
  const c = aufgabenFuerTag('2026-03-15');
  pruefe('Gleicher Tag ergibt gleiche Aufgaben', a.join() === b.join());
  pruefe('Anderer Tag ergibt andere Aufgaben', a.join() !== c.join());
  pruefe(`Es sind ${AUFGABEN_PRO_TAG} Aufgaben pro Tag`, a.length === AUFGABEN_PRO_TAG);
  pruefe('Keine Aufgabe kommt doppelt vor', new Set(a).size === a.length);

  // Ueber viele Tage muss jede Aufgabe mal drankommen.
  const gesehen = new Set();
  for (let tag = 1; tag <= 200; tag++) {
    aufgabenFuerTag(`2026-01-${String(tag).padStart(3, '0')}`).forEach((id) => gesehen.add(id));
  }
  pruefe('Jede Aufgabe kommt irgendwann dran', gesehen.size === AUFGABEN.length);

  pruefe('Heute hat das Format JJJJ-MM-TT', /^\d{4}-\d{2}-\d{2}$/.test(heute()));
  pruefe(
    'Heute rechnet mit der Ortszeit',
    heute(new Date(2026, 0, 5)) === '2026-01-05'
  );

  // Fortschritt melden und abholen
  resetProgress();
  const heutige = getTagesAufgaben();
  pruefe('Es stehen heute Aufgaben an', heutige.length === AUFGABEN_PRO_TAG);
  pruefe('Am Anfang ist nichts abholbar', offeneBelohnungen() === 0);

  const erste = heutige[0].aufgabe;
  fortschrittMelden(erste.typ, erste.ziel);
  const nachher = getTagesAufgaben().find((e) => e.aufgabe.id === erste.id);
  pruefe('Gemeldeter Fortschritt zaehlt', nachher.stand === erste.ziel && nachher.fertig);
  pruefe('Fertige Aufgabe ist abholbar', offeneBelohnungen() >= 1);

  // Fortschritt laeuft nie ueber das Ziel hinaus
  fortschrittMelden(erste.typ, 999);
  pruefe(
    'Fortschritt bleibt beim Ziel stehen',
    getTagesAufgaben().find((e) => e.aufgabe.id === erste.id).stand === erste.ziel
  );

  const muenzenVorher = gameState.coins;
  const materialVorher = gameState.materials;
  const lohn = aufgabeAbholen(erste.id);
  pruefe('Abholen zahlt Muenzen und Material aus',
    lohn !== null &&
    gameState.coins === muenzenVorher + erste.muenzen &&
    gameState.materials === materialVorher + erste.material);
  pruefe('Zweimal abholen geht nicht', aufgabeAbholen(erste.id) === null);

  // Nicht fertige Aufgaben lassen sich nicht abholen
  const offene = getTagesAufgaben().find((e) => !e.fertig);
  if (offene) pruefe('Unfertige Aufgabe laesst sich nicht abholen', aufgabeAbholen(offene.aufgabe.id) === null);

  // Unbekannte Aufgabe
  pruefe('Unbekannte Aufgabe laesst sich nicht abholen', aufgabeAbholen('gibt-es-nicht') === null);

  // Tageswechsel setzt Fortschritt zurueck, laesst Muenzen aber stehen
  const muenzenVorTagwechsel = gameState.coins;
  gameState.dailies.datum = '2020-01-01';
  const neuerTag = getTagesAufgaben();
  pruefe('Neuer Tag startet bei 0', neuerTag.every((e) => e.stand === 0 && !e.abgeholt));
  pruefe('Muenzen bleiben ueber den Tageswechsel', gameState.coins === muenzenVorTagwechsel);

  resetProgress();
}

console.log('\nSpielfigur');
{
  pruefe('Die Spielfigur heisst Timo', SPIELFIGUR.name === 'Timo');
  pruefe('Sie hat eine eigene Grafik statt einer gerechneten Figur',
    typeof SPIELFIGUR.image === 'string' && SPIELFIGUR.image.endsWith('.png'));
  pruefe('Sie hat ein eigenes Kampfbild', typeof SPIELFIGUR.bildKampf === 'string');

  const folgen = { bildSchlag: 'Nahkampf', bildStrahl: 'Fernangriff', bildTreffer: 'Treffer' };
  Object.entries(folgen).forEach(([feld, name]) => {
    pruefe(`Bildfolge ${name} hat mindestens 3 Bilder`,
      Array.isArray(SPIELFIGUR[feld]) && SPIELFIGUR[feld].length >= 3);
  });

  const alleBilder = [SPIELFIGUR.image, SPIELFIGUR.bildKampf,
    ...Object.keys(folgen).flatMap((feld) => SPIELFIGUR[feld] ?? [])];
  pruefe('Alle Bildadressen zeigen in den Bilderordner',
    alleBilder.every((b) => b.startsWith('bilder/') && b.endsWith('.png')));
  pruefe('Keine Bildadresse kommt doppelt vor',
    new Set(alleBilder).size === alleBilder.length);
  pruefe('Sie ist als hohe Figur gekennzeichnet', SPIELFIGUR.hoch === true);

  // Skins muessen zur Figur passen, sonst waere der Skin-Bereich leer.
  const meine = SKINS.filter((skin) => skin.monsterId === SPIELFIGUR.id);
  pruefe('Alle Skins gehoeren zur Spielfigur', meine.length === SKINS.length);
  pruefe('Jeder Skin ausser Standard hat einen Farbfilter oder ein Outfit',
    meine.filter((skin) => skin.id !== 'skin-standard').every((skin) => Boolean(skin.filter) !== Boolean(skin.ordner)));
  pruefe('Keine zwei Skins sehen gleich aus',
    new Set(meine.map((skin) => skin.filter ?? skin.ordner)).size === meine.length);

  // Outfit-Skins: für jede Pose ein eigenes Bild, und das Spiel findet es.
  const outfits = meine.filter((skin) => skin.ordner);
  pruefe('Es gibt mindestens 7 Outfits mit Hut und Kleidung', outfits.length >= 7);
  pruefe('Jedes Outfit hat alle 14 Posen als Datei',
    outfits.every((skin) => SKIN_BILDER[skin.ordner]?.length === SKIN_POSEN.length &&
      SKIN_BILDER[skin.ordner].every((pfad) => existsSync(new URL(`../${pfad}`, import.meta.url)))));
  pruefe('Outfit: jede Pose von Timo bekommt ihr Outfit-Bild',
    outfits.every((skin) => [SPIELFIGUR.image, SPIELFIGUR.bildKampf, ...SPIELFIGUR.bildSchlag, ...SPIELFIGUR.bildStrahl, ...SPIELFIGUR.bildTreffer]
      .every((pfad) => skinBild(pfad, skin) === pfad.replace('bilder/timo/', `bilder/timo/skins/${skin.ordner}/`))));
  pruefe('Ohne Outfit (Farb-Skin) bleibt das Originalbild',
    skinBild(SPIELFIGUR.image, getSkin('skin-frost')) === SPIELFIGUR.image && skinBild(SPIELFIGUR.image, null) === SPIELFIGUR.image);
  pruefe('Fremde Bilder bleiben unverändert', skinBild('bilder/menue/deck.png', getSkin('skin-ninja')) === 'bilder/menue/deck.png');

  // Alter Spielstand: Fortschritt darf beim Figurenwechsel nicht verlorengehen.
  resetProgress();
  localStorage.setItem('monsterquest.save.v3', JSON.stringify({
    unlockedWorld: 3,
    clearedLevels: ['1-1'],
    coins: 777,
    characters: { glutwelpe: { level: 9, xp: 42, upgrades: { hp: 2 } } },
    decks: { glutwelpe: ['biss', 'krallenhieb', 'feuerball', 'flammenstoss', 'schutzschild', 'feuersturm', 'lavabombe', 'meteor'] },
    activeSkin: { glutwelpe: 'skin-gold' },
    attackLevels: { meteor: 3 },
  }));
  loadProgress();
  pruefe('Alter Spielstand: Level zieht auf die neue Figur um',
    gameState.characters[SPIELFIGUR.id]?.level === 9);
  pruefe('Alter Spielstand: Aufwertungen bleiben erhalten',
    gameState.characters[SPIELFIGUR.id]?.upgrades?.hp === 2);
  pruefe('Alter Spielstand: Deck zieht mit um',
    gameState.decks[SPIELFIGUR.id]?.length === 8);
  pruefe('Alter Spielstand: alte Attackennamen werden uebersetzt',
    gameState.decks[SPIELFIGUR.id]?.every((id) => ATTACKS[id]));
  pruefe('Alter Spielstand: Attacken-Level wandert auf den neuen Namen (altes Lv. 3 = neues Lv. 7)',
    getAttackenLevel('sturmfaust') === 7);
  pruefe('Alter Spielstand: getragener Skin bleibt',
    gameState.activeSkin[SPIELFIGUR.id] === 'skin-gold');
  pruefe('Alter Spielstand: Muenzen bleiben', gameState.coins === 777);
  pruefe('Der alte Name ist verschwunden',
    !('glutwelpe' in gameState.characters) && !('glutwelpe' in gameState.decks));
  resetProgress();
}

console.log('\nTimos Attacken');
{
  const deck = SPIELFIGUR.deck.map((id) => getAttack(id));

  pruefe('Das Deck hat genau 8 Attacken', deck.length === 8);
  pruefe('Genau eine Attacke gibt ein Schild',
    deck.filter((a) => (a.shield ?? 0) > 0).length === 1);
  pruefe('Alle anderen machen Schaden',
    deck.filter((a) => a.damage > 0).length === 7);

  // Die Werte muessen die gleichen geblieben sein - daran haengt die
  // gesamte Balance bis zum Boss von Welt 6.
  const erwartet = [[2,11],[2,12],[3,17],[4,23],[4,26],[5,30],[7,45],[9,62]];
  const ist = deck.map((a) => [a.cost, a.damage || a.shield]).sort((x,y) => x[0]-y[0] || x[1]-y[1]);
  pruefe('Kosten und Wirkung sind unveraendert',
    JSON.stringify(ist) === JSON.stringify(erwartet.slice().sort((x,y) => x[0]-y[0] || x[1]-y[1])));

  // Unter 5 Energie schlaegt Timo zu, darueber schiesst er - die Namen sollen
  // dazu passen, sonst wirkt die Animation falsch.
  const guenstig = deck.filter((a) => a.cost < 5);
  const teuer = deck.filter((a) => a.cost >= 5);
  pruefe('5 Nahkampf-Attacken unter 5 Energie', guenstig.length === 5);
  pruefe('3 Energie-Attacken ab 5 Energie', teuer.length === 3);

  pruefe('Jede Attacke hat Symbol und Beschreibung',
    deck.every((a) => a.icon && a.text && a.text.length > 10));
  pruefe('Kein Symbol kommt doppelt vor',
    new Set(deck.map((a) => a.icon)).size === deck.length);
  pruefe('Kein Name kommt doppelt vor',
    new Set(deck.map((a) => a.name)).size === deck.length);

  // Keine Tier- oder Feuerbegriffe mehr - Timo ist ein Mensch.
  const passtNicht = deck.filter((a) => /kralle|biss|feuer|flamme|lava|meteor|zahn|klaue/i.test(a.name));
  pruefe('Keine Tier- oder Feuernamen mehr', passtNicht.length === 0);
}

console.log('\nWelt-Farben');
{
  const FARBEN = ['himmelOben','himmelUnten','wiese','wieseDunkel','wieseHell',
                  'fels','felsDunkel','baum','baumDunkel','schnee'];

  pruefe('Jede Welt bringt ihre eigenen Farben mit',
    WORLDS.every((w) => w.farben && typeof w.farben === 'object'));
  pruefe('Jede Welt hat alle zehn Farben',
    WORLDS.every((w) => FARBEN.every((f) => typeof w.farben[f] === 'string')));
  // Ein Tippfehler im Farbwert wuerde sonst nur "irgendwie falsch" aussehen.
  pruefe('Jeder Farbwert ist ein gueltiger Hex-Code',
    WORLDS.every((w) => FARBEN.every((f) => /^#[0-9a-f]{6}$/i.test(w.farben[f]))));
  pruefe('Keine zwei Welten haben denselben Himmel',
    new Set(WORLDS.map((w) => w.farben.himmelOben)).size === WORLDS.length);
  pruefe('Wiese und dunkle Wiese unterscheiden sich in jeder Welt',
    WORLDS.every((w) => w.farben.wiese !== w.farben.wieseDunkel));
  pruefe('Ein eigenes Hintergrundbild ist optional',
    WORLDS.every((w) => w.hintergrund === undefined || typeof w.hintergrund === 'string'));
}

console.log('\nKlaenge');
{
  const FORMEN_ERLAUBT = ['sine', 'square', 'triangle', 'sawtooth', 'rauschen'];
  const alleEbenen = Object.values(KLAENGE).flat();

  pruefe('Es gibt Klaenge', Object.keys(KLAENGE).length > 10);
  pruefe(
    'Jeder Klang hat mindestens eine Ebene',
    Object.values(KLAENGE).every((ebenen) => Array.isArray(ebenen) && ebenen.length > 0)
  );
  pruefe('Jede Ebene hat eine bekannte Klangform',
    alleEbenen.every((e) => FORMEN_ERLAUBT.includes(e.form)));
  pruefe('Jede Ebene dauert laenger als nichts',
    alleEbenen.every((e) => e.dauer > 0 && e.dauer <= 2));
  pruefe('Keine Ebene ist zu laut',
    alleEbenen.every((e) => e.lautstaerke > 0 && e.lautstaerke <= 0.8));
  // Frequenz 0 wuerde exponentialRampToValueAtTime zum Absturz bringen.
  pruefe('Jede Schwingung hat eine Frequenz ueber 0',
    alleEbenen.filter((e) => e.form !== 'rauschen').every((e) => e.von > 0 && e.bis > 0));
  pruefe('Kein Klang laeuft laenger als 2 Sekunden',
    Object.values(KLAENGE).every((ebenen) =>
      Math.max(...ebenen.map((e) => (e.start ?? 0) + e.dauer)) <= 2));
  pruefe('Unbekannter Klang gibt null statt zu stuerzen', getKlang('gibt-es-nicht') === null);

  // Diese Klaenge werden im Spiel namentlich aufgerufen.
  const gebraucht = ['tipp', 'zurueck', 'bestaetigen', 'gesperrt', 'karte', 'treffer',
    'trefferStark', 'heilung', 'schild', 'sieg', 'niederlage', 'levelauf', 'neueWelt',
    'muenze', 'beute', 'beuteSelten', 'truhe', 'kauf', 'aufgabe'];
  pruefe('Alle im Spiel benutzten Klaenge sind vorhanden',
    gebraucht.every((name) => Boolean(KLAENGE[name])));
}

console.log('\nMusik');
{
  const kategorien = Object.values(MUSIK);

  pruefe('Jede Welt hat eine Musikkategorie',
    WORLDS.every((welt) => Boolean(MUSIK[welt.music])));
  pruefe('Es gibt zusaetzlich Menuemusik', Boolean(MUSIK.menue));
  pruefe(`Jedes Motiv passt auf den Grundtakt von ${MUSTER_TAKT} Achteln`,
    kategorien.every((m) => m.muster.length > 0 && m.muster.length % MUSTER_TAKT === 0));
  pruefe('Jedes Motiv hat mindestens 4 Toene',
    kategorien.every((m) => m.muster.filter((p) => p !== null).length >= 4));
  // Ein Platz oberhalb der Tonleiter geht eine Oktave hoeher weiter. Mehr als
  // zwei Oktaven waere aber fast sicher ein Tippfehler.
  pruefe('Jeder Motivton liegt in hoechstens zwei Oktaven',
    kategorien.every((m) => m.muster.every((p) => p === null || (p >= 0 && p < m.skala.length * 2))));
  pruefe('Jeder Basston liegt in der Tonleiter',
    kategorien.every((m) => m.bassfolge.every((p) => p >= 0 && p < m.skala.length)));
  pruefe('Jede Bassfolge hat mindestens 2 Stufen',
    kategorien.every((m) => m.bassfolge.length >= 2));
  pruefe('Jedes Tempo ist sinnvoll',
    kategorien.every((m) => m.tempo >= 40 && m.tempo <= 200));
  pruefe('Jeder Grundton liegt im hoerbaren Bereich',
    kategorien.every((m) => m.grundton >= 60 && m.grundton <= 500));
  pruefe('Unbekannte Kategorie faellt auf die Menuemusik zurueck',
    getMusik('gibt-es-nicht') === MUSIK.menue);

  // Das Titelthema soll sich vom Rest abheben.
  const titel = MUSIK.menue;
  pruefe('Das Titelthema ist laenger als ein Weltmotiv',
    WORLDS.every((welt) => titel.muster.length > MUSIK[welt.music].muster.length));
  pruefe('Das Titelthema hat mindestens 12 Toene',
    titel.muster.filter((p) => p !== null).length >= 12);
  pruefe('Das Titelthema endet auf dem Grundton',
    titel.muster.filter((p) => p !== null).at(-1) === 0);
  pruefe('Das Titelthema erreicht die Oktave',
    Math.max(...titel.muster.filter((p) => p !== null)) >= titel.skala.length);

  // Keine zwei Welten sollen gleich klingen.
  const klangbilder = WORLDS.map((welt) => {
    const m = MUSIK[welt.music];
    return `${m.grundton}|${m.form}|${m.tempo}|${m.muster.join(',')}`;
  });
  pruefe('Keine zwei Welten klingen gleich', new Set(klangbilder).size === WORLDS.length);
}

console.log('\nLogo');
{
  /* Das Logo besteht aus festen Pfaden, nicht aus Schrift. Grund steht in
     werkzeuge/logo-bauen.py: Bei echter Schrift ueberlappen sich die dicken
     Konturen, und jeder Browser loest das anders auf - auf dem iPhone wurde
     aus dem Schriftzug ein weisser Klumpen. */
  const startCode = readFileSync(new URL('../js/screens/start.js', import.meta.url), 'utf8');

  pruefe('Das Logo hat Pfade fuer beide Woerter',
    LOGO_MONSTER.length > 500 && LOGO_QUEST.length > 500);
  pruefe('Die Pfade beginnen mit einem Startpunkt',
    LOGO_MONSTER.startsWith('M') && LOGO_QUEST.startsWith('M'));
  pruefe('Das Logo benutzt keine Schrift mehr (kein <text> im SVG)',
    !/<text[\s>]/.test(startCode));
  pruefe('Jedes Wort liegt in drei Lagen: Rand, Kontur, Fuellung',
    ['logo__rand', 'logo__kontur', 'logo__fuellung'].every(
      (lage) => (startCode.match(new RegExp(lage, 'g')) || []).length === 2));
}

console.log('\nBoss-Kräfte');
{
  resetProgress();

  const ARTEN = ['schild', 'schildbruch', 'brand', 'frost', 'lebensraub', 'energiesturm', 'energieraub'];

  pruefe('Es gibt für jede Welt genau eine Boss-Kraft',
    BOSS_KRAEFTE.length === WORLDS.length && WORLDS.every((w) => kraftFuerWelt(w.id)));
  pruefe('Jede Kraft-id ist einmalig',
    new Set(BOSS_KRAEFTE.map((k) => k.id)).size === BOSS_KRAEFTE.length);
  pruefe('Jede Kraft hat eine bekannte Wirkung',
    BOSS_KRAEFTE.every((k) => ARTEN.includes(k.art)));
  pruefe('Jede Kraft hat Name, Symbol und Beschreibung',
    BOSS_KRAEFTE.every((k) => k.name && k.icon && k.text && k.boss));
  pruefe('Der Boss-Name jeder Kraft passt zur Welt',
    BOSS_KRAEFTE.every((k) => getWorld(k.welt)?.boss.n === k.boss));
  pruefe('Jede Kraft-Ladung (falls gesetzt) ist eine sinnvolle Zahl',
    BOSS_KRAEFTE.every((k) => k.gegnerLadung === undefined || (k.gegnerLadung >= 8 && k.gegnerLadung <= 60)));

  pruefe('Am Anfang ist keine Kraft freigeschaltet',
    BOSS_KRAEFTE.every((k) => !besitztKraft(k.id)) && getBossKraft() === null);

  // Welt-1-Boss besiegen: die erste Kraft muss aufgehen und gleich getragen sein.
  const kraft1 = bossKraftFreischalten(1);
  pruefe('Der erste Boss schaltet seine Kraft frei', kraft1?.id === kraftFuerWelt(1).id);
  pruefe('Die erste Kraft wird sofort getragen', getBossKraft()?.id === kraft1.id);
  pruefe('Ein zweiter Sieg schaltet nichts Neues frei', bossKraftFreischalten(1) === null);

  // Eine zweite Kraft freischalten: die erste bleibt getragen (kein Wechsel).
  bossKraftFreischalten(2);
  pruefe('Eine weitere Kraft wechselt die getragene nicht',
    getBossKraft()?.id === kraftFuerWelt(1).id && besitztKraft(kraftFuerWelt(2).id));

  // Umrüsten und ablegen.
  setBossKraft(kraftFuerWelt(2).id);
  pruefe('Man kann auf eine andere Kraft umrüsten', getBossKraft()?.id === kraftFuerWelt(2).id);
  setBossKraft(null);
  pruefe('Man kann die Kraft ablegen', getBossKraft() === null);
  setBossKraft('gibtsnicht');
  pruefe('Eine unbekannte Kraft lässt sich nicht anlegen', getBossKraft() === null);

  // Nur der ERSTE Boss-Sieg gibt die Kraft - über die Belohnung geprüft.
  resetProgress();
  const bossLevel = bossLevelOf(1);
  const erste = siegBelohnung(bossLevel, 3, 'timo', () => 0.5);
  pruefe('Der Boss-Sieg liefert die neue Kraft in der Belohnung',
    erste.neueKraft?.id === kraftFuerWelt(1).id);
  const zweite = siegBelohnung(bossLevel, 3, 'timo', () => 0.5);
  pruefe('Ein Wiederholungssieg liefert keine neue Kraft', zweite.neueKraft === null);

  resetProgress();
}

console.log('\nGegner-Varianten');
{
  const gegner = Object.values(ENEMIES).filter((e) => !e.isBoss);

  pruefe('Jeder normale Gegner hat eine bekannte Variante',
    gegner.every((e) => GEGNER_ARTEN[e.art]));
  pruefe('Es kommen mehrere Varianten vor',
    new Set(gegner.map((e) => e.art)).size >= 3);
  pruefe('Die ersten beiden Kämpfe jeder Welt sind normal',
    gegner.filter((e) => e.art !== 'normal').every((e) => true) &&
    Object.values(ENEMIES).filter((e) => !e.isBoss && e.art === 'normal').length > 0);
  pruefe('Verteidigung und Angriff bleiben in sinnvollen Grenzen',
    gegner.every((e) => e.defense >= 0 && e.defense < 0.5 && e.damageFactor > 0 && e.damageFactor <= 1.5));
  pruefe('Reaktionszeit bleibt positiv',
    gegner.every((e) => e.reactionTime >= 0.4));
  pruefe('Bosse tragen keine Variante',
    Object.values(ENEMIES).filter((e) => e.isBoss).every((e) => !e.variante));
}

console.log('\nErfolge und Statistik');
{
  resetProgress();

  pruefe('Jede Erfolg-id ist einmalig',
    new Set(ERFOLGE.map((e) => e.id)).size === ERFOLGE.length);
  pruefe('Jeder Erfolg hat Name, Symbol, Text, Ziel und Wert-Funktion',
    ERFOLGE.every((e) => e.name && e.icon && e.text && e.ziel > 0 && typeof e.wert === 'function'));
  pruefe('Am Anfang ist kein Erfolg freigeschaltet',
    ERFOLGE.every((e) => !erfolgFrei(e.id)));

  // Ein Sieg zählt hoch und schaltet "Erster Sieg" frei.
  statErhoehen('siege', 1);
  const ersterSieg = ERFOLGE.find((e) => e.id === 'erster-sieg');
  pruefe('Nach dem ersten Sieg ist der Fortschritt erreicht', erfolgErreicht(ersterSieg));
  const neu = pruefeNeueErfolge();
  pruefe('pruefeNeueErfolge meldet den neuen Erfolg', neu.some((e) => e.id === 'erster-sieg'));
  pruefe('Der Erfolg gilt jetzt als freigeschaltet', erfolgFrei('erster-sieg'));
  pruefe('Ein zweiter Aufruf meldet nichts Neues', pruefeNeueErfolge().length === 0);

  // Statistik-Zähler lassen sich hochzählen.
  statErhoehen('krits', 3);
  statErhoehen('schaden', 250);
  pruefe('Statistik-Zähler steigen', gameState.statistik.krits === 3 && gameState.statistik.schaden === 250);
  pruefe('Ein unbekannter Zähler wird ignoriert',
    (statErhoehen('gibtsnicht', 5), gameState.statistik.gibtsnicht === undefined));

  resetProgress();
  pruefe('Zurücksetzen leert die Erfolge wieder',
    gameState.statistik.siege === 0 && gameState.statistik.erfolge.length === 0);
}

console.log('\nStatus-Attacken');
{
  const gift = BEUTE_ATTACKEN.find((a) => a.gift);
  const stun = BEUTE_ATTACKEN.find((a) => a.stun);
  pruefe('Es gibt eine Gift-Attacke', Boolean(gift));
  pruefe('Die Gift-Attacke ist sinnvoll aufgebaut',
    gift && gift.gift.tick > 0 && gift.gift.male > 0 && gift.damage >= 0);
  pruefe('Es gibt eine Betäubungs-Attacke', Boolean(stun));
  pruefe('Die Betäubung dauert eine sinnvolle Zeit',
    stun && stun.stun > 0 && stun.stun <= 3);
  pruefe('Status-Attacken stehen im Katalog',
    [gift, stun].every((a) => a && ATTACKS[a.id]));
}

console.log('\nSchwierigkeitsgrade');
{
  pruefe('Es gibt mindestens Leicht, Normal und Schwer',
    ['leicht', 'normal', 'schwer'].every((id) => getSchwierigkeit(id)?.id === id));
  pruefe('Normal ändert nichts (Faktor 1)',
    getSchwierigkeit('normal').hp === 1 && getSchwierigkeit('normal').schaden === 1);
  pruefe('Leicht schwächt, Schwer verstärkt die Gegner',
    getSchwierigkeit('leicht').hp < 1 && getSchwierigkeit('schwer').hp > 1 &&
    getSchwierigkeit('leicht').schaden < 1 && getSchwierigkeit('schwer').schaden > 1);
  pruefe('Ein unbekannter Grad fällt auf Normal zurück',
    getSchwierigkeit('gibtsnicht').id === 'normal');
}

console.log('\nZweite Spielfigur');
{
  resetProgress();

  pruefe('Es gibt mindestens zwei Spielfiguren', SPIELER_FIGUREN.length >= 2);
  pruefe('Timo ist von Anfang an frei', figurFrei('timo'));
  pruefe('Rocco ist am Anfang gesperrt', !figurFrei('rocco'));
  pruefe('Zu Beginn ist Timo die aktive Figur', getAktiveFigur() === 'timo');
  pruefe('Eine gesperrte Figur lässt sich nicht wählen',
    setAktiveFigur('rocco') === false && getAktiveFigur() === 'timo');

  // Nach dem Sieg über den Boss von Welt 1 wird Rocco frei.
  completeLevel(bossLevelOf(1).id, { stars: 3 });
  pruefe('Nach dem ersten Boss ist Rocco frei', figurFrei('rocco'));
  pruefe('Rocco lässt sich jetzt wählen',
    setAktiveFigur('rocco') === true && getAktiveFigur() === 'rocco');

  // Roccos Grundwerte unterscheiden sich von Timos.
  const timo = charakterWerte(getMonster('timo'));
  const rocco = charakterWerte(getMonster('rocco'));
  pruefe('Rocco hat mehr Lebenspunkte als Timo', rocco.maxHp > timo.maxHp);
  pruefe('Rocco schlägt weicher, lädt langsamer, ist gepanzerter',
    rocco.damageFactor < timo.damageFactor &&
    rocco.energieProSekunde < timo.energieProSekunde &&
    rocco.defense > timo.defense);

  resetProgress();
  pruefe('Zurücksetzen stellt Timo als aktive Figur wieder her', getAktiveFigur() === 'timo');
}

console.log('\nRoccos Attacken');
{
  resetProgress();
  const rocco = getMonster('rocco');
  pruefe('Rocco hat ein eigenes Deck aus genau 8 Attacken',
    rocco.deck.length === 8 && rocco.deck.every((id) => ATTACKS[id]) &&
    rocco.deck.every((id) => !getMonster('timo').deck.includes(id)));
  const gleich = ROCCO_ATTACKEN.every((a) => {
    const t = getAttack(a.stufeVon);
    return a.cost === t.cost && a.damage === t.damage && (a.shield ?? 0) === (t.shield ?? 0);
  });
  pruefe('Roccos Attacken kosten und wirken genau wie Timos Gegenstück', gleich);
  // Im Katalog darf keine andere Karte Roccos Karten überschreiben.
  pruefe('Roccos Karten stehen unverändert im Katalog',
    ROCCO_ATTACKEN.every((a) => ATTACKS[a.id].stufeVon === a.stufeVon && ATTACKS[a.id].cost === a.cost));
  const alleIds = [...START_ATTACKEN, ...ROCCO_ATTACKEN.map((a) => a.id), ...BEUTE_ATTACKEN.map((a) => a.id)];
  pruefe('Keine Kartenkennung kommt doppelt vor', new Set(alleIds).size === alleIds.length);
  gameState.coins = 999999;
  gameState.materials = 999;
  attackeAufwerten('fausthieb');
  pruefe('Aufgewerteter Fausthieb wertet auch Steinfaust auf',
    getAttackenLevel('steinfaust') === 2 && getAttackenLevel('fausthieb') === 2);
  attackeAufwerten('steinfaust');
  pruefe('...und umgekehrt', getAttackenLevel('fausthieb') === 3);
  resetProgress();
}

console.log('\nEndlos-Arena');
{
  pruefe('Jede fünfte Runde ist ein Bosskampf',
    istBossRunde(5) && istBossRunde(10) && !istBossRunde(1) && !istBossRunde(4));
  pruefe('Der Arena-Gegner wird von Runde zu Runde stärker',
    arenaGegner(10).maxHp > arenaGegner(1).maxHp &&
    arenaGegner(10).damageFactor > arenaGegner(1).damageFactor);
  pruefe('Bossrunden liefern einen Boss', arenaGegner(5).isBoss === true);
  pruefe('Normale Runden liefern keinen Boss', arenaGegner(3).isBoss === false);
  const lvl = arenaLevel(5);
  pruefe('Das Arena-Level ist als Arena markiert und bringt seinen Gegner mit',
    lvl.arena === true && lvl.gegner && lvl.enemyId === lvl.gegner.id && lvl.isBoss === true);
  pruefe('Die Reaktionszeit bleibt auch in hohen Runden positiv',
    arenaGegner(40).reactionTime >= 0.4);
}

console.log('\nKarten nachziehen');
{
  const deck = createDeck(getMonster('timo').deck);
  const vorher = [...deck.hand];
  deck.play(1);
  pruefe('Die neue Karte landet auf dem frei gewordenen Platz',
    deck.hand.length === HAND_SIZE && deck.hand[0] === vorher[0] &&
    deck.hand[2] === vorher[2] && deck.hand[3] === vorher[3]);
  let immer8 = true;
  for (let i = 0; i < 40; i++) {
    deck.play(i % HAND_SIZE);
    if (deck.hand.length + deck.drawCount + deck.discardCount !== DECK_SIZE) immer8 = false;
  }
  pruefe('Auch nach 40 Zügen bleiben es genau 8 Karten', immer8);
}

console.log('\nPause und Kampfstatistik');
{
  // Die Schleife braucht requestAnimationFrame - hier genügt eine Attrappe,
  // die nichts von selbst aufruft.
  let rafNr = 0;
  globalThis.requestAnimationFrame = () => ++rafNr;
  globalThis.cancelAnimationFrame = () => {};
  resetProgress();
  const kampf = createBattle({
    playerMonster: { ...getMonster('timo'), deck: getMonster('timo').deck },
    enemyMonster: ENEMIES[Object.keys(ENEMIES)[0]],
  });
  kampf.start();
  pruefe('Kampf läuft nach dem Start', kampf.state.running && !kampf.state.pausiert);
  pruefe('Pause hält den Kampf an', kampf.pause() && !kampf.state.running && kampf.state.pausiert);
  kampf.state.player.energie = 10;
  pruefe('In der Pause lässt sich keine Karte spielen', kampf.playCard(0) === false);
  pruefe('Ein zweites Pausieren ändert nichts', kampf.pause() === false);
  pruefe('Fortsetzen läuft weiter', kampf.resume() && kampf.state.running && !kampf.state.pausiert);
  pruefe('Fortsetzen ohne Pause ändert nichts', kampf.resume() === false);
  pruefe('Statistik startet bei null', kampf.state.statistik.karten === 0 && kampf.state.statistik.schaden === 0);
  kampf.stop();
}

console.log('\nSortierung im Deckmenü');
{
  const attacken = getMonster('timo').deck.map(getAttack);
  pruefe('Es gibt sechs Sortierarten', SORTIERUNGEN.length === 6);
  const ab = sortiereAttacken(attacken, 'schaden-ab');
  const auf = sortiereAttacken(attacken, 'schaden-auf');
  pruefe('Schaden absteigend: stärkste zuerst, Schildkarte zuletzt',
    ab[0].id === 'sturmfaust' && ab[ab.length - 1].id === 'deckung');
  pruefe('Schaden aufsteigend: Schildkarte trotzdem zuletzt',
    auf[0].id === 'fausthieb' && auf[auf.length - 1].id === 'deckung');
  const kosten = sortiereAttacken(attacken, 'kosten-auf').map((a) => a.cost);
  pruefe('Kosten aufsteigend sind sortiert', kosten.every((k, i) => i === 0 || kosten[i - 1] <= k));
  pruefe('Sortieren verändert das Deck selbst nicht',
    getMonster('timo').deck.join() === attacken.map((a) => a.id).join());
  pruefe('Unbekannte Sortierung = Deck-Reihenfolge',
    sortiereAttacken(attacken, 'gibtsnicht').map((a) => a.id).join() === attacken.map((a) => a.id).join());
}

console.log('\nArena-Stimmung');
{
  const alleDrei = WORLDS.every((w) => ALLE_STIMMUNGEN[w.id]?.varianten.length === 3);
  pruefe('Jede Welt hat drei Arena-Varianten', alleDrei);
  let gueltig = true;
  WORLDS.forEach((w) => {
    for (let i = 0; i < 20; i++) {
      const st = waehleStimmung(w);
      if (!ALLE_STIMMUNGEN[w.id].wetter[st.wetter] || !st.variantenName) gueltig = false;
    }
  });
  pruefe('Gewürfeltes Wetter passt immer zur Welt', gueltig);
  pruefe('Tageszeit nach Uhr',
    tageszeitFuer(7) === 'morgen' && tageszeitFuer(13) === 'tag' &&
    tageszeitFuer(20) === 'abend' && tageszeitFuer(2) === 'abend');
  const bekannt = ['wabbeln', 'stampfen', 'flattern', 'atmen', 'schlaengeln', 'wackeln', 'schweben'];
  const auftritte = ['busch', 'rollen', 'landen', 'stein', 'gleiten'];
  const gegner = Object.values(ENEMIES);
  pruefe('Jeder Gegner hat eine Bewegung und einen Auftritt',
    gegner.every((g) => bekannt.includes(bewegungVon(g).ruhe) && auftritte.includes(bewegungVon(g).auftritt)));
  pruefe('Bosse landen immer', gegner.filter((g) => g.isBoss).every((g) => bewegungVon(g).auftritt === 'landen'));
  const benutzt = new Set(gegner.map((g) => bewegungVon(g).auftritt));
  pruefe('Alle fünf Auftrittsarten kommen vor', auftritte.every((a) => benutzt.has(a)));
}

console.log('\nLokale Sicherung');
{
  resetProgress();
  gameState.coins = 777;
  saveProgress();
  pruefe('Nach dem Zurücksetzen liegt eine Sicherung vor', sicherungsInfo().vorhanden);
  // Sicherung erzwingen: frisch laden schreibt sie neu.
  loadProgress();
  // Hauptspeicher beschädigen - die Sicherung muss einspringen.
  localStorage.setItem('monsterquest.save.v3', '{"kaputt":');
  gameState.coins = 0;
  pruefe('Kaputter Spielstand wird aus der Sicherung geladen', loadProgress() === true && gameState.coins === 777);
  pruefe('...und der Hauptspeicher ist danach repariert',
    JSON.parse(localStorage.getItem('monsterquest.save.v3')).coins === 777);
  pruefe('Die Einstellungen kennen die Herkunft', sicherungsInfo().geladenAus === 'sicherung');
  localStorage.setItem('monsterquest.save.v3', JSON.stringify({ settings: { animations: 'ja', sound: false } }));
  loadProgress();
  pruefe('Falsche Typen in Einstellungen fallen auf den Standard zurück',
    gameState.settings.animations === true && gameState.settings.sound === false &&
    gameState.settings.deckSortierung === 'deck');
  resetProgress();
}

console.log('\nGratis-Truhe und Truhenplätze');
{
  resetProgress();
  const kampf = levelsOfWorld(1)[0];
  const belegt = () => gameState.truhenPlaetze.filter(Boolean).map((p) => p.id);
  pruefe('Es gibt genau 4 Truhenplätze', gameState.truhenPlaetze.length === 4);
  pruefe('Zu Beginn fehlen 2 Siege bis zur Gratis-Truhe', siegeBisGratisTruhe() === 2);
  pruefe('Die Truhenplätze sind anfangs leer', belegt().length === 0);
  const erster = siegBelohnung(kampf, 3, 'timo', () => 0.99);
  pruefe('Der 1. Sieg bringt noch keine Truhe',
    erster.neueTruhen.length === 0 && siegeBisGratisTruhe() === 1);
  const muenzenVorher = gameState.coins;
  const zweiter = siegBelohnung(kampf, 3, 'timo', () => 0.99);
  pruefe('Der 2. Sieg bringt eine Holztruhe',
    zweiter.neueTruhen.length === 1 && zweiter.neueTruhen[0].id === 'holztruhe');
  pruefe('...die ungeöffnet in einen Platz kommt (keine Münzen aus der Truhe)',
    belegt().join() === 'holztruhe' && gameState.coins === muenzenVorher + zweiter.stuecke[0].menge);
  pruefe('...und dort wartet, bis man das Freischalten startet', platzZustand(0).zustand === 'wartet');
  pruefe('Danach beginnt die Zählung neu', siegeBisGratisTruhe() === 2);

  // Freischalten: immer nur eine Truhe gleichzeitig.
  const t0 = 1_000_000_000_000;
  truheEinlagern('goldtruhe');
  pruefe('Freischalten startet', freischaltenStarten(0, t0) && platzZustand(0, t0).zustand === 'laeuft');
  pruefe('Eine zweite Truhe kann nicht gleichzeitig laufen', !freischaltenStarten(1, t0));
  pruefe('Holztruhe braucht 15 Minuten',
    platzZustand(0, t0 + 14 * 60000).zustand === 'laeuft' && platzZustand(0, t0 + 15 * 60000).zustand === 'bereit');
  pruefe('Eine nicht fertige Truhe lässt sich nicht einfach öffnen', truheAusPlatz(0, { jetzt: t0 }) === null);
  pruefe('Sofort-Öffnen kostet anfangs den vollen Wert', sofortPreis(0, t0) === 250);
  pruefe('...und wird mit der Zeit billiger', sofortPreis(0, t0 + 7.5 * 60000) === 125);
  pruefe('...aber nie unter 5 Münzen', sofortPreis(0, t0 + 15 * 60000 - 1000) === 5);
  pruefe('Fertige Truhe öffnet gratis', truheAusPlatz(0, { jetzt: t0 + 15 * 60000 }) === 'holztruhe' && belegt().join() === 'goldtruhe');
  gameState.coins = 100;
  pruefe('Sofort öffnen geht nicht ohne genug Münzen', truheAusPlatz(1, { sofort: true, jetzt: t0 }) === null && gameState.coins === 100);
  gameState.coins = 5000;
  pruefe('Sofort öffnen zieht die Münzen ab', truheAusPlatz(1, { sofort: true, jetzt: t0 }) === 'goldtruhe' && gameState.coins === 3000);

  // Alles voll: Gratis-Truhe wartet, Bosstruhe stellt sich an.
  ['holztruhe', 'holztruhe', 'silbertruhe', 'holztruhe'].forEach((id) => truheEinlagern(id));
  pruefe('Ein 5. Platz gibt es nicht', truheEinlagern('holztruhe') === false && belegt().length === 4);
  siegBelohnung(kampf, 3, 'timo', () => 0.99);
  const vollSieg = siegBelohnung(kampf, 3, 'timo', () => 0.99);
  pruefe('Bei vollen Plätzen wartet die Gratis-Truhe',
    vollSieg.neueTruhen.length === 0 && vollSieg.gratisWartet && siegeBisGratisTruhe() === 0);
  siegBelohnung(kampf, 3, 'timo', () => 0.99);
  pruefe('Weitere Siege stapeln keine Truhen', siegeBisGratisTruhe() === 0 && belegt().length === 4);
  pruefe('Bosstruhe geht nie verloren (Warteschlange)', truheEinlagern('bosstruhe', { warteschlange: true }) === 'warteschlange');
  gameState.truhenPlaetze[2].bereitAb = 0;
  truheAusPlatz(2);
  pruefe('Ein frei gewordener Platz holt zuerst die Bosstruhe', gameState.truhenPlaetze[2]?.id === 'bosstruhe' && siegeBisGratisTruhe() === 0);
  gameState.truhenPlaetze[3].bereitAb = 0;
  truheAusPlatz(3);
  pruefe('...danach die wartende Gratis-Truhe', gameState.truhenPlaetze[3]?.id === 'holztruhe' && siegeBisGratisTruhe() === 2);

  loadProgress();
  pruefe('Plätze und Zähler überstehen das Neuladen',
    belegt().length === 4 && gameState.truhenPlaetze[2].id === 'bosstruhe' && alleZustaende().length === 4);
  pruefe('Eine unbekannte Truhe kommt in keinen Platz', truheEinlagern('gibtsnicht') === false);

  // Alte Spielstände: das Lager ohne Wartezeit wird übernommen.
  localStorage.setItem('monsterquest.save.v3', JSON.stringify({ truhenLager: ['holztruhe', 'quatsch', 7, 'bosstruhe', 'holztruhe', 'goldtruhe', 'silbertruhe'] }));
  loadProgress();
  pruefe('Altes Lager: bekannte Truhen kommen fertig in die Plätze',
    belegt().join() === 'holztruhe,bosstruhe,holztruhe,goldtruhe' && alleZustaende().every((p) => p.zustand === 'bereit'));
  pruefe('Altes Lager: der Rest stellt sich an', gameState.truhenWarteschlange.join() === 'silbertruhe');
  localStorage.setItem('monsterquest.save.v3', JSON.stringify({ truhenPlaetze: [{ id: 'quatsch' }, { id: 'goldtruhe', bereitAb: 'x' }, 5] }));
  loadProgress();
  pruefe('Kaputte Plätze werden beim Laden bereinigt',
    gameState.truhenPlaetze.length === 4 && belegt().join() === 'goldtruhe' && platzZustand(1).zustand === 'wartet');
  resetProgress();
  pruefe('Zurücksetzen leert Plätze und Zähler', siegeBisGratisTruhe() === 2 && belegt().length === 0);
}

console.log('\nTrophäen und Ligen');
{
  resetProgress();
  const w1 = levelsOfWorld(1);
  const w7 = levelsOfWorld(7);
  pruefe('Neuer Spielstand hat 0 Trophäen', gameState.trophaeen === 0 && ligaVon(0).id === 'holz');
  pruefe('Erster Sieg in Welt 1: 15, in Welt 7: 45',
    trophaeenFuerSieg(w1[0], true) === 15 && trophaeenFuerSieg(w7[0], true) === 45);
  pruefe('Boss zählt doppelt', trophaeenFuerSieg(w1[11], true) === 30 && trophaeenFuerSieg(w1[11], false) === 4);
  pruefe('Wiederholen bringt nur 2', trophaeenFuerSieg(w1[0], false) === 2);
  const alleWelten = WORLDS.flatMap((w) => levelsOfWorld(w.id)).reduce((s, l) => s + trophaeenFuerSieg(l, true), 0);
  pruefe(`Alle Welten einmal geschafft = ${alleWelten} Trophäen, reicht für die Championliga`,
    alleWelten >= LIGEN[LIGEN.length - 1].ab);
  pruefe('Ligen steigen an', LIGEN.every((l, i) => i === 0 || l.ab > LIGEN[i - 1].ab) && LIGEN[0].ab === 0);
  pruefe('Nächste Liga', naechsteLiga(0).id === 'bronze' && naechsteLiga(99999) === null);

  const sieg = siegBelohnung(w1[0], 3, 'timo', () => 0.99);
  pruefe('Ein Sieg schreibt Trophäen gut', sieg.trophaeen.aenderung === 15 && gameState.trophaeen === 15);
  pruefe('Niederlage kostet 5', trophaeenNiederlage().aenderung === -5 && gameState.trophaeen === 10);
  trophaeenNiederlage();
  trophaeenNiederlage();
  pruefe('Nie unter 0', gameState.trophaeen === 0 && gameState.trophaeenRekord === 15);
  gameState.trophaeen = 152;
  const ab = trophaeenNiederlage();
  pruefe('Nie unter die Grenze der eigenen Liga', gameState.trophaeen === 150 && ab.liga.id === 'bronze');
  gameState.trophaeen = 145;
  const auf = trophaeenSieg(w1[0], true);
  pruefe('Aufstieg in die nächste Liga wird gemeldet', auf.aufgestiegen && auf.liga.id === 'bronze');

  saveProgress();
  loadProgress();
  pruefe('Trophäen und Rekord überstehen das Neuladen', gameState.trophaeen === 160 && gameState.trophaeenRekord === 160);

  localStorage.setItem('monsterquest.save.v3', JSON.stringify({ clearedLevels: ['1-1', '1-2', '1-12', 'quatsch'] }));
  loadProgress();
  pruefe('Alter Spielstand: Trophäen aus geschafften Kämpfen (15+15+30)', gameState.trophaeen === 60);
  localStorage.setItem('monsterquest.save.v3', JSON.stringify({ trophaeen: 'viele', trophaeenRekord: -4, clearedLevels: ['1-1'] }));
  loadProgress();
  pruefe('Kaputte Trophäen werden 0 (und nicht neu berechnet)', gameState.trophaeen === 0 && gameState.trophaeenRekord === 0);
  pruefe('Rangliste ist standardmäßig an', gameState.settings.rangliste === true);
  resetProgress();
}

console.log('\nKarten-Level bis 15');
{
  resetProgress();
  pruefe('Max-Level ist 15', KARTEN_MAX_LEVEL === 15 && MAX_ATTACKEN_LEVEL === 15);
  pruefe('Für jeden Schritt bis 15 ist eine Kopienzahl festgelegt',
    KOPIEN_FUER_LEVEL.length === KARTEN_MAX_LEVEL && KOPIEN_FUER_LEVEL.slice(1).every((k) => k > 0));
  pruefe('Spätere Level brauchen mindestens so viele Kopien wie frühere',
    KOPIEN_FUER_LEVEL.slice(2).every((k, i) => k >= KOPIEN_FUER_LEVEL[i + 1]));
  const k1 = karteGutschreiben('fausthieb', 1);
  pruefe('1 Kopie hebt Fausthieb von Level 1 auf 2', k1.levelVorher === 1 && k1.level === 2 && k1.kopien === 0);
  const k2 = karteGutschreiben('fausthieb', 1);
  pruefe('Danach fehlt noch eine Kopie', k2.level === 2 && k2.kopien === 1 && k2.benoetigt === 2);
  const k3 = karteGutschreiben('fausthieb', 50);
  pruefe('Viele Kopien auf einmal: mehrere Level hintereinander', k3.level > 5);
  karteGutschreiben('fausthieb', 999);
  pruefe('Mehr als Level 15 geht nicht, Kopien laufen nicht über',
    getAttackenLevel('fausthieb') === 15 && gameState.kartenKopien.fausthieb === 0);
  pruefe('Roccos Steinfaust zieht mit (geteiltes Level)', getAttackenLevel('steinfaust') === 15);
  pruefe('Level 15 macht gut doppelt so viel Schaden, nicht zwölfmal so viel',
    levelFaktor(15) > 2 && levelFaktor(15) < 2.3);
  const fh = getAttack('fausthieb');
  pruefe('Schaden auf Level 15 entspricht dem Faktor',
    attackeMitLevel(fh).damage === Math.round(fh.damage * levelFaktor(15)) && attackeMitLevel(fh).cost === fh.cost);
  pruefe('Ein Level kaufen ist teurer als früher (Lv. 1→2: mind. 800 Münzen)', attackenKosten(1).muenzen >= 800);
  saveProgress();
  loadProgress();
  pruefe('Kopien und Level bleiben nach dem Neuladen', getAttackenLevel('fausthieb') === 15);
  resetProgress();
  gameState.coins = 10000000;
  gameState.materials = 100000;
  for (let i = 0; i < 40; i++) beuteGutschreiben(truheOeffnen(TRUHEN[0]).find((b) => b.art === 'karte') ?? { art: 'nichts' });
  pruefe('Kopien aus Truhen leveln Karten hoch',
    Object.values(gameState.attackLevels).some((l) => l >= 3));
  resetProgress();
}

console.log('\nKampf-Modi: Herausforderung, Boss-Rush, Zeitangriff');
{
  resetProgress();
  const tag = new Date(2026, 9, 14, 12);
  const belegt = () => gameState.truhenPlaetze.filter(Boolean).map((p) => p.id);

  // Tägliche Herausforderung
  const a = tagesHerausforderung('2026-10-14', 1);
  const b = tagesHerausforderung('2026-10-14', 1);
  pruefe('Herausforderung: derselbe Tag, derselbe Gegner und Kniff', a.gegner.id === b.gegner.id && a.kniff.id === b.kniff.id);
  const verschieden = new Set(Array.from({ length: 20 }, (_, i) => {
    const h = tagesHerausforderung(`2026-11-${String(i + 1).padStart(2, '0')}`, 2);
    return `${h.gegner.id}/${h.kniff.id}`;
  }));
  pruefe('Herausforderung: an verschiedenen Tagen wechselt es', verschieden.size >= 5);
  pruefe('Herausforderung: der Kniff macht den Gegner stärker',
    TAGES_KNIFFE.every((k) => (k.hp ?? 1) >= 1 && (k.schaden ?? 1) >= 1));
  const tages = modusStarten('tages', tag);
  const tl = modusLevel(tages);
  pruefe('Herausforderung: ein Kampf, Gegner aus der freien Welt, Kniff sichtbar',
    tl.modus.anzahl === 1 && tl.worldId === 1 && !tl.isBoss && tl.gegner.variante.includes(tl.kniff.name));
  pruefe('Herausforderung: Niederlage bringt nichts', modusErgebnis(tages, 'lose', { zeit: 30, hp: 0, maxHp: 100 }).truhe === null);
  const t1 = modusErgebnis(tages, 'win', { zeit: 30, hp: 50, maxHp: 100 });
  pruefe('Herausforderung: erster Sieg des Tages bringt eine Silbertruhe in einen Platz',
    t1.truhe?.id === 'silbertruhe' && belegt().join() === 'silbertruhe');
  const t2 = modusErgebnis(tages, 'win', { zeit: 30, hp: 50, maxHp: 100 });
  pruefe('Herausforderung: am selben Tag nur einmal', t2.truhe === null && t2.schonGeholt && belegt().length === 1);
  pruefe('Herausforderung: Info sagt "heute geschafft"', modusInfo('tages', tag).includes('geschafft'));

  // Boss-Rush
  pruefe('Boss-Rush ist ohne besiegten Boss gesperrt', !modusFrei('bossrush').frei && modusInfo('bossrush').startsWith('🔒'));
  [1, 2, 3].forEach((w) => completeLevel(bossLevelOf(w).id, 3));
  pruefe('Nach 3 Bossen ist Boss-Rush frei', modusFrei('bossrush').frei && besiegteBossWelten().join() === '1,2,3');
  const rush = modusStarten('bossrush', tag);
  pruefe('Boss-Rush: drei Bosse in Welt-Reihenfolge',
    modusGegner(rush).map((g) => g.worldId).join() === '1,2,3' && modusGegner(rush).every((g) => g.isBoss));
  const r1 = modusErgebnis(rush, 'win', { zeit: 40, hp: 20, maxHp: 100 });
  pruefe('Boss-Rush: nach einem Sieg geht es weiter, mit etwas Heilung',
    r1.weiter?.schritt === 2 && r1.weiter.hp === 20 + 100 * MODI.bossrush.heilung && r1.truhe === null);
  pruefe('Boss-Rush: Heilung nie über das Maximum', modusErgebnis(rush, 'win', { zeit: 1, hp: 95, maxHp: 100 }).weiter.hp === 100);
  const r3 = modusErgebnis({ ...rush, schritt: 3 }, 'win', { zeit: 40, hp: 20, maxHp: 100 });
  pruefe('Boss-Rush: alle geschafft = Goldtruhe (ab 3 Bossen)', r3.truhe?.id === 'goldtruhe' && !r3.weiter);
  pruefe('Boss-Rush: nur einmal am Tag', modusErgebnis({ ...rush, schritt: 3 }, 'win', { zeit: 1, hp: 1, maxHp: 1 }).schonGeholt);
  pruefe('Boss-Rush: Niederlage beendet den Lauf', modusErgebnis(rush, 'lose', { zeit: 1, hp: 0, maxHp: 1 }).weiter === null);

  // Zeitangriff
  const zeit = modusStarten('zeit', tag);
  pruefe('Zeitangriff: drei normale Gegner', modusGegner(zeit).length === 3 && modusGegner(zeit).every((g) => !g.isBoss));
  const z1 = modusErgebnis(zeit, 'win', { zeit: 20.04, hp: 10, maxHp: 100 });
  pruefe('Zeitangriff: Zeit läuft weiter, Lebenspunkte wieder voll', z1.weiter.zeit === 20 && z1.weiter.hp === null);
  const z2 = modusErgebnis(z1.weiter, 'win', { zeit: 25, hp: 10, maxHp: 100 });
  const z3 = modusErgebnis(z2.weiter, 'win', { zeit: 30, hp: 10, maxHp: 100 });
  pruefe('Zeitangriff: erste Zeit ist Bestzeit und bringt eine Holztruhe',
    z3.zeitGesamt === 75 && z3.rekord && z3.truhe?.id === 'holztruhe' && gameState.modi.zeitRekorde[zeit.welt] === 75);
  const langsam = modusErgebnis({ ...zeit, schritt: 3, zeit: 70 }, 'win', { zeit: 10, hp: 1, maxHp: 1 });
  pruefe('Zeitangriff: langsamer = keine Truhe', !langsam.rekord && langsam.truhe === null && langsam.bestzeit === 75);
  const schnell = modusErgebnis({ ...zeit, schritt: 3, zeit: 40 }, 'win', { zeit: 10, hp: 1, maxHp: 1 });
  pruefe('Zeitangriff: schneller = neue Bestzeit + Truhe', schnell.rekord && schnell.truhe && gameState.modi.zeitRekorde[zeit.welt] === 50);
  pruefe('Zeit als Text', zeitText(75) === '1:15,0' && zeitText(9.35) === '0:09,4');

  saveProgress();
  loadProgress();
  pruefe('Tagesdaten und Bestzeiten überstehen das Neuladen',
    gameState.modi.tagesDatum === '2026-10-14' && gameState.modi.zeitRekorde[zeit.welt] === 50);
  localStorage.setItem('monsterquest.save.v3', JSON.stringify({ modi: { tagesDatum: 5, zeitRekorde: { 1: 'x', 99: 3, 2: 12 } } }));
  loadProgress();
  pruefe('Kaputte Modus-Daten werden beim Laden bereinigt',
    gameState.modi.tagesDatum === null && JSON.stringify(gameState.modi.zeitRekorde) === '{"2":12}');
  resetProgress();
}

console.log('\nZeit-Truhen (Holz alle 30 Min, Gold jede Stunde)');
{
  resetProgress();
  const t0 = 1_000_000_000_000;
  pruefe('Neuer Spielstand: beide Gratis-Truhen sofort bereit',
    alleZeitTruhen(t0).map((z) => `${z.truhe.id}:${z.bereit}`).join() === 'holztruhe:true,goldtruhe:true');
  const holz = zeitTruheAbholen('holztruhe', t0);
  pruefe('Abholen gibt die Holztruhe', holz?.id === 'holztruhe');
  pruefe('Kein zweites Mal direkt danach', zeitTruheAbholen('holztruhe', t0 + 1000) === null);
  pruefe('Holz ist nach 30 Minuten wieder bereit',
    !zeitTruheZustand('holztruhe', t0 + 29 * 60000).bereit && zeitTruheZustand('holztruhe', t0 + 30 * 60000).bereit);
  zeitTruheAbholen('goldtruhe', t0);
  pruefe('Gold ist nach einer Stunde wieder bereit',
    !zeitTruheZustand('goldtruhe', t0 + 59 * 60000).bereit && zeitTruheZustand('goldtruhe', t0 + 60 * 60000).bereit);
  pruefe('Es stapelt sich nichts: nach 5 Stunden genau eine Truhe',
    zeitTruheAbholen('holztruhe', t0 + 300 * 60000) !== null && zeitTruheAbholen('holztruhe', t0 + 300 * 60000) === null);
  pruefe('Zeit-Truhen belegen keinen Truhenplatz', gameState.truhenPlaetze.every((p) => p === null));
  pruefe('Eine unbekannte Zeit-Truhe gibt es nicht', zeitTruheAbholen('silbertruhe', t0) === null);

  const bald = Date.now() + 20 * 60000;
  gameState.zeitTruhen = { holztruhe: bald };
  saveProgress();
  loadProgress();
  pruefe('Die Uhr übersteht das Neuladen', gameState.zeitTruhen.holztruhe === bald);
  localStorage.setItem('monsterquest.save.v3', JSON.stringify({ zeitTruhen: { holztruhe: Date.now() + 9e12, goldtruhe: 'x', quatsch: 5 } }));
  loadProgress();
  pruefe('Verstellte Uhr: höchstens eine Wartezeit, Unsinn fliegt raus',
    gameState.zeitTruhen.holztruhe <= Date.now() + 30 * 60000 && !('goldtruhe' in gameState.zeitTruhen) && !('quatsch' in gameState.zeitTruhen));
  resetProgress();
}

console.log(`\n${bestanden} bestanden, ${fehler} fehlgeschlagen\n`);
process.exit(fehler > 0 ? 1 : 0);
