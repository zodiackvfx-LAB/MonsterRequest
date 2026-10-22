/**
 * Sortierung der Attacken im Deckmenü.
 *
 * Betrifft NUR die Anzeige. Das Kampfdeck bleibt, wie es ist - im Kampf
 * wird ohnehin gemischt.
 *
 * Heil- und Schildkarten machen keinen Schaden. Beim Sortieren nach Schaden
 * stehen sie deshalb immer HINTER allen Schadenskarten (egal ob auf- oder
 * absteigend) - sonst landete "Deckung" mit 0 Schaden ganz vorn, als wäre
 * sie die schwächste Angriffskarte.
 */

/** Die Sortierarten in der Reihenfolge der Knöpfe. */
export const SORTIERUNGEN = [
  { id: 'deck', label: 'Deck' },
  { id: 'name', label: 'A–Z' },
  { id: 'kosten-auf', label: 'Kosten ↑' },
  { id: 'kosten-ab', label: 'Kosten ↓' },
  { id: 'schaden-auf', label: 'Schaden ↑' },
  { id: 'schaden-ab', label: 'Schaden ↓' },
];

const nachName = (a, b) => a.name.localeCompare(b.name, 'de');

/**
 * Sortiert Einträge, die je eine Attacke tragen.
 *
 * @param {object[]} eintraege - beliebige Objekte
 * @param {string} art - id aus SORTIERUNGEN; Unbekanntes = Deck-Reihenfolge
 * @param {function} [attackeVon] - holt die Attacke aus einem Eintrag
 * @returns {object[]} eine NEUE, sortierte Liste (das Original bleibt)
 */
export function sortiereAttacken(eintraege, art, attackeVon = (e) => e) {
  const liste = [...eintraege];
  const vergleiche = {
    name: (a, b) => nachName(a, b),
    'kosten-auf': (a, b) => a.cost - b.cost || nachName(a, b),
    'kosten-ab': (a, b) => b.cost - a.cost || nachName(a, b),
    'schaden-auf': (a, b) => schadenVergleich(a, b, 1),
    'schaden-ab': (a, b) => schadenVergleich(a, b, -1),
  }[art];
  if (!vergleiche) return liste;
  return liste.sort((x, y) => vergleiche(attackeVon(x), attackeVon(y)));
}

function schadenVergleich(a, b, richtung) {
  const aSchaden = (a.damage ?? 0) > 0;
  const bSchaden = (b.damage ?? 0) > 0;
  // Schadenskarten vor allen anderen.
  if (aSchaden !== bSchaden) return aSchaden ? -1 : 1;
  if (!aSchaden) return a.cost - b.cost || nachName(a, b);
  return richtung * (a.damage - b.damage) || a.cost - b.cost || nachName(a, b);
}
