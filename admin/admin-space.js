/* Glotemp Admin: the space layer's engine.
 *
 * Three things: a starfield that knows the real time and the real
 * weather, an astronaut with three real states, and a handful of reactions
 * to things the admin genuinely does.
 *
 * NOTHING HERE IS DECORATIVE FICTION
 * The day/night cycle runs on the real current hour in Europe/London and
 * the sky reacts to real UK weather, both from Open-Meteo -- the same
 * free, keyless source glotemp-elsewhere.js already uses for city skies.
 * If that call fails the clock falls back to the browser's own reading of
 * Europe/London via Intl, which is still the real London time, and the
 * weather simply stays neutral. There is no invented data path.
 *
 * THE CELEBRATION TRIGGERS ARE REAL ADMIN EVENTS
 * Not milestones dreamt up to have something to celebrate:
 *   1. a lead's status moves to "replied"     (outreach_leads, admin/index.html)
 *   2. an API key is issued                   (admin_issue_api_key)
 *   3. the Founder tier count is up since the last visit
 * The first two fire from the admin's own success paths; the third is a
 * delta against what this browser last saw, kept in localStorage.
 *
 * WHY CANVAS AND NOT CSS
 * A few hundred independently twinkling stars as DOM nodes is a few
 * hundred composited layers and a style recalc per frame. One canvas is
 * one layer and one draw call per frame, and it is the only way to move
 * density and colour temperature continuously with the hour. Measured in
 * tests/admin-perf.js.
 *
 * IT NEVER OUTRANKS THE DATA
 * The sky has a hard luminance ceiling (SKY_MAX_L) and the content column
 * sits on a wash, so text contrast cannot fall below AA no matter what the
 * hour or the weather does. tests/admin-contrast.js measures the real
 * composited pixels and fails below 4.5:1.
 */
(function () {
  'use strict';

  var LONDON = 'Europe/London';
  var WEATHER_URL =
    'https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278' +
    '&current=temperature_2m,weather_code,cloud_cover&timezone=Europe%2FLondon';
  var WEATHER_TIMEOUT_MS = 5000;
  var WEATHER_REFRESH_MS = 15 * 60 * 1000;

  // The sky may never be brighter than this. Everything that lightens it
  // -- daytime, clear skies, star density -- is scaled to respect it.
  var SKY_MAX_L = 0.055;

  // What survives at full midday: a thin, faint field rather than none.
  var DAY_DENSITY_FLOOR = 0.16;
  var DAY_BRIGHT_FLOOR = 0.22;

  var STORE_KEY = 'glotemp:admin-space:v1';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- real time in London ----------

  // Preferred: the timestamp Open-Meteo returns for the requested zone.
  // Fallback: the browser's own Intl reading of Europe/London, which is
  // still the real London time and handles BST without a table.
  var londonHourOverride = null;

  function londonHourNow() {
    if (londonHourOverride != null) return londonHourOverride;
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: LONDON, hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(new Date());
      var h = 0, m = 0;
      parts.forEach(function (p) {
        if (p.type === 'hour') h = parseInt(p.value, 10);
        if (p.type === 'minute') m = parseInt(p.value, 10);
      });
      return h + m / 60;
    } catch (e) {
      return 12;
    }
  }

  // ---------- the scene ----------
  // 0 = deep night, 1 = full day, with real dawn and dusk ramps rather
  // than a switch at 06:00 and 18:00.
  function daylight(hour) {
    if (hour >= 9 && hour < 16) return 1;
    if (hour >= 21 || hour < 4) return 0;
    if (hour >= 4 && hour < 9) return (hour - 4) / 5;        // dawn
    return 1 - (hour - 16) / 5;                              // dusk
  }

  var weather = { cloud: 0, code: null, clear: true, precip: false };

  function scene() {
    var hour = londonHourNow();
    var day = daylight(hour);
    var cloud = weather.cloud;                                // 0..1

    // Fewer, dimmer stars and a warmer ground by day; a fuller, brighter
    // field at night. Cloud takes stars away on top of that.
    //
    // The floors matter: falling linearly to zero left full midday with an
    // empty gradient and no space theme at all. Day keeps a thin, faint
    // field -- FEWER and DIMMER, which is what was asked for, not none.
    var density = DAY_DENSITY_FLOOR + (1 - DAY_DENSITY_FLOOR) * (1 - day);
    var brightness = DAY_BRIGHT_FLOOR + (1 - DAY_BRIGHT_FLOOR) * (1 - day);
    density *= (1 - 0.65 * cloud);
    brightness *= (1 - 0.55 * cloud);

    // Colour temperature: warm at midday, cool at midnight.
    var warm = day;
    var top = mix([0x07, 0x06, 0x10], [0x1A, 0x14, 0x18], warm);
    var bottom = mix([0x0C, 0x0A, 0x14], [0x24, 0x1B, 0x17], warm);

    return {
      hour: hour,
      day: day,
      density: density,
      brightness: brightness,
      cloud: cloud,
      twinkle: weather.clear ? 1 : 0.45,      // a clear night twinkles hardest
      top: clampSky(top),
      bottom: clampSky(bottom),
      isNight: day < 0.35,
    };
  }

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }

  function srgbToLin(c) {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function luminance(rgb) {
    return 0.2126 * srgbToLin(rgb[0]) + 0.7152 * srgbToLin(rgb[1]) + 0.0722 * srgbToLin(rgb[2]);
  }

  // The ceiling, enforced rather than trusted: whatever the hour and the
  // weather ask for, the sky is scaled down until it is dark enough for
  // the panel's text to keep its contrast.
  function clampSky(rgb) {
    var L = luminance(rgb);
    if (L <= SKY_MAX_L) return rgb;
    var k = 0.5;
    for (var i = 0; i < 24; i++) {                    // bisect on a scale factor
      var test = [rgb[0] * k, rgb[1] * k, rgb[2] * k];
      var l = luminance(test);
      if (Math.abs(l - SKY_MAX_L) < 0.0008) break;
      if (l > SKY_MAX_L) k *= 0.85; else k = Math.min(1, k * 1.08);
    }
    return [Math.round(rgb[0] * k), Math.round(rgb[1] * k), Math.round(rgb[2] * k)];
  }

  function hex(rgb) {
    return '#' + rgb.map(function (v) {
      return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2);
    }).join('');
  }

  function applySceneVars(s) {
    var root = document.documentElement;
    root.style.setProperty('--sky-top', hex(s.top));
    root.style.setProperty('--sky-bottom', hex(s.bottom));
    // The nebula bloom cools and strengthens at night.
    root.style.setProperty('--sky-glow',
      'rgba(167, 139, 250, ' + (0.05 + 0.09 * (1 - s.day)).toFixed(3) + ')');
    document.body.setAttribute('data-sky', s.isNight ? 'night' : 'day');
  }

  // ---------- the starfield ----------

  var canvas, ctx, stars = [], clouds = [], raf = null, dpr = 1;
  var lastScene = null;

  function sizeCanvas() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);   // 3x on a phone buys nothing here
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildStars(w, h);
    buildClouds(w, h);
  }

  // Count scales with area but is capped hard: a 4K window must not cost
  // four times a laptop's frame budget. Measured at 320/5200: a 1920x1080
  // window dropped 5% of frames past 32ms. At 260/6500 it holds 60fps with
  // headroom, and the field does not read as any thinner.
  function starTarget(w, h) {
    return Math.max(70, Math.min(260, Math.round((w * h) / 6500)));
  }

  function buildStars(w, h) {
    var n = starTarget(w, h);
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.35 + Math.random() * 1.05,
        base: 0.25 + Math.random() * 0.75,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.1,
        drift: 0.004 + Math.random() * 0.012,
        warm: Math.random(),                 // some stars sit warmer than others
      });
    }
  }

  function buildClouds(w, h) {
    clouds = [];
    for (var i = 0; i < 4; i++) {
      clouds.push({
        x: Math.random() * w,
        y: h * (0.08 + Math.random() * 0.7),
        r: Math.max(w, h) * (0.18 + Math.random() * 0.22),
        v: 0.06 + Math.random() * 0.10,
        a: 0.5 + Math.random() * 0.5,
      });
    }
  }

  function draw(t) {
    var w = window.innerWidth, h = window.innerHeight;
    var s = lastScene || scene();
    ctx.clearRect(0, 0, w, h);

    // Stars. Density is applied by drawing a prefix of the array rather
    // than rebuilding it, so the field thins and fills without the
    // pattern jumping.
    var shown = Math.round(stars.length * s.density);
    for (var i = 0; i < shown; i++) {
      var st = stars[i];
      var tw = reduceMotion
        ? 1
        : 0.72 + 0.28 * Math.sin(t * 0.001 * st.speed + st.phase) * s.twinkle;
      var alpha = st.base * s.brightness * tw;
      if (alpha <= 0.01) continue;
      // Warmer stars by day, cooler at night -- the colour temperature
      // shift the brief asks for, applied per star rather than as a
      // filter over the whole canvas.
      var r = Math.round(210 + 45 * st.warm * s.day);
      var g = Math.round(215 + 25 * st.warm * s.day - 10 * (1 - s.day));
      var b = Math.round(235 - 55 * st.warm * s.day);
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
      if (!reduceMotion) {
        st.y += st.drift;                      // a very slow rise
        if (st.y > h) st.y = 0;
      }
    }

    // Cloud, only when the real weather says there is any. Big soft
    // radial washes drifting sideways -- never a shape you could name.
    if (s.cloud > 0.12) {
      for (var c = 0; c < clouds.length; c++) {
        var cl = clouds[c];
        var g2 = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r);
        var peak = 0.05 * s.cloud * cl.a;
        g2.addColorStop(0, 'rgba(150, 150, 175, ' + peak.toFixed(3) + ')');
        g2.addColorStop(1, 'rgba(150, 150, 175, 0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduceMotion) {
          cl.x += cl.v;
          if (cl.x - cl.r > w) cl.x = -cl.r;
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    raf = null;
    draw(t);
    if (!reduceMotion && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (raf || reduceMotion) { if (reduceMotion) draw(0); return; }
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  // ---------- real UK weather ----------

  function fetchWeather() {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, WEATHER_TIMEOUT_MS);
    return fetch(WEATHER_URL, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (data) {
        clearTimeout(timer);
        var cur = data && data.current;
        if (!cur) return false;
        var code = Number(cur.weather_code);
        weather = {
          cloud: Math.max(0, Math.min(100, Number(cur.cloud_cover) || 0)) / 100,
          code: code,
          clear: code === 0 || code === 1,
          precip: code >= 51,
        };
        // Open-Meteo returns the current time in the zone we asked for,
        // which is a real clock rather than this machine's.
        if (typeof cur.time === 'string') {
          var m = cur.time.match(/T(\d{2}):(\d{2})/);
          if (m) londonHourOverride = Number(m[1]) + Number(m[2]) / 60;
        }
        return true;
      });
  }

  function refreshScene() {
    lastScene = scene();
    applySceneVars(lastScene);
    if (reduceMotion) draw(0);
  }

  // ---------- the astronaut ----------
  // Inline SVG, drawn in code. No image file is created anywhere: see
  // CLAUDE.md, and the same pattern the site already uses for the spin
  // dial and the hand-drawn city landmarks.
  function astronautHTML() {
    return '' +
      '<div class="adm-naut" id="adm-naut" aria-hidden="true">' +
        '<span class="adm-naut-say" id="adm-naut-say"></span>' +
        sparks() +
        '<svg viewBox="0 0 100 120" role="img">' +
          '<defs>' +
            '<linearGradient id="naut-suit" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="#F0E9DC"/>' +
              '<stop offset="100%" stop-color="#B9B2A6"/>' +
            '</linearGradient>' +
            '<linearGradient id="naut-visor" x1="0" y1="0" x2="1" y2="1">' +
              '<stop offset="0%" stop-color="#3B2F6E"/>' +
              '<stop offset="55%" stop-color="#151030"/>' +
              '<stop offset="100%" stop-color="#0A0818"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<g class="adm-naut-tether">' +
            '<path d="M78 44 C 92 52, 96 74, 88 96" fill="none" stroke="#B08D57" stroke-width="1.6" ' +
              'stroke-linecap="round" opacity="0.75"/>' +
          '</g>' +
          '<g class="adm-naut-body">' +
            // pack
            '<rect x="30" y="44" width="40" height="34" rx="11" fill="#8F887C"/>' +
            // arms
            '<g class="adm-naut-arm">' +
              '<rect x="62" y="46" width="20" height="9" rx="4.5" fill="url(#naut-suit)"/>' +
              '<circle cx="83" cy="50.5" r="6" fill="#F0E9DC"/>' +
            '</g>' +
            '<rect x="18" y="52" width="20" height="9" rx="4.5" fill="url(#naut-suit)"/>' +
            '<circle cx="18" cy="56.5" r="6" fill="#F0E9DC"/>' +
            // legs
            '<rect x="36" y="72" width="11" height="24" rx="5.5" fill="url(#naut-suit)"/>' +
            '<rect x="53" y="72" width="11" height="24" rx="5.5" fill="url(#naut-suit)"/>' +
            '<circle cx="41.5" cy="97" r="6" fill="#E4DDD0"/>' +
            '<circle cx="58.5" cy="97" r="6" fill="#E4DDD0"/>' +
            // torso
            '<rect x="33" y="40" width="34" height="36" rx="13" fill="url(#naut-suit)"/>' +
            // helmet
            '<circle cx="50" cy="30" r="21" fill="url(#naut-suit)"/>' +
            '<circle cx="50" cy="30" r="15.5" fill="url(#naut-visor)"/>' +
            // visor highlight, and one aurora catchlight
            '<path d="M40 24 q6 -7 15 -5 q-9 1 -13 8 z" fill="#ffffff" opacity="0.5"/>' +
            '<circle cx="57" cy="35" r="2.4" fill="#5EEAD4" opacity="0.75"/>' +
            // chest light
            '<circle cx="50" cy="56" r="3.4" fill="#A78BFA" opacity="0.9"/>' +
          '</g>' +
        '</svg>' +
      '</div>';
  }

  function sparks() {
    var out = '';
    for (var i = 0; i < 9; i++) {
      var ang = (i / 9) * Math.PI * 2;
      var dist = 40 + Math.random() * 26;
      var colour = [ '#A78BFA', '#5EEAD4', '#E8B563' ][i % 3];
      out += '<span class="adm-naut-spark" style="' +
        '--sx:' + (Math.cos(ang) * dist).toFixed(1) + 'px;' +
        '--sy:' + (Math.sin(ang) * dist).toFixed(1) + 'px;' +
        'background:' + colour + ';' +
        'animation-delay:' + (i * 28) + 'ms">' +
      '</span>';
    }
    return out;
  }

  var nautEl = null, sayEl = null, stateTimer = null;

  function setState(state, line) {
    if (!nautEl) return;
    clearTimeout(stateTimer);
    nautEl.classList.remove('is-waving', 'is-celebrating', 'is-speaking');
    // Force a reflow so re-triggering the same state actually replays the
    // animation rather than doing nothing.
    void nautEl.offsetWidth;
    if (state === 'idle') { if (sayEl) sayEl.textContent = ''; return; }

    nautEl.classList.add(state === 'wave' ? 'is-waving' : 'is-celebrating');
    if (line && sayEl) {
      sayEl.textContent = line;
      nautEl.classList.add('is-speaking');
    }
    var hold = state === 'wave' ? 2600 : 3200;
    stateTimer = setTimeout(function () { setState('idle'); }, hold);
  }

  // ---------- real milestones ----------

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function writeStore(o) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch (e) { /* private mode */ }
  }

  // Fired by admin/index.html once the dashboard has rendered, carrying
  // the numbers it just drew. Anything that has gone UP since this browser
  // last looked is a real milestone.
  function onReady(e) {
    var metrics = (e && e.detail && e.detail.metrics) || {};
    var seen = readStore();
    var risen = [];

    ['founders', 'checkins', 'signed_up', 'keys_active'].forEach(function (k) {
      var now = Number(metrics[k]);
      if (!Number.isFinite(now)) return;
      var was = Number(seen[k]);
      if (Number.isFinite(was) && now > was) risen.push({ key: k, by: now - was });
      seen[k] = now;
    });
    writeStore(seen);

    markRisen(risen);

    var founder = risen.filter(function (r) { return r.key === 'founders'; })[0];
    if (founder) {
      setState('celebrate', founder.by === 1 ? 'New founder' : founder.by + ' new founders');
    } else {
      setState('wave', greeting());
    }
  }

  function markRisen(risen) {
    if (!risen.length) return;
    var byLabel = { founders: 'founder', checkins: 'check-ins', signed_up: 'new accounts', keys_active: 'active keys' };
    var labels = risen.map(function (r) { return byLabel[r.key]; });
    document.querySelectorAll('.adm-stat').forEach(function (el) {
      var lab = el.querySelector('.adm-stat-label');
      if (lab && labels.indexOf(lab.textContent.trim().toLowerCase()) !== -1) {
        el.classList.add('is-risen');
      }
    });
  }

  function greeting() {
    var h = londonHourNow();
    if (h < 5) return 'Still up';
    if (h < 12) return 'Morning';
    if (h < 18) return 'Afternoon';
    return 'Evening';
  }

  // ---------- wiring ----------

  function mount() {
    if (document.getElementById('adm-sky')) return;
    document.body.classList.add('adm-space');

    canvas = document.createElement('canvas');
    canvas.id = 'adm-sky';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');

    var neb = document.createElement('div');
    neb.className = 'adm-nebula';
    neb.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(neb, canvas.nextSibling);

    document.body.insertAdjacentHTML('beforeend', astronautHTML());
    nautEl = document.getElementById('adm-naut');
    sayEl = document.getElementById('adm-naut-say');

    refreshScene();
    sizeCanvas();
    startLoop();

    // Real weather, then a refresh every quarter hour. The scene is
    // already on screen before this resolves; it only ever adjusts it.
    fetchWeather().then(refreshScene);
    setInterval(function () { fetchWeather().then(refreshScene); }, WEATHER_REFRESH_MS);
    // The hour moves even when the weather does not.
    setInterval(refreshScene, 60000);

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(sizeCanvas, 180);
    });

    // A hidden tab paints nothing.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopLoop(); else startLoop();
    });

    watchBottomFurniture();

    document.addEventListener('admin:ready', onReady);
    document.addEventListener('admin:key-issued', function () {
      setState('celebrate', 'Key issued');
    });
    document.addEventListener('admin:lead-status', function (e) {
      var status = e && e.detail && e.detail.status;
      if (status === 'replied') setState('celebrate', 'They replied');
    });
  }

  // The cookie consent banner is fixed to the bottom of the viewport at
  // z-index 9999, so the astronaut in the corner sat underneath it and was
  // half hidden until someone accepted. Rather than fighting it with a
  // higher z-index -- which would put a cartwheeling astronaut over a
  // consent notice -- the astronaut simply moves up out of its way, and
  // drops back down when it goes.
  function watchBottomFurniture() {
    var root = document.documentElement;
    function apply() {
      var banner = document.getElementById('cookie-consent-banner');
      var lift = 0;
      if (banner) {
        var r = banner.getBoundingClientRect();
        // Only counts if it is actually on screen at the bottom.
        if (r.height > 0 && r.bottom > window.innerHeight - 4) lift = Math.round(r.height) + 12;
      }
      root.style.setProperty('--adm-naut-lift', lift + 'px');
    }
    apply();
    if (typeof MutationObserver === 'function') {
      new MutationObserver(apply).observe(document.body, { childList: true, subtree: false });
    }
    window.addEventListener('resize', apply);
    // The banner is written by a deferred script and can also be dismissed
    // at any moment; a couple of re-checks costs nothing and covers both.
    setTimeout(apply, 600);
    setTimeout(apply, 2000);
    document.addEventListener('click', function () { setTimeout(apply, 60); }, true);
  }

  // Exposed so admin/index.html can fire the row pulse from its own
  // success paths without reaching into this file's internals.
  window.GlotempAdminSpace = {
    pulseRow: function (row, tone) {
      if (!row || reduceMotion) return;
      var tints = {
        teal: ['rgba(94, 234, 212, 0.16)', '#5EEAD4'],
        violet: ['rgba(167, 139, 250, 0.18)', '#A78BFA'],
        gold: ['rgba(232, 181, 99, 0.16)', '#E8B563'],
      };
      var t = tints[tone] || tints.teal;
      row.style.setProperty('--adm-pulse-tint', t[0]);
      row.style.setProperty('--adm-pulse-edge', t[1]);
      row.classList.remove('is-pulsing');
      void row.offsetWidth;
      row.classList.add('is-pulsing');
      setTimeout(function () { row.classList.remove('is-pulsing'); }, 950);
    },
    commit: function (el) {
      if (!el || reduceMotion) return;
      el.classList.remove('is-committing');
      void el.offsetWidth;
      el.classList.add('is-committing');
      setTimeout(function () { el.classList.remove('is-committing'); }, 340);
    },
    setState: setState,
    scene: function () { return lastScene || scene(); },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
