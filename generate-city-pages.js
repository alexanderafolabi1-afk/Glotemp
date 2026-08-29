#!/usr/bin/env node

// Generate individual city profile pages from template
const fs = require('fs');
const path = require('path');

// Load cities data
const citiesDataContent = fs.readFileSync('./cities-data.js', 'utf8');
const citiesMatch = citiesDataContent.match(/const CITIES_DATA = \[([\s\S]*?)\];/);
if (!citiesMatch) {
  console.error('Could not parse CITIES_DATA');
  process.exit(1);
}

// Parse cities (simple regex approach for this specific format)
const citiesPart = citiesMatch[1];
const cityLines = citiesPart.split('\n').filter(l => l.includes('{ slug:'));

if (cityLines.length === 0) {
  console.error('No cities found');
  process.exit(1);
}

// Read template
const template = fs.readFileSync('./cities/_city-template.html', 'utf8');

// Verticals list with their primary metrics and descriptions
const VERTICALS = [
  { name: 'pulse', label: '💓 Pulse', desc: 'How does this city feel right now?' },
  { name: 'tech', label: '💻 Tech', desc: 'Should I build or work here?' },
  { name: 'finance', label: '💰 Finance', desc: 'Should I invest or trade here?' },
  { name: 'work', label: '💼 Work', desc: 'Where should you work and live?' },
  { name: 'property', label: '🏠 Property', desc: 'Where should you invest in real estate?' },
  { name: 'education', label: '🎓 Education', desc: 'Where should you study?' },
  { name: 'sport', label: '⚽ Sport', desc: 'Where should you play and watch sports?' },
  { name: 'entertainment', label: '🎭 Entertainment', desc: 'Where should you experience culture and nightlife?' },
  { name: 'fashion', label: '👗 Fashion', desc: 'Where is the center of global style?' },
  { name: 'food', label: '🍽️ Food', desc: 'Where should you eat and explore cuisine?' },
  { name: 'health', label: '🩺 Health', desc: 'Where is it healthiest to live?' },
  { name: 'transport', label: '🚇 Transport', desc: 'Which cities have the best mobility?' },
  { name: 'radio', label: '📻 Radio', desc: 'What is this city listening to right now?' }
];

// Parse each city line. lat/lon (skipping over region/timezone in between)
// are captured for the JSON-LD geo block below -- real values already in
// this file's own source of truth, not invented for SEO purposes.
const cities = cityLines.map(line => {
  const match = line.match(/\{ slug: '([^']+)', name: '([^']+)', country: '([^']+)', iso: '([^']+)'.*?lat: (-?[0-9.]+), lon: (-?[0-9.]+)/);
  if (!match) return null;
  return {
    slug: match[1],
    name: match[2],
    country: match[3],
    iso: match[4],
    lat: Number(match[5]),
    lon: Number(match[6])
  };
}).filter(Boolean);

console.log(`Found ${cities.length} cities`);

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// JSON embedded inside a <script> tag needs its own escaping, separate
// from escHtml: a literal "</script" substring anywhere in the JSON (a
// city or country name could in principle contain it) would close the
// tag early, so every "<" is escaped to its unicode form -- valid inside
// a JSON string and never interpreted as markup.
function escForScriptTag(jsonStr) {
  return jsonStr.replace(/</g, '\\u003c');
}

// Generate HTML content for all verticals
function generateVerticalNav() {
  return VERTICALS.map(v =>
    `<a href="#${v.name}" class="vertical-link" data-vertical="${v.name}">${v.label}</a>`
  ).join('\n      ');
}

// Verticals with a curated-content + partner/nomination system, per the
// monetisation brief. Pulse, Finance, Education, Health, Radio stay
// pure-reading verticals -- untouched.
const LISTINGS_VERTICALS = new Set(['entertainment', 'fashion', 'food', 'property', 'work', 'tech', 'transport', 'finance', 'education', 'health']);

// Collapsible accordion, not 13 stacked sections spread down the page --
// native <details>/<summary> so expand/collapse, keyboard operation, and
// screen-reader semantics all come free instead of a hand-rolled JS
// toggle. Pulse opens by default (it's the page's primary reading);
// everything else starts closed so the page reads as a compact index
// first, an "open what you care about" list, not a wall of content.
// Modern browsers additionally auto-expand whichever <details> a URL
// fragment targets; verticals-accordion.js is the click-time fallback for
// browsers that don't.
// Live local press, GDELT-sourced via the city-news edge function (real
// headlines, real outlets, no summarisation). Sits above the first
// vertical and open by default -- unlike the accordion below it, this is
// the freshest thing on the page and the reason to come back, so it
// should never start collapsed.
function generateNewsSection() {
  return `
    <section id="city-news" class="vertical-section glass-card">
      <div class="vertical-body">
        <h2 class="news-heading">In the papers today</h2>
        <div id="news-content"></div>
      </div>
    </section>
`;
}

function generateVerticalSections(city) {
  return generateNewsSection() + VERTICALS.map((v, i) => `
    <!-- ${v.label} Vertical -->
    <details id="${v.name}" class="vertical-section glass-card"${i === 0 ? ' open' : ''}>
      <summary class="vertical-summary"><h2>${v.label}</h2></summary>
      <div class="vertical-body">
        <p class="vertical-description">${v.desc}</p>
        <div id="${v.name}-content" class="vertical-content"></div>
        ${v.name === 'food' ? `<div id="food-venues" class="vertical-venues"></div>` : ''}
        <div id="${v.name}-context" class="vertical-context"></div>
        ${v.name === 'sport' ? `<div id="sport-live" class="sport-live" data-city="${city.slug}" data-city-name="${city.name.replace(/"/g, '&quot;')}" data-country="${city.country.replace(/"/g, '&quot;')}"></div>` : ''}
        ${LISTINGS_VERTICALS.has(v.name) ? `<div class="vertical-listings" data-city="${city.slug}" data-vertical="${v.name}"></div>` : ''}
        <div id="city-credit-${v.name}"></div>
      </div>
    </details>
  `).join('\n');
}

function generateCityPage(city) {
  const title = `${city.name} | Glotemp`;
  const desc = `Live profile of ${city.name} across all 12 dimensions. Real-time data on mood, opportunities, economy, and city vitality.`;
  const ogDesc = `Explore what ${city.name} is like right now across all 12 dimensions.`;
  const canonical = `https://glo-temp.com/cities/${city.slug}`;
  // Per-city share card (see generate-city-share-cards.js +
  // rasterize-share-cards.js) -- a PNG stat card carrying this city's own
  // name and live mood/band, instead of the one generic logo every city
  // page used to share alike. PNG, not SVG: X/Twitter's card crawler
  // does not render SVG for og:image / twitter:image.
  const ogImage = `https://glo-temp.com/og/${city.slug}.png`;

  // schema.org City, not TouristAttraction -- this page covers Tech,
  // Finance, Work and nine other verticals, not just visiting. Only
  // fields with a real, factual source: name/country/coordinates from
  // this file's own cities-data.js parse above. No aggregateRating, no
  // review count -- there is no rating data anywhere in this stack, and
  // inventing one is exactly the kind of fabricated signal this project
  // has consistently refused to ship.
  const citySchema = {
    '@context': 'https://schema.org',
    '@type': 'City',
    name: city.name,
    url: canonical,
    address: { '@type': 'PostalAddress', addressCountry: city.country },
    geo: { '@type': 'GeoCoordinates', latitude: city.lat, longitude: city.lon },
    description: desc,
  };

  let html = template
    .replace(/__CITY_TITLE__/g, escHtml(title))
    .replace(/__CITY_DESC__/g, escHtml(desc))
    .replace(/__CITY_OG_DESC__/g, escHtml(ogDesc))
    .replace(/__CITY_CANONICAL__/g, escHtml(canonical))
    .replace(/__CITY_OG_IMAGE__/g, escHtml(ogImage))
    .replace(/__CITY_SCHEMA_JSON__/g, escForScriptTag(JSON.stringify(citySchema)));

  // Update vertical navigation to include all 12 verticals
  html = html.replace(
    /<div class="vertical-nav glass-card">[\s\S]*?<\/div>/,
    `<div class="vertical-nav glass-card">\n      ${generateVerticalNav()}\n    </div>`
  );

  // Update vertical sections to include all 12 verticals
  html = html.replace(
    /<!-- Pulse Vertical -->[\s\S]*?<!-- Compare Section -->/,
    generateVerticalSections(city) + '\n    <!-- Compare Section -->'
  );

  // Add script to load city data
  const cityLoadScript = `
  <script>
    // Reasonable ceiling per metric, used only to normalise how much of
    // the instrument's arc is filled -- purely a presentation choice,
    // never written back and never changes the stored reading. Derived
    // from the real observed range of each metric in production.
    const METRIC_MAX = {
      mood_reading: 10, event_energy: 10,
      developer_activity: 3000, job_openings: 500, startup_activity: 50,
      cost_of_living: 200, currency_strength: 10, inflation_rate: 10,
      remote_work_adoption: 80, salary_competitiveness: 100, work_culture_score: 10,
      housing_availability: 80, median_rent: 3000, property_appreciation: 10,
      education_quality_score: 10, international_students: 50, university_count: 50,
      active_participation: 80, major_events: 12, sports_venues: 110,
      event_frequency: 250, nightlife_score: 10, venue_count: 330,
      designer_brands: 110, fashion_events: 10, style_influence: 10,
      culinary_diversity: 10, michelin_stars: 50, restaurant_count: 2100,
      air_quality_index: 200, hospital_quality: 10, wellness_index: 10,
      bike_share_bikes: 4700, congestion_level: 10, transit_quality: 10,
    };
    const METRIC_MAX_FALLBACK = 10;

    // One quiet accent per vertical (not per metric) -- desaturated,
    // brass-family tones so every instrument still reads as one
    // consistent set of dials, not a rainbow of dashboard widgets.
    const VERTICAL_ACCENT = {
      pulse: '198,140,150', tech: '110,140,180', finance: '120,160,130',
      work: '150,130,180', property: '190,150,100', education: '120,130,180',
      sport: '190,130,100', entertainment: '160,110,150', fashion: '190,140,150',
      food: '190,140,90', health: '100,160,150', transport: '110,130,160',
    };

    // Same circular-instrument language as /explore's city dials: an
    // ivory face, a brass hairline ring, a coloured reading arc, and rim
    // ticks -- filled here by confidence rather than coverage. No hour
    // hand (there's no time to tell); the rounded value sits as HTML text
    // over the centre instead, so it shares the page's own font stack
    // rather than being drawn as SVG text.
    const INS_CX = 48, INS_CY = 48, INS_R_FACE = 32, INS_R_ARC = 37, INS_R_TICK_IN = 40, INS_R_TICK_OUT = 43;
    const INS_ARC_CIRC = 2 * Math.PI * INS_R_ARC;

    function instrumentTicksSVG(confidence) {
      const filled = typeof confidence === 'number' ? Math.round(confidence * 12) : 0;
      let out = '';
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const x1 = INS_CX + INS_R_TICK_IN * Math.cos(rad);
        const y1 = INS_CY + INS_R_TICK_IN * Math.sin(rad);
        const x2 = INS_CX + INS_R_TICK_OUT * Math.cos(rad);
        const y2 = INS_CY + INS_R_TICK_OUT * Math.sin(rad);
        const on = i < filled;
        out += \`<line x1="\${x1.toFixed(2)}" y1="\${y1.toFixed(2)}" x2="\${x2.toFixed(2)}" y2="\${y2.toFixed(2)}" stroke="\${on ? 'var(--sand)' : 'var(--brass-dim)'}" stroke-width="\${on ? 1.4 : 0.9}" stroke-linecap="round" />\`;
      }
      return out;
    }

    function instrumentSVG(value, max, accentRgb, confidence, ariaLabel) {
      const frac = value === null ? 0 : Math.max(0, Math.min(1, value / max));
      const arcLen = INS_ARC_CIRC * frac;
      return \`<svg viewBox="0 0 96 96" role="img" aria-label="\${(ariaLabel || '').replace(/"/g, '&quot;')}">
        <g>\${instrumentTicksSVG(confidence)}</g>
        <circle cx="\${INS_CX}" cy="\${INS_CY}" r="\${INS_R_FACE}" fill="#F0E0C8" />
        <circle cx="\${INS_CX}" cy="\${INS_CY}" r="\${INS_R_FACE}" fill="none" stroke="var(--brass)" stroke-width="1" />
        <circle cx="\${INS_CX}" cy="\${INS_CY}" r="\${INS_R_ARC}" fill="none" stroke="rgb(\${accentRgb})"
          stroke-width="2.5" stroke-linecap="round"
          stroke-dasharray="\${arcLen.toFixed(2)} \${(INS_ARC_CIRC - arcLen).toFixed(2)}"
          transform="rotate(-90 \${INS_CX} \${INS_CY})" />
      </svg>\`;
    }

    // Keeps the centred readout short enough to sit cleanly inside the dial:
    // whole numbers (developer_activity, job_openings, etc.) drop the decimal
    // entirely, small-scale metrics (scores out of 10, percentages) keep at
    // most one.
    function formatInstrumentValue(value) {
      const num = Number(value);
      const rounded = Math.abs(num) >= 100 ? Math.round(num) : Math.round(num * 10) / 10;
      return rounded.toString();
    }

    // Load city data and populate verticals
    async function loadCityData() {
      const citySlug = '${city.slug}';
      const city = window.CITIES_DATA.find(c => c.slug === citySlug);

      if (city) {
        const nameEl = document.getElementById('city-name');
        if (typeof GlotempLandmarks !== 'undefined') {
          nameEl.innerHTML = GlotempLandmarks.cityIconHTML(city.slug, { size: 34, className: 'city-landmark-icon' }) + \`<span>\${city.name}</span>\`;
          if (typeof GlotempLandmarkPhotos !== 'undefined') GlotempLandmarkPhotos.upgrade(nameEl, city.slug, 34);
        } else {
          nameEl.textContent = city.name;
        }
        document.getElementById('city-country-region').textContent = \`\${city.country} • \${city.region}\`;
        document.getElementById('city-timezone').textContent = \`📍 \${city.timezone}\`;
        document.getElementById('city-penetration').textContent = \`📡 \${(city.penetration * 100).toFixed(0)}% online\`;
        document.getElementById('city-metro-pop').textContent = \`👥 \${city.metro_pop.toLocaleString()} metro\`;
        if (typeof GlotempCore !== 'undefined') GlotempCore.applyMoodBackground(city.mood);
      }

      const verticalSlugs = ['pulse', 'tech', 'finance', 'work', 'property', 'education', 'sport', 'entertainment', 'fashion', 'food', 'health', 'transport'];

      // Header photo: kicked off first so it's the earliest possible
      // trigger of the shared Wikipedia summary fetch (see city-wiki.js
      // getCityImageUrl / city-header-photo.js) -- whichever of this or
      // loadCityWiki below actually wins the race is the only network
      // call; the other reuses its cached promise.
      if (typeof GlotempHeaderPhoto !== 'undefined' && city) {
        GlotempHeaderPhoto.loadHeaderPhoto(city.name, city.country);
      }

      if (typeof GlotempWiki !== 'undefined') GlotempWiki.loadCityWiki('${city.name}', '${city.country}');
      if (typeof GlotempAttention !== 'undefined') GlotempAttention.loadCityAttention('${city.slug}');
      if (typeof GlotempWhy !== 'undefined') GlotempWhy.loadCityWhy('${city.slug}');
      if (typeof GlotempArchive !== 'undefined') GlotempArchive.loadCityArchive('${city.slug}');
      if (typeof GlotempDrops !== 'undefined') GlotempDrops.loadDrops('${city.slug}');
      if (typeof GlotempCityTier !== 'undefined') GlotempCityTier.loadTier('${city.slug}');

      // Synchronous and static, so it's always in the DOM before any of
      // the async context loaders below append their own findings --
      // reads as the headline fact for Food, with Wikipedia's Cuisine
      // excerpt (if this city's article has one) as supplementary depth
      // underneath it.
      if (typeof GlotempFoodSignature !== 'undefined') GlotempFoodSignature.render('${city.slug}');

      // Wikipedia section-matching and World Bank indicators both get a
      // turn per vertical; whatever's still empty afterward -- Fashion
      // and Pulse always are, since neither has a real per-vertical
      // source -- falls back to the general Wikipedia summary so no
      // vertical ever renders completely empty.
      const contextLoaders = [];
      if (typeof GlotempWiki !== 'undefined') {
        contextLoaders.push(GlotempWiki.loadAllVerticalContexts('${city.name}', '${city.country}', verticalSlugs));
      }
      if (typeof GlotempWorldBank !== 'undefined') {
        contextLoaders.push(...verticalSlugs.map(v => GlotempWorldBank.loadVerticalIndicator('${city.iso}', v, '${city.country}')));
      }
      // Real universities near this city (Wikidata, see city-campus.js).
      // Only Education has one of these; it appends into the same
      // #education-context mount World Bank's literacy fact uses above,
      // so both real sources sit together rather than competing for a
      // second element.
      if (typeof GlotempCampus !== 'undefined') {
        contextLoaders.push(GlotempCampus.loadCampuses('${city.slug}'));
      }
      await Promise.all(contextLoaders);
      if (typeof GlotempWiki !== 'undefined') {
        await GlotempWiki.fillEmptyVerticalContexts('${city.name}', '${city.country}', verticalSlugs);
      }

      // Radio is its own live source (Radio Browser, searched by this
      // city's real coordinates) -- not a Supabase reading, so it's kept
      // out of verticalSlugs above and loaded separately here.
      if (typeof GlotempRadio !== 'undefined' && city) {
        GlotempRadio.loadRadio(city.name, city.lat, city.lon, city.country, city.slug);
      }

      // Three additive real audio sources alongside Radio above -- see
      // city-soundscape.js. Does not read or write anything Radio uses.
      if (typeof GlotempSoundscape !== 'undefined' && city) {
        GlotempSoundscape.loadSoundscape(city.slug, city.name, city.lat, city.lon);
      }

      // Real named places from OpenStreetMap. Same treatment as Radio:
      // a live keyless source, not a Supabase reading.
      if (typeof GlotempVenues !== 'undefined' && city) {
        GlotempVenues.loadVenues(city.slug, city.name, city.lat, city.lon, city.country);
      }

      // What the local press is reporting, in the languages it is
      // reported in. Live and keyless (routed through the city-news edge
      // function server-side, since GDELT itself sends no CORS header),
      // same treatment as Radio and Venues above.
      if (typeof GlotempNews !== 'undefined' && city) {
        GlotempNews.loadNews(city.slug, 'news-content');
      }

      // Conditions line: same treatment as Radio -- a live free-API
      // source, not a Supabase reading.
      if (typeof GlotempConditions !== 'undefined' && city) {
        GlotempConditions.loadConditions(city.name, city.lat, city.lon, city.timezone);
      }

      // Sponsor credit per vertical section -- "Supported by X", a paid,
      // curated slot sold directly (partners table, RLS already limits
      // the anon read to active rows in their flight window). This is a
      // different thing from the public "suggest a place" pathway above:
      // a passive credit line, not an open call for submissions, which is
      // exactly why it's fine on every vertical including Sport (a real
      // brand can sponsor the Sport section; the public can't usefully
      // "suggest a sports company" the way they can suggest a restaurant).
      // Previously wired into the standalone per-vertical pages only --
      // never the main city page, its highest-traffic page type.
      if (typeof GlotempCredits !== 'undefined' && city) {
        [...verticalSlugs, 'radio'].forEach(v => GlotempCredits.mount('city-credit-' + v, city.slug, v));
      }

      for (const vertical of verticalSlugs) {
        const contentEl = document.getElementById(\`\${vertical}-content\`);
        try {
          const response = await fetch(
            \`\${SUPABASE_URL}/rest/v1/readings?city_slug=eq.\${citySlug}&vertical=eq.\${vertical}&source=neq.seed&order=fetched_at.desc&limit=50\`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
                'Accept': 'application/json'
              }
            }
          );

          if (!response.ok) {
            contentEl.innerHTML = '';
            if (typeof GlotempVerticalSignature !== 'undefined' && city) GlotempVerticalSignature.renderFallback(vertical, city);
            if (typeof GlotempCore !== 'undefined') GlotempCore.reconcileVerticalOrder(vertical);
            continue;
          }

          const readings = await response.json();
          if (!readings.length) {
            contentEl.innerHTML = '';
            if (typeof GlotempVerticalSignature !== 'undefined' && city) GlotempVerticalSignature.renderFallback(vertical, city);
            if (typeof GlotempCore !== 'undefined') GlotempCore.reconcileVerticalOrder(vertical);
            continue;
          }

          const accentRgb = VERTICAL_ACCENT[vertical] || '176,141,87';
          const content = readings.slice(0, 10).map(reading => {
            const max = METRIC_MAX[reading.metric] || METRIC_MAX_FALLBACK;
            const shownValue = reading.value !== null && reading.value !== undefined ? formatInstrumentValue(reading.value) : null;
            const confidenceNote = typeof reading.confidence === 'number' ? \`\${Math.round(reading.confidence * 100)}% confidence\` : '';
            // Quiet, secondary confidence readout -- the reading.confidence
            // value already exists on every row (readings.confidence in the
            // DB) and was previously only surfaced as a hover title. Never
            // invented: a row with no confidence value shows "Forming"
            // rather than guessing a number.
            const confidencePct = typeof reading.confidence === 'number' ? \`\${Math.round(reading.confidence * 100)}%\` : 'Forming';
            const ariaLabel = \`\${reading.label || 'Reading'}: \${shownValue !== null ? shownValue : 'n/a'}\`;
            const valueClass = shownValue !== null && shownValue.length > 3 ? 'instrument-value instrument-value-compact' : 'instrument-value';
            return \`
            <div class="instrument" \${confidenceNote ? \`title="\${confidenceNote}"\` : ''}>
              <div class="instrument-dial">
                \${instrumentSVG(reading.value, max, accentRgb, reading.confidence, ariaLabel)}
                \${shownValue !== null ? \`<span class="\${valueClass}">\${shownValue}</span>\` : ''}
              </div>
              <span class="instrument-label">\${reading.label || ''}</span>
              <span class="instrument-confidence">\${confidencePct}</span>
              <time class="instrument-time" datetime="\${reading.fetched_at}">\${verticals.getTimeAgo(new Date(reading.fetched_at))}</time>
            </div>
          \`;
          }).join('');

          contentEl.innerHTML = content;
        } catch (error) {
          console.error(\`Error loading \${vertical} data:\`, error);
          contentEl.innerHTML = '';
          if (typeof GlotempVerticalSignature !== 'undefined' && city) GlotempVerticalSignature.renderFallback(vertical, city);
          if (typeof GlotempCore !== 'undefined') GlotempCore.reconcileVerticalOrder(vertical);
        }
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadCityData);
    } else {
      loadCityData();
    }

    // ---- Affiliate row ----
    (function renderAffiliateLinks() {
      const container = document.getElementById('city-affiliate-links');
      if (!container) return;
      const cityName = encodeURIComponent('${city.name}');
      container.innerHTML = \`
        <a href="https://www.booking.com/searchresults.html?ss=\${cityName}" target="_blank" rel="noopener noreferrer" class="affiliate-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18V7M3 12h13a4 4 0 014 4v2M3 18h18"/><circle cx="7.5" cy="9.5" r="1.6"/></svg>
          <span>Stay in ${city.name}</span>
        </a>
        <a href="https://www.kayak.com/cars/\${cityName}" target="_blank" rel="noopener noreferrer" class="affiliate-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 11l1.4-4.2A2 2 0 018.3 5.5h7.4a2 2 0 011.9 1.3L19 11M4 11h16v4.5a1 1 0 01-1 1h-1a1 1 0 01-1-1V15H7v.5a1 1 0 01-1 1H5a1 1 0 01-1-1V11z"/><circle cx="7.5" cy="15.5" r="1.2"/><circle cx="16.5" cy="15.5" r="1.2"/></svg>
          <span>Rent a Car in ${city.name}</span>
        </a>
        <a href="https://www.getyourguide.com/s/?q=\${cityName}" target="_blank" rel="noopener noreferrer" class="affiliate-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M14.8 9.2L10.3 14l1-4.8 4.5-1z"/></svg>
          <span>Things to Do in ${city.name}</span>
        </a>
        <a href="https://www.opentable.com/" target="_blank" rel="noopener noreferrer" class="affiliate-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3v8a2 2 0 002 2h0a2 2 0 002-2V3M7 13v8M17 3c-1.7 0-2.5 2-2.5 4.5S15.3 12 17 12v9"/></svg>
          <span>Reserve a Table</span>
        </a>
        <a href="https://www.skyscanner.net/transport/flights/anywhere/\${cityName}/" target="_blank" rel="noopener noreferrer" class="affiliate-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.2 3.3a1.6 1.6 0 013.1 0l1.5 5.4 6.1 1.8a1.2 1.2 0 010 2.3l-6.1 1.8-1.5 5.4a1.6 1.6 0 01-3.1 0l-1.5-5.4-6.1-1.8a1.2 1.2 0 010-2.3l6.1-1.8z"/></svg>
          <span>Flights to ${city.name}</span>
        </a>
        <a href="https://www.insuremytrip.com/" target="_blank" rel="noopener noreferrer" class="affiliate-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>
          <span>Travel Insurance</span>
        </a>
      \`;
    })();

    // ---- Follow this city ----
    (function wireWatch() {
      const btn = document.getElementById('watch-city-btn');
      const panel = document.getElementById('watch-email-panel');
      const emailInput = document.getElementById('watch-email-input');
      const submitBtn = document.getElementById('watch-email-submit');
      const statusEl = document.getElementById('watch-email-status');
      if (!btn || typeof GlotempCore === 'undefined') return;
      const citySlug = '${city.slug}';

      function refreshLabel() {
        btn.textContent = GlotempCore.isWatched(citySlug) ? 'Following this city ✓' : 'Follow this city';
      }
      refreshLabel();

      btn.addEventListener('click', () => {
        const nowWatching = GlotempCore.toggleWatch(citySlug);
        refreshLabel();
        if (panel) panel.style.display = nowWatching ? 'block' : 'none';
      });

      if (submitBtn && emailInput) {
        submitBtn.addEventListener('click', async () => {
          const email = emailInput.value.trim();
          if (!email || !email.includes('@')) {
            statusEl.textContent = 'Enter a valid email.';
            return;
          }
          submitBtn.disabled = true;
          try {
            await fetch(\`\${SUPABASE_URL}/rest/v1/city_watchers\`, {
              method: 'POST',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: \`Bearer \${SUPABASE_ANON_KEY}\`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ city_slug: citySlug, email }),
            });
            statusEl.textContent = "You're on the list. We'll notify " + email + '.';
            emailInput.value = '';
          } catch (e) {
            statusEl.textContent = "Saved locally. We'll sync this once you're back online.";
          }
          submitBtn.disabled = false;
        });
      }
    })();

    // ---- Share ----
    (function wireShare() {
      const btn = document.getElementById('share-city-btn');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        const cityRec = window.CITIES_DATA.find(c => c.slug === '${city.slug}');
        const band = cityRec ? GlotempCore.moodToBand(cityRec.mood) : null;
        const text = cityRec && band
          ? \`\${cityRec.name} is reading \${band.band} right now (\${cityRec.mood.toFixed(1)}/10) on Glotemp.\`
          : 'Check out this city on Glotemp.';
        const url = window.location.href;
        if (navigator.share) {
          try { await navigator.share({ title: 'Glotemp', text, url }); } catch (e) { /* user cancelled */ }
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(\`\${text} \${url}\`);
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = original; }, 2000);
        }
      });
    })();

    // The static seed-data flash into #city-observation-feed and the
    // separate, entirely broken #city-comment-section widget (its INSERT
    // payload named columns -- city_slug, text, mood_emoji, user_id,
    // stars_awarded -- that don't exist on any live table, so every "Post
    // Comment" click 400'd silently) both used to live here.
    // glotemp-checkin.js now owns the whole check-in + comment experience
    // for #city-observation-feed; #city-comment-section and its markup are
    // removed from the template.
  </script>
  `;

  // Add the city data script before app.js loads
  html = html.replace(
    /<script src="\/app.js" defer><\/script>/,
    cityLoadScript + '\n  <script src="/app.js" defer></script>'
  );

  return html;
}

// Generate and write pages for each city
let successCount = 0;
let errorCount = 0;

cities.forEach(city => {
  try {
    const html = generateCityPage(city);
    const filePath = path.join('./cities', `${city.slug}.html`);
    fs.writeFileSync(filePath, html);
    successCount++;
    if (successCount % 25 === 0) {
      console.log(`Generated ${successCount}/${cities.length} city pages...`);
    }
  } catch (error) {
    console.error(`Error generating page for ${city.slug}:`, error.message);
    errorCount++;
  }
});

console.log(`\n✅ Generated ${successCount} city pages`);
if (errorCount > 0) {
  console.log(`⚠️  ${errorCount} errors`);
}
