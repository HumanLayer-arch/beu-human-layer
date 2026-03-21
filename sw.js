const CACHE = 'beu-v2';

const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/hl-engine.js',
  '/onboarding.js',
  '/habit.js',
  '/analytics.js',
  '/push.js',
  '/manifest.json'
];

// INSTALL
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;

  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});

/* 🔔 PUSH NOTIFICATIONS */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data.json(); } catch {}

  const title = data.title || 'Be U';
  const options = {
    body: data.body || 'Nueva reflexión disponible',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
