// Glotemp x Radio Browser: real, live local radio stations per city,
// sourced from the free, keyless Radio Browser API (community-run,
// CORS-enabled for browser use). Fetched client-side, per visitor,
// never stored -- same pattern as city-wiki.js and city-worldbank.js.
// Radio Browser has no per-city index, so this searches by the city's
// real coordinates (already in cities-data.js) within a radius, the
// same approach Radio Browser's own official apps use for "nearby
// stations."
(function () {
  const SERVERS = [
    'https://de1.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://at1.api.radio-browser.info',
  ];

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
  // mixed-content rules on an https:// page. Pulling extra candidates
  // and sorting https-first maximizes the odds the visible list is
  // actually playable, without hiding stations outright.
  function sortHttpsFirst(stations) {
    return stations.slice().sort((a, b) => {
      const aHttps = /^https:/i.test(a.url_resolved || a.url || '') ? 0 : 1;
      const bHttps = /^https:/i.test(b.url_resolved || b.url || '') ? 0 : 1;
      return aHttps - bHttps;
    });
  }

  async function searchStations(lat, lon) {
    const base = `&hidebroken=true&order=clickcount&reverse=true&limit=20`;
    let stations = await fetchJSON(`/json/stations/search?geo_lat=${lat}&geo_long=${lon}&geo_distance=50000${base}`);
    if (!stations || !stations.length) {
      // Sparse coverage near this city -- widen the search radius once
      // rather than showing nothing.
      stations = await fetchJSON(`/json/stations/search?geo_lat=${lat}&geo_long=${lon}&geo_distance=200000${base}`);
    }
    if (!stations) return [];
    return sortHttpsFirst(stations).slice(0, 8);
  }

  function stationRowHTML(station, i) {
    const name = (station.name || 'Unnamed station').trim();
    const tag = (station.tags || '').split(',')[0].trim();
    return `
      <button type="button" class="radio-station" data-idx="${i}" data-uuid="${escapeHTML(station.stationuuid)}">
        <span class="radio-station-play" aria-hidden="true">&#9654;</span>
        <span class="radio-station-name">${escapeHTML(name)}</span>
        ${tag ? `<span class="radio-station-tag">${escapeHTML(tag)}</span>` : ''}
      </button>`;
  }

  function wireStations(container, stations) {
    const audio = container.querySelector('#radio-audio');
    const nowPlaying = container.querySelector('#radio-now-playing');
    let activeUuid = null;

    function resetButtons() {
      container.querySelectorAll('.radio-station').forEach((b) => {
        b.classList.remove('is-playing');
        b.querySelector('.radio-station-play').innerHTML = '&#9654;';
      });
    }

    audio.addEventListener('ended', () => {
      resetButtons();
      nowPlaying.textContent = 'Pick a station to listen';
    });
    audio.addEventListener('error', () => {
      nowPlaying.textContent = "Couldn't play that station - try another.";
      resetButtons();
      activeUuid = null;
    });

    container.querySelectorAll('.radio-station').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uuid = btn.getAttribute('data-uuid');
        const idx = Number(btn.getAttribute('data-idx'));
        const station = stations[idx];

        if (activeUuid === uuid && !audio.paused) {
          audio.pause();
          btn.querySelector('.radio-station-play').innerHTML = '&#9654;';
          nowPlaying.textContent = `Paused - ${station.name}`;
          return;
        }

        resetButtons();
        nowPlaying.textContent = `Loading ${station.name}…`;
        try {
          const resolved = await fetchJSON(`/json/url/${encodeURIComponent(uuid)}`);
          const url = (resolved && resolved.url) || station.url_resolved || station.url;
          if (!url) throw new Error('no stream url');
          audio.src = url;
          await audio.play();
          activeUuid = uuid;
          btn.classList.add('is-playing');
          btn.querySelector('.radio-station-play').innerHTML = '&#10074;&#10074;';
          nowPlaying.textContent = `Now playing - ${station.name}`;
        } catch (e) {
          nowPlaying.textContent = `Couldn't play ${station.name} - try another station.`;
        }
      });
    });
  }

  async function loadRadio(cityName, lat, lon) {
    const container = document.getElementById('radio-content');
    if (!container || lat == null || lon == null) return;
    container.innerHTML = '<p class="radio-status">Tuning in&hellip;</p>';
    let stations = [];
    try {
      stations = await searchStations(lat, lon);
    } catch (e) {
      stations = [];
    }
    if (!stations.length) {
      container.innerHTML = '<p class="radio-status">No local stations found yet.</p>';
      return;
    }
    container.innerHTML = `
      <div class="radio-player">
        <audio id="radio-audio" preload="none"></audio>
        <span class="radio-now-playing" id="radio-now-playing">Pick a station to listen</span>
      </div>
      <div class="radio-stations">${stations.map(stationRowHTML).join('')}</div>
      <p class="radio-attribution">Stations via Radio Browser, a free community directory. Streams play directly from each station.</p>
    `;
    wireStations(container, stations);
  }

  window.GlotempRadio = { loadRadio };
})();
