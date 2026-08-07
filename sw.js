// Glotemp Service Worker
// Cache versioning: bump CACHE_VERSION on every CSS-affecting or major deploy
const CACHE_VERSION = 'glotemp-v11';

// Assets that are versioned and cacheable (network-first)
const NETWORK_FIRST_ASSETS = [
  '/styles.css',
  '/app.js',
  '/stories.js',
  '/cookie-consent.js',
  '/tempo-economy.js',
  '/cities-data.js'
];

// Immutable assets (cache-first)
const CACHE_FIRST_ASSETS = [
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/logo.png',
  '/assets/favicon.png',
  '/assets/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      // Only cache immutable assets on install
      return cache.addAll(CACHE_FIRST_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    // Clean up old cache versions (delete only Glotemp caches that aren't current)
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('glotemp-') && key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    ).then(() => {
      // Claim all clients so new worker takes over immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for HTML pages (clean URLs and legacy .html)
  const isHtmlPage = url.pathname === '/' ||
                     url.pathname.endsWith('.html') ||
                     url.pathname === '/about' ||
                     url.pathname === '/explore' ||
                     url.pathname === '/blog' ||
                     url.pathname === '/admin' ||
                     url.pathname === '/privacy' ||
                     url.pathname === '/terms' ||
                     url.pathname === '/investors';

  if (isHtmlPage) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if network fails
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            // Return offline page if both network and cache fail
            return new Response('Offline - please check your connection', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
          });
        })
    );
    return;
  }

  // Network-first for dynamic JS and CSS
  if (NETWORK_FIRST_ASSETS.some(asset => url.pathname.includes(asset))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cached => {
            return cached || new Response('', { status: 503 });
          });
        })
    );
    return;
  }

  // Cache-first for immutable assets (fonts, images, icons)
  event.respondWith(
    caches.match(event.request).then(cached => {
      return (
        cached ||
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
      );
    })
  );
});

// Handle update requests from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
