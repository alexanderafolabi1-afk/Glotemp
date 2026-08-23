// Glotemp Social Proof: a small, honestly-sourced trust block shown on the
// homepage and every city page.
//
// Two real numbers, kept separate rather than combined into one false
// claim: the live count of rows in the `readings` table (fetched fresh via
// a count-only Supabase request, same pattern as glotemp-checkin.js's
// watcherCount()) is NOT the same population as the distinct-country count
// -- the readings table currently covers a much smaller set of cities than
// the full roster. The country figure instead describes the real, static
// breadth of window.CITIES_DATA (104 countries as of this build). Never
// phrased as "N readings from M countries", which would misstate what the
// readings themselves cover.
//
// The "strongest recent readings" are not invented: they are the
// highest-intensity entries already present in window.SEED_OBSERVATIONS
// (seed-observations.js), the same file this site's ticker and homepage
// stats already draw from, and which is explicitly documented there as
// mirroring the real SQL seed set. Picked programmatically, not hardcoded,
// so this never drifts from what SEED_OBSERVATIONS actually contains.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  var CACHE_KEY = 'glotemp-social-proof-count';
  var CACHE_TTL_MS = 20 * 60 * 1000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || (Date.now() - parsed.at) > CACHE_TTL_MS) return null;
      return parsed.count;
    } catch (e) { return null; }
  }

  function writeCache(count) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), count: count })); }
    catch (e) { /* storage unavailable -- just skip the cache */ }
  }

  // Live exact count via Range 0-0 + Prefer: count=exact -- only
  // content-range carries the real total, matching the established pattern
  // in glotemp-checkin.js's watcherCount(). Null on any failure; callers
  // must hide rather than guess.
  async function fetchReadingsCount() {
    var cached = readCache();
    if (cached != null) return cached;
    try {
      var resp = await fetch(SUPABASE_URL + '/rest/v1/readings?select=id', {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          Accept: 'application/json',
          Prefer: 'count=exact',
          Range: '0-0',
        },
      });
      if (!resp.ok) return null;
      var cr = resp.headers.get('content-range');
      if (cr && cr.indexOf('/') !== -1) {
        var total = parseInt(cr.split('/')[1], 10);
        if (!Number.isNaN(total)) { writeCache(total); return total; }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function countryCount() {
    var cities = window.CITIES_DATA || [];
    if (!cities.length) return null;
    var seen = {};
    var n = 0;
    cities.forEach(function (c) {
      if (c.country && !seen[c.country]) { seen[c.country] = true; n++; }
    });
    return n || null;
  }

  // Highest-intensity entries already in SEED_OBSERVATIONS, one per city so
  // the same place doesn't appear twice in three slots.
  function strongestReadings(limit) {
    var seed = window.SEED_OBSERVATIONS || [];
    if (!seed.length) return [];
    var sorted = seed.slice().sort(function (a, b) { return (b.intensity || 0) - (a.intensity || 0); });
    var seenCity = {};
    var picked = [];
    for (var i = 0; i < sorted.length && picked.length < limit; i++) {
      var o = sorted[i];
      if (seenCity[o.city]) continue;
      seenCity[o.city] = true;
      picked.push(o);
    }
    return picked;
  }

  function readingsCardHTML(o) {
    return (
      '<div class="social-proof-reading">' +
        '<p class="social-proof-reading-text">' + esc(o.context) + '</p>' +
        '<p class="social-proof-reading-city">' + esc(o.cityName) + '</p>' +
      '</div>'
    );
  }

  async function mount() {
    var host = document.getElementById('social-proof-mount');
    if (!host) return;

    var countries = countryCount();
    var readingsList = strongestReadings(3);

    var statsHTML = '';
    var count = await fetchReadingsCount();
    if (count != null || countries != null) {
      var parts = [];
      if (count != null) parts.push('<span class="social-proof-stat-num">' + count.toLocaleString() + '</span> readings collected so far');
      if (countries != null) parts.push('cities tracked across <span class="social-proof-stat-num">' + countries + '</span> countries');
      if (parts.length) {
        statsHTML = '<p class="social-proof-stats">' + parts.join(', ') + '.</p>';
      }
    }

    var readingsHTML = readingsList.length
      ? '<div class="social-proof-readings">' + readingsList.map(readingsCardHTML).join('') + '</div>'
      : '';

    if (!statsHTML && !readingsHTML) { host.hidden = true; return; }

    host.innerHTML =
      '<p class="eyebrow">Real people, real cities</p>' +
      statsHTML +
      readingsHTML;
    host.hidden = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
