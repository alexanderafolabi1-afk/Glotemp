// Glotemp Personality: the site's warmth layer. Three quiet, occasional
// touches on city pages -- a witty aside reacting to the city's real
// current weather, a gentle human check-in, and a piece of real city
// trivia -- all delivered through one small, dismissible toast rather
// than a modal. Nothing here is fabricated: weather comes straight from
// Open-Meteo (free, keyless, the same provider already used for the
// homepage barometer backdrop and sunrise/sunset), and trivia comes from
// city-trivia-data.js's curated, verifiable facts. Rate-limited so it
// never becomes noise -- see LIMITS below.
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function cities() { return window.CITIES_DATA || []; }
  function cityBy(slug) { return cities().find(function (c) { return c.slug === slug; }); }

  // ---------- rate limiting (resets daily, local to the browser) ----------
  var LIMITS = { weather: 5, checkin: 2, trivia: 3 };
  var COUNTER_KEY = 'gt-personality-counters';

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }
  function loadCounters() {
    try {
      var raw = localStorage.getItem(COUNTER_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.day === todayKey()) return parsed;
    } catch (e) { /* fall through to fresh counters */ }
    return { day: todayKey(), weather: 0, checkin: 0, trivia: 0 };
  }
  function saveCounters(c) {
    try { localStorage.setItem(COUNTER_KEY, JSON.stringify(c)); } catch (e) { /* storage unavailable -- non-fatal */ }
  }
  function remaining(type) {
    var c = loadCounters();
    return LIMITS[type] - (c[type] || 0);
  }
  function recordShown(type) {
    var c = loadCounters();
    c[type] = (c[type] || 0) + 1;
    saveCounters(c);
  }

  // ---------- weather: fetch + classify ----------
  // Open-Meteo's simplified WMO subset. Distinct from app.js's homepage
  // weather cache (which only asks for weather_code/is_day for the
  // barometer backdrop) -- this asks for temperature and wind too, since
  // the personality copy leans on both.
  var WEATHER_TTL = 20 * 60 * 1000;

  async function fetchWeatherSnapshot(city) {
    var cacheKey = 'gt-personality-weather:' + city.slug;
    try {
      var raw = localStorage.getItem(cacheKey);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Date.now() - parsed.t < WEATHER_TTL) return parsed.v;
      }
    } catch (e) { /* ignore corrupt cache */ }

    try {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + city.lat +
        '&longitude=' + city.lon +
        '&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=auto';
      var resp = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!resp.ok) throw new Error('weather fetch failed ' + resp.status);
      var data = await resp.json();
      var cur = data && data.current;
      if (!cur || typeof cur.weather_code !== 'number') return null;
      var snapshot = {
        temp: cur.temperature_2m,
        code: cur.weather_code,
        wind: cur.wind_speed_10m,
        isDay: cur.is_day !== 0,
      };
      try { localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), v: snapshot })); } catch (e) { /* skip caching */ }
      return snapshot;
    } catch (e) {
      return null;
    }
  }

  // A handful of arid/desert-climate cities where a foggy, high-wind
  // reading is genuinely more likely to be blown dust than mist. Kept
  // small and specific rather than guessed -- everywhere else, the same
  // conditions are just described as fog.
  var DUST_PRONE = {
    riyadh: 1, jeddah: 1, 'kuwait-city': 1, doha: 1, 'abu-dhabi': 1, dubai: 1,
    baghdad: 1, cairo: 1, tehran: 1, amman: 1, muscat: 1, casablanca: 1,
    dakar: 1, algiers: 1, tunis: 1, karachi: 1, lahore: 1, 'tel-aviv': 1,
  };

  function classify(snapshot, citySlug) {
    var code = snapshot.code, wind = snapshot.wind, temp = snapshot.temp, isDay = snapshot.isDay;

    if (code === 96 || code === 99) return 'thunderstorm-hail';
    if (code === 95) return 'thunderstorm';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';

    if ([45, 48].includes(code)) {
      if (wind >= 25 && DUST_PRONE[citySlug]) return 'dust-haze';
      return 'fog';
    }

    if ([65, 82, 66, 67].includes(code)) return 'heavy-rain';
    if ([61, 63, 80, 81].includes(code)) return 'rain';
    if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle';

    // Clear/cloudy: temperature and wind can override the plain reading.
    if (code === 0 || code === 1) {
      if (typeof temp === 'number' && temp >= 33) return 'extreme-heat';
      if (typeof wind === 'number' && wind >= 40) return 'strong-wind';
      if (typeof temp === 'number' && temp <= 2) return 'brisk-cold';
      return isDay ? 'clear-perfect' : 'clear-night';
    }
    if (code === 2 || code === 3) {
      if (typeof wind === 'number' && wind >= 40) return 'strong-wind';
      return 'cloudy';
    }
    return isDay ? 'clear-perfect' : 'clear-night';
  }

  // Cross-visit memory of the last classification, kept separately from
  // the short weather TTL cache above so a "sudden change" comparison
  // survives across sessions rather than just within one page's 20
  // minutes. A rough intensity grouping decides what counts as a
  // meaningful shift rather than noise (e.g. "cloudy" -> "rain" is a
  // real change; "rain" -> "heavy-rain" isn't worth interrupting for).
  var INTENSITY_GROUP = {
    'clear-perfect': 'calm', 'clear-night': 'calm', cloudy: 'calm', 'brisk-cold': 'calm',
    drizzle: 'wet', rain: 'wet', 'heavy-rain': 'wet',
    snow: 'wet',
    thunderstorm: 'dramatic', 'thunderstorm-hail': 'dramatic',
    fog: 'obscured', 'dust-haze': 'obscured',
    'strong-wind': 'windy', 'extreme-heat': 'hot',
  };

  function detectSuddenChange(citySlug, category, temp) {
    var key = 'gt-personality-lastseen:' + citySlug;
    var prev = null;
    try {
      var raw = localStorage.getItem(key);
      if (raw) prev = JSON.parse(raw);
    } catch (e) { /* ignore */ }

    var changed = false;
    if (prev && Date.now() - prev.t > 2 * 60 * 60 * 1000) {
      var groupChanged = INTENSITY_GROUP[prev.category] !== INTENSITY_GROUP[category];
      var tempJump = typeof prev.temp === 'number' && typeof temp === 'number' && Math.abs(prev.temp - temp) >= 8;
      changed = groupChanged || tempJump;
    }

    try { localStorage.setItem(key, JSON.stringify({ category: category, temp: temp, t: Date.now() })); } catch (e) { /* skip */ }
    return changed;
  }

  // ---------- copy ----------
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function fill(template, cityName) { return template.replace(/\{city\}/g, cityName); }

  var WEATHER_ICON = {
    'extreme-heat': '🌡️', 'heavy-rain': '🌧️', rain: '🌦️', drizzle: '💧',
    snow: '❄️', thunderstorm: '⛈️', 'thunderstorm-hail': '⛈️', 'strong-wind': '💨',
    'dust-haze': '🏜️', fog: '🌁', 'clear-perfect': '☀️', 'clear-night': '🌙',
    cloudy: '☁️', 'brisk-cold': '🧊', 'sudden-change': '🌗',
  };

  var WEATHER_COPY = {
    'extreme-heat': [
      '{city} is running hot today — the kind of heat that makes shade a personal achievement.',
      "It's the sort of afternoon in {city} where even the shadows are looking for shade.",
      "{city}'s thermometer has ambitions today. Hydrate accordingly.",
      "Fair warning: the pavement in {city} could probably fry an egg right about now.",
      "{city} is having a moment — a very warm one. Slow down, seek shade, sip something cold.",
    ],
    'heavy-rain': [
      "It's coming down properly in {city} right now — the kind of rain that rearranges plans.",
      '{city} is getting a proper soaking today. An umbrella is more suggestion than accessory at this point.',
      "The sky over {city} has opinions today, and it's expressing them at volume.",
      "Heavy rain in {city} — the streets are shining and nobody's complaining about the free car wash.",
      '{city} is under a determined downpour. Perfect weather for staying in with something warm.',
    ],
    rain: [
      'A steady rain is falling over {city} — the unhurried kind that settles in for a while.',
      "{city} is having a soft, grey sort of day. Bring the umbrella, keep the pace slow.",
      "It's raining in {city}, in that quietly persistent way good stories often start.",
      "{city}'s streets are glistening under a gentle, steady rain right now.",
    ],
    drizzle: [
      'Just a light drizzle over {city} — barely enough to notice, just enough to romanticise.',
      '{city} is misting itself lightly today. Barely rain, mostly atmosphere.',
      'A fine drizzle in {city} — the kind that makes umbrellas feel like overreacting.',
      "There's the gentlest drizzle in {city} right now. Practically weather cosplay.",
    ],
    snow: [
      "It's snowing in {city} — the world outside just got noticeably quieter.",
      '{city} is dusted in white today. Everything looks a little more forgiving under snow.',
      'Snow is falling over {city}, turning the ordinary into something worth a second look.',
      "{city}'s streets have gone soft and white. A good day for slow walks and warm drinks.",
    ],
    thunderstorm: [
      "There's thunder rolling over {city} right now — nature, clearing its throat.",
      '{city} is having a dramatic afternoon. Lightning included, no extra charge.',
      'A storm is putting on a show over {city}. Front row seats from indoors, ideally.',
      "Thunder over {city} today — the sky's way of reminding everyone who's really in charge.",
    ],
    'thunderstorm-hail': [
      '{city} is getting thunder and hail today — the sky is not holding back.',
      "It's a proper storm over {city} right now, hail and all. Best admired from a window.",
    ],
    'strong-wind': [
      "It's properly blustery in {city} today — hold onto hats, umbrellas, and dignity.",
      '{city} is windy enough today to make every walk feel like a small negotiation.',
      "There's a strong wind moving through {city} right now, rearranging everything not nailed down.",
      "{city}'s air has somewhere to be today, and it's taking loose hats with it.",
    ],
    'dust-haze': [
      'There\'s dust in the air over {city} today, softening the skyline into something hazier.',
      "{city}'s sky has that dusty, golden haze to it right now — desert weather doing desert things.",
      'A dry haze is hanging over {city} today. The horizon\'s a little blurred, the mood still warm.',
    ],
    fog: [
      '{city} is wrapped in fog this morning — the whole city softened at the edges.',
      "There's a hush of fog over {city} right now. Everything familiar, slightly mysterious.",
      "{city}'s skyline has gone shy today, hiding behind a thin curtain of fog.",
    ],
    'clear-perfect': [
      '{city} is having about as close to a perfect day as weather gets. Go outside, say hello to it.',
      'Clear skies over {city} right now — the kind of day that makes staying indoors feel like a missed opportunity.',
      '{city} is basking in a genuinely lovely day. No notes.',
      "It's simply a good day to be in {city} — clear, calm, unbothered.",
    ],
    'clear-night': [
      "{city}'s sky has cleared up nicely tonight — a good night for looking up.",
      "It's a clear, quiet night over {city}. The stars are doing their best work.",
    ],
    cloudy: [
      '{city} is under a soft blanket of cloud today — moody, but not unkind.',
      'The sky over {city} is thinking it over today. Overcast, contemplative, perfectly fine.',
      "{city}'s clouds are doing their quiet, unhurried thing today.",
    ],
    'brisk-cold': [
      "It's properly crisp in {city} today — the kind of cold that clears your head.",
      '{city} is bracing today. Clear skies, sharp air, a good excuse for a warm coat.',
    ],
    'sudden-change': [
      "{city}'s weather just changed its mind — noticeably different from last time you checked in.",
      "Something's shifted in {city} since you last looked. The sky rarely sits still here.",
      "{city} is in a different mood today than last time — weather, like people, doesn't always stay consistent.",
    ],
  };

  var CHECKIN_COPY = [
    'How\'s your day treating you in {city}?',
    'Hope {city} is being kind to you today.',
    'A small check-in: how are things, really, in {city}?',
    "No rush, no agenda — just wondering how {city} is treating you right now.",
    "However your day's going in {city}, we're glad you stopped by.",
  ];

  // ---------- toast UI ----------
  var activeToast = null;
  var dismissTimer = null;

  function removeToast() {
    if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
    if (activeToast) { activeToast.remove(); activeToast = null; }
  }

  function showToast(eyebrow, body) {
    removeToast();
    var el = document.createElement('div');
    el.className = 'gt-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<button type="button" class="gt-toast-close" aria-label="Dismiss">&#10005;</button>' +
      '<p class="gt-toast-eyebrow">' + eyebrow + '</p>' +
      '<p class="gt-toast-body">' + esc(body) + '</p>';
    el.querySelector('.gt-toast-close').addEventListener('click', removeToast);
    document.body.appendChild(el);
    activeToast = el;
    dismissTimer = setTimeout(removeToast, 9000);
  }

  // The eyebrow line runs in a small-caps monospace font; some emoji
  // glyphs render blank when caught under font-variant-caps, so the icon
  // gets its own span with that reset back to normal.
  function iconSpan(icon) { return '<span class="gt-toast-icon">' + icon + '</span>'; }

  function showWeatherToast(category, cityName) {
    var pool = WEATHER_COPY[category];
    if (!pool || !pool.length) return false;
    var icon = WEATHER_ICON[category] || '🌤️';
    showToast(iconSpan(icon) + ' <span>Right now in ' + esc(cityName) + '</span>', fill(pick(pool), cityName));
    return true;
  }

  function showSuddenChangeToast(cityName) {
    var pool = WEATHER_COPY['sudden-change'];
    showToast(iconSpan(WEATHER_ICON['sudden-change']) + ' <span>Right now in ' + esc(cityName) + '</span>', fill(pick(pool), cityName));
  }

  function showCheckinToast(cityName) {
    showToast('<span>A quiet check-in</span>', fill(pick(CHECKIN_COPY), cityName));
  }

  var TRIVIA_LAST_KEY = 'gt-personality-trivia-last';
  function showTriviaToast(citySlug, cityName) {
    var facts = (typeof CITY_TRIVIA !== 'undefined' && CITY_TRIVIA[citySlug]) || [];
    if (!facts.length) return false;
    var lastByCity = {};
    try { lastByCity = JSON.parse(localStorage.getItem(TRIVIA_LAST_KEY) || '{}'); } catch (e) { /* ignore */ }
    var lastIdx = lastByCity[citySlug];
    var idx = facts.length > 1 && facts.length - 1 >= 0
      ? (function () { var i; do { i = Math.floor(Math.random() * facts.length); } while (i === lastIdx && facts.length > 1); return i; })()
      : 0;
    lastByCity[citySlug] = idx;
    try { localStorage.setItem(TRIVIA_LAST_KEY, JSON.stringify(lastByCity)); } catch (e) { /* ignore */ }
    showToast('<span>Did you know — ' + esc(cityName) + '</span>', facts[idx]);
    return true;
  }

  // ---------- orchestration ----------
  async function tryWeather(city) {
    if (remaining('weather') <= 0) return false;
    var snapshot = await fetchWeatherSnapshot(city);
    if (!snapshot) return false;
    var category = classify(snapshot, city.slug);
    var sudden = detectSuddenChange(city.slug, category, snapshot.temp);
    if (sudden) {
      showSuddenChangeToast(city.name);
      recordShown('weather');
      return true;
    }
    if (showWeatherToast(category, city.name)) {
      recordShown('weather');
      return true;
    }
    return false;
  }

  function tryTrivia(citySlug, cityName) {
    if (remaining('trivia') <= 0) return false;
    if (showTriviaToast(citySlug, cityName)) {
      recordShown('trivia');
      return true;
    }
    return false;
  }

  function tryCheckin(cityName) {
    if (remaining('checkin') <= 0) return false;
    showCheckinToast(cityName);
    recordShown('checkin');
    return true;
  }

  // One rotating attempt: weather first (it's the freshest, most "alive"
  // signal), then trivia, then a check-in -- whichever has allowance left.
  async function attemptOne(city) {
    if (document.hidden || activeToast) return;
    var order = pick([
      ['weather', 'trivia', 'checkin'],
      ['trivia', 'weather', 'checkin'],
      ['weather', 'checkin', 'trivia'],
    ]);
    for (var i = 0; i < order.length; i++) {
      var kind = order[i];
      var shown = false;
      if (kind === 'weather') shown = await tryWeather(city);
      else if (kind === 'trivia') shown = tryTrivia(city.slug, city.name);
      else if (kind === 'checkin') shown = tryCheckin(city.name);
      if (shown) return;
    }
  }

  function mountCityPage() {
    var m = window.location.pathname.match(/\/cities\/([a-z0-9-]+)\.html$/i);
    if (!m) return;
    var city = cityBy(m[1]);
    if (!city || typeof city.lat !== 'number' || typeof city.lon !== 'number') return;

    // First appearance: a few seconds in, never on arrival.
    setTimeout(function () { attemptOne(city); }, 5000);
    // A possible second, different touch later in a longer session --
    // still capped by the daily counters, so this never compounds.
    setTimeout(function () { attemptOne(city); }, 65000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountCityPage);
  } else {
    mountCityPage();
  }

  // Manual trigger for QA -- never called from normal site flow. Bypasses
  // the daily counters so every condition can be reviewed without waiting
  // out the rate limit.
  window.GlotempPersonality = {
    debugWeather: function (category, cityName) { showWeatherToast(category, cityName || 'This City'); },
    debugSuddenChange: function (cityName) { showSuddenChangeToast(cityName || 'This City'); },
    debugCheckin: function (cityName) { showCheckinToast(cityName || 'This City'); },
    debugTrivia: function (slug, cityName) { showTriviaToast(slug, cityName || slug); },
    dismiss: removeToast,
  };
})();
