// Glotemp sponsor strip: a sponsorship credit for the exact (city, vertical)
// a page represents. RLS on `advertisers` already restricts the anon read to
// active rows inside their flight window -- the client only has to match
// city_slug/vertical, nothing else.
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Strips the scheme and any trailing slash for display only -- the href
  // still carries the real URL from the row.
  function displayUrl(url) {
    return String(url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  function render(container, ad) {
    container.innerHTML = `
      <a class="sponsor-strip-link" href="${esc(ad.url)}" target="_blank" rel="noopener sponsored" aria-label="Supported by ${esc(ad.name)}">
        <span class="sponsor-strip-kicker">Supported by</span>
        <img class="sponsor-strip-logo" src="${esc(ad.logo_path)}" alt="${esc(ad.name)}" height="32" loading="lazy">
        <span class="sponsor-strip-name">${esc(ad.name)}</span>
        ${ad.tagline ? `<span class="sponsor-strip-tagline">${esc(ad.tagline)}</span>` : ''}
        <span class="sponsor-strip-url">${esc(displayUrl(ad.url))}</span>
      </a>
    `;
  }

  // Renders nothing -- and leaves the container empty, not hidden -- so an
  // inactive/expired/unmatched page has no gap and no empty border box.
  async function mount(containerId, citySlug, vertical) {
    const container = document.getElementById(containerId);
    if (!container) return;
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/advertisers?city_slug=eq.${encodeURIComponent(citySlug)}&vertical=eq.${encodeURIComponent(vertical)}&select=*`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } }
      );
      if (!response.ok) { container.innerHTML = ''; return; }
      const ads = await response.json();
      if (!ads.length) { container.innerHTML = ''; return; }
      render(container, ads[Math.floor(Math.random() * ads.length)]);
    } catch (error) {
      console.error('Error loading sponsor strip:', error);
      container.innerHTML = '';
    }
  }

  window.GlotempSponsorStrip = { mount };
})();
