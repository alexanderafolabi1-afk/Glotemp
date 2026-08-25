// One-off patcher: wires the per-city Live Blog (glotemp-live-blog-city.js
// + glotemp-live-blog-data.js + glotemp-vertical-style.js -- see
// cities/_city-template.html) into the already-built city pages. Same
// idempotent, all-or-nothing pattern as the other patch-city-*.js scripts.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cities');

const MOUNT =
  '    <!-- Live Blog: a vertical journal of real dispatches about this city\n' +
  '         only, built from data the page already trusts elsewhere. See\n' +
  '         glotemp-live-blog-city.js and glotemp-live-blog-data.js. Hidden\n' +
  '         until populated. -->\n' +
  '    <section class="glass-card live-blog-section" id="live-blog" aria-label="This city\'s live blog" hidden>\n' +
  '      <p class="eyebrow">The living log</p>\n' +
  '      <h2 id="live-blog-heading">&nbsp;</h2>\n' +
  '      <ul class="live-blog-list" id="live-blog-list"></ul>\n' +
  '    </section>\n\n';

const SCRIPT_TAGS =
  '  <script src="/glotemp-vertical-style.js" defer></script>\n' +
  '  <script src="/glotemp-live-blog-data.js" defer></script>\n' +
  '  <script src="/glotemp-live-blog-city.js" defer></script>\n';

let patched = 0, skipped = 0;
const problems = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.html') && !f.startsWith('_') && f !== 'index.html')) {
  const full = path.join(DIR, file);
  let html = fs.readFileSync(full, 'utf8');

  if (html.includes('glotemp-live-blog-city.js')) { skipped++; continue; }

  const before = html;

  html = html.replace(
    '    <section class="glass-card city-affiliate-row">\n',
    MOUNT + '    <section class="glass-card city-affiliate-row">\n',
  );

  html = html.replace(
    /(<script src="\/city-vertical-signature\.js" defer><\/script>\n)/,
    (m) => m + SCRIPT_TAGS,
  );

  const gotMount = html.includes('id="live-blog"');
  const gotScript = html.includes('glotemp-live-blog-city.js');

  if (!gotMount || !gotScript) {
    problems.push(`${file.replace(/\.html$/, '')}: mount=${gotMount} script=${gotScript}`);
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
