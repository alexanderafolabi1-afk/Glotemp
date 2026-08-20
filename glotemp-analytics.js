/* Glotemp measurement.
 *
 * SELF-HOSTED, COOKIELESS, AGGREGATE ONLY
 * Page views and events both go to Glotemp's own infrastructure. There is
 * no third-party tracker on this site: the Cloudflare Web Analytics beacon
 * this file used to inject has been removed, so no request leaves for
 * anyone else's servers and no other company sees this traffic.
 *
 * VISITORS -- a page_view goes to the `collect` edge function, which reads
 * the request IP, turns it into a two-letter country, and throws the
 * address away. The address is never sent to the database, never logged,
 * and there is no column that could hold one. The referrer is reduced to a
 * bare host there too, so a referring page's own query string cannot
 * follow it in.
 *
 * EVENTS -- installs, standalone launches, prompt outcomes and check-ins
 * go to a Supabase table, which is where per-city check-in counts belong
 * anyway: that number is business data to be queried, not a traffic
 * metric.
 *
 * NOTHING HERE IDENTIFIES ANYONE. No cookie, no localStorage id, no
 * session id, no fingerprint, and no IP retained. Because nothing is
 * written to or read from the visitor's device, PECR's consent rule for
 * terminal-equipment storage is not engaged and this stays outside the
 * consent banner, exactly as before.
 *
 * Two page views cannot be linked to each other. That is a deliberate
 * limit: it is what keeps this aggregate-only, and it is why the dashboard
 * reports views rather than pretending to count unique people.
 */
(function () {
  'use strict';

  // ---- config ----------------------------------------------------------
  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  var EVENTS_TABLE = 'analytics_events';

  // ---- visitors --------------------------------------------------------
  // One page view, to our own collector. The full referrer is sent because
  // the collector is what reduces it to a bare host and drops self-
  // referrals; doing that here would still leave the full URL in the
  // request. The path is sent without its query string regardless, so
  // nothing identifying can ride along even if the collector changed.
  var COLLECT_URL = SUPABASE_URL + '/functions/v1/collect';

  function sendPageView() {
    var body = {
      path: String(window.location.pathname || '/').split('?')[0],
      referrer: document.referrer || null,
      display_mode: displayMode(),
    };
    try {
      fetch(COLLECT_URL, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(function () { /* measurement must never break a page */ });
    } catch (e) { /* same */ }
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
    sendPageView();
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
