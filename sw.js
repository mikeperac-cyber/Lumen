/* Lumen service worker — offline-first app shell. */
const VERSION = 'lumen-cache-v86';
const SHELL = [
  './',
  './index.html',
  './styles.css?v=86',
  './app.js?v=86',
  './peerjs.min.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let the network handle cross-origin (PeerJS CDN)

  // Navigations: network-first, fall back to cached shell when offline
  // or when the network returns an error (captive portals, proxies, 5xx).
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put('./index.html', copy));
            return res;
          }
          return caches.match('./index.html');
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets: serve cache immediately, refresh in the background.
  e.respondWith(
    caches.match(req).then((cached) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
