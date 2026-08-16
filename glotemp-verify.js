// Lightweight verification for a reading.
//
// TWO SIGNALS, BOTH OPTIONAL, NEITHER REQUIRED TO POST
//   "I am here"  the browser's own geolocation, checked server-side
//                against the city centre.
//   Standing     account age and contribution count. Needs no permission
//                and no prompt.
//
// CONSENT IS ASKED TWICE, ON PURPOSE
// The browser's permission dialog is not a good place to learn what a
// site is about to do with your location. So the button explains first,
// in the page, in plain words, and only calls getCurrentPosition once
// somebody has pressed it knowing what it does. Nothing is requested on
// page load, and declining costs the reader nothing at all.
//
// THE POSITION IS NOT KEPT
// The coordinates go to verify_presence and are never stored: it writes
// back only a method and a rounded distance. There is no column on
// observations that can hold a latitude. Nothing here writes to
// localStorage either.
//
// HONEST ABOUT ITS OWN LIMITS
// Browser geolocation is spoofable by anyone who opens dev tools. This
// raises the cost of a fake reading; it is not proof, and the wording
// never claims it is. That is also why the weight is 2 rather than 20.
(function () {
  'use strict';

  function auth() { return window.GlotempAuth; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function rpc(fn, args) {
    var A = auth();
    if (!A) throw new Error('auth unavailable');
    var session = await A.getSession();
    if (!session) throw new Error('not signed in');
    var resp = await fetch(A.SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        apikey: A.SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args || {}),
    });
    if (!resp.ok) throw new Error(fn + ' ' + resp.status);
    return resp.json();
  }

  // ---------- standing ----------
  async function standing() {
    try {
      var rows = await rpc('user_standing', {});
      var row = Array.isArray(rows) ? rows[0] : rows;
      return row || null;
    } catch (e) { return null; }
  }

  // ---------- presence ----------
  function position() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) { reject(new Error('unsupported')); return; }
      navigator.geolocation.getCurrentPosition(
        function (p) { resolve({ lat: p.coords.latitude, lon: p.coords.longitude }); },
        function (err) { reject(err); },
        // No high accuracy: the question is "which city", not "which
        // street", and asking for precision that is not needed drains a
        // battery and widens what is being collected.
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
      );
    });
  }

  var REFUSALS = {
    too_far: 'That did not place you in this city, so the reading stays unverified. It still counts.',
    city_not_mapped: 'This city has no centre point yet, so presence cannot be checked here.',
    not_yours: 'That reading belongs to another account.',
    bad_position: 'Your browser did not return a usable position.',
    no_such_observation: 'That reading could not be found.',
  };

  // observationId comes from the insert that just happened, so this only
  // ever stamps a reading the reader has this second posted.
  async function verifyHere(observationId, statusEl) {
    function say(msg) { if (statusEl) statusEl.textContent = msg; }

    say('Asking your browser for a rough position...');
    var pos;
    try {
      pos = await position();
    } catch (err) {
      // A refusal is a legitimate answer, not a failure. Say so.
      say(err && err.code === 1
        ? 'No location shared. Your reading still counts, unverified.'
        : 'Could not read a position. Your reading still counts, unverified.');
      return false;
    }

    say('Checking...');
    try {
      var rows = await rpc('verify_presence', {
        p_observation_id: observationId,
        p_lat: pos.lat,
        p_lon: pos.lon,
      });
      var r = Array.isArray(rows) ? rows[0] : rows;
      if (r && r.verified) {
        say('Verified. You were within ' + Math.round(r.distance_km) + ' km of the centre.');
        return true;
      }
      say(REFUSALS[r && r.reason] || 'Could not verify that. Your reading still counts.');
      return false;
    } catch (e) {
      say('Could not verify that right now. Your reading still counts.');
      return false;
    }
  }

  async function verifyStanding(observationId) {
    try {
      var ok = await rpc('verify_standing', { p_observation_id: observationId });
      return ok === true;
    } catch (e) { return false; }
  }

  // ---------- the offer ----------
  // Rendered after a successful post, never before. Asking someone to
  // share a position before they have written anything is a toll gate.
  function offerHTML() {
    return '' +
      '<div class="verify-offer" id="verify-offer">' +
        '<p class="verify-copy">Optional: confirm you are in this city. Your browser will ask ' +
          'permission. Your position is checked and discarded, never stored.</p>' +
        '<button type="button" class="verify-btn" id="verify-here">I am here</button>' +
        '<span class="verify-status" id="verify-status" role="status" aria-live="polite"></span>' +
      '</div>';
  }

  function mountOffer(container, observationId) {
    if (!container || !observationId) return;
    container.innerHTML = offerHTML();
    var btn = container.querySelector('#verify-here');
    var status = container.querySelector('#verify-status');

    // Standing needs no permission, so it is claimed quietly in the
    // background. If it lands, presence is still offered: it is the
    // stronger signal and will overwrite standing server-side.
    verifyStanding(observationId).then(function (ok) {
      if (ok && status && !status.textContent) {
        status.textContent = 'Counted as an established account.';
      }
    });

    if (btn) btn.addEventListener('click', async function () {
      if (btn.disabled) return;
      btn.disabled = true;
      var done = await verifyHere(observationId, status);
      if (done) { btn.remove(); } else { btn.disabled = false; }
    });
  }

  // ---------- badge ----------
  function badgeHTML(method) {
    if (method === 'presence') {
      return '<span class="verify-badge verify-badge-presence" title="Geolocation placed this person in the city when they posted. Not proof, but harder to fake.">Verified here</span>';
    }
    if (method === 'standing') {
      return '<span class="verify-badge verify-badge-standing" title="Posted from an established account with a history of contributions.">Established</span>';
    }
    return '';
  }

  window.GlotempVerify = {
    mountOffer: mountOffer,
    badgeHTML: badgeHTML,
    standing: standing,
    verifyHere: verifyHere,
    verifyStanding: verifyStanding,
  };
})();
