// Glotemp Listings: curated content + partner/nomination system for the
// commercial verticals (entertainment, fashion, food, property, work,
// tech, transport, finance, education, health). Sport is covered by
// glotemp-sports.js's live feed instead -- fixtures and results don't
// need manual curation -- and Pulse is the core reading system, not a
// listings category. Every other vertical gets this: no vertical should
// be a dead end just because it has no live reading yet and no matching
// Wikipedia section. Reads approved rows from curated_listings; unfilled
// slots become an editorial "open slot" inviting a suggestion. Nothing
// here is fabricated -- an empty table means every slot on every page
// shows the open-slot prompt, honestly, until a real submission is
// reviewed and approved.
(function () {
  'use strict';

  var SUPABASE_URL = SUPABASE_URL || 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = SUPABASE_ANON_KEY || 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  var CONFIG = {
    entertainment: {
      slots: 5, kind: 'event',
      eyebrow: 'Upcoming events',
      emptyLabel: 'A place belongs here',
      cta: 'Suggest an event',
      modalTitle: 'Suggest an event',
      modalCopy: 'Tell us about an upcoming show, gig, or exhibition that belongs in this city’s reading.',
    },
    food: {
      slots: 5, kind: 'recommendation',
      eyebrow: 'Where to eat',
      emptyLabel: 'A place belongs here',
      cta: 'Suggest a place',
      modalTitle: 'Suggest a place',
      modalCopy: 'Tell us about a restaurant that belongs in this city’s reading.',
    },
    property: {
      slots: 3, kind: 'partner',
      eyebrow: 'Notable listings',
      emptyLabel: 'A place belongs here',
      cta: 'Suggest a listing',
      modalTitle: 'Suggest a listing',
      modalCopy: 'Tell us about a property listing or agency that belongs in this city’s reading.',
    },
    work: {
      slots: 3, kind: 'partner',
      eyebrow: 'Notable employers',
      emptyLabel: 'A place belongs here',
      cta: 'Suggest a company',
      modalTitle: 'Suggest a company',
      modalCopy: 'Tell us about a company hiring here that belongs in this city’s reading.',
    },
    tech: {
      slots: 3, kind: 'partner',
      eyebrow: 'Notable in tech',
      emptyLabel: 'A place belongs here',
      cta: 'Suggest a company',
      modalTitle: 'Suggest a company',
      modalCopy: 'Tell us about a startup, studio, or space that belongs in this city’s reading.',
    },
    fashion: {
      slots: 3, kind: 'partner',
      eyebrow: 'Notable brands',
      emptyLabel: 'A place belongs here',
      cta: 'Suggest a brand',
      modalTitle: 'Suggest a brand',
      modalCopy: 'Tell us about a designer, boutique, or label that belongs in this city’s reading.',
    },
    transport: {
      slots: 3, kind: 'partner',
      eyebrow: 'Notable services',
      emptyLabel: 'A place belongs here',
      cta: 'Suggest a service',
      modalTitle: 'Suggest a service',
      modalCopy: 'Tell us about a transport or mobility service that belongs in this city’s reading.',
    },
    finance: {
      slots: 3, kind: 'partner',
      eyebrow: 'Notable in finance',
      emptyLabel: 'A place belongs here',
      cta: 'Suggest a company',
      modalTitle: 'Suggest a company',
      modalCopy: 'Tell us about a bank, advisor, or fintech that belongs in this city’s reading.',
    },
    education: {
      slots: 3, kind: 'partner',
      eyebrow: 'Notable in education',
      emptyLabel: 'A place belongs here',
      cta: 'Suggest a school',
      modalTitle: 'Suggest a school',
      modalCopy: 'Tell us about a school, university, or language centre that belongs in this city’s reading.',
    },
    health: {
      slots: 3, kind: 'partner',
      eyebrow: 'Notable in health',
      emptyLabel: 'A place belongs here',
      cta: 'Suggest a clinic',
      modalTitle: 'Suggest a clinic',
      modalCopy: 'Tell us about a clinic, gym, or wellness space that belongs in this city’s reading.',
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
    modalEl.setAttribute('aria-label', 'Suggest a place');
    modalEl.hidden = true;
    modalEl.innerHTML =
      '<div class="gt-auth-modal">' +
        '<button class="gt-auth-close" type="button" aria-label="Close">&#10005;</button>' +
        '<p class="eyebrow">Suggest</p>' +
        '<h2 class="gt-auth-title" id="nominate-title">Suggest a place</h2>' +
        '<p class="gt-auth-copy" id="nominate-copy"></p>' +
        '<form class="gt-auth-email-form" id="nominate-form">' +
          '<label class="gt-auth-label" for="nominate-name-field">Name</label>' +
          '<input class="gt-auth-input" type="text" id="nominate-name-field" maxlength="120" required autocomplete="off">' +
          '<label class="gt-auth-label" for="nominate-desc-field">Why it belongs here (optional)</label>' +
          '<textarea class="gt-auth-input nominate-textarea" id="nominate-desc-field" rows="3" maxlength="400"></textarea>' +
          '<label class="gt-auth-label" for="nominate-email-field">Your email (optional, in case we have questions)</label>' +
          '<input class="gt-auth-input" type="email" id="nominate-email-field" maxlength="160" autocomplete="email">' +
          '<button class="btn-neon gt-auth-submit" type="submit">Submit suggestion</button>' +
        '</form>' +
        '<p class="gt-auth-status" id="nominate-status" role="status" aria-live="polite"></p>' +
        '<p class="gt-auth-copy gt-auth-microcopy">Every suggestion is reviewed before it goes live -- nothing appears automatically, and nothing here is a paid or self-promoted listing.</p>' +
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
