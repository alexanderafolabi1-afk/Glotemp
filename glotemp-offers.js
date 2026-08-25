// Glotemp Offers Panel: "TONIGHT IN [CITY]" on a city's own page (every
// vertical), and the same panel filtered to one vertical on that
// vertical's own page. One shared script, mounted into a single empty
// <section id="offers-panel"> on both page types -- context (city slug,
// and vertical if present) is read from the URL.
//
// Renders nothing at all -- not even a heading -- when a city has no
// active offers. No empty state, no gap: the section simply stays hidden.
// Unlocking or redeeming an offer never touches any reading, ranking or
// band table; this reads only from offers/offer_unlocks.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  var VISIBLE_COUNT = 4;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function context() {
    var m = window.location.pathname.match(/\/cities\/([^/]+)\/([^/]+)\/?$/);
    if (m) return { citySlug: m[1], vertical: m[2] };
    m = window.location.pathname.match(/\/cities\/([^/]+)\.html$/);
    if (m) return { citySlug: m[1], vertical: null };
    return null;
  }

  function anonHeaders() {
    return { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };
  }

  async function fetchActiveOffers(citySlug) {
    try {
      var resp = await fetch(
        SUPABASE_URL + '/rest/v1/offers?city_slug=eq.' + encodeURIComponent(citySlug) + '&active=eq.true&select=*',
        { headers: anonHeaders() }
      );
      if (!resp.ok) return [];
      var rows = await resp.json();
      var now = Date.now();
      return rows.filter(function (o) {
        var starts = o.starts_at ? new Date(o.starts_at).getTime() : 0;
        var ends = o.ends_at ? new Date(o.ends_at).getTime() : null;
        return now >= starts && (ends === null || now <= ends);
      });
    } catch (e) {
      return [];
    }
  }

  // Own unlocks only, so a returning signed-in visitor sees their code
  // immediately instead of needing to hit REVEAL again.
  async function fetchOwnUnlocks(session) {
    try {
      var resp = await fetch(
        SUPABASE_URL + '/rest/v1/offer_unlocks?select=offer_id,code,redeemed_at',
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + session.access_token } }
      );
      if (!resp.ok) return {};
      var rows = await resp.json();
      var byOffer = {};
      rows.forEach(function (r) { byOffer[r.offer_id] = r; });
      return byOffer;
    } catch (e) {
      return {};
    }
  }

  async function unlockOffer(offerId, session) {
    var resp = await fetch(SUPABASE_URL + '/rest/v1/rpc/unlock_offer', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_offer_id: offerId }),
    });
    if (!resp.ok) {
      var text = await resp.text();
      var reason = 'unlock_failed';
      ['not_authenticated', 'offer_not_found', 'offer_inactive', 'offer_expired', 'offer_full']
        .forEach(function (r) { if (text.indexOf(r) !== -1) reason = r; });
      throw new Error(reason);
    }
    return resp.json();
  }

  var UNLOCK_ERROR_TEXT = {
    offer_full: 'This offer has run out for now.',
    offer_expired: 'This offer has ended.',
    offer_inactive: 'This offer is no longer live.',
    not_authenticated: 'Sign in to reveal this code.',
    unlock_failed: 'Couldn’t reveal that just now. Try again shortly.',
  };

  function lineHTML(offer) {
    var detailHtml = offer.detail ? '<p class="offers-more-detail">' + esc(offer.detail) + '</p>' : '';
    return (
      '<li class="offers-line" data-offer-id="' + esc(offer.id) + '">' +
        '<p class="offers-business">' + esc(offer.partner_name) + '</p>' +
        '<p class="offers-detail">' + esc(offer.title) + '</p>' +
        '<div class="offers-line-actions">' +
          '<button type="button" class="offers-action offers-reveal-btn">Reveal</button>' +
          '<button type="button" class="offers-action offers-how-btn" aria-expanded="false">How it works</button>' +
        '</div>' +
        '<div class="offers-reveal-panel" hidden></div>' +
        '<div class="offers-terms-panel" hidden>' +
          detailHtml +
          '<p class="offers-terms-text">' + esc(offer.terms) + '</p>' +
        '</div>' +
      '</li>'
    );
  }

  function renderRevealed(panel, code, redeemed) {
    panel.innerHTML =
      '<p class="offers-code">' + esc(code) + '</p>' +
      '<p class="offers-code-instruction">' +
        (redeemed ? 'Already redeemed.' : 'Show this code to staff to redeem it.') +
      '</p>';
    panel.hidden = false;
  }

  function wireLine(li, offer, ownUnlocks) {
    var revealBtn = li.querySelector('.offers-reveal-btn');
    var howBtn = li.querySelector('.offers-how-btn');
    var revealPanel = li.querySelector('.offers-reveal-panel');
    var termsPanel = li.querySelector('.offers-terms-panel');

    var mine = ownUnlocks && ownUnlocks[offer.id];
    var signedIn = window.GlotempAuth && GlotempAuth.isSignedIn();

    if (!signedIn) {
      revealBtn.textContent = 'Sign in to reveal';
    } else if (mine) {
      renderRevealed(revealPanel, mine.code, !!mine.redeemed_at);
      revealBtn.textContent = 'Revealed';
      revealBtn.disabled = true;
    }

    revealBtn.addEventListener('click', async function () {
      if (revealBtn.disabled) return;
      if (!window.GlotempAuth) return;

      if (!GlotempAuth.isSignedIn()) {
        var ok = await GlotempAuth.requireAuth('Sign in to reveal ' + offer.partner_name + '’s offer.');
        if (!ok) return;
      }

      revealBtn.disabled = true;
      revealBtn.textContent = 'Revealing…';
      try {
        var session = await GlotempAuth.getSession();
        if (!session) throw new Error('not_authenticated');
        var result = await unlockOffer(offer.id, session);
        renderRevealed(revealPanel, result.code, !!result.redeemed);
        revealBtn.textContent = 'Revealed';
      } catch (err) {
        var msg = UNLOCK_ERROR_TEXT[err.message] || UNLOCK_ERROR_TEXT.unlock_failed;
        revealPanel.innerHTML = '<p class="offers-code-instruction">' + esc(msg) + '</p>';
        revealPanel.hidden = false;
        revealBtn.disabled = false;
        revealBtn.textContent = 'Reveal';
      }
    });

    howBtn.addEventListener('click', function () {
      var open = !termsPanel.hidden;
      termsPanel.hidden = open;
      howBtn.setAttribute('aria-expanded', String(!open));
    });
  }

  async function mount() {
    var section = document.getElementById('offers-panel');
    if (!section) return;
    var ctx = context();
    if (!ctx) return;

    var city = (window.CITIES_DATA || []).find(function (c) { return c.slug === ctx.citySlug; });
    if (!city) return;

    var offers = await fetchActiveOffers(ctx.citySlug);
    if (ctx.vertical) offers = offers.filter(function (o) { return o.vertical === ctx.vertical; });
    if (!offers.length) return; // no panel at all -- no heading, no gap

    offers.sort(function (a, b) { return new Date(b.starts_at) - new Date(a.starts_at); });

    var ownUnlocks = {};
    if (window.GlotempAuth && GlotempAuth.isSignedIn()) {
      var session = await GlotempAuth.getSession();
      if (session) ownUnlocks = await fetchOwnUnlocks(session);
    }

    var visible = offers.slice(0, VISIBLE_COUNT);
    var rest = offers.slice(VISIBLE_COUNT);

    section.innerHTML =
      '<p class="offers-heading">Tonight in ' + esc(city.name) + '</p>' +
      '<ul class="offers-list" id="offers-list">' + visible.map(lineHTML).join('') + '</ul>' +
      (rest.length ? '<button type="button" class="offers-more-btn" id="offers-more-btn">More</button>' : '') +
      '<ul class="offers-list offers-list-rest" id="offers-list-rest" hidden>' + rest.map(lineHTML).join('') + '</ul>' +
      '<p class="offers-partner-line"><a href="/partners/?city=' + esc(ctx.citySlug) + '">Offer something to this city &rarr;</a></p>';

    section.querySelectorAll('.offers-line').forEach(function (li) {
      var offer = offers.find(function (o) { return o.id === li.getAttribute('data-offer-id'); });
      if (offer) wireLine(li, offer, ownUnlocks);
    });

    var moreBtn = document.getElementById('offers-more-btn');
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        document.getElementById('offers-list-rest').hidden = false;
        moreBtn.hidden = true;
      });
    }

    section.hidden = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
