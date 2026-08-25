// One-off patcher, second pass: fixes the share-card regression from the
// first Pulse Gravity patch (patch-city-pulse-gravity-and-og.js).
//
// That pass pointed every city page's og:image at its own /og/<slug>.svg
// card -- an improvement over the one shared logo, but X/Twitter's card
// crawler does not render SVG for og:image, so links shared from these
// pages rendered with a blank card. Two fixes, both idempotent:
//
//   1. og:image -> /og/<slug>.png (the rasterized version, see
//      rasterize-share-cards.js), not the .svg.
//   2. twitter:card / twitter:title / twitter:description / twitter:image
//      added -- these were missing from every city page, not just the
//      ones this experiment touched, so X had no dedicated Twitter Card
//      data to fall back on.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cities');

let patched = 0, skipped = 0;
const problems = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.html') && !f.startsWith('_') && f !== 'index.html')) {
  const slug = file.replace(/\.html$/, '');
  const full = path.join(DIR, file);
  let html = fs.readFileSync(full, 'utf8');

  if (html.includes('twitter:card') && html.includes(`/og/${slug}.png`)) {
    skipped++;
    continue;
  }

  const before = html;

  const titleMatch = html.match(/<meta property="og:title" content="([^"]*)">/);
  const descMatch = html.match(/<meta property="og:description" content="([^"]*)">/);
  const title = titleMatch ? titleMatch[1] : `${slug} | Glotemp`;
  const desc = descMatch ? descMatch[1] : '';

  // 1. og:image -> the rasterized PNG, not the SVG
  html = html.replace(
    /<meta property="og:image" content="https:\/\/glo-temp\.com\/og\/[^"]*\.svg">/,
    `<meta property="og:image" content="https://glo-temp.com/og/${slug}.png">`,
  );

  // 2. Twitter Card tags, right after og:image, matching the template
  if (!html.includes('twitter:card')) {
    html = html.replace(
      /(<meta property="og:image" content="https:\/\/glo-temp\.com\/og\/[^"]*\.png">\n)/,
      (m) =>
        m +
        `  <meta name="twitter:card" content="summary_large_image">\n` +
        `  <meta name="twitter:title" content="${title}">\n` +
        `  <meta name="twitter:description" content="${desc}">\n` +
        `  <meta name="twitter:image" content="https://glo-temp.com/og/${slug}.png">\n`,
    );
  }

  const gotImage = html.includes(`/og/${slug}.png`) && !html.includes(`/og/${slug}.svg`);
  const gotTwitter = html.includes('twitter:card') && html.includes('twitter:image');

  if (!gotImage || !gotTwitter) {
    problems.push(`${slug}: og_png=${gotImage} twitter=${gotTwitter}`);
    continue;
  }
  if (html !== before) { fs.writeFileSync(full, html); patched++; }
}

console.log(`patched ${patched}, already wired ${skipped}`);
if (problems.length) {
  console.log(`\nNOT patched, left untouched (${problems.length}):`);
  problems.forEach((p) => console.log('  ' + p));
  process.exitCode = 1;
}
