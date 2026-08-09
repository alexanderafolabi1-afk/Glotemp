// Glotemp features layer: rivals, sparklines, first/last light, and the
// recruiting empty state. Everything is inline SVG or CSS driven by live
// data -- no image files.
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function cities() { return window.CITIES_DATA || []; }
  function cityBy(slug) { return cities().find(c => c.slug === slug); }
  function band(v) {
    return window.GlotempCore ? GlotempCore.moodToBand(v) : { band: 'equilibrium', color: '#F0E0C8' };
  }

  // ---------- RIVALS ----------
  // A rival must be PERMANENT: the same pairing every load, for everyone.
  // Deterministic pairing -- sort all cities by slug, then pair each with
  // its nearest neighbour in the same region by rank distance, resolved
  // by a stable hash rather than anything random or time-based.
  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }

  function rivalFor(slug) {
    const me = cityBy(slug);
    if (!me) return null;
    const sameRegion = cities()
      .filter(c => c.available !== false && c.slug !== slug && c.region === me.region)
      .sort((a, b) => a.slug.localeCompare(b.slug));
    const pool = sameRegion.length ? sameRegion
      : cities().filter(c => c.available !== false && c.slug !== slug)
                .sort((a, b) => a.slug.localeCompare(b.slug));
    if (!pool.length) return null;
    // Rank-proximity shortlist, then a stable hash pick -- same answer
    // every time for a given slug.
    const byRank = pool.slice().sort((a, b) =>
      Math.abs((a.rank || 999) - (me.rank || 999)) - Math.abs((b.rank || 999) - (me.rank || 999)));
    const shortlist = byRank.slice(0, Math.min(4, byRank.length));
    return shortlist[hash(slug) % shortlist.length];
  }

  // Seven days of readings for a city, oldest first. Returns null when
  // there is no stored history -- callers must not invent a line.
  async function historyFor(slug, days) {
    const since = new Date(Date.now() - (days || 7) * 86400000).toISOString();
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/readings?city_slug=eq.${encodeURIComponent(slug)}` +
        `&vertical=eq.pulse&fetched_at=gte.${since}` +
        `&select=value,fetched_at&order=fetched_at.asc&limit=500`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } }
      );
      if (!resp.ok) return null;
      const rows = await resp.json();
      if (!rows || !rows.length) return null;
      // Collapse to one mean value per calendar day.
      const byDay = new Map();
      rows.forEach(r => {
        if (typeof r.value !== 'number') return;
        const d = String(r.fetched_at).slice(0, 10);
        if (!byDay.has(d)) byDay.set(d, []);
        byDay.get(d).push(r.value);
      });
      const series = Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([d, vals]) => ({ day: d, value: vals.reduce((s, v) => s + v, 0) / vals.length }));
      return series.length ? series : null;
    } catch (e) {
      return null;
    }
  }

  // ---------- SPARKLINE ----------
  function sparklineSVG(series, color) {
    const W = 120, H = 22, pad = 2;
    if (!series || series.length < 2) return '';
    const vals = series.map(s => s.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = (max - min) || 1;
    const pts = vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
      const y = H - pad - ((v - min) / span) * (H - pad * 2);
      return [x, y];
    });
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const last = pts[pts.length - 1];
    return `<svg class="sparkline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
      aria-label="Seven day reading history">
      <path d="${d}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="1.9" fill="${color}"/>
    </svg>`;
  }

  // ---------- FIRST LIGHT / LAST LIGHT ----------
  // Live sunrise/sunset for a city. Open-Meteo, no key.
  async function sunTimes(city) {
    try {
      const resp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
        `&daily=sunrise,sunset&forecast_days=1&timezone=auto`);
      if (!resp.ok) return null;
      const d = await resp.json();
      const rise = d?.daily?.sunrise?.[0], set = d?.daily?.sunset?.[0];
      if (!rise || !set) return null;
      return { rise: rise.slice(11, 16), set: set.slice(11, 16) };
    } catch (e) {
      return null;
    }
  }

  const SUN_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>`;
  const MOON_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" stroke-width="1.6" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>`;

  async function renderSunRow(el, city) {
    if (!el || !city) return;
    const t = await sunTimes(city);
    if (!t) {
      el.innerHTML = `<span class="sun-label">First and last light unavailable</span>`;
      return;
    }
    el.innerHTML =
      `<span class="sun-item">${SUN_ICON}<span class="sun-label">First light</span><span class="sun-time">${esc(t.rise)}</span></span>` +
      `<span class="sun-item">${MOON_ICON}<span class="sun-label">Last light</span><span class="sun-time">${esc(t.set)}</span></span>`;
  }

  // ---------- CITY PAGE MOUNT ----------
  async function mountCityPage() {
    const m = window.location.pathname.match(/\/cities\/([a-z0-9-]+)\.html$/i);
    if (!m) return;
    const slug = m[1];
    const city = cityBy(slug);
    if (!city) return;
    const main = document.querySelector('main');
    if (!main) return;

    const host = document.createElement('section');
    host.className = 'glass-card';
    host.innerHTML =
      `<div class="sun-row" id="sun-row"><span class="sun-label">Reading the sky…</span></div>
       <div class="rival-block" id="rival-block">
         <div class="rival-head"><h2>Rival</h2><span class="rival-vs">head to head</span></div>
         <p class="rival-verdict">Pairing…</p>
       </div>`;
    const anchor = main.querySelector('.compare-section') || main.querySelector('.city-feed-section');
    if (anchor) main.insertBefore(host, anchor); else main.appendChild(host);

    renderSunRow(document.getElementById('sun-row'), city);

    // Rivals
    const rival = rivalFor(slug);
    const rb = document.getElementById('rival-block');
    if (!rival) { rb.innerHTML = ''; return; }
    const [mine, theirs] = await Promise.all([historyFor(slug, 7), historyFor(rival.slug, 7)]);
    const myBand = band(city.mood), theirBand = band(rival.mood);

    // "Up this week" = change across the stored series. With no stored
    // history we say so rather than inventing a winner.
    function weekDelta(series) {
      if (!series || series.length < 2) return null;
      return series[series.length - 1].value - series[0].value;
    }
    const dMine = weekDelta(mine), dTheirs = weekDelta(theirs);
    let verdict;
    if (dMine === null || dTheirs === null) {
      verdict = `Not enough stored history yet to call who is up this week.`;
    } else if (Math.abs(dMine - dTheirs) < 0.05) {
      verdict = `Level this week. Neither has pulled away.`;
    } else {
      const winner = dMine > dTheirs ? city : rival;
      const delta = Math.abs(dMine - dTheirs).toFixed(1);
      verdict = `${winner.name} is up this week, by ${delta} on the seven day change.`;
    }

    rb.innerHTML = `
      <div class="rival-head"><h2>Rival</h2><span class="rival-vs">head to head</span></div>
      <div class="rival-pair">
        <span class="rival-side" style="--rival-band:${myBand.color};">
          <span class="rival-city">${esc(city.name)}</span>
          <span class="rival-reading">${Number(city.mood).toFixed(1)}</span>
          ${sparklineSVG(mine, myBand.color)}
          <span class="sparkline-label">${mine ? '7 day history' : 'no stored history'}</span>
        </span>
        <span class="rival-vs">vs</span>
        <a class="rival-side" href="/cities/${esc(rival.slug)}.html" style="--rival-band:${theirBand.color}; text-decoration:none;">
          <span class="rival-city">${esc(rival.name)}</span>
          <span class="rival-reading">${Number(rival.mood).toFixed(1)}</span>
          ${sparklineSVG(theirs, theirBand.color)}
          <span class="sparkline-label">${theirs ? '7 day history' : 'no stored history'}</span>
        </a>
      </div>
      <p class="rival-verdict">${esc(verdict)}</p>`;
  }

  window.GlotempFeatures = {
    rivalFor, historyFor, sparklineSVG, sunTimes, renderSunRow, hash,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountCityPage);
  } else {
    mountCityPage();
  }
})();
