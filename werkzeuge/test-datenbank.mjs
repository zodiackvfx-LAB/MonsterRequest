/**
 * Testserver: das Spiel MIT Datenbank, ohne Konto irgendwo.
 *
 *     node werkzeuge/test-datenbank.mjs
 *     -> http://localhost:8124
 *
 * Er tut zwei Dinge gleichzeitig:
 *   1. Er liefert das Spiel aus (wie python3 -m http.server).
 *   2. Er spielt die Datenbank nach - dieselben Funktionen wie
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
import { randomUUID } from 'node:crypto';
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
// 2v2: welche Belohnungen schon geholt wurden ("match|spieler").
const duellBelohnungen = new Set();
// Freunde - gleiche Regeln wie im Abschnitt "Freunde" von schema.sql.
/** id -> Freundes-ID und zurueck */
const kennungen = new Map();
const kennungZuId = new Map();
/** "a|b" mit a < b */
const freundschaften = new Set();
/** "von|an" -> Zeitpunkt */
const anfragen = new Map();
/** id -> { von, an, code, gueltigBis, antwort, gemeldet, erstellt } */
const einladungen = new Map();
/** id -> { zustand, zuletzt } */
const anwesenheit = new Map();
/** Wiederherstellungs-Code (ohne Striche) -> id; je Spieler hoechstens einer. */
const wiederherstellung = new Map();

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
/*  Die Funktionen - gleiche Regeln wie in schema.sql                  */
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
      rang: rangNachfuehren(alt?.rang, p_daten),
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
  // Gleiche Regeln wie mq_rangliste in schema.sql: nur Name, Trophaeen und
  // Platz; Ausgeblendete und Spieler ohne Trophaeen fehlen.
  mq_rangliste({ p_id, p_anzahl }) {
    const zahl = (wert) => (/^-?\d+(\.\d+)?$/.test(String(wert ?? '')) ? Number(wert) : 0);
    const liste = [...spielstaende.entries()]
      .filter(([, e]) => String(e.daten?.settings?.rangliste ?? true) !== 'false')
      .map(([id, e]) => ({
        id,
        name: (String(e.daten?.name ?? '').trim() || 'Spieler').slice(0, 16),
        // Nie mehr als das erspielte Guthaben (wie in schema.sql).
        trophaeen: Math.floor(Math.min(100000, Math.max(0, zahl(e.daten?.trophaeen)), e.rang?.erlaubt ?? 0)),
        gespeichert: e.gespeichert,
      }))
      .filter((e) => e.trophaeen > 0)
      .sort((a, b) => b.trophaeen - a.trophaeen || a.gespeichert.localeCompare(b.gespeichert));
    liste.forEach((e, i) => {
      e.platz = i > 0 && liste[i - 1].trophaeen === e.trophaeen ? liste[i - 1].platz : i + 1;
    });
    const anzahl = Math.min(100, Math.max(1, Number(p_anzahl) || 50));
    const ich = liste.find((e) => e.id === p_id);
    return {
      spitze: liste.slice(0, anzahl).map((e) => ({ platz: e.platz, name: e.name, trophaeen: e.trophaeen, ich: e.id === p_id })),
      ich: ich ? { platz: ich.platz, trophaeen: ich.trophaeen } : null,
      spieler: liste.length,
    };
  },

  // Gleiche Regeln wie mq_duell_belohnung in schema.sql: jedes Paar aus
  // Match und Spieler genau einmal.
  mq_duell_belohnung({ p_id, p_match, p_daten }) {
    if (!p_id) throw new Error('Keine Spielernummer angegeben');
    if (typeof p_match !== 'string' || !/^[a-z0-9-]{8,80}$/.test(p_match)) throw new Error('Ungueltige Match-Kennung');
    if (p_daten != null && (typeof p_daten !== 'object' || Array.isArray(p_daten))) throw new Error('Ungueltige Match-Daten');
    const schluessel = `${p_match}|${p_id}`;
    if (duellBelohnungen.has(schluessel)) return false;
    duellBelohnungen.add(schluessel);
    return true;
  },

  // Gleiche Regeln wie im Abschnitt "Wiederherstellungs-Code" von
  // schema.sql (dort nur als Fingerabdruck gespeichert).
  mq_wiederherstellung_erstellen({ p_id }) {
    spielerPruefen(p_id);
    for (const [code, id] of wiederherstellung) if (id === p_id) wiederherstellung.delete(code);
    let code;
    do {
      code = '';
      for (let i = 0; i < 12; i++) code += CODE_ZEICHEN[Math.floor(Math.random() * CODE_ZEICHEN.length)];
    } while (wiederherstellung.has(code));
    wiederherstellung.set(code, p_id);
    return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
  },

  mq_wiederherstellung_status({ p_id }) {
    return [...wiederherstellung.values()].includes(p_id);
  },

  mq_wiederherstellen({ p_code }) {
    const code = String(p_code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const id = code.length === 12 ? wiederherstellung.get(code) : null;
    if (!id || !spielstaende.has(id)) return null;
    return { id, daten: spielstaende.get(id).daten };
  },

  mq_freunde({ p_id, p_zustand }) {
    spielerPruefen(p_id);
    kennungVon(p_id);
    if (p_zustand === 'online' || p_zustand === 'kampf') anwesenheit.set(p_id, { zustand: p_zustand, zuletzt: Date.now() });
    const jetzt = Date.now();
    const antworten = [];
    for (const e of einladungen.values()) {
      if (e.von === p_id && e.antwort !== 'offen' && !e.gemeldet) {
        e.gemeldet = true;
        antworten.push({ ...profil(e.an), angenommen: e.antwort === 'angenommen' });
      }
    }
    const freunde = [...freundschaften]
      .map((paar) => paar.split('|'))
      .filter((paar) => paar.includes(p_id))
      .map((paar) => (paar[0] === p_id ? paar[1] : paar[0]))
      .map((id) => {
        const a = anwesenheit.get(id);
        const status = !a || a.zuletzt < jetzt - 90000 ? 'offline' : a.zustand === 'kampf' ? 'kampf' : 'online';
        return { ...profil(id), status };
      });
    const anfragenListe = [...anfragen.entries()].sort((x, y) => y[1] - x[1]).map(([k]) => k.split('|'));
    return {
      kennung: kennungVon(p_id),
      freunde,
      erhalten: anfragenListe.filter(([, an]) => an === p_id).map(([von]) => profil(von)),
      gesendet: anfragenListe.filter(([von]) => von === p_id).map(([, an]) => profil(an)),
      einladungen: [...einladungen.entries()]
        .filter(([, e]) => e.an === p_id && e.antwort === 'offen' && e.gueltigBis > jetzt && befreundet(e.von, p_id))
        .map(([id, e]) => ({ ...profil(e.von), id, code: e.code, sekunden: Math.floor((e.gueltigBis - jetzt) / 1000) })),
      antworten,
    };
  },

  mq_freund_suchen({ p_id, p_kennung }) {
    spielerPruefen(p_id);
    const freund = idVon(p_kennung);
    if (!freund) return null;
    return {
      ...profil(freund),
      ich: freund === p_id,
      freund: befreundet(p_id, freund),
      gesendet: anfragen.has(`${p_id}|${freund}`),
      erhalten: anfragen.has(`${freund}|${p_id}`),
    };
  },

  mq_anfrage_senden({ p_id, p_kennung }) {
    spielerPruefen(p_id);
    kennungVon(p_id);
    const freund = idVon(p_kennung);
    if (!freund) return 'unbekannt';
    if (freund === p_id) return 'selbst';
    if (befreundet(p_id, freund)) return 'schon_freunde';
    if (anfragen.has(`${freund}|${p_id}`)) return 'gegenanfrage';
    if (anfragen.has(`${p_id}|${freund}`)) return 'schon_gesendet';
    anfragen.set(`${p_id}|${freund}`, Date.now());
    return 'gesendet';
  },

  mq_anfrage_antworten({ p_id, p_kennung, p_annehmen }) {
    spielerPruefen(p_id);
    const freund = idVon(p_kennung);
    if (!freund || !anfragen.delete(`${freund}|${p_id}`)) return false;
    if (p_annehmen) {
      freundschaften.add(paar(p_id, freund));
      anfragen.delete(`${p_id}|${freund}`);
    }
    return true;
  },

  mq_anfrage_zurueckziehen({ p_id, p_kennung }) {
    spielerPruefen(p_id);
    return anfragen.delete(`${p_id}|${idVon(p_kennung)}`);
  },

  mq_freund_entfernen({ p_id, p_kennung }) {
    spielerPruefen(p_id);
    const freund = idVon(p_kennung);
    if (!freund) return false;
    for (const [id, e] of einladungen) {
      if (e.antwort === 'offen' && [e.von, e.an].includes(p_id) && [e.von, e.an].includes(freund)) einladungen.delete(id);
    }
    return freundschaften.delete(paar(p_id, freund));
  },

  mq_einladung_senden({ p_id, p_kennung, p_code }) {
    spielerPruefen(p_id);
    if (typeof p_code !== 'string' || !/^[A-Z0-9]{6}$/.test(p_code)) throw new Error('Ungueltiger Lobby-Code');
    const freund = idVon(p_kennung);
    if (!freund || !befreundet(p_id, freund)) return 'kein_freund';
    for (const [id, e] of einladungen) {
      if (e.von === p_id && e.antwort === 'offen' && (e.an === freund || e.code !== p_code)) einladungen.delete(id);
    }
    einladungen.set(randomUUID(), { von: p_id, an: freund, code: p_code, gueltigBis: Date.now() + 5 * 60 * 1000, antwort: 'offen', gemeldet: false });
    return 'gesendet';
  },

  mq_einladung_antworten({ p_id, p_einladung, p_annehmen }) {
    spielerPruefen(p_id);
    const e = einladungen.get(p_einladung);
    if (!e || e.an !== p_id || e.antwort !== 'offen' || e.gueltigBis <= Date.now() || !befreundet(e.von, p_id)) return null;
    e.antwort = p_annehmen ? 'angenommen' : 'abgelehnt';
    if (!p_annehmen) return 'abgelehnt';
    for (const [id, andere] of einladungen) {
      if (andere.an === p_id && andere.antwort === 'offen' && id !== p_einladung) andere.antwort = 'abgelehnt';
    }
    return e.code;
  },
};

/* --- Trophaeen-Guthaben fuer die Rangliste (wie mq_speichern) -------- */

/** Trophaeen fuer den ersten Sieg in einem Level - wie mq_level_trophaeen. */
function levelTrophaeen(id) {
  const teile = /^(\d{1,2})-(\d{1,2})$/.exec(String(id));
  if (!teile) return 0;
  const welt = Number(teile[1]);
  const kampf = Number(teile[2]);
  if (welt < 1 || welt > 50 || kampf < 1 || kampf > 20) return 0;
  return (10 + 5 * welt) * (kampf >= 12 ? 2 : 1);
}

/** Neue Level bringen ihre Trophaeen, weitere Siege je 4 (hoechstens einer je 10 s). */
function rangNachfuehren(alt, daten) {
  const levels = [...new Set(Array.isArray(daten.clearedLevels) ? daten.clearedLevels : [])].filter((x) => levelTrophaeen(x) > 0);
  const siegeWert = Number(daten.statistik?.siege);
  const siege = Number.isFinite(siegeWert) ? Math.max(0, Math.floor(siegeWert)) : 0;
  const summe = (liste) => liste.reduce((s, x) => s + levelTrophaeen(x), 0);
  const jetzt = Date.now();
  if (!alt) {
    return { erlaubt: summe(levels) + 4 * Math.min(Math.max(siege - levels.length, 0), 250), siege, levels, am: jetzt };
  }
  const neue = levels.filter((x) => !alt.levels.includes(x));
  const siegePlus = Math.min(Math.max(siege - alt.siege - neue.length, 0), Math.floor((jetzt - alt.am) / 10000) + 1);
  return {
    erlaubt: Math.min(alt.erlaubt + summe(neue) + 4 * siegePlus, 100000),
    siege: Math.max(alt.siege, siege),
    levels: [...alt.levels, ...neue],
    am: jetzt,
  };
}

/* --- Helfer fuer die Freunde ---------------------------------------- */

function spielerPruefen(id) {
  if (!id || !spielstaende.has(id)) throw new Error('kein_spielstand');
}

function kennungVon(id) {
  if (!kennungen.has(id)) {
    let kennung;
    do kennung = `MQ-${10000 + Math.floor(Math.random() * 90000)}`;
    while (kennungZuId.has(kennung));
    kennungen.set(id, kennung);
    kennungZuId.set(kennung, id);
  }
  return kennungen.get(id);
}

function idVon(kennung) {
  return kennungZuId.get(String(kennung ?? '').replace(/\s/g, '').toUpperCase()) ?? null;
}

function paar(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function befreundet(a, b) {
  return freundschaften.has(paar(a, b));
}

/** Was andere ueber einen Spieler sehen - wie mq_profil. */
function profil(id) {
  const d = spielstaende.get(id)?.daten ?? {};
  const figur = String(d.aktiveFigur ?? 'timo').slice(0, 20);
  const level = Number(d.characters?.[figur]?.level);
  return {
    kennung: kennungen.get(id),
    name: (String(d.name ?? '').trim() || 'Spieler').slice(0, 16),
    figur,
    level: Math.min(999, Math.max(1, Number.isFinite(level) ? Math.floor(level) : 1)),
    skin: typeof d.activeSkin?.[figur] === 'string' ? d.activeSkin[figur].slice(0, 60) : null,
  };
}

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
