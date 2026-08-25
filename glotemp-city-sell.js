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

  var VERTICALS = ['pulse', 'tech', 'finance', 'work', 'property', 'education',
    'sport', 'entertainment', 'fashion', 'food', 'health', 'transport'];

  var LABEL = {
    pulse: 'Pulse', tech: 'Tech', finance: 'Finance', work: 'Work',
    property: 'Property', education: 'Education', sport: 'Sport',
    entertainment: 'Entertainment', fashion: 'Fashion', food: 'Food',
    health: 'Health', transport: 'Transport',
  };

  // A vivid variant reserved for this one welcome moment -- every other
  // instrument on the site uses the desaturated brass-family accents in
  // VERTICAL_ACCENT (see cities/_city-template.html); this section is the
  // deliberate exception, not a site-wide palette change.
  var COLOR = {
    pulse: '#FF6F91', tech: '#4F8CFF', finance: '#2ECC71', work: '#9B6BFF',
    property: '#FFA53D', education: '#5C7CFA', sport: '#FF5C5C',
    entertainment: '#D66BE0', fashion: '#FF8FC4', food: '#FFD166',
    health: '#2FD9C4', transport: '#4FC3F7',
  };

  var ICON = {
    pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12h4l2 7 4-14 2 7h8"/></svg>',
    tech: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>',
    finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20h18M6 20V10M12 20V4M18 20v13"/></svg>',
    work: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg>',
    property: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-7h6v7"/></svg>',
    education: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg>',
    sport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3c2.5 2.5 2.5 15.5 0 18M3 12h18M5 6.5c3 2 11 2 14 0M5 17.5c3-2 11-2 14 0"/></svg>',
    entertainment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8a2 2 0 1 0 0-4H3v4h1zM20 8a2 2 0 1 1 0-4h1v4h-1z"/><path d="M3 4h18v6c0 5-4 9-9 9s-9-4-9-9V4z"/><path d="M8 22h8"/></svg>',
    fashion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4a2 2 0 0 1 2 2c3 0 8 2 8 6h-6v9H8v-9H2c0-4 5-6 8-6a2 2 0 0 1 2-2z"/></svg>',
    food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2v8a2 2 0 0 0 4 0V2M8 10v12M18 2c-2 0-3 2-3 5s1 4 3 4v11"/></svg>',
    health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 8.6c0 5.4-8.8 10.4-8.8 10.4S3.2 14 3.2 8.6a4.6 4.6 0 0 1 8.8-1.9 4.6 4.6 0 0 1 8.8 1.9z"/></svg>',
    transport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="3"/><path d="M3 11h18M7 17v2M17 17v2"/><circle cx="7.5" cy="14" r=".6" fill="currentColor" stroke="none"/><circle cx="16.5" cy="14" r=".6" fill="currentColor" stroke="none"/></svg>',
  };

  // The reused fact sources (GlotempVerticalSignature, GlotempFoodSignature)
  // predate this module and use dashes as clause joiners in places. Rather
  // than rewrite that shared, already-shipped copy, soften just the
  // rendering here: a space-padded dash reads fine swapped for a comma.
  // Tight hyphens in real compound words (well-known, 24-hour) are left
  // alone since they never have spaces on both sides.
  function stripDashes(text) {
    if (!text) return text;
    return text.replace(/\s+[—–-]\s+/g, ', ');
  }

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
