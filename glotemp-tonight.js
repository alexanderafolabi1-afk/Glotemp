// Glotemp Tonight -- client for the thirteenth layer.
//
// Renders the five modes for a city: headline reading, a 24-hour curve
// drawn as SVG from stored data, and a "now" marker positioned by the
// city's real local hour. Everything here is CSS/SVG driven by live
// data; no images, nothing written to /assets/.
//
// Two rules this file exists to enforce:
//   1. A mode with no published row gets a designed empty state. Never a
//      spinner, never a placeholder number.
//   2. Any row flagged `modelled` is labelled as modelled in the UI, and
//      airport figures are always worded "scheduled seat capacity".
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  const MODES = [
    { slug: 'eat', label: 'Eat', blurb: 'Kitchens, counters and tables.' },
    { slug: 'drink', label: 'Drink', blurb: 'Bars, pubs and late rooms.' },
    { slug: 'watch', label: 'Watch', blurb: 'Cinema, theatre, gigs, matches, museums.' },
    { slug: 'move', label: 'Move', blurb: 'Kayaking, hiking, climbing, swimming, cycling, running.' },
    { slug: 'make', label: 'Make', blurb: 'Workshops, classes and maker spaces.' },
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function localHour(timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, hour12: false, hour: 'numeric', minute: 'numeric',
      }).formatToParts(new Date());
      const h = Number(parts.find(p => p.type === 'hour').value) % 24;
      const m = Number(parts.find(p => p.type === 'minute').value);
      return h + m / 60;
    } catch (e) {
      return new Date().getHours();
    }
  }

  function localDayName(timezone) {
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(new Date());
    } catch (e) {
      return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    }
  }

  // 24-point curve as an SVG area + line, with a vertical "now" rule.
  // viewBox is fixed so the element's box never depends on the data --
  // that is what keeps this at zero layout shift when it fills in.
  function curveSVG(curve, hourNow, color) {
    const W = 240, H = 56, pad = 2;
    const max = Math.max(1, ...curve);
    const pts = curve.map((v, i) => {
      const x = pad + (i / 23) * (W - pad * 2);
      const y = H - pad - (v / max) * (H - pad * 2);
      return [x, y];
    });
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${(W - pad).toFixed(1)},${H - pad} L${pad},${H - pad} Z`;
    const nowX = pad + (Math.max(0, Math.min(23.99, hourNow)) / 23) * (W - pad * 2);
    const idx = Math.round(Math.max(0, Math.min(23, hourNow)));
    const nowY = H - pad - (curve[idx] / max) * (H - pad * 2);
    return `<svg class="tonight-curve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
      aria-label="Hour by hour curve; now is ${Math.floor(hourNow)}:00 local">
      <path d="${area}" fill="${color}" opacity="0.16"></path>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"></path>
      <line x1="${nowX.toFixed(1)}" y1="${pad}" x2="${nowX.toFixed(1)}" y2="${H - pad}"
        stroke="var(--brass)" stroke-width="1" stroke-dasharray="2 2"></line>
      <circle cx="${nowX.toFixed(1)}" cy="${nowY.toFixed(1)}" r="2.6" fill="var(--brass)"></circle>
    </svg>`;
  }

  function modeCardHTML(mode, row, timezone) {
    if (!row) {
      // Designed empty state. No spinner, no invented number.
      return `<article class="tonight-mode tonight-mode--empty">
        <div class="tonight-mode-head">
          <h3 class="tonight-mode-name">${esc(mode.label)}</h3>
          <span class="tonight-mode-status">Not published</span>
        </div>
        <p class="tonight-mode-blurb">${esc(mode.blurb)}</p>
        <p class="tonight-empty-copy">No live source has reported ${esc(mode.label.toLowerCase())} for this city yet. Nothing is shown rather than something invented.</p>
      </article>`;
    }

    const band = window.GlotempCore ? GlotempCore.moodToBand(row.reading) : { band: 'equilibrium', color: 'var(--band-equilibrium)' };
    const hour = localHour(timezone);
    const curve = Array.isArray(row.curve) ? row.curve : new Array(24).fill(0);
    const idx = Math.round(Math.max(0, Math.min(23, hour)));
    const nowValue = curve[idx];

    const facts = [];
    if (row.venue_count != null) facts.push(`${row.venue_count.toLocaleString()} venues`);
    if (row.event_count != null) facts.push(`${row.event_count.toLocaleString()} listed events`);
    if (row.weather_viable != null) facts.push(row.weather_viable ? 'viable outdoors today' : 'poor outdoors today');
    // Wording is fixed: scheduled seat capacity, never arrivals, never passengers.
    if (row.seat_capacity != null) facts.push(`${row.seat_capacity.toLocaleString()} scheduled seat capacity`);

    const liveSources = (row.sources || []).filter(s => s.kind === 'live').map(s => s.name);

    return `<article class="tonight-mode" style="--tonight-band:${band.color};">
      <div class="tonight-mode-head">
        <h3 class="tonight-mode-name">${esc(mode.label)}</h3>
        <span class="tonight-mode-reading">${Number(row.reading).toFixed(1)}<span class="tonight-of">/10</span></span>
      </div>
      <p class="tonight-mode-blurb">${esc(mode.blurb)}</p>
      ${curveSVG(curve, hour, band.color)}
      <p class="tonight-now">Right now <strong>${Number(nowValue).toFixed(1)}</strong> · peaks ${peakLabel(curve)}</p>
      ${facts.length ? `<p class="tonight-facts">${facts.map(esc).join(' · ')}</p>` : ''}
      <p class="tonight-prov">${liveSources.length ? 'Live: ' + esc(liveSources.join(', ')) : 'No live source'}${row.modelled ? ' · <span class="tonight-modelled">modelled</span>' : ''}</p>
    </article>`;
  }

  function peakLabel(curve) {
    let best = 0, bestI = 0;
    curve.forEach((v, i) => { if (v > best) { best = v; bestI = i; } });
    const h = bestI % 12 === 0 ? 12 : bestI % 12;
    return `${h}${bestI < 12 ? 'am' : 'pm'}`;
  }

  async function fetchTonight(citySlug) {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/tonight_readings?city_slug=eq.${encodeURIComponent(citySlug)}` +
        `&select=mode,reading,curve,venue_count,event_count,seat_capacity,weather_viable,sources,modelled,computed_at`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } }
      );
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      return null;
    }
  }

  function detectCitySlug() {
    const m = window.location.pathname.match(/\/cities\/([a-z0-9-]+)\.html$/i);
    return m ? m[1] : null;
  }

  async function mountCityPage() {
    const slug = detectCitySlug();
    if (!slug) return;
    const nav = document.querySelector('.vertical-nav');
    const main = document.querySelector('main');
    if (!main) return;

    const city = (window.CITIES_DATA || []).find(c => c.slug === slug);
    const timezone = city ? city.timezone : 'UTC';

    // Add Tonight to the vertical nav as the thirteenth layer.
    if (nav && !nav.querySelector('[data-vertical="tonight"]')) {
      const a = document.createElement('a');
      a.href = '#tonight';
      a.className = 'vertical-link';
      a.setAttribute('data-vertical', 'tonight');
      a.textContent = 'Tonight';
      nav.insertBefore(a, nav.firstChild);
    }

    const section = document.createElement('section');
    section.id = 'tonight';
    section.className = 'vertical-section glass-card tonight-section';
    section.innerHTML = `
      <div class="tonight-head">
        <p class="eyebrow">The thirteenth layer</p>
        <h2>Tonight</h2>
        <p class="vertical-description">Five modes, each with its own reading and its own shape across the day. Local time in ${esc(city ? city.name : 'this city')} is <span id="tonight-clock">—</span>.</p>
      </div>
      <div class="tonight-grid" id="tonight-grid">
        ${MODES.map(m => `<article class="tonight-mode tonight-mode--loading"><div class="tonight-mode-head"><h3 class="tonight-mode-name">${esc(m.label)}</h3></div><p class="tonight-mode-blurb">${esc(m.blurb)}</p></article>`).join('')}
      </div>`;

    // Insert before the compare section if present, else append.
    const compare = main.querySelector('.compare-section');
    if (compare) main.insertBefore(section, compare); else main.appendChild(section);

    function tickClock() {
      const el = document.getElementById('tonight-clock');
      if (!el) return;
      try {
        el.textContent = new Intl.DateTimeFormat('en-GB', {
          timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(new Date());
      } catch (e) { el.textContent = '—'; }
    }
    tickClock();
    setInterval(tickClock, 30000);

    const rows = await fetchTonight(slug);
    const grid = document.getElementById('tonight-grid');
    if (!grid) return;
    const bySlug = new Map((rows || []).map(r => [r.mode, r]));
    grid.innerHTML = MODES.map(m => modeCardHTML(m, bySlug.get(m.slug), timezone)).join('');
  }

  // Shared fetch for the homepage spin dial: top rows across all cities.
  async function fetchTopTonight(limit) {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/tonight_readings?select=city_slug,mode,reading,curve,seat_capacity,modelled` +
        `&order=reading.desc&limit=${limit || 300}`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } }
      );
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      return null;
    }
  }

  window.GlotempTonight = { MODES, fetchTonight, fetchTopTonight, localHour, localDayName, curveSVG };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountCityPage);
  } else {
    mountCityPage();
  }
})();
