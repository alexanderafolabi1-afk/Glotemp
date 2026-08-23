// Glotemp city tier: Listed / Verified / Anchor, a quiet badge on a
// city's own page. Gated on real data depth already in `readings` -- see
// the city_tier() RPC (20260823090000_city_tier.sql) for the actual
// eligibility logic, which is intentionally not duplicated or exposed
// here. This module only renders whatever label the RPC returns.
//
// Listed is the open, unearned default every city with a page already
// has -- it never gets its own badge, only Verified and Anchor do. The
// badge stays hidden for a Listed city, same as it stays hidden while
// the RPC call is still in flight or fails.
(function () {
  'use strict';

  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  const LABEL = { verified: 'Verified', anchor: 'Anchor' };

  // Vehicle-plate SVG frame: chamfered corners (top-left, bottom-right)
  // for a stamped, slightly-worn plate character, an inset engraved line,
  // and two rivets at the two square corners. viewBox 0 0 100 40 with
  // preserveAspectRatio="none" so the same path stretches to whatever
  // width the badge's own text gives it ("Verified" vs "Anchor" differ),
  // same technique as .instrument-burst above it on the homepage.
  const PLATE_SVG = `<svg class="tier-plate-shape" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
    <path class="tier-plate-outline" d="M7,0 L100,0 L100,33 L93,40 L0,40 L0,7 Z"></path>
    <path class="tier-plate-inset" d="M10,3 L97,3 L97,29.5 L93,37 L3,37 L3,7 Z"></path>
    <circle class="tier-plate-rivet" cx="93" cy="7" r="2.1"></circle>
    <circle class="tier-plate-rivet" cx="7" cy="33" r="2.1"></circle>
  </svg>`;

  // Real data only: the region code and rank stamped into the plate's
  // corner are the same iso/rank fields cities-data.js already carries
  // for every city -- nothing here is invented to sell the plate motif.
  function plateStamp(citySlug) {
    const rec = (window.CITIES_DATA || []).find((c) => c.slug === citySlug);
    if (!rec || !rec.iso) return { code: '', num: '' };
    return { code: rec.iso, num: rec.rank ? String(rec.rank).padStart(3, '0') : '' };
  }

  async function loadTier(citySlug) {
    const el = document.getElementById('city-tier-badge');
    if (!el || !citySlug) return;
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/city_tier`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_city_slug: citySlug }),
      });
      if (!resp.ok) return;
      const tier = await resp.json();
      const label = LABEL[tier];
      if (!label) return; // 'listed' (or anything unexpected): no badge, quiet by design
      const { code, num } = plateStamp(citySlug);
      el.innerHTML = PLATE_SVG +
        '<span class="tier-plate-content">' +
          (code ? `<span class="tier-plate-code">${code}</span>` : '') +
          `<span class="tier-plate-label">${label}</span>` +
          (num ? `<span class="tier-plate-num">${num}</span>` : '') +
        '</span>';
      el.className = `city-tier-badge city-tier-badge-${tier}`;
      el.hidden = false;
    } catch (e) {
      // No badge on failure -- same "say nothing rather than guess" rule
      // as every other empty state on this site.
    }
  }

  window.GlotempCityTier = { loadTier };
})();
