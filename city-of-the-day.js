// City of the Day: a single, deterministic slug that fills the default
// opening slot of the "Somewhere else is awake" panel (glotemp-elsewhere.js).
// It touches exactly one thing -- which city a first-time visitor with
// nothing in localStorage sees first -- and nothing else about that panel:
// not its layout, not its other five suggested chips, not the radio
// mechanism.
//
// WHY DETERMINISTIC, NOT RANDOM-PER-LOAD
// Every visitor on the same calendar day (UTC) should see the same city,
// so the panel is stable across a reload and across two people comparing
// notes -- not a coin flip on every page load. "Random" is about which
// city from the full pool gets picked each day, not about re-rolling on
// every visit.
//
// THE POOL IS EVERY AVAILABLE CITY
// All 300+ cities in cities-data.js, not a hand-picked shortlist -- a
// smaller pool (originally 9, then a weekly cadence) repeated too often
// to feel fresh. The photo rotation (city-of-day-photos.js) already
// degrades gracefully city by city -- a city with few or no qualifying
// Commons photos that day just shows no photo layer, exactly like an
// ordinary city, rather than breaking or padding with placeholders.
(function () {
  'use strict';

  // An escape hatch, not a curation mechanism: slugs listed here are
  // skipped even though they're otherwise available, for the rare case
  // one turns out to need excluding later (e.g. no usable Commons
  // category at all). Empty by default -- every available city is in the
  // pool.
  var EXCLUDED_CITIES = [];

  // How many past days a city is excluded from repeating in. Needs at
  // least this many eligible cities for the exclusion to be fully
  // honoured -- with fewer, some repetition within the window is
  // mathematically unavoidable. With the full city list this is a
  // rounding error, not a constraint.
  var HISTORY_DAYS = 8;

  // Human-meaningful label only ("2026-08-18") -- never used as the
  // index the pick is computed from.
  function dayKey(date) {
    return date.toISOString().slice(0, 10);
  }

  // A plain polynomial hash of near-sequential strings ("...:0", "...:1",
  // "...:2", ...) has poor bit diffusion in its low bits -- verified
  // during development: taking that hash mod 300 directly over a 2-year
  // trace left 103 of 300 cities never picked even once, while a few
  // came up 8 times. The finalizer below (a standard 32-bit avalanche
  // mix, the same shape used in MurmurHash3) fixes that by spreading
  // every input bit across the whole output before the modulo runs;
  // re-verified after this fix with the same trace.
  function mix32(x) {
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    return (x ^ (x >>> 16)) >>> 0;
  }

  function hashInt(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return mix32(h);
  }

  // A fixed, arbitrary date used only as a zero point for counting whole
  // days -- never shown to anyone, never changes once picked.
  var EPOCH_MS = Date.UTC(2024, 0, 1);

  function daysSinceEpoch(now) {
    return Math.floor((now.getTime() - EPOCH_MS) / 86400000);
  }

  // Correctness here depends on checking each day's pick against what
  // was *actually* shown in the HISTORY_DAYS days before it -- not
  // against each of those days' own unadjusted hash, which is a
  // different, weaker check: an earlier day's pick can itself have been
  // moved by this same exclusion rule, and ignoring that lets the same
  // city resurface immediately (this exact bug showed up in the original
  // weekly version -- caught by a multi-period trace during development,
  // which is why that trace is still run in testing). So this walks
  // forward from a fixed epoch, day by day, carrying the real output
  // sequence, and returns the entry for the requested day. There is
  // nothing to persist: the whole sequence is cheaply recomputed (at
  // most a few thousand tiny iterations even years from the epoch)
  // rather than read from storage.
  function cityOfDay(list, now) {
    if (!list || !list.length) return null;
    if (list.length === 1) return list[0];

    var targetDay = daysSinceEpoch(now);
    var history = [];
    for (var d = 0; d <= targetDay; d++) {
      var idx = hashInt('glotemp-cod-v1:' + d) % list.length;
      if (list.length > HISTORY_DAYS) {
        var recent = {};
        var start = Math.max(0, history.length - HISTORY_DAYS);
        for (var i = start; i < history.length; i++) recent[history[i]] = true;
        var tries = 0;
        while (recent[list[idx]] && tries < list.length) {
          idx = (idx + 1) % list.length;
          tries++;
        }
      }
      history.push(list[idx]);
    }
    return history[targetDay];
  }

  // Every available city, minus the (normally empty) exclusion list.
  // CITIES_DATA's own array order is what the pool is built from --
  // fixed in the file, so the pool order (and therefore every past and
  // future day's pick) never shifts just because of how this function
  // happens to iterate it.
  function get() {
    var src = window.CITIES_DATA;
    if (!Array.isArray(src)) return null;
    var excluded = {};
    EXCLUDED_CITIES.forEach(function (slug) { excluded[slug] = true; });
    var eligible = src
      .filter(function (c) { return c && c.slug && c.available !== false && !excluded[c.slug]; })
      .map(function (c) { return c.slug; });
    return cityOfDay(eligible, new Date());
  }

  window.GlotempCityOfDay = { get: get, dayKey: dayKey, EXCLUDED_CITIES: EXCLUDED_CITIES };
})();
