// One-off patcher: give every city page a live local-press section.
//
// Same reasoning as patch-city-venues.js: generate-city-pages.js does not
// emit the <script> tags for the live keyless sources, so regenerating
// would strip radio and venues off all 153 pages. This edits the built
// files at three exact points and writes nothing unless all three match.
//
// The section goes directly above the first vertical, open by default.
// It is the freshest thing on the page and the reason to come back, so
// it should not be behind a closed accordion.
//
// Idempotent: a page already carrying the wiring is skipped.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cities');
const TAG = '  <script src="/city-news.js" defer></script>\n';

let patched = 0;
let skipped = 0;
const problems = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.html'))) {
  const full = path.join(DIR, file);
  let html = fs.readFileSync(full, 'utf8');

  if (html.includes('news-content')) { skipped++; continue; }

  const slug = file.replace(/\.html$/, '');
  const before = html;

  // 1. the section, above the first vertical (pulse).
  html = html.replace(
    /([ \t]*)(<details id="pulse" class="vertical-section glass-card" open>)/,
    (m, indent, tag) =>
      `${indent}<section id="city-news" class="vertical-section glass-card">\n` +
      `${indent}  <div class="vertical-body">\n` +
      `${indent}    <h2 class="news-heading">In the papers today</h2>\n` +
      `${indent}    <div id="news-content"></div>\n` +
      `${indent}  </div>\n` +
      `${indent}</section>\n\n` +
      `${indent}${tag}`
  );

  // 2. the script tag, beside its siblings.
  html = html.replace(
    /([ \t]*<script src="\/city-venues\.js" defer><\/script>\n)/,
    (m) => m + TAG
  );

  // 3. the call, in the same guarded block as radio and venues.
  html = html.replace(
    /(\n(\s*)if \(typeof GlotempVenues !== 'undefined' && city\) \{\n\s*GlotempVenues\.loadVenues\([^)]*\);\n\s*\}\n)/,
    (m, whole, indent) =>
      whole +
      `\n${indent}// What the local press is reporting, in the languages it is\n` +
      `${indent}// reported in. Live and keyless, like Radio and Venues above.\n` +
      `${indent}if (typeof GlotempNews !== 'undefined' && city) {\n` +
      `${indent}  GlotempNews.loadNews(city.name, city.country, 'news-content');\n` +
      `${indent}}\n`
  );

  const got = ['news-content', 'city-news.js', 'GlotempNews.loadNews']
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
