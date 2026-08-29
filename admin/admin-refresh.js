// Glotemp Admin: force-refresh to the latest deployed version.
//
// THE PROBLEM
// The admin PWA, opened from a phone's home screen, can sit on an old
// service worker for a long time: browsers only re-check a registered
// worker's script for byte changes periodically (per spec, no more than
// once every 24h), and a plain reload of an already-controlled page does
// not force that check. sw.js.template already does the right thing once
// a new worker actually gets as far as installing -- self.skipWaiting()
// unconditionally in `install`, self.clients.claim() in `activate` -- so
// nothing here duplicates that lifecycle. What's missing is a way to
// force the CHECK itself to happen right now instead of waiting on the
// browser's own timer.
//
// WHAT THIS BUTTON ACTUALLY DOES, IN ORDER
// 1. registration.update() -- forces a real network byte-check of
//    /sw.js. Per spec this bypasses the browser's own update-check
//    throttling (unlike a normal page reload, which does not).
// 2. If that turns up a new worker, nudge it to skip waiting via the
//    exact { type: 'SKIP_WAITING' } message sw.js.template's own
//    `message` handler already listens for -- belt and braces for an
//    older, already-installed worker that predates the unconditional
//    self.skipWaiting() call, since that worker's `install` handler is
//    the one that already ran and cannot be changed retroactively.
// 3. Clears every cache bucket this origin holds. There is no
//    admin-specific cache name to target -- everything same-origin
//    (public pages and admin's own HTML/CSS/JS alike) shares the one
//    content-hashed CACHE_NAME bucket -- so "clear admin's stale
//    entries" means clearing that bucket outright, which is also exactly
//    what a freshly-activated worker's own `activate` handler already
//    does for its OWN cache name. This does it from the page side too,
//    unconditionally, so it still works even against a worker old enough
//    to predate that cleanup logic.
// 4. Reloads.
(function () {
  'use strict';

  function supported() {
    return 'serviceWorker' in navigator && 'caches' in window;
  }

  async function clearAllCaches() {
    if (!('caches' in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
  }

  function waitForControllerChange(timeoutMs) {
    return new Promise((resolve) => {
      let done = false;
      function finish() {
        if (done) return;
        done = true;
        navigator.serviceWorker.removeEventListener('controllerchange', onChange);
        resolve();
      }
      function onChange() { finish(); }
      navigator.serviceWorker.addEventListener('controllerchange', onChange);
      setTimeout(finish, timeoutMs);
    });
  }

  // Resolves with the worker in .waiting once one exists, whether it was
  // already there or reached it via .installing -- or null if nothing
  // new shows up within the timeout.
  function findWaitingWorker(registration, timeoutMs) {
    if (registration.waiting) return Promise.resolve(registration.waiting);
    if (!registration.installing) return Promise.resolve(null);
    return new Promise((resolve) => {
      const installing = registration.installing;
      const timer = setTimeout(() => resolve(registration.waiting || null), timeoutMs);
      installing.addEventListener('statechange', function onChange() {
        if (installing.state === 'installed' || installing.state === 'activated') {
          installing.removeEventListener('statechange', onChange);
          clearTimeout(timer);
          resolve(registration.waiting || null);
        }
      });
    });
  }

  async function forceRefresh(setStatus) {
    if (!supported()) {
      setStatus('Reloading…');
      window.location.reload();
      return;
    }

    setStatus('Checking for a new version…');
    let registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => null);
    }

    if (registration) {
      try {
        await registration.update();
      } catch (e) {
        // Offline, or the fetch itself failed -- fall through to the
        // cache clear + reload below, which is still real work, not a
        // no-op, even without a new worker to install.
      }

      const waiting = await findWaitingWorker(registration, 4000);
      if (waiting) {
        setStatus('Installing the new version…');
        waiting.postMessage({ type: 'SKIP_WAITING' });
        await waitForControllerChange(4000);
      }
    }

    setStatus('Clearing cache…');
    await clearAllCaches();

    setStatus('Reloading…');
    window.location.reload();
  }

  function renderButton(state) {
    // state: 'idle' | 'busy' | 'unsupported'
    if (state === 'unsupported') {
      return '<button type="button" class="adm-action" disabled>Refresh to latest version</button>' +
        '<p class="adm-status">Not supported in this browser -- use a normal reload instead.</p>';
    }
    return (
      '<button type="button" class="adm-action" id="adm-refresh-btn"' +
      (state === 'busy' ? ' disabled aria-busy="true"' : '') +
      '>Refresh to latest version</button>' +
      '<p class="adm-status" id="adm-refresh-status" role="status" aria-live="polite"></p>'
    );
  }

  function mount(container) {
    if (!container) return;
    if (!supported()) { container.innerHTML = renderButton('unsupported'); return; }

    container.innerHTML = renderButton('idle');
    container.querySelector('#adm-refresh-btn').addEventListener('click', async () => {
      container.innerHTML = renderButton('busy');
      const statusEl = container.querySelector('#adm-refresh-status');
      const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };
      try {
        await forceRefresh(setStatus);
        // forceRefresh ends in a reload on every path that reaches here
        // without throwing -- nothing left to render.
      } catch (e) {
        setStatus('Could not refresh -- try a normal reload.');
        mount(container);
      }
    });
  }

  window.GlotempAdminRefresh = { mount, supported };
})();
