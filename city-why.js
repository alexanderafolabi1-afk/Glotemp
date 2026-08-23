// Glotemp Why: a one-line explanation built ONLY from real numbers this
// site already stored about this city -- never a guess, never invented
// copy. Reads city_signal_snapshots (see
// supabase/functions/city-signal-snapshot and its migration for what
// gets stored and why) and compares the latest snapshot against the
// oldest one available in the last 8 days.
//
// If fewer than two real snapshot days exist for this city yet, the line
// renders nothing -- there is no honest delta to report, so it says
// nothing rather than describing a single instant as if it were a trend.
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

  function fmt1(n) {
    return Math.round(n * 10) / 10;
  }

  function daysBetween(a, b) {
    const ms = new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`);
    return Math.round(ms / 86400000);
  }

  async function loadCityWhy(citySlug) {
    const el = document.getElementById('why-line');
    if (!el || !citySlug) return;

    const rows = await fetchJSON(
      `city_signal_snapshots?city_slug=eq.${encodeURIComponent(citySlug)}` +
      `&select=snapshot_date,observation_count,avg_intensity&order=snapshot_date.desc&limit=8`,
    );

    // Fewer than two real days of history: nothing honest to say yet.
    if (!Array.isArray(rows) || rows.length < 2) return;

    const latest = rows[0];
    const compare = rows[rows.length - 1];
    const days = daysBetween(compare.snapshot_date, latest.snapshot_date);
    if (days < 1) return;

    const parts = [];

    const commentDelta = latest.observation_count - compare.observation_count;
    if (commentDelta > 0) {
      parts.push(`${commentDelta} more reading${commentDelta === 1 ? '' : 's'}`);
    } else if (compare.observation_count > 0) {
      parts.push('no new readings');
    }

    if (typeof latest.avg_intensity === 'number' && typeof compare.avg_intensity === 'number') {
      const from = fmt1(compare.avg_intensity);
      const to = fmt1(latest.avg_intensity);
      parts.push(from === to ? `intensity holding at ${to}` : `intensity moved from ${from} to ${to}`);
    }

    // Both computable deltas turned out to have nothing real to report
    // (e.g. avg_intensity absent on both ends and no new readings) --
    // stay silent rather than render an empty "Why:" line.
    if (!parts.length) return;

    const dayLabel = days === 1 ? 'yesterday' : `the last ${days} days`;
    el.innerHTML = `<span class="why-eyebrow">Why</span> ${esc(parts.join(', '))} over ${esc(dayLabel)}.`;
    el.hidden = false;
  }

  window.GlotempWhy = { loadCityWhy };
})();
