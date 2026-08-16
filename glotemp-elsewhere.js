// "Somewhere else is awake." The homepage window onto a city you keep.
//
// THE IDEA
// The hero speaks to a traveller: someone going somewhere, who visits
// twice a year. This speaks to the far larger group who already left, or
// who move between cities and hold onto more than one. Born in one,
// studied in another, working in a third, family in a fourth. They do not
// need a forecast. They need the ordinary running life of the place, and
// they want it daily.
//
// SHOW, DO NOT TELL
// The section explains nothing. It picks a city and becomes it: the clock
// there, the sky there, a station playing there, what the local press is
// reporting there in its own language. Nobody is told that Glotemp covers
// 151 cities in 81 countries. They watch one of them being alive.
//
// Specificity is the whole mechanism. "Manila" is a word. "It is 11:42pm
// in Manila and still 29 degrees" is a memory of what that heat felt like
// at night. Every element here is chosen because it is exact and true.
//
// PLACEMENT
// Second section, under the hero. The traveller framing keeps the top of
// the page; this is the counterweight directly beneath it, full width,
// self-contained. It removes nothing and depends on nothing above it.
//
// EVERY SOURCE IS LIVE AND KEYLESS
//   clock    Intl.DateTimeFormat over the city's IANA timezone
//   sky      Open-Meteo
//   radio    Radio Browser, via city-radio.js
//   press    GDELT, via city-news.js
//
// The clock and the sky always resolve, so the panel is never empty even
// when radio or press have nothing for a given city.
(function () {
  'use strict';

  var STORE_KEY = 'glotemp-cities-kept';
  var MAX_KEPT = 4;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cities() {
    var src = window.CITIES_DATA;
    if (!Array.isArray(src)) return [];
    return src.filter(function (c) { return c && c.slug && c.name && c.available !== false; });
  }

  function bySlug(slug) {
    var all = cities();
    for (var i = 0; i < all.length; i++) if (all[i].slug === slug) return all[i];
    return null;
  }

  // ---------- the cities someone keeps ----------
  function readKept() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter(function (s) { return !!bySlug(s); }) : [];
    } catch (e) { return []; }
  }

  function keep(slug) {
    var list = readKept().filter(function (s) { return s !== slug; });
    list.unshift(slug);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX_KEPT))); } catch (e) { /* private mode */ }
  }

  // ---------- clock ----------
  function timeIn(tz) {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
      }).format(new Date());
    } catch (e) { return ''; }
  }

  function hourIn(tz) {
    try {
      return parseInt(new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', hour12: false, timeZone: tz,
      }).format(new Date()), 10);
    } catch (e) { return 12; }
  }

  // What someone would actually say about the hour, rather than a number
  // repeated back at them.
  function partOfDay(h) {
    if (h < 5) return 'the small hours';
    if (h < 8) return 'first light';
    if (h < 12) return 'morning';
    if (h < 14) return 'the middle of the day';
    if (h < 18) return 'afternoon';
    if (h < 21) return 'evening';
    return 'night';
  }

  // ---------- sky ----------
  var WEATHER = {
    0: 'clear', 1: 'mostly clear', 2: 'part cloud', 3: 'overcast',
    45: 'fog', 48: 'freezing fog', 51: 'light drizzle', 53: 'drizzle',
    55: 'heavy drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain',
    66: 'freezing rain', 67: 'freezing rain', 71: 'light snow', 73: 'snow',
    75: 'heavy snow', 77: 'snow grains', 80: 'showers', 81: 'showers',
    82: 'violent showers', 85: 'snow showers', 86: 'snow showers',
    95: 'thunderstorm', 96: 'thunderstorm, hail', 99: 'thunderstorm, hail',
  };

  async function sky(lat, lon, tz) {
    try {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
        '&longitude=' + lon + '&current=temperature_2m,weather_code&timezone=' +
        encodeURIComponent(tz || 'auto');
      var resp = await fetch(url);
      if (!resp.ok) return null;
      var data = await resp.json();
      if (!data || !data.current) return null;
      return {
        temp: Math.round(data.current.temperature_2m),
        text: WEATHER[data.current.weather_code] || '',
      };
    } catch (e) { return null; }
  }

  // ---------- render ----------
  function shell() {
    var all = cities().slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var kept = readKept();

    // The opening set is deliberately spread across continents. Someone
    // should see the world in the first row, not one region.
    var OPENERS = ['manila', 'warsaw', 'lima', 'accra', 'seoul', 'casablanca',
                   'ho-chi-minh', 'istanbul', 'nairobi', 'bogota', 'karachi', 'kyiv'];
    var suggested = OPENERS.filter(bySlug).slice(0, 6);
    if (suggested.length < 6) {
      var fill = all.filter(function (c) { return suggested.indexOf(c.slug) === -1; });
      suggested = suggested.concat(fill.slice(0, 6 - suggested.length).map(function (c) { return c.slug; }));
    }
    var chips = (kept.length ? kept : suggested).slice(0, 6);

    return '' +
      '<div class="elsewhere-head">' +
        '<p class="eyebrow">Somewhere else is awake</p>' +
        '<h2 class="elsewhere-title">The city you left is still going.</h2>' +
        '<p class="elsewhere-sub">Its clock, its sky, its radio and its papers. Pick one you carry.</p>' +
      '</div>' +
      '<form class="elsewhere-pick" id="elsewhere-pick" role="search">' +
        '<label class="sr-only" for="elsewhere-input">Choose a city</label>' +
        '<input class="elsewhere-input" id="elsewhere-input" list="elsewhere-list" ' +
          'placeholder="Name a city" autocomplete="off" aria-label="Choose a city">' +
        '<datalist id="elsewhere-list">' +
          all.map(function (c) {
            return '<option value="' + esc(c.name) + '">' + esc(c.country) + '</option>';
          }).join('') +
        '</datalist>' +
        '<button class="elsewhere-go" type="submit">Open</button>' +
      '</form>' +
      '<div class="elsewhere-chips">' +
        (kept.length ? '<span class="elsewhere-chips-label">Yours</span>' : '') +
        chips.map(function (slug) {
          var c = bySlug(slug);
          return c ? '<button type="button" class="elsewhere-chip" data-slug="' + esc(c.slug) + '">' +
            esc(c.name) + '</button>' : '';
        }).join('') +
      '</div>' +
      '<div class="elsewhere-window" id="elsewhere-window" aria-live="polite"></div>';
  }

  var clockTimer = null;

  function paint(city) {
    var win = document.getElementById('elsewhere-window');
    if (!win || !city) return;

    var h = hourIn(city.timezone);

    win.innerHTML = '' +
      '<div class="elsewhere-panel elsewhere-panel-' + (h < 6 || h >= 20 ? 'night' : 'day') + '">' +
        '<div class="elsewhere-now">' +
          '<span class="elsewhere-clock" id="elsewhere-clock">' + esc(timeIn(city.timezone)) + '</span>' +
          '<span class="elsewhere-place">' + esc(city.name) + '<span class="elsewhere-country">' +
            esc(city.country) + '</span></span>' +
          '<span class="elsewhere-line" id="elsewhere-line">' + esc(partOfDay(h)) + '</span>' +
        '</div>' +
        '<div class="elsewhere-strands">' +
          '<section class="elsewhere-strand">' +
            '<h3 class="elsewhere-strand-title">On air</h3>' +
            '<div id="radio-content" class="elsewhere-radio"></div>' +
          '</section>' +
          '<section class="elsewhere-strand">' +
            '<h3 class="elsewhere-strand-title">Being reported</h3>' +
            '<div id="elsewhere-news"></div>' +
          '</section>' +
        '</div>' +
        '<p class="elsewhere-more"><a href="/cities/' + esc(city.slug) + '.html">Everything on ' +
          esc(city.name) + '</a></p>' +
      '</div>';

    // The clock is the one thing that must never look stale. A minute
    // tick is enough; a second hand would be noise.
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(function () {
      var el = document.getElementById('elsewhere-clock');
      if (!el) { clearInterval(clockTimer); clockTimer = null; return; }
      el.textContent = timeIn(city.timezone);
    }, 30000);

    sky(city.lat, city.lon, city.timezone).then(function (s) {
      var line = document.getElementById('elsewhere-line');
      if (!line || !s) return;
      line.textContent = partOfDay(hourIn(city.timezone)) +
        ', ' + s.temp + ' degrees' + (s.text ? ', ' + s.text : '');
    });

    if (window.GlotempRadio) {
      GlotempRadio.loadRadio(city.name, city.lat, city.lon, city.country);
    }
    if (window.GlotempNews) {
      GlotempNews.loadNews(city.name, city.country, 'elsewhere-news');
    }

    keep(city.slug);
  }

  function open(city) {
    if (!city) return;
    paint(city);
    var win = document.getElementById('elsewhere-window');
    if (win && win.scrollIntoView) win.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function wire(root) {
    root.addEventListener('click', function (e) {
      var chip = e.target.closest && e.target.closest('.elsewhere-chip');
      if (!chip) return;
      open(bySlug(chip.getAttribute('data-slug')));
    });

    var form = root.querySelector('#elsewhere-pick');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var typed = String(root.querySelector('#elsewhere-input').value || '').trim().toLowerCase();
      if (!typed) return;
      var all = cities();
      var hit = null;
      for (var i = 0; i < all.length; i++) {
        if (all[i].name.toLowerCase() === typed) { hit = all[i]; break; }
      }
      if (!hit) {
        for (var j = 0; j < all.length; j++) {
          if (all[j].name.toLowerCase().indexOf(typed) === 0) { hit = all[j]; break; }
        }
      }
      if (hit) open(hit);
    });
  }

  function mount() {
    var root = document.getElementById('elsewhere-root');
    if (!root || !cities().length) return;
    root.innerHTML = shell();
    wire(root);
    // Open on the most recently kept city, or on one of the openers, so
    // the section is never an empty form asking to be filled in.
    var kept = readKept();
    var first = kept.length ? bySlug(kept[0]) : null;
    if (!first) {
      var chip = root.querySelector('.elsewhere-chip');
      first = chip ? bySlug(chip.getAttribute('data-slug')) : null;
    }
    if (first) paint(first);
  }

  // CITIES_DATA is a plain script tag above this one, but this file is
  // deferred and app.js may still be filling things in, so mounting waits
  // for the document rather than racing it.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  window.GlotempElsewhere = { mount: mount, open: open };
})();
