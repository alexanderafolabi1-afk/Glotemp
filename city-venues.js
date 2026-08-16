// Glotemp x OpenStreetMap: real, named local businesses per city.
//
// WHY THIS EXISTS
// The Food section on every city page rendered an empty box: #food-content
// had nothing writing to it. The existing overpass-food edge function only
// ever returned a COUNT ("1,284 restaurants"), and only for 20 of the 151
// cities. A number is not a reason to visit a page.
//
// WHAT IT SHOWS
// Actual businesses, by name, from OpenStreetMap: the restaurant, the
// cafe, the bakery, the market. Real places that really exist, with their
// real cuisine tags and, where the map has them, their own website. That
// is genuine visibility for a local business, and it is worth something
// to them precisely because it is true.
//
// WHY THE ROTATION
// A city has hundreds of qualifying places and the section shows eight.
// Picking the same eight forever would hand permanent placement to
// whichever rows Overpass happened to return first. The shown set is
// shuffled per visit, so visibility is spread across everyone who
// qualifies rather than won by accident of ordering.
//
// Client-side, keyless, never stored -- the same pattern as city-radio.js
// and city-wiki.js. Overpass is CORS-enabled for browser use.
//
// ODbL requires attribution wherever this data is shown. The credit line
// is not optional decoration; do not remove it.
(function () {
  'use strict';

  var MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  var RADIUS_M = 4000;
  var SHOW = 8;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // "italian;pizza" and "coffee_shop" are how OSM stores these. Neither is
  // something to put in front of a reader as-is.
  function tidy(value) {
    return String(value || '')
      .split(';')[0]
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function (m) { return m.toUpperCase(); })
      .trim();
  }

  var KINDS = {
    restaurant: 'Restaurant',
    cafe: 'Cafe',
    bar: 'Bar',
    pub: 'Pub',
    fast_food: 'Takeaway',
    bakery: 'Bakery',
    ice_cream: 'Ice cream',
    marketplace: 'Market',
    deli: 'Deli',
    greengrocer: 'Greengrocer',
    butcher: 'Butcher',
  };

  function kindOf(tags) {
    return KINDS[tags.amenity] || KINDS[tags.shop] || 'Local business';
  }

  // Fisher-Yates. Array.sort with a random comparator is not a shuffle and
  // biases towards the original order, which is the exact thing this is
  // here to avoid.
  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function query(lat, lon) {
    // around: is cheaper for Overpass than a bbox and matches how far a
    // person would actually walk. nwr covers nodes, ways and relations, so
    // a restaurant mapped as a building is not silently missed.
    return '[out:json][timeout:20];' +
      '(' +
        'nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream|marketplace)$"]["name"](around:' + RADIUS_M + ',' + lat + ',' + lon + ');' +
        'nwr["shop"~"^(bakery|deli|greengrocer|butcher)$"]["name"](around:' + RADIUS_M + ',' + lat + ',' + lon + ');' +
      ');' +
      'out tags 300;';
  }

  async function fetchVenues(lat, lon) {
    var body = 'data=' + encodeURIComponent(query(lat, lon));
    for (var i = 0; i < MIRRORS.length; i++) {
      try {
        var resp = await fetch(MIRRORS[i], {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body,
        });
        if (resp.ok) {
          var data = await resp.json();
          if (data && Array.isArray(data.elements)) return data.elements;
        }
      } catch (e) { /* try the next mirror */ }
    }
    return [];
  }

  function venueHTML(el) {
    var t = el.tags || {};
    var cuisine = tidy(t.cuisine);
    var kind = kindOf(t);
    // Cuisine and kind often say the same thing ("Cafe" tagged
    // cuisine=coffee_shop). Showing both reads like padding.
    var line = cuisine && cuisine.toLowerCase() !== kind.toLowerCase()
      ? kind + ', ' + cuisine
      : kind;

    var where = t['addr:street']
      ? (t['addr:housenumber'] ? t['addr:housenumber'] + ' ' + t['addr:street'] : t['addr:street'])
      : '';

    var site = t.website || t['contact:website'] || '';
    // Only http(s). An OSM website tag can hold anything, including
    // javascript:, and this goes straight into an href.
    var safeSite = /^https?:\/\//i.test(site) ? site : '';

    return '<li class="venue">' +
      '<span class="venue-name">' +
        (safeSite
          ? '<a href="' + esc(safeSite) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(t.name) + '</a>'
          : esc(t.name)) +
      '</span>' +
      '<span class="venue-kind">' + esc(line) + '</span>' +
      (where ? '<span class="venue-where">' + esc(where) + '</span>' : '') +
    '</li>';
  }

  async function loadVenues(citySlug, cityName, lat, lon) {
    var container = document.getElementById('food-venues');
    if (!container || lat == null || lon == null) return;

    container.innerHTML = '<p class="venue-status">Looking up places in ' + esc(cityName) + '&hellip;</p>';

    var elements = [];
    try {
      elements = await fetchVenues(lat, lon);
    } catch (e) {
      elements = [];
    }

    var named = elements.filter(function (el) {
      return el && el.tags && el.tags.name && String(el.tags.name).trim().length > 1;
    });

    if (!named.length) {
      // Honest empty state. OpenStreetMap coverage is genuinely thin in
      // some cities, and saying so is better than an invented list.
      container.innerHTML = '<p class="venue-status">No mapped places for ' +
        esc(cityName) + ' yet. OpenStreetMap coverage varies by city.</p>';
      return;
    }

    var picked = shuffle(named).slice(0, SHOW);

    container.innerHTML =
      '<ul class="venue-list">' + picked.map(venueHTML).join('') + '</ul>' +
      '<p class="venue-attribution">' + named.length + ' places mapped near ' + esc(cityName) +
      '. Listings from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, refreshed each visit.</p>';
  }

  window.GlotempVenues = { loadVenues: loadVenues };
})();
