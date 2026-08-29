// Generates one SVG share card per city into /og/, used as each city
// page's og:image (see generate-city-pages.js and cities/_city-template.html).
//
// Why SVG, and why a generated card at all: previously every one of the
// 302 city pages pointed og:image at the same one or two generic files
// (logo.png / og-cities.png) -- a shared link for any city looked
// identical to a shared link for any other. This card instead encodes
// that city's own name, country and live mood reading, the same data the
// page itself already renders via GlotempCore.moodToBand. It is a
// generated data graphic, not artwork -- written to /og/, never to
// /assets/, and does not touch, replace, or resemble anything hand-drawn
// there.
//
// The BANDS table below is intentionally a plain copy of the one in
// glotemp-core.js (colors + thresholds only, no image paths needed here)
// -- this script runs in Node, not a browser, so it can't load that file
// as-is. Keep the two in sync if the bands ever change.
//
// Re-run after CITIES_DATA changes (new city, or a city's baseline mood
// changes materially) to regenerate this exact set of cards.

const fs = require('fs');
const path = require('path');
const CITIES_DATA = require('./cities-data.js');

const OUT_DIR = path.join(__dirname, 'og');
const W = 1200;
const H = 630;

const BANDS = [
  { min: 8.5, band: 'charged', color: '#C86BE0' },
  { min: 7.0, band: 'warm', color: '#F5A25A' },
  { min: 5.0, band: 'equilibrium', color: '#F0E0C8' },
  { min: 3.0, band: 'restrained', color: '#6BA8F5' },
  { min: -Infinity, band: 'low', color: '#4FD8E8' },
];

function moodToBand(mood) {
  const m = typeof mood === 'number' && !Number.isNaN(mood) ? mood : 5.0;
  return BANDS.find((b) => m >= b.min);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cardSVG(city) {
  const band = moodToBand(city.mood);
  const mood = typeof city.mood === 'number' ? city.mood.toFixed(1) : '--';
  const name = esc(city.name);
  const country = esc(city.country);
  const label = esc(band.band.toUpperCase());

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0F0C08"/>
  <rect x="0" y="0" width="14" height="${H}" fill="${band.color}"/>
  <circle cx="${W - 150}" cy="150" r="220" fill="${band.color}" opacity="0.10"/>
  <text x="90" y="150" font-family="Georgia, 'Times New Roman', serif" font-size="30" letter-spacing="6" fill="${band.color}">GLOTEMP</text>
  <text x="90" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="108" font-weight="600" fill="#F5EFE3">${name}</text>
  <text x="90" y="390" font-family="'Courier New', monospace" font-size="34" letter-spacing="2" fill="#C9B79C">${country}</text>
  <text x="90" y="500" font-family="'Courier New', monospace" font-size="64" font-weight="700" fill="${band.color}">${mood}<tspan font-size="28" fill="#C9B79C"> / 10</tspan></text>
  <text x="90" y="540" font-family="'Courier New', monospace" font-size="24" letter-spacing="4" fill="#C9B79C">${label} &#183; RIGHT NOW</text>
  <text x="90" y="590" font-family="'Courier New', monospace" font-size="22" fill="#7A6E5C">glo-temp.com</text>
</svg>
`;
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
for (const city of CITIES_DATA) {
  fs.writeFileSync(path.join(OUT_DIR, `${city.slug}.svg`), cardSVG(city));
  written++;
}

console.log(`wrote ${written} share cards to /og/`);
