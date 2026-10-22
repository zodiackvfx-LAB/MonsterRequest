/**
 * Browser-Test: Passen die Fenster auf den Bildschirm?
 *
 *     node tests/fenster-browser.test.mjs
 *
 * Braucht Playwright mit Chromium (wie tests/duell-browser.test.mjs). Ohne
 * Playwright wird der Test übersprungen. Gewinnt einen echten Kampf auf
 * kleinen und großen Handys (hochkant und quer) und prüft: Das
 * Siegesfenster scrollt nicht, und "Weiter" ist zu sehen - auch wenn
 * zusätzlich Aufstieg, neue Welt, Boss-Kraft und Erfolge darin stehen
 * (js/ui/einpassen.js). Dazu: Die Spielerleiste passt mit großen Zahlen
 * auch auf schmale Handys.
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

const PORT = 8129;
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

/** Kurz vor dem nächsten Level - der Sieg bringt einen Aufstieg. */
const STAND = {
  name: 'Zodiackvfx', unlockedWorld: 1, clearedLevels: [], coins: 99999, trophaeen: 12000, gesehen: { kampf: true },
  characters: { timo: { level: 11, xp: 9999 } }, settings: { musik: false, sound: false },
};

/** Liegt das Fenster ganz im Bild, ohne darin zu scrollen? */
const lage = (p) => p.evaluate(() => {
  const knopf = document.querySelector('.overlay--ergebnis #btn-next');
  const box = knopf.closest('.overlay__box');
  const b = box.getBoundingClientRect();
  const k = knopf.getBoundingClientRect();
  return {
    scrollt: box.scrollHeight > box.clientHeight + 1,
    imBild: b.top >= 0 && b.bottom <= innerHeight + 1 && k.bottom <= b.bottom + 1,
  };
});

// MQ_BROWSER=webkit: derselbe Test mit der Safari-Engine (iPhone, iPad, Mac).
const browser = await (process.env.MQ_BROWSER === 'webkit' ? webkit : chromium).launch();
const seitenfehler = [];
try {
  for (const geraet of ['iPhone SE', 'iPhone 13', 'iPhone 13 landscape']) {
    console.log(`\n${geraet}`);
    const ctx = await browser.newContext({ ...devices[geraet] });
    await ctx.route(/supabase\.co/, (r) => r.abort());
    await ctx.addInitScript((s) => localStorage.setItem('monsterquest.save.v3', JSON.stringify(s)), STAND);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => seitenfehler.push(`${geraet}: ${e.message}`));
    await p.goto(`${ADRESSE}/`);
    await p.waitForSelector('.screen--start');

    if (!geraet.includes('landscape')) {
      const leiste = await p.evaluate(() => {
        const teile = [...document.querySelectorAll('.screen--start .hud > *, .screen--start .hud__rechts > *')].filter((e) => e.offsetParent);
        return Math.max(...teile.map((e) => e.getBoundingClientRect().right)) <= innerWidth;
      });
      pruefe('Spielerleiste passt (12000 Trophäen, 99999 Münzen)', leiste);
    }

    await p.evaluate(() => import('/js/core/screens.js').then((m) => m.showScreen('battle', { levelId: '1-1' })));
    for (let i = 0; i < 400 && !(await p.$('.overlay--ergebnis #btn-next')); i++) {
      const karten = await p.$$('.hand .card.is-ready');
      if (karten.length) await karten[0].click({ timeout: 500 }).catch(() => {});
      await p.waitForTimeout(150);
    }
    await p.waitForTimeout(1500);
    const echt = await lage(p);
    pruefe('Siegesfenster: alles im Bild, kein Scrollen', !echt.scrollt && echt.imBild);

    // Der volle Fall: neue Welt, Boss-Kraft und mehrere Erfolge zusätzlich.
    await p.evaluate(() => {
      const ziel = document.querySelector('.ergebnis-spalte--rechts') ?? document.querySelector('.overlay--ergebnis .overlay__box');
      const d = document.createElement('div');
      d.innerHTML = '<p class="overlay__unlock">🎉 Neue Welt freigeschaltet:<br><strong>🌲 Zauberwald</strong></p>'
        + '<p class="overlay__unlock overlay__unlock--kraft">🔥 <strong>Neue Boss-Kraft: Inferno!</strong><br>Ein Feuersturm.<br><small>Ausrüsten unter „Figur“.</small></p>'
        + '<p class="overlay__unlock overlay__unlock--erfolg">🏆 <strong>Erfolg: Erster Sieg!</strong><br><small>Gewinne einen Kampf.</small></p>';
      ziel.append(...d.children);
    });
    await p.waitForTimeout(600);
    const voll = await lage(p);
    pruefe('Volles Siegesfenster: "Weiter" bleibt im Bild', voll.imBild);
    await ctx.close();
  }
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
