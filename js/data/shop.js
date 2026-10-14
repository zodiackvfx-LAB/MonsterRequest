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
 *   anzahl    - wie viele Beutestücke die Truhe enthält - davon ist immer
 *               genau eines Münzen (150 bis 500, siehe TRUHEN_MUENZEN in
 *               js/data/items.js), die übrigen Material, Attacken oder Skins
 *   chancen   - Wahrscheinlichkeit je Seltenheit in Prozent (Summe 100)
 *   garantie  - mindestens ein Stück dieser Seltenheit ist enthalten
 *   design    - welche gezeichnete Truhe gezeigt wird (siehe js/ui/truhen.js)
 *   minuten   - wie lange die Truhe in einem Truhenplatz zum Freischalten
 *               braucht (nur gewonnene Truhen - gekaufte öffnen sofort)
 */
export const TRUHEN = [
  {
    id: 'holztruhe',
    minuten: 15,
    name: 'Holztruhe',
    icon: '🧰',
    design: 'holz',
    text: 'Die einfache Truhe: Münzen, Material und Fähigkeitskarten.',
    preis: 250,
    anzahl: 5,
    chancen: { gewoehnlich: 70, selten: 25, episch: 4.5, legendaer: 0.5 },
    garantie: null,
  },
  {
    id: 'silbertruhe',
    minuten: 60,
    name: 'Silbertruhe',
    icon: '🎁',
    design: 'silber',
    text: 'Bessere Aussichten - mindestens ein seltenes Stück ist dabei.',
    preis: 800,
    anzahl: 5,
    chancen: { gewoehnlich: 45, selten: 40, episch: 13, legendaer: 2 },
    garantie: 'selten',
  },
  {
    id: 'goldtruhe',
    minuten: 180,
    name: 'Goldtruhe',
    icon: '🏆',
    design: 'gold',
    text: 'Die große Truhe - mindestens ein episches Stück ist dabei.',
    preis: 2000,
    anzahl: 5,
    chancen: { gewoehnlich: 20, selten: 45, episch: 28, legendaer: 7 },
    garantie: 'episch',
  },
];

/**
 * Die Truhe, die es nach dem ersten Sieg gegen einen Boss gibt.
 * Sie steht bewusst NICHT in TRUHEN - man kann sie nicht kaufen.
 */
export const BOSS_TRUHE = {
  id: 'bosstruhe',
  minuten: 60,
  name: 'Bosstruhe',
  icon: '👑',
  design: 'boss',
  text: 'Der Lohn für einen besiegten Boss.',
  preis: 0,
  anzahl: 3,
  chancen: { gewoehnlich: 35, selten: 42, episch: 19, legendaer: 4 },
  garantie: 'selten',
};

/**
 * Gratis-Truhe: Nach jedem 2. gewonnenen Kampf im Abenteuer gibt es eine
 * Holztruhe geschenkt (siehe js/core/belohnung.js). Niederlagen zählen nicht
 * mit, die Endlos-Arena auch nicht - sie läuft bewusst ohne Belohnungen.
 */
export const SIEGE_PRO_GRATIS_TRUHE = 2;
export const GRATIS_TRUHE_ID = 'holztruhe';

/**
 * Truhenplätze wie bei Clash Royale.
 *
 * Gewonnene Truhen landen in einem von 4 Plätzen auf der Startseite. Dort
 * werden sie freigeschaltet - immer nur EINE gleichzeitig - und danach
 * geöffnet. Wer nicht warten will, öffnet sofort mit Münzen (siehe
 * sofortPreis in js/core/truhenplaetze.js).
 *
 * Sind alle Plätze belegt:
 *   - die Gratis-Truhe wartet, bis wieder ein Platz frei ist (es wartet
 *     höchstens eine - weitere Siege stapeln keine Truhen)
 *   - die Bosstruhe geht nie verloren, sie stellt sich in die Warteschlange
 */
export const TRUHEN_PLAETZE = 4;

/**
 * Was das Sofort-Öffnen höchstens kostet: der Wert der Truhe in Münzen.
 * Je weiter die Zeit schon gelaufen ist, desto billiger wird es.
 */
export const SOFORT_WERT = { holztruhe: 250, silbertruhe: 800, goldtruhe: 2000, bosstruhe: 600 };

/** Billiger als das wird Sofort-Öffnen nie. */
export const SOFORT_MINDESTPREIS = 5;

export function getTruhe(id) {
  return TRUHEN.find((truhe) => truhe.id === id);
}

/** Jede Truhe per id - auch die Bosstruhe, die man nicht kaufen kann. */
export function truheNachId(id) {
  return id === BOSS_TRUHE.id ? BOSS_TRUHE : getTruhe(id);
}
