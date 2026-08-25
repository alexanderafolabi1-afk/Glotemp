// One-off patcher: wires the city flavor badge (city-flavor-data.js +
// glotemp-city-flavor.js -- see cities/_city-template.html) into the
// already-built city pages. Same idempotent, all-or-nothing pattern as
// the other patch-city-*.js scripts. The script itself is a no-op on the
// 297 cities not in CITY_FLAVOR, so this is safe to run across every
// city page rather than singling out the three that show anything.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cities');
const TAGS =
  '<script src="/city-flavor-data.js" defer></script>\n' +
  '<script src="/glotemp-city-flavor.js" defer></script>\n';

let patched = 0, skipped = 0;
const problems = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.html') && !f.startsWith('_') && f !== 'index.html')) {
  const full = path.join(DIR, file);
  let html = fs.readFileSync(full, 'utf8');

  if (html.includes('glotemp-city-flavor.js')) { skipped++; continue; }

  const before = html;
  html = html.replace(
    /(<script src="\/glotemp-pulse-gravity\.js" defer><\/script>\n)/,
    (m) => m + TAGS,
  );

  if (!html.includes('glotemp-city-flavor.js')) {
    problems.push(file.replace(/\.html$/, ''));
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
