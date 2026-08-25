// Rasterizes every /og/*.svg share card (see generate-city-share-cards.js)
// to a same-named PNG. Needed because X/Twitter's card crawler does not
// render SVG for og:image / twitter:image -- it needs an actual raster
// image, so a link shared with an SVG card renders blank.
//
// Uses a headless Chromium via Playwright to screenshot each card at its
// native 1200x630 size. The SVGs stay in /og/ as the source of truth;
// this is a pure re-render step, safe to re-run any time the SVGs change.
// Requires `npx playwright install chromium` (or a system Chromium at
// PLAYWRIGHT_BROWSERS_PATH) to be available wherever this is run --
// it is a one-off build step, not something the live site depends on.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OG_DIR = path.join(__dirname, 'og');
const W = 1200;
const H = 630;

async function main() {
  const svgFiles = fs.readdirSync(OG_DIR).filter((f) => f.endsWith('.svg'));
  if (!svgFiles.length) {
    console.log('no SVG cards found in /og -- run generate-city-share-cards.js first');
    return;
  }

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(executablePath) ? executablePath : undefined,
  });
  const page = await browser.newPage({ viewport: { width: W, height: H } });

  let written = 0;
  for (const file of svgFiles) {
    const svgPath = path.join(OG_DIR, file);
    const pngPath = svgPath.replace(/\.svg$/, '.png');
    await page.goto('file://' + svgPath);
    await page.screenshot({ path: pngPath });
    written++;
  }

  await browser.close();
  console.log(`rasterized ${written} share cards to PNG in /og/`);
}

main();
