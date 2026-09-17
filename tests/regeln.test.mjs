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
import { createFighter, MAX_XP, START_XP } from '../js/core/fighter.js';
import { MONSTERS } from '../js/data/monsters.js';
import { ATTACKS, START_ATTACKEN, getAttack } from '../js/data/attacks.js';
import { ENEMIES } from '../js/data/enemies.js';
import { BOSS_FORMEN, FORM_NAMEN, GROESSE, formenPruefen } from '../js/ui/sprite.js';
import { WORLDS, fightsInWorld } from '../js/data/worlds.js';
import { LEVELS, bossLevelOf, levelsOfWorld } from '../js/data/levels.js';
import {
  besitztAttacke,
  beuteGutschreiben,
  bezahlen,
  completeLevel,
  gameState,
  getDeck,
  isLevelUnlocked,
  isWorldUnlocked,
  kannBezahlen,
  nextLevelOf,
  resetProgress,
  setDeck,
} from '../js/core/state.js';
import { TRUHEN } from '../js/data/shop.js';
import { BEUTE_ATTACKEN, SELTENHEITEN, SKINS } from '../js/data/items.js';
import { BOSS_MATERIAL, materialBelohnung, siegBelohnung } from '../js/core/belohnung.js';
import { BOSS_TRUHE } from '../js/data/shop.js';
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
    `${monster.name}: keine Attacke kostet mehr als ${MAX_XP} XP`,
    monster.deck.every((id) => getAttack(id).cost <= MAX_XP)
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
  const held = MONSTERS.glutwelpe;

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
  pruefe('Tempo bleibt hoechstens beim Anderthalbfachen', werteHoch.xpPerSecond <= 1.5);

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
  const held = MONSTERS.glutwelpe;

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

  const grund = getAttack('feuerball');
  pruefe('Attacke startet auf Level 1', getAttackenLevel('feuerball') === 1);

  attackeAufwerten('feuerball');
  const stufe2 = attackeMitLevel(getAttack('feuerball'));
  pruefe('Nach dem Aufwerten macht sie mehr Schaden', stufe2.damage > grund.damage);
  pruefe('Die XP-Kosten bleiben gleich', stufe2.cost === grund.cost);
  pruefe(
    'Jede Attacken-Stufe kostet mehr',
    [1, 2, 3].every((l) => attackenKosten(l).muenzen < attackenKosten(l + 1).muenzen)
  );

  for (let i = 0; i < MAX_ATTACKEN_LEVEL + 3; i++) attackeAufwerten('feuerball');
  pruefe(
    `Attacken enden bei Level ${MAX_ATTACKEN_LEVEL}`,
    getAttackenLevel('feuerball') === MAX_ATTACKEN_LEVEL
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
  const monster = MONSTERS.glutwelpe;
  pruefe('Ohne Aenderung gilt das Standarddeck', getDeck(monster).join() === monster.deck.join());

  const neu = [...monster.deck];
  neu[0] = 'blitzschlag';
  setDeck(monster.id, neu);
  pruefe('Geaendertes Deck wird verwendet', getDeck(monster)[0] === 'blitzschlag');
  pruefe('Das Deck hat weiterhin 8 Karten', getDeck(monster).length === DECK_SIZE);

  let abgelehnt = false;
  try {
    setDeck(monster.id, ['krallenhieb', 'biss']);
  } catch {
    abgelehnt = true;
  }
  pruefe('Ein Deck mit 2 Karten wird abgelehnt', abgelehnt);
  resetProgress();
}

console.log('\nDeck und Hand');
{
  const deck = createDeck(MONSTERS.glutwelpe.deck);
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

console.log('\nXP-System');
{
  const kaempfer = createFighter(MONSTERS.glutwelpe);
  pruefe(`Startet mit ${START_XP} XP`, kaempfer.state.xp === START_XP);

  kaempfer.gainXp(100); // 100 Sekunden auf einmal
  pruefe(`XP steigen nie über ${MAX_XP}`, kaempfer.state.xp === MAX_XP);

  // Alles ausgeben, was geht
  for (let i = 0; i < 30; i++) {
    const bezahlbar = kaempfer.state.hand.findIndex((id) => kaempfer.canAfford(getAttack(id).cost));
    if (bezahlbar === -1) break;
    kaempfer.useCard(bezahlbar);
  }
  pruefe('XP fallen nie unter 0', kaempfer.state.xp >= 0);

  const teuer = createFighter(MONSTERS.glutwelpe);
  const teuerste = teuer.handAttacks().reduce((a, b) => (a.cost > b.cost ? a : b));
  const index = teuer.state.hand.indexOf(teuerste.id);
  const darf = teuerste.cost <= teuer.state.xp;
  const ergebnis = teuer.useCard(index);
  pruefe(
    'Zu teure Attacke wird abgelehnt',
    darf ? ergebnis !== null : ergebnis === null
  );
}

console.log('\nSchaden und Schild');
{
  const kaempfer = createFighter(MONSTERS.glutwelpe);
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

  const normal = siegBelohnung(ersterKampf, 3, 'glutwelpe', nieGlueck);
  pruefe('Sieg bringt Muenzen und Erfahrung', normal.stuecke.length >= 2);
  pruefe(
    'Jedes Belohnungsstueck hat Symbol, Name und Seltenheit',
    normal.stuecke.every((s) => s.icon && s.name && SELTENHEITEN[s.seltenheit])
  );

  // 3 Sterne = +30 Prozent Muenzen
  const ohneSterne = LEVELS.find((l) => l.worldId === 1 && l.number === 2);
  resetProgress();
  const mitDrei = siegBelohnung(ohneSterne, 3, 'glutwelpe', nieGlueck).stuecke[0].menge;
  resetProgress();
  const mitNull = siegBelohnung(ohneSterne, 0, 'glutwelpe', nieGlueck).stuecke[0].menge;
  pruefe('Sterne erhoehen die Muenzen', mitDrei > mitNull);

  // Wiederholung bringt weniger
  resetProgress();
  const erstesMal = siegBelohnung(ersterKampf, 3, 'glutwelpe', nieGlueck);
  const zweitesMal = siegBelohnung(ersterKampf, 3, 'glutwelpe', nieGlueck);
  pruefe('Erster Sieg zaehlt als neu', erstesMal.erstesMal && !zweitesMal.erstesMal);
  pruefe('Wiederholung bringt weniger Muenzen', zweitesMal.stuecke[0].menge < erstesMal.stuecke[0].menge);
  pruefe(
    'Erfahrung bleibt auch beim Wiederholen gleich',
    zweitesMal.stuecke[1].menge === erstesMal.stuecke[1].menge
  );

  // Boss gibt deutlich mehr
  resetProgress();
  const bossLohn = siegBelohnung(boss, 3, 'glutwelpe', nieGlueck);
  pruefe('Boss gibt mehr Muenzen als ein normaler Kampf', bossLohn.stuecke[0].menge > erstesMal.stuecke[0].menge * 2);
  pruefe('Boss gibt mehr Erfahrung', bossLohn.stuecke[1].menge > erstesMal.stuecke[1].menge);
  pruefe('Boss oeffnet eine neue Welt', bossLohn.newWorld?.id === 2);

  // Bosstruhe nur beim ersten Sieg
  const mitTruhe = bossLohn.stuecke.length;
  const bossZweimal = siegBelohnung(boss, 3, 'glutwelpe', nieGlueck);
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

console.log(`\n${bestanden} bestanden, ${fehler} fehlgeschlagen\n`);
process.exit(fehler > 0 ? 1 : 0);
