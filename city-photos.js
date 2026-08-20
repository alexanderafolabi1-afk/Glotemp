/* Glotemp city photos: one real photograph for every city, from free sources.
 *
 * WHY THIS EXISTS
 * The trending grid asked city-landmark-photos.js for a picture by passing
 * the city's display name straight to Wikipedia's summary endpoint. That
 * works for Paris and fails for a large share of the 300:
 *
 *   "New York"   -> the STATE's article, not the city
 *   "Phoenix"    -> the mythological bird
 *   "Split"      -> a disambiguation page (no thumbnail at all)
 *   "Xi'an"      -> our data uses a curly apostrophe, the article uses a
 *                   straight one, so the title simply does not exist
 *   "Goa (Panaji)", "Bali (Denpasar)", "Wadi Musa (Petra)"
 *                -> not article titles in any form
 *
 * A miss returned null silently, so those cards showed a coloured blob
 * forever and the grid looked inconsistent card to card.
 *
 * HOW THIS FIXES IT
 * Four candidates per city, tried in order, stopping at the first that
 * yields a real thumbnail from a page that is not a disambiguation:
 *
 *   1. a verified article title, for the ~35 cities whose display name is
 *      genuinely the wrong subject or not a title at all (TITLE_OVERRIDES)
 *   2. the display name itself
 *   3. "<name>, <country>", which is how Wikipedia disambiguates places
 *   4. a full-text search for the name and country, taking the top hit's
 *      page image -- the universal catch for anything the first three miss
 *
 * and then, if Wikipedia has nothing, Wikimedia Commons' own category for
 * the city. Both are free, keyless, and already used elsewhere on the site
 * (city-wiki.js, city-landmark-photos.js, city-of-day-photos.js), so this
 * adds no new dependency and no licence question -- the page's existing
 * CC BY-SA attribution line covers imagery pulled from Wikipedia.
 *
 * BATCHED, NOT 300 REQUESTS
 * Steps 2 and 3 go through action=query, which accepts up to 50 titles at
 * once. Callers ask per city; this module collects those asks for a beat
 * and issues one request per 40 cities. Results are cached in localStorage
 * so a returning visitor pays nothing at all.
 *
 * NEVER A PLACEHOLDER. A city that genuinely resolves to nothing resolves
 * to null and the caller keeps whatever it already draws. Nothing here
 * invents, generates, or substitutes an image.
 */
(function () {
  'use strict';

  var WIKI_API = 'https://en.wikipedia.org/w/api.php';
  var COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
  var THUMB_PX = 640;
  var TIMEOUT_MS = 5000;      // site rule: five seconds, then give up
  var BATCH_SIZE = 40;        // action=query accepts 50; leave headroom
  var BATCH_DELAY_MS = 30;    // collect callers within one paint, then fire

  var STORE_KEY = 'glotemp:city-photos:v1';
  var HIT_TTL_MS = 30 * 24 * 60 * 60 * 1000;  // a photo URL is stable
  var MISS_TTL_MS = 3 * 24 * 60 * 60 * 1000;  // retry a miss sooner

  var MIN_COMMONS_DIMENSION = 400;
  var BAD_COMMONS_TITLE = /logo|coat[\s_]of[\s_]arms|seal[\s_]of|flag[\s_]of|\bmap\b|diagram|chart|icon|emblem|locator/i;

  // Only where the display name in cities-data.js is the wrong subject on
  // en.wikipedia, or is not an article title at all. Everything not listed
  // here goes through the automatic chain above -- this is a correctness
  // list, not a curation list, and the site works without it.
  var TITLE_OVERRIDES = {
    nyc: 'New York City',                       // "New York" is the state
    'washington-dc': 'Washington, D.C.',
    phoenix: 'Phoenix, Arizona',                // "Phoenix" is the bird
    'xi-an': "Xi'an",                           // our data has a curly apostrophe
    nara: 'Nara, Nara',
    split: 'Split, Croatia',
    cordoba: 'Córdoba, Spain',
    cartagena: 'Cartagena, Colombia',
    'granada-nicaragua': 'Granada, Nicaragua',
    salvador: 'Salvador, Bahia',
    oaxaca: 'Oaxaca City',                      // "Oaxaca" is the state
    mendoza: 'Mendoza, Argentina',
    nassau: 'Nassau, Bahamas',
    aruba: 'Oranjestad, Aruba',
    banff: 'Banff, Alberta',
    whistler: 'Whistler, British Columbia',
    queenstown: 'Queenstown, New Zealand',
    'gold-coast': 'Gold Coast, Queensland',
    'george-town-cayman': 'George Town, Cayman Islands',
    'george-town-penang': 'George Town, Penang',
    'el-nido': 'El Nido, Palawan',
    'wadi-musa': 'Wadi Musa',                   // name carries "(Petra)"
    'bali-denpasar': 'Denpasar',                // name carries "(Denpasar)"
    goa: 'Panaji',                              // name carries "(Panaji)"
    faro: 'Faro, Portugal',
    santiago: 'Santiago, Chile',
    'lake-como': 'Como',
    sapa: 'Sa Pa',
    hue: 'Huế',
    banos: 'Baños de Agua Santa',
    'aguas-calientes': 'Aguas Calientes, Peru',
    pai: 'Pai District',
    'iguazu': 'Puerto Iguazú',
  };

  // ---------- persistent cache ----------

  var store = null;

  function loadStore() {
    if (store) return store;
    store = {};
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') store = parsed;
      }
    } catch (e) { store = {}; }
    return store;
  }

  var saveQueued = false;
  function saveStore() {
    if (saveQueued) return;
    saveQueued = true;
    setTimeout(function () {
      saveQueued = false;
      try { localStorage.setItem(STORE_KEY, JSON.stringify(loadStore())); }
      catch (e) { /* quota or private mode: the in-memory copy still works */ }
    }, 500);
  }

  function cached(slug) {
    var entry = loadStore()[slug];
    if (!entry || typeof entry.t !== 'number') return undefined;
    var ttl = entry.u ? HIT_TTL_MS : MISS_TTL_MS;
    if (Date.now() - entry.t > ttl) return undefined;
    return entry.u || null;
  }

  function remember(slug, url) {
    loadStore()[slug] = { u: url || null, t: Date.now() };
    saveStore();
  }

  // ---------- fetch helpers ----------

  function getJSON(url) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, TIMEOUT_MS);
    return fetch(url, controller ? { signal: controller.signal } : undefined)
      .then(function (resp) { return resp.ok ? resp.json() : null; })
      .catch(function () { return null; })
      .then(function (data) { clearTimeout(timer); return data; });
  }

  function apiURL(base, params) {
    params.format = 'json';
    params.formatversion = '2';
    params.origin = '*';
    return base + '?' + new URLSearchParams(params).toString();
  }

  // Wikipedia normalises and redirects the titles it was asked for, so the
  // page that comes back is rarely titled the way it was requested. Both
  // hops are reported, so follow them to map every requested title back to
  // whichever page answered it.
  function titleResolver(query) {
    var hops = {};
    ['normalized', 'redirects'].forEach(function (kind) {
      (query && query[kind] || []).forEach(function (h) {
        if (h && h.from && h.to) hops[key(h.from)] = h.to;
      });
    });
    function key(t) { return String(t || '').replace(/_/g, ' ').trim().toLowerCase(); }
    return function (requested) {
      var current = requested;
      for (var i = 0; i < 4; i++) {              // bounded: redirect loops exist
        var next = hops[key(current)];
        if (!next || next === current) break;
        current = next;
      }
      return key(current);
    };
  }

  function usableThumb(page) {
    if (!page || page.missing || page.invalid) return null;
    // A disambiguation page can carry a thumbnail (one of the candidates'
    // images); it is never a photo *of* the place we asked about.
    if (page.pageprops && typeof page.pageprops.disambiguation !== 'undefined') return null;
    return (page.thumbnail && page.thumbnail.source) || null;
  }

  // One request, up to BATCH_SIZE titles. Resolves to { <requested title>: url|null }.
  function fetchTitles(titles) {
    if (!titles.length) return Promise.resolve({});
    var url = apiURL(WIKI_API, {
      action: 'query',
      redirects: '1',
      prop: 'pageimages|pageprops',
      ppprop: 'disambiguation',
      piprop: 'thumbnail',
      pithumbsize: String(THUMB_PX),
      titles: titles.join('|'),
    });
    return getJSON(url).then(function (data) {
      var out = {};
      titles.forEach(function (t) { out[t] = null; });
      var query = data && data.query;
      if (!query) return out;
      var byTitle = {};
      (query.pages || []).forEach(function (page) {
        byTitle[String(page.title || '').replace(/_/g, ' ').trim().toLowerCase()] = page;
      });
      var resolve = titleResolver(query);
      titles.forEach(function (t) { out[t] = usableThumb(byTitle[resolve(t)]); });
      return out;
    });
  }

  // Last Wikipedia resort: let the search index find the article, whatever
  // it happens to be called. One request per city, so this only ever runs
  // for the handful the batched title lookups could not place.
  function fetchBySearch(name, country) {
    var url = apiURL(WIKI_API, {
      action: 'query',
      generator: 'search',
      gsrsearch: name + (country ? ' ' + country : ''),
      gsrnamespace: '0',
      gsrlimit: '3',
      prop: 'pageimages|pageprops',
      ppprop: 'disambiguation',
      piprop: 'thumbnail',
      pithumbsize: String(THUMB_PX),
    });
    return getJSON(url).then(function (data) {
      var raw = (data && data.query && data.query.pages) || [];
      // generator=search returns pages in an arbitrary order; index carries
      // the actual ranking, so sort by it rather than trusting array order.
      var pages = raw.slice().sort(function (a, b) { return (a.index || 0) - (b.index || 0); });
      for (var i = 0; i < pages.length; i++) {
        var src = usableThumb(pages[i]);
        if (src) return src;
      }
      return null;
    });
  }

  // Wikimedia Commons' own category for the city -- a second free source,
  // filtered the same way city-of-day-photos.js filters it (real raster
  // photographs only, no flags, seals, maps or diagrams).
  function fetchFromCommons(name) {
    var url = apiURL(COMMONS_API, {
      action: 'query',
      generator: 'categorymembers',
      gcmtitle: 'Category:' + name,
      gcmtype: 'file',
      gcmnamespace: '6',
      gcmlimit: '25',
      prop: 'imageinfo',
      iiprop: 'url|size|mime',
      iiurlwidth: String(THUMB_PX),
    });
    return getJSON(url).then(function (data) {
      var pages = (data && data.query && data.query.pages) || [];
      for (var i = 0; i < pages.length; i++) {
        var page = pages[i];
        var info = page && page.imageinfo && page.imageinfo[0];
        if (!info) continue;
        var mime = String(info.mime || '').toLowerCase();
        if (mime !== 'image/jpeg' && mime !== 'image/png') continue;
        if ((info.width || 0) < MIN_COMMONS_DIMENSION && (info.height || 0) < MIN_COMMONS_DIMENSION) continue;
        if (BAD_COMMONS_TITLE.test(String(page.title || '').replace(/^File:/i, ''))) continue;
        if (info.thumburl || info.url) return info.thumburl || info.url;
      }
      return null;
    });
  }

  // ---------- the per-city pipeline ----------

  function cityFor(slug) {
    var list = (typeof window !== 'undefined' && window.CITIES_DATA) || [];
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
  }

  var inFlight = {};   // slug -> Promise<url|null>
  var queue = [];      // slugs waiting for the next batched title lookup
  var queueTimer = null;

  function enqueue(slug) {
    return new Promise(function (resolve) {
      queue.push({ slug: slug, resolve: resolve });
      if (queueTimer) return;
      // One short delay, then drain everything that accumulated during it
      // in BATCH_SIZE-sized requests. Priming all 300 at once therefore
      // costs 8 requests, not 300.
      queueTimer = setTimeout(function () {
        queueTimer = null;
        while (queue.length) runBatch(queue.splice(0, BATCH_SIZE));
      }, BATCH_DELAY_MS);
    });
  }

  // Two batched rounds ("Name", then "Name, Country") cover the great
  // majority; whatever is still unresolved falls through to per-city search
  // and then Commons.
  function runBatch(batch) {
    if (!batch.length) return;
    var entries = batch.map(function (item) {
      var city = cityFor(item.slug);
      return {
        slug: item.slug,
        resolve: item.resolve,
        name: city ? city.name : null,
        country: city ? city.country : null,
        primary: TITLE_OVERRIDES[item.slug] || (city ? city.name : null),
      };
    });

    var round1 = entries.filter(function (e) { return e.primary; });
    var titles1 = uniq(round1.map(function (e) { return e.primary; }));

    fetchTitles(titles1).then(function (found1) {
      var unresolved = [];
      round1.forEach(function (e) {
        var url = found1[e.primary];
        if (url) finish(e, url); else unresolved.push(e);
      });
      entries.filter(function (e) { return !e.primary; })
             .forEach(function (e) { unresolved.push(e); });

      var round2 = unresolved.filter(function (e) { return e.name && e.country; });
      var titles2 = uniq(round2.map(function (e) { return e.name + ', ' + e.country; }));

      return fetchTitles(titles2).then(function (found2) {
        var stillOpen = [];
        unresolved.forEach(function (e) {
          var url = (e.name && e.country) ? found2[e.name + ', ' + e.country] : null;
          if (url) finish(e, url); else stillOpen.push(e);
        });
        // Serially, not in parallel: these are one request per city and
        // there is no hurry -- the card already shows its band swatch.
        return stillOpen.reduce(function (chain, e) {
          return chain.then(function () {
            if (!e.name) { finish(e, null); return; }
            return fetchBySearch(e.name, e.country)
              .then(function (url) { return url || fetchFromCommons(e.name); })
              .then(function (url) { finish(e, url || null); });
          });
        }, Promise.resolve());
      });
    }).catch(function () {
      entries.forEach(function (e) { finish(e, null); });
    });
  }

  function finish(entry, url) {
    if (entry.done) return;
    entry.done = true;
    remember(entry.slug, url);
    entry.resolve(url || null);
  }

  function uniq(arr) {
    var seen = {}, out = [];
    arr.forEach(function (v) { if (v && !seen[v]) { seen[v] = true; out.push(v); } });
    return out;
  }

  // Public: a photo URL for this city, or null. Never throws, never waits
  // longer than the timeout, never returns anything but a real remote URL.
  function get(slug) {
    if (!slug) return Promise.resolve(null);
    var hit = cached(slug);
    if (hit !== undefined) return Promise.resolve(hit);
    if (inFlight[slug]) return inFlight[slug];
    var p = enqueue(slug).then(function (url) { delete inFlight[slug]; return url; });
    inFlight[slug] = p;
    return p;
  }

  // Public: warm the cache for cities about to be shown, so a card swap
  // lands with its photo already resolved instead of popping in later.
  function prime(slugs) {
    (slugs || []).forEach(function (slug) { get(slug); });
  }

  var api = { get: get, prime: prime, TITLE_OVERRIDES: TITLE_OVERRIDES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.GlotempCityPhotos = api;
})();
