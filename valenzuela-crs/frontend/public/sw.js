/* =====================================================================
   Valenzuela CRS — service worker (app shell)

   Scope is deliberately narrow so it never interferes with live data:

   • Static build assets (/assets/*, fonts, icons, favicon) → cache-first,
     so the shell loads fast and works offline.
   • Page navigations → network-first, falling back to the cached shell
     when the user is offline (SPA still opens, routes render).
   • API calls (/api/*, /uploads/*) and cross-origin requests → never
     cached, never intercepted for caching: private per-user data stays
     out of the cache, and Gemini/AI traffic always hits the network.
   ===================================================================== */

const VERSION = 'valenzuela-crs-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon-180.png',
];

const isApiRequest = (url) =>
  url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/');

/* Precache the app shell. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

/* Drop caches from older versions. */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // cross-origin: leave alone
  if (isApiRequest(url)) return;                    // API/uploads: always network

  // Page navigations: network-first, offline → cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || Response.error())
        )
    );
    return;
  }

  // Static assets (hashed build files, icons, fonts): cache-first, refresh in background.
  const isAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(js|css|svg|png|jpg|jpeg|webp|woff2?)$/.test(url.pathname);

  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
