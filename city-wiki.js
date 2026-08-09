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

  // ===== Per-vertical context =====
  // The lead summary above is one general panel. Glotemp's 12 verticals
  // don't exist as a breakdown on Wikipedia, but several DO correspond to
  // a real section most city articles actually carry (an "Economy"
  // heading, a "Sports" heading, and so on). This fetches the FULL
  // article once per city (explaintext + section markers via the action
  // API, which is free, keyless, and CORS-enabled with origin=*), and
  // hands each vertical the real excerpt if -- and only if -- a matching
  // section genuinely exists. No match, no forced content: several
  // verticals (fashion, pulse, sport in a small city with no dedicated
  // section) will legitimately render nothing here, same honesty rule as
  // every empty state elsewhere on the site.
  const ACTION_API = 'https://en.wikipedia.org/w/api.php';

  const VERTICAL_SECTIONS = {
    finance: ['Economy'],
    work: ['Economy'],
    tech: ['Economy'],
    property: ['Real estate', 'Housing', 'Economy'],
    education: ['Education'],
    sport: ['Sports', 'Sport'],
    entertainment: ['Culture', 'Arts and entertainment', 'Arts'],
    fashion: [],
    food: ['Cuisine', 'Food'],
    health: ['Healthcare', 'Health'],
    transport: ['Transportation', 'Transport', 'Infrastructure'],
    pulse: [],
  };

  function parseSections(extract) {
    const sections = new Map();
    let current = 'introduction';
    let buffer = [];
    const flush = () => {
      const text = buffer.join('\n').trim();
      if (text) sections.set(current, text);
      buffer = [];
    };
    extract.split('\n').forEach((line) => {
      const m = line.match(/^==\s*([^=]+?)\s*==$/);
      if (m) {
        flush();
        current = m[1].trim().toLowerCase();
      } else {
        buffer.push(line);
      }
    });
    flush();
    return sections;
  }

  async function fetchFullSections(title) {
    const url = `${ACTION_API}?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&titles=${encodeURIComponent(title)}&format=json&origin=*`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const pages = data && data.query && data.query.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined || !page.extract) return null;
    return parseSections(page.extract);
  }

  const sectionsCache = new Map();
  function getSectionsCached(cityName, country) {
    const key = `${cityName}|${country || ''}`;
    if (sectionsCache.has(key)) return sectionsCache.get(key);
    const promise = (async () => {
      let sections = await fetchFullSections(cityName);
      if (!sections && country) sections = await fetchFullSections(`${cityName}, ${country}`);
      return sections;
    })();
    sectionsCache.set(key, promise);
    return promise;
  }

  function findSection(sections, candidates) {
    for (const c of candidates) {
      const hit = sections.get(c.toLowerCase());
      if (hit) return { heading: c, text: hit };
    }
    return null;
  }

  function trimExcerpt(text, maxLen) {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    let cut = clean.slice(0, maxLen);
    const lastStop = cut.lastIndexOf('. ');
    if (lastStop > maxLen * 0.5) cut = cut.slice(0, lastStop + 1);
    return cut.trim() + (cut.endsWith('.') ? '' : '…');
  }

  async function loadVerticalContext(cityName, country, verticalSlug) {
    const candidates = VERTICAL_SECTIONS[verticalSlug];
    const mount = document.getElementById(`${verticalSlug}-context`);
    if (!mount || !candidates || !candidates.length || !cityName) return;
    try {
      const sections = await getSectionsCached(cityName, country);
      if (!sections) return;
      const match = findSection(sections, candidates);
      if (!match) return;
      const excerpt = trimExcerpt(match.text, 560);
      if (!excerpt) return;
      mount.insertAdjacentHTML('beforeend', `
        <div class="context-block context-wikipedia">
          <span class="context-tag">From Wikipedia &middot; ${escapeHTML(match.heading)}</span>
          <p class="context-fact">${escapeHTML(excerpt)}</p>
        </div>
      `);
    } catch (e) { /* no match is a valid, honest state -- render nothing */ }
  }

  function loadAllVerticalContexts(cityName, country, verticalSlugs) {
    (verticalSlugs || Object.keys(VERTICAL_SECTIONS)).forEach((v) => {
      loadVerticalContext(cityName, country, v);
    });
  }

  window.GlotempWiki = {
    loadCityWiki,
    loadVerticalContext,
    loadAllVerticalContexts,
    _renderSummary: renderSummary,
    _renderError: renderError,
  };
})();
