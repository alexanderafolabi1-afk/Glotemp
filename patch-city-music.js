// One-off patcher: wire glotemp-music.js into the Entertainment vertical
// on the built city pages.
//
// Patched rather than regenerated, for the same reason as the venues and
// news patchers: generate-city-pages.js emits the loadRadio call but not
// the script tag defining it, so re-running the generator would strip
// radio, venues and news off every page.
//
// Idempotent, and all-or-nothing per page: a page that picked up the
// mount but not the call would render an empty box forever, which is
// worse than leaving it alone.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cities');
const MOUNT = '        <div id="entertainment-music"></div>\n';
const TAG = '  <script src="/glotemp-music.js" defer></script>\n';

let patched = 0, skipped = 0;
const problems = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.html'))) {
  const full = path.join(DIR, file);
  let html = fs.readFileSync(full, 'utf8');
  if (html.includes('entertainment-music')) { skipped++; continue; }

  const before = html;

  // 1. mount, directly under the entertainment content box
  html = html.replace(
    /([ \t]*<div id="entertainment-content" class="vertical-content"><\/div>\n)/,
    (m) => m + MOUNT,
  );

  // 2. script tag, beside its siblings
  html = html.replace(
    /([ \t]*<script src="\/city-news\.js" defer><\/script>\n)/,
    (m) => m + TAG,
  );

  // 3. the call, in the same guarded block as radio, venues and news
  html = html.replace(
    /(\n(\s*)if \(typeof GlotempNews !== 'undefined' && city\) \{\n\s*GlotempNews\.loadNews\([^)]*\);\n\s*\}\n)/,
    (m, whole, indent) =>
      whole +
      `\n${indent}// The music layer. Reads only stored data, so this makes no\n` +
      `${indent}// third-party call and cannot slow the page down.\n` +
      `${indent}if (typeof GlotempMusic !== 'undefined' && city) {\n` +
      `${indent}  GlotempMusic.mount(city.slug, city.name);\n` +
      `${indent}}\n`,
  );

  const got = ['entertainment-music', 'glotemp-music.js', 'GlotempMusic.mount']
    .filter((n) => html.includes(n));

  if (got.length !== 3) {
    problems.push(`${file.replace(/\.html$/, '')}: matched ${got.length}/3`);
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
