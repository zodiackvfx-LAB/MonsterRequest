/**
 * Ein Zufall, der sich wiederholen lässt.
 *
 * Math.random liefert bei jedem Aufruf etwas anderes - für einen Kampf, den
 * ein Test nachspielen oder ein zweites Gerät nachvollziehen soll, braucht
 * es dagegen einen Zufall aus einem Startwert ("seed"): derselbe Startwert
 * ergibt immer dieselbe Zahlenfolge.
 *
 * Verfahren: mulberry32 - klein, schnell und für ein Spiel gut genug.
 */

/** Macht aus einem beliebigen Text eine 32-Bit-Zahl (FNV-1a). */
export function zahlAusText(text) {
  let wert = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    wert ^= s.charCodeAt(i);
    wert = Math.imul(wert, 16777619);
  }
  return wert >>> 0;
}

/**
 * Erzeugt eine Zufallsquelle wie Math.random (Werte von 0 bis unter 1).
 * @param {number|string} startwert
 */
export function erzeugeZufall(startwert) {
  let a = typeof startwert === 'number' ? startwert >>> 0 : zahlAusText(startwert);
  return function zufall() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Eine zufällige Kennung aus Buchstaben und Ziffern. */
export function zufallsKennung(laenge = 12, zufall = Math.random) {
  const zeichen = 'abcdefghijkmnpqrstuvwxyz23456789';
  let text = '';
  for (let i = 0; i < laenge; i++) text += zeichen[Math.floor(zufall() * zeichen.length)];
  return text;
}
