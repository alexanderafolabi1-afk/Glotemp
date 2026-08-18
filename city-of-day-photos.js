// A slow, ambient photo rotation behind the "Somewhere else is awake"
// panel -- but only for whichever city city-of-the-day.js currently
// names. Every other city keeps the panel exactly as it already is: no
// image element, no background layer, nothing added or removed. This
// file does not decide which city that is; it only knows how to fetch
// and rotate photos once told.
//
// SOURCE: WIKIMEDIA COMMONS, FREE AND KEYLESS
// Same free-tier, no-API-key family as city-landmark-photos.js's
// Wikipedia REST calls, one step further into the same project: Commons'
// action API, queried for files filed directly under the city's own
// category (Category:<CityName>). Direct membership only, not
// subcategories -- "People from <city>" and similar subcats pull in
// portraits and unrelated ephemera, not photos of the place itself.
// origin=* is Wikimedia's documented opt-in for anonymous cross-origin
// reads of the action API; no key, no auth, nothing server-side involved.
//
// FILTERING IS REASONABLE, NOT PERFECT (as specified)
// Commons doesn't tag "this is a skyline photo" vs "this is a coat of
// arms" in any structured way that's reliable to query. What's used here:
// only jpeg/png (svg is almost always a diagram, map, flag or logo, never
// a photograph), a minimum pixel size (drops icons and thumbnails), and a
// title-keyword blocklist for the common non-photo categories that slip
// through the mime filter. This will occasionally let a bad match through
// or drop a good one; it will not systematically favour fake content over
// real, because everything returned is a real Commons file with a real
// URL -- there is no synthetic fallback if too few pass.
//
// NEVER PAD TO 12. A city with 3 real qualifying photos gets a 3-photo
// rotation. A city with 0 gets none, and the panel renders exactly as it
// does for any other city -- this is a legitimate outcome, not an error.
(function () {
  'use strict';

  var COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
  var MAX_PHOTOS = 12;
  var MIN_DIMENSION = 400;
  var THUMB_WIDTH = 1600;
  var CROSSFADE_MS = 18000; // within the requested 15-20s window
  var FADE_TRANSITION_MS = 2000;

  var BAD_TITLE = /logo|coat[\s_]of[\s_]arms|seal[\s_]of|flag[\s_]of|\bmap\b|diagram|chart|icon|emblem|locator/i;

  // In-memory only, matching city-landmark-photos.js's own cache -- fetch
  // once per page load, no cross-session persistence, no localStorage
  // quota or staleness questions to manage for a background image.
  var cache = new Map();

  function stripFilePrefix(title) {
    return String(title || '').replace(/^File:/i, '');
  }

  function looksLikeRealPhoto(page) {
    var info = page && page.imageinfo && page.imageinfo[0];
    if (!info) return false;
    var mime = String(info.mime || '').toLowerCase();
    if (mime !== 'image/jpeg' && mime !== 'image/png') return false;
    if ((info.width || 0) < MIN_DIMENSION && (info.height || 0) < MIN_DIMENSION) return false;
    if (BAD_TITLE.test(stripFilePrefix(page.title || ''))) return false;
    var thumb = info.thumburl || info.url;
    return !!thumb;
  }

  function fetchPhotos(cityName) {
    if (cache.has(cityName)) return cache.get(cityName);
    var promise = (async () => {
      try {
        var category = 'Category:' + cityName;
        var params = new URLSearchParams({
          action: 'query',
          generator: 'categorymembers',
          gcmtitle: category,
          gcmtype: 'file',
          gcmnamespace: '6',
          gcmlimit: '50',
          prop: 'imageinfo',
          iiprop: 'url|size|mime',
          iiurlwidth: String(THUMB_WIDTH),
          format: 'json',
          origin: '*',
        });
        var resp = await fetch(COMMONS_API + '?' + params);
        if (!resp.ok) return [];
        var data = await resp.json();
        var pages = (data && data.query && data.query.pages) || {};
        var urls = [];
        Object.keys(pages).forEach(function (key) {
          var page = pages[key];
          if (!looksLikeRealPhoto(page)) return;
          var info = page.imageinfo[0];
          urls.push(info.thumburl || info.url);
        });
        return urls.slice(0, MAX_PHOTOS);
      } catch (e) {
        return [];
      }
    })();
    cache.set(cityName, promise);
    return promise;
  }

  // Two stacked <img> layers, crossfaded by toggling which one carries
  // the "is-active" class -- no arrows, no dots, no counter, nothing a
  // visitor can click or that announces itself as a slideshow. The next
  // frame is preloaded before the swap so the crossfade never reveals a
  // blank/loading frame.
  function buildLayers(hostEl) {
    hostEl.innerHTML =
      '<div class="elsewhere-photo-scrim"></div>' +
      '<img class="elsewhere-photo-layer" alt="">' +
      '<img class="elsewhere-photo-layer" alt="">';
    return hostEl.querySelectorAll('.elsewhere-photo-layer');
  }

  function preload(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(true); };
      img.onerror = function () { resolve(false); };
      img.src = src;
    });
  }

  var activeTimer = null;

  function stop() {
    if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
  }

  // hostEl must already exist in the DOM (glotemp-elsewhere.js creates it
  // only when painting the City of the Day; every other city never calls
  // this at all). Silently does nothing if there are no qualifying photos
  // -- the host stays empty, exactly like a city with no photo layer.
  async function attach(hostEl, city) {
    stop();
    if (!hostEl || !city) return;
    var urls = await fetchPhotos(city.name);
    if (!hostEl.isConnected) return; // panel repainted (city changed) while this was in flight
    if (!urls.length) { hostEl.innerHTML = ''; return; }

    var layers = buildLayers(hostEl);
    var idx = 0;
    layers[0].src = urls[0];
    layers[0].classList.add('is-active');
    if (urls.length === 1) return; // one real photo: show it, no rotation to run

    activeTimer = setInterval(async function () {
      if (!hostEl.isConnected) { stop(); return; }
      var nextIdx = (idx + 1) % urls.length;
      var incoming = layers[(idx + 1) % 2];
      var outgoing = layers[idx % 2];
      await preload(urls[nextIdx]);
      incoming.src = urls[nextIdx];
      incoming.classList.add('is-active');
      outgoing.classList.remove('is-active');
      idx = nextIdx;
    }, CROSSFADE_MS);
  }

  window.GlotempCityOfDayPhotos = { attach: attach, stop: stop, FADE_TRANSITION_MS: FADE_TRANSITION_MS };
})();
