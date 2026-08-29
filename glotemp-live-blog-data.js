// Glotemp Live Blog: the shared dispatch builder behind both Live Blog
// surfaces (glotemp-live-blog-city.js on a city's own page,
// glotemp-live-blog-home.js rotating on the homepage). One function, one
// source of real content, consumed two different ways -- same reasoning
// as living-index.js and glotemp-vertical-style.js.
//
// Every dispatch is built from data the site already has and already
// treats as honest: the city's own live mood reading, GlotempVerticalSignature's
// curated/generated per-vertical facts, GlotempFoodSignature's curated food
// facts, and CITY_TRIVIA's hand-checked trivia. Nothing is invented here --
// this module only gives that existing content a consistent editorial
// voice ("a dispatch", not a raw data dump) and a shuffled, varied order.
(function () {
  'use strict';

  // Deterministic per city (mulberry32, seeded from the slug) so the same
  // city always opens with the same felt "order" of dispatches rather than
  // reshuffling on every reload -- same principle as city-vertical-signature.js's
  // seedFrom, just needing a full shuffle here rather than a single pick.
  function seedFrom(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(arr, seed) {
    var rand = mulberry32(seed);
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  var NON_SIGNATURE = { pulse: true, food: true }; // handled specially below

  // Builds the full pool for one city -- up to ~14 entries, shuffled to a
  // stable-per-city order. Callers slice however much they need.
  function buildDispatchPool(city) {
    var style = window.GlotempVerticalStyle;
    if (!style || !city) return [];

    var pool = [];

    if (typeof city.mood === 'number') {
      var band = window.GlotempCore ? GlotempCore.moodToBand(city.mood) : { band: 'level', color: style.COLOR.pulse };
      pool.push({
        vertical: 'pulse',
        color: style.COLOR.pulse,
        icon: style.ICON.pulse,
        label: style.LABEL.pulse,
        headline: city.name + ', right now',
        body: 'Reading ' + city.mood.toFixed(1) + '. Running ' + band.band + '.',
      });
    }

    if (window.CITY_TRIVIA && CITY_TRIVIA[city.slug]) {
      var trivia = CITY_TRIVIA[city.slug];
      var titles = ['Something true about ' + city.name, 'One more thing about ' + city.name];
      trivia.slice(0, 2).forEach(function (fact, i) {
        pool.push({
          vertical: 'trivia',
          color: '#F0E0C8',
          icon: null,
          label: 'On record',
          headline: titles[i] || titles[0],
          body: style.stripDashes(fact),
        });
      });
    }

    style.VERTICALS.forEach(function (vertical) {
      if (NON_SIGNATURE[vertical]) return;
      var text = window.GlotempVerticalSignature ? GlotempVerticalSignature.signatureText(vertical, city) : null;
      if (!text) return;
      pool.push({
        vertical: vertical,
        color: style.COLOR[vertical],
        icon: style.ICON[vertical],
        label: style.LABEL[vertical],
        headline: style.LABEL[vertical] + ' in ' + city.name,
        body: style.stripDashes(text),
      });
    });

    if (window.GlotempFoodSignature) {
      var foodText = GlotempFoodSignature.text(city.slug);
      if (foodText) {
        pool.push({
          vertical: 'food',
          color: style.COLOR.food,
          icon: style.ICON.food,
          label: style.LABEL.food,
          headline: 'What ' + city.name + ' eats',
          body: style.stripDashes(foodText),
        });
      }
    }

    return seededShuffle(pool, seedFrom(city.slug));
  }

  window.GlotempLiveBlogData = { buildDispatchPool: buildDispatchPool };
})();
