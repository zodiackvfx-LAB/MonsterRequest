import { registerAttack } from './attacks.js';

/**
 * Seltenheiten und Beutestücke (Loot).
 *
 * Alles, was aus einer Truhe kommen kann, steht hier. Ein neues Beutestück
 * hinzufügen heißt: einen Eintrag ergänzen - der Shop, die Truhen und die
 * Sammlung ziehen ihre Daten von hier.
 */

/** Die vier Seltenheiten. Die Farbe wird in der Anzeige verwendet. */
export const SELTENHEITEN = {
  gewoehnlich: { id: 'gewoehnlich', name: 'Gewöhnlich', farbe: '#9aa8d4', rang: 0 },
  selten: { id: 'selten', name: 'Selten', farbe: '#49c7ff', rang: 1 },
  episch: { id: 'episch', name: 'Episch', farbe: '#c07bff', rang: 2 },
  legendaer: { id: 'legendaer', name: 'Legendär', farbe: '#ffb32b', rang: 3 },
};

/**
 * Attacken, die es nur aus Truhen gibt. Die acht Startattacken stehen in
 * js/data/attacks.js und sind von Anfang an im Deck.
 */
export const BEUTE_ATTACKEN = [
  { id: 'steinschlag', name: 'Steinschlag', icon: '🪨', cost: 2, damage: 13, seltenheit: 'gewoehnlich', text: 'Ein Brocken von oben.' },
  { id: 'windklinge', name: 'Windklinge', icon: '🌬️', cost: 2, damage: 12, seltenheit: 'gewoehnlich', text: 'Schneidender Luftstoß.' },
  { id: 'blitzschlag', name: 'Blitzschlag', icon: '⚡', cost: 3, damage: 19, seltenheit: 'selten', text: 'Fährt aus heiterem Himmel herab.' },
  { id: 'eislanze', name: 'Eislanze', icon: '🧊', cost: 3, damage: 18, seltenheit: 'selten', text: 'Ein Speer aus blankem Eis.' },
  { id: 'heiltrank', name: 'Heiltrank', icon: '🧪', cost: 3, damage: 0, heal: 22, seltenheit: 'selten', text: 'Ein kräftiger Schluck.' },
  { id: 'steinhaut', name: 'Steinhaut', icon: '🛡️', cost: 3, damage: 0, shield: 21, seltenheit: 'selten', text: 'Die Haut wird hart wie Fels.' },
  { id: 'sternenregen', name: 'Sternenregen', icon: '🌠', cost: 5, damage: 32, seltenheit: 'episch', text: 'Ein Hagel aus Sternen.' },
  { id: 'donnerwelle', name: 'Donnerwelle', icon: '🌩️', cost: 6, damage: 39, seltenheit: 'episch', text: 'Der Boden bebt.' },
  { id: 'urknall', name: 'Urknall', icon: '💫', cost: 8, damage: 56, seltenheit: 'legendaer', text: 'Alles auf einmal.' },
  { id: 'drachenzorn', name: 'Drachenzorn', icon: '🐲', cost: 9, damage: 64, seltenheit: 'legendaer', text: 'Der Zorn eines Drachen.' },
];

/**
 * Skins verändern nur das Aussehen eines Monsters, nicht seine Werte.
 * "look" überschreibt die Farbwerte der Pixel-Figur (siehe js/ui/sprite.js).
 */
export const SKINS = [
  { id: 'skin-standard', name: 'Standard', monsterId: 'glutwelpe', seltenheit: 'gewoehnlich', look: {} },
  { id: 'skin-asche', name: 'Asche', monsterId: 'glutwelpe', seltenheit: 'gewoehnlich', look: { hue: 220, sattheit: 12, akzentHue: 30 } },
  { id: 'skin-frost', name: 'Frost', monsterId: 'glutwelpe', seltenheit: 'selten', look: { hue: 195, sattheit: 70, akzentHue: 210 } },
  { id: 'skin-gift', name: 'Gift', monsterId: 'glutwelpe', seltenheit: 'selten', look: { hue: 95, sattheit: 80, akzentHue: 300 } },
  { id: 'skin-schatten', name: 'Schatten', monsterId: 'glutwelpe', seltenheit: 'episch', look: { hue: 280, sattheit: 45, akzentHue: 320 } },
  { id: 'skin-gold', name: 'Gold', monsterId: 'glutwelpe', seltenheit: 'legendaer', look: { hue: 45, sattheit: 95, akzentHue: 20 } },
  { id: 'skin-kosmisch', name: 'Kosmisch', monsterId: 'glutwelpe', seltenheit: 'legendaer', look: { hue: 255, sattheit: 85, akzentHue: 180 } },
];

/** Münzbeträge je Seltenheit. */
export const MUENZ_BEUTE = {
  gewoehnlich: [60, 120],
  selten: [180, 320],
  episch: [450, 700],
  legendaer: [1200, 2000],
};

/** Aufwertungs-Material je Seltenheit (für Attacken- und Charakter-Upgrades). */
export const MATERIAL_BEUTE = {
  gewoehnlich: [1, 2],
  selten: [3, 5],
  episch: [8, 12],
  legendaer: [20, 30],
};

// Die Beute-Attacken werden in denselben Katalog eingetragen wie die
// Startattacken. Für die Kampf-Engine sind sie danach ganz normale Karten.
BEUTE_ATTACKEN.forEach((attacke) => registerAttack(attacke));

export function getSkin(id) {
  return SKINS.find((skin) => skin.id === id);
}

export function getBeuteAttacke(id) {
  return BEUTE_ATTACKEN.find((attacke) => attacke.id === id);
}
