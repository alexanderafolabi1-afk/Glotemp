// Glotemp per-city check-in layer: composer, recent check-ins list, and
// the watch button + watcher count. Mounts itself on any city page (it
// derives the slug from /cities/<slug>.html) so all 151 pages get this
// from one shared file rather than 151 copies of the same markup.
(function () {
  const MODES = [
    { slug: 'eat', label: 'Eat', icon: '<path d="M5 3v8a2 2 0 002 2h0a2 2 0 002-2V3M7 13v8M17 3c-1.7 0-2.5 2-2.5 4.5S15.3 12 17 12v9"/>' },
    { slug: 'drink', label: 'Drink', icon: '<path d="M7 8h10l-1 11a2 2 0 01-2 2H10a2 2 0 01-2-2L7 8z"/><path d="M9 8V5a3 3 0 016 0v3"/>' },
    { slug: 'watch', label: 'Watch', icon: '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M10 9l5 3-5 3V9z"/>' },
    { slug: 'move', label: 'Move', icon: '<path d="M4 12h13M12 6l6 6-6 6"/>' },
    { slug: 'make', label: 'Make', icon: '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>' },
  ];
  // Rough word for each intensity value, so the slider reads as a feeling
  // ("Buzzing") rather than a bare number a visitor has to interpret.
  const INTENSITY_WORDS = ['', 'Quiet', 'Calm', 'Easy', 'Steady', 'Comfortable', 'Lively', 'Energetic', 'Buzzing', 'Intense', 'Packed'];
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

  function cityDisplayName() {
    const rec = (window.CITIES_DATA || []).find(c => c.slug === citySlug);
    return rec ? rec.name : 'this city';
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
  function composerHTML(cityName) {
    const name = cityName || 'this city';
    return `
      <div class="checkin-composer" id="checkin-composer">
        <p class="eyebrow">City reading</p>
        <h2 class="checkin-neon-title">How <span class="checkin-glow">${esc(name)}</span> feels right now</h2>
        <div class="checkin-insignia" aria-hidden="true">
          <span class="checkin-insignia-hand">&#128073;</span>
          <span class="checkin-insignia-label">Check in</span>
        </div>
        <div class="checkin-signedout" id="checkin-signedout">
          <p class="checkin-copy">Sign in to add a reading. Browsing stays anonymous.</p>
          <button class="btn-neon checkin-neon-btn" type="button" id="checkin-signin-btn">Sign in</button>
        </div>
        <form class="checkin-form" id="checkin-form" hidden>
          <div class="checkin-modes" role="group" aria-label="Mode">
            ${MODES.map((m, i) => `<button type="button" class="checkin-mode" data-mode="${m.slug}" aria-pressed="${i === 0 ? 'true' : 'false'}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${m.icon}</svg><span>${m.label}</span></button>`).join('')}
          </div>
          <label class="checkin-label" for="checkin-intensity">Intensity <span class="checkin-intensity-value" id="checkin-intensity-value">${INTENSITY_WORDS[5]} (5/10)</span></label>
          <input type="range" id="checkin-intensity" min="1" max="10" step="1" value="5" class="checkin-range">
          <label class="checkin-label" for="checkin-note">Note <span class="checkin-count" id="checkin-count">0/${NOTE_MAX}</span></label>
          <textarea id="checkin-note" class="checkin-note" rows="2" maxlength="${NOTE_MAX}" placeholder="A short note - what does it feel like?"></textarea>
          <p class="checkin-preview-label">This is what will post</p>
          <div class="checkin-preview" id="checkin-preview">
            <div class="checkin-item-head">
              <span class="checkin-item-name">You</span>
              <span class="checkin-item-mode" id="checkin-preview-mode">Eat</span>
              <span class="checkin-item-intensity" id="checkin-preview-intensity">5/10</span>
            </div>
            <p class="checkin-item-note" id="checkin-preview-note" hidden></p>
          </div>
          <div class="checkin-actions">
            <button type="submit" class="btn-neon checkin-neon-btn" id="checkin-submit">Add reading</button>
            <span class="checkin-status" id="checkin-status" role="status" aria-live="polite"></span>
          </div>
        </form>
      </div>
      <div class="checkin-list-wrap">
        <h3 class="checkin-heading">Recent readings</h3>
        <div class="checkin-list" id="checkin-list"><p class="checkin-empty">Loading…</p></div>
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

    const previewMode = document.getElementById('checkin-preview-mode');
    const previewIntensity = document.getElementById('checkin-preview-intensity');
    const previewNote = document.getElementById('checkin-preview-note');

    function updatePreviewNote() {
      if (!previewNote || !note) return;
      const val = note.value.trim();
      previewNote.textContent = val;
      previewNote.hidden = !val;
    }

    if (range && rangeVal) {
      range.addEventListener('input', () => {
        rangeVal.textContent = `${INTENSITY_WORDS[Number(range.value)]} (${range.value}/10)`;
        if (previewIntensity) previewIntensity.textContent = `${range.value}/10`;
      });
    }
    if (note && count) {
      note.addEventListener('input', () => {
        count.textContent = `${note.value.length}/${NOTE_MAX}`;
        updatePreviewNote();
      });
    }

    document.querySelectorAll('.checkin-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.checkin-mode').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        selectedMode = btn.getAttribute('data-mode');
        if (previewMode) previewMode.textContent = btn.querySelector('span').textContent;
      });
    });

    if (signInBtn) {
      signInBtn.addEventListener('click', async () => {
        const ok = await GlotempAuth.requireAuth('Sign in to add a reading for this city.');
        if (ok) refreshAuthState();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ok = await GlotempAuth.requireAuth('Sign in to add a reading for this city.');
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
          updatePreviewNote();
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
        list.innerHTML = html;
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

    async function refreshLabel() {
      const watching = await isWatching();
      fresh.textContent = watching ? 'Following this city ✓' : 'Follow this city';
      return watching;
    }
    refreshLabel();

    fresh.addEventListener('click', async () => {
      const ok = await GlotempAuth.requireAuth('Sign in to follow this city.');
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
      } catch (e) { /* surfaced by the label refresh below */ }
      await refreshLabel();
      fresh.disabled = false;
    });
  }

  // ---------- mount ----------
  function mount() {
    citySlug = detectCitySlug();
    if (!citySlug) return;
    const cityName = cityDisplayName();

    // Replace the generated static "Live observations" body with the live
    // composer + list. Falls back to appending a section if that anchor
    // is missing so a re-themed page still gets the feature.
    let host = document.getElementById('city-observation-feed');
    if (host) {
      const section = host.closest('section') || host;
      // The static seed-data render hides this section with display:none
      // when a city has zero seed check-ins (e.g. a newly added city). The
      // live composer replaces that content entirely, so it must also
      // undo that hide -- otherwise a brand-new city's check-in form is
      // invisible even though it works.
      section.style.display = '';
      // The composer now carries its own "How {City} feels right now"
      // heading -- the static one this section shipped with would just
      // duplicate it right above.
      const heading = section.querySelector('h2');
      if (heading) heading.remove();
      const desc = section.querySelector('.vertical-description');
      if (desc) desc.remove();
      host.innerHTML = composerHTML(cityName);
    } else {
      const main = document.querySelector('main') || document.body;
      const section = document.createElement('section');
      section.className = 'glass-card city-feed-section checkin-hero-section';
      section.innerHTML = `<div id="city-observation-feed">${composerHTML(cityName)}</div>`;
      main.appendChild(section);
    }

    wireComposer();
    refreshAuthState();
    wireWatch();
    loadCheckins();

    const moreBtn = document.getElementById('checkin-more');
    if (moreBtn) moreBtn.addEventListener('click', () => loadCheckins());

    document.addEventListener('glotemp:auth-changed', () => {
      refreshAuthState();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
