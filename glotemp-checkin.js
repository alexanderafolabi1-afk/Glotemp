// Glotemp per-city check-in layer: composer, recent check-ins list, and
// the watch button + watcher count. Mounts itself on any city page (it
// derives the slug from /cities/<slug>.html) so all 150 pages get this
// from one shared file rather than 150 copies of the same markup.
(function () {
  const MODES = [
    { slug: 'eat', label: 'Eat' },
    { slug: 'drink', label: 'Drink' },
    { slug: 'watch', label: 'Watch' },
    { slug: 'move', label: 'Move' },
    { slug: 'make', label: 'Make' },
  ];
  const PAGE_SIZE = 20;
  const NOTE_MAX = 200;

  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  let citySlug = null;
  let offset = 0;
  let selectedMode = 'eat';

  function detectCitySlug() {
    const m = window.location.pathname.match(/\/cities\/([a-z0-9-]+)\.html$/i);
    return m ? m[1] : null;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function timeAgo(iso) {
    if (window.GlotempCore && GlotempCore.getTimeAgo) return GlotempCore.getTimeAgo(new Date(iso));
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  function authHeaders(session) {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session ? session.access_token : SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  // ---------- composer ----------
  function composerHTML() {
    return `
      <div class="checkin-composer" id="checkin-composer">
        <p class="eyebrow">Check in</p>
        <h3 class="checkin-heading">What are you doing here right now?</h3>
        <div class="checkin-signedout" id="checkin-signedout">
          <p class="checkin-copy">Sign in to add your check-in. Browsing stays anonymous.</p>
          <button class="btn-neon" type="button" id="checkin-signin-btn">Sign in to check in</button>
        </div>
        <form class="checkin-form" id="checkin-form" hidden>
          <div class="checkin-modes" role="group" aria-label="Check-in mode">
            ${MODES.map((m, i) => `<button type="button" class="checkin-mode" data-mode="${m.slug}" aria-pressed="${i === 0 ? 'true' : 'false'}">${m.label}</button>`).join('')}
          </div>
          <label class="checkin-label" for="checkin-intensity">Intensity <span class="checkin-intensity-value" id="checkin-intensity-value">5</span><span class="checkin-intensity-max">/10</span></label>
          <input type="range" id="checkin-intensity" min="1" max="10" step="1" value="5" class="checkin-range">
          <label class="checkin-label" for="checkin-note">Note <span class="checkin-count" id="checkin-count">0/${NOTE_MAX}</span></label>
          <textarea id="checkin-note" class="checkin-note" rows="2" maxlength="${NOTE_MAX}" placeholder="A short note — what does it feel like?"></textarea>
          <div class="checkin-actions">
            <button type="submit" class="btn-neon" id="checkin-submit">Post check-in</button>
            <span class="checkin-status" id="checkin-status" role="status" aria-live="polite"></span>
          </div>
        </form>
      </div>
      <div class="checkin-list-wrap">
        <h3 class="checkin-heading">Recent check-ins</h3>
        <div class="checkin-list" id="checkin-list"><p class="checkin-empty">Loading check-ins…</p></div>
        <div class="checkin-more-row"><button class="pagination-btn" type="button" id="checkin-more" hidden>Load more</button></div>
      </div>`;
  }

  function wireComposer() {
    const form = document.getElementById('checkin-form');
    const signedOut = document.getElementById('checkin-signedout');
    const signInBtn = document.getElementById('checkin-signin-btn');
    const range = document.getElementById('checkin-intensity');
    const rangeVal = document.getElementById('checkin-intensity-value');
    const note = document.getElementById('checkin-note');
    const count = document.getElementById('checkin-count');
    const status = document.getElementById('checkin-status');

    if (range && rangeVal) {
      range.addEventListener('input', () => { rangeVal.textContent = range.value; });
    }
    if (note && count) {
      note.addEventListener('input', () => { count.textContent = `${note.value.length}/${NOTE_MAX}`; });
    }

    document.querySelectorAll('.checkin-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.checkin-mode').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        selectedMode = btn.getAttribute('data-mode');
      });
    });

    if (signInBtn) {
      signInBtn.addEventListener('click', async () => {
        const ok = await GlotempAuth.requireAuth('Sign in to post a check-in for this city.');
        if (ok) refreshAuthState();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ok = await GlotempAuth.requireAuth('Sign in to post a check-in for this city.');
        if (!ok) return;
        refreshAuthState();
        const session = await GlotempAuth.getSession();
        const user = GlotempAuth.getUser();
        if (!session || !user) return;
        const submitBtn = document.getElementById('checkin-submit');
        submitBtn.disabled = true;
        status.textContent = 'Posting…';
        try {
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/observations`, {
            method: 'POST',
            headers: Object.assign(authHeaders(session), { Prefer: 'return=minimal' }),
            body: JSON.stringify({
              user_id: user.id,
              city_slug: citySlug,
              mode: selectedMode,
              intensity: Number(range.value),
              note: note.value.trim() || null,
            }),
          });
          if (!resp.ok) throw new Error('post failed ' + resp.status);
          status.textContent = 'Posted.';
          note.value = '';
          count.textContent = `0/${NOTE_MAX}`;
          offset = 0;
          await loadCheckins({ replace: true });
          setTimeout(() => { status.textContent = ''; }, 3000);
        } catch (err) {
          status.textContent = 'Could not post that. Try again shortly.';
        }
        submitBtn.disabled = false;
      });
    }
  }

  function refreshAuthState() {
    const form = document.getElementById('checkin-form');
    const signedOut = document.getElementById('checkin-signedout');
    if (!form || !signedOut) return;
    const signedIn = window.GlotempAuth && GlotempAuth.isSignedIn() && !!GlotempAuth.getCachedProfile();
    form.hidden = !signedIn;
    signedOut.hidden = signedIn;
  }

  // ---------- check-ins list ----------
  function checkinHTML(row) {
    const name = (row.profiles && row.profiles.display_name) ? row.profiles.display_name : 'Anonymous';
    const mode = MODES.find(m => m.slug === row.mode);
    return `
      <article class="checkin-item">
        <div class="checkin-item-head">
          <span class="checkin-item-name">${esc(name)}</span>
          <span class="checkin-item-mode">${esc(mode ? mode.label : row.mode)}</span>
          <span class="checkin-item-intensity">${Number(row.intensity)}/10</span>
        </div>
        ${row.note ? `<p class="checkin-item-note">${esc(row.note)}</p>` : ''}
        <time class="checkin-item-time" datetime="${esc(row.created_at)}">${esc(timeAgo(row.created_at))}</time>
      </article>`;
  }

  async function loadCheckins({ replace } = {}) {
    const list = document.getElementById('checkin-list');
    const moreBtn = document.getElementById('checkin-more');
    if (!list) return;
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/observations?city_slug=eq.${encodeURIComponent(citySlug)}` +
        `&select=id,mode,intensity,note,created_at,profiles(display_name)` +
        `&order=created_at.desc&offset=${offset}&limit=${PAGE_SIZE}`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } }
      );
      if (!resp.ok) throw new Error('fetch failed');
      const rows = await resp.json();
      const html = rows.map(checkinHTML).join('');
      if (replace || offset === 0) {
        list.innerHTML = html || '<p class="checkin-empty">No check-ins here yet. Be the first.</p>';
      } else {
        list.insertAdjacentHTML('beforeend', html);
      }
      offset += rows.length;
      if (moreBtn) moreBtn.hidden = rows.length < PAGE_SIZE;
    } catch (e) {
      if (offset === 0) list.innerHTML = '<p class="checkin-empty">Check-ins are unavailable right now.</p>';
      if (moreBtn) moreBtn.hidden = true;
    }
  }

  // ---------- watch ----------
  async function watcherCount() {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/city_watchers?city_slug=eq.${encodeURIComponent(citySlug)}&select=id`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json', Prefer: 'count=exact', Range: '0-0' } }
      );
      if (!resp.ok) return null;
      // The total only ever comes from content-range: this request asks
      // for Range 0-0, so the returned array length is capped at 1 and can
      // never stand in for the real count. Unknown is reported as null
      // rather than a number that would be wrong.
      const cr = resp.headers.get('content-range');
      if (cr && cr.indexOf('/') !== -1) {
        const total = parseInt(cr.split('/')[1], 10);
        if (!Number.isNaN(total)) return total;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async function isWatching() {
    const session = await GlotempAuth.getSession();
    const user = GlotempAuth.getUser();
    if (!session || !user) return false;
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/city_watchers?city_slug=eq.${encodeURIComponent(citySlug)}&user_id=eq.${user.id}&select=id`,
        { headers: authHeaders(session) }
      );
      if (!resp.ok) return false;
      const rows = await resp.json();
      return Array.isArray(rows) && rows.length > 0;
    } catch (e) {
      return false;
    }
  }

  async function renderWatchCount() {
    const el = document.getElementById('watch-count');
    if (!el) return;
    const n = await watcherCount();
    el.textContent = n === null ? 'Watchers unavailable' : `${n} ${n === 1 ? 'person is' : 'people are'} watching`;
  }

  function wireWatch() {
    const btn = document.getElementById('watch-city-btn');
    if (!btn) return;

    // The generated pages ship an email-capture panel behind this button.
    // Watching is an authenticated, row-backed action now, so retire that
    // panel rather than leave two competing "watch" mechanisms on screen.
    const oldPanel = document.getElementById('watch-email-panel');
    if (oldPanel) oldPanel.remove();

    // Replace the node to drop the generated page's own click handler,
    // which still toggles a localStorage-only watch state.
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);

    // Reserved-height count line, inserted once, so filling it in after
    // the async count resolves doesn't shift the page.
    if (!document.getElementById('watch-count')) {
      const count = document.createElement('p');
      count.id = 'watch-count';
      count.className = 'watch-count';
      count.textContent = ' ';
      // After the whole .city-action-row, not next to the button: that
      // row is a flex line, so a sibling of the button would render
      // between "Watch this city" and "Share" instead of on its own line.
      const actionRow = fresh.closest('.city-action-row');
      if (actionRow && actionRow.parentNode) {
        actionRow.parentNode.insertBefore(count, actionRow.nextSibling);
      } else {
        fresh.parentNode.insertBefore(count, fresh.nextSibling);
      }
    }

    async function refreshLabel() {
      const watching = await isWatching();
      fresh.textContent = watching ? 'Watching this city ✓' : 'Watch this city';
      return watching;
    }
    refreshLabel();

    fresh.addEventListener('click', async () => {
      const ok = await GlotempAuth.requireAuth('Sign in to watch this city and follow its readings.');
      if (!ok) return;
      const session = await GlotempAuth.getSession();
      const user = GlotempAuth.getUser();
      if (!session || !user) return;
      fresh.disabled = true;
      const watching = await isWatching();
      try {
        if (watching) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/city_watchers?city_slug=eq.${encodeURIComponent(citySlug)}&user_id=eq.${user.id}`,
            { method: 'DELETE', headers: authHeaders(session) }
          );
        } else {
          await fetch(`${SUPABASE_URL}/rest/v1/city_watchers`, {
            method: 'POST',
            headers: Object.assign(authHeaders(session), { Prefer: 'resolution=ignore-duplicates,return=minimal' }),
            body: JSON.stringify({ user_id: user.id, city_slug: citySlug }),
          });
        }
      } catch (e) { /* surfaced by the label/count refresh below */ }
      await refreshLabel();
      await renderWatchCount();
      fresh.disabled = false;
    });
  }

  // ---------- mount ----------
  function mount() {
    citySlug = detectCitySlug();
    if (!citySlug) return;

    // Replace the generated static "Live observations" body with the live
    // composer + list. Falls back to appending a section if that anchor
    // is missing so a re-themed page still gets the feature.
    let host = document.getElementById('city-observation-feed');
    if (host) {
      const section = host.closest('section') || host;
      const heading = section.querySelector('h2');
      if (heading) heading.textContent = 'Human check-ins';
      const desc = section.querySelector('.vertical-description');
      if (desc) desc.textContent = 'Live check-ins from people in this city right now.';
      host.innerHTML = composerHTML();
    } else {
      const main = document.querySelector('main') || document.body;
      const section = document.createElement('section');
      section.className = 'glass-card city-feed-section';
      section.innerHTML = `<h2>Human check-ins</h2><div id="city-observation-feed">${composerHTML()}</div>`;
      main.appendChild(section);
    }

    wireComposer();
    refreshAuthState();
    wireWatch();
    renderWatchCount();
    loadCheckins();

    const moreBtn = document.getElementById('checkin-more');
    if (moreBtn) moreBtn.addEventListener('click', () => loadCheckins());

    document.addEventListener('glotemp:auth-changed', () => {
      refreshAuthState();
      renderWatchCount();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
