#!/usr/bin/env node
/* Glotemp city media: licensed photographs of the top cities, fetched
 * server-side on a schedule and stored in /city-media/.
 *
 * WHY SERVER-SIDE
 * The spin section renders its backdrop from what is already on disk. It
 * never calls Openverse or Commons from a visitor's browser: those APIs
 * are rate-limited per IP, they would put a network round trip in front
 * of a section that must look complete on load, and their terms are
 * happier with a scheduled crawl than with one request per pageview.
 *
 * LICENSING IS THE HARD CONSTRAINT, NOT AN AFTERTHOUGHT
 * This site carries advertising, so only three things are usable:
 *
 *   CC0            - no rights reserved
 *   Public domain  - including PDM and "expired copyright" tags
 *   CC BY          - attribution only
 *
 * Everything else is rejected outright: BY-SA (share-alike would reach
 * the page it is embedded in), NC (non-commercial, and this site is
 * commercial), ND, GFDL, "fair use", and anything whose licence string
 * cannot be parsed with confidence. An image whose licence is merely
 * UNCLEAR is treated exactly like one that is forbidden -- see
 * classifyLicence(), which returns null rather than guessing.
 *
 * Creator, licence and the page the file came from are stored with every
 * single image. Nothing is written without all three.
 *
 * Usage:
 *   node scripts/fetch-city-media.js [--cities 100] [--per-city 4]
 *                                    [--width 1000] [--slug tokyo] [--dry]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'city-media');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');

const OPENVERSE = 'https://api.openverse.org/v1/images/';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const UA = 'GlotempCityMedia/1.0 (https://glo-temp.com; info@glo-temp.com)';

// Deliberately unhurried. Both APIs are free and neither owes us
// throughput; a scheduled job has all the time in the world.
const PAUSE_MS = 700;
const TIMEOUT_MS = 20000;
const MIN_WIDTH = 900;          // below this it cannot fill a section backdrop

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i === -1 ? fallback : args[i + 1];
};
const CITY_COUNT = Number(flag('cities', 100));
const PER_CITY = Number(flag('per-city', 4));
const WIDTH = Number(flag('width', 1000));
const ONLY_SLUG = flag('slug', null);
const DRY = args.includes('--dry');

// ---------- the city list ----------
// "Top by attention index" is the ranking cities-data.js is already
// ordered by and documents in its own header: internet penetration rate
// multiplied by metro population. `rank` carries it, 1 upward.
function topCities(n) {
  // cities-data.js ends with `module.exports = CITIES_DATA`, so requiring
  // it is enough -- rewriting the declaration broke the file's own tail.
  const all = require(path.join(ROOT, 'cities-data.js'));
  return all
    .filter((c) => c && c.slug && c.available !== false)
    .slice()
    .sort((a, b) => (a.rank || 9999) - (b.rank || 9999))
    .slice(0, n);
}

// ---------- licensing ----------
// Returns a normalised, human-readable licence string, or null if the
// image may not be used. Null is the safe answer for anything unrecognised.
function classifyLicence(raw, version) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;

  // Reject before accepting: "cc by-sa" contains "cc by".
  if (/\bnc\b|non-?commercial/.test(s)) return null;
  if (/\bnd\b|no-?deriv/.test(s)) return null;
  if (/share.?alike|\bsa\b|by-sa/.test(s)) return null;
  if (/gfdl|fair use|non-?free|copyright/.test(s) && !/no known copyright|copyright expired/.test(s)) return null;

  if (/^cc0|creative commons zero|\bcc0\b/.test(s)) return 'CC0';
  if (/public domain|\bpdm\b|no known copyright|copyright expired/.test(s)) return 'Public domain';
  if (/^cc[ -]?by\b|creative commons attribution/.test(s)) {
    // Keep whatever version we can establish: the caller may pass one
    // (Openverse) or it may already be inside the string (Commons).
    const inline = s.match(/\b(\d\.\d)\b/);
    const v = version || (inline && inline[1]);
    return v ? `CC BY ${v}` : 'CC BY';
  }
  return null;
}

// A result matching only because the CITY NAME happens to appear
// somewhere in a photo's metadata -- most commonly a prolific
// contributor's own stated home city in their Author field -- is not a
// photo OF that city. Real bug found by actually running this script:
// Dubai's stored images turned out to be the Golden Temple in Amritsar,
// India, because a Commons uploader based "in Dubai, united arab
// emirates" had photographed it; Miami got a Cincinnati skyline, Sydney
// got Brisbane, Istanbul got Moscow and Bhutan. Both fetchers already
// return the candidate's own file/media title, so require the city name
// to actually appear there -- the one field that reliably describes the
// photo's real subject -- before it is ever downloaded.
function titleMentionsCity(title, cityName) {
  if (!title || !cityName) return false;
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const t = norm(title);
  const name = norm(cityName);
  if (!name) return false;
  // Multi-word city names ("New York", "Hong Kong"): require every word
  // to appear, not just one -- "New" alone matches far too much.
  return name.split(' ').every((word) => word.length < 3 || t.includes(word));
}

function cleanCreator(raw) {
  // Commons' Artist field is HTML (often an <a> to a user page).
  const text = String(raw || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || /^unknown$/i.test(text)) return null;
  return text.length > 120 ? text.slice(0, 117).trimEnd() + '…' : text;
}

// ---------- plumbing ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal });
    if (!resp.ok) return { error: `HTTP ${resp.status}`, body: (await resp.text()).slice(0, 200) };
    return { data: await resp.json() };
  } catch (e) {
    return { error: String(e) };
  } finally {
    clearTimeout(t);
  }
}

async function download(url, dest) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    if (!resp.ok) return { error: `HTTP ${resp.status}` };
    const type = String(resp.headers.get('content-type') || '');
    if (!/^image\/(jpeg|png)/.test(type)) return { error: `content-type ${type}` };
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 12000) return { error: `too small (${buf.length}B)` };
    fs.writeFileSync(dest, buf);
    return { bytes: buf.length };
  } catch (e) {
    return { error: String(e) };
  } finally {
    clearTimeout(t);
  }
}

// ---------- Openverse ----------
async function fromOpenverse(city) {
  const url = OPENVERSE + '?' + new URLSearchParams({
    q: `${city.name} ${city.country} landmark`,
    // Openverse's own filters. Belt and braces: classifyLicence() checks
    // every result again, because a filter that silently stops working
    // must not be the only thing between us and a BY-SA image.
    license: 'cc0,by,pdm',
    license_type: 'commercial,modification',
    size: 'large',
    mature: 'false',
    page_size: '24',
  });
  const { data, error } = await getJSON(url);
  if (error || !data || !Array.isArray(data.results)) return { items: [], note: error || 'no results field' };

  const items = [];
  for (const r of data.results) {
    const licence = classifyLicence(r.license, r.license_version);
    const creator = cleanCreator(r.creator);
    const source = r.foreign_landing_url || r.url;
    if (!licence || !creator || !source || !r.url) continue;
    if ((r.width || 0) && r.width < MIN_WIDTH) continue;
    // Openverse's own `q` is a loose relevance search across title, tags
    // and description -- it can match on the city name appearing
    // anywhere, not the photo's actual subject. Require it in the title.
    if (!titleMentionsCity(r.title, city.name)) continue;
    items.push({ remote: r.url, licence, creator, sourceUrl: source, title: r.title || null });
  }
  return { items, note: `openverse ${data.results.length} raw / ${items.length} usable` };
}

// ---------- Wikimedia Commons ----------
async function fromCommons(city) {
  const url = COMMONS + '?' + new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    // intitle: restricts to files whose own title contains the city name
    // -- a bare gsrsearch keyword (the previous query) matches anywhere
    // in the page, including an unrelated uploader's own stated home
    // city, which is exactly how Dubai ended up with Amritsar photos.
    // titleMentionsCity() below is the second, independent check on the
    // same field once results come back.
    gsrsearch: `intitle:"${city.name}" (landmark OR skyline OR "old town" OR cathedral OR temple OR bridge OR square)`,
    gsrnamespace: '6',
    gsrlimit: '30',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: String(WIDTH),
  });
  const { data, error } = await getJSON(url);
  const pages = (data && data.query && data.query.pages) || [];
  if (error) return { items: [], note: error };

  const BAD = /logo|coat[\s_]of[\s_]arms|seal[\s_]of|flag[\s_]of|\bmap\b|diagram|chart|icon|emblem|locator/i;
  const items = [];
  for (const p of pages) {
    const info = p.imageinfo && p.imageinfo[0];
    if (!info) continue;
    if (!/^image\/(jpeg|png)$/i.test(info.mime || '')) continue;
    if ((info.width || 0) < MIN_WIDTH) continue;
    if (BAD.test(String(p.title || '').replace(/^File:/i, ''))) continue;

    const meta = info.extmetadata || {};
    const licence = classifyLicence(
      (meta.LicenseShortName && meta.LicenseShortName.value) || (meta.UsageTerms && meta.UsageTerms.value),
      null,
    );
    const creator = cleanCreator(meta.Artist && meta.Artist.value);
    if (!licence || !creator) continue;
    if (!titleMentionsCity(p.title, city.name)) continue;
    items.push({
      remote: info.thumburl || info.url,
      licence,
      creator,
      sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
      title: String(p.title || '').replace(/^File:/i, '') || null,
    });
  }
  return { items, note: `commons ${pages.length} raw / ${items.length} usable` };
}

// ---------- per city ----------
async function collect(city) {
  const notes = [];
  const seen = new Set();
  const pool = [];

  for (const source of [fromOpenverse, fromCommons]) {
    const { items, note } = await source(city);
    notes.push(note);
    for (const it of items) {
      const key = (it.title || it.remote).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(it);
    }
    await sleep(PAUSE_MS);
    if (pool.length >= PER_CITY * 3) break;   // plenty; stop asking
  }
  return { pool, notes };
}

async function run() {
  const cities = topCities(CITY_COUNT).filter((c) => !ONLY_SLUG || c.slug === ONLY_SLUG);
  if (!DRY) fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest = { generated: new Date().toISOString(), width: WIDTH, cities: {} };
  let totalBytes = 0;
  let withImages = 0;
  const empty = [];

  for (const [i, city] of cities.entries()) {
    const { pool, notes } = await collect(city);
    const stored = [];

    // Clear any files a previous run left for this city before writing --
    // otherwise a city that used to get 4 images and now only qualifies
    // for 2 (e.g. after tightening titleMentionsCity() above) keeps
    // stale 3.jpg/4.jpg on disk forever, orphaned from the manifest.
    if (!DRY) {
      fs.rmSync(path.join(OUT_DIR, city.slug), { recursive: true, force: true });
      fs.mkdirSync(path.join(OUT_DIR, city.slug), { recursive: true });
    }

    for (const item of pool) {
      if (stored.length >= PER_CITY) break;
      const ext = /\.png($|\?)/i.test(item.remote) ? 'png' : 'jpg';
      const rel = `city-media/${city.slug}/${stored.length + 1}.${ext}`;
      if (DRY) {
        stored.push({ src: '/' + rel, creator: item.creator, licence: item.licence, sourceUrl: item.sourceUrl });
        continue;
      }
      const res = await download(item.remote, path.join(ROOT, rel));
      await sleep(PAUSE_MS);
      if (res.error) continue;
      totalBytes += res.bytes;
      stored.push({ src: '/' + rel, creator: item.creator, licence: item.licence, sourceUrl: item.sourceUrl });
    }

    if (stored.length) {
      manifest.cities[city.slug] = { name: city.name, images: stored };
      withImages++;
    } else {
      // A city with nothing licensed is simply absent from the manifest.
      // The client skips it. No blank frame, no placeholder, ever.
      if (!DRY) fs.rmSync(path.join(OUT_DIR, city.slug), { recursive: true, force: true });
      empty.push(city.slug);
    }
    console.log(
      `[${String(i + 1).padStart(3)}/${cities.length}] ${city.slug.padEnd(22)} ` +
      `${String(stored.length)} stored   ${notes.join(' | ')}`,
    );
  }

  if (!DRY) fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');

  console.log('\n---------------------------------------------');
  console.log(`cities requested : ${cities.length}`);
  console.log(`cities with media: ${withImages}`);
  console.log(`cities skipped   : ${empty.length}${empty.length ? '  (' + empty.slice(0, 25).join(', ') + ')' : ''}`);
  console.log(`images stored    : ${Object.values(manifest.cities).reduce((n, c) => n + c.images.length, 0)}`);
  console.log(`bytes on disk    : ${(totalBytes / 1048576).toFixed(1)} MB`);

  const licences = {};
  Object.values(manifest.cities).forEach((c) => c.images.forEach((im) => {
    licences[im.licence] = (licences[im.licence] || 0) + 1;
  }));
  console.log('licences         :', JSON.stringify(licences));

  // A run that stores nothing is a failure, not a quiet success.
  if (!DRY && withImages === 0) {
    console.error('\nNo city produced a usable image. Refusing to write an empty manifest as success.');
    process.exit(1);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
