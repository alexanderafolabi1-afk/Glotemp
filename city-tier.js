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
      el.textContent = label;
      el.className = `city-tier-badge city-tier-badge-${tier}`;
      el.hidden = false;
    } catch (e) {
      // No badge on failure -- same "say nothing rather than guess" rule
      // as every other empty state on this site.
    }
  }

  window.GlotempCityTier = { loadTier };
})();
