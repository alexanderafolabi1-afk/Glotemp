// Glotemp x World Bank: real, sourced, country-level indicators shown as
// context alongside a vertical's live reading -- never a substitute for
// it. The World Bank Indicators API is free, keyless, and CORS-enabled
// for browser use. Fetched client-side, per visitor, never stored.
//
// World Bank has no city-level data -- these are national figures, and
// every render says so explicitly (country name + year), so nobody
// mistakes a country GDP figure for a city's own live mood reading.
(function () {
  const API_BASE = 'https://api.worldbank.org/v2/country/';

  // One indicator per vertical where a real, defensible correspondence
  // exists. Verticals with no honest match (property, sport, fashion,
  // entertainment, pulse) are simply absent here -- no forced mapping.
  const INDICATORS = {
    finance: { code: 'NY.GDP.PCAP.CD', label: 'GDP per capita', format: (v) => `$${Math.round(v).toLocaleString()}` },
    work: { code: 'SL.UEM.TOTL.ZS', label: 'Unemployment rate', format: (v) => `${v.toFixed(1)}%` },
    tech: { code: 'IT.NET.USER.ZS', label: 'Internet users', format: (v) => `${v.toFixed(0)}% of population` },
    health: { code: 'SP.DYN.LE00.IN', label: 'Life expectancy', format: (v) => `${v.toFixed(1)} years` },
    education: { code: 'SE.ADT.LITR.ZS', label: 'Adult literacy', format: (v) => `${v.toFixed(1)}%` },
    transport: { code: 'IS.VEH.NVEH.P3', label: 'Vehicles per 1,000 people', format: (v) => v.toFixed(0) },
  };

  const cache = new Map();

  async function fetchIndicator(iso2, code) {
    const key = iso2 + ':' + code;
    if (cache.has(key)) return cache.get(key);
    const promise = (async () => {
      try {
        const resp = await fetch(
          `${API_BASE}${encodeURIComponent(iso2)}/indicator/${encodeURIComponent(code)}?format=json&per_page=1&mrnev=1`,
          { headers: { Accept: 'application/json' } }
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        const row = Array.isArray(data) && Array.isArray(data[1]) ? data[1][0] : null;
        if (!row || row.value == null) return null;
        return { value: row.value, year: row.date, country: row.country && row.country.value };
      } catch (e) {
        return null;
      }
    })();
    cache.set(key, promise);
    return promise;
  }

  function escapeHTML(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Renders into #<vertical>-context if a real indicator exists for that
  // vertical AND the World Bank actually has a recent value for this
  // country. Silently leaves the mount empty otherwise -- no placeholder,
  // no invented number, matching the rest of the site's empty-state rule.
  async function loadVerticalIndicator(iso2, verticalSlug, countryName) {
    const spec = INDICATORS[verticalSlug];
    const mount = document.getElementById(`${verticalSlug}-context`);
    if (!spec || !mount || !iso2) return;
    const result = await fetchIndicator(iso2, spec.code);
    if (!result) return;
    mount.insertAdjacentHTML('beforeend', `
      <div class="context-block context-worldbank">
        <span class="context-tag">Country context &middot; World Bank</span>
        <p class="context-fact"><strong>${escapeHTML(spec.label)}:</strong> ${escapeHTML(spec.format(result.value))}
          <span class="context-meta">${escapeHTML(result.country || countryName || '')}, ${escapeHTML(String(result.year))}</span>
        </p>
      </div>
    `);
  }

  window.GlotempWorldBank = { loadVerticalIndicator, INDICATORS };
})();
