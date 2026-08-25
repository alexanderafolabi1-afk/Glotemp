// Glotemp City Sell: the second thing a first-time visitor sees, right
// under the hero instrument. Guesses roughly where the visitor is with
// zero permission prompt (the browser's own timezone, always available,
// no network call), then makes the case for that city across every
// vertical this site tracks, using only real content the site already
// has: GlotempVerticalSignature's curated/generated facts, GlotempFoodSignature's
// curated food facts, and the city's own live mood reading for Pulse.
// Nothing here is invented for this module -- it is a new arrangement of
// existing, already-honest data.
//
// Deliberately independent of GlotempCore's "pinned city" -- this is a
// one-shot guess for this section only, so it never fights with or
// short-circuits glotemp-hero-instrument.js's own (separate, GPS-based,
// permission-gated) city resolution elsewhere on the same page.
(function () {
  'use strict';

  // Icon, color and label per vertical now live in glotemp-vertical-style.js
  // (pulled out so the Live Blog draws the identical set -- see that
  // file's header comment). This module keeps its own local references so
  // the rest of the file below reads unchanged.
  var STYLE = window.GlotempVerticalStyle || { VERTICALS: [], LABEL: {}, COLOR: {}, ICON: {}, stripDashes: function (t) { return t; } };
  var VERTICALS = STYLE.VERTICALS;
  var LABEL = STYLE.LABEL;
  var COLOR = STYLE.COLOR;
  var ICON = STYLE.ICON;
  var stripDashes = STYLE.stripDashes;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function offsetMinutesFor(tz) {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
      var part = parts.find(function (p) { return p.type === 'timeZoneName'; });
      if (!part) return null;
      if (part.value === 'GMT') return 0;
      var m = part.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (!m) return null;
      var sign = m[1] === '-' ? -1 : 1;
      var hours = parseInt(m[2], 10);
      var mins = m[3] ? parseInt(m[3], 10) : 0;
      return sign * (hours * 60 + mins);
    } catch (e) {
      return null;
    }
  }

  // Zero permission, zero network, instant. Exact timezone match first;
  // otherwise the tracked city whose current UTC offset is closest to the
  // visitor's; otherwise the top-ranked city. Never a hardcoded default.
  function guessNearbyCity(cities) {
    var pool = cities.filter(function (c) { return c.available !== false; });
    if (!pool.length) return null;

    var visitorTz = null;
    try { visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* unsupported */ }

    if (visitorTz) {
      var exact = pool.find(function (c) { return c.timezone === visitorTz; });
      if (exact) return exact;

      var visitorOffset = offsetMinutesFor(visitorTz);
      if (visitorOffset != null) {
        var best = null, bestDiff = Infinity;
        pool.forEach(function (c) {
          var off = offsetMinutesFor(c.timezone);
          if (off == null) return;
          var diff = Math.abs(off - visitorOffset);
          if (diff < bestDiff) { bestDiff = diff; best = c; }
        });
        if (best) return best;
      }
    }

    return pool.slice().sort(function (a, b) { return (a.rank || 999) - (b.rank || 999); })[0];
  }

  function factFor(vertical, city) {
    if (vertical === 'pulse') {
      var band = window.GlotempCore ? GlotempCore.moodToBand(city.mood) : { band: 'level' };
      return 'Reading ' + city.mood.toFixed(1) + ' right now. Running ' + band.band + '.';
    }
    if (vertical === 'food') {
      return window.GlotempFoodSignature ? GlotempFoodSignature.text(city.slug) : null;
    }
    return window.GlotempVerticalSignature ? GlotempVerticalSignature.signatureText(vertical, city) : null;
  }

  function cardHTML(vertical, city, index) {
    var fact = stripDashes(factFor(vertical, city));
    var wave = Math.round(Math.sin(index * 0.85) * 16);
    return (
      '<a class="city-sell-card" href="/cities/' + esc(city.slug) + '/' + vertical + '/" ' +
        'style="--card-color:' + COLOR[vertical] + '; --card-wave:' + wave + 'px" role="listitem">' +
        '<span class="city-sell-icon">' + ICON[vertical] + '</span>' +
        '<span class="city-sell-label">' + LABEL[vertical] + '</span>' +
        (fact ? '<p class="city-sell-fact">' + esc(fact) + '</p>' : '') +
        '<span class="city-sell-score" data-vertical="' + vertical + '" hidden><span class="city-sell-score-fill"></span></span>' +
      '</a>'
    );
  }

  function ctaCardHTML(city, index) {
    var wave = Math.round(Math.sin(index * 0.85) * 16);
    return (
      '<a class="city-sell-card city-sell-card--cta" href="/cities/' + esc(city.slug) + '.html" ' +
        'style="--card-wave:' + wave + 'px" role="listitem">' +
        '<span class="city-sell-cta-text">See all of ' + esc(city.name) + '</span>' +
        '<span class="city-sell-cta-arrow" aria-hidden="true">&rarr;</span>' +
      '</a>'
    );
  }

  function fillScores(city) {
    if (!window.GlotempLivingIndex) return;
    GlotempLivingIndex.getRanking().then(function (result) {
      var row = result.cities.find(function (c) { return c.slug === city.slug; });
      if (!row) return;
      VERTICALS.forEach(function (vertical) {
        var score = vertical === 'pulse' ? (row.pulseReading != null ? row.pulseReading : city.mood) : row.perVertical[vertical];
        if (score == null) return;
        var el = document.querySelector('.city-sell-score[data-vertical="' + vertical + '"]');
        if (!el) return;
        var fill = el.querySelector('.city-sell-score-fill');
        fill.style.width = Math.max(6, Math.min(100, score * 10)) + '%';
        el.hidden = false;
      });
    }).catch(function () { /* stays hidden -- no broken partial state */ });
  }

  function mount() {
    var section = document.getElementById('city-sell-section');
    if (!section || !window.CITIES_DATA || !window.CITIES_DATA.length) return;

    var city = guessNearbyCity(window.CITIES_DATA);
    if (!city) return;

    var eyebrow = document.getElementById('city-sell-eyebrow');
    var headline = document.getElementById('city-sell-headline');
    var subhead = document.getElementById('city-sell-subhead');
    var shelf = document.getElementById('city-sell-shelf');
    if (!shelf) return;

    if (eyebrow) eyebrow.textContent = 'Right now, near you';
    if (headline) headline.textContent = city.name + ' is already making its case.';
    if (subhead) {
      var band = window.GlotempCore ? GlotempCore.moodToBand(city.mood) : { band: 'level' };
      subhead.textContent = 'Reading ' + city.mood.toFixed(1) + ' right now. Running ' + band.band + ' across the city. Here is what else it has going for it.';
    }

    var html = VERTICALS.map(function (v, i) { return cardHTML(v, city, i); }).join('');
    html += ctaCardHTML(city, VERTICALS.length);
    shelf.innerHTML = html;

    section.hidden = false;
    fillScores(city);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
