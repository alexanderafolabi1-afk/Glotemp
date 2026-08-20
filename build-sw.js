#!/usr/bin/env node
// Stamps a real build hash into sw.js.
//
// The service worker used a hand-bumped constant (`glotemp-v11`) with a
// comment telling whoever deployed to remember to bump it. Nobody ever
// did, so every deploy shipped under the SAME cache name -- which meant
// the activate handler's cleanup (`key !== CACHE_VERSION`) matched
// nothing, the previous cache survived untouched, and users kept being
// served the previous build. A cache name that does not change on deploy
// is not a cache version.
//
// This hashes the actual bytes of everything the browser executes or
// renders, so the cache name changes if and only if the build changes.
// Run it as the last step of any deploy:  node build-sw.js
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Files whose contents define "the build" as far as a browser is
// concerned. Deliberately excludes /assets/ (untouched artwork) and the
// 2,400 generated city/compare pages, which are derived from these.
const SOURCES = [
  'index.html', '404.html', 'styles.css', 'app.js', 'sw.js.template',
  'glotemp-core.js', 'glotemp-auth.js', 'glotemp-checkin.js',
  'glotemp-tonight.js', 'glotemp-spin.js', 'glotemp-features.js',
  'glotemp-gem.js', 'glotemp-movers.js', 'glotemp-showcase.js',
  'living-index.js', 'cities-data.js', 'tempo-economy.js',
  'glotemp-analytics.js',
  'city-tiles.js', 'city-landmark-photos.js', 'city-photos.js',
  'glotemp-elsewhere.js', 'city-of-the-day.js', 'city-of-day-photos.js',
  'verticals-engine.js', 'stories.js', 'cookie-consent.js',
  'about/index.html', 'explore/index.html', 'feed/index.html',
  'gem/index.html', 'methodology/index.html', 'movers/index.html',
];

const hash = crypto.createHash('sha256');
let counted = 0;
for (const f of SOURCES) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) continue;
  hash.update(f);
  hash.update(fs.readFileSync(p));
  counted++;
}
const BUILD_HASH = hash.digest('hex').slice(0, 12);

const templatePath = path.join(__dirname, 'sw.js.template');
if (!fs.existsSync(templatePath)) {
  console.error('sw.js.template missing -- cannot stamp a build hash.');
  process.exit(1);
}
const out = fs.readFileSync(templatePath, 'utf8')
  .replace(/__BUILD_HASH__/g, BUILD_HASH);
fs.writeFileSync(path.join(__dirname, 'sw.js'), out);

console.log(`sw.js written with BUILD_HASH=${BUILD_HASH} (from ${counted} source files)`);
