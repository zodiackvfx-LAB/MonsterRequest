/**
 * Katalog aller Attacken im Spiel.
 *
 * Das sind reine Daten - hier balancierst du das Spiel, ohne Logik anzufassen.
 *
 * Felder:
 *   id      - eindeutiger Schlüssel (muss mit dem Objekt-Schlüssel übereinstimmen)
 *   name    - Anzeigename auf der Karte
 *   cost    - Energiekosten (1 bis 10, siehe MAX_ENERGIE in js/core/fighter.js)
 *   damage  - Schaden am Gegenüber (0, wenn die Attacke nur heilt)
 *   heal    - Heilung für sich selbst (optional)
 *   shield  - Schild, das kommenden Schaden abfängt (optional)
 *   gift    - Gift beim Gegenüber (optional): { tick, male, intervall } -
 *             male-mal je intervall Sekunden tick Schaden (siehe battle.js)
 *   stun    - Betäubung des Gegenübers in Sekunden (optional): es kann so
 *             lange nicht handeln (nutzt dieselbe Sperre wie Frost)
 *   icon    - Symbol auf der Karte
 *   text    - kurze Beschreibung für die Karte
 *   seltenheit - 'gewoehnlich' | 'selten' | 'episch' | 'legendaer'
 *                (nur für die Anzeige in der Sammlung, siehe js/data/items.js)
 *
 * Hier stehen nur die Attacken der Spielfiguren (Timo, Rocco). Die Attacken der Gegner werden
 * aus den Vorlagen der jeweiligen Welt erzeugt (js/data/worlds.js) und über
 * registerAttack() ergänzt.
 *
 * Faustregel fürs Balancing: Schaden geteilt durch Kosten ergibt die
 * "Stärke pro Energie". Weil beide Seiten 1 Energie pro Sekunde bekommen, entscheidet
 * dieser Wert darüber, wie hart eine Seite austeilt.
 *   Spieler  ca. 5,5 bis 6,9 (je teurer, desto stärker pro Energie)
 *   Gegner   3,4 in Welt 1 bis 4,6 in Welt 6 (powerPerXp in worlds.js)
 */
export const ATTACKS = {
  /* ===================================================================
     Timos Deck - die acht Attacken, mit denen er startet.

     Bis 4 Energie sind es Schlaege und Tritte, ab 5 gebuendelte Energie.
     Das ist kein Zufall: genau bei 5 wechselt auch die Animation von
     der Faust zum Energiestrahl (ANGRIFF_AB_ENERGIE in js/screens/battle.js).

     Teurere Attacken sind pro Energie etwas staerker. Das belohnt Sparen,
     ohne die billigen Karten nutzlos zu machen.
     =================================================================== */

  /* ---------- Nahkampf ---------- */
  fausthieb: {
    id: 'fausthieb',
    seltenheit: 'gewoehnlich',
    name: 'Fausthieb',
    cost: 2,
    damage: 11,
    icon: '👊',
    text: 'Ein schneller gerader Schlag. Sitzt fast immer.',
  },
  ellbogenstoss: {
    id: 'ellbogenstoss',
    seltenheit: 'gewoehnlich',
    name: 'Ellbogenstoß',
    cost: 2,
    damage: 12,
    icon: '🤜',
    text: 'Aus der Drehung heraus - kurz, hart, aus naechster Naehe.',
  },
  wirbelkick: {
    id: 'wirbelkick',
    seltenheit: 'selten',
    name: 'Wirbelkick',
    cost: 3,
    damage: 17,
    icon: '🌀',
    text: 'Timo dreht sich einmal um die eigene Achse und tritt zu.',
  },
  aufwaertshaken: {
    id: 'aufwaertshaken',
    seltenheit: 'selten',
    name: 'Aufwärtshaken',
    cost: 4,
    damage: 23,
    icon: '🥊',
    text: 'Von unten nach oben durch die Deckung.',
  },
  deckung: {
    id: 'deckung',
    seltenheit: 'selten',
    name: 'Deckung',
    cost: 4,
    damage: 0,
    shield: 26,
    icon: '🛡️',
    text: 'Arme hoch und abwarten. Faengt den naechsten Treffer ab.',
  },

  /* ---------- Energie ---------- */
  energiestoss: {
    id: 'energiestoss',
    seltenheit: 'episch',
    name: 'Energiestoß',
    cost: 5,
    damage: 30,
    icon: '💥',
    text: 'Gebuendelte Energie aus der Faust nach vorn.',
  },
  druckwelle: {
    id: 'druckwelle',
    seltenheit: 'episch',
    name: 'Druckwelle',
    cost: 7,
    damage: 45,
    icon: '💫',
    text: 'Eine Wand aus Luft, die alles vor sich herschiebt.',
  },
  sturmfaust: {
    id: 'sturmfaust',
    seltenheit: 'legendaer',
    name: 'Sturmfaust',
    cost: 9,
    damage: 62,
    icon: '⚡',
    text: 'Timos staerkster Schlag - fast seine gesamte Energie auf einmal.',
  },
};

/**
 * Die ids der acht Startattacken - festgehalten, bevor Beute- und
 * Gegnerattacken über registerAttack() dazukommen. Die Sammlung
 * unterscheidet darüber, was von Anfang an dabei ist.
 */
export const START_ATTACKEN = Object.keys(ATTACKS);

/**
 * Roccos Deck - die Stein-Fassung von Timos acht Attacken.
 *
 * Kosten, Schaden und Schild sind GENAU dieselben wie bei Timo; nur Name,
 * Symbol und Beschreibung passen zu einem Steingolem. Damit bleibt das
 * Balancing unverändert.
 *
 *   stufeVon - die Timo-Attacke, deren Level diese Attacke teilt. Wer
 *              Fausthieb aufgewertet hat, hat damit auch Roccos Steinfaust
 *              aufgewertet - und umgekehrt (siehe getAttackenLevel in
 *              js/core/progression.js). So geht beim Figurwechsel kein
 *              Fortschritt verloren.
 */
export const ROCCO_ATTACKEN = [
  { id: 'steinfaust', stufeVon: 'fausthieb', seltenheit: 'gewoehnlich', name: 'Steinfaust', cost: 2, damage: 11, icon: '🪨', text: 'Eine Faust aus Fels - langsam ausgeholt, schwer gelandet.' },
  { id: 'schulterramme', stufeVon: 'ellbogenstoss', seltenheit: 'gewoehnlich', name: 'Schulterramme', cost: 2, damage: 12, icon: '💪', text: 'Rocco wirft sich mit der ganzen Schulter nach vorn.' },
  { id: 'felsstampfer', stufeVon: 'wirbelkick', seltenheit: 'selten', name: 'Felsstampfer', cost: 3, damage: 17, icon: '🦶', text: 'Ein Tritt auf den Boden, der bis zum Gegner bebt.' },
  { id: 'brockenwurf', stufeVon: 'aufwaertshaken', seltenheit: 'selten', name: 'Brockenwurf', cost: 4, damage: 23, icon: '🗿', text: 'Ein Stück vom eigenen Rücken - mit Schwung geworfen.' },
  { id: 'steinhaut', stufeVon: 'deckung', seltenheit: 'selten', name: 'Steinhaut', cost: 4, damage: 0, shield: 26, icon: '🧱', text: 'Rocco verhärtet sich. Fängt den nächsten Treffer ab.' },
  { id: 'erdstoss', stufeVon: 'energiestoss', seltenheit: 'episch', name: 'Erdstoß', cost: 5, damage: 30, icon: '⛰️', text: 'Eine Felsspitze bricht unter dem Gegner aus dem Boden.' },
  { id: 'felslawine', stufeVon: 'druckwelle', seltenheit: 'episch', name: 'Felslawine', cost: 7, damage: 45, icon: '🏔️', text: 'Geröll von allen Seiten - kaum auszuweichen.' },
  { id: 'bergsturz', stufeVon: 'sturmfaust', seltenheit: 'legendaer', name: 'Bergsturz', cost: 9, damage: 62, icon: '🌋', text: 'Roccos stärkster Schlag: der halbe Berg fällt auf einmal.' },
];

ROCCO_ATTACKEN.forEach((attacke) => {
  ATTACKS[attacke.id] = { heal: 0, shield: 0, ...attacke };
});

/**
 * Die Attacke, deren Level eine Attacke trägt - meist sie selbst. Roccos
 * Attacken teilen ihr Level mit Timos (siehe ROCCO_ATTACKEN).
 */
export function stufenId(id) {
  return ATTACKS[id]?.stufeVon ?? id;
}

/**
 * Trägt eine Attacke nachträglich in den Katalog ein.
 *
 * Das nutzt js/data/enemies.js: Die Attacken der Gegner werden aus den
 * Vorlagen einer Welt erzeugt, statt hier einzeln aufgeschrieben zu werden.
 * Für die Kampf-Engine sind sie danach ganz normale Attacken.
 */
export function registerAttack(attack) {
  if (!attack.id) throw new Error('Attacke ohne id kann nicht eingetragen werden');
  ATTACKS[attack.id] = { damage: 0, heal: 0, shield: 0, ...attack };
  return attack.id;
}

/** Holt eine Attacke per id - mit klarer Fehlermeldung, falls die id nicht existiert. */
export function getAttack(id) {
  const attack = ATTACKS[id];
  if (!attack) {
    throw new Error(`Unbekannte Attacke: "${id}" (siehe js/data/attacks.js)`);
  }
  return attack;
}
