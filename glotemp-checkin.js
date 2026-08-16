// Glotemp per-city check-in + comment layer: examples panel, hanging
// "Check in" sign, five-mood composer, moderation, and the recent
// check-ins list. Mounts itself on any city page (it derives the slug
// from /cities/<slug>.html) so every city page gets this from one
// shared file rather than one copy per page.
(function () {
  // Five bands, same vocabulary as moodToBand() in app.js (charged / warm /
  // equilibrium-here-called-steady / restrained / low). Labels are written
  // in normal case on purpose -- .checkin-mood-label renders them with
  // font-variant-caps: small-caps, which only has an effect on mixed-case
  // source text; typing them pre-uppercased here would just print flat
  // capitals with no small-caps distinction.
  const MOODS = [
    { key: 'charged', label: 'Charged', glyph: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>' },
    { key: 'warm', label: 'Warm', glyph: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2.2M12 18.8V21M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M3 12h2.2M18.8 12H21M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>' },
    { key: 'steady', label: 'Steady', glyph: '<path d="M3 12h6M15 12h6"/><circle cx="12" cy="12" r="2.4"/>' },
    { key: 'restrained', label: 'Restrained', glyph: '<path d="M14.5 3.5a8.5 8.5 0 100 17 7 7 0 010-17z"/>' },
    { key: 'low', label: 'Low', glyph: '<path d="M12 4v9M8 10l4 3 4-3"/><path d="M4 18h16"/>' },
  ];
  const MOOD_BY_KEY = MOODS.reduce((acc, m) => { acc[m.key] = m; return acc; }, {});
  const DEFAULT_MOOD = 'steady';

  const EMOJI_CHOICES = ['😀', '😂', '❤️', '🔥', '👍', '😢', '🙏', '🎉', '😮', '🥳', '😡', '🤔', '👀', '🌍', '✨', '🍻'];

  // Static, hand-written -- never sent to Supabase, never rendered inside
  // #checkin-list, never touches the observations table. Purely a model
  // for what a useful check-in reads like, in four languages.
  const EXAMPLES = [
    { lang: 'English', mood: 'warm', text: 'Cafe terraces are full and everyone is out walking after dinner. Feels easy tonight.' },
    { lang: 'Yoruba', mood: 'charged', text: 'Ilu naa kun fun eniyan, orin n dun ni gbogbo igun, gbogbo eniyan n jo lode.' },
    { lang: 'French', mood: 'steady', text: "Rien de special a signaler, la ville tourne a son rythme habituel ce soir." },
    { lang: 'Japanese', mood: 'restrained', text: '雨が降っていて、通りは静かです。みんな家にいるみたい。' },
  ];

  // ---------- moderation ----------
  // Not exhaustive -- a real deployment would pair this with a managed
  // moderation API -- but every submit is checked against these before
  // anything reaches the observations table, and every block is logged.
  const SLURS = ['nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'chink', 'spic', 'kike', 'gook', 'tranny', 'coon', 'beaner', 'wetback', 'towelhead'];
  const PROFANITY = ['fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bullshit', 'bitch', 'asshole', 'cunt', 'bastard', 'dick', 'pussy', 'cock', 'wanker', 'slut', 'whore', 'douchebag'];
  const HARASSMENT_PHRASES = [
    'kill you', 'kill yourself', 'kys', 'i will find you', "i'll find you", 'i will hurt you', "i'll hurt you",
    'i will kill', 'going to kill', 'beat you up', 'i will beat you', 'you should die', 'go die', 'hope you die',
    'i know where you live', 'watch your back', "i'll kill", 'rape you',
  ];

  function containsWord(lowerText, word) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + escaped + '\\b', 'i').test(lowerText);
  }

  function moderateText(text) {
    const lower = text.toLowerCase();
    for (const p of HARASSMENT_PHRASES) {
      if (lower.indexOf(p) !== -1) {
        return { ok: false, reason: 'harassment_or_threats', message: "That can't be posted -- it reads as harassment or a threat. Please rewrite it." };
      }
    }
    for (const w of SLURS) {
      if (containsWord(lower, w)) {
        return { ok: false, reason: 'slurs', message: "That can't be posted -- it appears to contain a slur. Please rewrite it." };
      }
    }
    for (const w of PROFANITY) {
      if (containsWord(lower, w)) {
        return { ok: false, reason: 'profanity', message: "That can't be posted -- please remove the profanity and try again." };
      }
    }
    return { ok: true };
  }

  const PAGE_SIZE = 20;
  const NOTE_MAX = 280;

  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  let citySlug = null;
  let offset = 0;
  let selectedMood = DEFAULT_MOOD;
  let postAnonymously = false;

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

  function moodGlyphSVG(key, extraClass) {
    const m = MOOD_BY_KEY[key] || MOOD_BY_KEY[DEFAULT_MOOD];
    return `<svg class="checkin-mood-glyph${extraClass ? ' ' + extraClass : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${m.glyph}</svg>`;
  }

  // ---------- examples panel ----------
  function examplesHTML() {
    return `
      <div class="checkin-examples" aria-label="What a good check-in looks like">
        <p class="checkin-examples-eyebrow">What a good check-in looks like</p>
        <div class="checkin-examples-grid">
          ${EXAMPLES.map(ex => `
            <div class="checkin-example">
              <!-- The language alone. The section heading above already says
                   what these are, so labelling each one made the page read
                   as a tutorial rather than a product. -->
              <span class="checkin-example-tag">${esc(ex.lang)}</span>
              <div class="checkin-example-head">
                ${moodGlyphSVG(ex.mood, 'checkin-example-glyph')}
                <span class="checkin-example-mood">${esc(MOOD_BY_KEY[ex.mood].label)}</span>
              </div>
              <p class="checkin-example-text">${esc(ex.text)}</p>
            </div>`).join('')}
        </div>
      </div>`;
  }

  // ---------- insignia ----------
  function insigniaHTML() {
    return `
      <div class="checkin-insignia" aria-hidden="true">
        <div class="checkin-insignia-sign">
          <svg class="checkin-insignia-chain" viewBox="0 0 12 16" aria-hidden="true">
            <line x1="6" y1="0" x2="6" y2="10" stroke="currentColor" stroke-width="1.1"/>
            <circle cx="6" cy="3.4" r="1.9" fill="none" stroke="currentColor" stroke-width="1.1"/>
          </svg>
          <div class="checkin-insignia-panel">
            <span class="checkin-insignia-glow"></span>
            <span class="checkin-insignia-text">Check<br>in</span>
          </div>
          <svg class="checkin-insignia-arrow" viewBox="0 0 16 10" aria-hidden="true">
            <path d="M2 1l6 7 6-7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>`;
  }

  // ---------- composer ----------
  function composerHTML(cityName) {
    const name = cityName || 'this city';
    const moodButtons = MOODS.map(m => `
      <button type="button" class="checkin-mood-btn" data-mood="${m.key}" aria-pressed="${m.key === DEFAULT_MOOD ? 'true' : 'false'}">
        ${moodGlyphSVG(m.key)}
        <span class="checkin-mood-label">${esc(m.label)}</span>
      </button>`).join('');

    const emojiButtons = EMOJI_CHOICES.map(e => `<button type="button" class="checkin-emoji-btn" data-emoji="${e}">${e}</button>`).join('');

    return `
      ${examplesHTML()}
      <div class="checkin-composer" id="checkin-composer">
        <p class="eyebrow">City reading</p>
        <h2 class="checkin-neon-title">How <span class="checkin-glow">${esc(name)}</span> feels right now</h2>
        ${insigniaHTML()}
        <div class="checkin-signedout" id="checkin-signedout">
          <p class="checkin-copy">Sign in to add a check-in. Browsing stays anonymous.</p>
          <button class="btn-neon checkin-neon-btn" type="button" id="checkin-signin-btn">Sign in</button>
        </div>
        <form class="checkin-form" id="checkin-form" hidden>
          <div class="checkin-moods" role="group" aria-label="Mood">
            ${moodButtons}
          </div>
          <label class="checkin-label" for="checkin-note">Comment <span class="checkin-count" id="checkin-count">0/${NOTE_MAX}</span></label>
          <textarea id="checkin-note" class="checkin-note" rows="3" maxlength="${NOTE_MAX}" placeholder="What does it feel like right now?"></textarea>
          <button type="button" class="checkin-emoji-toggle" id="checkin-emoji-toggle" aria-expanded="false">&#128522; Add emoji</button>
          <div class="checkin-emoji-row" id="checkin-emoji-row" hidden>${emojiButtons}</div>
          <div class="checkin-visibility" role="group" aria-label="Post as">
            <button type="button" class="checkin-visibility-btn" data-visibility="name" aria-pressed="true">Show my name</button>
            <button type="button" class="checkin-visibility-btn" data-visibility="anon" aria-pressed="false">Post anonymously</button>
          </div>
          <div class="checkin-actions">
            <button type="submit" class="btn-neon checkin-neon-btn" id="checkin-submit">Post check-in</button>
            <span class="checkin-status" id="checkin-status" role="status" aria-live="polite"></span>
          </div>
        </form>
      </div>
      <div class="checkin-list-wrap" id="checkin-list-wrap" hidden>
        <h3 class="checkin-heading">Recent check-ins</h3>
        <div class="checkin-list" id="checkin-list"></div>
        <div class="checkin-more-row"><button class="pagination-btn" type="button" id="checkin-more" hidden>Load more</button></div>
      </div>`;
  }

  function wireComposer() {
    const form = document.getElementById('checkin-form');
    const signInBtn = document.getElementById('checkin-signin-btn');
    const note = document.getElementById('checkin-note');
    const count = document.getElementById('checkin-count');
    const status = document.getElementById('checkin-status');
    const emojiToggle = document.getElementById('checkin-emoji-toggle');
    const emojiRow = document.getElementById('checkin-emoji-row');

    if (note && count) {
      note.addEventListener('input', () => {
        count.textContent = `${note.value.length}/${NOTE_MAX}`;
      });
    }

    document.querySelectorAll('.checkin-mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.checkin-mood-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        selectedMood = btn.getAttribute('data-mood');
      });
    });

    document.querySelectorAll('.checkin-visibility-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.checkin-visibility-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        postAnonymously = btn.getAttribute('data-visibility') === 'anon';
      });
    });

    if (emojiToggle && emojiRow) {
      emojiToggle.addEventListener('click', () => {
        const open = emojiRow.hidden;
        emojiRow.hidden = !open;
        emojiToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      emojiRow.querySelectorAll('.checkin-emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!note) return;
          const start = note.selectionStart == null ? note.value.length : note.selectionStart;
          const end = note.selectionEnd == null ? note.value.length : note.selectionEnd;
          const emoji = btn.getAttribute('data-emoji');
          const next = note.value.slice(0, start) + emoji + note.value.slice(end);
          note.value = next.slice(0, NOTE_MAX);
          note.focus();
          const caret = Math.min(start + emoji.length, NOTE_MAX);
          note.setSelectionRange(caret, caret);
          if (count) count.textContent = `${note.value.length}/${NOTE_MAX}`;
        });
      });
    }

    if (signInBtn) {
      signInBtn.addEventListener('click', async () => {
        const ok = await GlotempAuth.requireAuth('Sign in to add a check-in for this city.');
        if (ok) refreshAuthState();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ok = await GlotempAuth.requireAuth('Sign in to add a check-in for this city.');
        if (!ok) return;
        refreshAuthState();
        const session = await GlotempAuth.getSession();
        const user = GlotempAuth.getUser();
        if (!session || !user) return;

        const text = note.value.trim();
        if (!text) {
          status.textContent = 'Write a short comment before posting.';
          return;
        }

        const verdict = moderateText(text);
        if (!verdict.ok) {
          status.textContent = verdict.message;
          fetch(`${SUPABASE_URL}/rest/v1/comment_rejections`, {
            method: 'POST',
            headers: Object.assign(authHeaders(session), { Prefer: 'return=minimal' }),
            body: JSON.stringify({
              user_id: user.id,
              city_slug: citySlug,
              reason: verdict.reason,
              attempted_text: text.slice(0, NOTE_MAX),
            }),
          }).catch(() => {});
          return;
        }

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
              mood: selectedMood,
              note: text,
              is_anonymous: postAnonymously,
            }),
          });
          if (!resp.ok) throw new Error('post failed ' + resp.status);
          // Per city, because growth has to be readable one city at a time.
          // Announced rather than measured here, so glotemp-analytics.js
          // owns every event and this file keeps owning the composer.
          window.dispatchEvent(new CustomEvent('glotemp:checkin', { detail: { city: citySlug } }));
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

    if (signedIn) {
      const profile = GlotempAuth.getCachedProfile();
      const nameBtn = document.querySelector('.checkin-visibility-btn[data-visibility="name"]');
      if (nameBtn && profile) nameBtn.textContent = `Show my name (${profile.display_name})`;
    }
  }

  // ---------- check-ins list ----------
  function checkinHTML(row) {
    const name = row.is_anonymous ? 'Anonymous' : ((row.profiles && row.profiles.display_name) || 'Anonymous');
    const mood = MOOD_BY_KEY[row.mood];
    return `
      <article class="checkin-item">
        <div class="checkin-item-head">
          ${mood ? moodGlyphSVG(row.mood, 'checkin-item-glyph') : ''}
          <span class="checkin-item-name">${esc(name)}</span>
          <span class="checkin-item-mood">${esc(mood ? mood.label : row.mood)}</span>
          <time class="checkin-item-time" datetime="${esc(row.created_at)}">${esc(timeAgo(row.created_at))}</time>
        </div>
        ${row.note ? `<p class="checkin-item-note">${esc(row.note)}</p>` : ''}
      </article>`;
  }

  async function loadCheckins({ replace } = {}) {
    const list = document.getElementById('checkin-list');
    const wrap = document.getElementById('checkin-list-wrap');
    const moreBtn = document.getElementById('checkin-more');
    if (!list) return;
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/observations?city_slug=eq.${encodeURIComponent(citySlug)}` +
        `&select=id,mood,is_anonymous,note,created_at,profiles(display_name)` +
        `&order=created_at.desc&offset=${offset}&limit=${PAGE_SIZE}`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } }
      );
      if (!resp.ok) throw new Error('fetch failed');
      const rows = await resp.json();
      if ((replace || offset === 0) && rows.length === 0) {
        // No text announcing absence -- the list section simply isn't
        // shown. The composer and examples panel above it are enough.
        list.innerHTML = '';
        offset = 0;
        if (wrap) wrap.hidden = true;
        if (moreBtn) moreBtn.hidden = true;
        return;
      }
      if (wrap) wrap.hidden = false;
      const html = rows.map(checkinHTML).join('');
      if (replace || offset === 0) {
        list.innerHTML = html;
      } else {
        list.insertAdjacentHTML('beforeend', html);
      }
      offset += rows.length;
      if (moreBtn) moreBtn.hidden = rows.length < PAGE_SIZE;
    } catch (e) {
      if (offset === 0) {
        list.innerHTML = '';
        if (wrap) wrap.hidden = true;
      }
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

    // Replace the generated static "City reading" body with the live
    // examples + composer + list. Falls back to appending a section if
    // that anchor is missing so a re-themed page still gets the feature.
    let host = document.getElementById('city-observation-feed');
    if (host) {
      const section = host.closest('section') || host;
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
