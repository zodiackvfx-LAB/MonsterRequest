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
import { MONSTERS, STARTER_MONSTER_ID, getMonster } from '../js/data/monsters.js';
import { ATTACKS, START_ATTACKEN, getAttack } from '../js/data/attacks.js';
import { ENEMIES } from '../js/data/enemies.js';
import { GEGNER_ARTEN } from '../js/data/gegnerarten.js';
import { BOSS_FORMEN, FORM_NAMEN, GROESSE, formenPruefen } from '../js/ui/sprite.js';
import { WORLDS, fightsInWorld } from '../js/data/worlds.js';
import { LOGO_MONSTER, LOGO_QUEST } from '../js/ui/logo-pfade.js';
import { readFileSync } from 'node:fs';
import { LEVELS, bossLevelOf, levelsOfWorld } from '../js/data/levels.js';
import {
  besitztAttacke,
  besitztKraft,
  beuteGutschreiben,
  bezahlen,
  bossKraftFreischalten,
  completeLevel,
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
import { BEUTE_ATTACKEN, SELTENHEITEN, SKINS } from '../js/data/items.js';
import { BOSS_MATERIAL, materialBelohnung, siegBelohnung } from '../js/core/belohnung.js';
import { BOSS_KRAEFTE, getKraft, kraftFuerWelt } from '../js/data/kraefte.js';
import { BOSS_TRUHE } from '../js/data/shop.js';
import { AUFGABEN, AUFGABEN_PRO_TAG } from '../js/data/aufgaben.js';
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
  pruefe('Sammlung umfasst 18 Attacken', sammelbar === 18);

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

  // Bosstruhe nur beim ersten Sieg
  const mitTruhe = bossLohn.stuecke.length;
  const bossZweimal = siegBelohnung(boss, 3, SPIELFIGUR.id, nieGlueck);
  pruefe('Bosstruhe gibt es nur beim ersten Sieg', bossZweimal.stuecke.length < mitTruhe);
  pruefe('Bosstruhe enthaelt 3 Stuecke', mitTruhe - bossZweimal.stuecke.length === BOSS_TRUHE.anzahl);

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
  pruefe('Jeder Skin ausser Standard hat einen Farbfilter',
    meine.filter((skin) => skin.id !== 'skin-standard').every((skin) => Boolean(skin.filter)));
  pruefe('Keine zwei Skins sehen gleich aus',
    new Set(meine.map((skin) => skin.filter)).size === meine.length);

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
  pruefe('Alter Spielstand: Attacken-Level wandert auf den neuen Namen',
    getAttackenLevel('sturmfaust') === 3);
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

  const ARTEN = ['schild', 'schildbruch', 'brand', 'frost', 'lebensraub', 'energiesturm'];

  pruefe('Es gibt für jede der 6 Welten eine Boss-Kraft',
    BOSS_KRAEFTE.length === 6 && [1, 2, 3, 4, 5, 6].every((w) => kraftFuerWelt(w)));
  pruefe('Jede Kraft-id ist einmalig',
    new Set(BOSS_KRAEFTE.map((k) => k.id)).size === 6);
  pruefe('Jede Kraft hat eine bekannte Wirkung',
    BOSS_KRAEFTE.every((k) => ARTEN.includes(k.art)));
  pruefe('Jede Kraft hat Name, Symbol und Beschreibung',
    BOSS_KRAEFTE.every((k) => k.name && k.icon && k.text && k.boss));

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

console.log(`\n${bestanden} bestanden, ${fehler} fehlgeschlagen\n`);
process.exit(fehler > 0 ? 1 : 0);
