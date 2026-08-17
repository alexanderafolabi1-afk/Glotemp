// Glotemp Temp-Reporter status: how the platform quietly acknowledges
// people who check in consistently. The tier itself is computed and kept
// current by Postgres (profiles.reporter_tier, a generated column driven
// by longest_streak and total_contributions -- see the
// temp_reporter_status migration). This file only knows how to say it.
//
// DELIBERATELY NOT A GAME
// No points shown, no progress bar, no "3 more days to next tier" nag.
// A tier is reached once and kept -- see the migration's own note on why
// longest_streak rather than current_streak. The badge is the same
// hairline-underline language the rest of the site already uses for
// selection state; there is no filled pill anywhere in this file.
(function () {
  'use strict';

  var TIERS = {
    temp_reporter: {
      label: 'Temp-Reporter',
      metal: 'brass',
      line: 'A steady, recognised presence in this city’s readings.',
    },
    senior_reporter: {
      label: 'Senior Reporter',
      metal: 'silver',
      line: 'A real stretch of consistent check-ins, not a single good week.',
    },
    chief_correspondent: {
      label: 'Chief Correspondent',
      metal: 'platinum',
      line: 'Among the platform’s most consistent, longest-standing observers.',
    },
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Inline, next to a name -- the check-in list wants this. Empty string
  // for no tier or an anonymous post, so callers can splice it in without
  // a conditional of their own.
  function badgeHTML(tier) {
    var meta = TIERS[tier];
    if (!meta) return '';
    return '<span class="reporter-badge reporter-badge-' + esc(meta.metal) + '" title="' +
      esc(meta.label) + '. ' + esc(meta.line) + '">' + esc(meta.label) + '</span>';
  }

  // A fuller, standalone panel for places with room to say more than a
  // badge can -- the daily check-in card today, a profile page later.
  function panelHTML(tier) {
    var meta = TIERS[tier];
    if (!meta) return '';
    return '' +
      '<div class="reporter-panel reporter-panel-' + esc(meta.metal) + '">' +
        '<span class="reporter-panel-label">' + esc(meta.label) + '</span>' +
        '<span class="reporter-panel-line">' + esc(meta.line) + '</span>' +
      '</div>';
  }

  window.GlotempReporter = { badgeHTML: badgeHTML, panelHTML: panelHTML, TIERS: TIERS };
})();
