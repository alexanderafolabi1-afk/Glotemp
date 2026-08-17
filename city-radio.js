// Glotemp x Radio Browser: real, live local radio stations per city,
// sourced from the free, keyless Radio Browser API (community-run,
// CORS-enabled for browser use). Fetched client-side, per visitor,
// never stored -- same pattern as city-wiki.js and city-worldbank.js.
// Radio Browser has no per-city index, so this searches by the city's
// real coordinates (already in cities-data.js) within a radius, the
// same approach Radio Browser's own official apps use for "nearby
// stations."
(function () {
  // More mirrors than one round trip strictly needs -- Radio Browser is
  // community-run and any single mirror can be slow or briefly down, and
  // fetchJSON already stops at the first one that answers, so extra
  // entries only get used when they're needed.
  const SERVERS = [
    'https://de1.api.radio-browser.info',
    'https://de2.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://at1.api.radio-browser.info',
    'https://fr1.api.radio-browser.info',
  ];

  const MIN_STATIONS = 3;

  function escapeHTML(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  async function fetchJSON(pathQuery) {
    for (const base of SERVERS) {
      try {
        const resp = await fetch(base + pathQuery, { headers: { Accept: 'application/json' } });
        if (resp.ok) return await resp.json();
      } catch (e) { /* try next mirror */ }
    }
    return null;
  }

  // Radio streams served over plain http:// get silently blocked by
  // mixed-content rules on this https:// page -- the button sits there
  // looking clickable but every single station in the list can fail with
  // no clear reason. Filtering to https-only (rather than just sorting
  // https-first, which still surfaced an all-http list as "the top
  // choice" whenever a region has no https stations at all) means every
  // station actually shown has a real chance of playing.
  function httpsOnly(stations) {
    return stations.filter((s) => /^https:/i.test(s.url_resolved || s.url || ''));
  }

  // Each tier is progressively less city-specific -- the caller needs to
  // know which one actually matched so it can be honest about it (see
  // "near" below) instead of silently presenting a country-wide station
  // as if it were this exact city's local radio.
  async function searchStations(lat, lon, country) {
    const base = `&hidebroken=true&order=clickcount&reverse=true&limit=30`;
    let stations = httpsOnly(await fetchJSON(`/json/stations/search?geo_lat=${lat}&geo_long=${lon}&geo_distance=50000${base}`) || []);
    if (stations.length) return { stations: stations.slice(0, 8), near: true };

    // Sparse coverage right around this city -- widen the search radius
    // once rather than showing nothing. Still geographically local.
    stations = httpsOnly(await fetchJSON(`/json/stations/search?geo_lat=${lat}&geo_long=${lon}&geo_distance=200000${base}`) || []);
    if (stations.length) return { stations: stations.slice(0, 8), near: true };

    if (country) {
      // Still nothing within 200km -- the geo index itself is sparse for
      // this whole area (small country, or Radio Browser's geotagging
      // just hasn't reached it), not something a wider radius fixes.
      // Country-tag search is a genuinely different index in Radio
      // Browser, not a bigger radius, so it surfaces stations a pure geo
      // search never will -- but it's no longer city-specific, so the
      // caller marks it as such rather than passing it off as local.
      stations = httpsOnly(await fetchJSON(`/json/stations/search?country=${encodeURIComponent(country)}${base}`) || []);
      if (stations.length) return { stations: stations.slice(0, 8), near: false };
    }
    return { stations: [], near: true };
  }

  function stationRowHTML(station, i) {
    const name = (station.name || 'Unnamed station').trim();
    const tag = station.curated ? (station.tag || '') : (station.tags || '').split(',')[0].trim();
    return `
      <button type="button" class="radio-station${station.curated ? ' radio-station-curated' : ''}" data-idx="${i}" data-uuid="${escapeHTML(station.stationuuid || '')}">
        <span class="radio-station-play" aria-hidden="true">&#9654;</span>
        <span class="radio-station-name">${escapeHTML(name)}</span>
        ${tag ? `<span class="radio-station-tag">${escapeHTML(tag)}</span>` : ''}
      </button>`;
  }

  function wireStations(container, stations) {
    const audio = container.querySelector('#radio-audio');
    const nowPlaying = container.querySelector('#radio-now-playing');
    let activeUuid = null;
    // Set on every play attempt so a failed stream can move to the next
    // station automatically rather than just reporting the failure and
    // stopping -- the whole point of having several stations listed is
    // that one going down shouldn't be a dead end.
    let activeIdx = -1;
    let autoAdvancing = false;
    // Guards the resolve-URL fetch a tap kicks off: without it, a second
    // tap (on the same or a different station) while the first is still
    // resolving can race it -- two fetches landing out of order, or
    // audio.src getting set twice before either has actually started.
    let resolving = false;

    function resetButtons() {
      container.querySelectorAll('.radio-station').forEach((b) => {
        b.classList.remove('is-playing');
        b.querySelector('.radio-station-play').innerHTML = '&#9654;';
      });
    }

    function setStationsDisabled(disabled) {
      container.querySelectorAll('.radio-station').forEach((b) => {
        b.disabled = disabled;
        if (disabled) { b.setAttribute('aria-busy', 'true'); b.classList.add('is-loading'); }
        else { b.removeAttribute('aria-busy'); b.classList.remove('is-loading'); }
      });
    }

    async function play(idx, isRetry) {
      const station = stations[idx];
      if (!station) {
        nowPlaying.textContent = 'Pick a station to listen';
        return;
      }
      const btn = container.querySelector(`.radio-station[data-idx="${idx}"]`);
      resetButtons();
      nowPlaying.textContent = `${isRetry ? 'Trying' : 'Loading'} ${station.name}…`;
      resolving = true;
      setStationsDisabled(true);
      try {
        let url;
        if (station.curated) {
          url = station.url;
        } else {
          const resolved = await fetchJSON(`/json/url/${encodeURIComponent(station.stationuuid)}`);
          url = (resolved && resolved.url) || station.url_resolved || station.url;
        }
        if (!url) throw new Error('no stream url');
        audio.src = url;
        await audio.play();
        activeUuid = station.stationuuid || station.url;
        activeIdx = idx;
        autoAdvancing = false;
        if (btn) {
          btn.classList.add('is-playing');
          btn.querySelector('.radio-station-play').innerHTML = '&#10074;&#10074;';
        }
        nowPlaying.textContent = `Now playing - ${station.name}`;
      } catch (e) {
        if (!isRetry && idx + 1 < stations.length) {
          // One dead stream shouldn't be where listening stops. The
          // recursive call re-arms resolving/disabled itself immediately
          // (synchronously, before its own first await), so there's no
          // gap where a tap could land in between.
          autoAdvancing = true;
          play(idx + 1, true);
          return;
        } else {
          nowPlaying.textContent = `Couldn't play ${station.name} - try another station.`;
          activeIdx = -1;
        }
      }
      resolving = false;
      setStationsDisabled(false);
    }

    audio.addEventListener('ended', () => {
      resetButtons();
      nowPlaying.textContent = 'Pick a station to listen';
      activeIdx = -1;
    });
    audio.addEventListener('error', () => {
      if (autoAdvancing) return; // play() itself is already handling this attempt
      if (activeIdx >= 0 && activeIdx + 1 < stations.length) {
        const failedIdx = activeIdx;
        autoAdvancing = true;
        play(failedIdx + 1, true);
      } else {
        nowPlaying.textContent = "Couldn't play that station - try another.";
        resetButtons();
        activeUuid = null;
        activeIdx = -1;
      }
    });

    container.querySelectorAll('.radio-station').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        const station = stations[idx];
        const uuid = station.stationuuid || station.url;

        if (activeUuid === uuid && !audio.paused) {
          audio.pause();
          btn.querySelector('.radio-station-play').innerHTML = '&#9654;';
          nowPlaying.textContent = `Paused - ${station.name}`;
          return;
        }
        play(idx, false);
      });
    });
  }

  async function loadRadio(cityName, lat, lon, country, citySlug) {
    const container = document.getElementById('radio-content');
    if (!container || lat == null || lon == null) return;
    container.innerHTML = '<p class="radio-status">Tuning in&hellip;</p>';
    let stations = [];
    let near = true;
    try {
      const result = await searchStations(lat, lon, country);
      stations = result.stations;
      near = result.near;
    } catch (e) {
      stations = [];
    }

    // Curated, verified stream URLs top the live list up rather than
    // replace it -- see city-radio-curated.js. Only engages when the
    // live search came back thin, so a city Radio Browser already covers
    // well is unaffected.
    let curatedUsed = 0;
    if (stations.length < MIN_STATIONS && typeof GlotempRadioCurated !== 'undefined') {
      const existingNames = new Set(stations.map((s) => (s.name || '').trim().toLowerCase()));
      const curated = GlotempRadioCurated.forCity(citySlug, country)
        .filter((s) => s && s.name && s.url && !existingNames.has(s.name.trim().toLowerCase()))
        .map((s) => Object.assign({}, s, { curated: true }));
      if (curated.length) {
        stations = stations.concat(curated).slice(0, 8);
        curatedUsed = curated.length;
      }
    }

    if (!stations.length) {
      // Honest empty state instead of a silently vanished section: Radio
      // Browser genuinely has nothing streamable (https-capable) for this
      // city or its country right now.
      container.innerHTML = `<p class="radio-status">No streamable stations found for ${escapeHTML(cityName)} right now.</p>`;
      return;
    }
    const attribution = near
      ? 'Stations via Radio Browser, a free community directory. Streams play directly from each station.'
      : `No station geotagged right at ${escapeHTML(cityName)} -- these are ${escapeHTML(country || 'the country')}-wide stations via Radio Browser, a free community directory.`;
    container.innerHTML = `
      <div class="radio-player">
        <audio id="radio-audio" preload="none"></audio>
        <span class="radio-now-playing" id="radio-now-playing">Pick a station to listen</span>
      </div>
      <div class="radio-stations">${stations.map(stationRowHTML).join('')}</div>
      <p class="radio-attribution">${attribution}${curatedUsed ? ' A marked station or two are curated picks, verified and pinned directly.' : ''}</p>
    `;
    wireStations(container, stations);
  }

  // Single-station lookup for glotemp-home-frequency.js's quieter card --
  // same search tiers as loadRadio, but the caller wants one station and
  // its own compact markup rather than the full picker list.
  async function fetchTopStation(lat, lon, country, citySlug) {
    if (lat == null || lon == null) return null;
    let stations = [];
    let near = true;
    try {
      const result = await searchStations(lat, lon, country);
      stations = result.stations;
      near = result.near;
    } catch (e) { stations = []; }
    if (!stations.length && typeof GlotempRadioCurated !== 'undefined') {
      const curated = GlotempRadioCurated.forCity(citySlug, country);
      if (curated.length) return { station: Object.assign({}, curated[0], { curated: true }), near: true };
      return null;
    }
    return stations.length ? { station: stations[0], near } : null;
  }

  window.GlotempRadio = { loadRadio, fetchTopStation };
})();
