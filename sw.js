const CACHE_NAME = 'odak-not-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './focus-studio.css',
  './storage.js',
  './canvas-tools.js',
  './pdf-engine.js',
  './ai-study.js',
  './quiz.js',
  './app.js',
  './focus-studio.js',
  './graph.js',
  './pro-tools.js',
  './manifest.webmanifest',
  './favicon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(CORE_ASSETS.map(url => cache.add(url)))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Gemini API isteklerini önbelleğe alma
  if (url.hostname.includes('googleapis.com') && url.pathname.includes('generateContent')) return;

  // Ağ öncelikli (güncellemeleri anında alır), çevrimdışıysa önbellekten sunar
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && (url.origin === location.origin || url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('fonts.'))) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
