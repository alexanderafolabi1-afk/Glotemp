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
// Static activations (STATIC_EVENTS) are pure adverts: white card, no
// measurement disclaimer, auto-expire via ends_at.
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  // Static, time-boxed city activations (no Supabase row required).
  // Each entry is shown only on its city page and only while now <= ends_at.
  // These render as adverts (white card, no disclaimer).
  const STATIC_EVENTS = [
    {
      citySlug: 'milton-keynes',
      name: 'Fashion Weekend AW26',
      tagline: 'Over 40 brands on the catwalk, exclusive fashion & beauty pop-ups, style talks and masterclasses. Free entry — no tickets needed. Middleton Hall · centre:mk · 11am–5pm.',
      url: 'https://www.centremk.com/whats-on/events/fashion-weekend-aw26/',
      start_date: '2026-10-03',
      end_date: '2026-10-04',
      ends_at: '2026-10-04T23:59:59+01:00',
      isAd: true,
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

  function formatWindow(startISO, endISO) {
    try {
      const start = new Date(startISO + 'T00:00:00Z');
      const end = new Date(endISO + 'T00:00:00Z');
      const dayOpts = { month: 'short', day: 'numeric', timeZone: 'UTC' };
      const startStr = new Intl.DateTimeFormat('en-US', dayOpts).format(start);
      const endStr = new Intl.DateTimeFormat('en-US', { ...dayOpts, year: 'numeric' }).format(end);
      return startStr + ' to ' + endStr;
    } catch (e) {
      return startISO + ' to ' + endISO;
    }
  }

  async function fetchActiveEvent(citySlug) {
    try {
      const resp = await fetch(
        SUPABASE_URL + '/rest/v1/partners?city_slug=eq.' + encodeURIComponent(citySlug) +
        '&format=eq.event&select=name,tagline,url,start_date,end_date',
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, Accept: 'application/json' } }
      );
      if (!resp.ok) return null;
      const rows = await resp.json();
      return Array.isArray(rows) && rows.length ? rows[0] : null;
    } catch (e) {
      return null;
    }
  }

  function ensureAdStyles() {
    if (document.getElementById('event-overlay-ad-styles')) return;
    var style = document.createElement('style');
    style.id = 'event-overlay-ad-styles';
    style.textContent = [
      '.event-overlay--ad{',
      '  background:#FFFFFF !important;',
      '  background-image:none !important;',
      '  border:1px solid rgba(0,0,0,0.08);',
      '  border-left:3px solid #B08D57;',
      '  border-radius:var(--radius,24px);',
      '  padding:1.35rem 1.5rem 1.5rem;',
      '  box-shadow:0 8px 32px rgba(0,0,0,0.18);',
      '  backdrop-filter:none;',
      '  -webkit-backdrop-filter:none;',
      '}',
      '.event-overlay--ad .event-overlay-eyebrow{',
      '  color:#B08D57;',
      '  margin-bottom:0.45rem;',
      '}',
      '.event-overlay--ad .event-overlay-name{',
      '  color:#1a1510;',
      '  font-weight:500;',
      '}',
      '.event-overlay--ad .event-overlay-dates{',
      '  color:#5c5348;',
      '}',
      '.event-overlay--ad .event-overlay-tagline{',
      '  color:#3d3830;',
      '  max-width:56ch;',
      '}',
      '.event-overlay--ad .event-overlay-link{',
      '  color:#1a1510;',
      '  border-bottom-color:rgba(176,141,87,0.55);',
      '  font-weight:500;',
      '}',
      '.event-overlay--ad .event-overlay-link:hover{',
      '  border-bottom-color:#B08D57;',
      '  color:#B08D57;',
      '}',
    ].join('');
    document.head.appendChild(style);
  }

  function renderOverlay(row, isAd) {
    const section = document.createElement('section');
    section.id = 'event-overlay';
    section.className = isAd ? 'event-overlay event-overlay--ad' : 'event-overlay glass-card';
    if (isAd) ensureAdStyles();

    var eyebrow = isAd ? 'Featured event' : 'Live event window';
    var linkLabel = isAd ? 'Find out more' : 'Event details';
    var prov = isAd
      ? ''
      : '<p class="event-overlay-prov">Event window supplied as part of this city\'s activation listing, not a live measurement.</p>';

    section.innerHTML =
      '<p class="event-overlay-eyebrow live-mark">' + esc(eyebrow) + '</p>' +
      '<h2 class="event-overlay-name">' + esc(row.name) + '</h2>' +
      '<p class="event-overlay-dates">' + esc(formatWindow(row.start_date, row.end_date)) + '</p>' +
      (row.tagline ? '<p class="event-overlay-tagline">' + esc(row.tagline) + '</p>' : '') +
      (row.url
        ? '<a class="event-overlay-link" href="' + esc(row.url) + '" target="_blank" rel="noopener">' + esc(linkLabel) + '</a>'
        : '') +
      prov;
    return section;
  }

  async function mount() {
    const slug = detectCitySlug();
    if (!slug) return;
    const main = document.querySelector('main');
    if (!main) return;
    if (document.getElementById('event-overlay')) return;

    const staticEv = activeStaticEvent(slug);
    const row = staticEv || await fetchActiveEvent(slug);
    if (!row) return;

    const isAd = !!(staticEv && staticEv.isAd);
    const section = renderOverlay(row, isAd);
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
