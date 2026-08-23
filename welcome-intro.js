// Glotemp: the first-visit 3-step intro. Replaces the old single-step
// install banner (#install-banner) with something that actually
// introduces the site before it asks for anything: real radio, then the
// check-in concept, then a confident install pitch -- reusing app.js's
// existing beforeinstallprompt/deferredPrompt handling verbatim for the
// actual install action (the button below shares its id, `install-btn`,
// with what that handler already listens for).
//
// ONCE PER VISITOR, NO DARK PATTERNS
// The "seen" flag is set the moment this is shown, not on dismiss -- so
// navigating away mid-intro still counts as having seen it, same as
// dismissing outright. Closeable from any step, always. Nothing here is
// gated behind an action; every step's content is visible regardless of
// whether the visitor ever clicks anything.
(function () {
  'use strict';

  const SEEN_KEY = 'glotemp_welcome_intro_seen';
  const CITY_WAIT_MS = 2500;

  function alreadySeen() {
    try { return !!localStorage.getItem(SEEN_KEY); } catch (e) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* private mode: shows again next visit, acceptable */ }
  }

  function findCity(slug) {
    return (window.CITIES_DATA || []).find((c) => c.slug === slug) || null;
  }

  // The homepage's own hero instrument resolves an initial city
  // (geolocation, or a fallback) and reports it through
  // GlotempCore.setPinnedCity -> the 'glotemp:city-pinned' event. This
  // waits briefly for that real resolution rather than guessing, and only
  // falls back to a fixed default if it genuinely doesn't arrive in time.
  function resolveCity() {
    return new Promise((resolve) => {
      const already = window.GlotempCore ? GlotempCore.getPinnedCity() : null;
      if (already) { resolve(findCity(already) || defaultCity()); return; }

      let done = false;
      function finish(slug) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        document.removeEventListener('glotemp:city-pinned', onPinned);
        resolve(findCity(slug) || defaultCity());
      }
      function onPinned(e) { finish(e.detail && e.detail.slug); }
      document.addEventListener('glotemp:city-pinned', onPinned);
      var timer = setTimeout(() => finish(null), CITY_WAIT_MS);
    });
  }

  function defaultCity() {
    const list = window.CITIES_DATA || [];
    return list[0] || null; // Tokyo, cities-data.js's first entry -- a real, always-available city, not a placeholder.
  }

  // ---------- step 1: real radio ----------
  let audioEl = null;
  let playing = false;

  function setRadioButtonState(label, opts) {
    opts = opts || {};
    const nameEl = document.getElementById('welcome-intro-station-name');
    const btn = document.getElementById('welcome-intro-radio-btn');
    if (nameEl) nameEl.textContent = label;
    if (btn) btn.disabled = !!opts.disabled;
    const icon = btn && btn.querySelector('.welcome-intro-radio-icon');
    if (icon) icon.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
  }

  async function wireRadioStep(city) {
    const cityNameEl = document.getElementById('welcome-intro-city-name');
    if (cityNameEl) cityNameEl.textContent = city ? city.name : 'A city';
    setRadioButtonState('Finding a station…', { disabled: true });

    audioEl = document.getElementById('welcome-intro-audio');
    const btn = document.getElementById('welcome-intro-radio-btn');
    if (!city || !window.GlotempRadio || !btn) {
      setRadioButtonState('No station found right now', { disabled: true });
      return;
    }

    let result = null;
    try {
      result = await GlotempRadio.fetchTopStation(city.lat, city.lon, city.country, city.slug);
    } catch (e) { result = null; }

    if (!result || !result.station) {
      setRadioButtonState('No station found right now', { disabled: true });
      return;
    }

    const station = result.station;
    const streamUrl = station.url_resolved || station.url;
    const name = (station.name || 'Local station').trim();
    setRadioButtonState(name);

    btn.addEventListener('click', () => {
      if (!audioEl || !streamUrl) return;
      if (playing) {
        audioEl.pause();
        playing = false;
        setRadioButtonState(name);
        return;
      }
      if (!audioEl.src) audioEl.src = streamUrl;
      setRadioButtonState('Loading…', { disabled: true });
      audioEl.play().then(() => {
        playing = true;
        setRadioButtonState(name);
      }).catch(() => {
        setRadioButtonState("Couldn't play that station", { disabled: true });
      });
    });
    audioEl.addEventListener('pause', () => { playing = false; setRadioButtonState(name); });
    audioEl.addEventListener('ended', () => { playing = false; setRadioButtonState(name); });
  }

  // ---------- step 3: install action, or a manual fallback ----------
  // beforeinstallprompt never fires on iOS (every iOS browser is WebKit
  // under the hood, and WebKit doesn't implement it) or for a visitor who
  // already has us installed -- on those, install-btn would be a
  // guaranteed dead click. Detect both and swap in plain instructions
  // instead, so the button is only ever shown when it will actually do
  // something.
  function isStandaloneInstalled() {
    try {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true; // iOS Safari's own flag for "already added"
    } catch (e) { return false; }
  }
  function isIOS() {
    const ua = window.navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as "MacIntel" with a real touchscreen -- the
      // one thing a touch-capable Mac claim never is otherwise.
      (window.navigator.platform === 'MacIntel' && (window.navigator.maxTouchPoints || 0) > 1);
  }

  function renderInstallAction(onLastStep) {
    const install = document.getElementById('install-btn');
    const fallback = document.getElementById('welcome-intro-install-fallback');
    if (!install || !fallback) return;
    if (!onLastStep) {
      install.hidden = true;
      fallback.hidden = true;
      return;
    }
    if (isStandaloneInstalled()) {
      install.hidden = true;
      fallback.hidden = false;
      fallback.textContent = "You've already got us on your home screen.";
      return;
    }
    if (window.GlotempInstall && window.GlotempInstall.isAvailable()) {
      install.hidden = false;
      fallback.hidden = true;
      return;
    }
    if (isIOS()) {
      install.hidden = true;
      fallback.hidden = false;
      fallback.textContent = 'Tap Share, then "Add to Home Screen."';
      return;
    }
    // Not iOS, not standalone, not installable yet -- a supported browser
    // (Chrome/Edge/Android) where beforeinstallprompt just hasn't fired
    // by this render. Keep the real button: app.js's handler already
    // no-ops safely if clicked before the event arrives, and the
    // glotemp:install-available listener in show() below upgrades this
    // the moment it does.
    install.hidden = false;
    fallback.hidden = true;
  }

  // ---------- the carousel ----------
  const STEPS = [1, 2, 3];
  let currentStep = 1;

  function renderStep() {
    document.querySelectorAll('.welcome-intro-step').forEach((el) => {
      el.hidden = Number(el.getAttribute('data-step')) !== currentStep;
    });
    document.querySelectorAll('.welcome-intro-dot').forEach((el) => {
      el.classList.toggle('is-active', Number(el.getAttribute('data-dot')) === currentStep);
    });
    const back = document.getElementById('welcome-intro-back');
    const next = document.getElementById('welcome-intro-next');
    if (back) back.hidden = currentStep === 1;
    const onLastStep = currentStep === STEPS.length;
    if (next) next.hidden = onLastStep;
    renderInstallAction(onLastStep);
  }

  function close() {
    const overlay = document.getElementById('welcome-intro-overlay');
    if (overlay) overlay.hidden = true;
    if (audioEl && playing) { audioEl.pause(); playing = false; }
  }

  async function show() {
    const overlay = document.getElementById('welcome-intro-overlay');
    if (!overlay) return;
    markSeen();

    const city = await resolveCity();
    wireRadioStep(city);

    currentStep = 1;
    renderStep();
    overlay.hidden = false;

    document.getElementById('welcome-intro-dismiss').addEventListener('click', close);
    document.getElementById('welcome-intro-next').addEventListener('click', () => {
      currentStep = Math.min(currentStep + 1, STEPS.length);
      renderStep();
    });
    document.getElementById('welcome-intro-back').addEventListener('click', () => {
      currentStep = Math.max(currentStep - 1, 1);
      renderStep();
    });
    // Reused as-is: app.js's own install-btn click handler (bound to this
    // exact id) dispatches this once the native prompt resolves either
    // way. Closing here, rather than app.js reaching into this module's
    // markup, keeps the two files decoupled.
    window.addEventListener('glotemp:install-prompt-outcome', close, { once: true });
    // If beforeinstallprompt fires while this is already open on step 3
    // showing the "not yet available" fallback, upgrade to the real
    // button live rather than leaving stale instructions on screen.
    window.addEventListener('glotemp:install-available', () => {
      if (currentStep === STEPS.length) renderInstallAction(true);
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });
  }

  function init() {
    if (!document.getElementById('welcome-intro-overlay')) return;
    if (alreadySeen()) return;
    show();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
