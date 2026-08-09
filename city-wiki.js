// Glotemp x Wikipedia: a live "About <city>" panel sourced from the
// free, keyless Wikipedia REST API (CORS-enabled for browser use).
// Fetched client-side in the visitor's browser on every page load --
// never stored, never fabricated, never proxied through Glotemp's own
// infrastructure. Wikipedia has one general article per city, not a
// breakdown per Glotemp vertical, so this renders once per city page.
(function () {
  const API_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

  async function fetchSummary(title) {
    const resp = await fetch(API_BASE + encodeURIComponent(title), {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data || data.type === 'disambiguation') return null;
    return data;
  }

  function escapeHTML(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function renderLoading(container) {
    container.innerHTML = '<p class="wiki-status">Loading from Wikipedia&hellip;</p>';
  }

  function renderError(container, cityName) {
    container.innerHTML = `<p class="wiki-status">Couldn't load a Wikipedia summary for ${escapeHTML(cityName)} right now.</p>`;
  }

  function renderSummary(container, data, cityName) {
    const pageUrl = (data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page) || '#';
    const img = data.thumbnail
      ? `<a class="wiki-image-link" href="${escapeHTML(pageUrl)}" target="_blank" rel="noopener noreferrer">
           <img class="wiki-image" src="${escapeHTML(data.thumbnail.source)}" alt="${escapeHTML(cityName)}" loading="lazy" decoding="async">
         </a>`
      : '';
    const extract = data.extract
      ? `<p class="wiki-extract">${escapeHTML(data.extract)}</p>`
      : '<p class="wiki-extract wiki-status">No summary available for this city yet.</p>';

    container.innerHTML = `
      <div class="wiki-panel-body${img ? '' : ' no-image'}">
        ${img}
        <div class="wiki-text">
          ${extract}
          <a class="wiki-source-link" href="${escapeHTML(pageUrl)}" target="_blank" rel="noopener noreferrer">Read more on Wikipedia &rarr;</a>
        </div>
      </div>
      <p class="wiki-attribution">Summary${img ? ' and image' : ''} via Wikipedia, CC BY-SA 4.0.</p>
    `;
  }

  // cityName is tried first, then "cityName, country" as a fallback for
  // titles Wikipedia disambiguates by country (e.g. smaller cities that
  // share a name with somewhere better-known).
  async function loadCityWiki(cityName, country) {
    const container = document.getElementById('city-wiki-panel');
    if (!container || !cityName) return;
    renderLoading(container);
    try {
      let data = await fetchSummary(cityName);
      if (!data && country) data = await fetchSummary(`${cityName}, ${country}`);
      if (!data) {
        renderError(container, cityName);
        return;
      }
      renderSummary(container, data, cityName);
    } catch (e) {
      renderError(container, cityName);
    }
  }

  window.GlotempWiki = { loadCityWiki, _renderSummary: renderSummary, _renderError: renderError };
})();
