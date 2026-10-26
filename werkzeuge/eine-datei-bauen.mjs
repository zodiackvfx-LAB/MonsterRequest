/**
 * Baut das ganze Spiel in EINE einzige HTML-Datei: dist/MonsterQuest.html
 *
 *     node werkzeuge/eine-datei-bauen.mjs
 *
 * Das Projekt selbst bleibt dabei unverändert - die Einzeldatei wird nur
 * zusätzlich daraus erzeugt. Weiterentwickelt wird wie bisher in js/, css/
 * und bilder/; danach einfach neu bauen.
 *
 * Was passiert:
 *   1. Alle JavaScript-Module werden mit esbuild zu einem Skript gebündelt
 *      (wird beim ersten Mal über npx geladen - dafür braucht es einmal Netz).
 *   2. Die CSS-Dateien kommen in der richtigen Reihenfolge in einen
 *      <style>-Block.
 *   3. Bilder und Schriften werden als data:-Adressen direkt eingebettet.
 *
 * Die fertige Datei läuft per Doppelklick, ganz ohne Webserver - auch
 * offline. Nur zwei Dinge gehen in der Einzeldatei nicht: das Installieren
 * als App (Service Worker) und - je nach Browser - die Datenbank-Anbindung,
 * wenn die Datei direkt vom Gerät geöffnet wird.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ZIEL = join(WURZEL, 'dist', 'MonsterQuest.html');
const CSS = ['css/base.css', 'css/scenery.css', 'css/ui.css', 'css/screens.css', 'css/erlebnis.css', 'css/duell.css', 'css/weltkarte.css'];
const ESBUILD = 'esbuild@0.24.0';

const MIME = { png: 'image/png', woff2: 'font/woff2', svg: 'image/svg+xml', jpg: 'image/jpeg' };

/** Eine Datei als data:-Adresse. */
function dataUrl(pfad) {
  const endung = pfad.split('.').pop().toLowerCase();
  const inhalt = readFileSync(join(WURZEL, pfad)).toString('base64');
  return `data:${MIME[endung] ?? 'application/octet-stream'};base64,${inhalt}`;
}

/* ---------- 1. JavaScript bündeln ---------- */
let js = execFileSync(
  'npx',
  ['--yes', ESBUILD, 'js/main.js', '--bundle', '--format=esm', '--charset=utf8', '--legal-comments=none'],
  { cwd: WURZEL, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);

// Bildadressen in Zeichenketten ('bilder/timo/front.png') einbetten - aber
// nur, wenn es die Datei wirklich gibt (Beispiele in Kommentaren bleiben).
let bilder = 0;
js = js.replace(/(["'])(bilder\/[\w/.-]+\.(?:png|jpg|svg))\1/g, (treffer, q, pfad) => {
  if (!existsSync(join(WURZEL, pfad))) return treffer;
  bilder++;
  return `${q}${dataUrl(pfad)}${q}`;
});

// Ein "</script>" im Code würde den Skriptblock vorzeitig beenden.
js = js.replace(/<\/script/gi, '<\\/script');

/* ---------- 2. CSS zusammenlegen ---------- */
let css = CSS.map((datei) => `/* ===== ${datei} ===== */\n${readFileSync(join(WURZEL, datei), 'utf8')}`).join('\n');
css = css.replace(/url\((['"]?)\.\.\/((?:fonts|bilder)\/[\w/.-]+)\1\)/g, (treffer, q, pfad) =>
  existsSync(join(WURZEL, pfad)) ? `url("${dataUrl(pfad)}")` : treffer
);

/* ---------- 3. HTML zusammensetzen ---------- */
const icon = dataUrl('bilder/app/icon-192.png');
const touchIcon = dataUrl('bilder/app/apple-touch-icon.png');
const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
  <meta name="theme-color" content="#0d1430">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="MonsterQuest">
  <title>MonsterQuest</title>
  <!-- Automatisch gebaut aus dem Projekt (werkzeuge/eine-datei-bauen.mjs).
       Nicht von Hand bearbeiten - Änderungen gehören in js/, css/, bilder/. -->
  <link rel="apple-touch-icon" href="${touchIcon}">
  <link rel="icon" type="image/png" href="${icon}">
  <style>
${css}
  </style>
</head>
<body>
  <div id="app" class="app"></div>
  <script type="module">
${js}
  </script>
</body>
</html>
`;

mkdirSync(dirname(ZIEL), { recursive: true });
writeFileSync(ZIEL, html);
const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log(`Fertig: dist/MonsterQuest.html (${kb} KB, ${bilder} Bilder eingebettet)`);
