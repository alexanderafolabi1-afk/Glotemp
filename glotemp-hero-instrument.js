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
  // must work standalone. 56/57/66/67 (freezing drizzle/rain) are carved
  // out into their own 'sleet' bucket rather than folded into 'rain' --
  // ice pellets read differently from plain rain and deserve their own FX.
  function weatherCodeToCategory(code, isDay) {
    if (code === 0 || code === 1) return isDay ? 'clear-day' : 'clear-night';
    if (code === 2 || code === 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if ([56, 57, 66, 67].includes(code)) return 'sleet';
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ([95, 96, 99].includes(code)) return 'thunderstorm';
    return isDay ? 'clear-day' : 'clear-night';
  }

  // A short, curated seasonal-flavour motif per city -- never a claim
  // about today's actual season (this module has no reliable hemisphere-
  // aware calendar logic and won't pretend to), just a consistent,
  // tasteful visual signature for a handful of cities, always gated
  // behind the weather state it layers on top of so it never contradicts
  // what the instrument is otherwise showing.
  const SEASONAL_MOTIF = {
    tokyo: 'blossom', kyoto: 'blossom', osaka: 'blossom', nagoya: 'blossom', kanazawa: 'blossom', kobe: 'blossom',
    dubai: 'sand', doha: 'sand', riyadh: 'sand', 'abu-dhabi': 'sand', muscat: 'sand', 'kuwait-city': 'sand',
  };

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
        `&current=temperature_2m,weather_code,is_day,precipitation,cloud_cover&daily=sunrise,sunset&timezone=auto`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      const data = await res.json();
      const cur = data.current || {};
      const daily = data.daily || {};
      const category = weatherCodeToCategory(cur.weather_code, !(cur.is_day === 0));
      const precip = typeof cur.precipitation === 'number' ? cur.precipitation : 0;
      const cloud = typeof cur.cloud_cover === 'number' ? cur.cloud_cover : null;
      return {
        temp: typeof cur.temperature_2m === 'number' ? cur.temperature_2m : null,
        category,
        isDay: !(cur.is_day === 0),
        sunriseHour: isoTimeToHourFraction(daily.sunrise && daily.sunrise[0]),
        sunsetHour: isoTimeToHourFraction(daily.sunset && daily.sunset[0]),
        // Light vs heavy: >=2.5mm in the current hour is a reasonable,
        // widely-used light/moderate boundary for hourly precipitation.
        intensity: precip >= 2.5 ? 'heavy' : 'light',
        overcast: category === 'cloudy' && cloud != null && cloud >= 85,
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
        text-anchor="middle" font-family="var(--font-mono)" font-size="24" fill="#F0E0C8" opacity="0.92">--&deg;</text>
      <circle id="hero-twinkle-eye" class="hero-twinkle-eye"
        cx="${(APERTURE_CX + APERTURE_R * 0.55 * Math.cos(-45 * Math.PI / 180)).toFixed(1)}"
        cy="${(APERTURE_CY + APERTURE_R * 0.55 * Math.sin(-45 * Math.PI / 180)).toFixed(1)}"
        r="3" fill="#FBF3E3"></circle>`;
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
    // Second animation in each shorthand is a very subtle, slow opacity
    // breathe (see .hero-hand-pulse in styles.css) -- purely decorative,
    // layered onto the same rotation without changing the clock logic.
    if (els.secondHand) {
      els.secondHand.style.animation = 'hero-hand-spin 60s linear infinite, hero-hand-pulse 5s ease-in-out infinite';
      els.secondHand.style.animationDelay = `-${secIntoMinute}s`;
    }
    if (els.minuteHand) {
      els.minuteHand.style.animation = 'hero-hand-spin 3600s linear infinite, hero-hand-pulse 5s ease-in-out infinite';
      els.minuteHand.style.animationDelay = `-${secIntoHour}s`;
    }
    if (els.hourHand) {
      els.hourHand.style.animation = 'hero-hand-spin 43200s linear infinite, hero-hand-pulse 5s ease-in-out infinite';
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

  function clearStars() {
    if (els.surface) els.surface.querySelectorAll('.hero-star').forEach((n) => n.remove());
  }

  function clearMotifs() {
    if (els.surface) els.surface.querySelectorAll('.hero-motif').forEach((n) => n.remove());
  }

  // Static, twinkling, scattered near the outer rim rather than falling --
  // a night sky around the housing, not inside the aperture.
  function spawnStars(count) {
    if (!els.surface || reduceMotion()) return;
    clearStars();
    for (let i = 0; i < count; i++) {
      const star = document.createElement('span');
      star.className = 'hero-star';
      const angle = Math.random() * 360;
      const r = 27 + Math.random() * 9; // percent, hugging the outer housing
      const rad = angle * Math.PI / 180;
      star.style.setProperty('--star-left', `${(50 + r * Math.cos(rad)).toFixed(1)}%`);
      star.style.setProperty('--star-top', `${(50 + r * Math.sin(rad)).toFixed(1)}%`);
      star.style.setProperty('--star-delay', `${(Math.random() * 4).toFixed(2)}s`);
      star.style.setProperty('--star-size', `${1 + Math.random() * 1.6}px`);
      els.surface.appendChild(star);
    }
  }

  // Short-lived reward particles for a click or a check-in acknowledgment.
  // Self-removing (animationend, with a timeout safety net in case that
  // event doesn't fire) so repeated bursts never accumulate stale nodes.
  const BURST_SHAPE = {
    snow: 'hero-burst-flake', sleet: 'hero-burst-drop', rain: 'hero-burst-drop',
    thunderstorm: 'hero-burst-spark', fog: 'hero-burst-spark',
    'clear-day': 'hero-burst-glint', 'clear-night': 'hero-burst-star',
    cloudy: 'hero-burst-glint', gold: 'hero-burst-glint',
  };
  function spawnBurst(kind, count) {
    if (!els.burstLayer || reduceMotion()) return;
    const shapeClass = BURST_SHAPE[kind] || 'hero-burst-glint';
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = `hero-burst-particle ${shapeClass}`;
      p.style.setProperty('--burst-angle', `${(Math.random() * 360).toFixed(1)}deg`);
      p.style.setProperty('--burst-dist', `${(30 + Math.random() * 45).toFixed(0)}%`);
      p.style.setProperty('--burst-delay', `${(Math.random() * 0.12).toFixed(2)}s`);
      els.burstLayer.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
      setTimeout(() => { if (p.parentNode) p.remove(); }, 1800);
    }
  }

  function applyWeatherFX(weather, citySlug) {
    if (!els.weatherLayer || !els.instrument) return;
    els.weatherLayer.className = 'hero-instrument-weather';
    if (els.surface) els.surface.className = 'hero-instrument-surface';
    clearSnowflakes();
    clearStars();
    clearMotifs();
    els.instrument.classList.remove('hero-is-hot');
    if (els.twinkleEye) els.twinkleEye.classList.remove('is-active', 'is-bright');

    if (!weather) return;
    const { category, temp, isDay, intensity, overcast } = weather;
    const heavy = intensity === 'heavy';

    // hero- prefixed: the barometer weather system earlier on the page
    // already owns bare .weather-snow/.weather-rain/etc. class names
    // (matched regardless of ancestor), so reusing them here painted its
    // opaque sky-gradient backgrounds over this element too.
    //
    // .hero-instrument-weather (aperture-only) carries the "inside the
    // glass" effects already built (streaks, flakes, lightning). The
    // newer .hero-instrument-surface layer is unclipped to the full
    // housing -- rings, edges -- for effects that should read as
    // happening to the instrument itself, not just behind its dial.
    if (category === 'snow') {
      els.weatherLayer.classList.add('hero-weather-snow');
      if (heavy) els.weatherLayer.classList.add('hero-weather-heavy');
      spawnSnowflakes(heavy ? 20 : 12);
      if (els.surface) {
        els.surface.classList.add('hero-surface-snow');
        if (heavy) els.surface.classList.add('hero-surface-heavy');
      }
      if (els.twinkleEye) {
        els.twinkleEye.classList.add('is-active');
        if (heavy) els.twinkleEye.classList.add('is-bright');
      }
    } else if (category === 'sleet') {
      els.weatherLayer.classList.add('hero-weather-sleet');
    } else if (category === 'rain') {
      els.weatherLayer.classList.add('hero-weather-rain');
      if (heavy) els.weatherLayer.classList.add('hero-weather-heavy');
    } else if (category === 'thunderstorm') {
      els.weatherLayer.classList.add('hero-weather-thunderstorm');
    } else if (category === 'fog') {
      els.weatherLayer.classList.add('hero-weather-fog');
    } else if (category === 'cloudy') {
      if (overcast && els.surface) els.surface.classList.add('hero-surface-overcast');
    } else if (category === 'clear-day') {
      if (els.surface) {
        els.surface.classList.add('hero-surface-sun-glint');
        const motif = SEASONAL_MOTIF[citySlug];
        if (motif === 'blossom') { els.surface.classList.add('hero-surface-blossom'); spawnMotif('blossom', 7); }
        if (motif === 'sand' && temp >= HOT_C) spawnMotif('sand', 8);
      }
    } else if (category === 'clear-night') {
      if (els.surface) els.surface.classList.add('hero-surface-stars');
      spawnStars(14);
    }

    if (typeof temp === 'number' && temp <= COLD_C && category !== 'snow' && category !== 'sleet') {
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

  // Seasonal-flavour particles (blossom petals, drifting sand) -- same
  // spawn mechanics as the star field, a handful of static/slow-drifting
  // marks near the rim rather than a falling stream, so they read as
  // atmosphere rather than competing with the real weather layer.
  function spawnMotif(kind, count) {
    if (!els.surface || reduceMotion()) return;
    for (let i = 0; i < count; i++) {
      const mark = document.createElement('span');
      mark.className = `hero-motif hero-motif-${kind}`;
      mark.style.setProperty('--motif-left', `${(Math.random() * 100).toFixed(1)}%`);
      mark.style.setProperty('--motif-delay', `${(Math.random() * -8).toFixed(2)}s`);
      mark.style.setProperty('--motif-duration', `${(6 + Math.random() * 5).toFixed(2)}s`);
      els.surface.appendChild(mark);
    }
  }

  function applyBreathe(mood) {
    const m = typeof mood === 'number' ? mood : 5;
    const period = Math.max(3.2, 8.6 - m * 0.58);
    if (els.instrument) els.instrument.style.setProperty('--hero-breathe-period', `${period.toFixed(2)}s`);
  }

  // Mood coupling beyond the ring's own colour: an energised city reads
  // very slightly warmer and more saturated, a low one very slightly
  // cooler and quieter. Deliberately subtle -- a few percent, not a
  // colour filter someone would consciously notice.
  function applyMoodCoupling(band) {
    if (els.instrument) {
      els.instrument.classList.toggle('hero-mood-charged', band === 'charged');
      els.instrument.classList.toggle('hero-mood-low', band === 'low' || band === 'restrained');
    }
    if (els.inner) {
      const sat = band === 'low' ? 0.74 : band === 'restrained' ? 0.88 : band === 'charged' ? 1.1 : 1;
      const hue = band === 'low' ? -7 : band === 'charged' ? 5 : 0;
      els.inner.style.setProperty('--hero-saturate', sat.toFixed(2));
      els.inner.style.setProperty('--hero-hue', `${hue}deg`);
    }
  }

  function updatePrimaryCTA(city) {
    if (!els.cta || !city) return;
    els.cta.textContent = `View ${city.name}`;
    els.cta.href = `/cities/${city.slug}.html`;
  }

  async function renderInstrument(city) {
    if (!city) return;
    currentCity = city;
    const band = applyMoodRing(city.mood);
    applyMoodCoupling(band && band.band);
    applyBreathe(city.mood);
    syncLiveHands();
    updatePrimaryCTA(city);

    const weather = await fetchInstrumentWeather(city).catch(() => null);
    if (currentCity !== city) return; // a newer city took over while this fetch was in flight
    currentWeather = weather;
    if (weather) {
      applyTemp(weather.temp);
      applySunTicks(weather.sunriseHour, weather.sunsetHour);
      applyWeatherFX(weather, city.slug);
    } else {
      applyTemp(null);
      applyWeatherFX(null, city.slug);
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

  // ---------- sound (synthesized, no audio asset) ----------
  // Two short WebAudio bursts -- a percussive click, then a brief
  // filtered-noise "whir" -- rather than a shipped audio file. Muted by
  // default and only ever created lazily, on the first toggle-on or
  // click, so a visitor who never touches sound never spins up an
  // AudioContext at all.
  const SOUND_KEY = 'glotemp-hero-sound';
  let soundEnabled = false;
  try { soundEnabled = localStorage.getItem(SOUND_KEY) === '1'; } catch (e) { /* private mode */ }
  let audioCtx = null;

  function getAudioCtx() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  function playClickWhir() {
    if (!soundEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(900, now);
    click.frequency.exponentialRampToValueAtTime(220, now + 0.05);
    clickGain.gain.setValueAtTime(0.05, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.08);
    click.connect(clickGain).connect(ctx.destination);
    click.start(now);
    click.stop(now + 0.09);

    const bufferSize = Math.floor(ctx.sampleRate * 0.32);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const whir = ctx.createBufferSource();
    whir.buffer = buffer;
    const whirFilter = ctx.createBiquadFilter();
    whirFilter.type = 'bandpass';
    whirFilter.frequency.setValueAtTime(650, now);
    whirFilter.frequency.exponentialRampToValueAtTime(1300, now + 0.28);
    whirFilter.Q.value = 5;
    const whirGain = ctx.createGain();
    whirGain.gain.setValueAtTime(0.025, now + 0.03);
    whirGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.32);
    whir.connect(whirFilter).connect(whirGain).connect(ctx.destination);
    whir.start(now + 0.02);
  }

  function updateSoundToggleUI(btn) {
    btn.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
    btn.textContent = soundEnabled ? '\u{1F50A}' : '\u{1F507}';
    btn.title = soundEnabled ? 'Instrument sound: on' : 'Instrument sound: off';
    btn.setAttribute('aria-label', soundEnabled ? 'Turn off instrument sound' : 'Turn on instrument sound');
  }

  function wireSoundToggle() {
    const btn = document.getElementById('hero-sound-toggle');
    if (!btn) return;
    updateSoundToggleUI(btn);
    btn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      try { localStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0'); } catch (e) { /* private mode */ }
      updateSoundToggleUI(btn);
      if (soundEnabled) {
        const ctx = getAudioCtx();
        if (ctx && ctx.state === 'suspended') ctx.resume();
      }
    });
  }

  // ---------- the rare pulse spark ----------
  // A one-line poetic read on the city that just landed, shown roughly
  // one click in fifteen. Low frequency on purpose: a reward that fires
  // every time isn't a reward, it's decor.
  const PULSE_SPARK_CHANCE = 0.06;
  const SPARK_LINES = {
    charged: ['still warm from tonight', 'wide awake right now', 'the night has real momentum here'],
    warm: ['easy out there tonight', 'unhurried and warm', 'a good hour to be out'],
    equilibrium: ['steady, the way most nights are', 'nothing dramatic, just going', 'holding its usual pace'],
    restrained: ['keeping its voice down tonight', 'a quieter kind of awake', 'holding back a little'],
    low: ['mostly asleep already', 'a hush has settled in', 'very little stirring right now'],
  };
  function maybeShowPulseSpark(city) {
    const el = document.getElementById('hero-pulse-spark');
    if (!el) return;
    if (Math.random() > PULSE_SPARK_CHANCE) {
      el.classList.remove('is-visible');
      return;
    }
    const band = window.GlotempCore ? GlotempCore.moodToBand(city.mood).band : 'equilibrium';
    const lines = SPARK_LINES[band] || SPARK_LINES.equilibrium;
    const line = lines[Math.floor(Math.random() * lines.length)];
    el.textContent = `${city.name}: ${line}`;
    el.classList.add('is-visible');
    clearTimeout(el._sparkTimer);
    el._sparkTimer = setTimeout(() => el.classList.remove('is-visible'), 5000);
  }

  // ---------- mood-ring settle flourish ----------
  // A brief pulse on the mood ring, distinct from the continuous clock
  // hands, so a click reads as "the instrument noticed" rather than a
  // silent content swap.
  function playSettleFlourish() {
    if (!els.moodRing || reduceMotion()) return;
    els.moodRing.classList.remove('hero-ring-settle');
    // Force reflow so re-adding the class restarts the animation even on
    // back-to-back clicks.
    void els.moodRing.getBBox();
    els.moodRing.classList.add('hero-ring-settle');
  }

  // ---------- founding mark ----------
  // A small, discreet mark for the platform's most consistent
  // contributors -- reuses the existing Temp-Reporter tier (see
  // glotemp-reporter.js) rather than inventing a second, parallel status
  // system just for this.
  async function applyFoundingMark() {
    const mark = document.getElementById('hero-founding-mark');
    if (!mark || typeof GlotempAuth === 'undefined') return;
    try {
      const signedIn = await GlotempAuth.isSignedIn();
      if (!signedIn) { mark.hidden = true; return; }
      const profile = await GlotempAuth.fetchProfile();
      mark.hidden = !(profile && profile.reporter_tier === 'chief_correspondent');
      if (!mark.hidden) mark.title = 'Chief Correspondent';
    } catch (e) {
      mark.hidden = true;
    }
  }

  // ---------- daily check-in acknowledgment ----------
  function playCheckinAcknowledgment() {
    if (!els.instrument) return;
    spawnBurst('gold', 14);
    els.instrument.classList.remove('hero-checkin-ack');
    void els.instrument.getBoundingClientRect();
    els.instrument.classList.add('hero-checkin-ack');
    setTimeout(() => { if (els.instrument) els.instrument.classList.remove('hero-checkin-ack'); }, 1700);
  }

  // ---------- hover parallax ----------
  // A small, eased translate on the outer housing, tracking the pointer
  // -- composed with the existing continuous breathe animation via a CSS
  // custom property the keyframes themselves reference, rather than
  // fighting it for control of `transform`. Eases back to rest on
  // pointer leave via the same rAF loop rather than snapping.
  let tiltTarget = { x: 0, y: 0 };
  let tiltCurrent = { x: 0, y: 0 };
  let tiltRAF = null;
  const TILT_MAX = 7; // px

  function tiltTick() {
    tiltCurrent.x += (tiltTarget.x - tiltCurrent.x) * 0.18;
    tiltCurrent.y += (tiltTarget.y - tiltCurrent.y) * 0.18;
    if (els.instrument) {
      els.instrument.style.setProperty('--hero-tilt-x', `${tiltCurrent.x.toFixed(2)}px`);
      els.instrument.style.setProperty('--hero-tilt-y', `${tiltCurrent.y.toFixed(2)}px`);
    }
    const settled = Math.abs(tiltTarget.x - tiltCurrent.x) < 0.05 && Math.abs(tiltTarget.y - tiltCurrent.y) < 0.05
      && Math.abs(tiltTarget.x) < 0.05 && Math.abs(tiltTarget.y) < 0.05;
    if (!settled) {
      tiltRAF = requestAnimationFrame(tiltTick);
    } else {
      tiltRAF = null;
    }
  }
  function nudgeTilt() {
    if (tiltRAF == null) tiltRAF = requestAnimationFrame(tiltTick);
  }
  function wireParallax() {
    const el = els.instrument;
    if (!el || reduceMotion()) return;
    el.addEventListener('pointermove', (e) => {
      if (scrubbing) return;
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1..1
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      tiltTarget = { x: nx * TILT_MAX, y: ny * TILT_MAX };
      nudgeTilt();
    });
    el.addEventListener('pointerleave', () => {
      tiltTarget = { x: 0, y: 0 };
      nudgeTilt();
    });
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
          spawnBurst(currentWeather ? currentWeather.category : 'clear-day', 12);
          playClickWhir();
          playSettleFlourish();
          if (window.GlotempCore) GlotempCore.setPinnedCity(next.slug);
          renderInstrument(next).then(() => maybeShowPulseSpark(next));
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
      surface: document.getElementById('hero-instrument-surface'),
      burstLayer: document.getElementById('hero-burst-layer'),
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
    els.twinkleEye = document.getElementById('hero-twinkle-eye');

    wireSearch();
    wireInteractions();
    wireParallax();
    wireSoundToggle();
    applyFoundingMark();

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
    // The daily check-in ritual (glotemp-daily-checkin.js) lives further
    // down this same homepage -- a successful check-in there gets a
    // visible acknowledgment here, tying the two rituals together
    // without either file needing to know about the other's markup.
    window.addEventListener('glotemp:daily-checkin', playCheckinAcknowledgment);
    // A profile can go from no tier to Chief Correspondent while the tab
    // stays open (e.g. right after this exact interaction); re-check
    // whenever auth state changes rather than only once at load.
    document.addEventListener('glotemp:auth-changed', applyFoundingMark);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
