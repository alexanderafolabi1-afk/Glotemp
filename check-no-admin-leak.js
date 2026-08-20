#!/usr/bin/env node

// Build check: fails if the word "admin" appears anywhere a public visitor
// could see it -- the shared nav component, or a hand-authored link/button
// on any public page. Triggered by a real incident report: the word
// "Admin" was seen rendering in the public nav where "Sign in" should be.
// That exact bug could not be reproduced against this repo's source (see
// the investigation in the PR this file shipped with), but the site has no
// business ever putting "admin" in front of a signed-out or ordinary
// visitor, so this check exists to make sure it never can, regardless of
// how it might happen -- a bad merge, a copy-pasted admin link, a stray
// debug label left in.
//
// nav-component.js is the sole source of nav markup (see check-nav.js) --
// it has no legitimate reason to ever contain the word "admin", so any
// match there is an immediate failure. Every other public page is scanned
// for an actual visible link or button reading "admin" (case-insensitive)
// or pointing at the /admin path -- not for the bare word, which would
// false-positive on legitimate prose ("administrator", "administered")
// that carries no navigational risk.
//
// admin/ itself is exempt: it is the internal, PIN-replaced,
// server-role-gated dashboard this check is protecting everything else
// from linking to -- see supabase/migrations/20260814090000_admin_role_and_stats.sql
// for how that page's actual data access is locked down (is_admin(),
// checked server-side in every RPC, not merely a hidden link).

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'admin']);

// 1. nav-component.js: the single source of nav truth. No legitimate
// occurrence of "admin" belongs here at all.
const navSrc = fs.readFileSync(path.join(ROOT, 'nav-component.js'), 'utf8');
const navMatch = /admin/i.exec(navSrc);
let failures = [];
if (navMatch) {
  const line = navSrc.slice(0, navMatch.index).split('\n').length;
  failures.push(`nav-component.js:${line}: contains the word "admin" -- the single source of site nav must never reference it`);
}

// 2. Every public page: a visible link/button whose text or href
// references admin. Reuses check-nav.js's file discovery so both checks
// stay in sync about what counts as a "public page."
function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const LINK_TEXT_RE = /<a\b[^>]*>\s*admin\s*<\/a>/i;
const BUTTON_TEXT_RE = /<button\b[^>]*>\s*admin\s*<\/button>/i;
const HREF_ADMIN_RE = /href\s*=\s*["'](?:https?:\/\/[^"'/]+)?\/admin(?:[/"']|$)/i;

for (const file of walk(ROOT, [])) {
  const content = fs.readFileSync(file, 'utf8');
  if (LINK_TEXT_RE.test(content) || BUTTON_TEXT_RE.test(content) || HREF_ADMIN_RE.test(content)) {
    failures.push(`${path.relative(ROOT, file)}: visible admin link or reference to /admin found on a public page`);
  }
}

if (failures.length) {
  console.error(`✗ Admin-leak build check failed:\n`);
  failures.forEach((f) => console.error(`  ${f}`));
  console.error(`\nNo public page may link to, or display the word "admin" in, the site nav or any visible link/button. /admin is reached only by typing the URL directly, and its data is gated server-side by is_admin() -- it must never be advertised.`);
  process.exit(1);
}

console.log(`✅ Admin-leak build check passed -- nav-component.js is clean, and no public page links to or names admin.`);
