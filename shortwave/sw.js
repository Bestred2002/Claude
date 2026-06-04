// Service worker: cache dell'app-shell per avvio offline.
// I ricevitori SDR vivono su altri server e si aprono in una scheda esterna,
// quindi NON vengono (e non possono essere) messi in cache qui.
const CACHE = 'onde-corte-v2';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './receivers.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Solo richieste same-origin dell'app-shell: cache-first con fallback rete.
  if (e.request.method === 'GET' && url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request))
    );
  }
});
