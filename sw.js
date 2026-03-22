/* ================================================================
SERVICE WORKER - Be U v3
================================================================ /

var CACHE = 'beu-v3';

var SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/hl-engine.js',
  '/onboarding.js',
  '/habit.js',
  '/manifest.json'
];

/ ── INSTALL ───────────────────────────────── /
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        return c.addAll(SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

/ ── ACTIVATE ──────────────────────────────── /
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/ ── FETCH ─────────────────────────────────── /
self.addEventListener('fetch', function (e) {

  var url = new URL(e.request.url);

  / API → siempre red /
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  / Navegación → network-first /
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(function () {
        return caches.match('/index.html');
      })
    );
    return;
  }

  / Assets → cache-first */
  e.respondWith(
    caches.match(e.request).then(function (cached) {

      if (cached) return cached;

      return fetch(e.request).then(function (res) {

        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) {
            c.put(e.request, clone);
          });
        }

        return res;

      }).catch(function () {
        return cached;
      });

    })
  );

});
