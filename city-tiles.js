/* Glotemp city tiles: the "City reading" section's live city browser.
 *
 * WHY THIS EXISTS
 * The reading section was locked to whichever city updateCity() had last
 * been called with (New York on the homepage), so it read as a form about
 * one city rather than an instrument covering all of them.
 *
 * HOW IT STAYS SAFE
 * This file adds NOTHING to the recording path. The homepage already keeps
 * the selected city in the hidden <select id="city-select">, and app.js
 * already listens for its `change` event to run updateCity(), which is what
 * repaints the headline, the dimensions and the ambient warmth.
 * recordObservation() reads that same select when it saves.
 *
 * So a tile click does exactly one thing: set select.value and dispatch a
 * real `change` event. Every existing behaviour then runs unmodified --
 * no IDs renamed, no listeners replaced, no localStorage touched. Remove
 * this file and the section works exactly as it did before.
 */
(function () {
  'use strict';

  var ROTATE_MS = 4200;      // how often the strip advances on its own
  var STEP_RATIO = 0.85;     // advance just under one "page" so context carries

  function cityList() {
    var src = window.CITIES_DATA;
    if (!Array.isArray(src) || !src.length) return [];
    return src.filter(function (c) { return c && c.slug && c.name && c.available !== false; });
  }

  function bandFor(city) {
    // Reuse the site's own band mapping so a tile can never disagree with
    // the dial, the barometers or the directory about a city's colour.
    if (window.GlotempCore && typeof GlotempCore.moodToBand === 'function' &&
        typeof city.mood === 'number' && !isNaN(city.mood)) {
      try { return GlotempCore.moodToBand(city.mood); } catch (e) { /* fall through */ }
    }
    return null;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function build(mount, select) {
    var cities = cityList();
    if (!cities.length) return null;

    var track = document.createElement('div');
    track.className = 'city-tiles-track';
    track.id = 'city-tiles-track';

    cities.forEach(function (city) {
      var band = bandFor(city);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'city-tile';
      btn.setAttribute('data-slug', city.slug);
      btn.setAttribute('aria-pressed', 'false');
      // A tile carries the city and its current state, nothing else --
      // the reading itself belongs to the instrument below, not to 151
      // repeated numbers.
      btn.innerHTML =
        '<span class="city-tile-mark" aria-hidden="true"' +
          (band && band.color ? ' style="--tile-band: ' + esc(band.color) + '"' : '') +
        '></span>' +
        '<span class="city-tile-name">' + esc(city.name) + '</span>' +
        (band && band.band ? '<span class="city-tile-state">' + esc(band.band) + '</span>' : '');
      track.appendChild(btn);
    });

    mount.appendChild(track);
    return track;
  }

  function markActive(track, slug) {
    var tiles = track.querySelectorAll('.city-tile');
    for (var i = 0; i < tiles.length; i++) {
      var on = tiles[i].getAttribute('data-slug') === slug;
      tiles[i].classList.toggle('is-active', on);
      tiles[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function scrollTileIntoView(track, slug) {
    var tile = track.querySelector('.city-tile[data-slug="' + slug + '"]');
    if (!tile) return;
    var left = tile.offsetLeft - (track.clientWidth - tile.offsetWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }

  function init() {
    var mount = document.getElementById('city-tiles');
    var select = document.getElementById('city-select');
    // No mount or no select means this page does not have the reading
    // section wired the way this enhancement expects -- do nothing at all
    // rather than guess.
    if (!mount || !select || mount.getAttribute('data-ready') === 'true') return;

    var track = build(mount, select);
    if (!track) return;
    mount.setAttribute('data-ready', 'true');

    function selectCity(slug, opts) {
      if (!slug) return;
      var previous = select.value;
      select.value = slug;
      // If the slug isn't in the select, the assignment silently fails and
      // value stays put -- don't fire a change that would be a no-op lie.
      if (select.value !== slug) { select.value = previous; return; }
      markActive(track, slug);
      // The one integration point: app.js's own listener does the rest.
      select.dispatchEvent(new Event('change', { bubbles: true }));
      if (opts && opts.focusMood) {
        var firstMood = document.querySelector('.check-in .mood-btn');
        if (firstMood) firstMood.focus({ preventScroll: true });
      }
    }

    track.addEventListener('click', function (e) {
      var tile = e.target.closest ? e.target.closest('.city-tile') : null;
      if (!tile) return;
      stop();
      selectCity(tile.getAttribute('data-slug'), { focusMood: true });
    });

    // ---- gentle auto-advance ----
    // A horizontally scrollable track, so this is a nudge to scrollLeft
    // rather than a carousel: swipe, trackpad and keyboard all keep
    // working natively, and there is no transform state to get out of sync.
    var timer = null;
    var stopped = false;

    function reduceMotion() {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function tick() {
      if (stopped || document.hidden) return;
      var max = track.scrollWidth - track.clientWidth;
      if (max <= 0) return;
      var next = track.scrollLeft + track.clientWidth * STEP_RATIO;
      track.scrollTo({ left: next >= max - 2 ? 0 : next, behavior: 'smooth' });
    }

    function start() {
      if (stopped || reduceMotion() || timer) return;
      timer = setInterval(tick, ROTATE_MS);
    }
    function pause() { if (timer) { clearInterval(timer); timer = null; } }
    function stop() { stopped = true; pause(); }

    // Any sign of intent stops the drift for good -- a strip that keeps
    // moving under someone who is reading it is worse than a static one.
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (evt) {
      track.addEventListener(evt, stop, { passive: true });
    });
    mount.addEventListener('mouseenter', pause);
    mount.addEventListener('mouseleave', start);
    mount.addEventListener('focusin', stop);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause(); else start();
    });

    // Reflect whatever city the page already settled on, including the
    // one app.js chose on load, and keep reflecting later changes made
    // from anywhere else on the page.
    select.addEventListener('change', function () { markActive(track, select.value); });
    if (select.value) { markActive(track, select.value); scrollTileIntoView(track, select.value); }

    start();
  }

  function boot() {
    // CITIES_DATA is a plain script, but app.js populates the select
    // asynchronously; wait for it rather than racing it.
    var tries = 0;
    (function wait() {
      var select = document.getElementById('city-select');
      if (select && select.options.length) { try { init(); } catch (e) { /* never break the page */ } return; }
      if (tries++ > 60) return;
      setTimeout(wait, 100);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
