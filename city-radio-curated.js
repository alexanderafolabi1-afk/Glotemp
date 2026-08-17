// Glotemp Radio: curated station overrides.
//
// WHY THIS EXISTS
// city-radio.js already pulls up to 8 live stations per city from Radio
// Browser (a large, free, community-run directory), with a wider-radius
// and then country-wide search as it needs to. That covers the large
// majority of cities well. This file exists for the remainder: a place
// to pin specific, verified, known-good stations for a city or country
// when the live search comes back thin, WITHOUT touching city-radio.js's
// logic every time.
//
// HOW TO ADD A STATION
// Add an entry to CURATED_STATIONS keyed by city slug (exact match to
// cities-data.js) or, for a country-wide pick, prefix the key with
// "country:" followed by the country name exactly as it appears in
// cities-data.js (e.g. "country:Japan"). Each entry needs a name, a
// direct https:// stream url, and an optional short tag. City-level
// entries are tried before country-level ones.
//
//   tokyo: [
//     { name: 'Station Name', url: 'https://example.com/stream.mp3', tag: 'Jazz' },
//   ],
//   'country:Japan': [ ... ],
//
// ONLY VERIFIED, WORKING, DIRECT STREAM URLS BELONG HERE. An entry that
// doesn't actually play is worse than not listing a station at all --
// the honest empty or live-only state is the fallback until a real,
// checked url is added. This file intentionally starts empty: it is
// infrastructure for whoever next verifies a batch of station streams,
// not a place to guess at URLs.
(function () {
  'use strict';

  var CURATED_STATIONS = {
    // Populate as stations are verified. See the format above.
  };

  function forCity(citySlug, country) {
    var out = [];
    if (citySlug && CURATED_STATIONS[citySlug]) out = out.concat(CURATED_STATIONS[citySlug]);
    var countryKey = 'country:' + country;
    if (country && CURATED_STATIONS[countryKey]) out = out.concat(CURATED_STATIONS[countryKey]);
    return out;
  }

  window.GlotempRadioCurated = { forCity: forCity, STATIONS: CURATED_STATIONS };
})();
