// Glotemp Hero Instrument: instrument-base.png (uploaded artwork, see
// /assets -- never modified, never regenerated) plus a live SVG layer
// drawn over its aperture, entirely driven by whichever city is pinned.
//
// The shipped PNG has no real alpha channel -- it's a flattened export
// with a checkerboard and a solid near-black "aperture" baked into
// opaque pixels, confirmed by inspecting the file directly. Two things
// follow, both handled in CSS (see styles.css's HERO INSTRUMENT block),
// neither touching the asset: the checkerboard is cropped away with
// clip-path, and the "glow through the aperture" effect is faked with
// mix-blend-mode:screen on a layer painted above the image. This module
// only positions content against the same detected aperture geometry.
(function () {
  const APERTURE_CX = 514, APERTURE_CY = 511, APERTURE_R = 107.5;
  const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
  const HOT_C = 28;    // heat shimmer threshold
  const COLD_C = 2;    // frost threshold (only when not already raining/snowing)

  function reduceMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Mirrors weatherCodeToCategory in app.js -- duplicated rather than
  // shared since app.js wraps its copy in its own IIFE and this module
  // must work standalone.
  function weatherCodeToCategory(code, isDay) {
    if (code === 0 || code === 1) return isDay ? 'clear-day' : 'clear-night';
    if (code === 2 || code === 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ([95, 96, 99].includes(code)) return 'thunderstorm';
    return isDay ? 'clear-day' : 'clear-night';
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function availableCities() {
    return (window.CITIES_DATA || []).filter(c => c.available !== false && typeof c.lat === 'number');
  }

  function nearestCity(lat, lon) {
    const cities = availableCities();
    if (!cities.length) return null;
    let best = null, bestD = Infinity;
    cities.forEach(c => {
      const d = haversineKm(lat, lon, c.lat, c.lon);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best;
  }

  function topRankedCity() {
    const cities = availableCities();
    if (!cities.length) return null;
    return cities.slice().sort((a, b) => (a.rank || 999) - (b.rank || 999))[0];
  }

  function cityBySlug(slug) {
    return availableCities().find(c => c.slug === slug) || null;
  }

  // Never a hardcoded default: an already-pinned city (a prior visit, a
  // search, a random click) wins; otherwise geolocate to the nearest
  // tracked city; if that's denied/unavailable, the top-ranked city.
  async function resolveInitialCity() {
    const pinnedSlug = window.GlotempCore ? GlotempCore.getPinnedCity() : null;
    if (pinnedSlug) {
      const c = cityBySlug(pinnedSlug);
      if (c) return c;
    }
    const geoCity = await new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(nearestCity(pos.coords.latitude, pos.coords.longitude)),
        () => resolve(null),
        { timeout: 8000, maximumAge: 30 * 60 * 1000 }
      );
    });
    const city = geoCity || topRankedCity();
    if (city && window.GlotempCore) GlotempCore.setPinnedCity(city.slug);
    return city;
  }

  function cityLocalHMS(timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric',
      }).formatToParts(new Date());
      return {
        h: Number(parts.find(p => p.type === 'hour').value) % 24,
        m: Number(parts.find(p => p.type === 'minute').value),
        s: Number(parts.find(p => p.type === 'second').value),
      };
    } catch (e) {
      const d = new Date();
      return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() };
    }
  }

  function isoTimeToHourFraction(iso) {
    if (!iso) return null;
    const m = String(iso).match(/T(\d{2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) + Number(m[2]) / 60;
  }

  async function fetchInstrumentWeather(city) {
    try {
      const url = `${OPEN_METEO_BASE}?latitude=${city.lat}&longitude=${city.lon}` +
        `&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&timezone=auto`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      const data = await res.json();
      const cur = data.current || {};
      const daily = data.daily || {};
      return {
        temp: typeof cur.temperature_2m === 'number' ? cur.temperature_2m : null,
        category: weatherCodeToCategory(cur.weather_code, !(cur.is_day === 0)),
        isDay: !(cur.is_day === 0),
        sunriseHour: isoTimeToHourFraction(daily.sunrise && daily.sunrise[0]),
        sunsetHour: isoTimeToHourFraction(daily.sunset && daily.sunset[0]),
      };
    } catch (e) {
      return null;
    }
  }

  // ---------- SVG live layer ----------
  function handSVG(id, lengthFrac, width, color) {
    const y2 = APERTURE_CY - APERTURE_R * lengthFrac;
    return `<g class="hero-instrument-hand" id="${id}">
      <line x1="${APERTURE_CX}" y1="${APERTURE_CY}" x2="${APERTURE_CX}" y2="${y2.toFixed(1)}"
        stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>
    </g>`;
  }

  function buildLiveSVG() {
    return `
      <circle id="hero-mood-ring" cx="${APERTURE_CX}" cy="${APERTURE_CY}" r="${(APERTURE_R - 6).toFixed(1)}"
        fill="none" stroke="var(--band-equilibrium)" stroke-width="3" opacity="0.85"></circle>
      <g id="hero-sun-ticks"></g>
      ${handSVG('hero-hand-hour', 0.46, 4, 'rgba(58,46,34,0.94)')}
      ${handSVG('hero-hand-minute', 0.72, 2.6, 'rgba(58,46,34,0.88)')}
      ${handSVG('hero-hand-second', 0.8, 1, '#B0483C')}
      <circle cx="${APERTURE_CX}" cy="${APERTURE_CY}" r="5" fill="#3A2E22"></circle>
      <text id="hero-temp-readout" x="${APERTURE_CX}" y="${(APERTURE_CY + APERTURE_R * 0.6).toFixed(1)}"
        text-anchor="middle" font-family="var(--font-mono)" font-size="24" fill="#F0E0C8" opacity="0.92">--&deg;</text>`;
  }

  function tickMarkSVG(hourFraction, color) {
    const angle = ((hourFraction % 24) % 12) / 12 * 360;
    const rad = (angle - 90) * Math.PI / 180;
    const r1 = APERTURE_R - 3, r2 = APERTURE_R - 15;
    const x1 = APERTURE_CX + r1 * Math.cos(rad), y1 = APERTURE_CY + r1 * Math.sin(rad);
    const x2 = APERTURE_CX + r2 * Math.cos(rad), y2 = APERTURE_CY + r2 * Math.sin(rad);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
      stroke="${color}" stroke-width="2.4" stroke-linecap="round"></line>`;
  }

  // ---------- state ----------
  let els = {};
  let currentCity = null;
  let currentWeather = null;
  let curveCache = new Map(); // slug -> Promise<number[]|null> (24h, averaged across modes)
  let scrubbing = false;

  function setHandAngles(hourFraction) {
    const hourAngle = ((hourFraction % 24) % 12) / 12 * 360;
    const minuteAngle = ((hourFraction * 60) % 60) / 60 * 360;
    if (els.hourHand) els.hourHand.style.transform = `rotate(${hourAngle.toFixed(2)}deg)`;
    if (els.minuteHand) els.minuteHand.style.transform = `rotate(${minuteAngle.toFixed(2)}deg)`;
  }

  function syncLiveHands() {
    if (!currentCity) return;
    const { h, m, s } = cityLocalHMS(currentCity.timezone);
    const secIntoMinute = s;
    const secIntoHour = m * 60 + s;
    const secIntoTwelveHours = (h % 12) * 3600 + secIntoHour;

    [els.hourHand, els.minuteHand, els.secondHand].forEach(el => { if (el) el.style.transform = ''; });

    if (reduceMotion()) {
      setHandAngles(h + m / 60 + s / 3600);
      if (els.secondHand) els.secondHand.style.transform = `rotate(${(secIntoMinute / 60) * 360}deg)`;
      return;
    }
    if (els.secondHand) {
      els.secondHand.style.animation = 'hero-hand-spin 60s linear infinite';
      els.secondHand.style.animationDelay = `-${secIntoMinute}s`;
    }
    if (els.minuteHand) {
      els.minuteHand.style.animation = 'hero-hand-spin 3600s linear infinite';
      els.minuteHand.style.animationDelay = `-${secIntoHour}s`;
    }
    if (els.hourHand) {
      els.hourHand.style.animation = 'hero-hand-spin 43200s linear infinite';
      els.hourHand.style.animationDelay = `-${secIntoTwelveHours}s`;
    }
  }

  function applyMoodRing(mood) {
    const band = window.GlotempCore ? GlotempCore.moodToBand(mood) : { color: 'var(--band-equilibrium)' };
    if (els.moodRing) {
      els.moodRing.setAttribute('stroke', band.color);
      const thickness = 2.6 + Math.max(0, Math.min(10, mood)) * 0.55;
      els.moodRing.setAttribute('stroke-width', thickness.toFixed(1));
    }
    return band;
  }

  function applySunTicks(sunriseHour, sunsetHour) {
    if (!els.sunTicks) return;
    let html = '';
    if (typeof sunriseHour === 'number') html += tickMarkSVG(sunriseHour, '#F5A25A');
    if (typeof sunsetHour === 'number') html += tickMarkSVG(sunsetHour, '#6BA8F5');
    els.sunTicks.innerHTML = html;
  }

  function applyTemp(temp) {
    if (els.tempReadout) {
      els.tempReadout.textContent = typeof temp === 'number' ? `${Math.round(temp)}°` : '--°';
    }
  }

  function clearSnowflakes() {
    if (els.weatherLayer) {
      els.weatherLayer.querySelectorAll('.hero-snowflake').forEach(n => n.remove());
    }
  }

  function spawnSnowflakes(count) {
    if (!els.weatherLayer || reduceMotion()) return;
    for (let i = 0; i < count; i++) {
      const flake = document.createElement('span');
      flake.className = 'hero-snowflake';
      flake.style.setProperty('--flake-left', `${Math.random() * 100}%`);
      flake.style.setProperty('--flake-size', `${2 + Math.random() * 2.5}px`);
      flake.style.setProperty('--flake-duration', `${3.5 + Math.random() * 3}s`);
      flake.style.setProperty('--flake-delay', `${(Math.random() * -6).toFixed(2)}s`);
      els.weatherLayer.appendChild(flake);
    }
  }

  function applyWeatherFX(weather) {
    if (!els.weatherLayer || !els.instrument) return;
    els.weatherLayer.className = 'hero-instrument-weather';
    clearSnowflakes();
    els.instrument.classList.remove('hero-is-hot');

    if (!weather) return;
    const { category, temp, isDay } = weather;

    // hero- prefixed: the barometer weather system earlier on the page
    // already owns bare .weather-snow/.weather-rain/etc. class names
    // (matched regardless of ancestor), so reusing them here painted its
    // opaque sky-gradient backgrounds over this element too.
    if (category === 'snow') {
      els.weatherLayer.classList.add('hero-weather-snow');
      spawnSnowflakes(12);
    } else if (category === 'rain') {
      els.weatherLayer.classList.add('hero-weather-rain');
    } else if (category === 'thunderstorm') {
      els.weatherLayer.classList.add('hero-weather-thunderstorm');
    } else if (category === 'fog') {
      els.weatherLayer.classList.add('hero-weather-fog');
    } else if (typeof temp === 'number' && temp <= COLD_C) {
      els.weatherLayer.classList.add('hero-is-frost');
    }

    if (typeof temp === 'number' && temp >= HOT_C) {
      els.instrument.classList.add('hero-is-hot');
    }

    // Night strengthens the internal glow; day recedes it -- folded into
    // the same --hero-glow-opacity the hover state lifts from.
    const glowOpacity = isDay === false ? 0.85 : 0.45;
    if (els.instrument) els.instrument.style.setProperty('--hero-glow-opacity', glowOpacity.toFixed(2));
  }

  function applyBreathe(mood) {
    const m = typeof mood === 'number' ? mood : 5;
    const period = Math.max(3.2, 8.6 - m * 0.58);
    if (els.instrument) els.instrument.style.setProperty('--hero-breathe-period', `${period.toFixed(2)}s`);
  }

  function updatePrimaryCTA(city) {
    if (!els.cta || !city) return;
    els.cta.textContent = `View ${city.name}`;
    els.cta.href = `/cities/${city.slug}.html`;
  }

  async function renderInstrument(city) {
    if (!city) return;
    currentCity = city;
    applyMoodRing(city.mood);
    applyBreathe(city.mood);
    syncLiveHands();
    updatePrimaryCTA(city);

    const weather = await fetchInstrumentWeather(city).catch(() => null);
    if (currentCity !== city) return; // a newer city took over while this fetch was in flight
    currentWeather = weather;
    if (weather) {
      applyTemp(weather.temp);
      applySunTicks(weather.sunriseHour, weather.sunsetHour);
      applyWeatherFX(weather);
    } else {
      applyTemp(null);
    }
  }

  // ---------- 24h curve for drag-scrub ----------
  async function getCityCurve(slug) {
    if (curveCache.has(slug)) return curveCache.get(slug);
    const promise = (async () => {
      if (!window.GlotempTonight) return null;
      const rows = await GlotempTonight.fetchTonight(slug).catch(() => null);
      if (rows && rows.length) {
        const withCurve = rows.filter(r => Array.isArray(r.curve) && r.curve.length === 24);
        if (withCurve.length) {
          return Array.from({ length: 24 }, (_, i) =>
            withCurve.reduce((sum, r) => sum + Number(r.curve[i] || 0), 0) / withCurve.length);
        }
      }
      // No live rows: a gentle day/night synthesized curve keyed to the
      // city's own static mood, so the drag gesture always has something
      // real-feeling to scrub through rather than going dead.
      const city = cityBySlug(slug);
      const base = city && typeof city.mood === 'number' ? city.mood : 5;
      return Array.from({ length: 24 }, (_, h) => {
        const wave = Math.sin(((h - 8) / 24) * Math.PI * 2) * 1.1;
        return Math.max(0.5, Math.min(10, base + wave));
      });
    })();
    curveCache.set(slug, promise);
    return promise;
  }

  // ---------- interactions ----------
  function withinAperture(clientX, clientY, rect) {
    const cx = rect.left + rect.width * (APERTURE_CX / 1024);
    const cy = rect.top + rect.height * (APERTURE_CY / 1024);
    const rx = rect.width * (APERTURE_R / 1024);
    const dx = clientX - cx, dy = clientY - cy;
    return Math.sqrt(dx * dx + dy * dy) <= rx;
  }

  function angleFromCenter(clientX, clientY, rect) {
    const cx = rect.left + rect.width * (APERTURE_CX / 1024);
    const cy = rect.top + rect.height * (APERTURE_CY / 1024);
    let deg = Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI + 90;
    if (deg < 0) deg += 360;
    return deg;
  }

  function pickRandomOtherCity() {
    const cities = availableCities();
    if (!cities.length) return null;
    if (cities.length === 1) return cities[0];
    let pick;
    do { pick = cities[Math.floor(Math.random() * cities.length)]; }
    while (currentCity && pick.slug === currentCity.slug);
    return pick;
  }

  function wireInteractions() {
    const el = els.instrument;
    if (!el) return;

    let pointerId = null;
    let mode = null; // 'click-candidate' | 'drag'
    let startX = 0, startY = 0;
    let curve = null;
    let restoreTimer = null;

    el.addEventListener('mouseenter', () => {
      if (reduceMotion()) return;
      if (els.secondHand) els.secondHand.style.animationDuration = '95s';
    });
    el.addEventListener('mouseleave', () => {
      if (els.secondHand && !scrubbing) els.secondHand.style.animationDuration = '60s';
    });

    el.addEventListener('pointerdown', (e) => {
      if (pointerId !== null) return;
      pointerId = e.pointerId;
      const rect = el.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      mode = withinAperture(e.clientX, e.clientY, rect) ? 'click-candidate' : 'drag';
      if (mode === 'drag' && currentCity) {
        scrubbing = true;
        clearTimeout(restoreTimer);
        curve = null;
        getCityCurve(currentCity.slug).then((c) => { curve = c; });
        el.setPointerCapture(pointerId);
      }
    });

    el.addEventListener('pointermove', (e) => {
      if (pointerId !== e.pointerId) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (mode === 'click-candidate' && Math.sqrt(dx * dx + dy * dy) > 8) {
        mode = null; // moved too far to still count as a click
      }
      if (mode === 'drag') {
        const rect = el.getBoundingClientRect();
        const deg = angleFromCenter(e.clientX, e.clientY, rect);
        const scrubHour = (deg / 360) * 24;
        setHandAngles(scrubHour);
        if (els.secondHand) els.secondHand.style.animation = 'none';
        if (curve) {
          const idx = Math.round(Math.max(0, Math.min(23, scrubHour)));
          applyMoodRing(curve[idx]);
          applyTemp(currentWeather ? currentWeather.temp : null);
        }
      }
    });

    function endPointer(e) {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      if (mode === 'click-candidate') {
        const next = pickRandomOtherCity();
        if (next) {
          if (window.GlotempCore) GlotempCore.setPinnedCity(next.slug);
          renderInstrument(next);
        }
      } else if (mode === 'drag') {
        scrubbing = false;
        if (els.secondHand) els.secondHand.style.animationDuration = '60s';
        if (currentCity) syncLiveHands();
        if (currentCity) applyMoodRing(currentCity.mood);
      }
      mode = null;
    }
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);
  }

  function wireSearch() {
    const form = document.getElementById('hero-city-search');
    const input = document.getElementById('hero-city-input');
    const datalist = document.getElementById('hero-city-list');
    if (!form || !input) return;

    if (datalist) {
      datalist.innerHTML = availableCities()
        .map(c => `<option value="${String(c.name).replace(/"/g, '&quot;')}">`).join('');
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      const match = availableCities().find(c => c.name.toLowerCase() === q) ||
        availableCities().find(c => c.name.toLowerCase().startsWith(q));
      if (!match) return;
      if (window.GlotempCore) GlotempCore.setPinnedCity(match.slug);
      renderInstrument(match);
      input.value = '';
    });
  }

  async function mount() {
    const section = document.getElementById('hero-instrument-section');
    if (!section) return;

    els = {
      instrument: document.getElementById('hero-instrument'),
      inner: document.querySelector('.hero-instrument-inner'),
      glow: document.getElementById('hero-instrument-glow'),
      live: document.getElementById('hero-instrument-live'),
      weatherLayer: document.getElementById('hero-instrument-weather'),
      cta: document.getElementById('hero-primary-cta'),
    };
    if (!els.live) return;

    els.live.innerHTML = buildLiveSVG();
    els.hourHand = document.getElementById('hero-hand-hour');
    els.minuteHand = document.getElementById('hero-hand-minute');
    els.secondHand = document.getElementById('hero-hand-second');
    els.moodRing = document.getElementById('hero-mood-ring');
    els.sunTicks = document.getElementById('hero-sun-ticks');
    els.tempReadout = document.getElementById('hero-temp-readout');

    wireSearch();
    wireInteractions();

    const city = await resolveInitialCity();
    if (city) await renderInstrument(city);

    // Local clock only needs a coarse periodic resync (the CSS animation
    // keeps the hands moving smoothly in between); this also catches a
    // pinned-city change made elsewhere on the page (e.g. the mood
    // picker) without polling.
    setInterval(() => { if (!scrubbing && currentCity) syncLiveHands(); }, 60000);
    document.addEventListener('glotemp:city-pinned', (e) => {
      const slug = e.detail && e.detail.slug;
      const c = slug ? cityBySlug(slug) : null;
      if (c && (!currentCity || currentCity.slug !== c.slug)) renderInstrument(c);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
