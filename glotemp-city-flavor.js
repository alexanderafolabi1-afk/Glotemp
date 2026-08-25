// Mounts the small "city flavor" badge from city-flavor-data.js -- a
// hand-picked, three-city list, hidden everywhere else. Self-mounting
// (creates and inserts its own element, no template mount point needed),
// same approach as footer-social.js, right next to the existing tier
// badge in the header so it reads as one quiet family of small badges,
// not a new attention-grabbing section.
(function () {
  'use strict';

  var ICONS = {
    // A gabled canal-house window with a glowing pane -- Amsterdam's
    // silhouette, warmly lit rather than red per se; the wink is in the
    // tooltip, not the icon.
    window: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V9l8-6 8 6v12"/><rect x="9" y="12" width="6" height="9"/><circle cx="12" cy="9" r="1.1" fill="currentColor" stroke="none"/></svg>',
    // A single simple leaf, not the serrated cliche -- generic enough to
    // read as "plant" at a glance, specific enough given the tooltip.
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21C7 21 4 17 4 12c0-4 3-8 8-9 5 1 8 5 8 9 0 5-3 9-8 9z"/><path d="M12 21V6"/></svg>',
    dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none"/></svg>',
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function currentSlugFromPath() {
    var m = window.location.pathname.match(/\/cities\/([^/]+)\.html$/);
    return m ? m[1] : null;
  }

  function mount() {
    var slug = currentSlugFromPath();
    var flavor = slug && window.CITY_FLAVOR && window.CITY_FLAVOR[slug];
    if (!flavor) return;

    var anchor = document.getElementById('city-tier-badge') || document.getElementById('city-name');
    if (!anchor || !anchor.parentNode) return;

    var badge = document.createElement('span');
    badge.className = 'city-flavor-badge';
    badge.setAttribute('title', flavor.tooltip);
    badge.setAttribute('tabindex', '0');
    badge.innerHTML = (ICONS[flavor.icon] || '') + '<span>' + esc(flavor.label) + '</span>';
    anchor.insertAdjacentElement('afterend', badge);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
