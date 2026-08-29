// Glotemp Home Frequency: a private, once-a-day letter from one city a
// signed-in reader has chosen to keep. Not a dashboard -- a ritual. It
// composes four things this platform already builds elsewhere (a live
// Pulse reading, a conditions line, a radio station, a local-press
// fragment) into one quiet card, plus a place to leave yourself a note.
//
// PRIVATE BY DESIGN
// The chosen city, the streak, and every note live behind owner-only RLS
// (see the home_frequency migration). Nobody else's Home Frequency is
// ever readable through this or any other file.
//
// WHY THIS FILE DOESN'T FETCH ITS OWN PULSE/RADIO/NEWS LOGIC
// city_reading_weighted, GlotempRadio.fetchTopStation and
// GlotempNews.fetchHeadlines already exist and are already the honest,
// tested way to ask each of those questions. Re-implementing any of them
// here would be a second, divergent source of the same fact.
(function () {
  'use strict';

  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  const NOTE_MAX = 280;

  // Same five bands and thresholds as moodToBand() in app.js and the
  // check-in composer -- written out locally so this file works even on
  // a page that hasn't loaded app.js, the same standalone-module choice
  // city-conditions.js documents for localHour().
  const BANDS = [
    { min: 8.5, key: 'charged', label: 'charged' },
    { min: 7.0, key: 'warm', label: 'warm' },
    { min: 5.0, key: 'steady', label: 'steady' },
    { min: 3.0, key: 'restrained', label: 'restrained' },
    { min: -Infinity, key: 'low', label: 'quiet' },
  ];
  function bandFor(intensity) {
    const m = BANDS.find((b) => intensity >= b.min);
    return m || BANDS[BANDS.length - 1];
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function authHeaders(session) {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session ? session.access_token : SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  // Duplicated from city-conditions.js's localHour() on purpose -- each
  // of these per-feature modules is meant to work standalone.
  function localHour(timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, hour12: false, hour: 'numeric',
      }).formatToParts(new Date());
      return Number(parts.find((p) => p.type === 'hour').value) % 24;
    } catch (e) {
      return null;
    }
  }

  function localTimeString(timezone) {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, hour: 'numeric', minute: '2-digit',
      }).format(new Date());
    } catch (e) {
      return null;
    }
  }

  function findCity(slug) {
    return (window.CITIES_DATA || []).find((c) => c.slug === slug) || null;
  }

  let root = null;
  let currentCity = null;

  // ---------- signed out ----------
  function renderSignedOut() {
    root.innerHTML = `
      <div class="hf-card">
        <p class="hf-eyebrow">Home Frequency</p>
        <h2 class="hf-title">Keep one city.</h2>
        <p class="hf-copy">A quiet letter from a place you've chosen -- its pulse, its hour, a station, a line from the local press. Once a day, for as long as you want it. Sign in to begin.</p>
        <button type="button" class="btn-neon hf-signin" id="hf-signin">Begin</button>
      </div>`;
    const btn = document.getElementById('hf-signin');
    if (btn) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.classList.add('is-loading');
        try {
          const ok = await GlotempAuth.requireAuth('Sign in to keep a Home Frequency.');
          if (ok) { await mount(); return; }
        } finally {
          if (btn.isConnected) {
            btn.disabled = false;
            btn.removeAttribute('aria-busy');
            btn.classList.remove('is-loading');
          }
        }
      });
    }
  }

  // ---------- city picker ----------
  function renderPicker(profile) {
    const cities = window.CITIES_DATA || [];
    const options = cities
      .map((c) => `<option value="${esc(c.name)}, ${esc(c.country)}" data-slug="${esc(c.slug)}"></option>`)
      .join('');
    const pref = (profile && profile.home_frequency_pref) || 'morning';

    root.innerHTML = `
      <div class="hf-card">
        <p class="hf-eyebrow">Home Frequency</p>
        <h2 class="hf-title">Which city should write to you?</h2>
        <p class="hf-copy">One city, kept quietly. You can change it any time.</p>
        <form class="hf-picker-form" id="hf-picker-form">
          <label class="hf-label" for="hf-city-input">City</label>
          <input class="hf-input" id="hf-city-input" list="hf-city-list" placeholder="Start typing a city…" autocomplete="off" required>
          <datalist id="hf-city-list">${options}</datalist>
          <div class="hf-pref-row" role="group" aria-label="Preferred time">
            <button type="button" class="hf-pref-btn" data-pref="morning" aria-pressed="${pref === 'morning' ? 'true' : 'false'}">Morning letter</button>
            <button type="button" class="hf-pref-btn" data-pref="evening" aria-pressed="${pref === 'evening' ? 'true' : 'false'}">Evening letter</button>
          </div>
          <button type="submit" class="btn-neon hf-begin-btn">Keep this city</button>
          <span class="hf-status" id="hf-picker-status" role="status" aria-live="polite"></span>
        </form>
      </div>`;

    let selectedPref = pref;
    document.querySelectorAll('.hf-pref-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hf-pref-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        selectedPref = btn.getAttribute('data-pref');
      });
    });

    const form = document.getElementById('hf-picker-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('hf-picker-status');
      const input = document.getElementById('hf-city-input');
      const val = input.value.trim();
      const match = cities.find((c) => `${c.name}, ${c.country}` === val)
        || cities.find((c) => c.name.toLowerCase() === val.toLowerCase());
      if (!match) {
        status.textContent = 'Pick a city from the list.';
        return;
      }
      status.textContent = 'Keeping it…';
      try {
        await rpc('open_home_frequency', { p_city_slug: match.slug, p_preference: selectedPref });
        await mount();
      } catch (err) {
        status.textContent = 'Could not save that right now. Try again shortly.';
      }
    });
  }

  // ---------- data gathering for the letter ----------
  async function fetchPulse(citySlug) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/city_reading_weighted`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ p_city_slug: citySlug, p_hours: 24 }),
      });
      if (!resp.ok) return null;
      const rows = await resp.json();
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row || row.observations === 0 || row.intensity == null) return null;
      return { intensity: row.intensity, observations: row.observations };
    } catch (e) {
      return null;
    }
  }

  // A real, recent human note about this city reads warmer than a
  // headline, so it's tried first; a news fragment is the honest
  // fallback when nobody has checked in recently.
  async function fetchObservationFragment(citySlug, cityName, country) {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/observations?city_slug=eq.${encodeURIComponent(citySlug)}` +
        `&note=not.is.null&select=note,created_at&order=created_at.desc&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } }
      );
      if (resp.ok) {
        const rows = await resp.json();
        if (Array.isArray(rows) && rows[0] && rows[0].note) {
          return { kind: 'observation', text: rows[0].note };
        }
      }
    } catch (e) { /* fall through to news */ }
    if (window.GlotempNews) {
      const headlines = await GlotempNews.fetchHeadlines(citySlug, 1);
      if (headlines[0]) return { kind: 'news', text: headlines[0].title, url: headlines[0].url, source: headlines[0].domain };
    }
    return null;
  }

  async function fetchTodayNote(session, user) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/home_frequency_notes?user_id=eq.${user.id}&note_date=eq.${today}&select=note&limit=1`,
        { headers: authHeaders(session) }
      );
      if (!resp.ok) return '';
      const rows = await resp.json();
      return (rows && rows[0] && rows[0].note) || '';
    } catch (e) {
      return '';
    }
  }

  async function rpc(fn, args) {
    const A = GlotempAuth;
    const session = await A.getSession();
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: authHeaders(session),
      body: JSON.stringify(args || {}),
    });
    if (!resp.ok) throw new Error(`${fn} failed ${resp.status}`);
    return resp.json();
  }

  // ---------- the letter ----------
  function greeting(pref, cityHour) {
    if (pref === 'evening') return 'Good evening';
    if (cityHour != null && cityHour < 5) return 'Still night';
    if (cityHour != null && cityHour >= 18) return 'Good evening';
    return 'Good morning';
  }

  function pulseLine(pulse, city) {
    if (!pulse) return `No fresh readings from ${esc(city.name)} in the last day -- the quiet has its own honesty.`;
    const band = bandFor(pulse.intensity);
    const count = pulse.observations;
    return `Reading ${esc(band.label)} right now, from ${count} ${count === 1 ? 'person' : 'people'} there in the last day.`;
  }

  function fragmentHTML(fragment, city) {
    if (!fragment) return `<p class="hf-fragment hf-fragment-empty">Nothing filed from ${esc(city.name)} today -- not every day makes the papers.</p>`;
    if (fragment.kind === 'observation') {
      return `<p class="hf-fragment">“${esc(fragment.text)}”<span class="hf-fragment-tag">Someone there, recently</span></p>`;
    }
    return `<p class="hf-fragment"><a href="${esc(fragment.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(fragment.text)}</a><span class="hf-fragment-tag">${esc(fragment.source || 'Local press')}</span></p>`;
  }

  function stationHTML(stationResult) {
    if (!stationResult || !stationResult.station) return '';
    const s = stationResult.station;
    return `
      <div class="hf-radio" data-uuid="${esc(s.stationuuid || '')}" data-url="${esc(s.url || s.url_resolved || '')}" data-curated="${s.curated ? '1' : ''}">
        <button type="button" class="hf-radio-play" id="hf-radio-play" aria-label="Play ${esc(s.name)}">&#9654;</button>
        <span class="hf-radio-name">${esc((s.name || 'A local station').trim())}</span>
        <audio id="hf-radio-audio" preload="none"></audio>
      </div>`;
  }

  function wireStation(stationResult) {
    const btn = document.getElementById('hf-radio-play');
    if (!btn || !stationResult || !stationResult.station) return;
    const audio = document.getElementById('hf-radio-audio');
    const s = stationResult.station;
    let playing = false;
    btn.addEventListener('click', async () => {
      if (playing) {
        audio.pause();
        btn.innerHTML = '&#9654;';
        playing = false;
        return;
      }
      // Loading state before the resolve-URL fetch starts -- without
      // this the play glyph just sits there, unchanged, for however long
      // the station lookup takes.
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.classList.add('is-loading');
      try {
        let url = s.url || s.url_resolved;
        if (!s.curated && s.stationuuid) {
          const resp = await fetch(`https://de1.api.radio-browser.info/json/url/${encodeURIComponent(s.stationuuid)}`);
          if (resp.ok) {
            const data = await resp.json();
            url = data && data.url ? data.url : url;
          }
        }
        if (!url) throw new Error('no url');
        audio.src = url;
        await audio.play();
        btn.innerHTML = '&#10074;&#10074;';
        playing = true;
      } catch (e) {
        btn.setAttribute('title', "Couldn't play this station right now.");
      } finally {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        btn.classList.remove('is-loading');
      }
    });
  }

  async function renderLetter(profile, session, user) {
    const city = findCity(profile.home_frequency_city);
    if (!city) { renderPicker(profile); return; }
    currentCity = city;

    root.innerHTML = `<div class="hf-card hf-loading"><p class="hf-eyebrow">Home Frequency</p><p class="hf-copy">Gathering ${esc(city.name)}&hellip;</p></div>`;

    const [pulse, conditions, station, fragment, todayNote, streakResult] = await Promise.all([
      fetchPulse(city.slug),
      window.GlotempConditions ? GlotempConditions.computeConditionsText(city.lat, city.lon, city.timezone) : Promise.resolve(null),
      window.GlotempRadio ? GlotempRadio.fetchTopStation(city.lat, city.lon, city.country, city.slug) : Promise.resolve(null),
      fetchObservationFragment(city.slug, city.name, city.country),
      fetchTodayNote(session, user),
      rpc('open_home_frequency', {}).catch(() => null),
    ]);

    const cityHour = localHour(city.timezone);
    const timeStr = localTimeString(city.timezone);
    const pref = (streakResult && streakResult.preference) || profile.home_frequency_pref || 'morning';
    const streak = (streakResult && streakResult.streak) || profile.home_frequency_streak || 1;
    const streakLine = streak === 1 ? 'Your first letter.' : `${streak} days of keeping ${esc(city.name)}.`;

    root.innerHTML = `
      <div class="hf-card">
        <p class="hf-eyebrow">Home Frequency</p>
        <h2 class="hf-title">${esc(greeting(pref, cityHour))} from <span class="hf-glow">${esc(city.name)}</span></h2>
        ${timeStr ? `<p class="hf-time">${esc(timeStr)} there${conditions ? ' · ' + esc(conditions) : ''}</p>` : ''}
        <p class="hf-pulse">${pulseLine(pulse, city)}</p>
        ${stationHTML(station)}
        ${fragmentHTML(fragment, city)}
        <form class="hf-note-form" id="hf-note-form">
          <label class="hf-label" for="hf-note-input">Leave yourself a note</label>
          <textarea class="hf-note-input" id="hf-note-input" rows="2" maxlength="${NOTE_MAX}" placeholder="Optional. Only you will see this.">${esc(todayNote)}</textarea>
          <div class="hf-note-actions">
            <button type="submit" class="hf-note-save">Save note</button>
            <span class="hf-note-status" id="hf-note-status" role="status" aria-live="polite"></span>
          </div>
        </form>
        <p class="hf-streak">${streakLine}</p>
        <button type="button" class="hf-change-city" id="hf-change-city">Change city</button>
      </div>`;

    wireStation(station);

    const noteForm = document.getElementById('hf-note-form');
    if (noteForm) {
      noteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const status = document.getElementById('hf-note-status');
        const text = document.getElementById('hf-note-input').value.trim();
        status.textContent = 'Saving…';
        try {
          await rpc('open_home_frequency', { p_note: text || null });
          status.textContent = 'Saved.';
          setTimeout(() => { status.textContent = ''; }, 2500);
        } catch (err) {
          status.textContent = 'Could not save. Try again shortly.';
        }
      });
    }

    const changeBtn = document.getElementById('hf-change-city');
    if (changeBtn) changeBtn.addEventListener('click', () => renderPicker(profile));
  }

  // ---------- mount ----------
  async function mount() {
    root = document.getElementById('home-frequency-root');
    if (!root) return;
    if (typeof GlotempAuth === 'undefined') {
      root.innerHTML = '<p class="hf-copy">Home Frequency is unavailable right now.</p>';
      return;
    }

    const signedIn = await GlotempAuth.isSignedIn();
    if (!signedIn) { renderSignedOut(); return; }

    const session = await GlotempAuth.getSession();
    const user = GlotempAuth.getUser();
    if (!session || !user) { renderSignedOut(); return; }

    const profile = await GlotempAuth.fetchProfile();
    if (!profile) { renderSignedOut(); return; }

    if (!profile.home_frequency_city) {
      renderPicker(profile);
    } else {
      await renderLetter(profile, session, user);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  document.addEventListener('glotemp:auth-changed', () => { mount(); });

  window.GlotempHomeFrequency = { mount };
})();
