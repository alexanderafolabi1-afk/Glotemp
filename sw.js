// Glotemp Service Worker  -- GENERATED FILE, DO NOT EDIT BY HAND.
// Source of truth is sw.js.template; run `node build-sw.js` to regenerate.
//
// The cache name carries a content hash of the build, stamped in at
// deploy time. It changes if and only if the build changes, which is the
// whole fix: the previous worker used a hand-bumped constant that nobody
// bumped, so every deploy reused the same cache name, activate's cleanup
// matched nothing, and the old build survived.
const BUILD_HASH = 'a15fed190392';
const CACHE_NAME = `glotemp-${BUILD_HASH}`;

// Only genuinely immutable things are precached. HTML never is.
const PRECACHE = [
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Individually, so one 404 cannot reject the whole install the way
    // cache.addAll() does.
    await Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => {})));
    // Inside waitUntil: the previous worker called this outside, which
    // races the install and can leave the new worker waiting.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Delete ALL caches that are not this build's. The previous version
    // filtered on a `glotemp-` prefix, so anything cached under another
    // name leaked forever.
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));

    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();

    // Tell every open page which build now controls it, so the page can
    // reload itself exactly once instead of rendering a half-old view.
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'GLOTEMP_ACTIVATED', build: BUILD_HASH });
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // /assets/ is uploaded artwork served straight from the network.
  if (url.pathname.startsWith('/assets/')) return;

  // NAVIGATIONS: always network-first, never cache-first, and the cached
  // copy is only ever an offline fallback.
  //
  // The previous worker decided "is this HTML?" from a hardcoded list of
  // paths (/, *.html, /about, /explore, /blog, /admin, /privacy, /terms,
  // /investors). Every route added since -- /feed, /gem, /methodology,
  // /movers, /cities, /verticals, /rankings, /compare -- missed that list
  // and fell through to the CACHE-FIRST branch at the bottom of the file,
  // which is precisely "serve stale HTML, forever". request.mode tells us
  // what the browser is actually doing and cannot drift out of date.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) {
          if (preload.ok) putInCache(req, preload.clone());
          return preload;
        }
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) putInCache(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response('Offline - please check your connection.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })());
    return;
  }

  // Same-origin CSS/JS: network-first as well. These carry ?v= query
  // strings, but a stale cache hit on a matching URL would still pin an
  // old build, so the network always wins when it is reachable.
  if (/\.(?:css|js)$/.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) putInCache(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || new Response('', { status: 503 });
      }
    })());
    return;
  }

  // Everything else (fonts, icons): cache-first is safe -- these are
  // immutable and never contain markup.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) putInCache(req, fresh.clone());
      return fresh;
    } catch (e) {
      return new Response('', { status: 503 });
    }
  })());
});

function putInCache(req, res) {
  caches.open(CACHE_NAME).then((cache) => cache.put(req, res)).catch(() => {});
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Push payload is the plaintext JSON the server encrypted -- decrypted by
// the browser itself before this handler ever runs, per the Push API.
// Two senders share this one handler: push-send's consumer pushes
// ({ title, body, citySlug }) and push-admin-send's admin digests
// ({ title, body, target, tag }). `target`, when present, is an explicit
// path and wins outright -- it exists specifically so an admin push can
// land on /admin instead of falling through to the citySlug->city-page
// logic built for the consumer path.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { /* malformed payload, fall through to defaults */ }

  const title = data.title || 'Glotemp';
  const options = {
    body: data.body || '',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    data: { citySlug: data.citySlug || null, target: data.target || null },
    // Admin digests all share one tag on purpose: a second admin push
    // arriving before the first is read REPLACES it in the tray rather
    // than piling up, which is the notification-tray half of the same
    // "batch, don't spam" requirement the server-side batching covers.
    tag: data.tag || (data.citySlug ? `city-${data.citySlug}` : undefined),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const targetUrl = d.target || (d.citySlug ? `/cities/${d.citySlug}.html` : '/');

  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      const clientUrl = new URL(client.url);
      if (clientUrl.pathname === targetUrl && 'focus' in client) return client.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});
