/**
 * Browser-Test des Wiederherstellungs-Codes - wie mit zwei Geräten:
 *
 *     node tests/sicherung-browser.test.mjs
 *
 * Braucht Playwright mit Chromium (wie tests/duell-browser.test.mjs). Ohne
 * Playwright wird der Test übersprungen. Als Datenbank läuft
 * werkzeuge/test-datenbank.mjs (im Arbeitsspeicher, nichts geht nach
 * Supabase).
 *
 * Geprüft: Erinnerung erscheint für Spieler mit Fortschritt, Code
 * erstellen, Code in den Einstellungen, ein neues Gerät holt den
 * Spielstand mit dem Code zurück - und wer noch nichts gespielt hat, wird
 * nicht erinnert.
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';
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

const PORT = 8130;
const ADRESSE = `http://localhost:${PORT}`;
const server = spawn(process.execPath, [fileURLToPath(new URL('../werkzeuge/test-datenbank.mjs', import.meta.url))], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(`${ADRESSE}/uebersicht`)).ok) break;
  } catch {
    /* noch nicht da */
  }
  await new Promise((fertig) => setTimeout(fertig, 100));
}

let bestanden = 0;
let fehler = 0;
function pruefe(text, ok) {
  if (ok) bestanden++;
  else fehler++;
  console.log(`  ${ok ? 'ok  ' : 'FEHL'} ${text}`);
}

// MQ_BROWSER=webkit: derselbe Test mit der Safari-Engine (iPhone, iPad, Mac).
const browser = await (process.env.MQ_BROWSER === 'webkit' ? webkit : chromium).launch();
const seitenfehler = [];

async function geraet(name, spielstand) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, (r) => r.abort());
  if (spielstand) {
    await ctx.addInitScript((s) => {
      if (!localStorage.getItem('monsterquest.save.v3')) localStorage.setItem('monsterquest.save.v3', JSON.stringify(s));
    }, spielstand);
  }
  const p = await ctx.newPage();
  p.on('pageerror', (e) => seitenfehler.push(`${name}: ${e.message}`));
  await p.goto(`${ADRESSE}/`);
  await p.waitForSelector('.screen--start');
  return { ctx, p };
}
const zeige = (p, name, params = {}) => p.evaluate(([n, pa]) => import('/js/core/screens.js').then((m) => m.showScreen(n, pa)), [name, params]);

try {
  console.log('\nErinnerung und Code');
  const { p: A } = await geraet('Zodi', {
    name: 'Zodi', trophaeen: 2145, coins: 777, clearedLevels: ['1-1', '1-2', '1-3', '1-4'], unlockedWorld: 2,
    gesehen: { kampf: true }, characters: { timo: { level: 12, xp: 0 } }, settings: { musik: false, sound: false },
  });
  await A.waitForSelector('.overlay--sicherung', { timeout: 12000 });
  pruefe('Spieler mit Fortschritt wird ans Sichern erinnert', (await A.textContent('.overlay--sicherung')).includes('Sichere deinen Spielstand'));
  await A.click('.overlay--sicherung [data-aktion="erstellen"]');
  await A.waitForSelector('.overlay--sicherung .spielstand-code');
  const code = (await A.textContent('.overlay--sicherung .spielstand-code')).trim();
  pruefe(`Code wird angezeigt (${code})`, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(code));
  await A.click('.overlay--sicherung [data-aktion="fertig"]');
  await zeige(A, 'settings', { tab: 'datenbank' });
  await A.waitForTimeout(400);
  pruefe('Code steht auch in den Einstellungen', (await A.$$eval('.spielstand-code', (els) => els.map((e) => e.textContent))).includes(code));
  await A.reload();
  await A.waitForSelector('.screen--start');
  await A.waitForTimeout(7000);
  pruefe('Wer einen Code hat, wird nicht mehr erinnert', !(await A.$('.overlay--sicherung')));

  console.log('\nNeues Gerät');
  const { p: B } = await geraet('Neu');
  // Ein ganz neues Gerät fragt zuerst nach dem Namen - weg damit.
  await B.evaluate(() => document.querySelectorAll('.overlay').forEach((o) => o.remove()));
  await B.waitForTimeout(6500);
  pruefe('Ohne Fortschritt keine Erinnerung', !(await B.$('.overlay--sicherung')));
  await zeige(B, 'settings', { tab: 'datenbank' });
  await B.waitForSelector('.eingabe--code');
  await B.fill('.eingabe--code', code.toLowerCase().replace(/-/g, ''));
  await B.click('.eingabe-gruppe .btn--green >> text=Holen');
  await B.waitForTimeout(1200);
  const stand = await B.evaluate(() => import('/js/core/state.js').then((m) => ({ name: m.gameState.name, trophaeen: m.gameState.trophaeen })));
  pruefe('Neues Gerät holt den Spielstand mit dem Code zurück', stand.name === 'Zodi' && stand.trophaeen === 2145);
  const id = await B.evaluate(() => localStorage.getItem('monsterquest.spieler'));
  pruefe('Es ist derselbe Spieler (gleiche Nummer)', id === (await A.evaluate(() => localStorage.getItem('monsterquest.spieler'))));
  await zeige(B, 'settings', { tab: 'datenbank' });
  await B.waitForTimeout(400);
  pruefe('Der Code gilt weiter und steht dort in den Einstellungen', (await B.$$eval('.spielstand-code', (els) => els.map((e) => e.textContent))).includes(code));
  await B.fill('.eingabe--code', '2222-2222-2222');
  await B.click('.eingabe-gruppe .btn--green >> text=Holen');
  await B.waitForTimeout(600);
  pruefe('Falscher Code: verständliche Meldung', (await B.textContent('#hol-befund')).includes('gibt es nicht'));
} catch (e) {
  fehler++;
  console.log(`  FEHL Abbruch: ${e.message.split('\n')[0]}`);
} finally {
  await browser.close();
  server.kill();
}

pruefe(`Keine Fehler in den Seiten${seitenfehler.length ? `: ${seitenfehler.join(' | ')}` : ''}`, seitenfehler.length === 0);
console.log(`\n${bestanden} bestanden, ${fehler} fehlgeschlagen\n`);
process.exit(fehler ? 1 : 0);
