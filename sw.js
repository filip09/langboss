// Lang Boss Service Worker
const CACHE = 'langboss-v2';
const PRECACHE = [
  '/',
  '/images/favicon.webp',
  '/images/lifeBoss.webp',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // External APIs (Google Sheets, analytics, fonts): don't touch
  if (url.origin !== self.location.origin) return;

  // Static assets: cache-first
  const isAsset = ['image', 'font', 'style', 'script'].includes(e.request.destination);
  if (isAsset) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }))
    );
    return;
  }

  // Pages and everything else: network-first, cache as offline fallback
  e.respondWith(
    fetch(e.request).then(resp => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/')))
  );
});
