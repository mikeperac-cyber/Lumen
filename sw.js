/* Lumen service worker — offline-first shell for the built artifact (dist/).
   Versioning: bump VERSION alone to ship a new build; activate deletes older caches.
   Assets are content-hashed by the build, so their URLs change on their own — the
   ?v= handling below is kept only for the unhashed files (index.html, icons). */
const VERSION = 'lumen-cache-v139';
/* SHELL is GENERATED — scripts/postbuild.js rewrites it from the real contents of
   dist/ on every `npm run build`. Do not hand-edit; add files to the build instead. */
const SHELL = [
  './',
  './apple-touch-icon.png',
  './assets/apple-touch-icon-BYj3UHPS.png',
  './assets/core-DNXhjGAD.js',
  './assets/icon-512-BQjM7DSE.png',
  './assets/index-DFKUtqiA.css',
  './assets/index-DfydS3ZF.js',
  './assets/peerjs.min-DPtSHinz.js',
  './assets/rolldown-runtime-BX80bFGj.js',
  './assets/tasks-Cp7Xx5SM.js',
  './assets/vault-worker-DHYv1t_m.js',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './index.html',
  './manifest.webmanifest',
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
      .then((c) => Promise.allSettled(SHELL.map(async (u) => {
        const req = new Request(u, { cache: 'reload' });
        const res = await fetch(req);
        if (res && res.type === 'basic' && res.ok) {
          await c.put(req, res);
        }
      })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        try { await self.registration.navigationPreload.enable(); } catch (_) {}
      }
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let the network handle cross-origin

  // Navigations: network-first with navigationPreload, fall back to cached shell when offline
  // or when the network returns an error (captive portals, proxies, 5xx).
  // The refreshed copy is stored under './' — the clean, un-redirected URL.
  if (req.mode === 'navigate') {
    e.respondWith(
      (async () => {
        try {
          const preload = await e.preloadResponse;
          if (preload && usable(preload)) {
            const copy = preload.clone();
            caches.open(VERSION).then((c) => c.put('./', copy));
            return preload;
          }
        } catch (_) {}
        try {
          const res = await fetch(req);
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put('./', copy));
            return res;
          }
          return (await matchShell()) || res;
        } catch (_) {
          return matchShell();
        }
      })()
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
