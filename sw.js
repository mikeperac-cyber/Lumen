/* Lumen service worker — offline-first app shell.
   Versioning: bump VERSION alone to ship a new build. Asset requests carry a ?v=
   cache-buster, but matching and caching below normalize it away (ignoreSearch),
   so index.html query params never need manual coordination with this file. */
const VERSION = 'lumen-cache-v96';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './peerjs.min.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);
function usable(res) {
  // Static hosts (serve, Vercel cleanUrls) 301-redirect /index.html → /. Chromium
  // rejects REDIRECTED responses handed to respondWith() for navigations (net::ERR_FAILED),
  // which broke every offline reload even though the cache "matched". Only hand back
  // clean, un-redirected 200s.
  return res && res.status === 200 && !res.redirected && !REDIRECT_STATUS.has(res.status);
}
async function matchShell() {
  const cands = await Promise.all([caches.match('./'), caches.match('./index.html')]);
  return cands.find(usable) || undefined;
}

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
  if (url.origin !== self.location.origin) return; // let the network handle cross-origin

  // Navigations: network-first, fall back to cached shell when offline
  // or when the network returns an error (captive portals, proxies, 5xx).
  // The refreshed copy is stored under './' — the clean, un-redirected URL.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put('./', copy));
            return res;
          }
          return matchShell();
        })
        .catch(() => matchShell())
    );
    return;
  }

  // Static assets.
  // Versioned URLs (?v=…) change only on release — go network-first so a VERSION
  // bump takes effect on the very next load; cache covers offline. Unversioned
  // statics (icons, manifest) stay cache-first with a background refresh.
  const bare = url.origin + url.pathname;
  if (url.search) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(bare, copy));
          }
          return res;
        })
        .catch(() => caches.match(bare, { ignoreSearch: true }))
    );
    return;
  }
  e.respondWith(
    caches.match(bare, { ignoreSearch: true }).then((cached) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(bare, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
