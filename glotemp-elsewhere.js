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
// reporting there in its own language, and a photograph of the place
// itself behind all of it. Nobody is told that Glotemp covers 300 cities
// in 104 countries. They watch one of them being alive, and the row above
// keeps turning over so the other 299 go past.
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
//   photo    Wikipedia and Wikimedia Commons, via city-photos.js
//
// The clock and the sky always resolve, so the panel is never empty even
// when radio, press or photo have nothing for a given city.
(function () {
  'use strict';

  var STORE_KEY = 'glotemp-cities-kept';
  var MAX_KEPT = 4;
  var CHIP_SLOTS = 6;        // how many chips the row holds in total
  // One drawn chip turns over this often, so with five drawn slots each
  // individual chip holds still for about twelve seconds -- long enough to
  // read and aim at -- while the row as a whole works through all 300.
  var CHIP_ROTATE_MS = 2500;

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

  // ---------- the deck of suggestions ----------
  // The suggested chips used to be a hardcoded list of twelve slugs, cut
  // to six -- so a first-time visitor saw the same six cities forever, and
  // a returning visitor with one kept city saw exactly one chip and no way
  // to stumble onto anything else. The row draws from all 300 now, as a
  // deck: every city is offered once before any is offered twice.
  var deck = [];

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function refillDeck() {
    deck = shuffled(cities()).map(function (c) { return c.slug; });
  }

  // Takes the first slug not currently spoken for. Anything passed over
  // stays in the deck -- it is simply not this draw's card, so no city is
  // ever quietly consumed without being shown.
  function drawSlug(taken) {
    if (!deck.length) refillDeck();
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < deck.length; i++) {
        if (taken.indexOf(deck[i]) === -1) return deck.splice(i, 1)[0];
      }
      refillDeck();
    }
    return deck.length ? deck.splice(0, 1)[0] : null;
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
    var kept = readKept().slice(0, MAX_KEPT);

    // Cities someone has kept are theirs and never rotate. Whatever slots
    // are left over are filled from the deck and do rotate, so the row is
    // always six wide -- a returning visitor with one kept city used to
    // get a row of exactly one chip.
    var taken = kept.slice();
    // The City of the Day opens the suggested run when one is configured
    // (see city-of-the-day.js), which is how it earns its photo rotation
    // below; the rest are drawn.
    var cityOfDay = window.GlotempCityOfDay && window.GlotempCityOfDay.get();
    var suggested = [];
    if (cityOfDay && bySlug(cityOfDay) && taken.indexOf(cityOfDay) === -1) {
      suggested.push(cityOfDay);
      taken.push(cityOfDay);
    }
    refillDeck();
    while (kept.length + suggested.length < CHIP_SLOTS) {
      var drawn = drawSlug(taken);
      if (!drawn) break;
      suggested.push(drawn);
      taken.push(drawn);
    }

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
      '<div class="elsewhere-chips" id="elsewhere-chips">' +
        (kept.length ? '<span class="elsewhere-chips-label">Yours</span>' : '') +
        kept.map(function (slug) {
          var c = bySlug(slug);
          return c ? '<button type="button" class="elsewhere-chip" data-slug="' + esc(c.slug) + '">' +
            esc(c.name) + '</button>' : '';
        }).join('') +
        // Labelled only when there are kept chips to tell them apart from.
        (kept.length && suggested.length ? '<span class="elsewhere-chips-label">Elsewhere</span>' : '') +
        suggested.map(function (slug, i) {
          var c = bySlug(slug);
          return c ? '<button type="button" class="elsewhere-chip elsewhere-chip-drawn" data-slot="' + i +
            '" data-slug="' + esc(c.slug) + '">' + esc(c.name) + '</button>' : '';
        }).join('') +
      '</div>' +
      '<div class="elsewhere-window" id="elsewhere-window" aria-live="polite"></div>';
  }

  var clockTimer = null;

  // One still photograph of the city behind the panel, from Wikipedia or
  // Wikimedia Commons (city-photos.js resolves both, and caches, so
  // reopening a city costs nothing). Uses the same layer-plus-scrim markup
  // city-of-day-photos.js builds, so the wash over the photo -- and
  // therefore the text contrast on top of it -- is identical either way.
  //
  // A city neither source has a photo for keeps the panel exactly as it is
  // today: empty host, no image element, nothing substituted in.
  function stillPhoto(host, city) {
    if (!host || !city || !window.GlotempCityPhotos) return;
    var slug = city.slug;
    host.innerHTML = '';
    host.setAttribute('data-slug', slug);
    window.GlotempCityPhotos.get(slug).then(function (src) {
      // The panel may have been repainted for another city while this was
      // in flight; painting then would put the wrong city behind it.
      if (!src || !host.isConnected || host.getAttribute('data-slug') !== slug) return;
      host.innerHTML = '<div class="elsewhere-photo-scrim"></div>' +
                       '<img class="elsewhere-photo-layer" alt="">';
      var img = host.querySelector('.elsewhere-photo-layer');
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      // Fade in only once it has actually decoded, so a slow or dead URL
      // leaves the panel looking untouched rather than flashing a scrim
      // over nothing.
      img.addEventListener('load', function () { img.classList.add('is-active'); });
      img.addEventListener('error', function () { host.innerHTML = ''; });
      img.src = src;
    });
  }

  function paint(city) {
    var win = document.getElementById('elsewhere-window');
    if (!win || !city) return;

    var h = hourIn(city.timezone);

    // Every city is photographed now, not only the City of the Day. What
    // still differs is how: the City of the Day gets a slow rotation
    // through several Commons photos (city-of-day-photos.js), every other
    // city gets one still frame resolved by city-photos.js. Recomputed per
    // paint rather than cached once, so switching city (chip, search,
    // kept-city reopen) is checked fresh every time.
    var cityOfDayNow = window.GlotempCityOfDay && window.GlotempCityOfDay.get();
    var isCityOfDay = !!cityOfDayNow && cityOfDayNow === city.slug;
    if (!isCityOfDay && window.GlotempCityOfDayPhotos) window.GlotempCityOfDayPhotos.stop();

    win.innerHTML = '' +
      '<div class="elsewhere-panel elsewhere-panel-' + (h < 6 || h >= 20 ? 'night' : 'day') +
        ' elsewhere-panel-photo">' +
        '<div class="elsewhere-photo-bg" id="elsewhere-photo-bg"></div>' +
        '<div class="elsewhere-now">' +
          '<span class="elsewhere-clock" id="elsewhere-clock">' + esc(timeIn(city.timezone)) + '</span>' +
          '<span class="elsewhere-place" data-slug="' + esc(city.slug) + '">' + esc(city.name) +
            '<span class="elsewhere-country">' +
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

    var photoHost = document.getElementById('elsewhere-photo-bg');
    if (isCityOfDay && window.GlotempCityOfDayPhotos) {
      window.GlotempCityOfDayPhotos.attach(photoHost, city);
    } else {
      stillPhoto(photoHost, city);
    }

    if (window.GlotempRadio) {
      GlotempRadio.loadRadio(city.name, city.lat, city.lon, city.country);
    }
    if (window.GlotempNews) {
      GlotempNews.loadNews(city.slug, 'elsewhere-news');
    }

    // Only a city someone actually chose becomes a city they keep. An
    // auto-advance must never rewrite their own list out from under them.
    if (!autoAdvancing) keep(city.slug);
  }

  function open(city) {
    if (!city) return;
    stopPanel();            // a deliberate choice ends the drift for good
    paint(city);
    var win = document.getElementById('elsewhere-window');
    if (win && win.scrollIntoView) win.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---------- the window itself keeps moving ----------
  // This is one of the first things anyone sees, and a panel parked on one
  // city forever reads as a dead page. It now travels: a new city every
  // PANEL_ADVANCE_MS, drawn from the same deck as the chips, each one
  // arriving with its own clock, sky, photograph, stations and press.
  //
  // It is a lot of live fetching, so it is bounded on every side. It only
  // runs while the section is actually on screen and the tab is visible,
  // it is off under prefers-reduced-motion, and the first sign that
  // someone is using the section -- a chip, a search, a tap on a station,
  // any keypress or focus -- stops it permanently and leaves them on the
  // city they landed on. It never writes to the kept-cities list.
  var PANEL_ADVANCE_MS = 22000;
  var panelTimer = null;
  var panelStopped = false;
  var autoAdvancing = false;
  var panelOnScreen = true;

  function stopPanel() {
    panelStopped = true;
    if (panelTimer) { clearInterval(panelTimer); panelTimer = null; }
  }

  function advancePanel() {
    if (panelStopped || document.hidden || !panelOnScreen) return;
    var current = document.querySelector('#elsewhere-window .elsewhere-place');
    var showing = current ? current.getAttribute('data-slug') : null;
    var next = bySlug(drawSlug(showing ? [showing] : []));
    if (!next) return;
    autoAdvancing = true;
    try { paint(next); } finally { autoAdvancing = false; }
  }

  function startPanel(root) {
    if (panelStopped || panelTimer) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Only travel while someone could actually be looking at it.
    if (typeof IntersectionObserver === 'function') {
      panelOnScreen = false;
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { panelOnScreen = e.isIntersecting; });
      }, { threshold: 0.2 }).observe(root);
    }
    panelTimer = setInterval(advancePanel, PANEL_ADVANCE_MS);
  }

  // ---------- the suggested chips turn over ----------
  // A chip is a tap target, so this is deliberately unhurried and gives up
  // easily: one chip every five seconds, staggered so the row never
  // reshuffles at once, held still under a real pointer, and stopped for
  // good the moment someone shows any intent to use the row. A chip that
  // changes identity under a finger mid-tap would be worse than a row that
  // never moves at all.
  var chipTimers = [];
  var chipsStopped = false;

  function stopChips() {
    chipsStopped = true;
    chipTimers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
    chipTimers = [];
  }

  function rotateChips(root) {
    var slots = Array.prototype.slice.call(root.querySelectorAll('.elsewhere-chip-drawn'));
    if (slots.length < 2) return;   // nothing to rotate through meaningfully
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var finePointer = window.matchMedia &&
      window.matchMedia('(hover: hover) and (pointer: fine)');
    var paused = false;
    document.addEventListener('visibilitychange', function () { paused = document.hidden; });

    function spoken() {
      // Never draw a city that is already on the row, kept or drawn, nor
      // the one the panel is currently showing.
      var out = readKept().slice(0, MAX_KEPT);
      root.querySelectorAll('.elsewhere-chip').forEach(function (el) {
        out.push(el.getAttribute('data-slug'));
      });
      return out;
    }

    slots.forEach(function (chip, i) {
      var tid = setTimeout(function () {
        var iid = setInterval(function () {
          if (chipsStopped || paused) return;
          if (finePointer && finePointer.matches && chip.matches(':hover')) return;
          var next = bySlug(drawSlug(spoken()));
          if (!next) return;
          chip.classList.add('is-turning');
          setTimeout(function () {
            chip.setAttribute('data-slug', next.slug);
            chip.textContent = next.name;
            chip.classList.remove('is-turning');
          }, 300);
        }, CHIP_ROTATE_MS * slots.length);
        chipTimers.push(iid);
      }, i * CHIP_ROTATE_MS);
      chipTimers.push(tid);
    });
  }

  function wire(root) {
    root.addEventListener('click', function (e) {
      var chip = e.target.closest && e.target.closest('.elsewhere-chip');
      if (!chip) return;
      open(bySlug(chip.getAttribute('data-slug')));
    });

    // Any sign of intent settles the section permanently -- the chips stop
    // turning over and the window stops travelling, leaving whoever is
    // reading it exactly where they are.
    function settle() { stopChips(); stopPanel(); }
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (evt) {
      root.addEventListener(evt, settle, { passive: true });
    });
    root.addEventListener('focusin', settle);

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
    stopChips();
    stopPanel();
    chipsStopped = false;
    panelStopped = false;
    root.innerHTML = shell();
    wire(root);
    rotateChips(root);
    // Open on the most recently kept city, or on the first chip, so the
    // section is never an empty form asking to be filled in. From there it
    // travels on its own until someone takes hold of it.
    var kept = readKept();
    var first = kept.length ? bySlug(kept[0]) : null;
    if (!first) {
      var chip = root.querySelector('.elsewhere-chip');
      first = chip ? bySlug(chip.getAttribute('data-slug')) : null;
    }
    if (first) paint(first);
    startPanel(root);
  }

  // CITIES_DATA is a plain script tag above this one, but this file is
  // deferred and app.js may still be filling things in, so mounting waits
  // for the document rather than racing it.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  window.GlotempElsewhere = { mount: mount, open: open };
})();
