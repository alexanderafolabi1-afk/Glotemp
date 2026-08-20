/* Glotemp spin backdrop: the "One turn, one answer" section, furnished.
 *
 * WHAT THIS IS FOR
 * The section was bare next to the rest of the page -- thin rules, small
 * type, flat ground, a lot of empty room. It now carries a photograph of
 * a real city behind it, that city's name, and one real thing worth
 * knowing about it, and it carries all three from the moment the page
 * loads. A visitor who never touches the dial still sees a finished,
 * living section.
 *
 * Spinning does not switch the section on; it only changes which city is
 * showing. See GlotempSpinBackdrop.showCity(), which glotemp-spin.js
 * calls when a spin lands -- the ambient rotation and a spin's own
 * result never fight, because the moment anyone touches the instrument
 * (hover, click, keyboard, touch) the rotation stops for good. See
 * wire() below.
 *
 * WHERE THE MEDIA COMES FROM
 * The exact same fetchers a spin's own result uses -- window.GlotempSpin
 * (fetchSurprisePhoto, getCityFact), exported by glotemp-spin.js
 * specifically so this file never re-implements the same themed Commons
 * search or the same two-tier CITY_TRIVIA -> Wikipedia-extract fallback
 * a second time. Nothing here talks to Commons or Wikipedia directly.
 *
 * ROTATION IS A SMALL, CURATED LIST, NOT ALL 300 CITIES
 * ROTATION_CITIES below (16 cities) are chosen specifically because they
 * are BOTH in city-trivia-data.js (a real fact resolves instantly, no
 * network) AND in city-landmark-photos.js's LANDMARK_TITLES (a
 * hand-verified Wikipedia landmark photo exists as fetchSurprisePhoto's
 * own fallback if its themed Commons search comes up empty) -- so this
 * ambient layer is built to rarely, if ever, hit the "nothing to show"
 * case, without needing to cover the whole roster the way the per-spin
 * result does. A city is only ever shown once its own photo AND fact
 * have actually resolved; nothing is painted from a partial or invented
 * result, and a draw whose photo fails simply waits for the next timer
 * tick rather than showing a gap.
 */
(function () {
  'use strict';

  // Same 16 cities described above. Order here is irrelevant -- draw()
  // shuffles.
  var ROTATION_CITIES = [
    'tokyo', 'paris', 'london', 'nyc', 'rome', 'sydney', 'dubai', 'singapore',
    'hong-kong', 'istanbul', 'barcelona', 'amsterdam', 'cairo', 'mumbai', 'seoul', 'berlin',
  ];

  // Matches city-of-day-photos.js's own "roughly every 15-20 seconds"
  // pacing convention elsewhere in this project -- one ambient rotation
  // reads as one system, not two different rhythms.
  var CROSSFADE_MS = 18000;
  var FADE_MS = 1400; // the fade itself -- never a hard swap

  var cities = [];              // [{ slug, name }] resolved from CITIES_DATA, once
  var deck = [];
  var current = null;
  var timer = null;
  var stopped = false;
  var paused = false;
  var onScreen = true;
  var layerFlip = 0;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function resolveCities() {
    var all = (typeof window !== 'undefined' && window.CITIES_DATA) || [];
    var bySlug = {};
    all.forEach(function (c) { bySlug[c.slug] = c; });
    return ROTATION_CITIES.map(function (slug) { return bySlug[slug]; }).filter(Boolean);
  }

  // A deck, so every city is offered before any is offered twice -- and
  // never the same city twice consecutively.
  function draw() {
    if (!deck.length) deck = shuffle(cities);
    for (var i = 0; i < deck.length; i++) {
      if (!current || deck[i].slug !== current.slug) return deck.splice(i, 1)[0];
    }
    deck = shuffle(cities);
    for (var j = 0; j < deck.length; j++) {
      if (!current || deck[j].slug !== current.slug) return deck.splice(j, 1)[0];
    }
    return null; // only reachable if the rotation list has a single city
  }

  function preload(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(true); };
      img.onerror = function () { resolve(false); };
      img.src = src;
    });
  }

  // Resolves a real (photo, fact) pair for one city, or null if either
  // side genuinely has nothing this time -- see window.GlotempSpin's own
  // header comments for what "nothing" means for each (a failed/blocked
  // fetch for the photo; both CITY_TRIVIA and Wikipedia's extract coming
  // up empty for the fact, which should not happen for these 16 curated
  // cities, but is still handled rather than assumed).
  async function resolveFrame(city) {
    if (!window.GlotempSpin) return null;
    var results = await Promise.all([
      window.GlotempSpin.fetchSurprisePhoto(city),
      window.GlotempSpin.getCityFact(city),
    ]);
    var photoUrl = results[0];
    var fact = results[1];
    if (!photoUrl || !fact) return null;
    var ok = await preload(photoUrl);
    if (!ok) return null;
    return { slug: city.slug, name: city.name, photoUrl: photoUrl, fact: fact };
  }

  function paint(frame) {
    var backdrop = document.getElementById('spin-backdrop');
    var caption = document.getElementById('spin-caption');
    if (!backdrop || !caption || !frame) return;

    var layers = backdrop.querySelectorAll('.spin-bd-layer');
    if (layers.length !== 2) return;
    var incoming = layers[layerFlip % 2];
    var outgoing = layers[(layerFlip + 1) % 2];
    incoming.style.backgroundImage = 'url("' + frame.photoUrl + '")';
    incoming.classList.add('is-on');
    outgoing.classList.remove('is-on');
    layerFlip++;

    caption.innerHTML =
      '<p class="spin-city">' + esc(frame.name) + '</p>' +
      '<p class="spin-fact">' + esc(frame.fact) + '</p>';

    // No attribution line: unlike a pre-fetched manifest entry, a
    // live-fetched Commons/Wikipedia URL here carries no creator/licence
    // metadata to show -- exactly like a spin's own per-result photo,
    // which renders the same way. #spin-credit simply stays hidden.

    document.getElementById('spin-section').classList.add('has-backdrop');
    current = frame;
  }

  // Tries drawn cities in turn (bounded) until one resolves a real frame,
  // rather than giving up on a single city's transient fetch hiccup --
  // but never invents one: if nothing in the rotation resolves this
  // tick, the current frame simply stands until the next timer tick.
  async function advance() {
    if (stopped || paused || document.hidden || !onScreen || !cities.length) return;
    var attempts = Math.min(cities.length, 4);
    for (var i = 0; i < attempts; i++) {
      var candidate = draw();
      if (!candidate) return;
      var frame = await resolveFrame(candidate);
      if (stopped) return; // interaction happened mid-fetch
      if (frame) { paint(frame); return; }
    }
  }

  function start() {
    if (stopped || timer) return;
    timer = setInterval(advance, CROSSFADE_MS);
  }
  function pause() { paused = true; }
  function resume() { if (!stopped) paused = false; }

  // The moment anyone touches the instrument, the rotation stops for
  // good: a backdrop that keeps changing under someone who is reading it,
  // or who has just spun for an answer, is worse than one that holds.
  function stop() {
    stopped = true;
    if (timer) { clearInterval(timer); timer = null; }
  }

  // Called by glotemp-spin.js when a spin lands. Spinning changes which
  // city shows; it never turns the section on, and it never resurrects a
  // rotation the visitor has already stopped. Uses the exact same
  // fetchers as the ambient rotation and the spin's own result panel --
  // one mechanism, three call sites.
  async function showCity(slug) {
    stop();
    var all = (typeof window !== 'undefined' && window.CITIES_DATA) || [];
    var city = all.filter(function (c) { return c.slug === slug; })[0];
    if (!city || !window.GlotempSpin) return false;
    var frame = await resolveFrame(city);
    if (!frame) return false;
    paint(frame);
    return true;
  }

  function wire(section) {
    // Hover holds it; leaving resumes. Any real intent stops it.
    section.addEventListener('mouseenter', pause);
    section.addEventListener('mouseleave', resume);
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (evt) {
      section.addEventListener(evt, stop, { passive: true });
    });
    section.addEventListener('focusin', stop);
    if (typeof IntersectionObserver === 'function') {
      onScreen = false;
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { onScreen = e.isIntersecting; });
      }, { threshold: 0.15 }).observe(section);
    }
  }

  async function mount() {
    var section = document.getElementById('spin-section');
    if (!section || !document.getElementById('spin-backdrop')) return;

    cities = resolveCities();
    if (!cities.length) return; // CITIES_DATA not ready/available -- section stays exactly as it was

    deck = shuffle(cities);
    // Furnished on load: try to paint before the first interval ever
    // fires, same bounded-attempts approach as advance().
    var attempts = Math.min(cities.length, 4);
    for (var i = 0; i < attempts && !current; i++) {
      var candidate = draw();
      if (!candidate) break;
      var frame = await resolveFrame(candidate);
      if (frame) paint(frame);
    }
    if (!current) return; // nothing resolved -- section stays exactly as it was, no gap shown

    wire(section);
    if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) start();
  }

  window.GlotempSpinBackdrop = {
    showCity: showCity,
    stop: stop,
    mount: mount,
    FADE_MS: FADE_MS,
    CROSSFADE_MS: CROSSFADE_MS,
  };

  // glotemp-spin.js writes the section's markup on DOMContentLoaded, so
  // this must run after it rather than racing it for #spin-backdrop --
  // and after glotemp-spin.js has attached window.GlotempSpin.
  function boot() {
    var tries = 0;
    (function wait() {
      if (document.getElementById('spin-backdrop') && window.GlotempSpin) { mount(); return; }
      if (tries++ > 60) return;
      setTimeout(wait, 100);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
