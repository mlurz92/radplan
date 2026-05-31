// RadPlan Service Worker
const CACHE_NAME = 'radplan-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './img/icon.svg',
  './css/core.css',
  './css/layout.css',
  './css/components.css',
  './css/modals.css',
  './css/views.css',
  './css/contextmenu.css',
  './css/mobile-optimization.css',
  './js/app.js',
  './js/constants.js',
  './js/state.js',
  './js/model.js',
  './js/render.js',
  './js/contextmenu.js',
  './js/neuralgraph.js',
  './js/autoplan.js',
  './https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  './https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (like to Google Fonts) if not in cache
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          return cachedResponse || fetch(event.request);
        })
    );
  } else {
    // For cross-origin requests, try network first, then cache
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});