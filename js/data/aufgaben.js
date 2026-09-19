/**
 * Die möglichen Tagesaufgaben.
 *
 * Reine Daten - eine neue Aufgabe hinzufügen heißt: hier einen Eintrag
 * ergänzen. Damit sie mitzählt, muss ihr "typ" irgendwo im Spiel über
 * fortschrittMelden() gemeldet werden (siehe js/core/aufgaben.js).
 *
 * Felder:
 *   id        - eindeutiger Schlüssel
 *   icon      - Symbol in der Liste
 *   name      - kurze Überschrift
 *   text      - was zu tun ist
 *   typ       - welches Ereignis zählt
 *   ziel      - wie oft
 *   muenzen   - Belohnung in Münzen
 *   material  - Belohnung in Aufwertungs-Material
 */
export const AUFGABEN = [
  {
    id: 'siege-3',
    icon: '⚔️',
    name: 'Drei Siege',
    text: 'Gewinne 3 Kämpfe.',
    typ: 'sieg',
    ziel: 3,
    muenzen: 200,
    material: 2,
  },
  {
    id: 'siege-6',
    icon: '🔥',
    name: 'Kampfeslust',
    text: 'Gewinne 6 Kämpfe.',
    typ: 'sieg',
    ziel: 6,
    muenzen: 400,
    material: 4,
  },
  {
    id: 'sterne-2',
    icon: '⭐',
    name: 'Makellos',
    text: 'Gewinne 2 Kämpfe mit 3 Sternen.',
    typ: 'dreiSterne',
    ziel: 2,
    muenzen: 350,
    material: 3,
  },
  {
    id: 'boss-1',
    icon: '👑',
    name: 'Bossjäger',
    text: 'Besiege einen Boss.',
    typ: 'boss',
    ziel: 1,
    muenzen: 500,
    material: 5,
  },
  {
    id: 'attacken-20',
    icon: '🃏',
    name: 'Kartenkünstler',
    text: 'Setze 20 Attacken ein.',
    typ: 'attacke',
    ziel: 20,
    muenzen: 250,
    material: 2,
  },
  {
    id: 'schaden-400',
    icon: '💥',
    name: 'Volle Wucht',
    text: 'Füge 400 Schaden zu.',
    typ: 'schaden',
    ziel: 400,
    muenzen: 300,
    material: 3,
  },
  {
    id: 'truhe-1',
    icon: '🧰',
    name: 'Schatzsucher',
    text: 'Öffne eine Truhe.',
    typ: 'truhe',
    ziel: 1,
    muenzen: 300,
    material: 3,
  },
  {
    id: 'aufwertung-1',
    icon: '🔧',
    name: 'Stärker werden',
    text: 'Werte eine Attacke oder einen Wert auf.',
    typ: 'aufwertung',
    ziel: 1,
    muenzen: 250,
    material: 2,
  },
];

/** Wie viele Aufgaben pro Tag gestellt werden. */
export const AUFGABEN_PRO_TAG = 3;

export function getAufgabe(id) {
  return AUFGABEN.find((aufgabe) => aufgabe.id === id) ?? null;
}
