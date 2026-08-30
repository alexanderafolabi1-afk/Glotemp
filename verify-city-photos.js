#!/usr/bin/env node
// One-off diagnostic: confirms every city in cities-data.js resolves to a
// real photo via the exact same free/keyless Wikipedia chain the site's
// client-side code uses -- landmark-first for the 24 curated cities (see
// city-landmark-photos.js), then Wikipedia's summary API, then its more
// forgiving pageimages API, each tried again with a "City, Country"
// variant (see city-wiki.js's getCityImageUrl). Read-only: never writes
// anywhere, never touches /assets/. Exits non-zero if any city comes back
// with no image at all, so this can also gate a CI job if wanted later.
const CITIES_DATA = require('./cities-data.js');

const LANDMARK_TITLES = {
  paris: 'Eiffel Tower', london: 'Big Ben', nyc: 'Statue of Liberty',
  tokyo: 'Tokyo Tower', rome: 'Colosseum', sydney: 'Sydney Opera House',
  dubai: 'Burj Khalifa', beijing: 'Temple of Heaven', moscow: "Saint Basil's Cathedral",
  berlin: 'Brandenburg Gate', barcelona: 'Sagrada Família', cairo: 'Great Pyramid of Giza',
  istanbul: 'Hagia Sophia', 'san-francisco': 'Golden Gate Bridge', chicago: 'Willis Tower',
  'los-angeles': 'Hollywood Sign', singapore: 'Marina Bay Sands', 'hong-kong': 'Victoria Harbour',
  seoul: 'N Seoul Tower', amsterdam: 'Canals of Amsterdam', 'washington-dc': 'United States Capitol',
  toronto: 'CN Tower', mumbai: 'Gateway of India', delhi: 'India Gate',
  'kuala-lumpur': 'Petronas Towers',
};

const REST_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const ACTION_API = 'https://en.wikipedia.org/w/api.php';
const TIMEOUT_MS = 10000;
const CONCURRENCY = 8;

async function fetchSummary(title) {
  try {
    const resp = await fetch(REST_API + encodeURIComponent(title), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data || data.type === 'disambiguation') return null;
    return data;
  } catch (e) { return null; }
}

async function fetchPageImage(title) {
  try {
    const url = `${ACTION_API}?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=1200&titles=${encodeURIComponent(title)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!resp.ok) return null;
    const data = await resp.json();
    const pages = data && data.query && data.query.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    return (page && page.thumbnail && page.thumbnail.source) || null;
  } catch (e) { return null; }
}

async function resolveCityImage(city) {
  if (LANDMARK_TITLES[city.slug]) {
    const data = await fetchSummary(LANDMARK_TITLES[city.slug]);
    if (data && data.thumbnail && data.thumbnail.source) return { via: 'landmark-summary' };
    const img = await fetchPageImage(LANDMARK_TITLES[city.slug]);
    if (img) return { via: 'landmark-pageimage' };
  }
  let data = await fetchSummary(city.name);
  if (data && data.thumbnail && data.thumbnail.source) return { via: 'summary-name' };
  const title = (data && data.title) || city.name;
  let img = await fetchPageImage(title);
  if (img) return { via: 'pageimage-name' };
  data = await fetchSummary(`${city.name}, ${city.country}`);
  if (data && data.thumbnail && data.thumbnail.source) return { via: 'summary-namecountry' };
  img = await fetchPageImage(`${city.name}, ${city.country}`);
  if (img) return { via: 'pageimage-namecountry' };
  return null;
}

async function runBatched(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, lane));
  return results;
}

(async () => {
  const tally = {};
  const failures = [];
  await runBatched(CITIES_DATA, async (city, i) => {
    const result = await resolveCityImage(city);
    if (!result) {
      failures.push(city.slug);
      console.log(`[${i + 1}/${CITIES_DATA.length}] ${city.slug}: NO IMAGE`);
    } else {
      tally[result.via] = (tally[result.via] || 0) + 1;
      console.log(`[${i + 1}/${CITIES_DATA.length}] ${city.slug}: ok via ${result.via}`);
    }
  }, CONCURRENCY);

  console.log('\n=== SUMMARY ===');
  console.log(`Total cities: ${CITIES_DATA.length}`);
  console.log(`With an image: ${CITIES_DATA.length - failures.length}`);
  console.log(`Without an image: ${failures.length}`);
  console.log('Breakdown by source tier:', JSON.stringify(tally, null, 2));
  if (failures.length) {
    console.log('Cities with NO image found:', failures.join(', '));
    process.exitCode = 1;
  }
})();
