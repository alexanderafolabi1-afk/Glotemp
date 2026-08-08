#!/usr/bin/env node

// Generate sitemap.xml for every indexable URL on the site.
const fs = require('fs');

// Load cities data
const citiesDataContent = fs.readFileSync('./cities-data.js', 'utf8');
const citiesMatch = citiesDataContent.match(/const CITIES_DATA = \[([\s\S]*?)\];/);
if (!citiesMatch) {
  console.error('Could not parse CITIES_DATA');
  process.exit(1);
}

const citiesPart = citiesMatch[1];
const cityLines = citiesPart.split('\n').filter(l => l.includes('{ slug:'));

const cities = cityLines.map(line => {
  const match = line.match(/\{ slug: '([^']+)'.*rank: (\d+)/);
  if (!match) return null;
  return { slug: match[1], rank: parseInt(match[2], 10) };
}).filter(Boolean);

console.log(`Building sitemap for ${cities.length} cities...`);

const VERTICALS = ['pulse', 'tech', 'finance', 'work', 'property', 'education', 'sport', 'entertainment', 'fashion', 'food', 'health', 'transport'];
const TOP_N = 30;
const topCities = cities.filter(c => c.rank <= TOP_N).sort((a, b) => a.slug.localeCompare(b.slug));

function comparePairs(list) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) out.push(`${list[i].slug}-vs-${list[j].slug}`);
  }
  return out;
}

// Base URLs
const urls = [
  { loc: 'https://glo-temp.com/', priority: '1.0', changefreq: 'daily' },
  { loc: 'https://glo-temp.com/explore', priority: '0.9', changefreq: 'daily' },
  { loc: 'https://glo-temp.com/about', priority: '0.8', changefreq: 'weekly' },
  { loc: 'https://glo-temp.com/blog', priority: '0.9', changefreq: 'daily' },
  { loc: 'https://glo-temp.com/verticals', priority: '0.8', changefreq: 'weekly' },
  { loc: 'https://glo-temp.com/privacy', priority: '0.3', changefreq: 'monthly' },
  { loc: 'https://glo-temp.com/terms', priority: '0.3', changefreq: 'monthly' },
];

// Vertical ranking pages (verticals/<v>.html -- the detail page) and
// /rankings/<v>/ -- the live league table
VERTICALS.forEach(v => {
  urls.push({ loc: `https://glo-temp.com/verticals/${v}`, priority: '0.8', changefreq: 'daily' });
  urls.push({ loc: `https://glo-temp.com/rankings/${v}/`, priority: '0.85', changefreq: 'daily' });
});

// City profile pages
cities.forEach(city => {
  urls.push({ loc: `https://glo-temp.com/cities/${city.slug}`, priority: '0.8', changefreq: 'daily' });
});

// City x vertical pages
cities.forEach(city => {
  VERTICALS.forEach(v => {
    urls.push({ loc: `https://glo-temp.com/cities/${city.slug}/${v}/`, priority: '0.6', changefreq: 'daily' });
  });
});

// Compare pages
comparePairs(topCities).forEach(slug => {
  urls.push({ loc: `https://glo-temp.com/compare/${slug}/`, priority: '0.7', changefreq: 'weekly' });
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
console.log(`   - 6 top-level pages (explore, about, blog, verticals, privacy, terms)`);
console.log(`   - ${VERTICALS.length} vertical detail pages + ${VERTICALS.length} ranking pages`);
console.log(`   - ${cities.length} city profile pages`);
console.log(`   - ${cities.length * VERTICALS.length} city x vertical pages`);
console.log(`   - ${comparePairs(topCities).length} compare pages (top ${TOP_N} cities)`);
