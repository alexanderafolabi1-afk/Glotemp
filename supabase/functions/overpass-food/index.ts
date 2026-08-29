// Real restaurant/cafe density near each city, from OpenStreetMap's free,
// keyless Overpass API. Server side, on a schedule.
//
// FIXED: the previous version parsed Overpass's response with a
// `/Count: (\d+)/` regex, which only matches the CSV/Turbo-UI output
// format -- the raw `/api/interpreter` endpoint used here returns XML by
// default, so that regex never matched a single real response, and every
// "success" silently fell back to the hardcoded default (500). Fixed by
// requesting `[out:json]` explicitly and reading the real total from
// `elements[0].tags.total`.
//
// Also fixed: `michelin_stars` and `culinary_diversity` were always
// `Math.random()`, with no real input behind either -- there is no free,
// keyless Michelin data source. Removed entirely rather than kept as a
// guess; only `restaurant_count` (real) is written now.
//
// COORDINATE-EXPANDABLE: this now queries every city's own real
// city_points.lat/lon instead of a hardcoded 19-city bounding-box table,
// same shape as wikidata-universities. A city already holding a recent
// overpass_osm/food reading is skipped so repeated runs make forward
// progress across the full city list instead of re-querying the same
// cities (Overpass's public mirrors are shared infrastructure and
// noticeably flaky -- most requests in one run will time out or fail,
// which is why this is designed to be invoked repeatedly, not once).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const UA = "glo-temp.com/1.0 (+https://glo-temp.com; info@glo-temp.com)";
const TIMEOUT_MS = 25000;
const REQUEST_GAP_MS = 300;
const RADIUS_KM = 12;
const FULL_COVERAGE_LIMIT = 300;
const ALREADY_COVERED_WITHIN_HOURS = 20;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function rest(path: string, init: RequestInit = {}) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!resp.ok) throw new Error(`rest ${path} ${resp.status} ${await resp.text()}`);
  return resp;
}

interface CityRow { city_slug: string; lat: number; lon: number }

async function loadCities(limit: number, slugs?: string[]): Promise<CityRow[]> {
  const filter = slugs && slugs.length ? `&city_slug=in.(${slugs.map(encodeURIComponent).join(",")})` : "";
  const resp = await rest(`city_points?select=city_slug,lat,lon&order=city_slug.asc&limit=${limit}${filter}`);
  return await resp.json();
}

async function loadAlreadyCovered(): Promise<Set<string>> {
  const since = new Date(Date.now() - ALREADY_COVERED_WITHIN_HOURS * 3600000).toISOString();
  const resp = await rest(
    `readings?select=city_slug&vertical=eq.food&source=eq.overpass_osm&fetched_at=gte.${encodeURIComponent(since)}`,
  );
  const rows = (await resp.json()) as { city_slug: string }[];
  return new Set(rows.map((r) => r.city_slug));
}

function bboxFor(lat: number, lon: number, radiusKm: number) {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
  return { south: lat - dLat, west: lon - dLon, north: lat + dLat, east: lon + dLon };
}

async function fetchRestaurantCount(lat: number, lon: number): Promise<number | null> {
  const b = bboxFor(lat, lon, RADIUS_KM);
  const query = `[out:json][timeout:20];
    (
      node["amenity"="restaurant"](${b.south},${b.west},${b.north},${b.east});
      way["amenity"="restaurant"](${b.south},${b.west},${b.north},${b.east});
      node["amenity"="cafe"](${b.south},${b.west},${b.north},${b.east});
      way["amenity"="cafe"](${b.south},${b.west},${b.north},${b.east});
    );
    out count;`;

  const mirrors = ["https://overpass-api.de/api/interpreter", "https://overpass.openstreetmap.ru/api/interpreter"];

  for (const url of mirrors) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "POST",
        body: query,
        signal: controller.signal,
        headers: { "User-Agent": UA, "Content-Type": "text/plain" },
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        console.warn(`[overpass-food] ${url} HTTP ${response.status}, trying next mirror`);
        continue;
      }
      const data = await response.json();
      const total = data?.elements?.[0]?.tags?.total;
      if (total === undefined) {
        console.warn(`[overpass-food] no count element in response, trying next mirror`);
        continue;
      }
      return parseInt(total, 10);
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`[overpass-food] mirror ${url} failed - ${(error as Error).message}`);
    }
  }
  return null;
}

async function insertReading(citySlug: string, metric: string, value: number, label: string, confidence: number): Promise<boolean> {
  try {
    await rest("readings", {
      method: "POST",
      body: JSON.stringify([{
        city_slug: citySlug, vertical: "food", metric, value, label,
        source: "overpass_osm", source_url: "https://overpass-turbo.eu",
        confidence, fetched_at: new Date().toISOString(),
      }]),
    });
    return true;
  } catch (e) {
    console.error(`[overpass-food] insert failed for ${citySlug}/${metric}: ${String(e)}`);
    return false;
  }
}

async function jobFetch(limitCities: number, slugs?: string[], force?: boolean) {
  const cities = await loadCities(limitCities, slugs);
  const covered = force ? new Set<string>() : await loadAlreadyCovered();
  const cityErrors: { city_slug: string; detail: string }[] = [];
  let citiesChecked = 0, citiesWithResults = 0, rowsWritten = 0;

  for (const c of cities) {
    if (covered.has(c.city_slug)) continue;
    if (c.lat == null || c.lon == null) continue;
    citiesChecked++;

    const count = await fetchRestaurantCount(c.lat, c.lon);
    if (count === null) {
      cityErrors.push({ city_slug: c.city_slug, detail: "all mirrors failed or timed out" });
    } else {
      const confidence = Math.min(0.85, Math.max(0.3, count / 500));
      const ok = await insertReading(c.city_slug, "restaurant_count", count, "Restaurants and cafes nearby (OSM)", confidence);
      if (ok) { rowsWritten++; citiesWithResults++; }
    }
    await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
  }

  return { cities: cities.length, citiesChecked, citiesWithResults, rowsWritten, errors: cityErrors };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? FULL_COVERAGE_LIMIT) || FULL_COVERAGE_LIMIT, 1), FULL_COVERAGE_LIMIT);
  const rawSlugs = url.searchParams.get("slugs");
  const slugs = rawSlugs ? rawSlugs.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const force = url.searchParams.get("force") === "true";

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ success: false, error: "Missing Supabase credentials" }, 500);
  }

  try {
    const result = await jobFetch(limit, slugs, force);
    console.log(`[overpass-food]`, JSON.stringify(result));
    if (result.citiesChecked > 0 && result.errors.length === result.citiesChecked) {
      return json({ ...result, all_failed: true }, 502);
    }
    return json({ success: true, ...result });
  } catch (error) {
    console.error("[overpass-food] fatal error:", error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
