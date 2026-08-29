// Glotemp Soundscape: three real, additive audio sources for this city,
// alongside the existing live radio player (city-radio.js /
// city-radio-curated.js / city_stations / now_playing -- all untouched,
// none of that is read or written here).
//
// 1. Mixcloud DJ-set search -- keyless, called directly from the
//    browser (api.mixcloud.com is CORS-open to any origin -- checked
//    live before writing this). Real cloudcasts only, whatever the
//    city's own name actually turns up.
// 2. Freesound.org location-tagged soundscape search -- Freesound
//    requires a real API key, so this goes through the new
//    freesound-search edge function (server-side key, see that
//    function's own comment) rather than ever putting a key in this
//    file.
// 3. A procedural Web Audio ambient, generated from this city's real
//    current weather (Open-Meteo, same source and category mapping as
//    glotemp-hero-instrument.js) -- shown only when Freesound has
//    nothing real for this city, and always labelled plainly as
//    generated, never presented as a recording.
//
// Same honesty rule as everywhere else on this project: a real result
// or nothing shown, per source, per city. Nothing here is ever
// invented, and the whole section stays hidden if all three sources
// come back empty.
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const MIXCLOUD_SEARCH_URL = 'https://api.mixcloud.com/search/';
  const FREESOUND_FN_URL = SUPABASE_URL + '/functions/v1/freesound-search';
  const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
  const TIMEOUT_MS = 7000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  async function fetchJSONTimed(url) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- 1. Mixcloud (keyless) ----------
  async function searchMixcloud(cityName) {
    const url = `${MIXCLOUD_SEARCH_URL}?q=${encodeURIComponent(cityName)}&type=cloudcast&limit=5`;
    const data = await fetchJSONTimed(url);
    const rows = data && Array.isArray(data.data) ? data.data : [];
    return rows.filter((r) => r && r.url && r.name);
  }

  function mixcloudHTML(rows) {
    if (!rows.length) return '';
    const top = rows[0];
    const rest = rows.slice(1, 4);
    return `
      <div class="soundscape-block soundscape-mixcloud">
        <span class="context-tag">Real DJ sets &middot; Mixcloud</span>
        <iframe class="mixcloud-embed" title="${esc(top.name)}" width="100%" height="120"
          src="https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=${encodeURIComponent(top.url)}"
          frameborder="0" loading="lazy"></iframe>
        ${rest.length ? '<ul class="soundscape-more-list">' + rest.map((r) => (
          `<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a></li>`
        )).join('') + '</ul>' : ''}
      </div>`;
  }

  // ---------- 2. Freesound (keyed, via edge function) ----------
  async function searchFreesound(cityName) {
    const url = `${FREESOUND_FN_URL}?city=${encodeURIComponent(cityName)}`;
    const data = await fetchJSONTimed(url);
    return data && Array.isArray(data.results) ? data.results : [];
  }

  function freesoundHTML(rows) {
    if (!rows.length) return '';
    const top = rows[0];
    const tags = (top.tags || []).slice(0, 5).map((t) => esc(t)).join(', ');
    return `
      <div class="soundscape-block soundscape-freesound">
        <span class="context-tag">Real field recording &middot; Freesound.org</span>
        <p class="soundscape-clip-name">${esc(top.name)}</p>
        <audio controls preload="none" class="soundscape-audio" src="${esc(top.preview_mp3)}"></audio>
        ${tags ? `<p class="soundscape-tags">${tags}</p>` : ''}
        <p class="soundscape-credit">Recorded by ${esc(top.username)} &middot; <a href="${esc(top.url)}" target="_blank" rel="noopener noreferrer">Freesound</a></p>
      </div>`;
  }

  // ---------- 3. Procedural ambient (Web Audio, tied to real weather) ----------
  // Mirrors weatherCodeToCategory in app.js / glotemp-hero-instrument.js --
  // duplicated rather than shared for the same standalone-module reason
  // glotemp-hero-instrument.js gives for its own copy.
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

  const CATEGORY_LABEL = {
    'clear-day': 'clear skies', 'clear-night': 'clear skies', cloudy: 'overcast',
    fog: 'fog', sleet: 'sleet', rain: 'rain', snow: 'snow', thunderstorm: 'a thunderstorm',
  };

  async function fetchWeatherCategory(lat, lon) {
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const data = await fetchJSONTimed(url);
    const cur = data && data.current;
    if (!cur || typeof cur.weather_code !== 'number') return null;
    return {
      category: weatherCodeToCategory(cur.weather_code, !(cur.is_day === 0)),
      temp: typeof cur.temperature_2m === 'number' ? cur.temperature_2m : null,
    };
  }

  // One shared AudioContext per page, built lazily on first real user
  // gesture (autoplay-restricted browsers require this regardless).
  let audioCtx = null;
  let activeNodes = null;

  function stopProcedural() {
    if (!activeNodes) return;
    const { gain, stopFns } = activeNodes;
    const now = audioCtx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);
    setTimeout(() => { stopFns.forEach((fn) => fn()); }, 700);
    activeNodes = null;
  }

  function makeNoiseBuffer(ctx, seconds) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // Builds a small, understated node graph per weather category. Nothing
  // here claims to be a field recording -- it is a synthesized texture,
  // labelled as such in the markup around it.
  function startProcedural(category, tempC) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (activeNodes) stopProcedural();

    const ctx = audioCtx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 1.2);

    const stopFns = [];
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoiseBuffer(ctx, 4);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    let type = 'lowpass', freq = 800, gainVal = 0.5;

    if (category === 'rain' || category === 'sleet') { type = 'bandpass'; freq = 1400; gainVal = 0.7; }
    else if (category === 'snow') { type = 'highpass'; freq = 3000; gainVal = 0.25; }
    else if (category === 'fog' || category === 'cloudy') { type = 'lowpass'; freq = 400; gainVal = 0.5; }
    else if (category === 'thunderstorm') { type = 'bandpass'; freq = 1200; gainVal = 0.8; }
    else { type = 'lowpass'; freq = 250; gainVal = 0.2; } // clear-day / clear-night: near-silent air, not rain-like noise

    // A cold city gets a slightly darker (lower cutoff) texture than a
    // warm one -- a small, real, weather-derived touch, not decoration.
    if (typeof tempC === 'number') {
      const tempAdj = Math.max(0.6, Math.min(1.4, 1 + (tempC - 15) / 60));
      freq *= tempAdj;
    }

    filter.type = type;
    filter.frequency.value = freq;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = gainVal;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();
    stopFns.push(() => { try { noise.stop(); } catch {} });

    // Soft drone pad underneath, always present but very quiet -- gives
    // clear weather something to sound like besides silence, and gives
    // every category a low sustaining bed.
    const droneFreqs = category === 'clear-day' || category === 'clear-night' ? [220, 277] : [110, 165];
    droneFreqs.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.05;
      osc.connect(oscGain);
      oscGain.connect(master);
      osc.start();
      stopFns.push(() => { try { osc.stop(); } catch {} });
    });

    // Thunderstorm: occasional low rumble burst, real randomness, never
    // on a fixed metronomic loop.
    let rumbleTimer = null;
    if (category === 'thunderstorm') {
      const scheduleRumble = () => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 55;
        const rumbleGain = ctx.createGain();
        rumbleGain.gain.value = 0;
        osc.connect(rumbleGain);
        rumbleGain.connect(master);
        osc.start();
        const t = ctx.currentTime;
        rumbleGain.gain.linearRampToValueAtTime(0.35, t + 0.3);
        rumbleGain.gain.linearRampToValueAtTime(0, t + 2.5);
        setTimeout(() => { try { osc.stop(); } catch {} }, 2800);
        rumbleTimer = setTimeout(scheduleRumble, 6000 + Math.random() * 9000);
      };
      rumbleTimer = setTimeout(scheduleRumble, 1500);
      stopFns.push(() => { if (rumbleTimer) clearTimeout(rumbleTimer); });
    }

    activeNodes = { gain: master, stopFns };
  }

  function proceduralHTML(weather) {
    const label = CATEGORY_LABEL[weather.category] || weather.category;
    const tempStr = typeof weather.temp === 'number' ? `, ${Math.round(weather.temp)}°C` : '';
    return `
      <div class="soundscape-block soundscape-procedural">
        <span class="context-tag">Procedural ambient &middot; generated, not a recording</span>
        <p class="soundscape-clip-name">Tied to this city's real conditions right now: ${esc(label)}${tempStr}.</p>
        <button type="button" class="btn-neon soundscape-procedural-toggle" data-playing="false">Play ambient</button>
      </div>`;
  }

  function wireProceduralToggle(root, weather) {
    const btn = root.querySelector('.soundscape-procedural-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const playing = btn.getAttribute('data-playing') === 'true';
      if (playing) {
        stopProcedural();
        btn.setAttribute('data-playing', 'false');
        btn.textContent = 'Play ambient';
      } else {
        startProcedural(weather.category, weather.temp);
        btn.setAttribute('data-playing', 'true');
        btn.textContent = 'Stop ambient';
      }
    });
  }

  async function loadSoundscape(citySlug, cityName, lat, lon) {
    const section = document.getElementById('city-soundscape-section');
    const mixMount = document.getElementById('soundscape-mixcloud-mount');
    const ambientMount = document.getElementById('soundscape-ambient-mount');
    if (!section || !mixMount || !ambientMount || !cityName) return;

    const [mixRows, freesoundRows] = await Promise.all([
      searchMixcloud(cityName),
      searchFreesound(cityName),
    ]);

    let anyReal = false;

    if (mixRows.length) {
      mixMount.innerHTML = mixcloudHTML(mixRows);
      anyReal = true;
    }

    if (freesoundRows.length) {
      ambientMount.innerHTML = freesoundHTML(freesoundRows);
      anyReal = true;
    } else {
      const weather = await fetchWeatherCategory(lat, lon);
      if (weather) {
        ambientMount.innerHTML = proceduralHTML(weather);
        wireProceduralToggle(ambientMount, weather);
        anyReal = true;
      }
    }

    if (anyReal) section.hidden = false;
  }

  window.GlotempSoundscape = { loadSoundscape };
})();
