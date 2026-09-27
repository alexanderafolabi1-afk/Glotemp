#!/usr/bin/env node

// Build check: fails if funding, fundraising-stage or contributor-cash
// language appears anywhere a public visitor (or GitHub reader) could see
// it. Written after a full-repo sweep found and removed: a Seed Round
// pitch and a Market Size table in README.md, a "5% of sponsor revenue is
// distributed monthly" promise in README.md's contributor rank table, an
// "invest_title"/"invest_text" i18n pair in app.js (shipped on every
// public page even though only /investors ever read it), and a
// "stars_share" i18n key in six languages promising contributors a share
// of a city's reward. Same shape as check-no-admin-leak.js: this exists
// so none of that can quietly come back.
//
// /investors is explicitly allowed to talk about funding -- it is the
// one page built for that private, unlinked, noindex/nofollow audience
// (see item 3 of the task this check shipped with). It is exempt here,
// not because it was cleaned, but because it was deliberately left
// funded-sounding on purpose.
//
// A handful of historical build-log markdown files (listed below) are
// also exempt from the bare "investor" check specifically: they document
// a past URL restructuring ("investors.html -> investors/index.html")
// and were manually read in full and confirmed to carry no funding or
// fundraising-stage language beyond that filename. Deleting or rewording
// those lines would falsify a technical changelog for no safety gain, so
// they are exempted by name rather than silently excluded by pattern.
//
// WHAT THIS DOES NOT CHECK, ON PURPOSE
// The task's term list includes several words this codebase uses
// constantly for reasons that have nothing to do with fundraising:
//   round  -- Math.round, border-radius, "compare pairs" loop vars,
//             CSS "round" line-caps. ~4,400 files match the bare word.
//   seed   -- seed-observations.js, "seed" as in seed/backfill data,
//             used across 300+ generated pages. ~300 files match.
//   raise / raising -- almost entirely `raise exception` in PL/pgSQL
//             migrations, plus one CSS comment about raising an input's
//             font size above the iOS zoom floor.
//   pool (bare) -- rotation pools, city pools, coworking-space copy.
// Gating the build on any of these would fail on legitimate, unrelated
// code within days and train everyone to ignore this check. Instead this
// file checks the exact multi-word phrases and low-noise bare terms that
// actually signalled fundraising when this sweep found them, and the
// distinctive numeric/percent patterns ("5% of ... revenue", "$",
// currency ranges) that a market-size or revenue table would use. If a
// future sweep finds a new phrasing that slipped through, add it to
// PHRASES below rather than reaching for one of the words above.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'investors']);
const CHECK_EXT = new Set(['.html', '.js', '.css', '.json', '.md', '.xml', '.sql', '.template']);
const SELF = path.basename(__filename);

// Historical build-log files: read in full, confirmed to contain no
// funding language beyond a filename path. Exempt from the bare
// "investor(s)" check only -- still subject to every other pattern below.
const BUILD_LOG_FILES = new Set([
  'BUILD_PASS_3_SUMMARY.md',
  'STEP3_README.md',
  'DEPLOYMENT_STEPS.md',
  'PHASE_3_EDGE_FUNCTIONS.md',
]);

// Multi-word phrases: low false-positive risk, checked everywhere in scope.
const PHRASES = [
  /seed round/i,
  /seed-round/i,
  /investment deck/i,
  /data room/i,
  /founder call/i,
  /pre-revenue/i,
  /revenue share/i,
  /revenue pool/i,
  /distributed monthly/i,
  /sponsor pool/i,
  /contributor pool/i,
  /cash reward/i,
  /earn money/i,
  /pay out/i,
  /\bvaluation\b/i,
  // A market-size table's own shape: "$180B", "$22B", "$4.99-$19.99/mo" etc.
  /\$[\d,.]+\s?[BMK]\b/,
];

// Bare words, verified against this exact codebase to have zero
// unrelated legitimate uses at the time this check was written.
const BARE_WORDS = [
  /\bfunding\b/i,
  /\bpayout\b/i,
  /\bincome\b/i,
  /\bTAM\b/,   // case-sensitive: the business term is always uppercase
  /\bSAM\b/,
  /\bSOM\b/,
];

// "investor"/"investors" -- checked everywhere except /investors itself
// and the named historical build-log files above.
const INVESTOR_WORD = /\binvestors?\b/i;

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === ROOT && SKIP_DIRS.has(entry.name)) continue;
      walk(full, files);
    } else {
      if (entry.name === SELF) continue; // this file necessarily contains its own patterns as text
      const ext = path.extname(entry.name);
      if (CHECK_EXT.has(ext)) files.push(full);
    }
  }
  return files;
}

const failures = [];

for (const file of walk(ROOT, [])) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  const isBuildLog = BUILD_LOG_FILES.has(rel);

  function report(re, label) {
    const idx = lines.findIndex((l) => re.test(l));
    if (idx !== -1) {
      failures.push(`${rel}:${idx + 1}: ${label} -- "${lines[idx].trim().slice(0, 120)}"`);
    }
  }

  [...PHRASES, ...BARE_WORDS].forEach((re) => report(re, `matches ${re}`));

  if (!isBuildLog) {
    report(INVESTOR_WORD, 'mentions "investor(s)" outside the investors page');
  }
}

if (failures.length) {
  console.error(`✗ Funding-language build check failed:\n`);
  failures.forEach((f) => console.error(`  ${f}`));
  console.error(`\nNo public-facing file may reveal that Glotemp is new, early or raising money, or promise contributors cash/revenue share. /investors is exempt by design. If this is a genuine new use of a flagged phrase, reword it; do not add exemptions without reading check-no-funding-language.js's header first.`);
  process.exit(1);
}

console.log(`✅ Funding-language build check passed -- no fundraising, revenue-share or contributor-cash language found outside /investors.`);
