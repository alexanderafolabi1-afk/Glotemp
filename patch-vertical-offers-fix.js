// Corrective follow-up to patch-vertical-offers.js: that script's own
// mount comment mentions "glotemp-offers.js" in prose, which made its
// `!html.includes('glotemp-offers.js')` guard a false positive on every
// file -- the mount markup landed, but the actual <script> tag never did.
// This checks for the real tag (`src="/glotemp-offers.js"`, not the bare
// filename) and inserts it wherever missing. Idempotent.

const fs = require('fs');
const path = require('path');

const CITIES_DIR = path.join(__dirname, 'cities');
const TAG = '  <script src="/glotemp-offers.js" defer></script>\n';

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

  if (html.includes('src="/glotemp-offers.js"')) { skipped++; continue; }

  const before = html;
  html = html.replace(
    '  <script src="/city-wiki.js" defer></script>\n',
    TAG + '  <script src="/city-wiki.js" defer></script>\n',
  );

  if (!html.includes('src="/glotemp-offers.js"')) {
    problems.push(rel);
    continue;
  }
  if (html !== before) { fs.writeFileSync(full, html); patched++; }
}

console.log(`scanned ${files.length}, patched ${patched}, already correct ${skipped}`);
if (problems.length) {
  console.log(`\nNOT patched, left untouched (${problems.length}):`);
  problems.forEach((p) => console.log('  ' + p));
  process.exitCode = 1;
}
