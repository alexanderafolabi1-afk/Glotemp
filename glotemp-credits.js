// Glotemp city credit: a sponsorship credit for the exact (city, vertical)
// a page represents. RLS on `partners` already restricts the anon read to
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

  function render(container, row) {
    container.innerHTML = `
      <a class="city-credit-link" href="${esc(row.url)}" target="_blank" rel="noopener sponsored" aria-label="Supported by ${esc(row.name)}">
        <span class="city-credit-kicker">Supported by</span>
        <img class="city-credit-logo" src="${esc(row.logo_path)}" alt="${esc(row.name)}" height="32" loading="lazy">
        <span class="city-credit-name">${esc(row.name)}</span>
        ${row.tagline ? `<span class="city-credit-tagline">${esc(row.tagline)}</span>` : ''}
        <span class="city-credit-url">${esc(displayUrl(row.url))}</span>
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
        `${SUPABASE_URL}/rest/v1/partners?city_slug=eq.${encodeURIComponent(citySlug)}&vertical=eq.${encodeURIComponent(vertical)}&select=*`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } }
      );
      if (!response.ok) { container.innerHTML = ''; return; }
      const rows = await response.json();
      if (!rows.length) { container.innerHTML = ''; return; }
      render(container, rows[Math.floor(Math.random() * rows.length)]);
    } catch (error) {
      console.error('Error loading city credit:', error);
      container.innerHTML = '';
    }
  }

  window.GlotempCredits = { mount };
})();
