#!/usr/bin/env node
// Glotemp OG/X card: the homepage hero wheel.
//
// Writes og/wheel.jpg -- 1200x630, the size X and Facebook want for
// summary_large_image -- showing the homepage instrument and nothing
// else. No type, no slogan, no new illustration. This replaced
// og/home.png ("Live City Pulse" over a gold plate) as the site's share
// image; that file and its generator are left in place, just no longer
// referenced by any meta tag.
//
// The source is /assets/instrument-base.png, opened READ ONLY. Nothing
// in /assets/ is written, resized, converted or replaced by this script,
// and the card is a separate derived file under og/.
//
// Two treatments are copied VERBATIM from styles.css rather than
// re-invented here, so the card matches what the homepage renders:
//
//   1. The mask. instrument-base.png is a flattened export with no real
//      alpha -- the "transparent" surround is a literal grey checker
//      pattern baked into opaque pixels. styles.css crops it on
//      .hero-instrument-base with
//        radial-gradient(circle at 50.2% 49.9%, #000 36.5%, transparent 37.6%)
//      (a soft edge, because a hard clip left a 1-2px checker sliver at
//      some zoom levels). Same values here. If instrument-base.png is
//      ever replaced, re-detect them in styles.css first, then rerun.
//
//   2. The aperture. Left dark, as the homepage shows it -- the amber
//      .hero-instrument-glow only reads through the live SVG layer that
//      glotemp-hero-instrument.js draws from real data, and baking a lit
//      lens into a static card would imply a reading that isn't there.
//
// Usage: serve the repo root, then
//   node generate-og-wheel-card.js [http://127.0.0.1:8140]

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ORIGIN = process.argv[2] || 'http://127.0.0.1:8140';
const OUT = path.join(__dirname, 'og', 'wheel.jpg');
const W = 1200;
const H = 630;
// The instrument's own box. The mask keeps a 36.5% radius of it, so the
// visible disc is ~73% of this -- 540px, which fills the card's height
// with a margin either side rather than touching the edges.
const SIZE = 740;

(async () => {
  const browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}
  );
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  await page.setContent(`<body style="margin:0;width:${W}px;height:${H}px;background:#0a0a0c;
      display:flex;align-items:center;justify-content:center;overflow:hidden">
    <img id="wheel" src="${ORIGIN}/assets/instrument-base.png"
         style="width:${SIZE}px;height:${SIZE}px;display:block;
                -webkit-mask-image:radial-gradient(circle at 50.2% 49.9%, #000 36.5%, transparent 37.6%);
                mask-image:radial-gradient(circle at 50.2% 49.9%, #000 36.5%, transparent 37.6%)">
  </body>`);

  await page.waitForFunction(() => {
    const i = document.getElementById('wheel');
    return i && i.complete && i.naturalWidth > 0;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(300);

  await page.screenshot({ path: OUT, type: 'jpeg', quality: 92 });
  await browser.close();

  const bytes = fs.statSync(OUT).size;
  if (bytes > 5 * 1024 * 1024) {
    console.error(`og/wheel.jpg is ${bytes} bytes -- over X's 5MB limit.`);
    process.exit(1);
  }
  console.log(`og/wheel.jpg  ${W}x${H}  ${bytes} bytes`);
})();
