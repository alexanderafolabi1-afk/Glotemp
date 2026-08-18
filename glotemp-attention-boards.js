// Global attention boards: Most Watched (real Wikipedia pageviews, RPC
// most_watched_cities) and Currently Spiking (real edit-activity, RPC
// spiking_cities). Both read pre-aggregated results server-side rather
// than pulling raw rows for 300 cities into the browser.
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  const TIMEOUT_MS = 5000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  async function callRPC(fn, args) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        signal: ctl.signal,
        headers: {
          apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json', Accept: 'application/json',
        },
        body: JSON.stringify(args || {}),
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function mountMostWatched() {
    const host = document.getElementById('most-watched-list');
    if (!host) return;
    const rows = await callRPC('most_watched_cities', { p_limit: 20 });
    if (!rows || !rows.length) {
      host.innerHTML = `<p class="empty-recruit"><strong>No city has a full week of pageview history stored yet.</strong><br>
        <span class="empty-cta">Check back once the attention collector has run.</span></p>`;
      return;
    }
    host.innerHTML = rows.map((r, i) => `
      <a class="mover-row" href="/cities/${esc(r.city_slug)}.html">
        <span class="mover-rank">${i + 1}</span>
        <span class="mover-city">${esc(r.name)}</span>
        <span class="mover-country">${esc(r.country)}</span>
        <span class="mover-delta">${Number(r.total_views).toLocaleString()} views</span>
      </a>`).join('');
  }

  async function mountSpiking() {
    const host = document.getElementById('spiking-list');
    if (!host) return;
    const rows = await callRPC('spiking_cities', { p_limit: 20 });
    if (!rows || !rows.length) {
      host.innerHTML = `<p class="empty-recruit"><strong>Nothing is spiking right now.</strong><br>
        <span class="empty-cta">Every city's Wikipedia edit rate is within its own normal range.</span></p>`;
      return;
    }
    host.innerHTML = rows.map((r, i) => `
      <a class="mover-row attn-spike-row" href="/cities/${esc(r.city_slug)}.html">
        <span class="mover-rank">${i + 1}</span>
        <span class="mover-city">${esc(r.name)}</span>
        <span class="mover-country">${esc(r.country)}</span>
        <span class="mover-delta">${r.revisions_1h} edits/hr<span class="attn-spike-detail">baseline ${Number(r.baseline_avg).toFixed(1)}</span></span>
      </a>`).join('');
  }

  function mount() {
    mountMostWatched();
    mountSpiking();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
