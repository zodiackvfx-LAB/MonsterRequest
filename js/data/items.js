import { registerAttack } from './attacks.js';

/**
 * Seltenheiten und Beutestücke (Loot).
 *
 * Alles, was aus einer Truhe kommen kann, steht hier. Ein neues Beutestück
 * hinzufügen heißt: einen Eintrag ergänzen - der Shop, die Truhen und die
 * Sammlung ziehen ihre Daten von hier.
 */

/**
 * Das Münzsymbol.
 *
 * Bewusst kein Emoji: 🪙 sieht je nach Gerät anders aus - auf dem iPhone
 * silbergrau, auf anderen Systemen golden. Weil Münzen die einzige Währung
 * sind und überall in Gold auftauchen, wird die Münze gezeichnet (siehe
 * .muenze in css/ui.css). So sieht sie auf jedem Gerät gleich aus.
 */
export const MUENZE = '<span class="muenze" aria-hidden="true"></span>';

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
  { id: 'orkanhieb', name: 'Orkanhieb', icon: '🌪️', cost: 4, damage: 27, seltenheit: 'selten', text: 'Ein Hieb wie ein Wirbelsturm.' },
  { id: 'bollwerk', name: 'Bollwerk', icon: '🏯', cost: 5, damage: 0, shield: 40, seltenheit: 'episch', text: 'Eine Mauer aus reiner Willenskraft.' },
  { id: 'lebensquell', name: 'Lebensquell', icon: '💚', cost: 5, damage: 0, heal: 40, seltenheit: 'episch', text: 'Frisches Leben strömt zurück.' },
  { id: 'sonnenstrahl', name: 'Sonnenstrahl', icon: '☀️', cost: 7, damage: 46, seltenheit: 'episch', text: 'Gebündeltes Sonnenlicht.' },
  // Status-Attacken: wirken über den Sofortschaden hinaus weiter.
  { id: 'giftstachel', name: 'Giftstachel', icon: '🐍', cost: 3, damage: 8, gift: { tick: 5, male: 4, intervall: 1 }, seltenheit: 'selten', text: 'Ein Stich, der lange nachwirkt: Gift über mehrere Sekunden.' },
  { id: 'frostschock', name: 'Frostschock', icon: '❄️', cost: 4, damage: 14, stun: 1.4, seltenheit: 'episch', text: 'Ein eisiger Schlag - der Gegner erstarrt kurz und kann nicht handeln.' },
  // Die drei Karten aus dem Master-Prompt. Dort hatten sie 7, 14 und 23
  // Schaden - das war auf die alten, kleineren Zahlen ausgelegt. Hier sind
  // sie auf das heutige Balancing umgerechnet und liegen etwas UNTER den
  // gleich teuren Karten. Dafür sind sie eine Seltenheit niedriger: Sie
  // kommen öfter aus Truhen und leveln dadurch schneller hoch.
  { id: 'wirbelhieb', name: 'Wirbelhieb', icon: '🌀', cost: 3, damage: 16, seltenheit: 'gewoehnlich', text: 'Ein Hieb aus der Drehung - schnell und günstig.' },
  { id: 'donnerschlag', name: 'Donnerschlag', icon: '⛈️', cost: 5, damage: 30, seltenheit: 'selten', text: 'Ein Schlag, der wie Donner durch die Arena rollt.' },
  { id: 'sternenknall', name: 'Sternenknall', icon: '✨', cost: 8, damage: 50, seltenheit: 'episch', text: 'Ein Stern platzt direkt vor dem Gegner.' },
];

/**
 * Skins verändern nur das Aussehen einer Figur, nie ihre Werte.
 *
 * Es gibt zwei Wege, je nachdem wie die Figur gezeichnet wird:
 *
 *   look    - für berechnete Pixel-Figuren (siehe js/ui/sprite.js).
 *             Überschreibt Farbton, Sättigung und Akzentfarbe.
 *   filter  - für Figuren mit eigener Grafik wie Timo. Ein fertiges Bild
 *             lässt sich nicht umrechnen, also legen wir einen Farbfilter
 *             darüber (dieselbe Technik wie ein Fotofilter).
 *
 *   ordner  - ein ganzes Outfit mit Kopfbedeckung und neuer Kleidung:
 *             fertige Bilder aller Posen in bilder/timo/skins/<ordner>/.
 *             Erzeugt von werkzeuge/timo-skins-bauen.py - dort stehen
 *             Farben und Hüte. Haut und Haare bleiben, wie sie sind.
 *
 * Beide Felder stehen nebeneinander, damit ein Skin für jede Art von Figur
 * passt.
 */
export const SKINS = [
  {
    id: 'skin-standard', name: 'Standard', monsterId: 'timo',
    seltenheit: 'gewoehnlich', look: {}, filter: null,
  },
  {
    id: 'skin-asche', name: 'Asche', monsterId: 'timo', seltenheit: 'gewoehnlich',
    look: { hue: 220, sattheit: 12, akzentHue: 30 },
    filter: 'grayscale(1) brightness(1.15) contrast(1.05)',
  },
  {
    id: 'skin-frost', name: 'Frost', monsterId: 'timo', seltenheit: 'selten',
    look: { hue: 195, sattheit: 70, akzentHue: 210 },
    filter: 'hue-rotate(175deg) saturate(1.6) brightness(1.08)',
  },
  {
    id: 'skin-gift', name: 'Gift', monsterId: 'timo', seltenheit: 'selten',
    look: { hue: 95, sattheit: 80, akzentHue: 300 },
    filter: 'hue-rotate(90deg) saturate(2) brightness(1.05)',
  },
  {
    id: 'skin-schatten', name: 'Schatten', monsterId: 'timo', seltenheit: 'episch',
    look: { hue: 280, sattheit: 45, akzentHue: 320 },
    filter: 'hue-rotate(255deg) saturate(1.5) brightness(0.72) contrast(1.1)',
  },
  {
    id: 'skin-gold', name: 'Gold', monsterId: 'timo', seltenheit: 'legendaer',
    look: { hue: 45, sattheit: 95, akzentHue: 20 },
    filter: 'sepia(0.9) saturate(2.6) hue-rotate(-12deg) brightness(1.15)',
  },
  {
    id: 'skin-kosmisch', name: 'Kosmisch', monsterId: 'timo', seltenheit: 'legendaer',
    look: { hue: 255, sattheit: 85, akzentHue: 180 },
    filter: 'hue-rotate(250deg) saturate(2.2) contrast(1.12)',
  },
  {
    id: 'skin-natur', name: 'Natur', monsterId: 'timo', seltenheit: 'gewoehnlich',
    look: { hue: 100, sattheit: 70, akzentHue: 135 },
    filter: 'hue-rotate(70deg) saturate(1.4) brightness(1.06)',
  },
  {
    id: 'skin-sturm', name: 'Sturm', monsterId: 'timo', seltenheit: 'selten',
    look: { hue: 210, sattheit: 82, akzentHue: 190 },
    filter: 'hue-rotate(200deg) saturate(1.7) brightness(1.12)',
  },
  {
    id: 'skin-glut', name: 'Glut', monsterId: 'timo', seltenheit: 'episch',
    look: { hue: 15, sattheit: 95, akzentHue: 40 },
    filter: 'saturate(2.3) brightness(1.08) contrast(1.12) hue-rotate(-10deg)',
  },

  /* ---------- Outfits: neue Kleidung und eine Kopfbedeckung ---------- */
  {
    id: 'skin-sportler', name: 'Sportler', monsterId: 'timo', seltenheit: 'gewoehnlich',
    look: { hue: 215, sattheit: 10, akzentHue: 215 }, filter: null, ordner: 'sportler',
    text: 'Weißer Trainingsanzug und Schweißband.',
  },
  {
    id: 'skin-winter', name: 'Winter', monsterId: 'timo', seltenheit: 'selten',
    look: { hue: 205, sattheit: 45, akzentHue: 355 }, filter: null, ordner: 'winter',
    text: 'Blaue Winterjacke und rote Bommelmütze.',
  },
  {
    id: 'skin-cowboy', name: 'Cowboy', monsterId: 'timo', seltenheit: 'selten',
    look: { hue: 28, sattheit: 45, akzentHue: 20 }, filter: null, ordner: 'cowboy',
    text: 'Lederjacke und Cowboyhut.',
  },
  {
    id: 'skin-ninja', name: 'Ninja', monsterId: 'timo', seltenheit: 'episch',
    look: { hue: 225, sattheit: 30, akzentHue: 355 }, filter: null, ordner: 'ninja',
    text: 'Nachtschwarzer Anzug und rotes Stirnband.',
  },
  {
    id: 'skin-wikinger', name: 'Wikinger', monsterId: 'timo', seltenheit: 'episch',
    look: { hue: 110, sattheit: 28, akzentHue: 210 }, filter: null, ordner: 'wikinger',
    text: 'Waldgrüne Kluft und Hörnerhelm.',
  },
  {
    id: 'skin-zauberer', name: 'Zauberer', monsterId: 'timo', seltenheit: 'episch',
    look: { hue: 268, sattheit: 45, akzentHue: 50 }, filter: null, ordner: 'zauberer',
    text: 'Violette Robe und Sternen-Zauberhut.',
  },
  {
    id: 'skin-koenig', name: 'König', monsterId: 'timo', seltenheit: 'legendaer',
    look: { hue: 350, sattheit: 55, akzentHue: 45 }, filter: null, ordner: 'koenig',
    text: 'Königsrot und eine goldene Krone.',
  },
];

/**
 * Münzen in einer Truhe: Jede Truhe enthält GENAU EIN Münzstück, mit
 * mindestens 150 und höchstens 500 Münzen - egal welche Truhe. Die übrigen
 * Plätze sind Material, Attacken oder Skins.
 */
export const TRUHEN_MUENZEN = { min: 150, max: 500 };

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
