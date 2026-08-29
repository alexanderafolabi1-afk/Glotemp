// Glotemp Creator Drops: real creator work attached to this city for a
// real time window (see creator_drops / creator_drop_submissions,
// Part 4). Read-only here -- rows only ever get created by staff after
// reviewing a real submission at /creators, never auto-published, never
// seeded. RLS on creator_drops already restricts what PostgREST returns
// to active=true rows currently inside their own starts_at/ends_at
// window, so this file never needs to re-check dates itself.
//
// Hidden entirely when this city has no live drop right now -- no
// placeholder, no "nothing here yet" card.
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  const TIMEOUT_MS = 6000;

  const TYPE_LABEL = {
    video: 'Video', audio: 'Audio', photo: 'Photo',
    writing: 'Writing', event: 'Real event', other: 'Drop',
  };

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

  function fmtDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function dropHTML(row) {
    const type = TYPE_LABEL[row.content_type] || 'Drop';
    const until = fmtDate(row.ends_at);
    return `
      <div class="drop-card">
        <span class="context-tag">${esc(type)} &middot; real, time-limited</span>
        <p class="drop-title"><a href="${esc(row.content_url)}" target="_blank" rel="noopener noreferrer">${esc(row.title)}</a></p>
        ${row.description ? `<p class="drop-desc">${esc(row.description)}</p>` : ''}
        <p class="drop-credit">By <a href="${esc(row.creator_url)}" target="_blank" rel="noopener noreferrer">${esc(row.creator_name)}</a>${until ? ` &middot; through ${esc(until)}` : ''}</p>
      </div>`;
  }

  async function loadDrops(citySlug) {
    const section = document.getElementById('city-drops-section');
    const mount = document.getElementById('city-drops-mount');
    if (!section || !mount || !citySlug) return;

    const rows = await fetchJSON(
      `creator_drops?city_slug=eq.${encodeURIComponent(citySlug)}&active=eq.true` +
      `&select=id,creator_name,creator_url,content_type,content_url,title,description,ends_at&order=starts_at.desc`,
    );
    if (!Array.isArray(rows) || rows.length === 0) return;

    mount.innerHTML = rows.map(dropHTML).join('');
    section.hidden = false;
  }

  window.GlotempDrops = { loadDrops };
})();
