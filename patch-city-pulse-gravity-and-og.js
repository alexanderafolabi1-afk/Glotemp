// One-off patcher: wire the two Pulse Gravity experiment pieces into the
// already-built city pages.
//
//   1. og:image -> this city's own /og/<slug>.svg share card, instead of
//      the one generic logo/og-cities image every page pointed at alike.
//   2. the /glotemp-pulse-gravity.js script tag, so the "similar mood
//      elsewhere" block actually mounts on these already-generated pages.
//
// Patched rather than regenerated, for the same reason as the music,
// venues and news patchers: re-running generate-city-pages.js would also
// require re-deriving every other hand-tuned per-page addition those
// patchers made, which this script has no way to redo. Idempotent, and
// all-or-nothing per page.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cities');
const SCRIPT_TAG = '<script src="/glotemp-pulse-gravity.js" defer></script>\n';

let patched = 0, skipped = 0;
const problems = [];

// index.html is the directory listing, not a per-city page -- no
// /og/<slug>.svg card exists for it, and its generic og-cities.png stays.
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.html') && !f.startsWith('_') && f !== 'index.html')) {
  const slug = file.replace(/\.html$/, '');
  const full = path.join(DIR, file);
  let html = fs.readFileSync(full, 'utf8');

  if (html.includes('glotemp-pulse-gravity.js') && html.includes(`/og/${slug}.svg`)) {
    skipped++;
    continue;
  }

  const before = html;

  // 1. og:image -> this city's own share card
  html = html.replace(
    /<meta property="og:image" content="[^"]*">/,
    `<meta property="og:image" content="https://glo-temp.com/og/${slug}.svg">`,
  );

  // 2. script tag, right after footer-social.js like the template
  html = html.replace(
    /(<script src="\/footer-social\.js" defer><\/script>\n)/,
    (m) => m + SCRIPT_TAG,
  );

  const gotImage = html.includes(`/og/${slug}.svg`);
  const gotScript = html.includes('glotemp-pulse-gravity.js');

  if (!gotImage || !gotScript) {
    problems.push(`${slug}: og:image=${gotImage} script=${gotScript}`);
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
