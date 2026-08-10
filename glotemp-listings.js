// Glotemp Listings: curated content + partner/nomination system for the
// commercial verticals (entertainment, fashion, food, property, work,
// tech, transport). Sport is covered by glotemp-sports.js's live feed
// instead -- fixtures and results don't need manual curation. Reads
// approved rows from curated_listings;
// unfilled slots become an editorial "open slot" inviting a nomination.
// Nothing here is fabricated -- an empty table means every slot on every
// page shows the open-slot prompt, honestly, until a real submission is
// reviewed and approved.
(function () {
  'use strict';

  var SUPABASE_URL = SUPABASE_URL || 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = SUPABASE_ANON_KEY || 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  var CONFIG = {
    entertainment: {
      slots: 5, kind: 'event',
      eyebrow: 'Upcoming events',
      emptyLabel: 'Event listing open',
      cta: 'List your event',
      modalTitle: 'List an event',
      modalCopy: 'Tell us about an upcoming show, gig, or exhibition worth featuring here.',
    },
    food: {
      slots: 5, kind: 'recommendation',
      eyebrow: 'Where to eat',
      emptyLabel: 'Local recommendation open',
      cta: 'Nominate a place',
      modalTitle: 'Nominate a place',
      modalCopy: 'Tell us about a restaurant worth featuring here.',
    },
    property: {
      slots: 3, kind: 'partner',
      eyebrow: 'Featured listings',
      emptyLabel: 'Partner slot open',
      cta: 'List your listing',
      modalTitle: 'List your listing',
      modalCopy: 'Tell us about a property listing or agency worth featuring here.',
    },
    work: {
      slots: 3, kind: 'partner',
      eyebrow: 'Featured employers',
      emptyLabel: 'Partner slot open',
      cta: 'Feature your company',
      modalTitle: 'Feature your company',
      modalCopy: 'Tell us about a company hiring here worth featuring.',
    },
    tech: {
      slots: 3, kind: 'partner',
      eyebrow: 'Featured in tech',
      emptyLabel: 'Partner slot open',
      cta: 'Feature your company',
      modalTitle: 'Feature your company',
      modalCopy: 'Tell us about a startup, studio, or space worth featuring here.',
    },
    fashion: {
      slots: 3, kind: 'partner',
      eyebrow: 'Featured brands',
      emptyLabel: 'Partner slot open',
      cta: 'Feature your brand',
      modalTitle: 'Feature your brand',
      modalCopy: 'Tell us about a designer, boutique, or label worth featuring here.',
    },
    transport: {
      slots: 3, kind: 'partner',
      eyebrow: 'Featured services',
      emptyLabel: 'Partner slot open',
      cta: 'Feature your service',
      modalTitle: 'Feature your service',
      modalCopy: 'Tell us about a transport or mobility service worth featuring here.',
    },
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso));
    } catch (e) {
      return '';
    }
  }

  function itemHTML(item) {
    var dateStr = item.event_date ? fmtDate(item.event_date) : '';
    var titleInner = item.affiliate_url
      ? '<a href="' + esc(item.affiliate_url) + '" target="_blank" rel="noopener noreferrer sponsored">' + esc(item.title) + '</a>'
      : esc(item.title);
    return '<div class="listing-item">' +
      '<p class="listing-title"><span>' + titleInner + '</span>' + (dateStr ? '<span class="listing-date">' + dateStr + '</span>' : '') + '</p>' +
      (item.description ? '<p class="listing-desc">' + esc(item.description) + '</p>' : '') +
      '</div>';
  }

  function openSlotHTML(cfg, citySlug, vertical) {
    return '<button type="button" class="listing-open-slot" data-city="' + esc(citySlug) + '" data-vertical="' + esc(vertical) + '">' +
      '<span class="listing-open-label">' + esc(cfg.emptyLabel) + '</span>' +
      '<span class="listing-open-cta">' + esc(cfg.cta) + ' &rarr;</span>' +
      '</button>';
  }

  function renderContainer(container, cfg, citySlug, vertical, items) {
    var html = '<p class="listings-eyebrow">' + esc(cfg.eyebrow) + '</p><div class="listings-grid">';
    html += items.map(itemHTML).join('');
    var remaining = Math.max(0, cfg.slots - items.length);
    for (var i = 0; i < remaining; i++) html += openSlotHTML(cfg, citySlug, vertical);
    html += '</div>';
    container.innerHTML = html;
  }

  async function mount(container) {
    var citySlug = container.getAttribute('data-city');
    var vertical = container.getAttribute('data-vertical');
    var cfg = CONFIG[vertical];
    if (!cfg || !citySlug) return;

    try {
      var resp = await fetch(
        SUPABASE_URL + '/rest/v1/curated_listings?city_slug=eq.' + encodeURIComponent(citySlug) +
        '&vertical=eq.' + encodeURIComponent(vertical) + '&status=eq.approved' +
        '&order=display_order.asc&limit=' + cfg.slots,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, Accept: 'application/json' } }
      );
      var items = resp.ok ? await resp.json() : [];
      renderContainer(container, cfg, citySlug, vertical, items);
    } catch (e) {
      renderContainer(container, cfg, citySlug, vertical, []);
    }
  }

  function mountAll() {
    var containers = document.querySelectorAll('.vertical-listings');
    for (var i = 0; i < containers.length; i++) mount(containers[i]);
  }

  // ---------- nomination modal ----------
  var modalEl = null;
  var currentContext = null;

  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'gt-auth-overlay';
    modalEl.id = 'nominate-overlay';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-label', 'Nominate');
    modalEl.hidden = true;
    modalEl.innerHTML =
      '<div class="gt-auth-modal">' +
        '<button class="gt-auth-close" type="button" aria-label="Close">&#10005;</button>' +
        '<p class="eyebrow">Nominate</p>' +
        '<h2 class="gt-auth-title" id="nominate-title">Nominate</h2>' +
        '<p class="gt-auth-copy" id="nominate-copy"></p>' +
        '<form class="gt-auth-email-form" id="nominate-form">' +
          '<label class="gt-auth-label" for="nominate-name-field">Name</label>' +
          '<input class="gt-auth-input" type="text" id="nominate-name-field" maxlength="120" required autocomplete="off">' +
          '<label class="gt-auth-label" for="nominate-desc-field">Why it belongs here (optional)</label>' +
          '<textarea class="gt-auth-input nominate-textarea" id="nominate-desc-field" rows="3" maxlength="400"></textarea>' +
          '<label class="gt-auth-label" for="nominate-email-field">Your email (optional, in case we have questions)</label>' +
          '<input class="gt-auth-input" type="email" id="nominate-email-field" maxlength="160" autocomplete="email">' +
          '<button class="btn-neon gt-auth-submit" type="submit">Submit nomination</button>' +
        '</form>' +
        '<p class="gt-auth-status" id="nominate-status" role="status" aria-live="polite"></p>' +
        '<p class="gt-auth-copy gt-auth-microcopy">Every nomination is reviewed before it goes live -- nothing appears automatically.</p>' +
      '</div>';
    document.body.appendChild(modalEl);
    modalEl.querySelector('.gt-auth-close').addEventListener('click', closeModal);
    modalEl.addEventListener('click', function (e) { if (e.target === modalEl) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modalEl.hidden) closeModal(); });
    modalEl.querySelector('#nominate-form').addEventListener('submit', onSubmit);
    return modalEl;
  }

  function openModal(citySlug, vertical, cfg) {
    ensureModal();
    currentContext = { citySlug: citySlug, vertical: vertical, kind: cfg.kind };
    document.getElementById('nominate-title').textContent = cfg.modalTitle;
    document.getElementById('nominate-copy').textContent = cfg.modalCopy;
    document.getElementById('nominate-status').textContent = '';
    var form = document.getElementById('nominate-form');
    form.hidden = false;
    form.reset();
    modalEl.hidden = false;
    document.getElementById('nominate-name-field').focus();
  }

  function closeModal() {
    if (modalEl) modalEl.hidden = true;
  }

  async function onSubmit(e) {
    e.preventDefault();
    var status = document.getElementById('nominate-status');
    var name = document.getElementById('nominate-name-field').value.trim();
    var desc = document.getElementById('nominate-desc-field').value.trim();
    var email = document.getElementById('nominate-email-field').value.trim();
    if (!name || !currentContext) return;
    status.textContent = 'Sending…';
    try {
      var resp = await fetch(SUPABASE_URL + '/rest/v1/curated_listings', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          city_slug: currentContext.citySlug,
          vertical: currentContext.vertical,
          kind: currentContext.kind,
          title: name,
          description: desc || null,
          submitted_by_email: email || null,
        }),
      });
      if (!resp.ok) throw new Error('post failed ' + resp.status);
      status.textContent = 'Thank you -- under review.';
      document.getElementById('nominate-form').hidden = true;
      setTimeout(closeModal, 2200);
    } catch (err) {
      status.textContent = "Couldn't send that just now -- try again shortly.";
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.listing-open-slot') : null;
    if (!btn) return;
    var citySlug = btn.getAttribute('data-city');
    var vertical = btn.getAttribute('data-vertical');
    var cfg = CONFIG[vertical];
    if (cfg) openModal(citySlug, vertical, cfg);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }

  window.GlotempListings = { mountAll: mountAll };
})();
