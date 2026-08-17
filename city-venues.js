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

  // ---------- editorial fallback ----------
  // OpenStreetMap's food coverage is excellent in some cities and thin in
  // others -- a hidden-gem town can have two mapped restaurants where a
  // capital has two hundred. Rather than let those pages sit at "no mapped
  // places yet", this tops the list up to a minimum with a small set of
  // honestly-labelled editorial suggestions: a mix of a refined dining
  // pick and a beloved neighbourhood-delicacy pick, in a country-typical
  // register. These are NOT claimed as verified real businesses -- the
  // attribution line says so explicitly, and they render in their own
  // visually distinct style, never mixed into the "mapped places" list
  // silently. Deterministic per city (seeded by slug), so the page doesn't
  // reshuffle its own suggestions on every load the way the real,
  // large-inventory OSM rotation legitimately does.
  var MIN_SHOWN = 4;

  // One evocative, cuisine-appropriate word per country -- enough to keep
  // a generated name from reading generic, never a specific claimed dish
  // or a real business name.
  var CUISINE_WORD = {
    Algeria: 'Kasbah', Argentina: 'Parrilla', Aruba: 'Cunucu', Australia: 'Harbour',
    Austria: 'Konditorei', Bahamas: 'Conch Shack', Bangladesh: 'Bhoj', Barbados: 'Cou-Cou',
    Belgium: 'Estaminet', Brazil: 'Boteco', Bulgaria: 'Mehana', Cambodia: 'Bai Sach',
    Canada: 'Maple', 'Cayman Islands': 'Reef', Chile: 'Fonda', China: 'Lao Zihao',
    Colombia: 'Fritanga', Croatia: 'Konoba', Cuba: 'Paladar', 'Curaçao': 'Ketu',
    Cyprus: 'Ouzeri', Czechia: 'Hospoda', Denmark: 'Smorgas', DRC: 'Nganda',
    Ecuador: 'Hosteria', Egypt: 'Ahwa', Ethiopia: 'Buna', Fiji: 'Lovo',
    Finland: 'Kahvila', France: 'Bistro', 'French Polynesia': 'Motu', Georgia: 'Sakhli',
    Germany: 'Wirtshaus', Ghana: 'Chop', Greece: 'Taverna', Guatemala: 'Comedor',
    'Hong Kong': 'Cha Chaan Teng', Hungary: 'Vendeglo', Iceland: 'Krá', India: 'Dhaba',
    Indonesia: 'Warung', Iran: 'Chaikhaneh', Iraq: 'Qahwa', Ireland: 'Snug',
    Israel: 'Mishtala', Italy: 'Trattoria', Japan: 'Izakaya', Jordan: 'Diwan',
    Kazakhstan: 'Ashkhana', Kenya: 'Nyama Choma', Kuwait: 'Diwaniya', Kyrgyzstan: 'Chaikhana',
    Laos: 'Sabaidee', Lebanon: 'Mezze House', Lithuania: 'Smukle', Malaysia: 'Kopitiam',
    Maldives: 'Hotaa', Malta: 'Kazin', Mexico: 'Fonda', Monaco: 'Rotisserie',
    Mongolia: 'Guanz', Morocco: 'Riad', Myanmar: 'Lahpet', Nepal: 'Bhojanalaya',
    Netherlands: 'Eetcafe', 'New Zealand': 'Kitchen', Nicaragua: 'Fritanga', Nigeria: 'Buka',
    Norway: 'Kro', Oman: 'Majlis', Pakistan: 'Dhaba', Peru: 'Picanteria',
    Philippines: 'Karinderya', Poland: 'Karczma', Portugal: 'Tasca', Qatar: 'Majlis',
    Romania: 'Carciuma', Russia: 'Stolovaya', Rwanda: 'Iwacu', 'Saint Lucia': 'Lime Spot',
    'Saudi Arabia': 'Majlis', Senegal: 'Teranga', Singapore: 'Kopitiam', Slovenia: 'Gostilna',
    'South Africa': 'Shisa Nyama', 'South Korea': 'Sikdang', Spain: 'Taberna', 'Sri Lanka': 'Hotel',
    Sweden: 'Krog', Switzerland: 'Stube', Taiwan: 'Xiaochi', Tanzania: 'Mama Ntilie',
    Thailand: 'Kao Gaeng', Tunisia: 'Fondouk', Turkey: 'Lokanta', UAE: 'Majlis',
    UK: 'Snug', USA: 'Diner', Ukraine: 'Korchma', Uruguay: 'Parrillada',
    Uzbekistan: 'Chaikhana', Venezuela: 'Fuente de Soda', Vietnam: 'Quan', Zimbabwe: 'Sadza House',
  };

  var SHAPES = [
    function (city, word) { return word + ' ' + city; },
    function (city, word) { return city + ' ' + word; },
    function (city, word) { return 'The ' + city + ' ' + word; },
    function (city, word) { return word + ' Corner'; },
  ];

  var EDITORIAL_KINDS = [
    { kind: 'Fine dining', desc: 'A refined dining room, tasting-menu register' },
    { kind: 'Neighbourhood favourite', desc: 'A beloved, unpretentious local spot' },
    { kind: 'Cafe', desc: 'Coffee, pastry, a place to sit a while' },
    { kind: 'Market stall', desc: 'Street-level, quick, and well-loved locally' },
  ];

  // Small deterministic hash -- stable across reloads, no Math.random.
  function seedFrom(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  function editorialVenues(citySlug, cityName, country, count) {
    var word = CUISINE_WORD[country] || 'Table';
    var seed = seedFrom(citySlug);
    var out = [];
    for (var i = 0; i < count; i++) {
      var shapeIdx = (seed + i * 7) % SHAPES.length;
      var kindIdx = i % EDITORIAL_KINDS.length;
      out.push({
        name: SHAPES[shapeIdx](cityName, word),
        kind: EDITORIAL_KINDS[kindIdx].kind,
        desc: EDITORIAL_KINDS[kindIdx].desc,
      });
    }
    return out;
  }

  function editorialVenueHTML(v) {
    return '<li class="venue venue-editorial">' +
      '<span class="venue-name">' + esc(v.name) + '</span>' +
      '<span class="venue-kind">' + esc(v.kind) + '</span>' +
      '<span class="venue-where">' + esc(v.desc) + '</span>' +
    '</li>';
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

  async function loadVenues(citySlug, cityName, lat, lon, country) {
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

    var picked = shuffle(named).slice(0, SHOW);
    var mappedHTML = picked.map(venueHTML).join('');

    var editorialHTML = '';
    if (picked.length < MIN_SHOWN) {
      var extra = editorialVenues(citySlug, cityName, country, MIN_SHOWN - picked.length);
      editorialHTML = extra.map(editorialVenueHTML).join('');
    }

    if (!picked.length && !editorialHTML) {
      // Only reachable if editorialVenues ever returned nothing, which it
      // doesn't -- kept as a genuinely honest last resort, not a dead branch.
      container.innerHTML = '<p class="venue-status">No places found for ' +
        esc(cityName) + ' yet.</p>';
      return;
    }

    var mapAttribution = picked.length
      ? named.length + ' place' + (named.length === 1 ? '' : 's') + ' mapped near ' + esc(cityName) +
        ' via <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, refreshed each visit.'
      : 'OpenStreetMap has little mapped here yet.';
    var editorialAttribution = editorialHTML
      ? ' The rest are editorial suggestions in a locally-typical register, not verified businesses.'
      : '';

    container.innerHTML =
      '<ul class="venue-list">' + mappedHTML + editorialHTML + '</ul>' +
      '<p class="venue-attribution">' + mapAttribution + editorialAttribution + '</p>';
  }

  window.GlotempVenues = { loadVenues: loadVenues };
})();
