/**
 * Gegner-Archetypen ("Varianten").
 *
 * Damit sich nicht alle Gegner gleich anfühlen, bekommt jeder eine Variante.
 * Sie verändert nur ein paar Werte - kein neues Deck, keine Sonderregeln -
 * und bleibt in der Summe ungefähr gleich stark:
 *
 *   normal   unverändert
 *   flink    weniger Leben, greift viel öfter an
 *   Panzer   viel Leben und etwas Abwehr, dafür langsam
 *   wütend   wenig Leben, haut dafür kräftig zu
 *
 * Die Werte sind Faktoren auf die Grundwerte des Gegners:
 *   hp        Lebenspunkte
 *   reaktion  Reaktionszeit (kleiner = greift öfter an)
 *   defense   fängt so viel Schaden ab (0..1)
 *   angriff   Faktor auf den ausgeteilten Schaden
 *
 * EINE NEUE VARIANTE = einen Eintrag ergänzen. Ein Gegner in worlds.js kann
 * seine Variante über das Feld "art" selbst wählen (z. B. { n:'…', art:'panzer' });
 * ohne Angabe verteilt standardArt() automatisch für Abwechslung.
 */
export const GEGNER_ARTEN = {
  normal: { name: null, hp: 1, reaktion: 1, defense: 0, angriff: 1 },
  flink: { name: 'Flink', hp: 0.85, reaktion: 0.6, defense: 0, angriff: 0.9 },
  panzer: { name: 'Panzer', hp: 1.35, reaktion: 1.35, defense: 0.15, angriff: 1 },
  wuetend: { name: 'Wütend', hp: 0.8, reaktion: 0.9, defense: 0, angriff: 1.3 },
};

/**
 * Verteilt Varianten, wenn ein Gegner keine eigene nennt.
 * Die ersten beiden Kämpfe einer Welt bleiben "normal" (ruhiger Einstieg),
 * danach wechseln sich die Varianten ab.
 *
 * @param {number} index - der wievielte Gegner der Welt (0-basiert)
 */
const MUSTER = ['flink', 'panzer', 'normal', 'wuetend', 'panzer', 'flink', 'normal', 'wuetend'];
export function standardArt(index) {
  if (index < 2) return 'normal';
  return MUSTER[(index - 2) % MUSTER.length];
}
