// Glotemp: the first-visit intro. Same mechanics as before (once per
// visitor, dismissible from any step, nothing gated behind a click), and
// the content reflects the visitor rather than being identical for
// everyone. A recognition line is built from signals: document.referrer,
// and a search-query URL param if one is present, never invented. The
// resolved city falls back to a zero-permission timezone guess (the same
// approach glotemp-city-sell.js already uses) instead of "the first city
// in the array" when GPS isn't granted or the hero instrument hasn't
// resolved yet. Step 2 rotates through rows from the `readings` table
// (the same 12-vertical collector data every city page already shows),
// never a hardcoded list; whichever verticals have the freshest,
// highest-confidence signal right now are what shows.
//
// Visually: the modal is the same glass surface used across the rest of
// the site. Step 2's rotating example sits inside the exact comic-burst
// SVG shape the homepage Instrument Room uses, and step 3 carries the
// same chevron arrow the check-in module's arrow already uses
// (.checkin-module-arrow), rotated to point at the install button, one
// shape family, not a separate one.
(function () {
  'use strict';

  const SEEN_KEY = 'glotemp_welcome_intro_seen';
  const CITY_WAIT_MS = 2500;
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  const EXAMPLE_ROTATE_MS = 3200;

  // The 5 comic-burst paths #instrument-row already carries (viewBox
  // 0 0 200 200, preserveAspectRatio="none"), copied verbatim rather
  // than re-derived, so step 2's plates are drawn from the same stamped
  // set the homepage uses, not a lookalike redrawn by hand.
  const BURST_PATHS = [
    'M100.0,8.0 L120.4,37.2 L154.1,25.6 L153.4,61.2 L187.5,71.6 L166.0,100.0 L187.5,128.4 L153.4,138.8 L154.1,174.4 L120.4,162.8 L100.0,192.0 L79.6,162.8 L45.9,174.4 L46.6,138.8 L12.5,128.4 L34.0,100.0 L12.5,71.6 L46.6,61.2 L45.9,25.6 L79.6,37.2 Z',
    'M122.8,15.0 L135.0,39.4 L162.2,37.8 L160.6,65.0 L185.0,77.2 L170.0,100.0 L185.0,122.8 L160.6,135.0 L162.2,162.2 L135.0,160.6 L122.8,185.0 L100.0,170.0 L77.2,185.0 L65.0,160.6 L37.8,162.2 L39.4,135.0 L15.0,122.8 L30.0,100.0 L15.0,77.2 L39.4,65.0 L37.8,37.8 L65.0,39.4 L77.2,15.0 L100.0,30.0 Z',
    'M87.5,10.9 L112.9,39.4 L147.7,23.7 L148.9,61.8 L185.6,72.2 L162.0,102.2 L183.4,133.7 L146.1,141.5 L142.3,179.5 L108.6,161.4 L81.3,188.0 L67.1,152.6 L29.1,155.4 L41.0,119.2 L10.1,96.9 L42.5,76.8 L33.1,39.8 L70.9,45.3 Z',
    'M157.9,31.1 L154.3,66.1 L187.3,78.2 L163.8,104.5 L183.4,133.7 L149.0,141.1 L147.7,176.3 L115.5,162.1 L93.7,189.8 L76.0,159.3 L42.1,168.9 L45.7,133.9 L12.7,121.8 L36.2,95.5 L16.6,66.3 L51.0,58.9 L52.3,23.7 L84.5,37.9 L106.3,10.2 L124.0,40.7 Z',
    'M70.6,19.2 L94.1,32.3 L114.9,15.3 L128.7,38.4 L155.3,34.1 L155.7,61.0 L180.8,70.6 L167.7,94.1 L184.7,114.9 L161.6,128.7 L165.9,155.3 L139.0,155.7 L129.4,180.8 L105.9,167.7 L85.1,184.7 L71.3,161.6 L44.7,165.9 L44.3,139.0 L19.2,129.4 L32.3,105.9 L15.3,85.1 L38.4,71.3 L34.1,44.7 L61.0,44.3 Z',
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function alreadySeen() {
    try { return !!localStorage.getItem(SEEN_KEY); } catch (e) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* private mode: shows again next visit, acceptable */ }
  }

  function findCity(slug) {
    return (window.CITIES_DATA || []).find((c) => c.slug === slug) || null;
  }

  // ---------- real signal: rough browser location, zero permission ----------
  // Mirrors glotemp-city-sell.js's guessNearbyCity() exactly (timezone
  // exact-match, then closest UTC offset, then top-ranked), duplicated
  // rather than imported since that module keeps it private to its own
  // IIFE, same "small pure function, independently kept" precedent as
  // city-conditions.js's localHour().
  function offsetMinutesFor(tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
      const part = parts.find((p) => p.type === 'timeZoneName');
      if (!part) return null;
      if (part.value === 'GMT') return 0;
      const m = part.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (!m) return null;
      const sign = m[1] === '-' ? -1 : 1;
      const hours = parseInt(m[2], 10);
      const mins = m[3] ? parseInt(m[3], 10) : 0;
      return sign * (hours * 60 + mins);
    } catch (e) {
      return null;
    }
  }
  function guessNearbyCity(cities) {
    const pool = cities.filter((c) => c.available !== false);
    if (!pool.length) return null;

    let visitorTz = null;
    try { visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* unsupported */ }

    if (visitorTz) {
      const exact = pool.find((c) => c.timezone === visitorTz);
      if (exact) return exact;

      const visitorOffset = offsetMinutesFor(visitorTz);
      if (visitorOffset != null) {
        let best = null, bestDiff = Infinity;
        pool.forEach((c) => {
          const off = offsetMinutesFor(c.timezone);
          if (off == null) return;
          const diff = Math.abs(off - visitorOffset);
          if (diff < bestDiff) { bestDiff = diff; best = c; }
        });
        if (best) return best;
      }
    }
    return pool.slice().sort((a, b) => (a.rank || 999) - (b.rank || 999))[0];
  }

  function defaultCity() {
    const list = window.CITIES_DATA || [];
    return guessNearbyCity(list) || list[0] || null;
  }

  // The homepage's own hero instrument resolves an initial city
  // (geolocation, or a fallback) and reports it through
  // GlotempCore.setPinnedCity -> the 'glotemp:city-pinned' event. This
  // waits briefly for that real resolution rather than guessing, and only
  // falls back to the timezone guess above if it genuinely doesn't arrive
  // in time.
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

  // ---------- real signal: referrer + a real search query, if present ----------
  // Never fabricated: if none of these are actually present, this reads
  // as a plain direct-visit line, not a guess dressed up as personal.
  function personalizationLine() {
    let query = null;
    try {
      const params = new URLSearchParams(window.location.search);
      query = params.get('q') || params.get('query') || params.get('utm_term') || null;
    } catch (e) { /* ignore */ }
    if (query) return 'You searched “' + query + '” and found us.';

    let ref = '';
    try { ref = document.referrer || ''; } catch (e) { /* ignore */ }
    if (ref) {
      let host = '';
      try { host = new URL(ref).hostname.replace(/^www\./, ''); } catch (e) { /* ignore */ }
      if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(host)) return 'You searched, and found us.';
      if (host && host !== 'glo-temp.com') return 'Someone pointed you here.';
    }
    return 'Glad you’re here.';
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
    const cityNameEl2 = document.getElementById('welcome-intro-city-name-2');
    if (cityNameEl2) cityNameEl2.textContent = city ? city.name : 'your city';
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

  // ---------- step 2: rotating real live examples ----------
  let liveExamples = [];
  let exampleIndex = 0;
  let exampleTimer = null;

  function formatValue(v) {
    if (typeof v !== 'number') return esc(String(v));
    if (Number.isInteger(v)) return v.toLocaleString('en-US');
    return v.toFixed(1);
  }

  function hexToRgba(hex, alpha) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return 'rgba(176, 141, 87, ' + alpha + ')';
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  // Pulls rows from `readings` (the same 12-vertical collector data
  // every city/vertical page already shows) and keeps only the
  // freshest row per vertical above a confidence floor. Which
  // verticals actually show up, and in what order, is decided entirely
  // by what data exists right now: never a hardcoded list.
  async function fetchLiveExamples() {
    try {
      const url = SUPABASE_URL + '/rest/v1/readings'
        + '?select=vertical,city_slug,label,value,fetched_at'
        + '&confidence=gte.0.6&label=not.is.null&order=fetched_at.desc&limit=200';
      const resp = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
      });
      if (!resp.ok) return [];
      const rows = await resp.json();
      const seenVerticals = new Set();
      const out = [];
      for (const row of rows) {
        if (!row.vertical || seenVerticals.has(row.vertical)) continue;
        if (!row.label || row.value == null) continue;
        const city = findCity(row.city_slug);
        if (!city) continue;
        seenVerticals.add(row.vertical);
        out.push({ vertical: row.vertical, city, label: row.label, value: row.value });
      }
      // The data decides what's strongest (freshest, confident enough);
      // this only randomizes display order so a repeat visitor doesn't
      // see the exact same first card every time.
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
      }
      return out.slice(0, 6);
    } catch (e) {
      return [];
    }
  }

  function exampleHTML(ex, burstPath) {
    const style = window.GlotempVerticalStyle || { LABEL: {}, COLOR: {}, ICON: {} };
    const label = style.LABEL[ex.vertical] || ex.vertical;
    const color = style.COLOR[ex.vertical] || '#B08D57';
    const icon = style.ICON[ex.vertical] || '';
    return (
      '<svg class="welcome-intro-burst" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">' +
        '<path d="' + burstPath + '" fill="' + hexToRgba(color, 0.12) + '" stroke="' + hexToRgba(color, 0.55) + '" ' +
          'style="filter:drop-shadow(0 0 10px ' + hexToRgba(color, 0.35) + ')"></path>' +
      '</svg>' +
      '<div class="welcome-intro-example-body">' +
        '<span class="welcome-intro-example-icon" style="color:' + color + '">' + icon + '</span>' +
        '<span class="welcome-intro-example-vertical" style="color:' + color + '">' + esc(label) + '</span>' +
        '<p class="welcome-intro-example-city">' + esc(ex.city.name) + '</p>' +
        '<p class="welcome-intro-example-fact">' + esc(ex.label) + ' sits at <strong>' + formatValue(ex.value) + '</strong> right now.</p>' +
      '</div>'
    );
  }

  function renderExample() {
    const mount = document.getElementById('welcome-intro-example');
    if (!mount) return;
    if (!liveExamples.length) {
      mount.classList.remove('is-entering');
      mount.innerHTML = '<p class="welcome-intro-example-empty">Every city here has a story right now.</p>';
      return;
    }
    const ex = liveExamples[exampleIndex % liveExamples.length];
    const burstPath = BURST_PATHS[exampleIndex % BURST_PATHS.length];
    mount.innerHTML = exampleHTML(ex, burstPath);
    mount.classList.remove('is-entering');
    void mount.offsetWidth; // restart the CSS entrance animation on every rotation
    mount.classList.add('is-entering');
  }

  function startExampleRotation() {
    stopExampleRotation();
    if (liveExamples.length < 2) return;
    exampleTimer = setInterval(() => {
      exampleIndex += 1;
      renderExample();
    }, EXAMPLE_ROTATE_MS);
  }
  function stopExampleRotation() {
    if (exampleTimer) { clearInterval(exampleTimer); exampleTimer = null; }
  }

  // ---------- step 3: install action, or a manual fallback ----------
  // beforeinstallprompt never fires on iOS (every iOS browser is WebKit
  // under the hood, and WebKit doesn't implement it) or for a visitor who
  // already has us installed. On those, install-btn would be a
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
      // iPadOS 13+ reports as "MacIntel" with a real touchscreen, the
      // one thing a touch-capable Mac claim never is otherwise.
      (window.navigator.platform === 'MacIntel' && (window.navigator.maxTouchPoints || 0) > 1);
  }

  function renderInstallAction(onLastStep) {
    const install = document.getElementById('install-btn');
    const fallback = document.getElementById('welcome-intro-install-fallback');
    const arrow = document.getElementById('welcome-intro-arrow');
    if (!install || !fallback) return;
    // .hidden as a JS property isn't reliably reflected on SVGElement the
    // way it is on HTMLElement: setting arrow.hidden = false silently
    // no-ops as a plain expando in some engines, leaving the real
    // `hidden` attribute (and the [hidden]{display:none} UA rule) still
    // in effect. Attribute calls work on any element type.
    if (arrow) {
      if (onLastStep) arrow.removeAttribute('hidden');
      else arrow.setAttribute('hidden', '');
    }
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
    // Not iOS, not standalone, not installable yet: a supported browser
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

    if (currentStep === 2) {
      renderExample();
      startExampleRotation();
    } else {
      stopExampleRotation();
    }
  }

  function prefersReducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function close() {
    const overlay = document.getElementById('welcome-intro-overlay');
    if (audioEl && playing) { audioEl.pause(); playing = false; }
    stopExampleRotation();
    if (!overlay) return;
    const modal = overlay.querySelector('.welcome-intro-modal');
    if (modal && !prefersReducedMotion()) {
      modal.classList.add('is-closing');
      setTimeout(() => {
        overlay.hidden = true;
        modal.classList.remove('is-closing');
      }, 200);
    } else {
      overlay.hidden = true;
    }
  }

  async function show() {
    const overlay = document.getElementById('welcome-intro-overlay');
    if (!overlay) return;
    markSeen();

    const recognitionEl = document.getElementById('welcome-intro-recognition');
    if (recognitionEl) recognitionEl.textContent = personalizationLine();

    const [city, examples] = await Promise.all([resolveCity(), fetchLiveExamples()]);
    liveExamples = examples;
    exampleIndex = 0;
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
