// Glotemp Pulse Map: a separate, additional homepage section -- every
// city as a small quiet node on a stylized world map, positioned by its
// real coordinates. Does not read from, write to, or replace the
// Instrument Room panel; the two share no state and no DOM.
//
// PROJECTION: standard equirectangular (left% = (lon+180)/360*100,
// top% = (90-lat)/180*100), applied to each city's real lat/lon from
// CITIES_DATA. The continent shapes behind the dots are a deliberately
// soft, non-literal silhouette -- rounded blobs positioned at real
// bounding boxes on the same projection, not a coastline dataset. CSS
// only, no map library, no external images or fetched assets.
//
// ATMOSPHERE: the glow wash, star field and sun marker below are all
// driven by the same real sun-position math as the terminator line --
// nothing here is a decorative image or a canned animation. The wash is
// a low-res canvas of real per-point solar elevation, upscaled and
// blurred by CSS into a soft glowing band; stars only ever show over a
// map point that is genuinely dark right now.
//
// SHIFTS: a soft pulse plays on a node only when a real, freshly-posted
// row appears in `observations` for that city after this page loaded --
// the same table and columns app.js already reads for the homepage's
// live-comment snippet. Nothing is simulated: if no real check-in
// arrives, no pulse plays. Polled, not subscribed, to stay lightweight.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  var POLL_MS = 90000; // quiet cadence -- this is a slow ambient signal, not a live ticker

  // ---------- real-time day/night terminator ----------
  // Pure astronomical math, computed client-side, no external API. Uses
  // the standard low-precision solar-position series from the
  // Astronomical Almanac (accurate to a few arcminutes -- plenty for a
  // map line): the sun's current ecliptic longitude gives its equatorial
  // right ascension and declination, and the current Greenwich sidereal
  // time locates it over a longitude. From those few numbers alone we
  // get, for ANY longitude, the latitude where the sun sits exactly on
  // the horizon (the terminator), and for ANY city's real lat/lon, the
  // sun's real current elevation there. Same formula for all 300 cities
  // -- equatorial or near-arctic, none of them a special case -- so
  // there is no coordinate this can fail to cover.
  var RAD = Math.PI / 180;
  var TERMINATOR_REFRESH_MS = 60000; // the line drifts ~0.25 deg/minute -- no need to recompute faster than this
  var DAWN_DUSK_WINDOW_DEG = 4; // "narrow window" either side of the geometric horizon, roughly +/-16 real minutes at the equator
  var DAWN_DUSK_ROTATE_MS = 5000;

  function norm360(deg) { deg = deg % 360; return deg < 0 ? deg + 360 : deg; }
  function norm180(deg) { return ((deg + 180) % 360 + 360) % 360 - 180; }

  function julianDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  // Sun's apparent ecliptic longitude, low-precision series (good to
  // ~0.01 deg) -- the same formula behind most simple solar calculators.
  function sunEclipticLongitudeDeg(daysSinceJ2000) {
    var L = norm360(280.460 + 0.9856474 * daysSinceJ2000);
    var g = norm360(357.528 + 0.9856003 * daysSinceJ2000) * RAD;
    return norm360(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
  }

  function obliquityDeg(daysSinceJ2000) {
    return 23.439 - 0.0000004 * daysSinceJ2000;
  }

  // Greenwich Mean Sidereal Time, in degrees.
  function gmstDeg(jd) {
    var d = jd - 2451545.0;
    return norm360((18.697374558 + 24.06570982441908 * d) * 15);
  }

  // Current sun geometry: right ascension + declination (equatorial,
  // degrees) and Greenwich sidereal time (degrees). Everything below --
  // the terminator line and every city's real elevation -- is derived
  // from just these three numbers plus a longitude.
  function sunGeometry(date) {
    var jd = julianDate(date);
    var n = jd - 2451545.0;
    var lambda = sunEclipticLongitudeDeg(n) * RAD;
    var epsilon = obliquityDeg(n) * RAD;
    var alpha = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda)) / RAD;
    var delta = Math.asin(Math.sin(epsilon) * Math.sin(lambda)) / RAD;
    return { alpha: norm360(alpha), delta: delta, gmst: gmstDeg(jd) };
  }

  // Local hour angle of the sun at a given real longitude: negative
  // before solar noon there (morning), positive after (afternoon).
  function hourAngleDeg(lonDeg, sun) {
    return norm180(sun.gmst + lonDeg - sun.alpha);
  }

  // Latitude of the terminator at a given real longitude -- the point on
  // that meridian where the sun sits exactly on the horizon. Standard
  // spherical-trigonometry result for the great circle 90 deg from the
  // subsolar point.
  function terminatorLatAt(lonDeg, sun) {
    var H = hourAngleDeg(lonDeg, sun) * RAD;
    return Math.atan(-Math.cos(H) / Math.tan(sun.delta * RAD)) / RAD;
  }

  // Real current solar elevation (degrees above/below the geometric
  // horizon) for any real lat/lon.
  function solarElevationDeg(latDeg, lonDeg, sun) {
    var H = hourAngleDeg(lonDeg, sun) * RAD;
    var lat = latDeg * RAD, delta = sun.delta * RAD;
    var sinAlt = Math.sin(lat) * Math.sin(delta) + Math.cos(lat) * Math.cos(delta) * Math.cos(H);
    return Math.asin(Math.max(-1, Math.min(1, sinAlt))) / RAD;
  }

  // The subsolar point: the one real place on Earth where the sun is
  // directly overhead right now (elevation 90 deg). Its latitude is just
  // the declination; its longitude is wherever the hour angle is zero.
  function subsolarPoint(sun) {
    return { lat: sun.delta, lon: norm180(sun.alpha - sun.gmst) };
  }

  // Rough real-world bounding boxes on the same equirectangular
  // projection as the city dots (left%, top%, width%, height%), so the
  // soft landmass shapes sit under their real cities rather than
  // floating disconnected from them.
  var LANDMASSES = [
    { left: 4,  top: 5,  width: 29, height: 40, radius: '42% 58% 55% 45% / 48% 42% 58% 52%', rotate: -6 },  // North America
    { left: 22, top: 46, width: 20, height: 42, radius: '55% 45% 40% 60% / 55% 40% 60% 45%', rotate: 6 },   // South America
    { left: 44, top: 8,  width: 17, height: 24, radius: '50% 50% 42% 58% / 55% 45% 55% 45%', rotate: -3 },  // Europe
    { left: 45, top: 12, width: 20, height: 62, radius: '48% 52% 45% 55% / 55% 45% 55% 45%', rotate: 2 },   // Africa
    { left: 58, top: 5,  width: 38, height: 42, radius: '40% 60% 50% 50% / 45% 55% 45% 55%', rotate: 3 },   // Asia
    { left: 75, top: 57, width: 20, height: 24, radius: '58% 42% 55% 45% / 50% 50% 50% 50%', rotate: -4 },  // Australia
  ];

  function project(lat, lon) {
    var left = ((lon + 180) / 360) * 100;
    var top = ((90 - lat) / 180) * 100;
    return { left: left, top: top };
  }

  function bandColor(mood) {
    return window.GlotempCore ? window.GlotempCore.moodToBand(mood) : { band: 'equilibrium' };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var frame = null;
  var nodesBySlug = new Map();
  var openPopover = null;

  function closePopover() {
    if (openPopover) { openPopover.remove(); openPopover = null; }
  }

  function selectCity(slug) {
    var select = document.getElementById('city-select');
    if (!select) return;
    select.value = slug;
    select.dispatchEvent(new Event('change'));
  }

  function openPopoverFor(slug, nodeEl) {
    closePopover();
    var city = (window.CITIES_DATA || []).find(function (c) { return c.slug === slug; });
    if (!city) return;
    var band = bandColor(city.mood);

    var pop = document.createElement('div');
    pop.className = 'pulse-map-popover';
    pop.innerHTML =
      '<button type="button" class="pulse-map-popover-close" aria-label="Close">&times;</button>' +
      '<span class="pulse-map-popover-city">' + esc(city.name) + '</span>' +
      '<span class="pulse-map-popover-band">' + esc(band.band) + '</span>' +
      '<a class="pulse-map-popover-link" href="/cities/' + esc(slug) + '.html">View this city &rarr;</a>';

    var left = parseFloat(nodeEl.style.left);
    var top = parseFloat(nodeEl.style.top);
    // Flip to the left/above near the frame's far edges so the card
    // never spills outside the map.
    pop.style.left = (left > 65 ? 'auto' : left + '%');
    pop.style.right = (left > 65 ? (100 - left) + '%' : 'auto');
    pop.style.top = (top > 60 ? 'auto' : (top + 3) + '%');
    pop.style.bottom = (top > 60 ? (100 - top + 3) + '%' : 'auto');

    frame.appendChild(pop);
    openPopover = pop;

    pop.querySelector('.pulse-map-popover-close').addEventListener('click', function (e) {
      e.stopPropagation();
      closePopover();
    });

    selectCity(slug);
  }

  function pulseNode(slug) {
    var node = nodesBySlug.get(slug);
    if (!node || !frame) return;
    var ring = document.createElement('span');
    ring.className = 'pulse-map-ring';
    ring.style.left = node.style.left;
    ring.style.top = node.style.top;
    frame.appendChild(ring);
    ring.addEventListener('animationend', function () { ring.remove(); });
    // Belt-and-braces cleanup if the animation event never fires (e.g.
    // reduced-motion, where the animation is disabled in CSS).
    setTimeout(function () { if (ring.isConnected) ring.remove(); }, 3600);
  }

  // The line itself: a polyline traced across every longitude at the
  // real current terminator latitude, on the same equirectangular
  // percent-grid as the city nodes, so it lines up with them exactly.
  var terminatorLine = null;
  var terminatorGlow = null;

  function ensureTerminatorSvg() {
    if (terminatorLine) return;
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'pulse-map-terminator');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');

    terminatorGlow = document.createElementNS(svgNS, 'polyline');
    terminatorGlow.setAttribute('class', 'pulse-map-terminator-glow');
    svg.appendChild(terminatorGlow);

    terminatorLine = document.createElementNS(svgNS, 'polyline');
    terminatorLine.setAttribute('class', 'pulse-map-terminator-line');
    svg.appendChild(terminatorLine);

    frame.appendChild(svg);
  }

  function renderTerminator(sun) {
    ensureTerminatorSvg();
    var points = [];
    for (var lon = -180; lon <= 180; lon += 2) {
      var lat = terminatorLatAt(lon, sun);
      if (!isFinite(lat)) continue;
      var pos = project(Math.max(-90, Math.min(90, lat)), lon);
      points.push(pos.left.toFixed(2) + ',' + pos.top.toFixed(2));
    }
    var d = points.join(' ');
    terminatorLine.setAttribute('points', d);
    terminatorGlow.setAttribute('points', d);
  }

  // ---------- real day/night glow wash + star field + sun marker ----------
  // The same elevation formula above, rasterized onto a low-res canvas and
  // let the browser's own upscaling soften it into a glowing band --
  // genuinely computed from real sun geometry, not a decorative image.
  // Deliberately NOT a simple "which side of the line" fill: exactly at
  // the equinoxes the night side flips from north-of-curve to
  // south-of-curve (the terminator briefly runs pole-to-pole instead of
  // east-to-west), so only a real per-point elevation test is correct
  // year-round.
  var GLOW_COLS = 90, GLOW_ROWS = 45;
  var glowCanvas = null, glowCtx = null;

  function ensureGlowCanvas() {
    if (glowCanvas) return;
    glowCanvas = document.createElement('canvas');
    glowCanvas.className = 'pulse-map-glow';
    glowCanvas.width = GLOW_COLS;
    glowCanvas.height = GLOW_ROWS;
    glowCanvas.setAttribute('aria-hidden', 'true');
    glowCtx = glowCanvas.getContext('2d');
    frame.appendChild(glowCanvas);
  }

  // Night -> a deep indigo dusk. Right at the horizon -> a warm amber
  // band (the "ring of fire" every real day/night boundary actually has).
  // Deep day -> fully transparent, so the map's own colors carry through.
  function elevationToRGBA(el) {
    if (el <= -14) return [38, 30, 74, 0.55];
    if (el <= -3) {
      var t1 = (el + 14) / 11; // -14..-3 -> 0..1
      return [
        Math.round(38 + t1 * (196 - 38)),
        Math.round(30 + t1 * (104 - 30)),
        Math.round(74 + t1 * (58 - 74)),
        0.55 - t1 * 0.17,
      ];
    }
    if (el <= 8) {
      var t2 = (el + 3) / 11; // -3..8 -> 0..1
      return [196 - t2 * 40, 104 - t2 * 24, 58 + t2 * 60, 0.38 - t2 * 0.38];
    }
    return [240, 224, 200, 0];
  }

  function renderGlowWash(sun) {
    ensureGlowCanvas();
    var img = glowCtx.createImageData(GLOW_COLS, GLOW_ROWS);
    for (var row = 0; row < GLOW_ROWS; row++) {
      var lat = 90 - ((row + 0.5) / GLOW_ROWS) * 180;
      for (var col = 0; col < GLOW_COLS; col++) {
        var lon = ((col + 0.5) / GLOW_COLS) * 360 - 180;
        var el = solarElevationDeg(lat, lon, sun);
        var rgba = elevationToRGBA(el);
        var i = (row * GLOW_COLS + col) * 4;
        img.data[i] = rgba[0]; img.data[i + 1] = rgba[1]; img.data[i + 2] = rgba[2];
        img.data[i + 3] = Math.round(rgba[3] * 255);
      }
    }
    glowCtx.putImageData(img, 0, 0);
  }

  // A fixed sky of real map coordinates (not tied to any city), each one
  // only actually shown while genuine night sits over that map point --
  // computed from the exact same sun geometry as everything else here,
  // never a static decoration.
  var STAR_COUNT = 130;
  var stars = [];

  function ensureStars() {
    if (stars.length) return;
    for (var i = 0; i < STAR_COUNT; i++) {
      var xPct = Math.random() * 100;
      var yPct = Math.random() * 100;
      var el = document.createElement('span');
      el.className = 'pulse-map-star';
      el.style.left = xPct.toFixed(2) + '%';
      el.style.top = yPct.toFixed(2) + '%';
      var size = 1.1 + Math.random() * 2.1;
      el.style.width = size.toFixed(1) + 'px';
      el.style.height = size.toFixed(1) + 'px';
      el.style.animationDuration = (2.6 + Math.random() * 3.2).toFixed(1) + 's';
      el.style.animationDelay = (Math.random() * 4).toFixed(1) + 's';
      frame.appendChild(el);
      stars.push({
        lat: 90 - (yPct / 100) * 180,
        lon: (xPct / 100) * 360 - 180,
        el: el,
      });
    }
  }

  function renderStars(sun) {
    stars.forEach(function (star) {
      var el = solarElevationDeg(star.lat, star.lon, sun);
      star.el.classList.toggle('is-visible', el < -4);
    });
  }

  // The one real point on Earth where the sun is directly overhead right
  // now -- a small glowing marker, positioned by the same subsolar
  // calculation used for the glow wash and the dawn/dusk note.
  var sunMarker = null;

  function ensureSunMarker() {
    if (sunMarker) return;
    sunMarker = document.createElement('span');
    sunMarker.className = 'pulse-map-sun';
    sunMarker.setAttribute('aria-hidden', 'true');
    sunMarker.title = 'Solar noon is happening here right now';
    frame.appendChild(sunMarker);
  }

  function renderSunMarker(sun) {
    ensureSunMarker();
    var sub = subsolarPoint(sun);
    var pos = project(sub.lat, sub.lon);
    sunMarker.style.left = pos.left + '%';
    sunMarker.style.top = pos.top + '%';
  }

  // ---------- real per-city dawn/dusk note ----------
  var dawnDuskMatches = [];
  var dawnDuskIndex = 0;
  var dawnDuskRotateTimer = null;
  var terminatorNote = null;

  // Every real city within the narrow elevation window right now, each
  // correctly resolved as dawn or dusk from its own hour angle -- never
  // one rule applied uniformly across longitudes.
  function computeDawnDusk(cities, sun) {
    var matches = [];
    cities.forEach(function (city) {
      if (typeof city.lat !== 'number' || typeof city.lon !== 'number') return;
      var elevation = solarElevationDeg(city.lat, city.lon, sun);
      if (Math.abs(elevation) > DAWN_DUSK_WINDOW_DEG) return;
      var phase = hourAngleDeg(city.lon, sun) < 0 ? 'dawn' : 'dusk';
      matches.push({ name: city.name, phase: phase });
    });
    return matches;
  }

  function renderDawnDuskNote() {
    if (!terminatorNote) return;
    if (!dawnDuskMatches.length) {
      terminatorNote.textContent = '';
      terminatorNote.hidden = true;
      return;
    }
    var m = dawnDuskMatches[dawnDuskIndex % dawnDuskMatches.length];
    terminatorNote.textContent = m.phase === 'dawn'
      ? 'Dawn is breaking over ' + m.name + '.'
      : 'Dusk is settling over ' + m.name + '.';
    terminatorNote.hidden = false;
  }

  function stopDawnDuskRotation() {
    if (dawnDuskRotateTimer) { clearInterval(dawnDuskRotateTimer); dawnDuskRotateTimer = null; }
  }

  function startDawnDuskRotation() {
    stopDawnDuskRotation();
    if (dawnDuskMatches.length <= 1) return;
    dawnDuskRotateTimer = setInterval(function () {
      dawnDuskIndex = (dawnDuskIndex + 1) % dawnDuskMatches.length;
      renderDawnDuskNote();
    }, DAWN_DUSK_ROTATE_MS);
  }

  function refreshTerminator(cities) {
    var sun = sunGeometry(new Date());
    renderGlowWash(sun);
    renderStars(sun);
    renderTerminator(sun);
    renderSunMarker(sun);
    dawnDuskMatches = computeDawnDusk(cities, sun);
    dawnDuskIndex = 0;
    renderDawnDuskNote();
    startDawnDuskRotation();
  }

  function renderLandmasses() {
    LANDMASSES.forEach(function (l) {
      var el = document.createElement('div');
      el.className = 'pulse-map-landmass';
      el.style.left = l.left + '%';
      el.style.top = l.top + '%';
      el.style.width = l.width + '%';
      el.style.height = l.height + '%';
      el.style.borderRadius = l.radius;
      el.style.transform = 'rotate(' + l.rotate + 'deg)';
      frame.appendChild(el);
    });
  }

  function renderNodes(cities) {
    cities.forEach(function (city) {
      if (typeof city.lat !== 'number' || typeof city.lon !== 'number') return;
      var pos = project(city.lat, city.lon);
      var glow = Math.max(0.25, Math.min(1, (typeof city.mood === 'number' ? city.mood : 5) / 10));

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pulse-map-node';
      btn.style.left = pos.left + '%';
      btn.style.top = pos.top + '%';
      btn.style.setProperty('--node-glow', glow.toFixed(2));
      btn.setAttribute('aria-label', city.name + ', ' + bandColor(city.mood).band);
      btn.dataset.slug = city.slug;
      btn.dataset.name = city.name.toLowerCase();
      btn.dataset.country = (city.country || '').toLowerCase();

      var dot = document.createElement('span');
      dot.className = 'pulse-map-node-dot';
      dot.setAttribute('aria-hidden', 'true');
      btn.appendChild(dot);

      // No per-node click listener here -- see handleFrameClick. At this
      // map's scale, cities that are geographically close (Tokyo and
      // Takayama are ~6px apart) have hit-areas that overlap regardless
      // of hit-area size, so whichever button happens to sit on top in
      // DOM order would silently steal every nearby click. One delegated
      // listener that picks the node nearest the actual click point
      // fixes that for mouse/touch, while keyboard activation (which
      // always targets the exact focused button) is handled separately.

      frame.appendChild(btn);
      nodesBySlug.set(city.slug, btn);
    });
  }

  // Picks whichever node's centre is closest to the actual click point,
  // rather than trusting DOM stacking order -- see the comment in
  // renderNodes(). Keyboard activation (Enter/Space on a focused button)
  // always targets that exact button, so it's handled separately and
  // never needs distance math.
  function handleFrameClick(e) {
    if (e.detail === 0) {
      // Keyboard-originated click: e.target is the exact focused button.
      var kbBtn = e.target.closest ? e.target.closest('.pulse-map-node') : null;
      if (kbBtn) openPopoverFor(kbBtn.dataset.slug, kbBtn);
      return;
    }
    var rect = frame.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    var clickY = e.clientY - rect.top;
    var nearest = null;
    var nearestDist = Infinity;
    nodesBySlug.forEach(function (btn) {
      var x = (parseFloat(btn.style.left) / 100) * rect.width;
      var y = (parseFloat(btn.style.top) / 100) * rect.height;
      var dist = Math.hypot(x - clickX, y - clickY);
      if (dist < nearestDist) { nearestDist = dist; nearest = btn; }
    });
    // A generous radius (roughly the visible hit-area) -- a click well
    // off in open ocean shouldn't snap to whatever city is technically
    // closest on the other side of the map.
    if (nearest && nearestDist <= 16) {
      e.stopPropagation();
      openPopoverFor(nearest.dataset.slug, nearest);
    }
  }

  function wireSearch() {
    var input = document.getElementById('pulse-map-search');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      nodesBySlug.forEach(function (btn) {
        var matches = q.length > 0 && (btn.dataset.name.indexOf(q) !== -1 || btn.dataset.country.indexOf(q) !== -1);
        btn.classList.toggle('is-match', matches);
      });
    });
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var q = input.value.trim().toLowerCase();
      if (!q) return;
      var match = null;
      nodesBySlug.forEach(function (btn) {
        if (!match && (btn.dataset.name.indexOf(q) !== -1 || btn.dataset.country.indexOf(q) !== -1)) match = btn;
      });
      if (match) { openPopoverFor(match.dataset.slug, match); pulseNode(match.dataset.slug); }
    });
  }

  // ---------- real mood-shift polling ----------
  // Only rows newer than page-load count as a "shift" -- this is not a
  // replay of history, only genuinely new activity while the map is open.
  var lastSeenIso = new Date().toISOString();

  function pollForShifts() {
    var url = SUPABASE_URL + '/rest/v1/observations' +
      '?select=id,city_slug,created_at&created_at=gt.' + encodeURIComponent(lastSeenIso) +
      '&order=created_at.asc&limit=20';
    fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        Accept: 'application/json',
      },
    })
      .then(function (resp) { return resp.ok ? resp.json() : []; })
      .then(function (rows) {
        (rows || []).forEach(function (row) {
          if (row.city_slug && nodesBySlug.has(row.city_slug)) pulseNode(row.city_slug);
          if (row.created_at && row.created_at > lastSeenIso) lastSeenIso = row.created_at;
        });
      })
      .catch(function () { /* a missed poll just tries again next interval */ });
  }

  function mount() {
    frame = document.getElementById('pulse-map-frame');
    if (!frame) return;
    var cities = (window.CITIES_DATA || []).filter(function (c) { return c.available !== false; });
    if (!cities.length) return;

    // Stacking order, back to front: glow wash, stars, landmasses,
    // terminator line, sun marker, then the clickable city nodes on top.
    ensureGlowCanvas();
    ensureStars();
    renderLandmasses();
    ensureTerminatorSvg();
    ensureSunMarker();
    renderNodes(cities);
    wireSearch();
    frame.addEventListener('click', handleFrameClick);

    document.addEventListener('click', function (e) {
      if (openPopover && !openPopover.contains(e.target) && !e.target.closest('.pulse-map-node')) closePopover();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePopover();
    });

    setInterval(pollForShifts, POLL_MS);

    terminatorNote = document.getElementById('pulse-map-terminator-note');
    refreshTerminator(cities);
    setInterval(function () { refreshTerminator(cities); }, TERMINATOR_REFRESH_MS);
  }

  window.GlotempPulseMap = { pulseNode: pulseNode };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
