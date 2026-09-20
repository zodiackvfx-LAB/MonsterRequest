/**
 * Service Worker von MonsterQuest.
 *
 * Aufgabe: das Spiel offline lauffähig machen und als App installierbar.
 * Wer das Spiel einmal geladen hat, kann es danach ohne Internet öffnen.
 *
 * STRATEGIE
 *   - Gleiche Herkunft (unsere eigenen Dateien): "network-first". Wir holen
 *     immer zuerst die frische Datei aus dem Netz und legen sie in den Cache.
 *     Nur wenn kein Netz da ist, kommt die Datei aus dem Cache. So ist das
 *     Spiel online IMMER aktuell und offline trotzdem spielbar.
 *   - Fremde Herkunft (z. B. die Supabase-Datenbank): NICHT anfassen. Diese
 *     Anfragen laufen ganz normal weiter - der Cache mischt sich nicht ein.
 *
 * AKTUALISIEREN
 *   Bei größeren Änderungen die Versionsnummer erhöhen. Beim Aktivieren
 *   werden dann alle alten Caches gelöscht.
 */

const CACHE = 'monsterquest-v6';

// Das komplette Spiel, das schon beim ersten Besuch fest in den Cache soll -
// alle Seiten, Daten, Bilder. So läuft es auch offline vollständig, sobald die
// Installation einmal (online) durchgelaufen ist.
//
// NEUE DATEI HINZUGEFÜGT? Dann hier ergänzen und CACHE (oben) um eins erhöhen.
// Fehlt eine Datei in dieser Liste, lädt sie online trotzdem und landet dann
// automatisch mit im Cache - nur der allererste Offline-Start kennt sie noch nicht.
const SCHALE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/base.css',
  'css/scenery.css',
  'css/ui.css',
  'css/screens.css',
  'js/core/audio.js',
  'js/core/aufgaben.js',
  'js/core/battle.js',
  'js/core/belohnung.js',
  'js/core/cloud.js',
  'js/core/deck.js',
  'js/core/fighter.js',
  'js/core/haptik.js',
  'js/core/loot.js',
  'js/core/progression.js',
  'js/core/screens.js',
  'js/core/state.js',
  'js/core/statistik.js',
  'js/core/sync.js',
  'js/data/attacks.js',
  'js/data/aufgaben.js',
  'js/data/cloud-config.js',
  'js/data/enemies.js',
  'js/data/erfolge.js',
  'js/data/gegnerarten.js',
  'js/data/items.js',
  'js/data/kraefte.js',
  'js/data/levels.js',
  'js/data/monsters.js',
  'js/data/musik.js',
  'js/data/schwierigkeit.js',
  'js/data/shop.js',
  'js/data/sounds.js',
  'js/data/worlds.js',
  'js/main.js',
  'js/screens/battle.js',
  'js/screens/collection.js',
  'js/screens/daily.js',
  'js/screens/deck.js',
  'js/screens/map.js',
  'js/screens/monster.js',
  'js/screens/settings.js',
  'js/screens/shop.js',
  'js/screens/start.js',
  'js/screens/worlds.js',
  'js/ui/effekte.js',
  'js/ui/hud.js',
  'js/ui/logo-pfade.js',
  'js/ui/parallax.js',
  'js/ui/scenery.js',
  'js/ui/sprite.js',
  'js/ui/toast.js',
  'js/ui/tutorial.js',
  'js/ui/willkommen.js',
  'bilder/app/apple-touch-icon.png',
  'bilder/app/icon-192.png',
  'bilder/app/icon-512-maskable.png',
  'bilder/app/icon-512.png',
  'bilder/menue/deck.png',
  'bilder/menue/einstellungen.png',
  'bilder/menue/figur.png',
  'bilder/menue/sammlung.png',
  'bilder/menue/shop.png',
  'bilder/menue/welten.png',
  'bilder/timo/front.png',
  'bilder/timo/schlag-1.png',
  'bilder/timo/schlag-2.png',
  'bilder/timo/schlag-3.png',
  'bilder/timo/schlag-4.png',
  'bilder/timo/stand.png',
  'bilder/timo/strahl-1.png',
  'bilder/timo/strahl-2.png',
  'bilder/timo/strahl-3.png',
  'bilder/timo/strahl-4.png',
  'bilder/timo/treffer-1.png',
  'bilder/timo/treffer-2.png',
  'bilder/timo/treffer-3.png',
  'bilder/timo/treffer-4.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Einzeln hinzufügen: fehlt eine Datei, soll die Installation trotzdem
      // klappen (addAll würde beim ersten Fehler ganz abbrechen).
      await Promise.all(
        SCHALE.map((url) => cache.add(url).catch(() => {}))
      );
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const namen = await caches.keys();
      await Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Nur einfache GET-Anfragen behandeln.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Fremde Herkunft (Datenbank, andere Server): unberührt lassen.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const antwort = await fetch(request);
        // Nur brauchbare Antworten cachen.
        if (antwort && antwort.ok && antwort.type === 'basic') {
          const cache = await caches.open(CACHE);
          cache.put(request, antwort.clone()).catch(() => {});
        }
        return antwort;
      } catch (fehler) {
        // Kein Netz: aus dem Cache bedienen.
        const treffer = await caches.match(request);
        if (treffer) return treffer;
        // Seitenaufruf ohne Netz und ohne Cache: wenigstens die Startseite.
        if (request.mode === 'navigate') {
          const start = await caches.match('index.html');
          if (start) return start;
        }
        throw fehler;
      }
    })()
  );
});
