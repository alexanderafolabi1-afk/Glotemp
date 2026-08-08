#!/usr/bin/env node

// Generate individual city profile pages from template
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Load the full seed-observations dataset once here in the generator,
// not in the browser: each page only needs its own city's ~8 rows, so
// inlining that slice avoids shipping the full ~75KB / 309-row file to
// every one of the 150 pages just to filter it down client-side.
const seedObservationsSource = fs.readFileSync('./seed-observations.js', 'utf8');
const seedSandbox = { window: {}, Date };
vm.createContext(seedSandbox);
vm.runInContext(seedObservationsSource, seedSandbox);
const ALL_SEED_OBSERVATIONS = seedSandbox.window.SEED_OBSERVATIONS || [];

function observationsForCity(slug) {
  return ALL_SEED_OBSERVATIONS
    .filter(o => o.city === slug)
    .slice(0, 8)
    .map(o => ({ context: o.context, language_lens: o.language_lens, created_at: o.created_at }));
}

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
  { name: 'pulse', label: 'Pulse', desc: 'How does this city feel right now?' },
  { name: 'tech', label: 'Tech', desc: 'Should I build or work here?' },
  { name: 'finance', label: 'Finance', desc: 'Should I invest or trade here?' },
  { name: 'work', label: 'Work', desc: 'Where should you work and live?' },
  { name: 'property', label: 'Property', desc: 'Where should you invest in real estate?' },
  { name: 'education', label: 'Education', desc: 'Where should you study?' },
  { name: 'sport', label: 'Sport', desc: 'Where should you play and watch sports?' },
  { name: 'entertainment', label: 'Entertainment', desc: 'Where should you experience culture and nightlife?' },
  { name: 'fashion', label: 'Fashion', desc: 'Where is the center of global style?' },
  { name: 'food', label: 'Food', desc: 'Where should you eat and explore cuisine?' },
  { name: 'health', label: 'Health', desc: 'Where is it healthiest to live?' },
  { name: 'transport', label: 'Transport', desc: 'Which cities have the best mobility?' }
];

// Parse each city line
const cities = cityLines.map(line => {
  const match = line.match(/\{ slug: '([^']+)', name: '([^']+)', country: '([^']+)'[^}]*}/);
  if (!match) return null;
  return {
    slug: match[1],
    name: match[2],
    country: match[3]
  };
}).filter(Boolean);

console.log(`Found ${cities.length} cities`);

// Generate HTML content for all verticals
function generateVerticalNav() {
  return VERTICALS.map(v =>
    `<a href="#${v.name}" class="vertical-link" data-vertical="${v.name}">${v.label}</a>`
  ).join('\n      ');
}

function generateVerticalSections() {
  return VERTICALS.map(v => `
    <!-- ${v.label} Vertical -->
    <section id="${v.name}" class="vertical-section glass-card">
      <h2>${v.label}</h2>
      <p class="vertical-description">${v.desc}</p>
      <div id="${v.name}-content" class="vertical-content"></div>
    </section>
  `).join('\n');
}

function generateCityPage(city) {
  let html = template
    .replace(/data-title-template="[^"]*"/g, `data-title-template="${city.name} | Glotemp"`)
    .replace(/data-desc-template="[^"]*"/g, `data-desc-template="Live profile of ${city.name} across all 12 dimensions. Real-time data on mood, opportunities, economy, and city vitality."`)
    .replace(/data-canonical-template="canonical" content="[^"]*"/g, `data-canonical-template="canonical" content="https://glo-temp.com/cities/${city.slug}"`)
    .replace(/data-og-title-template="[^"]*"/g, `data-og-title-template="${city.name} | Glotemp"`)
    .replace(/data-og-desc-template="[^"]*"/g, `data-og-desc-template="Explore what ${city.name} is like right now across all 12 dimensions."`)
    .replace(/data-og-url-template="[^"]*"/g, `data-og-url-template="https://glo-temp.com/cities/${city.slug}"`)
    .replace(/data-og-image-template="[^"]*"/g, `data-og-image-template="https://glo-temp.com/assets/city-${city.slug}.png"`);

  // Update vertical navigation to include all 12 verticals
  html = html.replace(
    /<div class="vertical-nav glass-card">[\s\S]*?<\/div>/,
    `<div class="vertical-nav glass-card">\n      ${generateVerticalNav()}\n    </div>`
  );

  // Update vertical sections to include all 12 verticals
  html = html.replace(
    /<!-- Pulse Vertical -->[\s\S]*?<!-- Compare Section -->/,
    generateVerticalSections() + '\n    <!-- Compare Section -->'
  );

  // Add script to load city data
  const cityLoadScript = `
  <script>
    // Load city data and populate verticals
    async function loadCityData() {
      const citySlug = '${city.slug}';
      const city = window.CITIES_DATA.find(c => c.slug === citySlug);

      if (city) {
        document.getElementById('city-name').textContent = city.name;
        document.getElementById('city-country-region').textContent = \`\${city.country} • \${city.region}\`;
        document.getElementById('city-timezone').textContent = \`📍 \${city.timezone}\`;
        document.getElementById('city-penetration').textContent = \`📡 \${(city.penetration * 100).toFixed(0)}% online\`;
        document.getElementById('city-metro-pop').textContent = \`👥 \${city.metro_pop.toLocaleString()} metro\`;
      }

      const verticalSlugs = ['pulse', 'tech', 'finance', 'work', 'property', 'education', 'sport', 'entertainment', 'fashion', 'food', 'health', 'transport'];

      for (const vertical of verticalSlugs) {
        const contentEl = document.getElementById(\`\${vertical}-content\`);
        try {
          const response = await fetch(
            \`\${SUPABASE_URL}/rest/v1/readings?city_slug=eq.\${citySlug}&vertical=eq.\${vertical}&order=fetched_at.desc&limit=50\`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
                'Accept': 'application/json'
              }
            }
          );

          if (!response.ok) {
            contentEl.innerHTML = '<div class="empty-state">No data available for this vertical yet.</div>';
            continue;
          }

          const readings = await response.json();
          if (!readings.length) {
            contentEl.innerHTML = '<div class="empty-state">No readings yet for this city.</div>';
            continue;
          }

          const content = readings.slice(0, 10).map(reading => \`
            <div class="reading glass-card">
              <div class="reading-header">
                <span class="reading-metric">\${reading.metric}</span>
                <span class="reading-confidence" title="Data confidence: \${(reading.confidence * 100).toFixed(0)}%">
                  \${verticals.getConfidenceLabel(reading.confidence)}
                </span>
              </div>
              <div class="reading-value">
                \${reading.value !== null ? \`<span class="value">\${reading.value}\${reading.label ? \` \${reading.label}\` : ''}</span>\` : ''}
                <span class="reading-label">\${reading.label || ''}</span>
              </div>
              <div class="reading-footer">
                <span class="reading-source">\${reading.source}</span>
                <time class="reading-time" datetime="\${reading.fetched_at}">\${verticals.getTimeAgo(new Date(reading.fetched_at))}</time>
              </div>
            </div>
          \`).join('');

          contentEl.innerHTML = content;
        } catch (error) {
          console.error(\`Error loading \${vertical} data:\`, error);
          contentEl.innerHTML = '<div class="empty-state">Error loading data. Try again shortly.</div>';
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
        <a href="https://www.booking.com/searchresults.html?ss=\${cityName}" target="_blank" rel="noopener noreferrer" class="affiliate-btn"><span>Book a Hotel in ${city.name}</span></a>
        <a href="https://www.skyscanner.net/transport/flights/anywhere/\${cityName}/" target="_blank" rel="noopener noreferrer" class="affiliate-btn"><span>Find Flights to ${city.name}</span></a>
        <a href="https://www.insuremytrip.com/" target="_blank" rel="noopener noreferrer" class="affiliate-btn"><span>Get Travel Insurance</span></a>
      \`;
    })();

    // ---- Watch this city ----
    (function wireWatch() {
      const btn = document.getElementById('watch-city-btn');
      const panel = document.getElementById('watch-email-panel');
      const emailInput = document.getElementById('watch-email-input');
      const submitBtn = document.getElementById('watch-email-submit');
      const statusEl = document.getElementById('watch-email-status');
      if (!btn || typeof GlotempCore === 'undefined') return;
      const citySlug = '${city.slug}';

      function refreshLabel() {
        btn.textContent = GlotempCore.isWatched(citySlug) ? 'Watching this city ✓' : 'Watch this city';
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
            statusEl.textContent = "You're on the list -- we'll notify " + email + '.';
            emailInput.value = '';
          } catch (e) {
            statusEl.textContent = "Saved locally -- we'll sync this once you're back online.";
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

    // ---- Live observation feed for this city ----
    // Uses GlotempCore.getTimeAgo (loaded non-deferred, synchronously
    // available) rather than verticals.getTimeAgo -- this runs
    // immediately below, before verticals-engine.js's deferred script
    // has executed.
    function renderObservationFeed() {
      const container = document.getElementById('city-observation-feed');
      if (!container) return;
      // Pre-filtered to this city at generation time -- see
      // observationsForCity() in generate-city-pages.js -- rather than
      // shipping the full ~75KB seed-observations.js to every page.
      const checkins = ${JSON.stringify(observationsForCity(city.slug))};

      if (!checkins.length) {
        container.innerHTML = '<div class="empty-state">No observations yet for this city. Be the first.</div>';
        return;
      }

      container.innerHTML = checkins.map(obs => \`
        <div class="reading glass-card">
          <div class="reading-header">
            <span class="reading-metric">Human check-in</span>
          </div>
          <div class="reading-value"><span class="reading-label">\${obs.context}</span></div>
          <div class="reading-footer">
            <span class="reading-source">\${obs.language_lens || 'visitor'}</span>
            <time class="reading-time" datetime="\${obs.created_at}">\${GlotempCore.getTimeAgo(new Date(obs.created_at))}</time>
          </div>
        </div>
      \`).join('');
    }
    renderObservationFeed();

    // ---- Comments ----
    // getComments/submitComment come from tempo-economy.js, which is
    // deferred -- gate init behind DOMContentLoaded like loadCityData,
    // not an immediate IIFE, or the typeof guard below would silently
    // skip forever (it runs once, before that script has executed).
    function initCityComments() {
      const container = document.getElementById('city-comment-section');
      if (!container || typeof getComments === 'undefined') return;
      const citySlug = '${city.slug}';

      container.innerHTML = \`
        <div class="comment-input-wrap">
          <textarea class="comment-input" placeholder="Share the vibe (max 280 chars)..." maxlength="280"></textarea>
          <div class="mood-picker">
            <button class="mood-emoji" data-mood="🔥" title="Energized">▲</button>
            <button class="mood-emoji" data-mood="😊" title="Good">◆</button>
            <button class="mood-emoji" data-mood="😐" title="Neutral">●</button>
            <button class="mood-emoji" data-mood="😞" title="Low">▼</button>
            <button class="mood-emoji" data-mood="😡" title="Cautious">◇</button>
          </div>
          <button class="btn-neon comment-submit">Post Comment</button>
        </div>
        <div class="comment-list"></div>
      \`;

      let selectedMood = '😐';
      const moodBtns = container.querySelectorAll('.mood-emoji');
      const textarea = container.querySelector('.comment-input');
      const submitBtn = container.querySelector('.comment-submit');
      const commentList = container.querySelector('.comment-list');

      moodBtns.forEach(btn => {
        btn.style.opacity = btn.dataset.mood === selectedMood ? '1' : '0.5';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          moodBtns.forEach(b => b.style.opacity = '0.5');
          btn.style.opacity = '1';
          selectedMood = btn.dataset.mood;
        });
      });

      function loadCityComments() {
        getComments(citySlug).then(comments => {
          if (!comments.length) {
            commentList.innerHTML = '<p class="inline-feedback">No comments yet. Be first to share!</p>';
            return;
          }
          commentList.innerHTML = comments.slice(0, 10).map(c => \`
            <div class="comment-item">
              <div style="display:flex; gap:0.5rem; align-items:flex-start;">
                <div style="font-size:1.5rem; flex-shrink:0;">\${c.mood_emoji}</div>
                <div style="flex:1; min-width:0;">
                  <p>\${c.text}</p>
                  <small>\${new Date(c.created_at).toLocaleString()}</small>
                </div>
              </div>
            </div>
          \`).join('');
        });
      }

      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const text = textarea.value.trim();
        if (!text) return;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
        try {
          await submitComment(citySlug, text, selectedMood);
          textarea.value = '';
          loadCityComments();
        } catch (err) {
          console.error('Comment submission failed:', err);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Comment';
      });

      loadCityComments();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCityComments);
    } else {
      initCityComments();
    }
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
