/* Glotemp measurement.
 *
 * Two halves, because one tool cannot do both:
 *
 * VISITORS -- Cloudflare Web Analytics. Chosen over Google Analytics
 * because it sets no cookies (so it sits outside the consent banner
 * entirely), weighs a few KB, and the domain is already on Cloudflare.
 *
 * EVENTS -- Cloudflare Web Analytics has no custom-event API, so installs,
 * standalone launches, prompt outcomes and check-ins cannot be sent to it.
 * They go to a Supabase table instead, which is where per-city check-in
 * counts belong anyway: that number is business data to be queried, not a
 * traffic metric. No separate dashboard is built for it.
 *
 * NOTHING HERE IDENTIFIES ANYONE. No cookie, no localStorage id, no
 * fingerprint, no IP recorded beyond what the request itself carries. That
 * is deliberate: it keeps the whole of this outside the scope of the
 * consent banner, so cookie-consent behaviour is unaffected.
 */
(function () {
  'use strict';

  // ---- config ----------------------------------------------------------
  // The one place to set this. Get it from Cloudflare dashboard >
  // Analytics & Logs > Web Analytics > the site > Manage site. Until it is
  // set, the beacon is not injected at all rather than injected broken.
  var CF_BEACON_TOKEN = '51d8eb74ae9f487cba20cac9950fd5e7';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  var EVENTS_TABLE = 'analytics_events';

  // ---- visitors --------------------------------------------------------
  function loadBeacon() {
    if (!CF_BEACON_TOKEN) return false;
    if (document.querySelector('script[data-cf-beacon]')) return true;
    var s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_BEACON_TOKEN }));
    document.head.appendChild(s);
    return true;
  }

  // ---- events ----------------------------------------------------------
  function displayMode() {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    // iOS Safari predates the display-mode media query for home-screen apps.
    if (window.navigator.standalone === true) return 'standalone';
    if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    return 'browser';
  }

  function send(name, props) {
    var body = {
      event: name,
      city_slug: (props && props.city_slug) || null,
      display_mode: displayMode(),
      // Path only. No query string, which is where anything identifying
      // would end up.
      path: window.location.pathname,
      props: (props && props.props) || null,
    };
    var url = SUPABASE_URL + '/rest/v1/' + EVENTS_TABLE;
    var payload = JSON.stringify(body);

    // keepalive rather than sendBeacon: the install and dismiss events fire
    // as someone leaves the page, and sendBeacon cannot set the apikey
    // header Supabase requires, so keepalive fetch is the only form that
    // both survives unload and authenticates.
    try {
      fetch(url, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: payload,
      }).catch(function () { /* measurement must never break a page */ });
    } catch (e) { /* same */ }
  }

  // ---- installs and returning users ------------------------------------
  function wireInstall() {
    // Was the prompt ever offered? Without this, "nobody installed" and
    // "nobody was asked" look identical in the data.
    window.addEventListener('beforeinstallprompt', function () {
      send('install_prompt_available');
    });

    window.addEventListener('appinstalled', function () {
      send('install');
    });

    // The outcome of a prompt the site itself triggered. app.js owns the
    // install banner and calls prompt(); it dispatches this so the choice
    // is recorded without this file reaching into its internals.
    window.addEventListener('glotemp:install-prompt-shown', function () {
      send('install_prompt_shown');
    });
    window.addEventListener('glotemp:install-prompt-outcome', function (e) {
      var outcome = (e && e.detail && e.detail.outcome) || 'unknown';
      send(outcome === 'accepted' ? 'install_prompt_accepted' : 'install_prompt_dismissed');
    });
  }

  // ---- check-ins -------------------------------------------------------
  // Per city, because the whole model rests on people representing their
  // own city, so growth has to be readable one city at a time.
  function wireCheckins() {
    window.addEventListener('glotemp:checkin', function (e) {
      send('checkin', { city_slug: (e && e.detail && e.detail.city) || null });
    });
  }

  function init() {
    loadBeacon();
    // One session-open event carries the display mode, which is what
    // separates home-screen launches from browser tabs.
    send('session', { props: { referrer: document.referrer ? 'external' : 'direct' } });
    wireInstall();
    wireCheckins();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.GlotempAnalytics = { track: send, displayMode: displayMode };
})();
