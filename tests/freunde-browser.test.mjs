/**
 * Browser-Test der Freundesliste mit ZWEI Spielern - wie auf zwei Geräten:
 *
 *     node tests/freunde-browser.test.mjs
 *
 * Braucht Playwright mit Chromium (wie tests/duell-browser.test.mjs). Ohne
 * Playwright wird der Test übersprungen. Als Datenbank läuft
 * werkzeuge/test-datenbank.mjs (im Arbeitsspeicher, nichts geht nach
 * Supabase). Die 2v2-Leitung läuft über ?netz=lokal; weil die zwei Spieler
 * getrennte Browser-Profile haben (eigene Spielernummer), reicht der Test
 * die Nachrichten zwischen ihnen weiter.
 *
 * Geprüft: Freundes-ID, Anfrage senden, ablehnen, annehmen, Onlinestatus,
 * Liste nach Neustart und auf einem neuen Gerät, direkt zum 2v2 einladen,
 * Lobby über die Einladung betreten, Kampf startet, Einladungscode von Hand
 * geht weiter, Freund entfernen, offline, Handy-Breite.
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
let devices;
try {
  ({ chromium, devices } = await import('playwright'));
} catch {
  try {
    const { execSync } = await import('node:child_process');
    const global = execSync('npm root -g', { encoding: 'utf8' }).trim();
    ({ chromium, devices } = await import(join(global, 'playwright', 'index.mjs')));
  } catch {
    console.log('Playwright fehlt - Browser-Test übersprungen.');
    process.exit(0);
  }
}

const PORT = 8127;
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

const stand = (name, figur = 'timo') => ({
  name, aktiveFigur: figur, unlockedWorld: 2, clearedLevels: ['1-1'], coins: 100, gesehen: { kampf: true },
  characters: { timo: { level: 6, xp: 0 }, rocco: { level: 4, xp: 0 } }, settings: { musik: false, sound: false },
});

/** BroadcastChannel über Profile hinweg: Der Test trägt die Nachrichten. */
function brueckeSkript() {
  const kanaele = [];
  window.BroadcastChannel = class {
    constructor(name) {
      this.name = name;
      this.onmessage = null;
      kanaele.push(this);
    }
    postMessage(daten) {
      window.__brueckeSenden(this.name, JSON.stringify(daten));
    }
    close() {
      kanaele.splice(kanaele.indexOf(this), 1);
    }
  };
  window.__brueckeEmpfangen = (name, text) => kanaele.filter((k) => k.name === name).forEach((k) => k.onmessage?.({ data: JSON.parse(text) }));
}

const browser = await chromium.launch();
const seitenfehler = [];
const alleSeiten = new Set();

async function geraet(name, geraetTyp, spielstand, spielerId = null) {
  const ctx = await browser.newContext({ ...devices[geraetTyp] });
  await ctx.exposeBinding('__brueckeSenden', ({ page }, kanal, text) => {
    alleSeiten.forEach((p) => {
      if (p !== page && !p.isClosed()) p.evaluate(([k, t]) => window.__brueckeEmpfangen?.(k, t), [kanal, text]).catch(() => {});
    });
  });
  await ctx.addInitScript(brueckeSkript);
  await ctx.addInitScript(([s, id]) => {
    if (!localStorage.getItem('monsterquest.save.v3')) localStorage.setItem('monsterquest.save.v3', JSON.stringify(s));
    if (id && !localStorage.getItem('monsterquest.spieler')) localStorage.setItem('monsterquest.spieler', id);
  }, [spielstand, spielerId]);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => seitenfehler.push(`${name}: ${e.message}`));
  alleSeiten.add(p);
  await p.goto(`${ADRESSE}/?netz=lokal`);
  await p.waitForSelector('.screen--start .hud__freunde');
  return { ctx, p };
}

/** Mit MQ_BILD=/pfad/name: Bildschirmfotos zum Anschauen. */
const bild = (p, name) => (process.env.MQ_BILD ? p.screenshot({ path: `${process.env.MQ_BILD}-${name}.png` }) : null);

/** Nicht 15 s auf das nächste Nachfragen warten. */
const nachfragen = (p) => p.evaluate(() => import('/js/core/freunde.js').then((m) => m.freundeAktualisieren()));
const text = (p, sel) => p.textContent(sel).then((t) => t.trim());

async function freundeOeffnen(p) {
  if (!(await p.$('.screen--freunde'))) {
    await p.evaluate(() => import('/js/core/screens.js').then((m) => m.showScreen('start')));
    await p.click('.screen--start .hud__freunde');
  }
  await p.waitForSelector('.freunde-ich__id', { timeout: 8000 });
}

try {
  console.log('\nFreundes-ID');
  const { p: A, ctx: ctxA } = await geraet('Anna', 'iPhone 13', stand('Anna'));
  const { p: B } = await geraet('Ben', 'Desktop Chrome', stand('Ben', 'rocco'));
  await freundeOeffnen(A);
  await freundeOeffnen(B);
  const idA = await text(A, '.freunde-ich__id');
  const idB = await text(B, '.freunde-ich__id');
  pruefe(`Jeder hat eine Freundes-ID (${idA}, ${idB})`, /^MQ-\d{5}$/.test(idA) && /^MQ-\d{5}$/.test(idB) && idA !== idB);
  const breite = await A.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  pruefe('Handy: nichts ragt seitlich heraus', breite);

  console.log('\nAnfragen');
  async function anfrage(von, an) {
    await von.click('[data-reiter="hinzufuegen"]');
    await von.fill('.freunde__suche input', an.toLowerCase().replace('-', ' '));
    await von.click('.freunde__suche button');
    await von.waitForSelector('.freund--gefunden');
  }
  await anfrage(B, idA);
  pruefe('Suche findet den Spieler (mit Name und Level)', (await text(B, '.freund--gefunden .freund__name')) === 'Anna'
    && (await text(B, '.freund--gefunden .freund__info')).includes('Lv 6'));
  await B.click('[data-aktion="senden"]');
  await B.waitForSelector('.freunde__meldung');
  pruefe('1. Freundschaftsanfrage senden', (await text(B, '.freunde__meldung')).includes('gesendet'));
  await anfrage(B, idA);
  pruefe('Keine doppelte Anfrage', (await text(B, '.freunde__meldung')).includes('schon'));
  await anfrage(B, idB);
  pruefe('Keine Anfrage an sich selbst', (await text(B, '.freunde__meldung')).includes('eigene'));

  await nachfragen(A);
  await A.waitForSelector('.erfolg-toast', { timeout: 3000 });
  pruefe('Hinweis: neue Freundschaftsanfrage', (await text(A, '.erfolg-toast')).includes('Freundschaftsanfrage'));
  pruefe('Anfrage ist noch keine Freundschaft', (await A.$$('[data-reiter="freunde"] ~ *')) && (await text(A, '[data-reiter="freunde"]')).includes('(0)'));
  await A.click('[data-reiter="anfragen"]');
  await A.click('[data-aktion="ablehnen"]');
  await A.waitForTimeout(300);
  await nachfragen(B);
  await B.click('[data-reiter="anfragen"]');
  pruefe('3. Freundschaftsanfrage ablehnen', !(await A.$('[data-aktion="ablehnen"]')) && !(await B.$('[data-aktion="zurueckziehen"]')));

  await anfrage(B, idA);
  await B.click('[data-aktion="senden"]');
  await B.waitForSelector('.freunde__meldung');
  await nachfragen(A);
  await A.click('[data-reiter="anfragen"]');
  await A.waitForSelector('[data-aktion="annehmen"]');
  await A.click('[data-aktion="annehmen"]');
  await A.waitForTimeout(400);
  await A.click('[data-reiter="freunde"]');
  await nachfragen(B);
  await B.click('[data-reiter="freunde"]');
  pruefe('2. Freundschaftsanfrage annehmen - beide sehen sich', (await text(A, '.freund__name')) === 'Ben' && (await text(B, '.freund__name')) === 'Anna');
  pruefe('Hinweis: Anfrage angenommen', (await B.$$eval('.erfolg-toast', (els) => els.map((e) => e.textContent).join(' '))).includes('angenommen'));
  pruefe('Liste zeigt Figur und Level', (await text(A, '.freund__info')).includes('Rocco') && (await text(A, '.freund__info')).includes('Lv 4'));
  pruefe('Onlinestatus: 🟢 Online', (await text(A, '.freund__status')).includes('Online'));
  await bild(A, 'freunde-handy');
  await bild(B, 'freunde-pc');

  console.log('\nNach Neustart und auf neuem Gerät');
  await A.reload();
  await A.waitForSelector('.screen--start .hud__freunde');
  await freundeOeffnen(A);
  await A.waitForSelector('.freund__name');
  pruefe('5. Freundesliste nach Neustart', (await text(A, '.freund__name')) === 'Ben');
  const idAnna = await A.evaluate(() => localStorage.getItem('monsterquest.spieler'));
  const { p: A2, ctx: ctxA2 } = await geraet('Anna-Tablet', 'iPad Mini', stand('Anna'), idAnna);
  await freundeOeffnen(A2);
  await A2.waitForSelector('.freund__name');
  pruefe('Freunde auch auf dem neuen Gerät (übertragener Spielstand)', (await text(A2, '.freund__name')) === 'Ben' && (await text(A2, '.freunde-ich__id')) === idA);
  alleSeiten.delete(A2);
  await ctxA2.close();

  console.log('\n2v2 über die Freundesliste');
  await A.click('[data-aktion="einladen"]');
  await A.waitForSelector('.duell-einladung__code', { timeout: 8000 });
  const code = await text(A, '.duell-einladung__code');
  await A.waitForSelector('.duell-freunde');
  await bild(A, 'lobby-handy');
  pruefe('6. Freund direkt zum 2v2 einladen', (await text(A, '.duell-freunde')).includes('Eingeladen'));
  await nachfragen(B);
  await B.waitForSelector('.overlay--einladung', { timeout: 4000 });
  pruefe('Einladung kommt an (mit Name und Ablaufzeit)', (await text(B, '.overlay--einladung')).includes('Anna') && (await text(B, '.einladung__zeit')).includes('Gilt noch'));
  await bild(B, 'einladung-pc');
  await B.click('.overlay--einladung [data-aktion="annehmen"]');
  await B.waitForSelector('.duell-team', { timeout: 8000 });
  await A.waitForTimeout(800);
  pruefe('7. 2v2-Lobby durch Einladung betreten', (await A.$$('.duell-spieler:not(.duell-spieler--leer)')).length === 2
    && (await text(B, '.duell-einladung__code')) === code);
  await nachfragen(A);
  await A.waitForTimeout(300);
  pruefe('Hinweis: 2v2-Einladung angenommen', (await A.$$eval('.erfolg-toast', (els) => els.map((e) => e.textContent).join(' '))).includes('angenommen'));
  pruefe('Freundesliste verschwindet, sobald Spieler 2 da ist', !(await A.$('.duell-freunde')));
  await A.click('[data-grad="einfach"]');
  await A.click('[data-aktion="bereit"]');
  await B.click('[data-aktion="bereit"]');
  await A.waitForSelector('.screen--duell', { timeout: 8000 });
  await B.waitForSelector('.screen--duell', { timeout: 8000 });
  pruefe('Beide wählen, Kampf startet wie bisher', true);
  await nachfragen(B);
  await nachfragen(A);
  pruefe('Onlinestatus: 🟡 Im Kampf', await A.evaluate(() => import('/js/core/freunde.js').then((m) => m.freundeLage().freunde[0].status === 'kampf')));

  console.log('\nEinladungscode von Hand');
  await A.evaluate(() => import('/js/core/duell-sitzung.js').then((m) => m.aktuelleSitzung()?.verlassen()));
  await B.evaluate(() => import('/js/core/duell-sitzung.js').then((m) => m.aktuelleSitzung()?.verlassen()));
  await A.evaluate(() => import('/js/core/screens.js').then((m) => m.showScreen('duell-lobby')));
  await B.evaluate(() => import('/js/core/screens.js').then((m) => m.showScreen('duell-lobby')));
  await A.click('[data-aktion="erstellen"]');
  await A.waitForSelector('.duell-einladung__code');
  const code2 = await text(A, '.duell-einladung__code');
  await B.fill('.duell-code__feld', code2);
  await B.click('form[data-aktion="beitreten"] button');
  await B.waitForSelector('.duell-team', { timeout: 8000 });
  await A.waitForTimeout(800);
  pruefe('8. Bestehender Einladungscode funktioniert weiter', (await A.$$('.duell-spieler:not(.duell-spieler--leer)')).length === 2);
  await A.click('.topbar button');
  await B.click('.topbar button');

  console.log('\nAblehnen und Entfernen');
  await A.waitForSelector('.screen--start .hud__freunde');
  await A.click('.screen--start .hud__freunde');
  await A.waitForSelector('[data-aktion="einladen"]');
  await A.click('[data-aktion="einladen"]');
  await A.waitForSelector('.duell-freunde');
  await nachfragen(B);
  await B.waitForSelector('.overlay--einladung', { timeout: 4000 });
  await B.click('.overlay--einladung [data-aktion="ablehnen"]');
  await B.waitForTimeout(300);
  await nachfragen(A);
  await A.waitForTimeout(300);
  pruefe('Hinweis: 2v2-Einladung abgelehnt', (await A.$$eval('.erfolg-toast', (els) => els.map((e) => e.textContent).join(' '))).includes('abgelehnt')
    && !(await B.$('.screen--duell-lobby .duell-team')));
  await A.click('.topbar button');
  await A.click('.screen--start .hud__freunde');
  await A.waitForSelector('[data-aktion="entfernen"]');
  await A.click('[data-aktion="entfernen"]');
  pruefe('Entfernen fragt erst nach', (await text(A, '[data-aktion="entfernen"]')).includes('Wirklich'));
  await A.click('[data-aktion="entfernen"]');
  await A.waitForTimeout(400);
  await nachfragen(B);
  pruefe('4. Freund entfernen - bei beiden weg', !(await A.$('.freund__name'))
    && (await B.evaluate(() => import('/js/core/freunde.js').then((m) => m.freundeLage().freunde.length))) === 0);

  console.log('\nOffline');
  await ctxA.setOffline(true);
  await A.evaluate(() => dispatchEvent(new Event('offline')));
  await A.evaluate(() => import('/js/core/screens.js').then((m) => m.showScreen('freunde')));
  await A.waitForTimeout(300);
  pruefe('10. Offline: Freunde sagen Bescheid', (await text(A, '.freunde__hinweis')).includes('offline'));
  await A.click('[data-reiter="hinzufuegen"]');
  pruefe('Offline: Anfragen senden ist gesperrt', await A.$eval('.freunde__suche button', (e) => e.disabled));
  await A.evaluate(() => import('/js/core/screens.js').then((m) => m.showScreen('duell-lobby')));
  await A.click('[data-aktion="solo"]');
  await A.waitForSelector('.duell-team');
  pruefe('Offline: Solo-2v2 mit KI-Partner geht weiter', true);
  await A.evaluate(() => import('/js/core/screens.js').then((m) => m.showScreen('map', { worldId: 1 })));
  await A.waitForSelector('.screen--map');
  pruefe('9. Offline: Abenteuer-Karte öffnet wie immer', true);
  await ctxA.setOffline(false);
} catch (e) {
  fehler++;
  console.log(`  FEHL Abbruch: ${e.message.split('\n')[0]}`);
  if (process.env.MQ_BILD) for (const p of alleSeiten) await p.screenshot({ path: `${process.env.MQ_BILD}-${[...alleSeiten].indexOf(p)}.png` }).catch(() => {});
} finally {
  await browser.close();
  server.kill();
}

pruefe(`Keine Fehler in den Seiten${seitenfehler.length ? `: ${seitenfehler.join(' | ')}` : ''}`, seitenfehler.length === 0);
console.log(`\n${bestanden} bestanden, ${fehler} fehlgeschlagen\n`);
process.exit(fehler ? 1 : 0);
