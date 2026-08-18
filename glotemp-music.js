// The music layer, rendered into the Entertainment vertical.
//
// READS STORED DATA ONLY. Every third-party call happens server side on a
// schedule (supabase/functions/music-sync). This file talks to Supabase
// RPCs and nothing else, so a page load never waits on Radio Browser,
// MusicBrainz or Ticketmaster, and their rate limits are irrelevant to
// how fast the page paints.
//
// NOT LAST.FM anywhere in this stack. Non-commercial licence, and this
// site carries advertising.
//
// NO SPINNERS, NO EMPTY STATES. A block with no data does not render at
// all. Nothing announces its own absence, because a city whose stations
// happen to send no metadata is not an error and should not look like one.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  var TIMEOUT_MS = 5000;
  var REFRESH_MS = 60000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ago(iso) {
    if (!iso) return '';
    var mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var h = Math.floor(mins / 60);
    return h + 'h ago';
  }

  function when(iso) {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso));
    } catch (e) { return ''; }
  }

  // Five seconds, then give up. A hung request must never leave the page
  // waiting on it.
  function rpc(fn, args) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : null;
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(args || {}),
      signal: ctl ? ctl.signal : undefined,
    }).then(function (r) {
      if (!r.ok) throw new Error(fn + ' ' + r.status);
      return r.json();
    }).then(function (d) {
      return Array.isArray(d) ? d : [];
    }).catch(function () {
      return [];
    }).then(function (v) {
      if (timer) clearTimeout(timer);
      return v;
    });
  }

  // ---------- blocks ----------
  function nowPlayingHTML(cityName, rows) {
    if (!rows.length) return '';
    return '<section class="music-block music-now">' +
      '<h3 class="music-h">Now on air in ' + esc(cityName) + '</h3>' +
      '<ul class="music-list" id="music-now-list">' +
        rows.map(function (r) {
          return '<li class="music-now-row">' +
            '<span class="music-track">' + esc(r.title || r.raw) + '</span>' +
            (r.artist ? '<span class="music-artist">' + esc(r.artist) + '</span>' : '') +
            '<span class="music-meta">' + esc(r.station_name) +
              '<span class="music-when">' + esc(ago(r.seen_at)) + '</span></span>' +
          '</li>';
        }).join('') +
      '</ul></section>';
  }

  function fromCityHTML(cityName, rows) {
    if (!rows.length) return '';
    return '<section class="music-block">' +
      '<h3 class="music-h">From this city</h3>' +
      '<ul class="music-list">' +
        rows.map(function (a) {
          return '<li class="music-row">' +
            '<span class="music-name">' + esc(a.name) + '</span>' +
            '<span class="music-sub">' +
              (a.begin_year ? esc(a.begin_year) : '') +
              (a.genre ? (a.begin_year ? ', ' : '') + esc(a.genre) : '') +
            '</span></li>';
        }).join('') +
      '</ul></section>';
  }

  function eventsHTML(rows) {
    if (!rows.length) return '';
    return '<section class="music-block">' +
      '<h3 class="music-h">Playing live</h3>' +
      '<ul class="music-list">' +
        rows.map(function (e) {
          // sponsored, because these carry an affiliate parameter where the
          // partner provides one. Declaring it is not optional.
          var label = esc(e.artist) + (e.venue ? ', ' + esc(e.venue) : '');
          var inner = /^https?:\/\//i.test(e.url || '')
            ? '<a href="' + esc(e.url) + '" target="_blank" rel="noopener sponsored">' + label + '</a>'
            : label;
          return '<li class="music-row"><span class="music-name">' + inner + '</span>' +
            '<span class="music-sub">' + esc(when(e.starts_at)) + '</span></li>';
        }).join('') +
      '</ul></section>';
  }

  function rotationHTML(rows) {
    if (!rows.length) return '';
    return '<section class="music-block">' +
      '<h3 class="music-h">The rotation board</h3>' +
      '<p class="music-method">Based on local radio airplay, last 7 days. ' +
      'Counted from what this city\'s stations actually broadcast, one play per station per track per hour. ' +
      'Movement is the change in rank against the previous 7 days. Not editorial, not paid.</p>' +
      '<ol class="music-chart">' +
        rows.map(function (r) {
          var mv = r.is_new ? '<span class="music-mv music-mv-new">new</span>'
            : r.movement > 0 ? '<span class="music-mv music-mv-up">+' + esc(r.movement) + '</span>'
            : r.movement < 0 ? '<span class="music-mv music-mv-down">' + esc(r.movement) + '</span>'
            : '<span class="music-mv">hold</span>';
          return '<li class="music-chart-row">' +
            '<span class="music-name">' + esc(r.artist) + '</span>' + mv +
            '<span class="music-sub">' + esc(r.plays) + ' plays</span></li>';
        }).join('') +
      '</ol></section>';
  }

  function risingHTML(rows) {
    if (!rows.length) return '';
    return '<section class="music-block">' +
      '<h3 class="music-h">Rising</h3>' +
      '<p class="music-method">Fastest growing airplay worldwide, this week against last. ' +
      'The cities named are the ones driving it.</p>' +
      '<ol class="music-chart">' +
        rows.map(function (r) {
          var driving = (r.driving_cities || []).map(function (s) {
            return String(s).replace(/-/g, ' ');
          }).join(', ');
          return '<li class="music-chart-row">' +
            '<span class="music-name">' + esc(r.artist) + '</span>' +
            '<span class="music-mv music-mv-up">x' + esc(r.growth) + '</span>' +
            '<span class="music-sub">' + esc(driving) + '</span></li>';
        }).join('') +
      '</ol></section>';
  }

  // The sponsor slot reads from partners like every other placement. It is
  // rendered after the boards and has no input into them: nothing here is
  // passed to any of the RPCs above, and the boards are computed in SQL
  // from airplay alone.
  function sponsorHTML(rows) {
    if (!rows.length) return '';
    var p = rows[0];
    var inner = '<span class="music-sponsor-name">' + esc(p.name) + '</span>' +
      (p.tagline ? '<span class="music-sponsor-line">' + esc(p.tagline) + '</span>' : '');
    return '<aside class="music-sponsor">' +
      '<p class="music-sponsor-label">Presented by</p>' +
      (/^https?:\/\//i.test(p.url || '')
        ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener sponsored">' + inner + '</a>'
        : inner) +
      '</aside>';
  }

  function partners(citySlug) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : null;
    var url = SUPABASE_URL + '/rest/v1/partners' +
      '?select=name,url,tagline&vertical=eq.entertainment' +
      '&city_slug=eq.' + encodeURIComponent(citySlug) + '&limit=1';
    return fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
      signal: ctl ? ctl.signal : undefined,
    }).then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (v) { if (timer) clearTimeout(timer); return Array.isArray(v) ? v : []; });
  }

  // ---------- mount ----------
  var refreshTimer = null;
  var current = null;

  function refreshNowPlaying() {
    if (!current || document.hidden) return;
    rpc('music_now_playing', { p_city_slug: current.slug, p_limit: 6 }).then(function (rows) {
      var list = document.getElementById('music-now-list');
      if (!list || !rows.length) return;
      // Only the list is replaced, never the heading, so the block does
      // not flicker and nothing shifts.
      var html = nowPlayingHTML(current.name, rows);
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      var fresh = tmp.querySelector('#music-now-list');
      if (fresh) list.innerHTML = fresh.innerHTML;
    });
  }

  async function mount(citySlug, cityName) {
    var host = document.getElementById('entertainment-music');
    if (!host || !citySlug) return;
    current = { slug: citySlug, name: cityName || citySlug };

    var results = await Promise.all([
      rpc('music_now_playing', { p_city_slug: citySlug, p_limit: 6 }),
      rpc('music_from_city', { p_city_slug: citySlug, p_limit: 8 }),
      rpc('music_events', { p_city_slug: citySlug, p_limit: 8 }),
      rpc('music_rotation', { p_city_slug: citySlug, p_limit: 10 }),
      rpc('music_rising', { p_limit: 10 }),
      partners(citySlug),
    ]);

    var html =
      nowPlayingHTML(current.name, results[0]) +
      rotationHTML(results[3]) +
      risingHTML(results[4]) +
      fromCityHTML(current.name, results[1]) +
      eventsHTML(results[2]) +
      sponsorHTML(results[5]);

    // Nothing at all rather than a shell with headings and no content.
    if (!html) return;
    host.innerHTML = '<div class="music-panel">' + html + '</div>';

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(refreshNowPlaying, REFRESH_MS);
    // A background tab should not poll. Coming back refreshes at once so
    // the reader never sees a stale minute.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refreshNowPlaying();
    });
  }

  window.GlotempMusic = { mount: mount };
})();
