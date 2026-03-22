/// <reference lib="webworker" />
// @ts-nocheck
const CACHE_NAME = 'bega-v1';
const OFFLINE_URL = '/offline.html';

// Static assets to pre-cache on install
const PRECACHE_URLS = [OFFLINE_URL];

// ---------- Install ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ---------- Activate ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---------- Fetch ----------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API, WebSocket, and auth endpoints — always network-only
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/oauth2/') ||
    url.pathname.startsWith('/login/')
  ) {
    return;
  }

  // Skip cross-origin requests (fonts CDN, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): stale-while-revalidate
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});

function isStaticAsset(pathname) {
  return /\.(?:js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico)$/i.test(pathname);
}
