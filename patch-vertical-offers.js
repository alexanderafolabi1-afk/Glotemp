// One-off patcher: wires the Offers Panel (glotemp-offers.js -- see
// generate-city-vertical-pages.js) into the already-built vertical
// subpages (cities/<slug>/<vertical>/index.html). Same idempotent,
// all-or-nothing pattern as the other patch-*.js scripts. Also adds
// glotemp-auth.js, which these pages never loaded before -- REVEAL needs
// sign-in, and nothing on this page type had a reason to check auth
// state until now.

const fs = require('fs');
const path = require('path');

const CITIES_DIR = path.join(__dirname, 'cities');

const MOUNT =
  '    <!-- Offers Panel: "Tonight in [City]", filtered to this vertical. See\n' +
  '         glotemp-offers.js. Renders nothing at all when there are no\n' +
  '         active offers for this vertical here -- no empty state, no gap. -->\n' +
  '    <section class="glass-card offers-panel" id="offers-panel" aria-label="Tonight in this city" hidden></section>\n\n';

const ANCHOR = '    <section class="glass-card" style="padding:2rem; text-align:center;">\n';

let patched = 0, skipped = 0;
const problems = [];
let files = [];

for (const slug of fs.readdirSync(CITIES_DIR)) {
  const cityDir = path.join(CITIES_DIR, slug);
  if (!fs.statSync(cityDir).isDirectory()) continue;
  for (const vertical of fs.readdirSync(cityDir)) {
    const full = path.join(cityDir, vertical, 'index.html');
    if (fs.existsSync(full)) files.push(full);
  }
}

for (const full of files) {
  let html = fs.readFileSync(full, 'utf8');
  const rel = path.relative(__dirname, full);

  if (html.includes('id="offers-panel"')) { skipped++; continue; }

  const before = html;

  html = html.replace(ANCHOR, MOUNT + ANCHOR);

  if (!html.includes('glotemp-auth.js')) {
    html = html.replace(
      '  <script src="/glotemp-core.js"></script>\n',
      '  <script src="/glotemp-core.js"></script>\n  <script src="/glotemp-auth.js"></script>\n',
    );
  }

  if (!html.includes('glotemp-offers.js')) {
    html = html.replace(
      '  <script src="/city-wiki.js" defer></script>\n',
      '  <script src="/glotemp-offers.js" defer></script>\n  <script src="/city-wiki.js" defer></script>\n',
    );
  }

  const gotMount = html.includes('id="offers-panel"');
  const gotAuth = html.includes('glotemp-auth.js');
  const gotScript = html.includes('glotemp-offers.js');

  if (!gotMount || !gotAuth || !gotScript) {
    problems.push(`${rel}: mount=${gotMount} auth=${gotAuth} script=${gotScript}`);
    continue;
  }
  if (html !== before) { fs.writeFileSync(full, html); patched++; }
}

console.log(`scanned ${files.length}, patched ${patched}, already wired ${skipped}`);
if (problems.length) {
  console.log(`\nNOT patched, left untouched (${problems.length}):`);
  problems.forEach((p) => console.log('  ' + p));
  process.exitCode = 1;
}
