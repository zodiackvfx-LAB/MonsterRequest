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

const CACHE = 'monsterquest-v36';

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
  'werkstatt.html',
  'manifest.webmanifest',
  'css/base.css',
  'css/scenery.css',
  'css/ui.css',
  'css/screens.css',
  'css/erlebnis.css',
  'css/duell.css',
  'css/werkstatt.css',
  'js/core/audio.js',
  'js/core/aufgaben.js',
  'js/core/battle.js',
  'js/core/belohnung.js',
  'js/core/cloud.js',
  'js/core/deck.js',
  'js/core/duell.js',
  'js/core/duell-aufbau.js',
  'js/core/duell-belohnung.js',
  'js/core/duell-ki.js',
  'js/core/duell-sitzung.js',
  'js/core/eigene-skins.js',
  'js/core/fighter.js',
  'js/core/freunde.js',
  'js/core/haptik.js',
  'js/core/loot.js',
  'js/core/modi.js',
  'js/core/netz.js',
  'js/core/outfit.js',
  'js/core/progression.js',
  'js/core/screens.js',
  'js/core/sortierung.js',
  'js/core/state.js',
  'js/core/statistik.js',
  'js/core/studio-teile.js',
  'js/core/sync.js',
  'js/core/trophaeen.js',
  'js/core/truhenplaetze.js',
  'js/core/zeittruhen.js',
  'js/core/zufall.js',
  'js/data/arena.js',
  'js/data/attacks.js',
  'js/data/aufgaben.js',
  'js/data/cloud-config.js',
  'js/data/duell.js',
  'js/data/enemies.js',
  'js/data/erfolge.js',
  'js/data/gegnerarten.js',
  'js/data/items.js',
  'js/data/karten.js',
  'js/data/kraefte.js',
  'js/data/levels.js',
  'js/data/modi.js',
  'js/data/monsters.js',
  'js/data/musik.js',
  'js/data/schwierigkeit.js',
  'js/data/shop.js',
  'js/data/spielmodi.js',
  'js/data/sounds.js',
  'js/data/studio-teile.js',
  'js/data/timo-skins.js',
  'js/data/trophaeen.js',
  'js/data/worlds.js',
  'js/main.js',
  'js/werkstatt.js',
  'js/screens/arena.js',
  'js/screens/battle.js',
  'js/screens/collection.js',
  'js/screens/daily.js',
  'js/screens/deck.js',
  'js/screens/duell.js',
  'js/screens/duell-lobby.js',
  'js/screens/freunde.js',
  'js/screens/lobby.js',
  'js/screens/map.js',
  'js/screens/monster.js',
  'js/screens/rangliste.js',
  'js/screens/settings.js',
  'js/screens/shop.js',
  'js/screens/start.js',
  'js/screens/worlds.js',
  'js/ui/duell-ansicht.js',
  'js/ui/effekte.js',
  'js/ui/einpassen.js',
  'js/ui/freunde-hinweise.js',
  'js/ui/hud.js',
  'js/ui/kampfintro.js',
  'js/ui/logo-pfade.js',
  'js/ui/outfit-bilder.js',
  'js/ui/parallax.js',
  'js/ui/scenery.js',
  'js/ui/spielmodi.js',
  'js/ui/sprite.js',
  'js/ui/toast.js',
  'js/ui/truhe-oeffnen.js',
  'js/ui/truhen.js',
  'js/ui/tutorial.js',
  'js/ui/umgebung.js',
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
        // cache: 'no-cache' = beim Server nachfragen, ob es eine neuere
        // Fassung gibt. Ohne das nahm der Browser bis zu 10 Minuten lang
        // seine alte Kopie (GitHub Pages: max-age=600) - und mischte dabei
        // alte und neue Dateien. Ist nichts neu, kommt nur ein kurzes "304".
        const antwort = await fetch(request, { cache: 'no-cache' });
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
