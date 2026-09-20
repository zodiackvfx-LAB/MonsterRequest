/**
 * Schwierigkeitsgrade.
 *
 * Der gewählte Grad (Einstellungen) skaliert im Kampf nur zwei Dinge des
 * Gegners: seine Lebenspunkte und seinen Schaden. Die Belohnungen bleiben
 * gleich - so ist "Leicht" eine echte Hilfe für Einsteiger und "Schwer" eine
 * echte Herausforderung, ohne die Wirtschaft des Spiels zu verschieben.
 *
 * Neuer Grad = hier einen Eintrag ergänzen.
 *
 * Felder:
 *   id       - im Spielstand gespeichert
 *   name     - Anzeigename
 *   icon     - Symbol
 *   hp       - Faktor auf die Lebenspunkte des Gegners
 *   schaden  - Faktor auf den Schaden des Gegners
 */
export const SCHWIERIGKEITEN = [
  { id: 'leicht', name: 'Leicht', icon: '🍀', hp: 0.8, schaden: 0.82 },
  { id: 'normal', name: 'Normal', icon: '⚔️', hp: 1.0, schaden: 1.0 },
  { id: 'schwer', name: 'Schwer', icon: '🔥', hp: 1.3, schaden: 1.2 },
];

/** Der Standardgrad, falls nichts (oder etwas Unbekanntes) gewählt ist. */
export const STANDARD_SCHWIERIGKEIT = 'normal';

/** Holt einen Grad per id - fällt bei Unbekanntem auf Normal zurück. */
export function getSchwierigkeit(id) {
  return (
    SCHWIERIGKEITEN.find((g) => g.id === id) ??
    SCHWIERIGKEITEN.find((g) => g.id === STANDARD_SCHWIERIGKEIT)
  );
}
