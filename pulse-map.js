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
// only, no map library.
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

    renderLandmasses();
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
  }

  window.GlotempPulseMap = { pulseNode: pulseNode };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
