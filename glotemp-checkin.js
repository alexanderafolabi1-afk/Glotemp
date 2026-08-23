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
  // Student ambassador contributions: an optional tag on an ordinary
  // check-in, nothing more. campusByWikidataId is real per-university
  // data from city_universities (see city-campus.js / wikidata-universities)
  // -- name-lookup only, never re-fetched or re-derived here.
  let campusByWikidataId = new Map();
  let selectedCampus = '';

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

  // Turns a failed PostgREST response into a message that actually says
  // what went wrong, instead of one generic "try again" that fits every
  // possible failure equally badly. PostgREST error bodies carry a
  // Postgres SQLSTATE in `code` (e.g. 23514 = check_violation, 42501 =
  // insufficient_privilege/RLS) plus a human `message`/`details` -- this
  // reads those rather than discarding the response body.
  //
  // The raw diagnostic (HTTP status + Postgres code, when present) is
  // always appended after the human sentence, never swapped in instead of
  // it -- so a report of "it's still broken" always comes with something
  // exact to search logs against, instead of one more generic message.
  async function describePostError(resp) {
    let body = null;
    try { body = await resp.json(); } catch (e) { /* no JSON body */ }

    const code = body && body.code;
    const diag = `[HTTP ${resp.status}${code ? ' · ' + code : ''}]`;

    if (resp.status === 401) {
      return `You've been signed out. Sign in again and re-post. ${diag}`;
    }
    if (resp.status === 403 || code === '42501') {
      return `That wasn't allowed by the server -- try signing out and back in. ${diag}`;
    }
    if (code === '23514') {
      // constraint name is inside body.message, e.g.
      // "new row ... violates check constraint \"observations_mood_check\""
      const constraint = /"([a-z_]+_check)"/.exec(body.message || '')?.[1] || '';
      if (constraint.indexOf('mood') !== -1) {
        return `That mood value wasn't recognized by the server. Pick a mood again and re-post. ${diag}`;
      }
      if (constraint.indexOf('note') !== -1) {
        return `That comment is too long for the server to accept. Shorten it and try again. ${diag}`;
      }
      return `That check-in didn't pass a server-side rule (${constraint || 'unknown check'}). Try again with different text. ${diag}`;
    }
    if (code === '23503') {
      return `Your account record couldn't be found by the server. Try signing out and back in. ${diag}`;
    }
    if (code === 'PGRST204' || code === 'PGRST202' || (body && /schema cache/i.test(body.message || ''))) {
      return `The server rejected the request -- it references a field or function the database doesn't recognize. This is a deployment bug, not something a re-post fixes. ${diag} ${body && body.message ? '"' + body.message + '"' : ''}`;
    }
    if (resp.status === 429) {
      return `Too many requests right now -- wait a moment and try again. ${diag}`;
    }
    if (resp.status >= 500) {
      return `The server had a problem saving that. Try again shortly. ${diag}`;
    }
    const detail = (body && (body.message || body.details || body.hint)) || 'no further detail from the server';
    return `Could not post that: ${detail} ${diag}`;
  }

  // ---------- location enforcement ----------
  // Mandatory, not optional -- unlike GlotempVerify's post-hoc "I am here"
  // badge (glotemp-verify.js), which is untouched and stays exactly what
  // it was: an opt-in signal offered only after a successful post.
  //
  // This reuses the same city_points table and Haversine distance
  // verify_presence already checks a posted reading against, through a
  // new read-only RPC (check_city_presence, 20260823130000). It can't
  // reuse verify_presence itself: that function stamps an existing
  // observation row, and this has to run BEFORE one exists, to block the
  // post rather than flag it after the fact.
  //
  // PRIVACY: the coordinates exist only inside this function's local
  // variables and the one RPC call body. check_city_presence, like
  // verify_presence before it, is read-only -- it returns a verdict and
  // writes nothing. Nothing here puts lat/lon in localStorage, in the
  // check-in's own POST body, or in any other table.
  function getPositionForCheckin() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject({ code: 0 }); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        (err) => reject(err),
        // Same reasoning as glotemp-verify.js's position(): the question
        // is which city, not which street -- high accuracy would only
        // drain a battery and collect more than the check needs.
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
      );
    });
  }

  async function checkCityPresence(session, slug, lat, lon) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_city_presence`, {
      method: 'POST',
      headers: authHeaders(session),
      body: JSON.stringify({ p_city_slug: slug, p_lat: lat, p_lon: lon }),
    });
    if (!resp.ok) throw new Error(`check_city_presence ${resp.status}`);
    const rows = await resp.json();
    return Array.isArray(rows) ? rows[0] : rows;
  }

  const LOCATION_MESSAGES = {
    denied: (city) => `Check-ins need your location to confirm you're actually in ${city}. Location access was blocked -- allow it in your browser settings and try again.`,
    unavailable: (city) => `Couldn't get your location. Check-ins need to confirm you're in ${city} -- try again in a moment.`,
    bad_position: (city) => `Couldn't get your location. Check-ins need to confirm you're in ${city} -- try again in a moment.`,
    too_far: (city) => `This check-in needs to come from ${city} itself.`,
    city_not_mapped: () => `Location check isn't available for this city yet, so check-ins are paused here.`,
  };

  function moodGlyphSVG(key, extraClass) {
    const m = MOOD_BY_KEY[key] || MOOD_BY_KEY[DEFAULT_MOOD];
    return `<svg class="checkin-mood-glyph${extraClass ? ' ' + extraClass : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${m.glyph}</svg>`;
  }

  // ---------- examples panel ----------
  function examplesHTML() {
    return `
      <div class="checkin-examples" aria-label="Recent readings">
        <p class="checkin-examples-eyebrow">Recent readings</p>
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
          <!-- Student ambassador tag: filled in only if this city has at
               least one real university (city_universities). Hidden
               until then, same convention as every other real-data-only
               section on this site. -->
          <div class="checkin-campus-row" id="checkin-campus-row" hidden></div>
          <div class="checkin-visibility" role="group" aria-label="Post as">
            <button type="button" class="checkin-visibility-btn" data-visibility="name" aria-pressed="true">Show my name</button>
            <button type="button" class="checkin-visibility-btn" data-visibility="anon" aria-pressed="false">Post anonymously</button>
          </div>
          <div class="checkin-actions">
            <button type="submit" class="btn-neon checkin-neon-btn" id="checkin-submit">Post check-in</button>
            <span class="checkin-status" id="checkin-status" role="status" aria-live="polite"></span>
          </div>
          <!-- Filled only after a successful post, by glotemp-verify.js.
               Empty and silent until then. -->
          <div id="checkin-verify"></div>
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
        signInBtn.disabled = true;
        signInBtn.setAttribute('aria-busy', 'true');
        signInBtn.classList.add('is-loading');
        try {
          const ok = await GlotempAuth.requireAuth('Sign in to add a check-in for this city.');
          if (ok) refreshAuthState();
        } finally {
          signInBtn.disabled = false;
          signInBtn.removeAttribute('aria-busy');
          signInBtn.classList.remove('is-loading');
        }
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

        // Defense in depth: the server enforces this exact set too
        // (observations_mood_check), but failing fast here with a
        // specific reason beats sending a value that can only come back
        // as an opaque 400 from the network.
        if (!MOOD_BY_KEY[selectedMood]) {
          status.textContent = "That mood selection didn't register properly. Pick a mood again and re-post.";
          return;
        }
        if (!citySlug) {
          status.textContent = "Couldn't tell which city this is for. Reload the page and try again.";
          return;
        }

        const submitBtn = document.getElementById('checkin-submit');
        // aria-busy + .is-loading fire in the same tick as disabled, well
        // under the 100ms floor for a felt response -- the network call
        // on the next line hasn't even been dispatched yet.
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
        submitBtn.classList.add('is-loading');
        function endLoading() {
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-busy');
          submitBtn.classList.remove('is-loading');
        }

        // ---- location enforcement: an integrity feature, not optional ----
        // Blocks the post outright rather than flagging it afterward --
        // see the LOCATION ENFORCEMENT comment above checkCityPresence
        // for how this differs from GlotempVerify's optional badge.
        status.textContent = 'Checking your location…';
        let geo;
        try {
          geo = await getPositionForCheckin();
        } catch (geoErr) {
          endLoading();
          status.textContent = (geoErr && geoErr.code === 1)
            ? LOCATION_MESSAGES.denied(cityDisplayName())
            : LOCATION_MESSAGES.unavailable(cityDisplayName());
          return;
        }

        let presence;
        try {
          presence = await checkCityPresence(session, citySlug, geo.lat, geo.lon);
        } catch (presenceErr) {
          endLoading();
          status.textContent = "Couldn't verify your location right now. Try again in a moment.";
          return;
        }
        if (!presence || !presence.allowed) {
          const reason = presence && presence.reason;
          endLoading();
          status.textContent = (LOCATION_MESSAGES[reason] || LOCATION_MESSAGES.too_far)(cityDisplayName());
          return;
        }

        status.textContent = 'Posting…';
        try {
          // representation rather than minimal: the new row's id is what
          // the optional verification step needs, and asking for it here
          // avoids a second round trip to find the row again.
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/observations?select=id`, {
            method: 'POST',
            headers: Object.assign(authHeaders(session), { Prefer: 'return=representation' }),
            body: JSON.stringify({
              user_id: user.id,
              city_slug: citySlug,
              mood: selectedMood,
              note: text,
              is_anonymous: postAnonymously,
              campus_wikidata_id: selectedCampus || null,
            }),
          });
          if (!resp.ok) {
            status.textContent = await describePostError(resp);
            endLoading();
            return;
          }

          // The offer is made only after a successful post. Asking for a
          // position before someone has written anything is a toll gate.
          let newId = null;
          try {
            const rows = await resp.json();
            newId = Array.isArray(rows) && rows[0] ? rows[0].id : null;
          } catch (e) { /* older PostgREST, or no body: verification is optional anyway */ }

          // The row is safely in the database at this point -- everything
          // from here on is presentation, and a failure in it must never
          // be reported back to the poster as "could not post that".
          status.textContent = 'Posted.';
          note.value = '';
          count.textContent = `0/${NOTE_MAX}`;
          selectedCampus = '';
          const campusSelect = document.getElementById('checkin-campus');
          if (campusSelect) campusSelect.value = '';
          offset = 0;
          endLoading();
          try {
            const verifySlot = document.getElementById('checkin-verify');
            if (newId && verifySlot && window.GlotempVerify) {
              GlotempVerify.mountOffer(verifySlot, newId);
            }
            // Per city, because growth has to be readable one city at a
            // time. Announced rather than measured here, so
            // glotemp-analytics.js owns every event and this file keeps
            // owning the composer.
            window.dispatchEvent(new CustomEvent('glotemp:checkin', { detail: { city: citySlug } }));
            await loadCheckins({ replace: true });
          } catch (postErr) {
            // The post succeeded; only the refresh afterward failed. Say
            // so rather than implying the check-in itself is in doubt.
            console.error('Post succeeded but the feed refresh failed:', postErr);
          }
          setTimeout(() => { status.textContent = ''; }, 3000);
        } catch (err) {
          // fetch() itself threw: offline, DNS failure, CORS, timeout --
          // genuinely a network-layer failure, distinct from a server
          // response the code above already handles.
          status.textContent = err instanceof TypeError
            ? 'Network problem -- check your connection and try again.'
            : `Unexpected error posting that (ref: ${err && err.message ? err.message.slice(0, 60) : 'unknown'}). Try again.`;
          endLoading();
        }
      });
    }
  }

  // ---------- student ambassador tag ----------
  // Optional only: fetches this city's real universities (same table
  // city-campus.js reads) and, if any exist, reveals a plain <select> in
  // the composer. Selecting one does nothing but set selectedCampus,
  // which rides along in the exact same POST as every other check-in
  // field -- no new endpoint, no new table, no new moderation path.
  async function loadCampusOptions() {
    const row = document.getElementById('checkin-campus-row');
    if (!row || !citySlug) return;
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/city_universities?city_slug=eq.${encodeURIComponent(citySlug)}` +
        `&select=wikidata_id,name&order=name.asc`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } }
      );
      if (!resp.ok) return;
      const rows = await resp.json();
      if (!Array.isArray(rows) || rows.length === 0) return;

      campusByWikidataId = new Map(rows.map(r => [r.wikidata_id, r.name]));
      row.innerHTML = `
        <label class="checkin-label" for="checkin-campus">Tag to a university (optional)</label>
        <select class="checkin-note" id="checkin-campus">
          <option value="">Not tagged to a university</option>
          ${rows.map(r => `<option value="${esc(r.wikidata_id)}">${esc(r.name)}</option>`).join('')}
        </select>`;
      row.hidden = false;
      const select = document.getElementById('checkin-campus');
      if (select) select.addEventListener('change', () => { selectedCampus = select.value; });
    } catch (e) { /* stays hidden -- no real data to offer */ }
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
    // No reporter badge on an anonymous post -- the whole point of posting
    // anonymously is that nothing here identifies the account, and a tier
    // badge is exactly that kind of identifying signal.
    const reporterTier = row.is_anonymous ? null : (row.profiles && row.profiles.reporter_tier);
    // Real name looked up from the same real table the composer's
    // dropdown was built from -- an id campusByWikidataId doesn't
    // recognize (map not loaded yet on this render, or the university
    // row has since gone away) renders no chip at all, never the raw id.
    const campusName = row.campus_wikidata_id ? campusByWikidataId.get(row.campus_wikidata_id) : null;
    return `
      <article class="checkin-item">
        <div class="checkin-item-head">
          ${mood ? moodGlyphSVG(row.mood, 'checkin-item-glyph') : ''}
          <span class="checkin-item-name">${esc(name)}</span>
          ${reporterTier && window.GlotempReporter ? GlotempReporter.badgeHTML(reporterTier) : ''}
          <span class="checkin-item-mood">${esc(mood ? mood.label : row.mood)}</span>
          ${campusName ? `<span class="checkin-item-campus">&#127891; ${esc(campusName)}</span>` : ''}
          ${window.GlotempVerify ? GlotempVerify.badgeHTML(row.verify_method) : ''}
          <time class="checkin-item-time" datetime="${esc(row.created_at)}">${esc(timeAgo(row.created_at))}</time>
        </div>
        ${row.note ? `<p class="checkin-item-note">${esc(row.note)}</p>` : ''}
        ${window.GlotempReactions ? GlotempReactions.barHTML(row.id) : ''}
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
        `&select=id,mood,is_anonymous,note,created_at,verify_method,campus_wikidata_id,profiles(display_name,reporter_tier)` +
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
      // Counts for whatever is now on screen. mount() only queries ids
      // it has not seen, so paging in more rows costs one request for
      // the new page rather than a re-fetch of the whole list.
      if (window.GlotempReactions) GlotempReactions.mount(list);
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

  // A small, real preview of what following actually delivers -- not just
  // "Followed!". Real value: this city's band/top-ten notifications (the
  // same watch-email copy this page already promises above), nothing more
  // invented. Auto-dismisses; also closable, and never blocks anything.
  let followConfirmTimer = null;
  function showFollowConfirm(cityName) {
    let el = document.getElementById('follow-confirm-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'follow-confirm-toast';
      el.className = 'follow-confirm-toast';
      el.setAttribute('role', 'status');
      el.innerHTML =
        '<p class="follow-confirm-text"></p>' +
        '<button type="button" class="follow-confirm-close" aria-label="Dismiss">&times;</button>';
      document.body.appendChild(el);
      el.querySelector('.follow-confirm-close').addEventListener('click', () => hideFollowConfirm());
    }
    el.querySelector('.follow-confirm-text').innerHTML =
      `<strong>Following ${esc(cityName)}.</strong> We'll let you know when its mood shifts band, or when it enters a top ten -- nothing else, and never more than that.`;
    el.classList.add('is-visible');
    clearTimeout(followConfirmTimer);
    followConfirmTimer = setTimeout(hideFollowConfirm, 6000);
  }
  function hideFollowConfirm() {
    const el = document.getElementById('follow-confirm-toast');
    if (el) el.classList.remove('is-visible');
    clearTimeout(followConfirmTimer);
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
      // disabled + aria-busy immediately, before the network call --
      // .is-loading (styles.css) is what actually paints the busy state;
      // disabled alone is what stops a second tap firing a second request.
      fresh.disabled = true;
      fresh.setAttribute('aria-busy', 'true');
      fresh.classList.add('is-loading');
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
          // Immediate, on-brand acknowledgment of the action just taken --
          // separate from the push-permission ask below, which is a
          // different question (browser notifications) and may not even
          // show (already granted/denied). This one always shows once,
          // right after a real follow.
          showFollowConfirm(cityDisplayName());
          // Explicit action just taken (following this city) -- the one
          // moment this prompt is allowed to appear. Never on page load.
          if (window.GlotempPush) {
            GlotempPush.promptAfterFollow(citySlug, cityDisplayName(), session, user);
          }
        }
      } catch (e) { /* surfaced by the label refresh below */ }
      await refreshLabel();
      fresh.disabled = false;
      fresh.removeAttribute('aria-busy');
      fresh.classList.remove('is-loading');
    });
  }

  // ---------- intent board ----------
  // "Where people want to go" for this city. The section starts hidden
  // and stays hidden unless GlotempReactions.intentBoard() finds enough
  // to rank: an empty board is not shown as an empty board, it is not
  // shown at all, and the element is removed so it cannot leave a gap
  // between the sections either side of it.
  function mountIntentBoard() {
    if (!window.GlotempReactions) return;
    var host = document.getElementById('city-intent-board');
    if (!host) {
      var anchor = document.getElementById('city-observation-feed');
      var after = anchor ? (anchor.closest('section') || anchor) : null;
      host = document.createElement('section');
      host.id = 'city-intent-board';
      host.className = 'glass-card city-intent-section';
      host.hidden = true;
      if (after && after.parentNode) {
        after.parentNode.insertBefore(host, after.nextSibling);
      } else {
        (document.querySelector('main') || document.body).appendChild(host);
      }
    }
    GlotempReactions.intentBoard(citySlug, host).then(function (n) {
      if (!n && host.parentNode) host.parentNode.removeChild(host);
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
    mountIntentBoard();
    loadCampusOptions();

    const moreBtn = document.getElementById('checkin-more');
    if (moreBtn) moreBtn.addEventListener('click', async () => {
      moreBtn.disabled = true;
      moreBtn.setAttribute('aria-busy', 'true');
      moreBtn.classList.add('is-loading');
      try {
        await loadCheckins();
      } finally {
        // loadCheckins() itself may hide moreBtn (no more rows); guard
        // against touching a button loadCheckins already tore down.
        if (moreBtn.isConnected) {
          moreBtn.disabled = false;
          moreBtn.removeAttribute('aria-busy');
          moreBtn.classList.remove('is-loading');
        }
      }
    });

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
