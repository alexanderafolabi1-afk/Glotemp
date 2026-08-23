// Glotemp Mood Confidence: a quiet, secondary "how much real data backs
// this reading" indicator next to the homepage's main mood reading. Never
// touches synthesizeEmotionalTemperature or the mood value itself -- app.js
// calls showFor() as one additional line inside updateCity(), exactly like
// city-weather-mood.js does for the Air & Mood line above it.
//
// Derived only from real signals already in the observations table for
// this city: how many real check-ins exist, and how recent the newest one
// is. Not a formula that touches mood math -- a plain confidence estimate
// about the DATA, not the reading. Most cities have few or no real
// check-ins yet, so "Forming" is the honest, expected default -- never a
// number invented to look more complete than the data actually is.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  var CACHE_PREFIX = 'glotemp-mood-confidence:';
  var CACHE_TTL_MS = 20 * 60 * 1000;

  // pct is a real number OR null ("Forming") -- both are valid, cacheable
  // results, so a cache lookup returns {hit, pct} rather than using null
  // itself as the miss sentinel (which would collide with a cached
  // "Forming" result and force a needless refetch every time).
  function readCache(slug) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + slug);
      if (!raw) return { hit: false };
      var parsed = JSON.parse(raw);
      if (!parsed || (Date.now() - parsed.at) > CACHE_TTL_MS) return { hit: false };
      return { hit: true, pct: parsed.pct };
    } catch (e) {
      return { hit: false };
    }
  }

  function writeCache(slug, pct) {
    try {
      localStorage.setItem(CACHE_PREFIX + slug, JSON.stringify({ at: Date.now(), pct: pct }));
    } catch (e) {
      // Storage unavailable or full -- fine, just fetch again next time.
    }
  }

  // Real rows only, most recent first, capped at 30 -- plenty to judge
  // count + recency without pulling a city's entire history.
  async function fetchObservations(citySlug) {
    try {
      var url = SUPABASE_URL + '/rest/v1/observations' +
        '?city_slug=eq.' + encodeURIComponent(citySlug) +
        '&select=created_at&order=created_at.desc&limit=30';
      var resp = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          Accept: 'application/json',
        },
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      return null;
    }
  }

  // Plain, real proxies -- count and recency -- not a mood formula. Below
  // a low floor this reads as "Forming" rather than a technically-real
  // but practically-meaningless single-digit percentage.
  function computeConfidence(rows) {
    if (!rows || !rows.length) return null;
    var countFactor = Math.min(rows.length / 10, 1);
    var newestMs = new Date(rows[0].created_at).getTime();
    var hoursSince = (Date.now() - newestMs) / 3600000;
    var recencyFactor = Math.max(0, Math.min(1, 1 - hoursSince / 168)); // full credit within a week
    var pct = Math.round(((countFactor * 0.5) + (recencyFactor * 0.5)) * 100);
    return pct >= 15 ? pct : null;
  }

  var inFlight = new Map();

  async function showFor(citySlug) {
    var el = document.getElementById('trip-reading-confidence');
    if (!el || !citySlug) return;
    el.textContent = '';

    var cached = readCache(citySlug);
    var pct;
    if (cached.hit) {
      pct = cached.pct;
    } else {
      var pending = inFlight.get(citySlug);
      if (!pending) {
        pending = fetchObservations(citySlug).then(function (rows) {
          inFlight.delete(citySlug);
          var result = computeConfidence(rows);
          writeCache(citySlug, result);
          return result;
        });
        inFlight.set(citySlug, pending);
      }
      pct = await pending;
    }

    var selectEl = document.getElementById('city-select');
    var stillActive = selectEl && selectEl.value === citySlug;
    if (!stillActive) return;

    el.textContent = (typeof pct === 'number' ? pct + '% confidence' : 'Forming');
  }

  window.GlotempMoodConfidence = { showFor: showFor };
})();
