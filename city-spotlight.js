// City Spotlight: a standalone, always-on panel beside "Spin the
// instrument" -- not part of it, does not read its state, does not call
// into it, and glotemp-spin.js does not know this file exists. Separate
// panel, separate concern, per the brief that created it.
//
// A real city photo fills the panel edge to edge, with 2-4 real trivia
// facts overlaid on a dark scrim, rotating on a timer from the moment
// the page loads -- no click, no spin, no interaction required to see
// it working.
//
// FETCHING: RELOCATED, NOT REWRITTEN
// The Wikimedia Commons themed photo search and the two-tier
// CITY_TRIVIA -> Wikipedia-extract fact logic below are the exact same
// code that powered the spin panel's own photo/fact reveal before that
// work was reverted -- moved here verbatim (function names, constants,
// fallback order all unchanged) rather than re-implemented, so this
// panel and the reverted dial never drift into two different photo/fact
// mechanisms for the same cities.
//
// ROTATION: A SMALL, CURATED LIST, NOT ALL 300 CITIES
// The 16 cities below are chosen because they are BOTH in
// city-trivia-data.js (a real fact resolves instantly, no network) AND
// in city-landmark-photos.js's LANDMARK_TITLES (a hand-verified
// Wikipedia landmark photo exists as fetchSurprisePhoto's own fallback
// if its themed Commons search comes up empty) -- so this panel rarely,
// if ever, has nothing to show. A city is only ever painted once its own
// photo AND at least one real fact have actually resolved; a draw that
// comes up short simply waits for the next timer tick rather than
// showing a gap.
(function () {
  'use strict';

  var ROTATION_CITIES = [
    'tokyo', 'paris', 'london', 'nyc', 'rome', 'sydney', 'dubai', 'singapore',
    'hong-kong', 'istanbul', 'barcelona', 'amsterdam', 'cairo', 'mumbai', 'seoul', 'berlin',
  ];

  // Matches city-of-day-photos.js's own "roughly every 15-20 seconds"
  // pacing convention elsewhere in this project.
  var CROSSFADE_MS = 18000;

  // ---------- photo: relocated from glotemp-spin.js's fetchSurprisePhoto ----------
  var COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
  var SURPRISE_MIN_DIMENSION = 400;
  var SURPRISE_THUMB_WIDTH = 1200;
  var SURPRISE_THEMES = ['garden', '"historic district"', 'temple', 'shrine', '"old town"', 'sanctuary', 'courtyard'];
  var SURPRISE_BAD_TITLE = /logo|coat[\s_]of[\s_]arms|seal[\s_]of|flag[\s_]of|\bmap\b|diagram|chart|icon|emblem|locator/i;
  var surprisePhotoCache = new Map();

  function looksLikeThemedPhoto(page) {
    var info = page && page.imageinfo && page.imageinfo[0];
    if (!info) return false;
    var mime = String(info.mime || '').toLowerCase();
    if (mime !== 'image/jpeg' && mime !== 'image/png') return false;
    if ((info.width || 0) < SURPRISE_MIN_DIMENSION && (info.height || 0) < SURPRISE_MIN_DIMENSION) return false;
    if (SURPRISE_BAD_TITLE.test(String(page.title || '').replace(/^File:/i, ''))) return false;
    return !!(info.thumburl || info.url);
  }

  async function fetchThemedCommonsPhoto(cityName) {
    try {
      var params = new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: '"' + cityName + '" (' + SURPRISE_THEMES.join(' OR ') + ')',
        gsrnamespace: '6',
        gsrlimit: '20',
        prop: 'imageinfo',
        iiprop: 'url|size|mime',
        iiurlwidth: String(SURPRISE_THUMB_WIDTH),
        format: 'json',
        origin: '*',
      });
      var resp = await fetch(COMMONS_API + '?' + params);
      if (!resp.ok) return null;
      var data = await resp.json();
      var pages = (data && data.query && data.query.pages) || {};
      for (var key of Object.keys(pages)) {
        var page = pages[key];
        if (!looksLikeThemedPhoto(page)) continue;
        var info = page.imageinfo[0];
        return info.thumburl || info.url;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function fetchSurprisePhoto(city) {
    if (surprisePhotoCache.has(city.slug)) return surprisePhotoCache.get(city.slug);
    var promise = (async () => {
      var themed = await fetchThemedCommonsPhoto(city.name);
      if (themed) return themed;
      if (window.GlotempLandmarkPhotos) return (await window.GlotempLandmarkPhotos.getPhotoUrl(city.slug)) || null;
      return null;
    })();
    surprisePhotoCache.set(city.slug, promise);
    return promise;
  }

  // ---------- facts: relocated from glotemp-spin.js's getCityFact ----------
  // Same two tiers, same order, same honesty rule -- adapted here to
  // return up to 4 separate facts as an array (this panel shows several
  // lines, not one merged sentence), never joined into a single
  // paragraph the way the spin reveal's version was.
  var WIKI_SUMMARY_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  var cityFactCache = new Map();

  function curatedFacts(city) {
    var list = window.CITY_TRIVIA && window.CITY_TRIVIA[city.slug];
    if (!Array.isArray(list) || !list.length) return null;
    var clean = list.filter((f) => typeof f === 'string' && f.trim());
    return clean.length ? clean.slice(0, 4) : null;
  }

  // Real sentence-ending punctuation followed by whitespace -- not a hard
  // character truncation, which would cut a real sentence off mid-word.
  function splitSentences(text, max) {
    var parts = String(text || '').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    return parts.slice(0, max);
  }

  async function fetchWikiExtractSentences(title) {
    try {
      var resp = await fetch(WIKI_SUMMARY_API + encodeURIComponent(title), {
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) return null;
      var data = await resp.json();
      if (!data || data.type === 'disambiguation' || !data.extract) return null;
      var sentences = splitSentences(data.extract, 4);
      return sentences.length ? sentences : null;
    } catch (e) {
      return null;
    }
  }

  function fetchWikiFacts(city) {
    if (cityFactCache.has(city.slug)) return cityFactCache.get(city.slug);
    var promise = (async () => {
      var facts = await fetchWikiExtractSentences(city.name);
      if (!facts && city.country) facts = await fetchWikiExtractSentences(city.name + ', ' + city.country);
      return facts;
    })();
    cityFactCache.set(city.slug, promise);
    return promise;
  }

  function getCityFacts(city) {
    var curated = curatedFacts(city);
    if (curated) return Promise.resolve(curated);
    return fetchWikiFacts(city);
  }

  // ---------- the rotation ----------
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
    all.forEach((c) => { bySlug[c.slug] = c; });
    return ROTATION_CITIES.map((slug) => bySlug[slug]).filter(Boolean);
  }

  function preload(src) {
    return new Promise((resolve) => {
      var img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  var cities = [];
  var deck = [];
  var current = null;
  var timer = null;
  var layerFlip = 0;

  function draw() {
    if (!deck.length) deck = shuffle(cities);
    for (var i = 0; i < deck.length; i++) {
      if (!current || deck[i].slug !== current.slug) return deck.splice(i, 1)[0];
    }
    deck = shuffle(cities);
    for (var j = 0; j < deck.length; j++) {
      if (!current || deck[j].slug !== current.slug) return deck.splice(j, 1)[0];
    }
    return null; // only reachable with a single-city rotation list
  }

  async function resolveFrame(city) {
    var results = await Promise.all([fetchSurprisePhoto(city), getCityFacts(city)]);
    var photoUrl = results[0];
    var facts = results[1];
    if (!photoUrl || !facts || !facts.length) return null;
    var ok = await preload(photoUrl);
    if (!ok) return null;
    return { slug: city.slug, name: city.name, photoUrl: photoUrl, facts: facts };
  }

  function paint(frame) {
    var host = document.getElementById('city-spotlight-section');
    if (!host || !frame) return;
    var layers = host.querySelectorAll('.spotlight-layer');
    if (layers.length !== 2) return;
    var incoming = layers[layerFlip % 2];
    var outgoing = layers[(layerFlip + 1) % 2];
    incoming.style.backgroundImage = 'url("' + frame.photoUrl + '")';
    incoming.classList.add('is-on');
    outgoing.classList.remove('is-on');
    layerFlip++;

    var caption = host.querySelector('.spotlight-caption');
    if (caption) {
      caption.innerHTML =
        '<p class="spotlight-city">' + esc(frame.name) + '</p>' +
        frame.facts.map((f) => '<p class="spotlight-fact">' + esc(f) + '</p>').join('');
    }
    current = frame;
  }

  async function advance() {
    if (document.hidden || !cities.length) return;
    var attempts = Math.min(cities.length, 4);
    for (var i = 0; i < attempts; i++) {
      var candidate = draw();
      if (!candidate) return;
      var frame = await resolveFrame(candidate);
      if (frame) { paint(frame); return; }
    }
  }

  function shellHTML() {
    return (
      '<div class="spotlight-layer"></div>' +
      '<div class="spotlight-layer"></div>' +
      '<div class="spotlight-scrim"></div>' +
      '<div class="spotlight-caption"></div>'
    );
  }

  async function mount() {
    var host = document.getElementById('city-spotlight-section');
    if (!host) return;
    host.innerHTML = shellHTML();

    cities = resolveCities();
    if (!cities.length) return; // CITIES_DATA not ready -- panel stays empty, no gap shown

    deck = shuffle(cities);
    var attempts = Math.min(cities.length, 4);
    for (var i = 0; i < attempts && !current; i++) {
      var candidate = draw();
      if (!candidate) break;
      var frame = await resolveFrame(candidate);
      if (frame) paint(frame);
    }
    if (!current) return; // nothing resolved -- panel stays empty, not broken

    host.classList.add('has-photo');
    if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      timer = setInterval(advance, CROSSFADE_MS);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
