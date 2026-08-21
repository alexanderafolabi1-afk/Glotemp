/* Glotemp: comment reactions.
 *
 * ONE component. City check-in lists, /feed and the homepage all render
 * the same markup from barHTML() and are wired by the same mount(), so a
 * reaction looks and behaves identically wherever a comment appears.
 *
 * THE THREE REACTIONS
 *   would_go  I'd go      intent
 *   been      I've been   verification
 *   tonight   Tonight     urgency
 * There is no negative reaction, deliberately: nothing here can be used
 * to push a comment down. Every glyph is inline SVG in brass -- no emoji
 * anywhere in the interface. Emoji a person typed inside their own
 * comment text are their words and are left exactly as written.
 *
 * THESE NUMBERS DO NOT FEED THE READINGS
 * Reactions are a resonance figure and nothing else. No mood score, no
 * band, no city ranking and no aggregate anywhere else on the site reads
 * this table -- this file is the only thing that queries it, and it
 * returns counts for display only. If a future change wants reactions to
 * influence a reading, that is a product decision to take deliberately,
 * not something to inherit by accident from here.
 *
 * SCHEMA
 * reactions(id, comment_id, user_id, type, created_at) already exists in
 * Supabase along with its RLS policies. Nothing here creates it.
 * comment_id points at observations.id -- the table behind every comment
 * surface on the site (city check-ins and /feed both read it).
 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  // Three distinct silhouettes, so the three read apart at 16px without
  // relying on their labels: a plane going somewhere, a flag planted, a
  // moon. Same stroke language as the check-in mood glyphs.
  var TYPES = [
    {
      key: 'would_go',
      label: "I'd go",
      title: 'I would go here',
      glyph: '<path d="M21.5 2.5 10.6 13.4"/><path d="M21.5 2.5 14.6 21.5 10.6 13.4 2.5 9.4z"/>',
    },
    {
      key: 'been',
      label: "I've been",
      title: 'I have been here',
      glyph: '<path d="M5.4 21.5V3"/><path d="M5.4 4.2h11.3l-2.4 3.4 2.4 3.4H5.4z"/>',
    },
    {
      key: 'tonight',
      label: 'Tonight',
      title: 'This is where tonight is',
      glyph: '<path d="M20.4 14.6A8.7 8.7 0 0 1 9.4 3.6 8.7 8.7 0 1 0 20.4 14.6z"/>',
    },
  ];

  var TYPE_KEYS = TYPES.map(function (t) { return t.key; });

  // Batch cap for the count query. A page shows tens of comments, never
  // thousands; anything past this is a bug upstream, and slicing is
  // better than sending a URL long enough to be rejected.
  var MAX_IDS = 60;

  // How many of a city's recent comments the intent board considers.
  var BOARD_SCAN = 200;
  var BOARD_TOP = 5;
  var BOARD_DAYS = 7;
  // Below this the board is not shown at all -- no heading, no empty
  // state, no gap. A "top five" drawn from two comments is not a ranking.
  var BOARD_MIN_ROWS = 3;

  // commentId -> { would_go: n, been: n, tonight: n }
  var counts = Object.create(null);
  // "commentId|type" for the signed-in user's own reactions.
  var mine = Object.create(null);
  // Ids whose counts have already been fetched, so re-mounting a list
  // (the feed refreshes on a timer) does not re-query what we hold.
  var known = Object.create(null);

  var wired = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // A real database id, not a seed placeholder. The homepage and /feed
  // both fall back to a static seed set when the table is empty; those
  // rows have no row to react to, so they get no reaction bar rather
  // than a bar wired to an id that does not exist.
  function isRealId(id) {
    return typeof id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  function anonHeaders() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      Accept: 'application/json',
    };
  }

  function authedHeaders(session) {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + (session ? session.access_token : SUPABASE_ANON_KEY),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  function zero() {
    return { would_go: 0, been: 0, tonight: 0 };
  }

  function countsFor(id) {
    return counts[id] || zero();
  }

  // The resonance figure: how much a comment moved people, full stop.
  // Exposed for display only -- see the header note about the readings.
  function resonanceFor(id) {
    var c = countsFor(id);
    return c.would_go + c.been + c.tonight;
  }

  // ---------- markup ----------

  function glyphSVG(type) {
    return '<svg class="gt-react-glyph" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      type.glyph + '</svg>';
  }

  function buttonHTML(commentId, type) {
    return '' +
      '<button type="button" class="gt-react" data-gt-react-btn ' +
             'data-comment="' + esc(commentId) + '" data-type="' + type.key + '" ' +
             'aria-pressed="false" title="' + esc(type.title) + '">' +
        '<span class="gt-react-mark">' +
          glyphSVG(type) +
          '<span class="gt-react-label">' + esc(type.label) + '</span>' +
        '</span>' +
        '<span class="gt-react-count" data-gt-count>0</span>' +
      '</button>';
  }

  // The bar for one comment. Returns '' for anything without a real row
  // behind it, so callers can drop this into a template unconditionally.
  function barHTML(commentId) {
    if (!isRealId(commentId)) return '';
    return '' +
      '<div class="gt-reactions" data-gt-react data-comment="' + esc(commentId) + '">' +
        '<div class="gt-reactions-set">' +
          TYPES.map(function (t) { return buttonHTML(commentId, t); }).join('') +
        '</div>' +
        // Quiet by design. The report count is never public and is never
        // rendered anywhere on this site.
        '<button type="button" class="gt-report" data-gt-report ' +
               'data-comment="' + esc(commentId) + '">Report</button>' +
      '</div>';
  }

  // ---------- reading counts ----------

  function idList(ids) {
    return '(' + ids.map(function (i) { return '"' + i + '"'; }).join(',') + ')';
  }

  // PostgREST 12 can group and count server-side, which gives exact
  // totals in one request. Where aggregates are turned off that query
  // 400s, so fall back to counting the rows here -- same answer, more
  // bytes. The fallback is capped, and a capped page says so by leaving
  // the count it could not complete rather than inventing one.
  //
  // Resolves true only if a count actually came back. mount() uses that
  // to decide whether these ids are settled: marking them settled on a
  // failed request would mean a feed that lost one refresh never asks
  // for those counts again.
  function fetchCounts(ids) {
    var url = SUPABASE_URL + '/rest/v1/reactions?select=comment_id,type,count()' +
      '&comment_id=in.' + encodeURIComponent(idList(ids));
    return fetch(url, { headers: anonHeaders() })
      .then(function (resp) {
        if (!resp.ok) throw new Error('aggregate unavailable');
        return resp.json();
      })
      .then(function (rows) {
        rows.forEach(function (r) {
          if (!counts[r.comment_id]) counts[r.comment_id] = zero();
          if (TYPE_KEYS.indexOf(r.type) !== -1) {
            counts[r.comment_id][r.type] = Number(r.count) || 0;
          }
        });
        return true;
      })
      .catch(function () {
        var raw = SUPABASE_URL + '/rest/v1/reactions?select=comment_id,type' +
          '&comment_id=in.' + encodeURIComponent(idList(ids)) + '&limit=5000';
        return fetch(raw, { headers: anonHeaders() })
          .then(function (resp) {
            if (!resp.ok) throw new Error('reactions unavailable');
            return resp.json();
          })
          .then(function (rows) {
            // This path tallies rather than assigns, so the ids being
            // asked about start from zero. Without that a second pass
            // over the same id would add its reactions to itself.
            ids.forEach(function (id) { counts[id] = zero(); });
            rows.forEach(function (r) {
              if (!counts[r.comment_id]) counts[r.comment_id] = zero();
              if (TYPE_KEYS.indexOf(r.type) !== -1) counts[r.comment_id][r.type] += 1;
            });
            return true;
          })
          .catch(function () { return false; });   // counts stay as held
      });
  }

  function fetchMine(ids) {
    if (!(window.GlotempAuth && GlotempAuth.isSignedIn())) return Promise.resolve();
    var user = GlotempAuth.getUser();
    if (!user) return Promise.resolve();
    return GlotempAuth.getSession().then(function (session) {
      if (!session) return;
      var url = SUPABASE_URL + '/rest/v1/reactions?select=comment_id,type' +
        '&user_id=eq.' + encodeURIComponent(user.id) +
        '&comment_id=in.' + encodeURIComponent(idList(ids));
      return fetch(url, { headers: authedHeaders(session) })
        .then(function (resp) { return resp.ok ? resp.json() : []; })
        .then(function (rows) {
          rows.forEach(function (r) { mine[r.comment_id + '|' + r.type] = true; });
        });
    }).catch(function () { /* signed-in state is repainted, not asserted */ });
  }

  // ---------- painting ----------

  function paintBar(bar) {
    var id = bar.getAttribute('data-comment');
    var c = countsFor(id);
    Array.prototype.forEach.call(bar.querySelectorAll('[data-gt-react-btn]'), function (btn) {
      var type = btn.getAttribute('data-type');
      var n = c[type] || 0;
      var on = !!mine[id + '|' + type];
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('is-on', on);
      // A zero count still shows: it is the invitation to be the first.
      var el = btn.querySelector('[data-gt-count]');
      if (el) el.textContent = String(n);
      btn.classList.toggle('is-zero', n === 0);
    });
  }

  function paintAll(root) {
    var scope = root || document;
    Array.prototype.forEach.call(scope.querySelectorAll('[data-gt-react]'), paintBar);
  }

  // ---------- writing ----------

  function rateLimited(body) {
    var msg = (body && (body.message || body.details || body.hint)) || '';
    return /react(ion)?s? (an hour|per hour)|rate limit|too many/i.test(msg);
  }

  function say(bar, message) {
    var note = bar.querySelector('.gt-react-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'gt-react-note';
      note.setAttribute('role', 'status');
      bar.appendChild(note);
    }
    note.textContent = message;
    if (bar._gtNoteTimer) clearTimeout(bar._gtNoteTimer);
    bar._gtNoteTimer = setTimeout(function () {
      if (note.parentNode) note.parentNode.removeChild(note);
    }, 6000);
  }

  function toggle(btn) {
    var bar = btn.closest('[data-gt-react]');
    var id = btn.getAttribute('data-comment');
    var type = btn.getAttribute('data-type');
    var key = id + '|' + type;
    var wasOn = !!mine[key];

    // Optimistic: the count moves now, before anything is sent. The
    // snapshot below is what it is rolled back to if the write fails --
    // taken before the change, not recomputed after it.
    var before = countsFor(id)[type] || 0;
    if (!counts[id]) counts[id] = zero();
    counts[id][type] = Math.max(0, before + (wasOn ? -1 : 1));
    mine[key] = !wasOn;
    paintBar(bar);

    function rollback(message) {
      counts[id][type] = before;
      mine[key] = wasOn;
      if (!wasOn) delete mine[key];
      paintBar(bar);
      if (message) say(bar, message);
    }

    GlotempAuth.getSession().then(function (session) {
      var user = GlotempAuth.getUser();
      if (!session || !user) { rollback('Sign in again to react.'); return null; }

      if (wasOn) {
        return fetch(
          SUPABASE_URL + '/rest/v1/reactions' +
            '?comment_id=eq.' + encodeURIComponent(id) +
            '&user_id=eq.' + encodeURIComponent(user.id) +
            '&type=eq.' + encodeURIComponent(type),
          { method: 'DELETE', headers: authedHeaders(session) }
        ).then(function (resp) {
          if (!resp.ok) rollback('That did not save. Try again.');
        });
      }

      return fetch(SUPABASE_URL + '/rest/v1/reactions', {
        method: 'POST',
        headers: Object.assign(authedHeaders(session), {
          // The table's unique key already makes a double-tap harmless;
          // this stops it being reported as an error.
          Prefer: 'resolution=ignore-duplicates,return=minimal',
        }),
        body: JSON.stringify({ comment_id: id, user_id: user.id, type: type }),
      }).then(function (resp) {
        if (resp.ok) return;
        return resp.json().catch(function () { return null; }).then(function (body) {
          rollback(rateLimited(body)
            ? 'You have reacted a lot in the last hour. Try again shortly.'
            : 'That did not save. Try again.');
        });
      });
    }).catch(function () {
      rollback('That did not save. Try again.');
    });
  }

  function report(btn) {
    var bar = btn.closest('[data-gt-react]');
    var id = btn.getAttribute('data-comment');
    btn.disabled = true;

    GlotempAuth.getSession().then(function (session) {
      var user = GlotempAuth.getUser();
      if (!session || !user) { btn.disabled = false; return null; }

      // The reports table already exists; its shape beyond comment_id
      // and user_id is not ours to assume. Send the fuller row, and on a
      // schema-cache rejection (PGRST204: no such column) send the
      // minimum instead rather than failing the report outright.
      function send(row) {
        return fetch(SUPABASE_URL + '/rest/v1/reports', {
          method: 'POST',
          headers: Object.assign(authedHeaders(session), {
            Prefer: 'resolution=ignore-duplicates,return=minimal',
          }),
          body: JSON.stringify(row),
        });
      }

      return send({ comment_id: id, user_id: user.id, reason: 'user_report' })
        .then(function (resp) {
          if (resp.ok) return resp;
          return resp.json().catch(function () { return null; }).then(function (body) {
            if (body && (body.code === 'PGRST204' || /column/i.test(body.message || ''))) {
              return send({ comment_id: id, user_id: user.id });
            }
            return resp;
          });
        })
        .then(function (resp) {
          if (resp && resp.ok) {
            // Acknowledged to the person who sent it, and to nobody
            // else. The number of reports on a comment is never shown.
            btn.textContent = 'Reported';
            btn.classList.add('is-done');
          } else {
            btn.disabled = false;
            say(bar, 'That report did not send. Try again.');
          }
        });
    }).catch(function () {
      btn.disabled = false;
      say(bar, 'That report did not send. Try again.');
    });
  }

  // ---------- wiring ----------

  // One delegated listener for the whole document, installed once. Lists
  // that re-render (the feed refreshes on a timer, city check-ins page
  // in) keep working without being re-wired.
  function wire() {
    if (wired) return;
    wired = true;

    document.addEventListener('click', function (e) {
      var reactBtn = e.target.closest && e.target.closest('[data-gt-react-btn]');
      if (reactBtn) {
        e.preventDefault();
        if (!window.GlotempAuth) return;
        if (!GlotempAuth.isSignedIn()) {
          GlotempAuth.requireAuth('Sign in to react to this.');
          return;
        }
        toggle(reactBtn);
        return;
      }
      var reportBtn = e.target.closest && e.target.closest('[data-gt-report]');
      if (reportBtn && !reportBtn.disabled) {
        e.preventDefault();
        if (!window.GlotempAuth) return;
        if (!GlotempAuth.isSignedIn()) {
          GlotempAuth.requireAuth('Sign in to report this.');
          return;
        }
        report(reportBtn);
      }
    });

    // Signing in mid-page: the counts are already right, but which ones
    // are the visitor's own is not known until now.
    document.addEventListener('glotemp:auth-changed', function () {
      mine = Object.create(null);
      var ids = visibleIds(document);
      if (!ids.length) { paintAll(document); return; }
      fetchMine(ids).then(function () { paintAll(document); });
    });
  }

  function visibleIds(root) {
    var out = [];
    var seen = Object.create(null);
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-gt-react]'), function (bar) {
      var id = bar.getAttribute('data-comment');
      if (id && !seen[id]) { seen[id] = true; out.push(id); }
    });
    return out.slice(0, MAX_IDS);
  }

  // Call after inserting comment markup. Fetches whatever it has not
  // seen before, then paints every bar in `root`.
  function mount(root) {
    wire();
    var scope = root || document;
    var all = visibleIds(scope);
    var fresh = all.filter(function (id) { return !known[id]; });
    // Paint immediately from what is already held, so a re-render never
    // flashes back to zero while the network catches up.
    paintAll(scope);
    if (!fresh.length) return Promise.resolve();
    return Promise.all([fetchCounts(fresh), fetchMine(fresh)])
      .then(function (results) {
        // Settled only if the counts actually arrived. A failed request
        // leaves these ids unknown so the next mount asks again.
        if (results[0]) fresh.forEach(function (id) { known[id] = true; });
        paintAll(scope);
      })
      .catch(function () { paintAll(scope); });
  }

  // ---------- the intent board ----------

  // "Where people want to go": this city's comments ranked by I'd go in
  // the last seven days. The window is on the reaction, not the comment
  // -- what is being measured is present-tense wanting, so an older
  // comment that people have been tapping this week belongs here.
  //
  // Returns the number of rows rendered. Zero means the section was left
  // out entirely: no heading, no empty state, no gap.
  function intentBoard(citySlug, host) {
    if (!citySlug || !host) return Promise.resolve(0);
    var since = new Date(Date.now() - BOARD_DAYS * 864e5).toISOString();

    return fetch(
      SUPABASE_URL + '/rest/v1/observations?city_slug=eq.' + encodeURIComponent(citySlug) +
        '&select=id,note,mood,is_anonymous,created_at,profiles(display_name)' +
        '&note=not.is.null&order=created_at.desc&limit=' + BOARD_SCAN,
      { headers: anonHeaders() }
    )
      .then(function (resp) { return resp.ok ? resp.json() : []; })
      .then(function (rows) {
        if (!rows.length) return 0;
        var byId = Object.create(null);
        rows.forEach(function (r) { byId[r.id] = r; });
        var ids = rows.map(function (r) { return r.id; });

        return fetch(
          SUPABASE_URL + '/rest/v1/reactions?select=comment_id&type=eq.would_go' +
            '&created_at=gte.' + encodeURIComponent(since) +
            '&comment_id=in.' + encodeURIComponent(idList(ids)) + '&limit=5000',
          { headers: anonHeaders() }
        )
          .then(function (resp) { return resp.ok ? resp.json() : []; })
          .then(function (reacts) {
            var tally = Object.create(null);
            reacts.forEach(function (r) {
              tally[r.comment_id] = (tally[r.comment_id] || 0) + 1;
            });
            var ranked = Object.keys(tally)
              .filter(function (id) { return byId[id] && tally[id] > 0; })
              .sort(function (a, b) {
                if (tally[b] !== tally[a]) return tally[b] - tally[a];
                return new Date(byId[b].created_at) - new Date(byId[a].created_at);
              });

            if (ranked.length < BOARD_MIN_ROWS) {
              host.innerHTML = '';
              host.hidden = true;
              return 0;
            }

            var top = ranked.slice(0, BOARD_TOP);
            host.hidden = false;
            host.innerHTML =
              '<h2 class="gt-intent-heading">Where people want to go</h2>' +
              '<p class="gt-intent-basis">Ranked by I\'d go &middot; last ' + BOARD_DAYS + ' days</p>' +
              '<ol class="gt-intent-list">' +
              top.map(function (id, i) {
                var row = byId[id];
                var name = row.is_anonymous ? 'Anonymous'
                  : ((row.profiles && row.profiles.display_name) || 'Anonymous');
                return '<li class="gt-intent-item">' +
                  '<span class="gt-intent-rank">' + (i + 1) + '</span>' +
                  '<div class="gt-intent-body">' +
                    '<p class="gt-intent-note">' + esc(row.note) + '</p>' +
                    '<p class="gt-intent-meta">' +
                      '<span class="gt-intent-name">' + esc(name) + '</span>' +
                      '<span class="gt-intent-score">' + tally[id] + ' would go</span>' +
                    '</p>' +
                    barHTML(id) +
                  '</div>' +
                '</li>';
              }).join('') +
              '</ol>';
            return mount(host).then(function () { return top.length; });
          });
      })
      .catch(function () {
        host.innerHTML = '';
        host.hidden = true;
        return 0;
      });
  }

  window.GlotempReactions = {
    TYPES: TYPES,
    barHTML: barHTML,
    mount: mount,
    paintAll: paintAll,
    countsFor: countsFor,
    resonanceFor: resonanceFor,
    intentBoard: intentBoard,
    isRealId: isRealId,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mount(document); });
  } else {
    mount(document);
  }
})();
