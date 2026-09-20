// Event Overlay: a temporary, high-signal banner for a city during a live
// event window (festival, conference, championship), sold as an exclusive
// activation package. Reuses `partners` (renamed from `advertisers` in
// 20260812010000_rename_to_partners.sql) -- the same city_slug / start_date
// / end_date / active shape already used for sponsor credit rows -- rather
// than a new table. Rows are discriminated with format='event' (a free
// column, no CHECK constraint) and vertical left null, so they never match
// glotemp-credits.js's exact (city_slug, vertical) query and don't render
// as a per-vertical sponsor-logo credit chip.
//
// HONESTY, checked before writing this file:
//   - ticketmaster-entertainment has never stored an event name or date --
//     only a country-level aggregate score -- and every row it holds today
//     is synthetic fallback data (confidence pinned at 0.5, its
//     exception-path constant).
//   - transitland-transport has never executed even once (zero rows,
//     ever): its pg_cron schedule depends on a Vault secret
//     (glotemp_service_role_key) that was never created, confirmed via
//     `select count(*) from vault.decrypted_secrets ...` returning 0. Two
//     of its three metrics are hardcoded Math.random() regardless.
// Neither pipeline has a real signal to show right now, so there is no
// transit-pressure read and no "calmer areas" note here -- cut, not
// softened, per the same rule tonight.js already follows for anything it
// can't back with a live source.
//
// What IS shown -- event name, dates, optional tagline -- is exactly what
// sits in the row, supplied as part of the sold package. That's not a
// live measurement and not a model; it's said so plainly, never dressed
// up as either.
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  // Static, time-boxed city activations (no Supabase row required).
  // Each entry is shown only on its city page and only while now <= ends_at.
  const STATIC_EVENTS = [
    {
      citySlug: 'milton-keynes',
      name: 'Fashion Weekend AW26',
      tagline: 'Over 40 brands on the catwalk, exclusive fashion & beauty pop-ups, style talks and masterclasses. Free entry — no tickets needed. Middleton Hall · centre:mk · 11am–5pm.',
      url: 'https://www.centremk.com/whats-on/events/fashion-weekend-aw26/',
      start_date: '2026-10-03',
      end_date: '2026-10-04',
      ends_at: '2026-10-04T23:59:59+01:00',
    },
  ];

  function activeStaticEvent(citySlug) {
    const now = Date.now();
    for (const ev of STATIC_EVENTS) {
      if (ev.citySlug !== citySlug) continue;
      try {
        if (now > new Date(ev.ends_at).getTime()) continue;
      } catch (e) { continue; }
      return ev;
    }
    return null;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function detectCitySlug() {
    let m = window.location.pathname.match(/\/cities\/([a-z0-9-]+)\.html$/i);
    if (m) return m[1];
    m = window.location.pathname.match(/\/cities\/([a-z0-9-]+)\/?$/i);
    return m ? m[1] : null;
  }

  // "Aug 20 - Aug 24, 2026" -- UTC-anchored since start_date/end_date are
  // plain dates with no timezone of their own, and the window is the same
  // calendar dates everywhere regardless of the visitor's local clock.
  function formatWindow(startISO, endISO) {
    try {
      const start = new Date(startISO + 'T00:00:00Z');
      const end = new Date(endISO + 'T00:00:00Z');
      const dayOpts = { month: 'short', day: 'numeric', timeZone: 'UTC' };
      const startStr = new Intl.DateTimeFormat('en-US', dayOpts).format(start);
      const endStr = new Intl.DateTimeFormat('en-US', { ...dayOpts, year: 'numeric' }).format(end);
      return `${startStr} to ${endStr}`;
    } catch (e) {
      return `${startISO} to ${endISO}`;
    }
  }

  async function fetchActiveEvent(citySlug) {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/partners?city_slug=eq.${encodeURIComponent(citySlug)}` +
        `&format=eq.event&select=name,tagline,url,start_date,end_date`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } }
      );
      if (!resp.ok) return null;
      const rows = await resp.json();
      return Array.isArray(rows) && rows.length ? rows[0] : null;
    } catch (e) {
      return null;
    }
  }

  function renderOverlay(row) {
    const section = document.createElement('section');
    section.id = 'event-overlay';
    section.className = 'event-overlay glass-card';
    section.innerHTML = `
      <p class="event-overlay-eyebrow live-mark">Live event window</p>
      <h2 class="event-overlay-name">${esc(row.name)}</h2>
      <p class="event-overlay-dates">${esc(formatWindow(row.start_date, row.end_date))}</p>
      ${row.tagline ? `<p class="event-overlay-tagline">${esc(row.tagline)}</p>` : ''}
      ${row.url ? `<a class="event-overlay-link" href="${esc(row.url)}" target="_blank" rel="noopener">Event details</a>` : ''}
      <p class="event-overlay-prov">Event window supplied as part of this city's activation listing, not a live measurement.</p>
    `;
    return section;
  }

  // No row: render nothing and touch nothing. Every existing page must
  // look exactly as it does today when this condition is false.
  async function mount() {
    const slug = detectCitySlug();
    if (!slug) return;
    const main = document.querySelector('main');
    if (!main) return;
    if (document.getElementById('event-overlay')) return;

    const staticEv = activeStaticEvent(slug);
    const row = staticEv || await fetchActiveEvent(slug);
    if (!row) return;

    const section = renderOverlay(row);
    const header = main.querySelector('.city-header');
    if (header) header.insertAdjacentElement('beforebegin', section);
    else main.insertBefore(section, main.firstChild);
  }

  window.GlotempEventOverlay = { mount, fetchActiveEvent, formatWindow, detectCitySlug };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
