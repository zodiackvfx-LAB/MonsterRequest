/**
 * Der Shop: welche Truhen es gibt und was sie kosten.
 *
 * Bezahlt wird ausschließlich mit Münzen, die man in Kämpfen verdient.
 * Es gibt keine zweite Währung und nichts, was mit echtem Geld zu tun hat.
 *
 * Eine neue Truhe hinzufügen = einen Eintrag ergänzen.
 *
 * Felder:
 *   preis     - Kosten in Münzen
 *   anzahl    - wie viele Beutestücke die Truhe enthält
 *   chancen   - Wahrscheinlichkeit je Seltenheit in Prozent (Summe 100)
 *   garantie  - mindestens ein Stück dieser Seltenheit ist enthalten
 */
export const TRUHEN = [
  {
    id: 'holztruhe',
    name: 'Holztruhe',
    icon: '🧰',
    text: 'Die einfache Truhe. Meist Münzen und Material, manchmal mehr.',
    preis: 250,
    anzahl: 5,
    chancen: { gewoehnlich: 70, selten: 25, episch: 4.5, legendaer: 0.5 },
    garantie: null,
  },
  {
    id: 'silbertruhe',
    name: 'Silbertruhe',
    icon: '🎁',
    text: 'Bessere Aussichten - mindestens ein seltenes Stück ist dabei.',
    preis: 800,
    anzahl: 5,
    chancen: { gewoehnlich: 45, selten: 40, episch: 13, legendaer: 2 },
    garantie: 'selten',
  },
  {
    id: 'goldtruhe',
    name: 'Goldtruhe',
    icon: '🏆',
    text: 'Die große Truhe - mindestens ein episches Stück ist dabei.',
    preis: 2000,
    anzahl: 5,
    chancen: { gewoehnlich: 20, selten: 45, episch: 28, legendaer: 7 },
    garantie: 'episch',
  },
];

export function getTruhe(id) {
  return TRUHEN.find((truhe) => truhe.id === id);
}
