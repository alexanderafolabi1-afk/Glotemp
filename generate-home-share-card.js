// Generates the site-wide fallback share card (/og/home.svg) used as
// og:image / twitter:image on pages that don't have their own per-city
// card -- the homepage, and any other top-level page. Same visual
// language as generate-city-share-cards.js's per-city cards, without a
// city-specific reading. Rasterize with rasterize-share-cards.js after
// running this (X/Twitter needs a raster image, not SVG).

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'og');
const W = 1200;
const H = 630;
const BRASS = '#B08D57';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0F0C08"/>
  <rect x="0" y="0" width="14" height="${H}" fill="${BRASS}"/>
  <circle cx="${W - 150}" cy="150" r="220" fill="${BRASS}" opacity="0.10"/>
  <circle cx="${W - 300}" cy="480" r="140" fill="${BRASS}" opacity="0.08"/>
  <text x="90" y="150" font-family="Georgia, 'Times New Roman', serif" font-size="30" letter-spacing="6" fill="${BRASS}">GLOTEMP</text>
  <text x="90" y="290" font-family="Georgia, 'Times New Roman', serif" font-size="88" font-weight="600" fill="#F5EFE3">Live City Pulse</text>
  <text x="90" y="360" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#C9B79C">The world&#8217;s real-time mood infrastructure for cities.</text>
  <text x="90" y="540" font-family="'Courier New', monospace" font-size="24" letter-spacing="4" fill="${BRASS}">300+ CITIES &#183; UPDATED CONTINUOUSLY</text>
  <text x="90" y="590" font-family="'Courier New', monospace" font-size="22" fill="#7A6E5C">glo-temp.com</text>
</svg>
`;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'home.svg'), svg);
console.log('wrote og/home.svg');
