// One-off patcher: closes the sitewide gap behind the "shared link
// renders blank on Twitter" report -- twitter:image did not exist
// ANYWHERE on this site (0 occurrences across 4387 html files) before
// this patch, so X had nothing but an og:image fallback to work with,
// and on pages missing even that (see below) or serving a format its
// crawler won't render (SVG -- fixed separately for city pages), the
// card came back blank.
//
// Two passes, both idempotent and skipped where already present:
//
//   1. Every page that already has og:image but no twitter:image gets a
//      twitter:image (and twitter:card, if that's missing too) mirroring
//      its own og:image/og:title/og:description.
//   2. A short list of real content pages that had no OG block at all
//      (og:title present is NOT required here -- these are hand-picked
//      because they lack og:title too) gets a minimal one, image
//      pointing at the sitewide fallback card (og/wheel.jpg) since none
//      of these have a bespoke card of their own.
//
// Deliberately does not touch: admin/*, 404.html, auth/confirm,
// supabase/email-templates/* (not shareable pages), or cities/**
// (handled by the dedicated patch-city-*.js scripts, which know each
// city's own card).

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
// Top-level dirs skipped entirely: not shareable content (admin/, .git),
// or their own separate concern (supabase/ email templates).
const SKIP_DIRS = new Set(['admin', 'node_modules', '.git', 'supabase']);
const SKIP_FILES = new Set(['404.html']);
const CITIES_DIR = path.join(ROOT, 'cities');

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === ROOT && SKIP_DIRS.has(entry.name)) continue;
      if (full.includes(`${path.sep}auth${path.sep}confirm`)) continue;
      walk(full, out);
    } else if (entry.name.endsWith('.html')) {
      if (SKIP_FILES.has(entry.name)) continue;
      // The 300 main city pages + cities/index.html live directly in
      // cities/ and are handled by their own dedicated patch scripts,
      // which know each city's own share card -- skip only those. The
      // vertical subpages one level down (cities/<slug>/<vertical>/) are
      // not handled anywhere else and still need this generic pass.
      if (dir === CITIES_DIR) continue;
      out.push(full);
    }
  }
}

const files = [];
walk(ROOT, files);

let pass1 = 0, pass2 = 0, skipped = 0;
const problems = [];

for (const full of files) {
  let html = fs.readFileSync(full, 'utf8');
  const before = html;
  const selfClose = / \/>/.test(html.slice(0, html.indexOf('</head>') > -1 ? html.indexOf('</head>') : 2000));

  const hasOgImage = /property="og:image"/.test(html);
  const hasTwitterImage = /name="twitter:image"/.test(html);
  const hasTwitterCard = /name="twitter:card"/.test(html);

  if (hasOgImage && !hasTwitterImage) {
    const imgMatch = html.match(/<meta property="og:image" content="([^"]*)"\s*\/?>/);
    if (imgMatch) {
      const imgUrl = imgMatch[1];
      let insert = '';
      if (!hasTwitterCard) insert += `  <meta name="twitter:card" content="summary_large_image"${selfClose ? ' /' : ''}>\n`;
      insert += `  <meta name="twitter:image" content="${imgUrl}"${selfClose ? ' /' : ''}>\n`;
      html = html.replace(imgMatch[0], imgMatch[0] + '\n' + insert.trimEnd());
      if (html !== before) pass1++;
    } else {
      problems.push(`${path.relative(ROOT, full)}: has og:image match failure`);
    }
  } else if (!hasOgImage && /property="og:title"/.test(html)) {
    // Already a real OG block (title/description/type/url) -- just
    // missing the image and Twitter tags. Anchor after og:url when
    // present, else after whichever OG line comes last.
    const anchorMatch =
      html.match(/<meta property="og:url" content="[^"]*"\s*\/?>\n/) ||
      html.match(/<meta property="og:type" content="[^"]*"\s*\/?>\n/) ||
      html.match(/<meta property="og:description" content="[^"]*"\s*\/?>\n/);
    if (anchorMatch) {
      const insert =
        `  <meta property="og:image" content="https://glo-temp.com/og/wheel.jpg"${selfClose ? ' /' : ''}>\n` +
        (hasTwitterCard ? '' : `  <meta name="twitter:card" content="summary_large_image"${selfClose ? ' /' : ''}>\n`) +
        `  <meta name="twitter:image" content="https://glo-temp.com/og/wheel.jpg"${selfClose ? ' /' : ''}>\n`;
      html = html.replace(anchorMatch[0], anchorMatch[0] + insert);
      if (html !== before) pass1++;
    } else {
      problems.push(`${path.relative(ROOT, full)}: has og:title but no anchor line found`);
    }
  } else if (!hasOgImage) {
    // Pages with no OG block at all: only touch the known, hand-picked
    // set of real content pages -- never invent a block for something
    // that was never meant to be socially shared.
    const NEEDS_FULL_BLOCK = new Set([
      'movers/index.html', 'tonight/index.html', 'gem/index.html',
      'suggest-city/index.html', 'methodology/index.html',
    ]);
    const rel = path.relative(ROOT, full).split(path.sep).join('/');
    if (NEEDS_FULL_BLOCK.has(rel)) {
      const titleMatch = html.match(/<title>([^<]*)<\/title>/);
      const descMatch = html.match(/<meta name="description" content="([^"]*)"\s*\/?>/);
      const title = titleMatch ? titleMatch[1] : 'Glotemp';
      const desc = descMatch ? descMatch[1] : '';
      const url = `https://glo-temp.com/${rel.replace(/index\.html$/, '').replace(/\/$/, '')}`;
      const block =
        `  <meta property="og:title" content="${title}"${selfClose ? ' /' : ''}>\n` +
        `  <meta property="og:description" content="${desc}"${selfClose ? ' /' : ''}>\n` +
        `  <meta property="og:type" content="website"${selfClose ? ' /' : ''}>\n` +
        `  <meta property="og:url" content="${url}"${selfClose ? ' /' : ''}>\n` +
        `  <meta property="og:image" content="https://glo-temp.com/og/wheel.jpg"${selfClose ? ' /' : ''}>\n` +
        `  <meta name="twitter:card" content="summary_large_image"${selfClose ? ' /' : ''}>\n` +
        `  <meta name="twitter:title" content="${title}"${selfClose ? ' /' : ''}>\n` +
        `  <meta name="twitter:description" content="${desc}"${selfClose ? ' /' : ''}>\n` +
        `  <meta name="twitter:image" content="https://glo-temp.com/og/wheel.jpg"${selfClose ? ' /' : ''}>\n`;
      const descTag = html.match(/<meta name="description" content="[^"]*"\s*\/?>\n/);
      if (descTag) {
        html = html.replace(descTag[0], descTag[0] + block);
        if (html !== before) pass2++;
      } else {
        problems.push(`${rel}: no description tag to anchor insert`);
      }
    } else {
      skipped++;
    }
  } else {
    skipped++;
  }

  if (html !== before) fs.writeFileSync(full, html);
}

console.log(`twitter:image added to ${pass1} pages, full OG block added to ${pass2} pages, left alone ${skipped}`);
if (problems.length) {
  console.log(`\nproblems (${problems.length}):`);
  problems.forEach((p) => console.log('  ' + p));
  process.exitCode = 1;
}
