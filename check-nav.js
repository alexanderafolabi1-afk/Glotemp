#!/usr/bin/env node

// Build check: fails if nav markup is hand-authored anywhere outside
// nav-component.js, the single shared source of the site nav. Every page
// must carry only the bare mount point:
//   <nav id="site-nav"></nav><script src="/nav-component.js"></script>
// nav-component.js fills that element's class/content and builds
// `#nav-hamburger`/`#nav-panel`/`.nav-links` programmatically -- none of
// that markup may appear literally in any .html file's source, and no
// generator script may embed a nav of its own. The one sanctioned `<nav`
// tag is the empty `id="site-nav"` mount; any other `<nav` is a hand-authored
// copy.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SKIP_DIRS = new Set(['.git', 'node_modules']);
// admin/ is an internal, PIN-gated dashboard toolbar (Mission Control +
// logout), not the public site nav this check enforces -- it intentionally
// does not use nav-component.js.
const SKIP_FILES = new Set(['admin/index.html']);

const FORBIDDEN_PATTERNS = [
  { name: 'navbar class', re: /class="[^"]*\bnavbar\b[^"]*"/ },
  { name: 'legacy nav-bar class', re: /class="[^"]*\bnav-bar\b[^"]*"/ },
  // Any <nav that isn't the empty `id="site-nav"` mount point.
  { name: 'hand-authored <nav> element', re: /<nav(?!\s+id="site-nav"><\/nav>)\b/ },
  { name: 'hand-authored #nav-hamburger', re: /id="nav-hamburger"/ },
  { name: 'hand-authored #nav-panel', re: /id="nav-panel"/ },
];

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith('.html') || entry.name.startsWith('generate-') && entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(ROOT, []);
let failures = [];

for (const file of files) {
  if (SKIP_FILES.has(path.relative(ROOT, file))) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const { name, re } of FORBIDDEN_PATTERNS) {
    if (re.test(content)) {
      failures.push(`${path.relative(ROOT, file)}: ${name}`);
    }
  }
}

if (failures.length) {
  console.error(`✗ Nav build check failed -- nav markup found outside nav-component.js:\n`);
  failures.forEach((f) => console.error(`  ${f}`));
  console.error(`\nAll nav markup must be authored once, in nav-component.js. Every page mounts it via:\n  <div id="site-nav"></div>\n  <script src="/nav-component.js"></script>`);
  process.exit(1);
}

console.log(`✅ Nav build check passed -- no hand-authored nav markup found across ${files.length} files.`);
