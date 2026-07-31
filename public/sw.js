const CACHE = 'arco-v3';
const SHELL = ['/', '/manifest.json',
  '/icon-192.png', '/icon-512.png',
  '/icon-192-maskable.png', '/icon-512-maskable.png',
  '/apple-touch-icon.png', '/icon-favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  // Take control immediately without waiting
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete all old caches
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network first for HTML — always get fresh app
  if(e.request.destination === 'document'){
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache first for assets
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Listen for skip waiting message
self.addEventListener('message', e => {
  if(e.data && e.data.action === 'skipWaiting') self.skipWaiting();
});
