/**
 * Testserver: das Spiel MIT Datenbank, ohne Konto irgendwo.
 *
 *     node werkzeuge/test-datenbank.mjs
 *     -> http://localhost:8124
 *
 * Er tut zwei Dinge gleichzeitig:
 *   1. Er liefert das Spiel aus (wie python3 -m http.server).
 *   2. Er spielt die Datenbank nach - dieselben vier Funktionen wie
 *      datenbank/schema.sql, nur im Arbeitsspeicher statt in Postgres.
 *
 * Die Datei js/data/cloud-config.js wird dabei unterwegs ausgetauscht, damit
 * das Spiel auf diesen Server zeigt. Auf der Festplatte bleibt sie, wie sie
 * ist - du musst also nichts eintragen und nichts zurueckaendern.
 *
 * Unter http://localhost:8124/uebersicht siehst du, was gespeichert wurde.
 *
 * ACHTUNG: Alles liegt nur im Arbeitsspeicher. Beendest du den Server, sind
 * die Spielstaende weg. Zum Ausprobieren gedacht, nicht zum Benutzen.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 8124;
const SCHLUESSEL = 'test-schluessel';

/** id -> { daten, erstellt, gespeichert, speicherungen } */
const spielstaende = new Map();
/** code -> { id, gueltigBis } */
const codes = new Map();

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const CODE_ZEICHEN = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function neuerCode() {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CODE_ZEICHEN[Math.floor(Math.random() * CODE_ZEICHEN.length)];
  }
  return code;
}

function json(antwort, status, wert) {
  const text = JSON.stringify(wert ?? null);
  antwort.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  antwort.end(text);
}

/* ------------------------------------------------------------------ */
/*  Die vier Funktionen - gleiche Regeln wie in schema.sql             */
/* ------------------------------------------------------------------ */

const FUNKTIONEN = {
  mq_speichern({ p_id, p_daten }) {
    if (!p_id) throw new Error('Keine Spielernummer angegeben');
    if (!p_daten || typeof p_daten !== 'object' || Array.isArray(p_daten)) {
      throw new Error('Spielstand muss ein Objekt sein');
    }
    if (Buffer.byteLength(JSON.stringify(p_daten)) > 65536) {
      throw new Error('Spielstand ist zu gross');
    }

    const jetzt = new Date().toISOString();
    const alt = spielstaende.get(p_id);
    spielstaende.set(p_id, {
      daten: p_daten,
      erstellt: alt?.erstellt ?? jetzt,
      gespeichert: jetzt,
      speicherungen: (alt?.speicherungen ?? 0) + 1,
    });
    return jetzt;
  },

  mq_laden({ p_id }) {
    return spielstaende.get(p_id)?.daten ?? null;
  },

  mq_code_erstellen({ p_id }) {
    if (!spielstaende.has(p_id)) {
      throw new Error('Zu dieser Spielernummer gibt es keinen Spielstand');
    }
    const jetzt = Date.now();
    for (const [code, eintrag] of codes) {
      if (eintrag.gueltigBis < jetzt || eintrag.id === p_id) codes.delete(code);
    }
    const code = neuerCode();
    codes.set(code, { id: p_id, gueltigBis: jetzt + 30 * 60 * 1000 });
    return code;
  },

  mq_code_einloesen({ p_code }) {
    const code = String(p_code ?? '').trim().toUpperCase();
    const eintrag = codes.get(code);
    if (!eintrag || eintrag.gueltigBis < Date.now()) return null;
    codes.delete(code); // gilt genau einmal
    return { id: eintrag.id, daten: spielstaende.get(eintrag.id)?.daten ?? null };
  },
};

/* ------------------------------------------------------------------ */
/*  Uebersichtsseite                                                   */
/* ------------------------------------------------------------------ */

function uebersichtSeite() {
  const zeilen = [...spielstaende.entries()]
    .sort((a, b) => b[1].gespeichert.localeCompare(a[1].gespeichert))
    .map(([id, e]) => {
      const d = e.daten ?? {};
      const level = d.characters?.timo?.level ?? '-';
      const name = (d.name || '').replace(/[<>&]/g, '');
      return `<tr><td>${name || '<span style="opacity:.4">—</span>'}</td>`
        + `<td><code>${id.slice(0, 8)}…</code></td><td>${level}</td>`
        + `<td>${d.coins ?? 0}</td><td>${d.unlockedWorld ?? 1}</td>`
        + `<td>${(d.clearedLevels ?? []).length}</td><td>${d.revision ?? 0}</td>`
        + `<td>${e.speicherungen}</td><td>${e.gespeichert.replace('T', ' ').slice(0, 19)}</td></tr>`;
    })
    .join('');

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spielstände</title>
<style>
 body{font-family:system-ui,sans-serif;background:#141c40;color:#e8eeff;margin:0;padding:20px}
 h1{font-size:1.2rem} table{border-collapse:collapse;width:100%;font-size:0.85rem}
 th,td{padding:6px 8px;text-align:left;border-bottom:1px solid #2c3a70}
 th{color:#9fb2e8;font-weight:600} code{color:#ffc53d}
 p{color:#9fb2e8;font-size:0.8rem}
</style></head><body>
<h1>Spielstände · ${spielstaende.size}</h1>
<p>Testserver, nur im Arbeitsspeicher. Seite neu laden zum Aktualisieren.</p>
<table><thead><tr><th>Name</th><th>Nummer</th><th>Level</th><th>Münzen</th><th>Welt</th>
<th>Kämpfe</th><th>Zähler</th><th>Speicherungen</th><th>Zuletzt</th></tr></thead>
<tbody>${zeilen || '<tr><td colspan="9">Noch nichts gespeichert.</td></tr>'}</tbody></table>
</body></html>`;
}

/* ------------------------------------------------------------------ */
/*  Server                                                             */
/* ------------------------------------------------------------------ */

const server = createServer(async (anfrage, antwort) => {
  const adresse = new URL(anfrage.url, `http://${anfrage.headers.host}`);
  const weg = decodeURIComponent(adresse.pathname);

  if (anfrage.method === 'OPTIONS') return json(antwort, 204, null);

  /* --- Datenbank --- */
  if (weg.startsWith('/rest/v1/rpc/')) {
    const name = weg.slice('/rest/v1/rpc/'.length);
    const schluessel = anfrage.headers.apikey ?? adresse.searchParams.get('apikey');
    if (schluessel !== SCHLUESSEL) {
      return json(antwort, 401, { message: 'Kein gueltiger Schluessel' });
    }
    if (!FUNKTIONEN[name]) return json(antwort, 404, { message: `Unbekannt: ${name}` });

    let koerper = '';
    for await (const teil of anfrage) koerper += teil;
    try {
      const ergebnis = FUNKTIONEN[name](koerper ? JSON.parse(koerper) : {});
      return json(antwort, 200, ergebnis);
    } catch (fehler) {
      return json(antwort, 400, { message: fehler.message });
    }
  }

  if (weg === '/uebersicht') {
    antwort.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return antwort.end(uebersichtSeite());
  }

  /* --- Die Zugangsdaten unterwegs einsetzen --- */
  if (weg === '/js/data/cloud-config.js') {
    antwort.writeHead(200, { 'Content-Type': TYPEN['.js'], 'Cache-Control': 'no-store' });
    return antwort.end(
      `/* Vom Testserver eingesetzt - siehe werkzeuge/test-datenbank.mjs */\n`
      + `export const CLOUD = {\n`
      + `  url: ${JSON.stringify(`http://localhost:${PORT}`)},\n`
      + `  schluessel: ${JSON.stringify(SCHLUESSEL)},\n`
      + `};\n`
    );
  }

  /* --- Das Spiel --- */
  const datei = weg === '/' ? '/index.html' : weg;
  // normalize verhindert, dass jemand ueber ../ aus dem Ordner herauskommt.
  const ziel = join(WURZEL, normalize(datei).replace(/^(\.\.[/\\])+/, ''));
  if (!ziel.startsWith(WURZEL.endsWith(sep) ? WURZEL : WURZEL + sep)) {
    antwort.writeHead(403);
    return antwort.end('Verboten');
  }

  try {
    const inhalt = await readFile(ziel);
    antwort.writeHead(200, {
      'Content-Type': TYPEN[extname(ziel)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    antwort.end(inhalt);
  } catch {
    antwort.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    antwort.end('Nicht gefunden');
  }
});

server.listen(PORT, () => {
  console.log(`Spiel mit Datenbank:  http://localhost:${PORT}`);
  console.log(`Gespeicherte Staende: http://localhost:${PORT}/uebersicht`);
});
