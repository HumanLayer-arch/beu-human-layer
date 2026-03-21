/* ================================================================
   SERVICE WORKER - Be U
   Caches app shell for offline support.
   ================================================================ */

var CACHE_NAME = 'beu-v1';

// Files to cache for offline app shell
var SHELL_FILES = [
  '/',
  '/index.html',
  '/app.js',
  '/hl-engine.js',
  '/onboarding.js',
  '/habit.js',
  '/manifest.json'
];

/* ── INSTALL: cache app shell ─────────────────────────────────── */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_FILES);
    }).then(function() {
      return self.skipWaiting(); // Activate immediately
    })
  );
});

/* ── ACTIVATE: clean old caches ───────────────────────────────── */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim(); // Take control immediately
    })
  );
});

/* ── FETCH: cache-first for shell, network-first for API ──────── */
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Let API calls go through (never cache)
  if (url.pathname.startsWith('/api/')) return;

  // Network-first for navigation requests (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          var toCache = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, toCache);
          });
        }
        return response;
      });
    })
  );
});
