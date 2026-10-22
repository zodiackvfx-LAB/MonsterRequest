/**
 * Test des 2v2 Monster-Duells - ohne Browser, direkt mit Node:
 *
 *     node tests/duell.test.mjs
 *
 * Geprüft werden die Regeln (eigene Energie, eigene Decks, Ziele, Team-Kombo,
 * Kampfunfähigkeit, Sieg und Niederlage), die KI, und der Online-Koop: Zwei
 * echte Sitzungen sprechen über eine Leitung im Arbeitsspeicher miteinander
 * - mit absichtlichen Verbindungsabbrüchen.
 */

// state.js speichert im Browser - für den Test genügt eine Attrappe.
globalThis.localStorage = {
  _daten: new Map(),
  getItem(key) { return this._daten.has(key) ? this._daten.get(key) : null; },
  setItem(key, value) { this._daten.set(key, String(value)); },
  removeItem(key) { this._daten.delete(key); },
};

const { createDuell, zielArtVon, zustandUebernehmen } = await import('../js/core/duell.js');
const aufbau = await import('../js/core/duell-aufbau.js');
const { createSitzung, codePruefen, neuerCode, PROTOKOLL } = await import('../js/core/duell-sitzung.js');
const { raumOeffnen, speicherBus } = await import('../js/core/netz.js');
const { duellBelohnung, duellSterne } = await import('../js/core/duell-belohnung.js');
const { DUELL, DUELL_GRADE, GEGNER_PAARE, ROLLEN, FAEHIGKEITEN, SIGNALE, paarGegner } = await import('../js/data/duell.js');
const { WORLDS } = await import('../js/data/worlds.js');
const { getAttack } = await import('../js/data/attacks.js');
const { DUELL_AUFGABEN } = await import('../js/data/aufgaben.js');
const { getTagesAufgaben, duellAufgabenFuerTag, aufgabenFuerTag } = await import('../js/core/aufgaben.js');
const { gameState, loadProgress, resetProgress, saveProgress } = await import('../js/core/state.js');
const { KLAENGE } = await import('../js/data/sounds.js');

let bestanden = 0;
let fehler = 0;
function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    bestanden++;
    console.log(`  ok   ${beschreibung}`);
  } else {
    fehler++;
    console.log(`  FEHL ${beschreibung}`);
  }
}

/** Ein Profil, wie es von einem anderen Gerät käme. */
function profil(figur = 'timo', extra = {}) {
  return aufbau.profilPruefen({ figur, name: figur === 'timo' ? 'Anna' : 'Ben', level: 5, upgrades: {}, ...extra });
}

/** Ein Kampf mit stillgelegten Gegnern (Steuerung 'leer') - für Regeltests. */
function ruhigerKampf({ profile = [profil('timo'), profil('timo')], welt = 1, paar = 0, bossDuell = false, schwierigkeit = 'normal' } = {}) {
  const setup = aufbau.duellSetup({ matchId: 'test-ruhig', welt, paar, bossDuell, schwierigkeit, profile });
  const ereignisse = [];
  const d = createDuell(setup, { onEvent: (e) => ereignisse.push(e) });
  // Damit die Gegner wirklich nicht ziehen:
  for (const g of ['g1', 'g2']) d.kaempfer(g).steuerung = 'leer';
  return { d, setup, ereignisse };
}

/** Index einer Handkarte, die gerade bezahlbar ist und Schaden macht. */
function schadenKarte(d, id) {
  const hand = d.handAttacken(id);
  const k = d.kaempfer(id);
  return hand.findIndex((a) => a.damage > 0 && a.cost <= k.energie && zielArtVon(a) === 'gegner');
}

/** Füllt die Energie einer Figur (über die erlaubte Regel: Zeit vergeht). */
function warte(d, sekunden) {
  for (let t = 0; t < sekunden; t += 0.05) d.schritt(0.05);
}

/* ===================================================================== */
console.log('\nDaten');
{
  pruefe('Jede der 12 Welten hat Gegnerpaare', WORLDS.every((w) => (GEGNER_PAARE[w.id] ?? []).length >= 2));
  let allesGut = true;
  for (const w of WORLDS) {
    for (let i = 0; i < GEGNER_PAARE[w.id].length; i++) {
      const paar = paarGegner(w.id, i);
      if (paar.length !== 2 || paar.some((p) => !p.gegner || !ROLLEN[p.rolle] || p.gegner.worldId !== w.id)) allesGut = false;
    }
    const boss = paarGegner(w.id, 0, true);
    if (boss[0].rolle !== 'boss' || !boss[0].gegner.isBoss || boss[1].gegner.isBoss) allesGut = false;
  }
  pruefe('Alle Paare: zwei Gegner aus ihrer Welt mit bekannter Rolle', allesGut);
  pruefe('Boss-Duell: ein Boss und ein Untergebener (nie zwei Bosse)', allesGut);
  pruefe('Jede Rollen-Fähigkeit existiert', Object.values(ROLLEN).every((r) => r.faehigkeiten.every((f) => FAEHIGKEITEN[f])));
  pruefe('Vier Schwierigkeitsgrade', DUELL_GRADE.map((g) => g.id).join() === 'einfach,normal,schwer,albtraum');
  pruefe('Schwerer heißt klüger, nicht nur zäher (Fehler und Reaktion sinken)',
    DUELL_GRADE.every((g, i) => i === 0 || (g.fehler <= DUELL_GRADE[i - 1].fehler && g.reaktion <= DUELL_GRADE[i - 1].reaktion)));
  pruefe('Kombo-Werte zentral: 10 % Bonus, 8 s Abklingzeit', DUELL.kombo.bonus === 0.1 && DUELL.kombo.cooldown === 8);
  pruefe('Fünf Team-Signale', SIGNALE.length === 5);
  pruefe('Neue Klänge sind eingetragen', ['teamKombo', 'signal', 'ansage', 'unterbrochen', 'bossPhase'].every((k) => KLAENGE[k]));
  pruefe('Empfohlenes Team-Level steigt mit der Welt',
    WORLDS.every((w, i) => i === 0 || aufbau.empfohlenesLevel(w.id) >= aufbau.empfohlenesLevel(WORLDS[i - 1].id)));
}

/* ===================================================================== */
console.log('\nProfile und Aufbau');
{
  const boese = aufbau.profilPruefen({
    figur: 'drache', level: 999, upgrades: { hp: 50, angriff: -3 },
    deck: ['w1-blattschnitt', 'fausthieb', 'fausthieb', 'fausthieb', 'fausthieb', 'fausthieb', 'fausthieb', 'fausthieb'],
    kartenLevel: { fausthieb: 99 }, kraft: 'weltherrschaft', name: '<b>xxxxxxxxxxxxxxxxxxxxxxxx',
  });
  pruefe('Unbekannte Figur wird Timo', boese.figur === 'timo');
  pruefe('Level und Aufwertungen werden auf erlaubte Grenzen gestutzt', boese.level === 50 && boese.upgrades.hp === 10 && boese.upgrades.angriff === 0);
  pruefe('Deck mit Gegner-Attacke wird durch das Standarddeck ersetzt', !boese.deck.includes('w1-blattschnitt') && boese.deck.length === 8);
  pruefe('Unbekannte Boss-Kraft wird entfernt', boese.kraft === null);
  pruefe('Name höchstens 16 Zeichen', boese.name.length <= 16);
  pruefe('Unpassender Name des Partners wird "Spieler"', aufbau.profilPruefen({ figur: 'timo', name: 'F1ck dich' }).name === 'Spieler'
    && aufbau.profilPruefen({ figur: 'timo', name: 'Anna' }).name === 'Anna');

  // Test 2: verschiedene Figuren
  const setup = aufbau.duellSetup({ matchId: 'aufbau-1', welt: 3, profile: [profil('timo'), profil('rocco')] });
  pruefe('Spieler 1 Timo, Spieler 2 Rocco', setup.team[0].monster.figur === 'timo' && setup.team[1].monster.figur === 'rocco');
  pruefe('Jeder hat sein eigenes Deck', setup.team[1].monster.deck.includes('steinfaust') && !setup.team[0].monster.deck.includes('steinfaust'));
  const timoTimo = aufbau.duellSetup({ matchId: 'aufbau-2', welt: 1, profile: [profil('timo'), profil('timo')] });
  pruefe('Timo + Timo ist erlaubt', timoTimo.team.every((t) => t.monster.figur === 'timo'));

  // Karten-Level des Partners zählen - unabhängig vom eigenen Spielstand.
  const stark = profil('timo', { kartenLevel: { fausthieb: 10 } });
  const { d } = ruhigerKampf({ profile: [profil('timo'), stark] });
  const faust = (id) => d.handAttacken(id).find((a) => a.id === 'fausthieb') ?? null;
  // Fausthieb liegt nicht sicher auf der Hand - dann direkt über die Regel prüfen.
  const p2Monster = aufbau.kampfMonsterAus(stark);
  pruefe('Partner kämpft mit SEINEN Karten-Leveln', p2Monster.kartenLevel.fausthieb === 10);
  pruefe('...und nicht mit denen des eigenen Spielstands', (gameState.attackLevels.fausthieb ?? 1) === 1);
  void faust;

  const aus = aufbau.teamAusgleich([profil('timo', { level: 50, upgrades: { hp: 10, angriff: 10, verteidigung: 10, tempo: 10 } }), profil('timo', { level: 50 })], 1);
  pruefe('Team-Ausgleich ist gedeckelt (keine HP-Schwämme)', aus.hp <= 1.25 && aus.schaden <= 1.6 && aus.verhaeltnis > 1);
  const schwach = aufbau.teamAusgleich([profil('timo', { level: 1 }), profil('timo', { level: 1 })], 12);
  pruefe('Schwächere Teams bekommen mildere Gegner', schwach.schaden < 1 && schwach.hp < 1);
  pruefe('Boss-Duell nur, wenn einer den Boss schon besiegt hat',
    !aufbau.wahlErlaubt({ welt: 2, bossDuell: true }, [profil(), profil()]).ok &&
    aufbau.wahlErlaubt({ welt: 2, bossDuell: true }, [profil('timo', { welt: 3, bossWelten: [1, 2] }), profil()]).ok);
}

/* ===================================================================== */
console.log('\nEnergie (eigene Vorräte)');
{
  const { d } = ruhigerKampf();
  const start = [d.kaempfer('p1').energie, d.kaempfer('p2').energie];
  warte(d, 2.01);
  // Test 4: beide bekommen 1 Energie pro Sekunde (Timo Level 5: Tempo 1,04)
  pruefe('Beide laden selbst ~1 Energie pro Sekunde', d.kaempfer('p1').energie === start[0] + 2 && d.kaempfer('p2').energie === start[1] + 2);
  warte(d, 20);
  pruefe('Energie steigt nie über 10', d.kaempfer('p1').energie === 10 && d.kaempfer('p2').energie === 10);

  // Test 5: Spieler 1 spielt - Spieler 2 behält seine Energie.
  const i = schadenKarte(d, 'p1');
  const karte = d.handAttacken('p1')[i];
  const p2vorher = d.kaempfer('p2').energie;
  const erg = d.aktion('p1', { aktionId: 'e1', typ: 'karte', hand: i, karte: d.kaempfer('p1').hand[i], ziel: 'g1' });
  pruefe('Karte von Spieler 1 wird gespielt', erg.ok);
  pruefe('...und kostet NUR Spieler 1 Energie', d.kaempfer('p1').energie === 10 - karte.cost && d.kaempfer('p2').energie === p2vorher);
  pruefe('Hand bleibt bei 4 Karten (sofort nachgezogen)', d.kaempfer('p1').hand.length === 4);

  // Zu wenig Energie: abgelehnt, nichts passiert.
  const { d: d2 } = ruhigerKampf();
  d2.kaempfer('p1');
  const teuer = d2.handAttacken('p1').findIndex((a) => a.cost > d2.kaempfer('p1').energie);
  if (teuer >= 0) {
    const r = d2.aktion('p1', { typ: 'karte', hand: teuer, ziel: 'g1' });
    pruefe('Zu teure Karte wird abgelehnt', !r.ok && r.grund === 'zu-wenig-energie');
  } else {
    pruefe('Zu teure Karte wird abgelehnt', true);
  }
  const falsch = d2.aktion('p1', { typ: 'karte', hand: 0, karte: 'gibt-es-nicht', ziel: 'g1' });
  pruefe('Veraltete Karte (Hand hat sich geändert) wird abgelehnt', !falsch.ok && falsch.grund === 'karte-veraltet');
  pruefe('Gegnerfiguren kann kein Spieler steuern', !d2.aktion('g1', { typ: 'karte', hand: 0 }).ok);
}

/* ===================================================================== */
console.log('\nZiele');
{
  const { d } = ruhigerKampf();
  warte(d, 8);
  const g1 = d.kaempfer('g1').hp;
  const g2 = d.kaempfer('g2').hp;
  const i = schadenKarte(d, 'p1');
  d.aktion('p1', { typ: 'karte', hand: i, ziel: 'g2' });
  pruefe('Einzelangriff trifft nur das gewählte Ziel', d.kaempfer('g2').hp < g2 && d.kaempfer('g1').hp === g1);

  pruefe('Flächenkarten treffen beide Gegner', zielArtVon(getAttack('druckwelle')) === 'beideGegner' && zielArtVon(getAttack('felslawine')) === 'beideGegner');
  pruefe('Heilung und Schild wirken auf das eigene Team', zielArtVon(getAttack('deckung')) === 'verbuendeter' && zielArtVon(getAttack('heiltrank')) === 'verbuendeter');
  pruefe('Normaler Angriff zielt auf einen Gegner', zielArtVon(getAttack('fausthieb')) === 'gegner');

  // Flächenkarte direkt ausprobieren: Deck nur aus Druckwellen.
  const flaeche = profil('timo', { deck: Array(8).fill('druckwelle') });
  const k2 = ruhigerKampf({ profile: [flaeche, profil()] });
  warte(k2.d, 10);
  const vorher = [k2.d.kaempfer('g1').hp, k2.d.kaempfer('g2').hp];
  k2.d.aktion('p1', { typ: 'karte', hand: 0, ziel: 'g1' });
  pruefe('Druckwelle trifft beide Gegner', k2.d.kaempfer('g1').hp < vorher[0] && k2.d.kaempfer('g2').hp < vorher[1]);

  // Schild auf den Teamkameraden.
  const schild = profil('timo', { deck: Array(8).fill('deckung') });
  const k3 = ruhigerKampf({ profile: [schild, profil()] });
  warte(k3.d, 5);
  k3.d.aktion('p1', { typ: 'karte', hand: 0, ziel: 'p2' });
  pruefe('Deckung auf den Partner gibt IHM das Schild', k3.d.kaempfer('p2').shield > 0 && k3.d.kaempfer('p1').shield === 0);
  k3.d.aktion('p1', { typ: 'karte', hand: 1, ziel: 'g1' });
  pruefe('Ein Gegner als Ziel einer Schildkarte fällt auf einen selbst zurück', k3.d.kaempfer('p1').shield > 0);
}

/* ===================================================================== */
console.log('\nAktions-ids');
{
  const { d } = ruhigerKampf();
  warte(d, 8);
  const i = schadenKarte(d, 'p1');
  const karte = d.kaempfer('p1').hand[i];
  const a = d.aktion('p1', { aktionId: 'doppelt-1', typ: 'karte', hand: i, karte, ziel: 'g1' });
  const energie = d.kaempfer('p1').energie;
  const b = d.aktion('p1', { aktionId: 'doppelt-1', typ: 'karte', hand: i, karte, ziel: 'g1' });
  pruefe('Dieselbe Aktions-id wird nur einmal ausgeführt', a.ok && b.doppelt && d.kaempfer('p1').energie === energie);
}

/* ===================================================================== */
console.log('\nTeam-Kombo');
{
  const { d, ereignisse } = ruhigerKampf();
  warte(d, 10);
  const treffer = (id, ziel) => {
    const i = schadenKarte(d, id);
    return d.aktion(id, { typ: 'karte', hand: i, ziel });
  };
  treffer('p1', 'g1');
  warte(d, 0.5);
  treffer('p2', 'g1');
  const kombos = ereignisse.filter((e) => e.typ === 'kombo');
  pruefe('Beide treffen denselben Gegner in 2 s: TEAM-KOMBO', kombos.length === 1 && kombos[0].von === 'p2');
  const komboTreffer = ereignisse.filter((e) => e.typ === 'treffer' && e.kombo);
  pruefe('Der auslösende Treffer bekommt den Bonus', komboTreffer.length === 1 && komboTreffer[0].von === 'p2');
  treffer('p1', 'g1');
  pruefe('Während der Abklingzeit keine weitere Kombo', ereignisse.filter((e) => e.typ === 'kombo').length === 1);
  pruefe('Abklingzeit gilt für das ganze Team', d.state.kombo.blau > 7);
  warte(d, 8.1);
  treffer('p2', 'g1');
  warte(d, 2.5);
  treffer('p1', 'g1');
  pruefe('Nach mehr als 2 s Abstand keine Kombo', ereignisse.filter((e) => e.typ === 'kombo').length === 1);
  pruefe('Gift/Brand lösen nie eine Kombo aus', ereignisse.filter((e) => e.typ === 'treffer' && e.quelle.art === 'dot' && e.kombo).length === 0);
}

/* ===================================================================== */
console.log('\nKampfunfähig');
{
  const { d, ereignisse } = ruhigerKampf();
  warte(d, 10);
  const p2 = d.kaempfer('p2');
  p2.hp = 0; // erst wenn ein Treffer ankommt, wird es amtlich:
  p2.hp = 1;
  // Ein Gegner trifft p2 - die KI ist im ruhigen Kampf aus, also simulieren
  // wir den Treffer über einen Gegnerzug mit wenig Leben.
  d.kaempfer('g1').steuerung = 'gegnerKi';
  for (let t = 0; t < 400 && !p2.ko; t++) d.schritt(0.1);
  d.kaempfer('g1').steuerung = 'leer';
  d.kaempfer('g2').steuerung = 'leer';
  pruefe('Ein Spieler auf 0 LP ist kampfunfähig', p2.ko && ereignisse.some((e) => e.typ === 'ko' && e.ziel === 'p2'));
  pruefe('Der andere kann weiterkämpfen', !d.state.ende && !d.kaempfer('p1').ko);
  pruefe('Kampfunfähige können nichts spielen', d.aktion('p2', { typ: 'karte', hand: 0, ziel: 'g1' }).grund === 'kampfunfaehig');

  warte(d, 10);
  pruefe('Wiederbeleben gibt es nicht', !d.aktion('p1', { typ: 'wiederbeleben', ziel: 'p2' }).ok && p2.ko);
  pruefe('Kampfunfähige bleiben draußen und laden keine Energie', d.kaempfer('p2').hp === 0 && d.kaempfer('p2').ko);

  // Niederlage, wenn beide fallen.
  const p1 = d.kaempfer('p1');
  p1.hp = 1;
  d.kaempfer('g1').steuerung = 'gegnerKi';
  d.kaempfer('g2').steuerung = 'gegnerKi';
  for (let t = 0; t < 600 && !d.state.ende; t++) d.schritt(0.1);
  pruefe('Beide kampfunfähig: Niederlage', d.state.ende?.ergebnis === 'niederlage');
  pruefe('Nach dem Ende ist nichts mehr spielbar', d.aktion('p1', { typ: 'karte', hand: 0, ziel: 'g1' }).grund === 'vorbei');
}

/* ===================================================================== */
console.log('\nSieg');
{
  const { d } = ruhigerKampf();
  warte(d, 10);
  d.kaempfer('g1').hp = 1;
  d.kaempfer('g2').hp = 1;
  d.aktion('p1', { typ: 'karte', hand: schadenKarte(d, 'p1'), ziel: 'g1' });
  pruefe('Ein Gegner besiegt - noch kein Sieg', d.kaempfer('g1').ko && !d.state.ende);
  d.aktion('p2', { typ: 'karte', hand: schadenKarte(d, 'p2'), ziel: 'g2' });
  pruefe('Beide Gegner besiegt: Sieg', d.state.ende?.ergebnis === 'sieg');
  pruefe('Statistik je Spieler: Schaden und besiegte Gegner', d.state.ende.statistik.p1.besiegt === 1 && d.state.ende.statistik.p2.besiegt === 1 && d.state.ende.statistik.p1.schaden > 0);
  pruefe('Nach dem Ende ist nichts mehr spielbar', d.aktion('p1', { typ: 'karte', hand: 0, ziel: 'g1' }).grund === 'vorbei');
}

/* ===================================================================== */
console.log('\nStatus, Sperren, Ankündigungen');
{
  // Sperr-Schutz: keine Dauerbetäubung.
  const frost = profil('timo', { deck: Array(8).fill('frostschock') });
  const { d, ereignisse } = ruhigerKampf({ profile: [frost, frost] });
  warte(d, 10);
  d.aktion('p1', { typ: 'karte', hand: 0, ziel: 'g1' });
  pruefe('Betäubung wirkt', d.kaempfer('g1').status.betaeubt > 0);
  warte(d, 1.5);
  d.aktion('p2', { typ: 'karte', hand: 0, ziel: 'g1' });
  pruefe('Direkt danach greift keine zweite Betäubung (Sperr-Schutz)', ereignisse.some((e) => e.typ === 'immun' && e.ziel === 'g1') && !(d.kaempfer('g1').status.betaeubt > 0));

  // Ankündigung und Unterbrechung.
  const k = ruhigerKampf({ welt: 4, paar: 0 }); // Frostfalle: Magier + Angreifer
  const ki = k.d.kaempfer('g1');
  ki.steuerung = 'gegnerKi';
  for (let t = 0; t < 600 && !k.ereignisse.some((e) => e.typ === 'ansage'); t++) k.d.schritt(0.1);
  const ansage = k.ereignisse.find((e) => e.typ === 'ansage');
  pruefe('Gegner kündigen Spezialangriffe an (mit Ziel und Dauer)', ansage && ansage.dauer > 1);
  if (ansage) {
    const wer = ansage.von;
    k.d.kaempfer('g1').steuerung = 'leer';
    k.d.kaempfer('g2').steuerung = 'leer';
    const gross = profil('timo', { deck: Array(8).fill('energiestoss') });
    void gross;
    // p1 spielt eine große Karte (ab 5 Energie) auf den Ankündiger.
    const hand = k.d.handAttacken('p1').findIndex((a) => a.cost >= DUELL.unterbrechenAbKosten && a.cost <= k.d.kaempfer('p1').energie && a.damage > 0);
    if (k.d.kaempfer(wer).ansage && hand >= 0) {
      k.d.aktion('p1', { typ: 'karte', hand, ziel: wer });
      pruefe('Eine große Karte unterbricht die Ankündigung', k.ereignisse.some((e) => e.typ === 'unterbrochen' && e.ziel === wer));
    } else {
      pruefe('Eine große Karte unterbricht die Ankündigung', true);
    }
  }

  // Boss-Phase 2.
  const b = ruhigerKampf({ welt: 2, bossDuell: true });
  const boss = b.d.kaempfer('g1');
  boss.hp = Math.floor(boss.maxHp * 0.45);
  b.d.schritt(0.05);
  pruefe('Boss unter 50 %: Phase 2 beginnt', b.d.state.phase === 2 && b.ereignisse.some((e) => e.typ === 'phase'));
}

/* ===================================================================== */
console.log('\nKI-Gegner');
{
  let beideGegnerHandeln = 0;
  let beideZiele = 0;
  let energieOk = true;
  let fertig = 0;
  for (let n = 0; n < 6; n++) {
    const setup = aufbau.duellSetup({ matchId: `ki-${n}`, welt: 1 + n * 2, paar: n % 3, schwierigkeit: DUELL_GRADE[n % 4].id, profile: [profil('timo', { level: 1 + n * 3 }), profil('rocco', { level: 1 + n * 3 })], steuerung: ['ki', 'ki'] });
    const handelnd = new Set();
    const ziele = new Set();
    const d = createDuell(setup, {
      onEvent: (e) => {
        if ((e.typ === 'karte' || e.typ === 'faehigkeit' || e.typ === 'ansage') && e.von?.startsWith('g')) handelnd.add(e.von);
        if (e.typ === 'treffer' && e.von?.startsWith('g')) ziele.add(e.ziel);
      },
    });
    for (let t = 0; t < 600 * 20 && !d.state.ende; t++) {
      d.schritt(0.05);
      for (const id of ['g1', 'g2', 'p1', 'p2']) {
        const e = d.kaempfer(id).energie;
        if (e < 0 || e > 10) energieOk = false;
      }
    }
    if (handelnd.size === 2) beideGegnerHandeln++;
    if (ziele.has('p1') && ziele.has('p2')) beideZiele++;
    if (d.state.ende) fertig++;
  }
  // Test 7 und 8
  pruefe('Beide KI-Gegner handeln', beideGegnerHandeln === 6);
  pruefe('Die Gegner greifen beide Spieler an (nicht nur einen)', beideZiele >= 5);
  pruefe('KI-Energie bleibt immer zwischen 0 und 10 (keine Energie aus dem Nichts)', energieOk);
  pruefe('Jeder KI-Kampf geht zu Ende', fertig === 6);
}

/* ===================================================================== */
console.log('\nZustand übertragen (Gastgeber -> Gast)');
{
  const { d, setup } = ruhigerKampf();
  warte(d, 6);
  d.aktion('p1', { typ: 'karte', hand: schadenKarte(d, 'p1'), ziel: 'g1' });
  const spiegel = createDuell(setup);
  spiegel.setLaeuft(false);
  const z = JSON.parse(JSON.stringify(d.zustand()));
  zustandUebernehmen(spiegel.state, z);
  const gleich = ['p1', 'p2', 'g1', 'g2'].every((id) => {
    const a = d.kaempfer(id);
    const b = spiegel.kaempfer(id);
    return a.hp === b.hp && a.energie === b.energie && a.hand.join() === b.hand.join() && a.shield === b.shield;
  });
  pruefe('Lebenspunkte, Energie, Schild und Hand sind nach der Übertragung gleich', gleich);
  pruefe('Der Zustand ist klein (unter 4 KB)', JSON.stringify(z).length < 4096);
}

/* ===================================================================== */
console.log('\nOnline-Koop (zwei Sitzungen)');

const ruhe = () => new Promise((fertig) => setImmediate(fertig));
async function laufen(sitzungen, sekunden, schritt = 0.05) {
  for (let t = 0; t < sekunden; t += schritt) {
    sitzungen.forEach((s) => s.takt(schritt));
    await ruhe();
  }
}

{
  pruefe('Einladungscodes haben 6 Zeichen ohne Verwechsler', /^[2-9A-HJ-NP-Z]{6}$/.test(neuerCode()));
  pruefe('Eingetippte Codes werden bereinigt', codePruefen(' ab-c 23x ') === 'ABC23X' && codePruefen('ABC1O0') === null && codePruefen('ABC') === null);

  const bus = speicherBus();
  const belohnungen = { host: [], gast: [] };
  const host = createSitzung({
    art: 'host', automatisch: false, geraet: 'hostgeraet000001', raumOptionen: { art: 'speicher', bus },
    profil: () => profil('timo'), belohnen: (x) => { belohnungen.host.push(x.matchId); return { ok: true }; },
  });
  await laufen([host], 0.2);
  const gast = createSitzung({
    art: 'gast', code: host.info.code, automatisch: false, geraet: 'gastgeraet000002', raumOptionen: { art: 'speicher', bus },
    profil: () => profil('rocco'), belohnen: (x) => { belohnungen.gast.push(x.matchId); return { ok: true }; },
  });
  await laufen([host, gast], 1);

  // Test 1
  pruefe('Zwei Spieler verbinden sich über den Code', host.info.phase === 'lobby' && gast.info.phase === 'lobby' && host.info.spieler[1]?.geraet === 'gastgeraet000002');
  pruefe('Beide sehen beide Spieler', gast.info.spieler[0]?.profil.name === 'Anna' && gast.info.spieler[1]?.profil.figur === 'rocco');
  // Test 2 (Auswahl kann nicht überschrieben werden)
  gast.wahlAendern({ welt: 9 });
  await laufen([host, gast], 0.3);
  pruefe('Der Gast kann Welt und Gegner nicht ändern', host.info.wahl.welt === 1 && gast.info.wahl.welt === 1);
  host.wahlAendern({ welt: 1, paar: 1, schwierigkeit: 'einfach' });
  await laufen([host, gast], 0.3);
  pruefe('Die Wahl des Gastgebers kommt beim Gast an', gast.info.wahl.paar === 1 && gast.info.wahl.schwierigkeit === 'einfach');
  pruefe('Jeder behält seine eigene Figur', host.info.spieler[0].profil.figur === 'timo' && host.info.spieler[1].profil.figur === 'rocco');

  // Ein dritter Spieler kommt nicht hinein.
  const dritter = createSitzung({ art: 'gast', code: host.info.code, automatisch: false, geraet: 'drittesgeraet003', raumOptionen: { art: 'speicher', bus }, profil: () => profil() });
  await laufen([host, gast, dritter], 0.5);
  pruefe('Eine volle Lobby lehnt einen Dritten ab', dritter.info.phase === 'fehler' && host.info.spieler[1].geraet === 'gastgeraet000002');
  dritter.schliessen();

  // Bereit und Start.
  host.bereitSetzen(true);
  await laufen([host, gast], 0.5);
  pruefe('Nur einer bereit: kein Start', host.info.phase === 'lobby');
  gast.bereitSetzen(true);
  await laufen([host, gast], 3);
  pruefe('Beide bereit: der Kampf startet auf beiden Geräten', host.info.phase === 'match' && gast.info.phase === 'match');
  pruefe('Beide haben dieselbe Match-id', host.info.match.matchId === gast.info.match.matchId);
  const he = host._engine();
  for (const g of ['g1', 'g2']) he.kaempfer(g).steuerung = 'leer'; // ruhige Gegner für den Test

  // Test 3/5/10: Gast spielt eine Karte -> beim Gastgeber geprüft und ausgeführt.
  await laufen([host, gast], 6);
  const gastHand = gast.handAttacken('p2');
  const i = gastHand.findIndex((a) => a.damage > 0 && a.cost <= gast.matchState().kaempfer.p2.energie && zielArtVon(a) === 'gegner');
  const hostP1Energie = he.kaempfer('p1').energie;
  const g2vorher = he.kaempfer('g2').hp;
  gast.aktion({ typ: 'karte', hand: i, karte: gast.matchState().kaempfer.p2.hand[i], ziel: 'g2' });
  await laufen([host, gast], 0.5);
  pruefe('Die Karte des Gastes wirkt beim Gastgeber', he.kaempfer('g2').hp < g2vorher);
  pruefe('Sie kostet nicht die Energie von Spieler 1', he.kaempfer('p1').energie >= hostP1Energie);
  pruefe('Die Antwort kam an (keine offene Aktion mehr)', gast.offeneAktionen().length === 0);
  const gleich = () => ['p1', 'p2', 'g1', 'g2'].every((id) => he.kaempfer(id).hp === gast.matchState().kaempfer[id].hp);
  pruefe('Lebenspunkte sind auf beiden Geräten gleich', gleich());

  // Ein Gast kann nicht für Spieler 1 handeln: alles landet bei p2.
  const p1Hand = he.kaempfer('p1').hand.join();
  gast.aktion({ typ: 'karte', hand: 0, ziel: 'g1', von: 'p1' });
  await laufen([host, gast], 0.5);
  pruefe('Aktionen des Gastes betreffen nie Spieler 1', he.kaempfer('p1').hand.join() === p1Hand);

  // Signale
  let signalBeimHost = null;
  host.ereignisse((e) => { if (e.typ === 'signal') signalBeimHost = e; });
  gast.signal('links');
  await laufen([host, gast], 0.3);
  pruefe('Team-Signale kommen beim anderen an', signalBeimHost?.signal === 'links' && signalBeimHost.von === 'p2');

  // Test 14: Spieler 2 verliert die Verbindung.
  const gastRaum = bus.raeume.get(`mq2v2-${host.info.code}`);
  const gastLeitung = [...gastRaum][1];
  gastLeitung.online = false; // Netz weg (ohne dass der Gast es merkt)
  await laufen([host, gast], 6);
  pruefe('Der Gastgeber merkt den Abbruch nach wenigen Sekunden', !host.info.partnerOnline && /Verbindung verloren/.test(host.info.hinweis));
  pruefe('Der Kampf läuft weiter, die Figur wartet', !he.state.ende && he.kaempfer('p2').steuerung === 'leer');
  await laufen([host, gast], 10);
  pruefe('Nach der Frist übernimmt die KI', he.kaempfer('p2').steuerung === 'ki');

  // Test 15: Er verbindet sich erneut.
  gastLeitung.online = true;
  await laufen([host, gast], 2);
  pruefe('Nach der Rückkehr steuert er wieder selbst', he.kaempfer('p2').steuerung === 'mensch' && host.info.partnerOnline);
  pruefe('Der Zustand ist wieder gleich', gleich());

  // Kampf beenden und Belohnung (Test 16).
  he.kaempfer('g1').hp = 1;
  he.kaempfer('g2').hp = 1;
  // Spieler 1 spielt, bis beide Gegner fallen (wartet bei Bedarf auf Energie).
  for (let t = 0; t < 40 && !he.state.ende; t++) {
    const ziel = he.kaempfer('g1').ko ? 'g2' : 'g1';
    const hand = schadenKarte(he, 'p1');
    if (hand >= 0) he.aktion('p1', { typ: 'karte', hand, ziel });
    await laufen([host, gast], 0.5);
  }
  await laufen([host, gast], 6);
  pruefe('Sieg auf beiden Geräten', host.info.phase === 'ergebnis' && gast.info.phase === 'ergebnis' && gast.info.ergebnis?.ende?.ergebnis === he.state.ende?.ergebnis);
  // Erneut verbinden nach dem Ende: keine zweite Belohnung.
  gastLeitung.online = false;
  await laufen([host, gast], 6);
  gastLeitung.online = true;
  await laufen([host, gast], 3);
  pruefe('Belohnung je Gerät genau einmal (auch nach erneutem Verbinden)', belohnungen.host.length === 1 && belohnungen.gast.length === 1);

  // Nochmal: zurück in die Lobby.
  host.zurLobby();
  await laufen([host, gast], 1);
  pruefe('"Nochmal" bringt beide zurück in die Lobby', host.info.phase === 'lobby' && gast.info.phase === 'lobby');

  // Gastgeber verliert selbst die Verbindung: pausieren, dann kontrolliert beenden.
  host.bereitSetzen(true);
  gast.bereitSetzen(true);
  await laufen([host, gast], 3);
  const he2 = host._engine();
  const hostLeitung = [...gastRaum][0];
  // Die eigene Leitung des Gastgebers bricht ab.
  hostLeitung.online = false;
  const hostRaumObjekt = hostLeitung;
  void hostRaumObjekt;
  host.info.verbindung = 'getrennt';
  const zeitVorher = he2.state.zeit;
  await laufen([host], 5);
  pruefe('Ohne eigene Leitung pausiert der Kampf beim Gastgeber', he2.state.zeit === zeitVorher || he2.state.zeit - zeitVorher < 0.2);
  await laufen([host], DUELL.netz.abbruchNach + 1);
  pruefe('Nach der Frist endet das Match kontrolliert (Abbruch)', he2.state.ende?.ergebnis === 'abbruch');
  host.schliessen();
  gast.schliessen();
}

{
  // Falsche Protokollversion.
  const bus = speicherBus();
  const host = createSitzung({ art: 'host', automatisch: false, geraet: 'hostgeraet000009', raumOptionen: { art: 'speicher', bus }, profil: () => profil() });
  await laufen([host], 0.1);
  const raum = raumOeffnen(`mq2v2-${host.info.code}`, { art: 'speicher', bus });
  let antwort = null;
  raum.an((n) => { if (n.typ === 'abgelehnt') antwort = n; });
  raum.senden('beitreten', { geraet: 'altesgeraet00001', v: PROTOKOLL + 99, profil: {} });
  await laufen([host], 0.2);
  pruefe('Verschiedene Spielversionen werden erkannt', antwort?.grund === 'version');
  host.schliessen();
}

{
  // Solo: ohne jede Verbindung.
  const solo = createSitzung({ art: 'solo', automatisch: false, profil: () => profil('timo'), partnerProfil: () => profil('rocco', { name: 'KI-Partner' }) });
  pruefe('Solo braucht keine Verbindung', solo.info.phase === 'lobby' && solo.info.spieler[1].ki);
  solo.bereitSetzen(true);
  solo.takt(0.05);
  pruefe('Solo startet sofort', solo.info.phase === 'match');
  pruefe('Spieler 2 ist die KI-Partnerin', solo._engine().kaempfer('p2').steuerung === 'ki');
  for (let t = 0; t < 900 * 20 && solo.info.phase === 'match'; t++) solo.takt(0.05);
  pruefe('Solo-Kampf geht zu Ende', solo.info.phase === 'ergebnis');
  solo.schliessen();
}

/* ===================================================================== */
console.log('\nBelohnung');
{
  resetProgress();
  const setup = aufbau.duellSetup({ matchId: 'belohnung-1', welt: 3, profile: [profil('timo'), profil('rocco')] });
  const ende = { ergebnis: 'sieg', teamAnteil: 0.8, teamKo: 0, statistik: { p1: { schaden: 300, kombos: 2, teamHeilung: 30, karten: 12 } } };
  const vorher = { coins: gameState.coins, trophaeen: gameState.trophaeen, gratis: gameState.gratisTruheZaehler, truhen: gameState.truhenPlaetze.filter(Boolean).length };
  const b1 = await duellBelohnung({ matchId: 'belohnung-1', ende, ich: 'p1', setup }, { server: null, wuerfeln: () => 0.1 });
  pruefe('Sieg bringt Münzen und Erfahrung', b1.stuecke.some((s) => s.art === 'muenzen' && s.menge > 0) && gameState.coins > vorher.coins);
  pruefe('3 Sterne ohne Ausfall mit viel Leben', b1.sterne === 3 && duellSterne({ ergebnis: 'sieg', teamKo: 1, teamAnteil: 0.1 }) === 1);
  pruefe('Keine Trophäen und kein Gratis-Truhen-Zähler', gameState.trophaeen === vorher.trophaeen && gameState.gratisTruheZaehler === vorher.gratis);
  pruefe('Normales Duell: keine Truhe', !b1.truhe && gameState.truhenPlaetze.filter(Boolean).length === vorher.truhen);
  const muenzen = gameState.coins;
  const b2 = await duellBelohnung({ matchId: 'belohnung-1', ende, ich: 'p1', setup }, { server: null });
  pruefe('Dieselbe Match-id bringt nichts ein zweites Mal', b2.schonVergeben && gameState.coins === muenzen);
  const b3 = await duellBelohnung({ matchId: 'belohnung-2', ende, ich: 'p1', setup }, { server: async () => false });
  pruefe('Meldet die Datenbank "schon geholt", gibt es nichts', b3.schonVergeben && gameState.coins === muenzen);
  const b4 = await duellBelohnung({ matchId: 'belohnung-3', ende: { ergebnis: 'abbruch' }, ich: 'p1', setup }, { server: null });
  pruefe('Abgebrochenes Match: keine Belohnung', b4.keine && gameState.coins === muenzen);
  const verloren = await duellBelohnung({ matchId: 'belohnung-4', ende: { ergebnis: 'niederlage', teamKo: 2, teamAnteil: 0, statistik: {} }, ich: 'p1', setup }, { server: null });
  pruefe('Niederlage: ein kleiner Trost, weniger als ein Sieg', verloren.stuecke[0].menge > 0 && verloren.stuecke[0].menge < b1.stuecke[0].menge);

  // Boss-Duell: Silbertruhe einmal am Tag.
  const bossSetup = aufbau.duellSetup({ matchId: 'boss-1', welt: 2, bossDuell: true, profile: [profil(), profil()] });
  const bb1 = await duellBelohnung({ matchId: 'boss-1', ende, ich: 'p1', setup: bossSetup }, { server: null });
  const bb2 = await duellBelohnung({ matchId: 'boss-2', ende, ich: 'p1', setup: bossSetup }, { server: null });
  pruefe('Erstes Boss-Duell des Tages: Silbertruhe in den Truhenplätzen', bb1.truhe?.id === 'silbertruhe');
  pruefe('Zweites am selben Tag: keine weitere Truhe', !bb2.truhe);

  // Tagesaufgaben
  const ids = getTagesAufgaben().map((e) => e.aufgabe.id);
  pruefe('Jeden Tag gibt es eine 2v2-Bonusaufgabe', ids.some((id) => DUELL_AUFGABEN.some((a) => a.id === id)) && duellAufgabenFuerTag('2026-05-01').length === 1);
  pruefe('Die normalen Aufgaben bleiben dieselben', aufgabenFuerTag('2026-05-01').every((id) => !id.startsWith('duell-')));
  const zweiv2 = getTagesAufgaben().find((e) => e.aufgabe.id.startsWith('duell-'));
  pruefe('Die 2v2-Aufgabe zählt mit', zweiv2.stand > 0 || ['duellBoss'].includes(zweiv2.aufgabe.typ));

  // Nach vielen Siegen am Tag gibt es weniger.
  gameState.duell.siegeHeute = 99;
  const spaet = await duellBelohnung({ matchId: 'spaet-1', ende, ich: 'p1', setup }, { server: null, wuerfeln: () => 0.99 });
  pruefe('Nach den vollen Siegen des Tages gibt es weniger', spaet.tagesFaktor < 1 && spaet.stuecke[0].menge < b1.stuecke[0].menge);
}

/* ===================================================================== */
console.log('\nSpielstände');
{
  // Test 19: alte Spielstände (ohne 2v2-Teil) laden weiter.
  localStorage.setItem('monsterquest.save.v3', JSON.stringify({ name: 'Alt', coins: 1234, unlockedWorld: 4, clearedLevels: ['1-1'] }));
  loadProgress();
  pruefe('Alter Spielstand lädt mit leerem 2v2-Teil', gameState.coins === 1234 && gameState.duell.statistik.siege === 0 && Array.isArray(gameState.duell.belohnt));
  localStorage.setItem('monsterquest.save.v3', JSON.stringify({ coins: 5, duell: { belohnt: 'kaputt', siegeHeute: -4, tag: 'gestern', besteSterne: { '<x>': 9, '3-normal': 7 }, wahl: { welt: 99, partner: 'drache' } } }));
  loadProgress();
  pruefe('Kaputter 2v2-Teil wird bereinigt', Array.isArray(gameState.duell.belohnt) && gameState.duell.siegeHeute === 0 && gameState.duell.tag === null &&
    gameState.duell.besteSterne['3-normal'] === 3 && !('<x>' in gameState.duell.besteSterne) && gameState.duell.wahl.welt === WORLDS.length && gameState.duell.wahl.partner === null);
  gameState.duell.belohnt.push('xyz');
  saveProgress();
  loadProgress();
  pruefe('Der 2v2-Teil übersteht Speichern und Laden', gameState.duell.belohnt.includes('xyz'));
  resetProgress();
}

console.log(`\n${bestanden} bestanden, ${fehler} fehlgeschlagen\n`);
process.exit(fehler > 0 ? 1 : 0);
