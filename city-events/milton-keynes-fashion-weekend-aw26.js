// Fashion Weekend AW26 — Milton Keynes only.
// Loaded only from cities/milton-keynes.html. Auto-hides after 2026-10-04 23:59 Europe/London.
(function () {
  'use strict';

  // Path guard: only run on the Milton Keynes city page
  var path = (window.location.pathname || '').replace(/\/$/, '');
  if (path !== '/cities/milton-keynes' && path !== '/cities/milton-keynes.html') return;

  var ENDS = '2026-10-04T23:59:59+01:00';
  try {
    if (Date.now() > new Date(ENDS).getTime()) return;
  } catch (e) { return; }

  if (document.getElementById('mk-fashion-weekend-2026')) return;

  if (!document.getElementById('mk-fashion-weekend-styles')) {
    var style = document.createElement('style');
    style.id = 'mk-fashion-weekend-styles';
    style.textContent = [
      '.city-event-spotlight{border-left:2px solid var(--band-warm,#F5A25A);padding:1.25rem 1.35rem 1.4rem;margin-bottom:1.25rem}',
      '.city-event-spotlight .eyebrow{margin-bottom:.55rem}',
      '.event-spotlight-title{font-family:var(--font-display);font-weight:300;font-size:clamp(1.45rem,3.2vw,1.85rem);color:var(--ivory);line-height:1.2;margin:0 0 .35rem}',
      '.event-spotlight-meta{font-family:var(--font-mono);font-size:.9rem;color:var(--sand);letter-spacing:.02em;margin:0 0 .85rem}',
      '.event-spotlight-body{font-family:var(--font-body);font-size:.98rem;line-height:1.55;color:var(--sand);max-width:52ch;margin:0 0 .9rem}',
      '.event-spotlight-highlights{list-style:none;padding:0;margin:0 0 1.15rem}',
      '.event-spotlight-highlights li{position:relative;padding-left:1.1rem;font-family:var(--font-body);font-size:.92rem;color:var(--ivory);line-height:1.55;margin-bottom:.35rem}',
      '.event-spotlight-highlights li::before{content:"";position:absolute;left:0;top:.55em;width:5px;height:5px;border-radius:50%;background:var(--brass);opacity:.85}',
      '.event-spotlight-cta{display:inline-block;text-decoration:none}',
      '@media (max-width:640px){.city-event-spotlight{padding:1.1rem 1rem 1.25rem}.event-spotlight-title{font-size:1.35rem}}'
    ].join('');
    document.head.appendChild(style);
  }

  var section = document.createElement('section');
  section.className = 'glass-card city-event-spotlight';
  section.id = 'mk-fashion-weekend-2026';
  section.setAttribute('aria-label', 'Fashion Weekend AW26 at centre:mk');
  section.innerHTML =
    '<p class="eyebrow live-mark">This weekend in Milton Keynes</p>' +
    '<div class="event-spotlight-inner">' +
      '<div class="event-spotlight-copy">' +
        '<h2 class="event-spotlight-title">Fashion Weekend AW26</h2>' +
        '<p class="event-spotlight-meta">3–4 October · 11am–5pm · Middleton Hall · centre:mk</p>' +
        '<p class="event-spotlight-body">' +
          'Over 40 brands on the catwalk, exclusive fashion and beauty pop-ups, ' +
          'style talks and beauty masterclasses. Free entry — no tickets needed.' +
        '</p>' +
        '<ul class="event-spotlight-highlights">' +
          '<li>Hourly catwalk shows &amp; new-season trends</li>' +
          '<li>The Insider Stage — talks &amp; masterclasses</li>' +
          '<li>Pop-ups from Mint Velvet, River Island, H beauty &amp; more</li>' +
        '</ul>' +
        '<a class="btn-neon event-spotlight-cta" ' +
           'href="https://www.centremk.com/whats-on/events/fashion-weekend-aw26/" ' +
           'target="_blank" rel="noopener noreferrer">Discover at centre:mk</a>' +
      '</div>' +
    '</div>';

  function place() {
    var main = document.querySelector('main.page-content') || document.querySelector('main');
    if (!main) return false;
    var offers = document.getElementById('offers-panel');
    if (offers) {
      offers.parentNode.insertBefore(section, offers);
      return true;
    }
    var header = main.querySelector('.city-header');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(section, header.nextSibling);
      return true;
    }
    main.insertBefore(section, main.firstChild);
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', place);
  } else {
    place();
  }
})();
