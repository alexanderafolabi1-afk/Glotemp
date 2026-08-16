// One-off patcher: wire city-venues.js into the already-generated city
// pages.
//
// WHY A PATCHER RATHER THAN A REGENERATE
// generate-city-pages.js emits the GlotempRadio.loadRadio() CALL but not
// the <script src="/city-radio.js"> tag that defines it. That tag was
// added to the built pages afterwards and lives nowhere in the generator,
// so re-running the generator would strip radio off all 153 pages. This
// edits the built files in place instead, and touches only the three
// exact points it needs.
//
// Idempotent: a page that already has the venues wiring is skipped, so
// running this twice does not double anything up.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cities');

const MOUNT = '        <div id="food-venues" class="vertical-venues"></div>\n';
const TAG = '  <script src="/city-venues.js" defer></script>\n';

let patched = 0;
let skipped = 0;
const problems = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.html'))) {
  const full = path.join(DIR, file);
  let html = fs.readFileSync(full, 'utf8');

  if (html.includes('food-venues')) { skipped++; continue; }

  const slug = file.replace(/\.html$/, '');
  const before = html;

  // 1. the mount point, directly under the food section's content box so
  //    real places sit above the curated slots rather than under them.
  html = html.replace(
    /([ \t]*<div id="food-content" class="vertical-content"><\/div>\n)/,
    (m) => m + MOUNT
  );

  // 2. the script tag, next to the sibling it behaves like.
  html = html.replace(
    /([ \t]*<script src="\/city-radio\.js" defer><\/script>\n)/,
    (m) => m + TAG
  );

  // 3. the call, right after radio's, which is already inside the same
  //    guarded async block and already has `city` in scope.
  html = html.replace(
    /(\n(\s*)if \(typeof GlotempRadio !== 'undefined' && city\) \{\n\s*GlotempRadio\.loadRadio\([^)]*\);\n\s*\}\n)/,
    (m, whole, indent) =>
      whole +
      `\n${indent}// Real named places from OpenStreetMap. Same treatment as Radio:\n` +
      `${indent}// a live keyless source, not a Supabase reading.\n` +
      `${indent}if (typeof GlotempVenues !== 'undefined' && city) {\n` +
      `${indent}  GlotempVenues.loadVenues(city.slug, city.name, city.lat, city.lon);\n` +
      `${indent}}\n`
  );

  // Every page must get all three or none. A page that picked up the
  // mount but not the call would render a permanent "Looking up places"
  // and look broken, which is worse than being left alone.
  const got = ['food-venues', 'city-venues.js', 'GlotempVenues.loadVenues']
    .filter((needle) => html.includes(needle));

  if (got.length !== 3) {
    problems.push(`${slug}: matched ${got.length}/3 (${got.join(', ') || 'none'})`);
    continue;
  }

  if (html !== before) {
    fs.writeFileSync(full, html);
    patched++;
  }
}

console.log(`patched ${patched}, already wired ${skipped}`);
if (problems.length) {
  console.log(`\nNOT patched, left untouched (${problems.length}):`);
  problems.forEach((p) => console.log('  ' + p));
  process.exitCode = 1;
}
