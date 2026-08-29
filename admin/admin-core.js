// Glotemp Admin: shared auth, data-access and rendering helpers used by
// every page under /admin/. Factored out of what used to be one long
// inline script in admin/index.html when the dashboard was a single page
// -- now that it is five real pages (see admin-nav.js), each page's own
// inline script only needs to define what its OWN panels render and
// which endpoints they need; everything else lives here once.
//
// This page holds no secret of its own. Access is decided by the
// database: every function it calls refuses to run unless
// profiles.is_admin is true for the signed-in user. Reading this source
// tells an attacker nothing they can use.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function rpc(fn, args) {
    var session = await GlotempAuth.getSession();
    if (!session) throw new Error('no session');
    var resp = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args || {}),
    });
    if (!resp.ok) throw new Error(fn + ' ' + resp.status);
    return resp.json();
  }

  // Plain PostgREST table access -- RLS-gated to is_admin() (see
  // 20260820150500_admin_outreach_leads.sql and similar), not an RPC.
  // There is no raw-row-exposure concern the way there is for
  // profiles/analytics_events: these tables hold no user data the admin
  // didn't type in themselves, so a policy is the right amount of
  // machinery rather than a dedicated function per table.
  async function restTable(method, path, body) {
    var session = await GlotempAuth.getSession();
    if (!session) throw new Error('no session');
    var headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + session.access_token,
      'Content-Type': 'application/json',
    };
    if (method !== 'GET') headers.Prefer = 'return=representation';
    var resp = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) throw new Error(path + ' ' + resp.status);
    return resp.json();
  }

  function cityName(slug) {
    var rec = (window.CITIES_DATA || []).find(function (c) { return c.slug === slug; });
    return rec ? rec.name : slug;
  }
  function ago(iso) {
    if (!iso) return '';
    var mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return mins + 'm ago';
    var h = Math.floor(mins / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  var t = function (k, f) { return (window.AdminI18n ? window.AdminI18n.t : function (k2, f2) { return f2; })(k, f); };
  function tierLabel(tier) {
    if (tier === 'voice') return t('adm_tier_voice', 'Voice');
    if (tier === 'keeper') return t('adm_tier_keeper', 'Keeper');
    if (tier === 'founder') return t('adm_tier_founder', 'Founder');
    return tier || '';
  }
  var LEAD_STATUSES = ['not_contacted', 'contacted', 'replied', 'closed'];
  function leadStatusLabel(status) {
    return t('adm_outreach_status_' + status, status);
  }

  // ---------- collapsible panels ----------
  // Each panel remembers whether it was left collapsed, per browser.
  // Keyed by panel id, shared across every /admin/ page (same origin,
  // same localStorage), so a panel left collapsed on one page stays
  // collapsed if it is ever revisited.
  var PANEL_STORE_KEY = 'glotemp:admin-panels:v1';
  function readPanelState() {
    try { return JSON.parse(localStorage.getItem(PANEL_STORE_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function isPanelCollapsed(id) { return readPanelState()[id] === true; }
  function setPanelCollapsed(id, collapsed) {
    var s = readPanelState();
    if (collapsed) s[id] = true; else delete s[id];
    try { localStorage.setItem(PANEL_STORE_KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
  }

  function panel(id, heading, note, body) {
    var collapsed = isPanelCollapsed(id);
    return '<section class="adm-panel' + (collapsed ? ' is-collapsed' : '') + '" aria-labelledby="' + id + '" data-panel="' + id + '">' +
      '<div class="adm-panel-head">' +
        '<div class="adm-panel-title">' +
          '<button type="button" class="adm-panel-toggle" data-panel-toggle="' + id + '" ' +
            'aria-expanded="' + (!collapsed) + '" aria-controls="' + id + '-body">' +
            '<span class="adm-panel-toggle-bars" aria-hidden="true"></span>' +
            '<span class="sr-only">' + (collapsed ? 'Expand' : 'Collapse') + ' ' + esc(heading) + '</span>' +
          '</button>' +
          '<h2 class="adm-h2" id="' + id + '">' + esc(heading) + '</h2>' +
        '</div>' +
        (note ? '<p class="adm-panel-note">' + esc(note) + '</p>' : '') +
      '</div>' +
      '<div class="adm-panel-collapse"><div class="adm-panel-body" id="' + id + '-body">' + body + '</div></div>' +
    '</section>';
  }

  // Wires every collapse toggle found under `root`. Call once after each
  // render -- innerHTML replacement means there is nothing stale to
  // unbind first.
  function wirePanelToggles(root) {
    root.querySelectorAll('[data-panel-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-panel-toggle');
        var section = btn.closest('.adm-panel');
        if (!section) return;
        var collapsed = !section.classList.contains('is-collapsed');
        section.classList.toggle('is-collapsed', collapsed);
        btn.setAttribute('aria-expanded', String(!collapsed));
        var heading = section.querySelector('.adm-h2');
        var label = btn.querySelector('.sr-only');
        if (label) label.textContent = (collapsed ? 'Expand ' : 'Collapse ') + (heading ? heading.textContent : 'panel');
        setPanelCollapsed(id, collapsed);
      });
    });
  }

  // ---------- range picker ----------
  // A local, per-page 1/7/30 control -- now that each page owns only its
  // own data load, "days" is page-local state rather than one value
  // shared across the whole former single-page dashboard.
  function rangeHTML(days) {
    return '<div class="adm-range" role="group" aria-label="Range">' +
      [1, 7, 30].map(function (d) {
        return '<button type="button" data-days="' + d + '" aria-pressed="' + (d === days) + '">' +
          (d === 1 ? 'Today' : 'Last ' + d + ' days') + '</button>';
      }).join('') +
    '</div>';
  }
  function wireRange(root, onChange) {
    root.querySelectorAll('.adm-range button').forEach(function (b) {
      b.addEventListener('click', function () {
        onChange(Number(b.getAttribute('data-days')) || 7);
      });
    });
  }

  // ---------- shared page states ----------
  function stateHTML(eyebrow, title, body) {
    return '<p class="adm-eyebrow">' + esc(eyebrow) + '</p><h1 class="adm-title">' + esc(title) + '</h1>' + (body || '');
  }

  function renderSignedOut(root, onSignedIn) {
    root.innerHTML = stateHTML('Admin', 'Sign in to continue.',
      '<p class="adm-copy">Enter your email and password.</p>' +
      '<form id="adm-signin-form">' +
        '<label class="adm-label" for="adm-email">Email</label>' +
        '<input class="adm-input" type="email" id="adm-email" placeholder="you@example.com" required autocomplete="email">' +
        '<label class="adm-label" for="adm-password">Password</label>' +
        '<input class="adm-input" type="password" id="adm-password" required autocomplete="current-password">' +
        '<p><button class="adm-action" type="submit" id="adm-submit">Sign in</button></p>' +
      '</form>' +
      '<p class="adm-status" id="adm-status" role="status" aria-live="polite"></p>'
    );
    document.getElementById('adm-signin-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = document.getElementById('adm-email').value.trim();
      var password = document.getElementById('adm-password').value;
      var status = document.getElementById('adm-status');
      var btn = document.getElementById('adm-submit');
      if (!email || !password || btn.disabled) return;
      status.textContent = 'Signing in...';
      btn.disabled = true;
      try {
        await GlotempAuth.signInWithPassword(email, password);
        await onSignedIn();
      } catch (err) {
        status.textContent = (err && err.friendly) || 'Could not sign in. Try again shortly.';
      } finally {
        btn.disabled = false;
      }
    });
  }

  function wireSignOut(root, onSignedOut) {
    var out = root.querySelector('#adm-signout');
    if (out) out.addEventListener('click', function (e) {
      e.preventDefault(); GlotempAuth.signOut(); onSignedOut();
    });
  }

  function renderNotAdmin(root, onSignedOut) {
    root.innerHTML = stateHTML('Admin', 'This account is not an admin.',
      '<p style="margin-top:1.5rem"><a class="adm-action" href="/">Back to Glotemp</a>' +
      '<a class="adm-secondary" href="#" id="adm-signout">Sign out</a></p>'
    );
    wireSignOut(root, onSignedOut);
  }

  function renderFailed(root, msg) {
    root.innerHTML = stateHTML('Admin', 'Could not load that.',
      '<p class="adm-copy">' + esc(msg) + '</p>' +
      '<p><button class="adm-action" type="button" onclick="location.reload()">Try again</button></p>'
    );
  }

  // The one entry point every page calls. `loadPage(root)` is the page's
  // own data-fetch + render -- called only once sign-in and is_admin are
  // both confirmed. Re-entrant: signing in from the signed-out state, or
  // retrying after a load failure, re-runs this from the top rather than
  // needing its own separate path.
  async function boot(root, loadPage) {
    if (!window.GlotempAuth) { renderFailed(root, 'Sign-in did not load.'); return; }
    if (!GlotempAuth.isSignedIn()) { renderSignedOut(root, function () { return boot(root, loadPage); }); return; }
    var isAdmin;
    try {
      isAdmin = await rpc('is_admin', {});
    } catch (err) {
      renderNotAdmin(root, function () { return boot(root, loadPage); });
      return;
    }
    if (isAdmin !== true) { renderNotAdmin(root, function () { return boot(root, loadPage); }); return; }
    try {
      await loadPage(root);
    } catch (err) {
      // The functions raise "not authorised" for a signed-in non-admin,
      // which PostgREST returns as a 4xx. A database that has not had a
      // given migration applied yet must degrade to an empty panel
      // wherever a page's own load() already catches per-call, so
      // reaching here means something the page could not itself recover
      // from -- log the real reason, since "could not be read" alone is
      // impossible to diagnose from a screenshot.
      console.error('[admin] page load failed:', (err && err.stack) || err);
      renderFailed(root, 'The numbers could not be read. Sign out and back in, then try again.');
    }
  }

  window.GlotempAdminCore = {
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    esc: esc,
    ago: ago,
    cityName: cityName,
    tierLabel: tierLabel,
    leadStatusLabel: leadStatusLabel,
    LEAD_STATUSES: LEAD_STATUSES,
    rpc: rpc,
    restTable: restTable,
    panel: panel,
    isPanelCollapsed: isPanelCollapsed,
    setPanelCollapsed: setPanelCollapsed,
    wirePanelToggles: wirePanelToggles,
    rangeHTML: rangeHTML,
    wireRange: wireRange,
    stateHTML: stateHTML,
    renderSignedOut: renderSignedOut,
    renderNotAdmin: renderNotAdmin,
    renderFailed: renderFailed,
    wireSignOut: wireSignOut,
    boot: boot,
  };
})();
