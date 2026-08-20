// Glotemp daily check-in ritual + streak display (Step 2).
// Mounts into #daily-checkin-root. One personal check-in per calendar day.
// Complements (does not replace) the per-city check-in in glotemp-checkin.js.
(function () {
  const MOODS = [
    { key: 'charged', label: 'Charged' },
    { key: 'warm', label: 'Warm' },
    { key: 'steady', label: 'Steady' },
    { key: 'restrained', label: 'Restrained' },
    { key: 'low', label: 'Low' },
  ];
  const NOTE_MAX = 280;
  const DEFAULT_MOOD = 'warm';

  const HARD_BLOCK = [
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'chink', 'spic',
    'kike', 'gook', 'tranny', 'coon', 'kill yourself', 'kys', 'rape you',
  ];
  const NEGATIVE_PHRASES = [
    'everything sucks', 'this city is dead', 'hate this place', 'worst day',
    'i hate', 'want to die', 'kill myself', 'nothing matters', 'life is pointless',
  ];

  function moderateNote(text) {
    if (!text) return { ok: true };
    const lower = text.toLowerCase();
    for (const w of HARD_BLOCK) {
      if (lower.indexOf(w) !== -1) {
        return { ok: false, message: 'That cannot be posted. Please keep the daily ritual constructive.' };
      }
    }
    for (const p of NEGATIVE_PHRASES) {
      if (lower.indexOf(p) !== -1) {
        return { ok: false, message: 'We keep this ritual constructive. Try naming one true, steady thing you noticed today.' };
      }
    }
    return { ok: true };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function authHeaders(session) {
    return {
      apikey: GlotempAuth.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + session.access_token,
      'Content-Type': 'application/json',
    };
  }

  let selectedMood = DEFAULT_MOOD;
  let root = null;

  function todayUTC() {
    return new Date().toISOString().slice(0, 10);
  }

  async function fetchTodayCheckin(session) {
    const user = GlotempAuth.getUser();
    if (!user) return null;
    const url = GlotempAuth.SUPABASE_URL + '/rest/v1/daily_checkins'
      + '?user_id=eq.' + encodeURIComponent(user.id)
      + '&checkin_date=eq.' + encodeURIComponent(todayUTC())
      + '&select=mood,note,checkin_date&limit=1';
    try {
      const resp = await fetch(url, { headers: authHeaders(session) });
      if (!resp.ok) return null;
      const rows = await resp.json();
      return rows && rows[0] ? rows[0] : null;
    } catch (_) {
      return null;
    }
  }

  async function fetchProfileStats(session) {
    try {
      const profile = await GlotempAuth.fetchProfile();
      if (!profile) return { current_streak: 0, longest_streak: 0, total_daily_checkins: 0 };
      return {
        current_streak: profile.current_streak || 0,
        longest_streak: profile.longest_streak || 0,
        total_daily_checkins: profile.total_daily_checkins || 0,
        last_daily_checkin: profile.last_daily_checkin || null,
        reporter_tier: profile.reporter_tier || null,
      };
    } catch (_) {
      return { current_streak: 0, longest_streak: 0, total_daily_checkins: 0, reporter_tier: null };
    }
  }

  function renderSignedOut() {
    root.innerHTML = `
      <div class="daily-checkin-card">
        <p class="daily-checkin-eyebrow">Daily ritual</p>
        <h2 class="daily-checkin-title">How does the world feel to you today?</h2>
        <p class="daily-checkin-copy">One quiet check-in a day. Build a streak of noticing. Sign in to begin.</p>
        <button type="button" class="btn-neon daily-checkin-signin" id="daily-checkin-signin">Begin the ritual</button>
        <p class="daily-checkin-founding-note">Founding Voices — the earliest contributors to your city's pulse get first access as our sponsor rewards roll out: hotel stays, vouchers, partner perks. Check in today, be first in line.</p>
      </div>`;
    const btn = document.getElementById('daily-checkin-signin');
    if (btn) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.classList.add('is-loading');
        try {
          const ok = await GlotempAuth.requireAuth('Sign in to begin your daily check-in ritual.');
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

  function renderAlreadyDone(checkin, stats) {
    const moodLabel = (MOODS.find(m => m.key === checkin.mood) || {}).label || checkin.mood;
    const streak = stats.current_streak || 0;
    const streakLine = streak === 1 ? '1 day of noticing' : streak + ' days of noticing';
    const reporterPanel = (window.GlotempReporter && stats.reporter_tier)
      ? GlotempReporter.panelHTML(stats.reporter_tier) : '';
    root.innerHTML = `
      <div class="daily-checkin-card daily-checkin-done">
        <p class="daily-checkin-eyebrow">Today’s pulse</p>
        <h2 class="daily-checkin-title">Recorded.</h2>
        <p class="daily-checkin-mood-line"><span class="daily-checkin-mood-label">${esc(moodLabel)}</span></p>
        ${checkin.note ? `<p class="daily-checkin-note-echo">“${esc(checkin.note)}”</p>` : ''}
        <p class="daily-checkin-streak">${esc(streakLine)}</p>
        ${reporterPanel}
        <p class="daily-checkin-copy subtle">Return tomorrow. The ritual is the point.</p>
      </div>`;
  }

  function renderForm(stats) {
    const moodBtns = MOODS.map(m => `
      <button type="button" class="daily-mood-btn" data-mood="${m.key}"
        aria-pressed="${m.key === selectedMood ? 'true' : 'false'}">
        <span class="daily-mood-label">${esc(m.label)}</span>
      </button>`).join('');

    const streak = stats.current_streak || 0;
    const streakHint = streak > 0
      ? (streak === 1 ? '1 day so far. Keep the chain.' : streak + ' days so far. Keep the chain.')
      : 'Your first day begins here.';

    root.innerHTML = `
      <div class="daily-checkin-card">
        <p class="daily-checkin-eyebrow">Daily ritual</p>
        <h2 class="daily-checkin-title">How does the world feel to you today?</h2>
        <p class="daily-checkin-streak-hint">${esc(streakHint)}</p>
        <form id="daily-checkin-form" class="daily-checkin-form">
          <div class="daily-moods" role="group" aria-label="Mood">
            ${moodBtns}
          </div>
          <label class="daily-note-label" for="daily-checkin-note">
            <span>One true thing you noticed</span>
            <span class="daily-note-count" id="daily-note-count">0/${NOTE_MAX}</span>
          </label>
          <textarea id="daily-checkin-note" class="daily-checkin-note" maxlength="${NOTE_MAX}"
            rows="3" placeholder="A café was full. The light was kind. The streets were quiet."></textarea>
          <div class="daily-checkin-actions">
            <button type="submit" class="btn-neon daily-checkin-submit" id="daily-checkin-submit">Record today</button>
            <span class="daily-checkin-status" id="daily-checkin-status" role="status" aria-live="polite"></span>
          </div>
        </form>
        <p class="daily-checkin-founding-note">Founding Voices — the earliest contributors to your city's pulse get first access as our sponsor rewards roll out: hotel stays, vouchers, partner perks. Check in today, be first in line.</p>
      </div>`;

    document.querySelectorAll('.daily-mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.daily-mood-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        selectedMood = btn.getAttribute('data-mood');
      });
    });

    const note = document.getElementById('daily-checkin-note');
    const count = document.getElementById('daily-note-count');
    if (note && count) {
      note.addEventListener('input', () => {
        count.textContent = note.value.length + '/' + NOTE_MAX;
      });
    }

    const form = document.getElementById('daily-checkin-form');
    if (form) form.addEventListener('submit', onSubmit);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const status = document.getElementById('daily-checkin-status');
    const submitBtn = document.getElementById('daily-checkin-submit');
    const noteEl = document.getElementById('daily-checkin-note');
    const text = (noteEl && noteEl.value || '').trim();

    const verdict = moderateNote(text);
    if (!verdict.ok) {
      if (status) status.textContent = verdict.message;
      return;
    }

    const ok = await GlotempAuth.requireAuth('Sign in to record today’s check-in.');
    if (!ok) return;
    const session = await GlotempAuth.getSession();
    if (!session) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.classList.add('is-loading');
    }
    if (status) status.textContent = 'Recording…';

    try {
      const resp = await fetch(
        GlotempAuth.SUPABASE_URL + '/rest/v1/rpc/record_daily_checkin',
        {
          method: 'POST',
          headers: authHeaders(session),
          body: JSON.stringify({ p_mood: selectedMood, p_note: text || null }),
        }
      );
      if (!resp.ok) {
        const errText = await resp.text();
        if (errText.indexOf('already_checked_in_today') !== -1) {
          if (status) status.textContent = 'You have already checked in today.';
          await mount();
          return;
        }
        throw new Error('rpc failed ' + resp.status);
      }
      const stats = await resp.json();
      if (status) status.textContent = 'Recorded.';
      // Announced rather than handled here, so the hero instrument (or
      // anything else) can react without this file knowing who's
      // listening -- same pattern as glotemp-checkin.js's own
      // glotemp:checkin event.
      window.dispatchEvent(new CustomEvent('glotemp:daily-checkin', {
        detail: { mood: selectedMood, streak: stats.current_streak || 0 },
      }));
      setTimeout(() => {
        renderAlreadyDone(
          { mood: selectedMood, note: text, checkin_date: stats.checkin_date },
          stats
        );
      }, 400);
    } catch (err) {
      if (status) status.textContent = 'Could not record. Please try again.';
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function mount() {
    root = document.getElementById('daily-checkin-root');
    if (!root) return;
    if (typeof GlotempAuth === 'undefined') {
      root.innerHTML = '<p class="daily-checkin-copy">Sign-in is unavailable right now.</p>';
      return;
    }

    const signedIn = await GlotempAuth.isSignedIn();
    if (!signedIn) {
      renderSignedOut();
      return;
    }

    const session = await GlotempAuth.getSession();
    if (!session) {
      renderSignedOut();
      return;
    }

    const [today, stats] = await Promise.all([
      fetchTodayCheckin(session),
      fetchProfileStats(session),
    ]);

    if (today) {
      renderAlreadyDone(today, stats);
    } else {
      renderForm(stats);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.GlotempDailyCheckin = { mount };
})();
