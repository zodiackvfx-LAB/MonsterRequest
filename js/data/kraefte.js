/**
 * Boss-Kräfte.
 *
 * Jede Welt hat einen Boss. Besiegst du ihn zum ersten Mal, schaltest du
 * seine besondere Fähigkeit frei - die "Boss-Kraft".
 *
 * SO FUNKTIONIERT ES IM KAMPF
 * Du trägst genau EINE Boss-Kraft. Während des Kampfes füllt sich eine
 * Kraft-Leiste: für jede gespielte Karte und für jeden eingesteckten Treffer.
 * Ist sie voll, leuchtet der Kraft-Knopf - ein Tipp löst die Fähigkeit aus.
 * Danach lädt sie sich neu auf.
 *
 * WARUM NUR EINE
 * So bleibt die Wahl spannend: Man baut sein Deck um seine Kraft herum.
 * Und der Kampf bleibt fair - man kann nicht fünf Ultimative auf einmal
 * abfeuern.
 *
 * EINE NEUE KRAFT HINZUFÜGEN
 * Einen Eintrag ergänzen (welt = Weltnummer). Die "art" bestimmt, was im
 * Kampf passiert - die Fälle stehen in js/core/battle.js unter useBossPower.
 *
 * Felder:
 *   id    - eindeutiger Name (auch im Spielstand gespeichert)
 *   welt  - zu welcher Welt / welchem Boss die Kraft gehört
 *   boss  - Name des Bosses (nur für die Anzeige "Besiege ...")
 *   icon  - Symbol
 *   name  - Anzeigename der Kraft
 *   text  - was sie tut, in einem Satz
 *   art   - die Wirkung (siehe battle.js): 'schild' | 'schildbruch' |
 *           'brand' | 'frost' | 'lebensraub' | 'energiesturm'
 *   wert  - die Zahl(en) zur Wirkung
 *   gegnerLadung - wie viele Ladepunkte der BOSS sammeln muss, bis er die
 *           Kraft im Kampf einsetzt (fehlt = Standard 24). Niedrig = kommt
 *           oft, hoch = seltener. So kommen milde Kräfte früh und harte
 *           (Frost, Inferno) seltener. Der Spieler löst seine getragene
 *           Kraft weiterhin selbst per Knopf aus - diese Zahl gilt nur
 *           für den Boss.
 */
export const BOSS_KRAEFTE = [
  {
    id: 'rindenpanzer',
    welt: 1,
    boss: 'Borkenwächter',
    icon: '🛡️',
    name: 'Rindenpanzer',
    text: 'Stellt sofort ein Schild in Höhe von 45 % deiner Lebenspunkte auf.',
    art: 'schild',
    wert: 0.45, // Anteil der maximalen Lebenspunkte
    gegnerLadung: 20, // erster Boss, mildes Schild - darf ruhig oft kommen
  },
  {
    id: 'prismabrecher',
    welt: 2,
    boss: 'Kristallgolem',
    icon: '💠',
    name: 'Prismabrecher',
    text: 'Zerschlägt das Schild des Gegners und trifft ihn hart.',
    art: 'schildbruch',
    wert: 55, // Grundschaden (wächst mit deinem Angriff)
    gegnerLadung: 24,
  },
  {
    id: 'inferno',
    welt: 3,
    boss: 'Schlackenfürst',
    icon: '🔥',
    name: 'Inferno',
    text: 'Schaden sofort - danach brennt der Gegner mehrere Sekunden weiter.',
    art: 'brand',
    wert: { sofort: 28, tick: 9, male: 4 }, // 28 sofort, dann 4× 9 im Abstand
    gegnerLadung: 28, // starker Dauerbrand - kommt seltener
  },
  {
    id: 'frostbann',
    welt: 4,
    boss: 'Frostherrscher',
    icon: '❄️',
    name: 'Frostbann',
    text: 'Friert den Gegner ein - er kann einige Sekunden nicht angreifen.',
    art: 'frost',
    wert: 3.5, // Sekunden
    gegnerLadung: 32, // sperrt den Spieler komplett aus - bewusst am seltensten
  },
  {
    id: 'seelenraub',
    welt: 5,
    boss: 'Schattenmagier',
    icon: '🌙',
    name: 'Seelenraub',
    text: 'Trifft den Gegner - und heilt dich um denselben Betrag.',
    art: 'lebensraub',
    wert: 38, // Grundschaden (= Heilung)
    gegnerLadung: 26,
  },
  {
    id: 'sandsturm',
    welt: 6,
    boss: 'Dünenkönig',
    icon: '🌪️',
    name: 'Sandsturm',
    text: 'Füllt deine Energie sofort voll auf und trifft den Gegner.',
    art: 'energiesturm',
    wert: 22, // Grundschaden
    gegnerLadung: 24,
  },
];

/** Die Kraft mit dieser id (oder undefined). */
export function getKraft(id) {
  return BOSS_KRAEFTE.find((k) => k.id === id);
}

/** Die Kraft, die es für den Sieg über die Welt mit dieser Nummer gibt. */
export function kraftFuerWelt(worldId) {
  return BOSS_KRAEFTE.find((k) => k.welt === Number(worldId));
}
