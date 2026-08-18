// Glotemp x Wikimedia: how much the world is looking at this city
// (Pageviews API, stored daily by wiki-attention) and whether something
// is happening there right now (edit-activity spikes, same source).
//
// Fetched client-side, read-only, straight from PostgREST -- the section
// stays hidden until real data actually loads. A failed or slow fetch
// (5s timeout) just leaves it hidden; there is no spinner to get stuck.
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

  async function loadCityAttention(citySlug) {
    const section = document.getElementById('city-attention-section');
    const panel = document.getElementById('city-attention-panel');
    if (!section || !panel || !citySlug) return;

    const [views, spikeRows] = await Promise.all([
      fetchJSON(
        `city_pageviews?city_slug=eq.${encodeURIComponent(citySlug)}` +
        `&select=date,views&order=date.desc&limit=14`,
      ),
      fetchJSON(
        `city_edit_activity?city_slug=eq.${encodeURIComponent(citySlug)}` +
        `&select=is_spike,revisions_1h,checked_at&order=checked_at.desc&limit=1`,
      ),
    ]);

    const hasViews = Array.isArray(views) && views.length >= 2;
    const spike = Array.isArray(spikeRows) && spikeRows[0] && spikeRows[0].is_spike ? spikeRows[0] : null;

    // Nothing real to show yet -- stay hidden rather than render an
    // empty box (the brief: 5s timeout, then the section does not
    // render, not a placeholder).
    if (!hasViews && !spike) return;

    const chronological = hasViews ? views.slice().reverse() : [];
    let movementHTML = '';
    if (hasViews) {
      const last7 = chronological.slice(-7);
      const prev7 = chronological.slice(-14, -7);
      const sum = (arr) => arr.reduce((s, r) => s + r.views, 0);
      const thisWeek = sum(last7);
      const series = last7.map((r) => ({ value: r.views }));
      const color = 'var(--brass)';
      const spark = window.GlotempFeatures ? GlotempFeatures.sparklineSVG(series, '#B08D57') : '';

      let deltaHTML = '';
      if (prev7.length === 7) {
        const lastWeek = sum(prev7);
        if (lastWeek > 0) {
          const pct = ((thisWeek - lastWeek) / lastWeek) * 100;
          const up = pct >= 0;
          deltaHTML = `<span class="attention-delta">${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}% vs previous week</span>`;
        }
      }

      movementHTML = `
        <div class="attention-pageviews">
          <p class="attention-figure">${thisWeek.toLocaleString()} <span class="attention-unit">views this week</span></p>
          ${spark ? `<span class="attention-spark">${spark}</span>` : ''}
          ${deltaHTML}
        </div>
        <p class="attention-source">Wikipedia pageviews, English edition &mdash; via Wikimedia's free Pageviews API.</p>
      `;
    }

    const spikeHTML = spike
      ? `<p class="attention-spike"><span class="attention-spike-dot" aria-hidden="true"></span>
           Something is happening here &mdash; ${spike.revisions_1h} Wikipedia edit${spike.revisions_1h === 1 ? '' : 's'} in the last hour, well above usual.</p>`
      : '';

    panel.innerHTML = `${spikeHTML}${movementHTML}`;
    section.style.display = '';
  }

  window.GlotempAttention = { loadCityAttention };
})();
