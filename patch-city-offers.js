// One-off patcher: wires the Offers Panel (glotemp-offers.js -- see
// cities/_city-template.html) into the already-built city pages. Same
// idempotent, all-or-nothing pattern as the other patch-city-*.js scripts.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cities');

const MOUNT =
  '    <!-- Offers Panel: "Tonight in [City]", every vertical. See\n' +
  '         glotemp-offers.js. Renders nothing at all when this city has no\n' +
  '         active offers -- no empty state, no gap. -->\n' +
  '    <section class="glass-card offers-panel" id="offers-panel" aria-label="Tonight in this city" hidden></section>\n\n';

const SCRIPT_TAG = '  <script src="/glotemp-offers.js" defer></script>\n';

let patched = 0, skipped = 0;
const problems = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.html') && !f.startsWith('_') && f !== 'index.html')) {
  const full = path.join(DIR, file);
  let html = fs.readFileSync(full, 'utf8');

  if (html.includes('id="offers-panel"')) { skipped++; continue; }

  const before = html;

  html = html.replace(
    '    <section class="glass-card city-affiliate-row">\n',
    MOUNT + '    <section class="glass-card city-affiliate-row">\n',
  );

  html = html.replace(
    /(<script src="\/glotemp-live-blog-city\.js" defer><\/script>\n)/,
    (m) => m + SCRIPT_TAG,
  );

  const gotMount = html.includes('id="offers-panel"');
  const gotScript = html.includes('glotemp-offers.js');

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
