// Glotemp Time-Traveler Archive: a real per-day scrubber over
// city_signal_snapshots (see supabase/functions/city-signal-snapshot and
// its migration for exactly what gets stored and why). This is the same
// table city-why.js already reads for its one-line delta -- this module
// is the full view: every real stored field for whichever day the
// visitor scrubs to.
//
// The slider's range spans every calendar day between this city's first
// and most recent real snapshot. Most of those days do have a real row
// (the collector backfills one per real distinct day found in this
// city's own observation history, then appends one more each day it
// runs) -- but a day it happens to be missing (a cron gap, or a day
// before the city had a snapshot yet within that span) says so plainly:
// "No snapshot stored for this date." Never interpolated, never a
// neighboring day's numbers standing in for a day that has none.
//
// Whole section stays hidden if this city has zero real snapshot rows --
// same "nothing renders rather than an empty shell" rule as
// city-campus.js and glotemp-offers.js.
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  const TIMEOUT_MS = 6000;

  // Matches the mood keys glotemp-checkin.js actually writes to
  // observations.mood (see its own MOODS list). A mood key this map
  // doesn't recognize still renders -- title-cased as-is -- rather than
  // being dropped, since dropping a real stored value would be its own
  // kind of dishonesty.
  const MOOD_LABELS = { charged: 'Charged', warm: 'Warm', steady: 'Steady', restrained: 'Restrained', low: 'Low' };

  // Matches the real vertical keys this project's collectors currently
  // write into readings.vertical (checked live against the database
  // before writing this): fashion, finance, food, property, sport, tech,
  // work. Same title-case fallback as moods above for anything new.
  const VERTICAL_LABELS = {
    fashion: 'Fashion', finance: 'Finance', food: 'Food', property: 'Property',
    sport: 'Sport', tech: 'Tech', work: 'Work',
  };

  function titleCase(key) {
    return String(key || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function moodLabel(key) {
    return MOOD_LABELS[key] || titleCase(key);
  }

  function verticalLabel(key) {
    return VERTICAL_LABELS[key] || titleCase(key);
  }

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

  function fmtDate(dateStr) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }

  function daysBetween(a, b) {
    const ms = new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`);
    return Math.round(ms / 86400000);
  }

  function offsetToDate(baseDate, offset) {
    const d = new Date(`${baseDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  function renderSnapshot(row) {
    if (!row) {
      return '<p class="archive-empty">No snapshot stored for this date.</p>';
    }

    const parts = [];
    const n = row.observation_count || 0;
    parts.push(`<p class="archive-stat"><strong>${n}</strong> real reading${n === 1 ? '' : 's'} logged as of this day.</p>`);

    if (typeof row.avg_intensity === 'number') {
      parts.push(`<p class="archive-stat">Average intensity <strong>${esc(row.avg_intensity)}</strong> / 10.</p>`);
    }

    const moods = Object.entries(row.mood_counts || {}).sort((a, b) => b[1] - a[1]);
    if (moods.length) {
      parts.push(
        '<p class="archive-moods">' +
        moods.map(([k, c]) => `<span class="archive-mood-chip">${esc(moodLabel(k))} &middot; ${esc(c)}</span>`).join(' ') +
        '</p>',
      );
    }

    const deeper = Object.entries(row.deeper_signals || {});
    if (deeper.length) {
      parts.push(
        '<ul class="archive-deeper-list">' +
        deeper.map(([vert, sig]) => {
          const val = sig && sig.value != null ? esc(sig.value) : 'n/a';
          const metric = sig && sig.metric ? esc(sig.metric).replace(/_/g, ' ') : '';
          const source = sig && sig.source ? esc(sig.source) : '';
          return `<li><strong>${esc(verticalLabel(vert))}:</strong> ${val}${metric ? ` ${metric}` : ''}${source ? ` <span class="archive-source">&middot; ${source}</span>` : ''}</li>`;
        }).join('') +
        '</ul>',
      );
    }

    if (!parts.length) {
      return '<p class="archive-empty">A snapshot exists for this date but stored no real values yet.</p>';
    }
    return parts.join('');
  }

  async function loadCityArchive(citySlug) {
    const section = document.getElementById('city-archive-section');
    if (!section || !citySlug) return;

    const rows = await fetchJSON(
      `city_signal_snapshots?city_slug=eq.${encodeURIComponent(citySlug)}` +
      `&select=snapshot_date,observation_count,avg_intensity,mood_counts,deeper_signals&order=snapshot_date.asc`,
    );
    if (!Array.isArray(rows) || rows.length === 0) return;

    const byDate = {};
    rows.forEach((r) => { byDate[r.snapshot_date] = r; });
    const firstDate = rows[0].snapshot_date;
    const lastDate = rows[rows.length - 1].snapshot_date;
    const totalDays = Math.max(0, daysBetween(firstDate, lastDate));

    const slider = document.getElementById('city-archive-slider');
    const dateLabel = document.getElementById('city-archive-date');
    const rangeLabel = document.getElementById('city-archive-range');
    const panel = document.getElementById('city-archive-panel');
    const prevBtn = document.getElementById('city-archive-prev');
    const nextBtn = document.getElementById('city-archive-next');
    if (!slider || !dateLabel || !panel || !prevBtn || !nextBtn) return;

    slider.min = '0';
    slider.max = String(totalDays);
    slider.value = String(totalDays);
    slider.disabled = false;

    if (rangeLabel) {
      rangeLabel.textContent = totalDays > 0
        ? `${fmtDate(firstDate)} – ${fmtDate(lastDate)}`
        : fmtDate(firstDate);
    }

    function render() {
      const offset = Number(slider.value);
      const dateStr = offsetToDate(firstDate, offset);
      dateLabel.textContent = fmtDate(dateStr);
      panel.innerHTML = renderSnapshot(byDate[dateStr]);
      prevBtn.disabled = offset <= 0;
      nextBtn.disabled = offset >= totalDays;
    }

    slider.addEventListener('input', render);
    prevBtn.addEventListener('click', () => {
      slider.value = String(Math.max(0, Number(slider.value) - 1));
      render();
    });
    nextBtn.addEventListener('click', () => {
      slider.value = String(Math.min(totalDays, Number(slider.value) + 1));
      render();
    });

    render();
    section.hidden = false;
  }

  window.GlotempArchive = { loadCityArchive };
})();
