#!/usr/bin/env node
// Generate /cities/<slug>/<vertical>/index.html for every city x vertical
// combination (150 x 12 = 1800 pages): a focused, indexable single-vertical
// view of a single city, linking back to the full profile and to that
// vertical's ranking table.
const fs = require('fs');
const path = require('path');

const citiesDataContent = fs.readFileSync('./cities-data.js', 'utf8');
const citiesMatch = citiesDataContent.match(/const CITIES_DATA = \[([\s\S]*?)\];/);
if (!citiesMatch) { console.error('Could not parse CITIES_DATA'); process.exit(1); }
const cityLines = citiesMatch[1].split('\n').filter(l => l.includes('{ slug:'));
const cities = cityLines.map(line => {
  const m = line.match(/\{ slug: '([^']+)', name: '([^']+)', country: '([^']+)', iso: '([^']+)'/);
  return m ? { slug: m[1], name: m[2], country: m[3], iso: m[4] } : null;
}).filter(Boolean);

const VERTICALS = [
  { slug: 'pulse', label: 'Pulse', desc: 'How does this city feel right now?' },
  { slug: 'tech', label: 'Tech', desc: 'Should I build or work here?' },
  { slug: 'finance', label: 'Finance', desc: 'Should I invest or trade here?' },
  { slug: 'work', label: 'Work', desc: 'Where should you work and live?' },
  { slug: 'property', label: 'Property', desc: 'Where should you invest in real estate?' },
  { slug: 'education', label: 'Education', desc: 'Where should you study?' },
  { slug: 'sport', label: 'Sport', desc: 'Where should you play and watch sports?' },
  { slug: 'entertainment', label: 'Entertainment', desc: 'Where should you experience culture and nightlife?' },
  { slug: 'fashion', label: 'Fashion', desc: 'Where is the center of global style?' },
  { slug: 'food', label: 'Food', desc: 'Where should you eat and explore cuisine?' },
  { slug: 'health', label: 'Health', desc: 'Where is it healthiest to live?' },
  { slug: 'transport', label: 'Transport', desc: 'Which cities have the best mobility?' },
];

function pageHTML(city, v) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#06060A" />
  <meta name="description" content="${v.label} in ${city.name}: ${v.desc} Live readings, updated as new signal arrives.">
  <meta property="og:title" content="${v.label} in ${city.name} - Glotemp" />
  <meta property="og:description" content="${v.desc}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://glo-temp.com/cities/${city.slug}/${v.slug}/" />
  <meta property="og:image" content="https://glo-temp.com/assets/city-${city.slug}.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="https://glo-temp.com/cities/${city.slug}/${v.slug}/" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />
  <title>${v.label} in ${city.name} - Glotemp</title>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "${v.label} in ${city.name}",
    "description": "${v.desc}",
    "url": "https://glo-temp.com/cities/${city.slug}/${v.slug}/",
    "spatialCoverage": "${city.name}, ${city.country}"
  }
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://hnysztednzqfzbmiqqgl.supabase.co" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,100..900,0..100,0..1&family=Manrope:wght@400..700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css?v=38" />
</head>
<body>
  <nav id="site-nav"></nav>
  <script src="/nav-component.js"></script>

  <main class="page-main">
    <section class="glass-card page-header">
      <p class="eyebrow"><a href="/cities/${city.slug}.html" data-city-link="${city.slug}" data-city-nav="false" style="color:var(--sand);">${city.name}, ${city.country}</a> · ${v.label}</p>
      <h1>${v.label} in ${city.name}</h1>
      <p class="section-copy" style="color:var(--sand); max-width:64ch;">${v.desc}</p>
    </section>

    <section id="${v.slug}" class="vertical-section glass-card">
      <div id="${v.slug}-content" class="vertical-content"></div>
      <div id="${v.slug}-context" class="vertical-context"></div>
    </section>

    <section class="glass-card" style="display:flex; gap:1rem; flex-wrap:wrap; justify-content:center; padding:2rem; text-align:center;">
      <a href="/cities/${city.slug}.html" class="btn-neon" style="text-decoration:none; display:inline-block;">Full ${city.name} profile</a>
      <a href="/rankings/${v.slug}/" class="btn-neon" style="text-decoration:none; display:inline-block;">${v.label} rankings, all cities</a>
    </section>
  </main>

  <footer class="footer glass">
    <p>© 2026 RenviaIT Ltd. All rights reserved.</p>
    <p class="small-print">
      <a href="/privacy">Privacy Policy</a> | <a href="/terms">Terms of Service</a> | <a href="#" id="cookie-settings">Cookie Settings</a>
    </p>
    <p class="small-print footer-lang-row">
      <button type="button" id="lang-switch" class="footer-lang">Language</button>
    </p>
  </footer>

  <script src="/cities-data.js"></script>
  <script src="/glotemp-core.js"></script>
  <script src="/city-wiki.js" defer></script>
  <script src="/city-worldbank.js" defer></script>
  <script src="/verticals-engine.js" defer></script>
  <script>
    // SUPABASE_URL / SUPABASE_ANON_KEY come from verticals-engine.js
    // (deferred, but resolved by the time DOMContentLoaded fires below) --
    // redeclaring them here would collide with that script's top-level
    // const and throw, since classic <script> tags share one scope.

    // Override GlotempCore's pinned-city default with this page's own city.
    (function () {
      var rec = (window.CITIES_DATA || []).find(function (c) { return c.slug === '${city.slug}'; });
      if (rec && typeof GlotempCore !== 'undefined') GlotempCore.applyMoodBackground(rec.mood);
    })();

    // Real, sourced context for this one vertical -- a Wikipedia section
    // excerpt where a genuine one exists, plus a World Bank country
    // indicator where this vertical has a defensible one. Neither
    // replaces the live reading above; both render nothing if there's no
    // honest match, same rule as every empty state on the site.
    document.addEventListener('DOMContentLoaded', async function () {
      const loaders = [];
      if (typeof GlotempWiki !== 'undefined') loaders.push(GlotempWiki.loadVerticalContext('${city.name}', '${city.country}', '${v.slug}'));
      if (typeof GlotempWorldBank !== 'undefined') loaders.push(GlotempWorldBank.loadVerticalIndicator('${city.iso}', '${v.slug}', '${city.country}'));
      await Promise.all(loaders);
      // Fashion and Pulse (and any city whose article lacks this
      // vertical's section) have no per-vertical source at all -- fall
      // back to the general Wikipedia summary so this page is never left
      // with nothing but an empty reading.
      if (typeof GlotempWiki !== 'undefined') {
        await GlotempWiki.fillEmptyVerticalContexts('${city.name}', '${city.country}', ['${v.slug}']);
      }
    });

    async function loadVerticalContent() {
      const contentEl = document.getElementById('${v.slug}-content');
      try {
        const response = await fetch(
          \`\${SUPABASE_URL}/rest/v1/readings?city_slug=eq.${city.slug}&vertical=eq.${v.slug}&order=fetched_at.desc&limit=50\`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: \`Bearer \${SUPABASE_ANON_KEY}\`, Accept: 'application/json' } }
        );
        if (!response.ok) {
          contentEl.innerHTML = '';
          if (typeof GlotempCore !== 'undefined') GlotempCore.reconcileVerticalOrder('${v.slug}');
          return;
        }
        const readings = await response.json();
        if (!readings.length) {
          contentEl.innerHTML = '';
          if (typeof GlotempCore !== 'undefined') GlotempCore.reconcileVerticalOrder('${v.slug}');
          return;
        }
        contentEl.innerHTML = readings.slice(0, 15).map(reading => {
          const isModelled = reading.source === 'seed' || (typeof reading.confidence === 'number' && reading.confidence < 0.6);
          return \`
          <div class="reading glass-card">
            <div class="reading-header">
              <span class="reading-metric">\${reading.metric}</span>
              <span class="reading-confidence" title="Data confidence: \${(reading.confidence * 100).toFixed(0)}%">
                \${verticals.getConfidenceLabel(reading.confidence)}
                <span class="reading-confidence-track"><span class="reading-confidence-fill" style="width:\${Math.round(reading.confidence * 100)}%"></span></span>
              </span>
            </div>
            <div class="reading-value">
              \${reading.value !== null ? \`<span class="value">\${reading.value}\${reading.label ? \` \${reading.label}\` : ''}</span>\` : ''}
              <span class="reading-label">\${reading.label || ''}</span>
            </div>
            <div class="reading-footer">
              <span class="reading-source">\${reading.source}</span>
              <span class="reading-provenance reading-provenance--\${isModelled ? 'modelled' : 'observed'}">\${isModelled ? 'Modelled' : 'Observed'}</span>
              <time class="reading-time" datetime="\${reading.fetched_at}">\${verticals.getTimeAgo(new Date(reading.fetched_at))}</time>
            </div>
          </div>
        \`;
        }).join('');
      } catch (error) {
        console.error('Error loading ${v.slug} data:', error);
        contentEl.innerHTML = '<div class="empty-state">Error loading data. Try again shortly.</div>';
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadVerticalContent);
    } else {
      loadVerticalContent();
    }
    GlotempCore.wireCityLinks(document);
    const lang = localStorage.getItem('glotemp-lang') || 'en';
    document.documentElement.lang = lang;
  </script>
  <script src="/cookie-consent.js" defer></script>
  <script src="/tempo-economy.js" defer></script>
</body>
</html>
`;
}

let count = 0;
cities.forEach(city => {
  VERTICALS.forEach(v => {
    const dir = path.join(__dirname, 'cities', city.slug, v.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), pageHTML(city, v));
    count++;
  });
});
console.log(`✅ Generated ${count} city x vertical pages (${cities.length} cities x ${VERTICALS.length} verticals)`);
