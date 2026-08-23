// Glotemp Air & Mood: a small, honestly-named secondary line next to the
// existing mood reading -- real current weather and air quality for the
// active city, from Open-Meteo (no key needed). This is NOT a formula,
// NOT folded into the mood score, and NOT stored anywhere: plain real
// numbers, translated into plain words, fetched fresh (or from a
// same-browser cache) each time a visitor picks a city.
//
// Never touches synthesizeEmotionalTemperature, the readings table, or
// anything else the mood reading itself depends on -- app.js calls
// showFor() as one additional line inside updateCity(), nothing more.
(function () {
  'use strict';

  var WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
  var AQI_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';
  var CACHE_PREFIX = 'glotemp-air-mood:';
  // "Cache 30+ minutes" -- 35 gives real headroom over that floor.
  var CACHE_TTL_MS = 35 * 60 * 1000;

  // Real US EPA AQI breakpoints, not an invented scale.
  function aqiLabel(aqi) {
    if (typeof aqi !== 'number' || !Number.isFinite(aqi)) return null;
    if (aqi <= 50) return 'good air';
    if (aqi <= 100) return 'moderate air';
    if (aqi <= 150) return 'unhealthy air for sensitive groups';
    if (aqi <= 200) return 'unhealthy air';
    if (aqi <= 300) return 'very unhealthy air';
    return 'hazardous air';
  }

  // Sea-level pressure in hPa -- 1013.25 is the standard reference;
  // +/-13 either side is a plain, real "steady" band, not a formula.
  function pressureLabel(hpa) {
    if (typeof hpa !== 'number' || !Number.isFinite(hpa)) return null;
    if (hpa < 1000) return 'low pressure';
    if (hpa > 1020) return 'high pressure';
    return 'steady pressure';
  }

  function readCache(slug) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + slug);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || (Date.now() - parsed.at) > CACHE_TTL_MS) return null;
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  function writeCache(slug, data) {
    try {
      localStorage.setItem(CACHE_PREFIX + slug, JSON.stringify({ at: Date.now(), data: data }));
    } catch (e) {
      // Storage unavailable or full -- fine, just fetch again next time.
    }
  }

  async function fetchAirMood(lat, lon) {
    var weatherUrl = WEATHER_API + '?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,pressure_msl&timezone=auto';
    var aqiUrl = AQI_API + '?latitude=' + lat + '&longitude=' + lon + '&current=us_aqi';
    var results = await Promise.all([
      fetch(weatherUrl).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(aqiUrl).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    ]);
    var weather = results[0] && results[0].current;
    var aqi = results[1] && results[1].current;
    if (!weather || typeof weather.temperature_2m !== 'number') return null;
    return {
      temp: Math.round(weather.temperature_2m),
      pressureLabel: pressureLabel(weather.pressure_msl),
      aqiLabel: aqi ? aqiLabel(aqi.us_aqi) : null,
    };
  }

  var inFlight = new Map();

  async function showFor(citySlug) {
    var el = document.getElementById('trip-air-mood');
    var valueEl = document.getElementById('trip-air-mood-value');
    if (!el || !valueEl || !citySlug) return;
    // Hide immediately -- never leave a stale city's weather showing
    // while the newly-picked city's own reading is still in flight.
    el.hidden = true;

    var city = (window.CITIES_DATA || []).find(function (c) { return c.slug === citySlug; });
    if (!city || typeof city.lat !== 'number' || typeof city.lon !== 'number') return;

    var data = readCache(citySlug);
    if (!data) {
      var pending = inFlight.get(citySlug);
      if (!pending) {
        pending = fetchAirMood(city.lat, city.lon).then(function (result) {
          inFlight.delete(citySlug);
          if (result) writeCache(citySlug, result);
          return result;
        });
        inFlight.set(citySlug, pending);
      }
      data = await pending;
    }

    // The visitor may have picked a different city while this was in
    // flight (or the cache lookup ran) -- painting now would show the
    // wrong city's weather next to the right city's mood reading.
    var selectEl = document.getElementById('city-select');
    var stillActive = selectEl && selectEl.value === citySlug;
    if (!data || !stillActive) return;

    var parts = [data.temp + '°C'];
    if (data.aqiLabel) parts.push(data.aqiLabel);
    if (data.pressureLabel) parts.push(data.pressureLabel);
    valueEl.textContent = parts.join(' · ');
    el.hidden = false;
  }

  window.GlotempAirMood = { showFor: showFor };
})();
