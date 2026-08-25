// Glotemp My Saved Offers: the profile-side half of the Offers Panel (see
// glotemp-offers.js). "The user's saved offers live on their profile" --
// this is that profile. Reads only the signed-in visitor's own
// offer_unlocks rows (RLS: auth.uid() = user_id), embedding each row's
// offer via PostgREST's foreign-key select syntax.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function fetchMyUnlocks(session) {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/offer_unlocks?select=code,unlocked_at,redeemed_at,offers(partner_name,title,city_slug)&order=unlocked_at.desc',
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + session.access_token } }
    );
    if (!resp.ok) return [];
    return resp.json();
  }

  function rowHTML(row) {
    var offer = row.offers;
    if (!offer) {
      return (
        '<li class="offers-line">' +
          '<p class="offers-detail">An offer that is no longer available.</p>' +
          '<p class="offers-code">' + esc(row.code) + '</p>' +
        '</li>'
      );
    }
    var cityLink = offer.city_slug ? '/cities/' + esc(offer.city_slug) + '.html' : null;
    return (
      '<li class="offers-line">' +
        '<p class="offers-business">' + esc(offer.partner_name) + '</p>' +
        '<p class="offers-detail">' + esc(offer.title) +
          (cityLink ? ' &middot; <a href="' + cityLink + '">' + esc(offer.city_slug) + '</a>' : '') +
        '</p>' +
        '<p class="offers-code">' + esc(row.code) + '</p>' +
        '<p class="offers-code-instruction">' +
          (row.redeemed_at ? 'Redeemed.' : 'Not redeemed yet. Show this code to staff to redeem it.') +
        '</p>' +
      '</li>'
    );
  }

  async function mount() {
    var list = document.getElementById('account-offers-list');
    if (!list || !window.GlotempAuth) return;

    if (!GlotempAuth.isSignedIn()) {
      list.innerHTML =
        '<p class="offers-detail">Sign in to see your saved offers.</p>' +
        '<div class="form-actions"><button type="button" class="btn-neon" id="account-signin-btn">Sign in</button></div>';
      var btn = document.getElementById('account-signin-btn');
      if (btn) btn.addEventListener('click', function () { GlotempAuth.requireAuth('Sign in to see your saved offers.').then(mount); });
      return;
    }

    var session = await GlotempAuth.getSession();
    if (!session) return;

    var rows = await fetchMyUnlocks(session);
    if (!rows.length) {
      list.innerHTML = '<p class="offers-detail">Nothing unlocked yet. Offers show up on a city’s own page when there are any live.</p>';
      return;
    }

    list.innerHTML = '<ul class="offers-list">' + rows.map(rowHTML).join('') + '</ul>';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
