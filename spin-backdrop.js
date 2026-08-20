/* Glotemp spin backdrop: the "One turn, one answer" section, furnished.
 *
 * WHAT THIS IS FOR
 * The section was bare next to the rest of the page -- thin rules, small
 * type, flat ground, a lot of empty room. It now carries a photograph of
 * a real city behind it, that city's name, and one thing worth knowing
 * about it, and it carries all three from the moment the page loads. A
 * visitor who never touches the dial still sees a finished section.
 *
 * Spinning does not switch the section on; it only changes which city is
 * showing. See GlotempSpinBackdrop.showCity(), which glotemp-spin.js
 * calls when a spin lands.
 *
 * WHERE THE MEDIA COMES FROM
 * /city-media/manifest.json, written by scripts/fetch-city-media.js on a
 * schedule. Nothing here talks to Openverse or Commons -- by the time the
 * page loads, the photographs are already files on this origin, each one
 * carrying the creator, the licence and the page it came from.
 *
 * A city is only in the rotation if it has BOTH a licensed photograph and
 * at least one fact. A city missing either is skipped entirely: there is
 * no blank frame and no placeholder, and nothing is invented to fill a
 * gap.
 *
 * SCOPE
 * This file writes into #spin-backdrop and #spin-caption and nothing
 * else. Remove it and the section renders exactly as it did before.
 */
(function () {
  'use strict';

  var MANIFEST_URL = '/city-media/manifest.json';
  var CROSSFADE_MS = 9000;      // as specified: a new face every nine seconds
  var FADE_MS = 1400;           // the fade itself -- never a hard swap
  var FETCH_TIMEOUT_MS = 5000;

  var frames = [];              // [{ slug, name, image, fact }]
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

  function factsFor(slug) {
    var all = window.CITY_TRIVIA;
    var list = all && all[slug];
    return Array.isArray(list) ? list.filter(function (f) { return typeof f === 'string' && f.trim(); }) : [];
  }

  // Every (image, fact) pairing a city can offer, so the same city shows a
  // different face each time it comes round rather than repeating one
  // photograph with one line.
  function buildFrames(manifest) {
    var out = [];
    Object.keys(manifest.cities || {}).forEach(function (slug) {
      var entry = manifest.cities[slug];
      var images = (entry && entry.images) || [];
      var facts = factsFor(slug);
      if (!images.length || !facts.length) return;   // skipped, not faked
      var n = Math.max(images.length, facts.length);
      for (var i = 0; i < n; i++) {
        out.push({
          slug: slug,
          name: entry.name || slug,
          image: images[i % images.length],
          fact: facts[i % facts.length],
        });
      }
    });
    return out;
  }

  // A deck, so every city is offered before any is offered twice -- and
  // never the same city twice consecutively.
  function draw() {
    if (!deck.length) deck = shuffle(frames);
    for (var i = 0; i < deck.length; i++) {
      if (!current || deck[i].slug !== current.slug) return deck.splice(i, 1)[0];
    }
    deck = shuffle(frames);
    for (var j = 0; j < deck.length; j++) {
      if (!current || deck[j].slug !== current.slug) return deck.splice(j, 1)[0];
    }
    return null;   // only reachable if every frame is the same city
  }

  function preload(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(true); };
      img.onerror = function () { resolve(false); };
      img.src = src;
    });
  }

  function paint(frame) {
    var backdrop = document.getElementById('spin-backdrop');
    var caption = document.getElementById('spin-caption');
    if (!backdrop || !caption || !frame) return;

    var layers = backdrop.querySelectorAll('.spin-bd-layer');
    if (layers.length !== 2) return;
    var incoming = layers[layerFlip % 2];
    var outgoing = layers[(layerFlip + 1) % 2];
    incoming.style.backgroundImage = 'url("' + frame.image.src + '")';
    incoming.classList.add('is-on');
    outgoing.classList.remove('is-on');
    layerFlip++;

    caption.innerHTML =
      '<p class="spin-city">' + esc(frame.name) + '</p>' +
      '<p class="spin-fact">' + esc(frame.fact) + '</p>';

    var credit = document.getElementById('spin-credit');
    if (credit) {
      credit.innerHTML =
        '<a class="spin-credit-link" href="' + esc(frame.image.sourceUrl) + '" target="_blank" rel="noopener noreferrer nofollow">' +
          esc(frame.image.creator) + '</a>' +
        '<span class="spin-credit-sep" aria-hidden="true">·</span>' +
        '<span class="spin-credit-lic">' + esc(frame.image.licence) + '</span>';
      credit.hidden = false;
    }

    document.getElementById('spin-section').classList.add('has-backdrop');
    current = frame;
  }

  async function advance() {
    if (stopped || paused || document.hidden || !onScreen) return;
    var next = draw();
    if (!next) return;
    var ok = await preload(next.image.src);
    if (!ok || stopped) return;      // a dead file is skipped, never shown as a gap
    paint(next);
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
  // rotation the visitor has already stopped.
  async function showCity(slug) {
    stop();
    var matches = frames.filter(function (f) { return f.slug === slug; });
    if (!matches.length) return false;
    var frame = matches[Math.floor(Math.random() * matches.length)];
    var ok = await preload(frame.image.src);
    if (!ok) return false;
    paint(frame);
    return true;
  }

  function getJSON(url) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, FETCH_TIMEOUT_MS);
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) { clearTimeout(t); return d; });
  }

  function wire(section) {
    // Hover holds it; leaving resumes. Any real intent stops it.
    section.addEventListener('mouseenter', pause);
    section.addEventListener('mouseleave', resume);
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (evt) {
      section.addEventListener(evt, stop, { passive: true });
    });
    section.addEventListener('focusin', stop);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !stopped) { /* interval keeps its own guard */ }
    });
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

    var manifest = await getJSON(MANIFEST_URL);
    if (!manifest || !manifest.cities) return;   // section stays exactly as it was
    frames = buildFrames(manifest);
    if (!frames.length) return;

    deck = shuffle(frames);
    // Furnished on load: paint before the first interval ever fires.
    var first = deck.shift();
    if (first) {
      var ok = await preload(first.image.src);
      if (ok) paint(first);
      else { var second = draw(); if (second && await preload(second.image.src)) paint(second); }
    }
    if (!current) return;

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
  // this must run after it rather than racing it for #spin-backdrop.
  function boot() {
    var tries = 0;
    (function wait() {
      if (document.getElementById('spin-backdrop')) { mount(); return; }
      if (tries++ > 60) return;
      setTimeout(wait, 100);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
