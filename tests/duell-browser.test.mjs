/**
 * Browser-Test des 2v2-Modus mit ZWEI Spielern - wie auf zwei Geräten:
 *
 *     node tests/duell-browser.test.mjs
 *
 * Braucht Playwright mit Chromium (npx playwright install chromium). Ohne
 * Playwright wird der Test übersprungen. Er startet seinen eigenen kleinen
 * Webserver und verbindet zwei Tabs über ?netz=lokal (BroadcastChannel) -
 * dieselbe Sitzungslogik wie online, nur ohne Internet. Die Datenbank wird
 * dabei blockiert, es landet nichts in Supabase.
 *
 * Geprüft: Lobby per Code, Auswahl nur durch Spieler 1, Start auf beiden
 * Geräten, gleiche Lebenspunkte, Team-Signal, Verbindungsabbruch mit
 * KI-Ersatz, Wiederverbinden, Ergebnis auf beiden Geräten, zurück in die
 * Lobby - und ob die alten Modi und das Offline-Spiel weiter laufen.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
let webkit;
let devices;
try {
  ({ chromium, webkit, devices } = await import('playwright'));
} catch {
  try {
    const { execSync } = await import('node:child_process');
    const global = execSync('npm root -g', { encoding: 'utf8' }).trim();
    ({ chromium, webkit, devices } = await import(join(global, 'playwright', 'index.mjs')));
  } catch {
    console.log('Playwright fehlt - Browser-Test übersprungen.');
    process.exit(0);
  }
}

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const TYPEN = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = createServer(async (anfrage, antwort) => {
  const weg = decodeURIComponent(new URL(anfrage.url, 'http://x').pathname);
  const datei = join(WURZEL, normalize(weg === '/' ? '/index.html' : weg).replace(/^(\.\.[/\\])+/, ''));
  try {
    const inhalt = await readFile(datei);
    antwort.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] ?? 'application/octet-stream' });
    antwort.end(inhalt);
  } catch {
    antwort.writeHead(404);
    antwort.end();
  }
});
await new Promise((fertig) => server.listen(0, '127.0.0.1', fertig));
const ADRESSE = `http://localhost:${server.address().port}`;

let bestanden = 0;
let fehler = 0;
function pruefe(text, ok) {
  if (ok) bestanden++;
  else fehler++;
  console.log(`  ${ok ? 'ok  ' : 'FEHL'} ${text}`);
}

const SPIELSTAND = { name: 'Anna', unlockedWorld: 4, clearedLevels: ['1-1', '1-12', '2-12', '3-12'], coins: 500, gesehen: { kampf: true },
  bossPowers: ['rindenpanzer', 'inferno'], bossPower: 'inferno', characters: { timo: { level: 6, xp: 0 } }, settings: { musik: false, sound: false } };

// MQ_BROWSER=webkit: derselbe Test mit der Safari-Engine (iPhone, iPad, Mac).
const browser = await (process.env.MQ_BROWSER === 'webkit' ? webkit : chromium).launch();
const seitenfehler = [];
try {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, (r) => r.abort());
  await ctx.addInitScript((stand) => {
    if (!localStorage.getItem('monsterquest.save.v3')) localStorage.setItem('monsterquest.save.v3', JSON.stringify(stand));
  }, SPIELSTAND);

  async function seite() {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => seitenfehler.push(e.message));
    await p.goto(`${ADRESSE}/?netz=lokal`);
    await p.waitForSelector('.modi-knopf');
    await p.click('.modi-knopf');
    await p.click('.spielmodus--duell .spielmodus__spielen');
    await p.waitForSelector('[data-aktion="solo"]');
    return p;
  }
  async function spielen(p, n) {
    for (let i = 0; i < n; i++) {
      if (await p.$('.overlay--ergebnis')) return;
      const karten = await p.$$('.hand .card.is-ready:not(.ist-unterwegs)');
      if (karten.length) await karten[0].click({ timeout: 600 }).catch(() => {});
      await p.waitForTimeout(300);
    }
  }
  /**
   * Wartet, bis fn() im Browser true ergibt - höchstens ms. Die Seite kommt
   * dafür nach vorn: WebKit lässt die Spielschleife einer Seite im
   * Hintergrund kaum laufen (auf dem Handy ist das eigene Spiel ja immer vorn).
   */
  const bis = async (p, fn, ms) => {
    await p.bringToFront();
    return p.waitForFunction(fn, null, { timeout: ms, polling: 250 }).then(() => true, () => false);
  };
  const lp = (p) => p.$$eval('.duell-plakette [data-hp]', (els) => els.map((e) => e.textContent).join(' '));
  /**
   * Gleicher Stand auf beiden Geräten? Der Gast bekommt den Zustand 8-mal
   * pro Sekunde - deshalb bis zu 3 s auf den nächsten warten, statt einen
   * einzelnen Augenblick zu vergleichen.
   */
  async function gleicherStand(p1, p2) {
    for (let i = 0; i < 30; i++) {
      if ((await lp(p1)) === (await lp(p2))) return true;
      await p1.waitForTimeout(100);
    }
    return false;
  }

  console.log('\nLobby');
  const A = await seite();
  await A.click('[data-aktion="erstellen"]');
  await A.waitForSelector('.duell-einladung__code');
  const code = (await A.textContent('.duell-einladung__code')).trim();
  pruefe('Spieler 1 bekommt einen Einladungscode', /^[2-9A-HJ-NP-Z]{6}$/.test(code));
  const B = await seite();
  await B.fill('.duell-code__feld', code.toLowerCase());
  await B.click('form[data-aktion="beitreten"] button');
  await B.waitForSelector('.duell-team', { timeout: 8000 });
  await A.waitForTimeout(500);
  pruefe('Spieler 2 tritt mit dem Code bei', (await A.$$('.duell-spieler:not(.duell-spieler--leer)')).length === 2);
  pruefe('Nur Spieler 1 wählt Welt und Schwierigkeit', await B.$eval('[data-grad="einfach"]', (e) => e.disabled));
  await A.click('[data-grad="einfach"]');
  await A.click('[data-aktion="bereit"]');
  await A.waitForTimeout(500);
  pruefe('Mit nur einem Bereiten startet nichts', !(await A.$('.screen--duell')));
  await B.click('[data-aktion="bereit"]');
  await A.waitForSelector('.screen--duell', { timeout: 6000 });
  await B.waitForSelector('.screen--duell', { timeout: 6000 });
  pruefe('Beide sind bereit: der Kampf startet auf beiden Geräten', true);

  console.log('\nKampf');
  pruefe('Alle vier Figuren sind zu sehen', (await A.$$('.duell-platz .pixel-sprite')).length === 4);
  pruefe('Jeder hat vier Handkarten', (await A.$$('.hand .card')).length === 4 && (await B.$$('.hand .card')).length === 4);
  await B.click('.duell-plakette[data-ziel="g2"]');
  pruefe('Zielwahl per Antippen', await B.$eval('.duell-plakette[data-ziel="g2"]', (e) => e.classList.contains('ist-ziel')));
  await Promise.all([spielen(A, 8), spielen(B, 8)]);
  await A.waitForTimeout(700);
  pruefe('Lebenspunkte sind auf beiden Geräten gleich', await gleicherStand(A, B));
  await B.click('#btn-signal');
  await B.click('[data-signal="links"]');
  await A.waitForTimeout(400);
  pruefe('Team-Signal kommt beim Partner an', (await A.$$('.duell-blase--signal')).length > 0);

  console.log('\nVerbindung');
  await B.reload();
  // Nicht eine feste Zeit warten, sondern bis es passiert (mit Obergrenze):
  // Auf langsamen Rechnern (z. B. bei GitHub) dauert alles etwas länger.
  pruefe('Spieler 1 wird über den Abbruch informiert',
    await bis(A, () => /Verbindung verloren/.test(document.querySelector('#band')?.textContent ?? ''), 20000));
  pruefe('Nach der Frist spielt die KI für Spieler 2',
    await bis(A, () => /KI/.test(document.querySelector('.duell-team-halb.ist-partner [data-steuerung]')?.textContent ?? ''), 30000));
  await B.bringToFront();
  await B.click('.modi-knopf');
  await B.click('.spielmodus--duell .spielmodus__spielen');
  await B.click('[data-aktion="letzte"]');
  await B.waitForSelector('.screen--duell', { timeout: 8000 });
  pruefe('Spieler 2 kommt zurück ins laufende Match',
    await bis(A, () => (document.querySelector('.duell-team-halb.ist-partner [data-steuerung]')?.textContent ?? 'x').trim() === '', 15000));
  pruefe('...und sieht denselben Stand', await gleicherStand(A, B));

  console.log('\nErgebnis');
  for (let r = 0; r < 150 && !(await A.$('.overlay--ergebnis')); r++) await Promise.all([spielen(A, 2), spielen(B, 2)]);
  await B.waitForSelector('.overlay--ergebnis', { timeout: 8000 }).catch(() => {});
  const titelA = await A.textContent('.overlay--ergebnis .overlay__title').catch(() => null);
  const titelB = await B.textContent('.overlay--ergebnis .overlay__title').catch(() => null);
  pruefe('Beide sehen dasselbe Ergebnis', Boolean(titelA) && titelA === titelB);
  await A.click('[data-aktion="nochmal"]');
  await A.waitForTimeout(1500);
  pruefe('"Nochmal" bringt beide zurück in die Lobby', Boolean(await A.$('.screen--duell-lobby .duell-team')) && Boolean(await B.$('.screen--duell-lobby .duell-team')));

  console.log('\nBisherige Modi und Offline');
  const C = await ctx.newPage();
  C.on('pageerror', (e) => seitenfehler.push(e.message));
  await C.goto(`${ADRESSE}/`);
  await C.waitForSelector('.modi-knopf');
  await C.evaluate(async () => (await import('/js/core/screens.js')).showScreen('battle', { levelId: '1-2' }));
  await C.waitForSelector('.screen--battle .hand .card', { timeout: 8000 });
  pruefe('Ein normaler Abenteuer-Kampf startet weiterhin', (await C.$$('.screen--battle .hand .card')).length === 4);
  await C.evaluate(async () => (await import('/js/core/screens.js')).showScreen('battle', { arena: { runde: 1, hp: null } }));
  await C.waitForSelector('.screen--battle .hand .card', { timeout: 8000 });
  pruefe('Die Endlos-Arena startet weiterhin', true);
  await C.goto(`${ADRESSE}/`);
  await C.waitForTimeout(2500); // Service Worker füllt den Cache
  if (process.env.MQ_BROWSER === 'webkit') {
    // Playwright kann WebKit nicht offline neu laden ("internal error") -
    // deshalb hier prüfen, dass das Spiel für offline gespeichert ist.
    let gespeichert = false;
    for (let i = 0; i < 30 && !gespeichert; i++) {
      gespeichert = await C.evaluate(async () => Boolean(await caches.match('index.html'))
        && Boolean(await caches.match('js/main.js')) && Boolean(await caches.match('js/core/duell.js')));
      if (!gespeichert) await C.waitForTimeout(500);
    }
    pruefe('Offline: Spiel ist für offline gespeichert (WebKit)', gespeichert);
    throw new Error('ENDE');
  }
  await ctx.setOffline(true);
  await C.reload();
  await C.waitForSelector('.modi-knopf', { timeout: 8000 });
  await C.click('.modi-knopf');
  await C.click('.spielmodus--duell .spielmodus__spielen');
  await C.click('[data-aktion="solo"]');
  await C.click('[data-aktion="bereit"]');
  await C.waitForSelector('.screen--duell .hand .card', { timeout: 8000 });
  pruefe('Offline: Spiel startet und 2v2 Solo läuft', true);
  await ctx.setOffline(false);
} catch (e) {
  if (e.message !== 'ENDE') {
    fehler++;
    console.log(`  FEHL Abbruch: ${e.message.split('\n')[0]}`);
  }
} finally {
  await browser.close();
  server.close();
}

pruefe('Keine Fehler in der Seite', seitenfehler.length === 0);
if (seitenfehler.length) console.log(seitenfehler.join('\n'));
console.log(`\n${bestanden} bestanden, ${fehler} fehlgeschlagen\n`);
process.exit(fehler > 0 ? 1 : 0);
