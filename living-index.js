// Glotemp Living Index: the one shared ranking source for /explore and the
// homepage barometers. Fetches the real Supabase `readings` table across
// all 12 verticals, normalizes each vertical's per-city average to a
// common 0-10 scale, and computes a coverage-weighted "living index" per
// city -- the same score, computed the same way, cached the same way,
// wherever it's used. Two pages calling this get the same ranking; there
// is no second implementation to drift out of sync.
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  // The twelve real verticals (see generate-rankings-pages.js, the
  // authoritative list). Nothing outside this list is a real metric.
  const VERTICALS = ['pulse', 'tech', 'finance', 'work', 'property', 'education',
    'sport', 'entertainment', 'fashion', 'food', 'health', 'transport'];

  const SIGNAL_THRESHOLD = 2; // matches the per-vertical rankings pages' convention
  const CACHE_KEY = 'glotemp-living-index-cache-v1';
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const FETCH_TIMEOUT_MS = 6000;

  let inflightPromise = null;

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || (Date.now() - parsed.computedAt) > CACHE_TTL_MS) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeCache(result) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch (e) { /* storage full/unavailable -- non-fatal, just skip persistence */ }
  }

  async function fetchVerticalReadings(vertical) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/readings?vertical=eq.${vertical}&select=city_slug,value,fetched_at&order=fetched_at.desc&limit=2000`,
        {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);
      if (!resp.ok) return [];
      return await resp.json();
    } catch (e) {
      clearTimeout(timeoutId);
      return [];
    }
  }

  // Deterministic fallback when the readings table is empty or
  // unreachable: uses only city.mood, which every city always has, so
  // both pages still land on the exact same pool even in fallback mode.
  function fallbackRanking(citiesData) {
    const cities = (citiesData || [])
      .filter(c => c.available !== false)
      .map(c => ({
        slug: c.slug, name: c.name, country: c.country, region: c.region,
        timezone: c.timezone, mood: c.mood,
        pulseReading: c.mood,
        livingIndex: c.mood,
        coveragePercent: null,
        verticalCoverage: 0,
        perVertical: {},
      }))
      .sort((a, b) => b.livingIndex - a.livingIndex);
    return { cities, top20: cities.slice(0, 20), rankingBasis: 'fallback', computedAt: Date.now() };
  }

  async function computeLivingIndex() {
    const citiesData = (window.CITIES_DATA || []);
    if (!citiesData.length) return fallbackRanking([]);

    try {
      const results = await Promise.all(VERTICALS.map(fetchVerticalReadings));

      // Per vertical: city_slug -> average value (only cities clearing
      // the signal threshold count, matching the per-vertical rankings
      // pages' own convention for what counts as a published reading).
      const perVerticalCityAvg = {};
      let totalReadings = 0;
      VERTICALS.forEach((vertical, i) => {
        const rows = results[i] || [];
        totalReadings += rows.length;
        const bySlug = new Map();
        rows.forEach(r => {
          if (typeof r.value !== 'number') return;
          if (!bySlug.has(r.city_slug)) bySlug.set(r.city_slug, []);
          bySlug.get(r.city_slug).push(r.value);
        });
        const avgMap = new Map();
        bySlug.forEach((values, slug) => {
          if (values.length < SIGNAL_THRESHOLD) return;
          avgMap.set(slug, values.reduce((s, v) => s + v, 0) / values.length);
        });
        perVerticalCityAvg[vertical] = avgMap;
      });

      if (totalReadings === 0) return fallbackRanking(citiesData);

      // Normalize each vertical's city averages to 0-10 via min-max
      // scaling within that vertical's own observed distribution -- the
      // only principled way to compare metrics on wildly different
      // native scales (sentiment_score /10 vs. developer_activity index
      // vs. property_appreciation % annual) without fabricating
      // arbitrary absolute bounds per metric.
      const normalized = {};
      VERTICALS.forEach(vertical => {
        const avgMap = perVerticalCityAvg[vertical];
        const values = Array.from(avgMap.values());
        const map = new Map();
        if (values.length) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          avgMap.forEach((val, slug) => {
            map.set(slug, max === min ? 5 : (10 * (val - min) / (max - min)));
          });
        }
        normalized[vertical] = map;
      });

      const cities = citiesData.filter(c => c.available !== false).map(c => {
        let sum = 0;
        let coveredCount = 0;
        const perVertical = {};
        VERTICALS.forEach(vertical => {
          const n = normalized[vertical].get(c.slug);
          if (n !== undefined) {
            sum += n;
            coveredCount += 1;
            perVertical[vertical] = n;
          }
        });
        // Divide by the full vertical count (not just the ones covered)
        // so a city with data in 3 verticals cannot outrank one with 12 --
        // this is the "weighted by coverage" behavior, not a separate step.
        const livingIndex = sum / VERTICALS.length;
        const coveragePercent = Math.round((coveredCount / VERTICALS.length) * 100);
        const pulseAvg = perVerticalCityAvg.pulse.get(c.slug);
        return {
          slug: c.slug, name: c.name, country: c.country, region: c.region,
          timezone: c.timezone, mood: c.mood,
          pulseReading: pulseAvg !== undefined ? pulseAvg : c.mood,
          livingIndex, coveragePercent,
          verticalCoverage: coveredCount, perVertical,
        };
      });

      cities.sort((a, b) => b.livingIndex - a.livingIndex);
      return { cities, top20: cities.slice(0, 20), rankingBasis: 'readings', computedAt: Date.now() };
    } catch (e) {
      return fallbackRanking(citiesData);
    }
  }

  // Returns { cities, top20, rankingBasis, computedAt }. Cached across
  // both pages for CACHE_TTL_MS via sessionStorage, and de-duplicated
  // in-flight within a single page load.
  async function getRanking() {
    const cached = readCache();
    if (cached) return cached;
    if (inflightPromise) return inflightPromise;
    inflightPromise = computeLivingIndex().then(result => {
      writeCache(result);
      inflightPromise = null;
      return result;
    });
    return inflightPromise;
  }

  window.GlotempLivingIndex = { getRanking, VERTICALS, SIGNAL_THRESHOLD };
})();
