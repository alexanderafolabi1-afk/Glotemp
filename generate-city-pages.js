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

      const verticals = ['pulse', 'tech', 'finance', 'work', 'property', 'education', 'sport', 'entertainment', 'fashion', 'food', 'health', 'transport'];

      for (const vertical of verticals) {
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
            document.getElementById(\`\${vertical}-content\`).innerHTML = '<p>No data available</p>';
            continue;
          }

          const readings = await response.json();
          if (readings.length === 0) {
            document.getElementById(\`\${vertical}-content\`).innerHTML = '<p>No readings yet for this city</p>';
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

          document.getElementById(\`\${vertical}-content\`).innerHTML = content;
        } catch (error) {
          console.error(\`Error loading \${vertical} data:\`, error);
          document.getElementById(\`\${vertical}-content\`).innerHTML = '<p>Error loading data</p>';
        }
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadCityData);
    } else {
      loadCityData();
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
