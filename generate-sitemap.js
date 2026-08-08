#!/usr/bin/env node

// Generate sitemap.xml for all URLs
const fs = require('fs');
const path = require('path');

// Load cities data
const citiesDataContent = fs.readFileSync('./cities-data.js', 'utf8');
const citiesMatch = citiesDataContent.match(/const CITIES_DATA = \[([\s\S]*?)\];/);
if (!citiesMatch) {
  console.error('Could not parse CITIES_DATA');
  process.exit(1);
}

// Parse cities (simple regex approach)
const citiesPart = citiesMatch[1];
const cityLines = citiesPart.split('\n').filter(l => l.includes('{ slug:'));

const cities = cityLines.map(line => {
  const match = line.match(/\{ slug: '([^']+)'/);
  if (!match) return null;
  return { slug: match[1] };
}).filter(Boolean);

console.log(`Building sitemap for ${cities.length} cities...`);

// Base URLs
const urls = [
  { loc: 'https://glo-temp.com/', priority: '1.0', changefreq: 'daily' },
  { loc: 'https://glo-temp.com/cities', priority: '0.9', changefreq: 'weekly' },
  { loc: 'https://glo-temp.com/verticals', priority: '0.9', changefreq: 'weekly' },
  { loc: 'https://glo-temp.com/about', priority: '0.8', changefreq: 'monthly' },
  { loc: 'https://glo-temp.com/privacy', priority: '0.5', changefreq: 'monthly' },
  { loc: 'https://glo-temp.com/terms', priority: '0.5', changefreq: 'monthly' },
];

// Add vertical ranking pages
const verticals = ['pulse', 'tech', 'finance', 'work', 'property', 'education', 'sport', 'entertainment', 'fashion', 'food', 'health', 'transport'];
verticals.forEach(v => {
  urls.push({
    loc: `https://glo-temp.com/verticals/${v}`,
    priority: '0.9',
    changefreq: 'daily'
  });
});

// Add city profile pages
cities.forEach(city => {
  urls.push({
    loc: `https://glo-temp.com/cities/${city.slug}`,
    priority: '0.8',
    changefreq: 'daily'
  });
});

// Generate sitemap XML
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync('./sitemap.xml', sitemapXml);
console.log(`✅ Generated sitemap with ${urls.length} URLs`);
console.log(`   - 1 home page`);
console.log(`   - 2 directory pages (cities, verticals)`);
console.log(`   - ${verticals.length} vertical ranking pages`);
console.log(`   - ${cities.length} city profile pages`);
