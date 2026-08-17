// Glotemp Conditions: a quiet, single-line "what it's like right now"
// reading per city, built from Open-Meteo's free current-weather and
// air-quality endpoints (both keyless, no account). One more instrument
// output, not a weather widget -- a single sentence in the same register
// as everything else on the page. Fetched client-side, per visitor,
// never stored -- same pattern as city-radio.js / city-wiki.js.
(function () {
  const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast';
  const AIR_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

  function escapeHTML(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  async function fetchJSON(url) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 7000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      return null;
    }
  }

  // US EPA AQI bands, worded to match the site's instrument register
  // rather than a health-advisory one.
  function clarityWord(aqi) {
    if (typeof aqi !== 'number') return null;
    if (aqi <= 50) return 'good clarity';
    if (aqi <= 100) return 'moderate air';
    if (aqi <= 150) return 'hazy air';
    if (aqi <= 200) return 'poor clarity';
    return 'heavy air';
  }

  // Mirrors glotemp-tonight.js's localHour() -- duplicated rather than
  // shared since each of these per-city modules works standalone.
  function localHour(timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, hour12: false, hour: 'numeric', minute: 'numeric',
      }).formatToParts(new Date());
      const h = Number(parts.find(p => p.type === 'hour').value) % 24;
      const m = Number(parts.find(p => p.type === 'minute').value);
      return h + m / 60;
    } catch (e) {
      return null;
    }
  }

  function isoTimeToHourFraction(iso) {
    if (!iso) return null;
    const m = String(iso).match(/T(\d{2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) + Number(m[2]) / 60;
  }

  function daylightPhrase(nowHour, sunriseHour, sunsetHour) {
    if (nowHour == null || sunriseHour == null || sunsetHour == null) return null;
    if (nowHour < sunriseHour) {
      const mins = Math.round((sunriseHour - nowHour) * 60);
      return mins <= 60 ? `daylight in ${mins}m` : 'before sunrise';
    }
    if (nowHour >= sunsetHour) return 'past sunset';
    const remainingHours = sunsetHour - nowHour;
    if (remainingHours <= 1) return `daylight fading in ${Math.round(remainingHours * 60)}m`;
    return 'full daylight';
  }

  // Pure data: fetches and composes the same "temp, clarity, daylight"
  // line loadConditions renders, without touching the DOM -- so a second
  // caller (glotemp-home-frequency.js) can fold it into its own markup
  // instead of fighting over the one #conditions-line id.
  async function computeConditionsText(lat, lon, timezone) {
    if (lat == null || lon == null) return null;
    const [weather, air] = await Promise.all([
      fetchJSON(`${WEATHER_BASE}?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,weather_code,is_day` +
        `&daily=sunrise,sunset&timezone=auto`),
      fetchJSON(`${AIR_BASE}?latitude=${lat}&longitude=${lon}&current=us_aqi`),
    ]);

    if (!weather || !weather.current) return null;

    const cur = weather.current;
    const daily = weather.daily || {};
    const temp = typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null;
    const feels = typeof cur.apparent_temperature === 'number' ? Math.round(cur.apparent_temperature) : null;
    const aqi = air && air.current ? air.current.us_aqi : null;
    const clarity = clarityWord(aqi);
    const nowHour = localHour(timezone);
    const sunrise = isoTimeToHourFraction(daily.sunrise && daily.sunrise[0]);
    const sunset = isoTimeToHourFraction(daily.sunset && daily.sunset[0]);
    const daylight = daylightPhrase(nowHour, sunrise, sunset);

    const parts = [];
    if (temp != null) {
      parts.push(feels != null && Math.abs(feels - temp) >= 2 ? `${temp}°C, feels ${feels}°` : `${temp}°C`);
    }
    if (clarity) parts.push(clarity);
    if (daylight) parts.push(daylight);

    return parts.length ? parts.join(' · ') : null;
  }

  async function loadConditions(cityName, lat, lon, timezone) {
    const container = document.getElementById('conditions-line');
    if (!container || lat == null || lon == null) return;
    const text = await computeConditionsText(lat, lon, timezone);
    container.innerHTML = text
      ? `<span class="conditions-eyebrow">Right now</span> ${escapeHTML(text)}`
      : '';
  }

  window.GlotempConditions = { loadConditions, computeConditionsText };
})();
