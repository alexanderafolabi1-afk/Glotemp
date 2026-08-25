// Glotemp Vertical Style: the one shared source for how each of the 12
// verticals looks, wherever it's shown. Originally lived inside
// glotemp-city-sell.js; pulled out so the Live Blog (glotemp-live-blog-*.js)
// draws the exact same icon and color per vertical rather than a second,
// driftable copy. Same "one source, no drift" reasoning as living-index.js.
//
// The palette here is a vivid variant, deliberately brighter than the
// desaturated brass-family VERTICAL_ACCENT used in cities/_city-template.html's
// instrument dials -- reserved for these two attention-grabbing, first-look
// moments (the homepage City Sell shelf, the Live Blog), not a site-wide
// palette change.
(function () {
  'use strict';

  var VERTICALS = ['pulse', 'tech', 'finance', 'work', 'property', 'education',
    'sport', 'entertainment', 'fashion', 'food', 'health', 'transport'];

  var LABEL = {
    pulse: 'Pulse', tech: 'Tech', finance: 'Finance', work: 'Work',
    property: 'Property', education: 'Education', sport: 'Sport',
    entertainment: 'Entertainment', fashion: 'Fashion', food: 'Food',
    health: 'Health', transport: 'Transport',
  };

  var COLOR = {
    pulse: '#FF6F91', tech: '#4F8CFF', finance: '#2ECC71', work: '#9B6BFF',
    property: '#FFA53D', education: '#5C7CFA', sport: '#FF5C5C',
    entertainment: '#D66BE0', fashion: '#FF8FC4', food: '#FFD166',
    health: '#2FD9C4', transport: '#4FC3F7',
  };

  var ICON = {
    pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12h4l2 7 4-14 2 7h8"/></svg>',
    tech: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>',
    finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20h18M6 20V10M12 20V4M18 20v13"/></svg>',
    work: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg>',
    property: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-7h6v7"/></svg>',
    education: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg>',
    sport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3c2.5 2.5 2.5 15.5 0 18M3 12h18M5 6.5c3 2 11 2 14 0M5 17.5c3-2 11-2 14 0"/></svg>',
    entertainment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8a2 2 0 1 0 0-4H3v4h1zM20 8a2 2 0 1 1 0-4h1v4h-1z"/><path d="M3 4h18v6c0 5-4 9-9 9s-9-4-9-9V4z"/><path d="M8 22h8"/></svg>',
    fashion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4a2 2 0 0 1 2 2c3 0 8 2 8 6h-6v9H8v-9H2c0-4 5-6 8-6a2 2 0 0 1 2-2z"/></svg>',
    food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2v8a2 2 0 0 0 4 0V2M8 10v12M18 2c-2 0-3 2-3 5s1 4 3 4v11"/></svg>',
    health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 8.6c0 5.4-8.8 10.4-8.8 10.4S3.2 14 3.2 8.6a4.6 4.6 0 0 1 8.8-1.9 4.6 4.6 0 0 1 8.8 1.9z"/></svg>',
    transport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="3"/><path d="M3 11h18M7 17v2M17 17v2"/><circle cx="7.5" cy="14" r=".6" fill="currentColor" stroke="none"/><circle cx="16.5" cy="14" r=".6" fill="currentColor" stroke="none"/></svg>',
  };

  // The reused fact sources (GlotempVerticalSignature, GlotempFoodSignature)
  // use dashes as clause joiners in a few places. Rather than rewrite that
  // shared, already-shipped copy, callers that render it can soften it at
  // render time: a space-padded dash reads fine swapped for a comma. Tight
  // hyphens in real compound words (well-known, 24-hour) are left alone
  // since they never have spaces on both sides.
  function stripDashes(text) {
    if (!text) return text;
    return text.replace(/\s+[—–-]\s+/g, ', ');
  }

  window.GlotempVerticalStyle = { VERTICALS: VERTICALS, LABEL: LABEL, COLOR: COLOR, ICON: ICON, stripDashes: stripDashes };
})();
