/**
 * Namensfilter: Spielernamen sieht jeder - in der Rangliste, bei Freunden,
 * in Einladungen und im 2v2. Schimpfwörter und Beleidigungen haben dort
 * nichts zu suchen.
 *
 * Geprüft wird an zwei Stellen mit denselben Listen:
 *   - hier im Spiel: beim Eingeben des eigenen Namens und beim Anzeigen
 *     des 2v2-Partners (dessen Name kommt direkt von seinem Gerät)
 *   - in der Datenbank (mq_name_sauber in datenbank/schema.sql): für
 *     Rangliste, Freunde und Einladungen - so hilft es auch, wenn jemand
 *     die Eingabe umgeht
 * tests/regeln.test.mjs prüft, dass beide Listen gleich sind.
 *
 * Tricks wie "F1ck", "Fuuuck" oder "F-i-c-k" werden erkannt: Erst wird
 * vereinfacht (klein, Ziffern zu Buchstaben, Umlaute weg, doppelte
 * Buchstaben zu einem), dann gesucht.
 *
 * Neue Wörter: in BEIDE Listen eintragen - und zwar in der vereinfachten
 * Form (z. B. "nute" für "Nutte", siehe vereinfachen()).
 */

/** Steckt eines davon irgendwo im Namen, ist er nicht erlaubt. */
export const VERBOTEN_TEILE = [
  'fick', 'fuck', 'fotze', 'wichs', 'huren', 'arschloch', 'schlampe', 'misgeburt',
  'spast', 'behindert', 'nazi', 'hitler', 'niga', 'niger', 'neger', 'schwuchtel',
  'kanake', 'penis', 'vagina', 'porno', 'titen', 'pimel', 'scheis', 'kacke',
  'bitch', 'shit', 'sex', 'cunt', 'whore', 'slut', 'retard',
];

/**
 * Diese nur als ganzes Wort - sie stecken sonst in harmlosen Namen
 * ("Barsch", "Minute", "Peacock").
 */
export const VERBOTEN_WOERTER = ['arsch', 'hure', 'nute', 'opfer', 'idiot', 'dep', 'trotel', 'cock', 'fag', 'kys', 'loser'];

/** Ersatz, wenn ein Name nicht erlaubt ist. */
export const ERSATZ_NAME = 'Spieler';

// Großbuchstaben mit Umlaut stehen mit drin: Manche Datenbanken machen
// sie bei lower() nicht klein.
const ZEICHEN_VON = 'äöüßÄÖÜ0134578@$!';
const ZEICHEN_ZU = 'aousaouoieastbasi';

/**
 * Vereinfacht einen Namen in Wörter: klein, Ziffern und Zeichen zu
 * Buchstaben, alles andere trennt, doppelte Buchstaben zu einem.
 * @returns {string[]}
 */
export function vereinfachen(name) {
  const klein = [...String(name ?? '').toLowerCase()]
    .map((z) => {
      const i = ZEICHEN_VON.indexOf(z);
      return i >= 0 ? ZEICHEN_ZU[i] : z;
    })
    .join('');
  return klein
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((wort) => wort.replace(/(.)\1+/g, '$1'));
}

/**
 * Was durchsucht wird: jedes Wort einzeln - und zusammengesetzt, wenn
 * jemand ein Wort in lauter Einzelbuchstaben zerlegt hat ("F-i-c-k").
 * Längere Wörter werden NICHT zusammengesetzt: "Lukas Exner" soll nicht
 * zu "lukasexner" werden.
 */
function kandidaten(woerter) {
  const zerlegt = woerter
    .map((w) => (w.length <= 2 ? w : ' '))
    .join('')
    .split(' ')
    .filter((teil) => teil.length > 2);
  return [...woerter, ...zerlegt];
}

/** Darf dieser Name anderen gezeigt werden? */
export function nameErlaubt(name) {
  const liste = kandidaten(vereinfachen(name));
  return !liste.some((w) => VERBOTEN_WOERTER.includes(w) || VERBOTEN_TEILE.some((teil) => w.includes(teil)));
}

/** Der Name - oder "Spieler", wenn er nicht erlaubt ist. */
export function nameFiltern(name, ersatz = ERSATZ_NAME) {
  return nameErlaubt(name) ? name : ersatz;
}
