// Glotemp Campus: real universities near this city, from Wikidata (see
// supabase/functions/wikidata-universities and its migration for how
// and why). Fetched client-side, read-only, straight from PostgREST --
// same treatment as city-worldbank.js, into the same #education-context
// mount that file already uses, so the two real sources sit together
// under Education rather than competing for space.
//
// Every row this reads already has a real name and a real coordinate --
// the collector only ever writes rows it found both for (see its own
// comment on why there is no separate "name only" tier). If a city has
// no real universities in range, nothing renders here: no placeholder,
// no invented score.
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  const TIMEOUT_MS = 5000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  async function fetchJSON(path) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        signal: ctl.signal,
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' },
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function osmLink(lat, lon) {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
  }

  function universityHTML(u) {
    const hasCoord = typeof u.lat === 'number' && typeof u.lon === 'number';
    return `
      <p class="context-fact campus-fact">
        <strong>${esc(u.name)}</strong>
        ${u.website ? ` &middot; <a href="${esc(u.website)}" target="_blank" rel="noopener noreferrer">website</a>` : ''}
        ${hasCoord ? ` &middot; <a href="${esc(osmLink(u.lat, u.lon))}" target="_blank" rel="noopener noreferrer">map</a>` : ''}
      </p>`;
  }

  async function loadCampuses(citySlug) {
    const mount = document.getElementById('education-context');
    if (!mount || !citySlug) return;
    const rows = await fetchJSON(
      `city_universities?city_slug=eq.${encodeURIComponent(citySlug)}` +
      `&select=name,lat,lon,website&order=name.asc`,
    );
    if (!Array.isArray(rows) || rows.length === 0) return;

    mount.insertAdjacentHTML('beforeend', `
      <div class="context-block context-campus">
        <span class="context-tag">Real universities nearby &middot; Wikidata</span>
        ${rows.map(universityHTML).join('')}
      </div>
    `);
    if (window.GlotempCore) GlotempCore.reconcileVerticalOrder('education');
  }

  window.GlotempCampus = { loadCampuses };
})();
