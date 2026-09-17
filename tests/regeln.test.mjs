/**
 * Test der Kernregeln - ohne Browser, direkt mit Node ausführbar:
 *
 *     node tests/regeln.test.mjs
 *
 * Getestet werden die Regeln, die das Spiel ausmachen. Wenn hier etwas rot
 * wird, stimmt eine Grundregel nicht mehr.
 */

import { createDeck, DECK_SIZE, HAND_SIZE } from '../js/core/deck.js';
import { createFighter, MAX_XP, START_XP } from '../js/core/fighter.js';
import { MONSTERS } from '../js/data/monsters.js';
import { ATTACKS, getAttack } from '../js/data/attacks.js';

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

console.log(`\n${bestanden} bestanden, ${fehler} fehlgeschlagen\n`);
process.exit(fehler > 0 ? 1 : 0);
