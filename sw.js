/**
 * sw.js — WhisperTriage AI offline service worker
 *
 * Placed in /public so Vite copies it verbatim to the build root
 * (service workers must be served from a stable, unhashed URL).
 *
 * The app has no external dependencies at runtime (no model CDN, no
 * API calls), so a simple cache-first strategy over same-origin
 * requests is all that's needed for full offline use after first
 * visit.
 */

const CACHE_NAME = 'whispertriage-shell-v2';
const SCOPE_URL = new URL(self.registration.scope);

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache
        .addAll([SCOPE_URL.pathname, `${SCOPE_URL.pathname}index.html`, `${SCOPE_URL.pathname}manifest.json`])
        .catch(() => {
          // Best-effort precache — a slow/offline first install shouldn't
          // block activation; assets will still be cached on first fetch.
        })
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // no external requests to handle

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return cached || Response.error();
  }
}
