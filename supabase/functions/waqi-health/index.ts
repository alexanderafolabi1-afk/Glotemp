import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// FIXED: every branch of fetchAirQuality (no token, HTTP failure, bad
// status, and even the "success" branch) unconditionally wrote
// hospital_quality and wellness_index as Math.random() -- there is no
// free WAQI field for either, so both were pure fabrication on every
// single row, regardless of whether the real air_quality_index call
// succeeded. air_quality_index itself also had a Math.random() fallback
// for every failure path, silently standing in for a real reading.
//
// Now: only air_quality_index is written, only when WAQI_API_TOKEN is
// set and the API call actually returns a real aqi value. Any failure
// (no token, bad HTTP, bad status, exception) writes nothing for that
// city rather than a fabricated number -- an honest gap, not a guess.
//
// COORDINATE-READY: uses WAQI's geo:lat;lon endpoint against each city's
// real city_points.lat/lon instead of a hardcoded city-name keyword map,
// so it's ready to cover all 300 cities the moment a real WAQI_API_TOKEN
// is configured. Without a real token every request 403s and nothing is
// written -- that is a real, disclosed gap, not something this code can
// fabricate its way around.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WAQI_API_TOKEN = Deno.env.get("WAQI_API_TOKEN");

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

const FULL_COVERAGE_LIMIT = 300;

interface CityRow { city_slug: string; lat: number; lon: number }

async function loadCities(limit: number, slugs?: string[]): Promise<CityRow[]> {
  const filter = slugs && slugs.length ? `&city_slug=in.(${slugs.map(encodeURIComponent).join(",")})` : "";
  const { data, error } = await supabase
    .from("city_points")
    .select("city_slug,lat,lon")
    .order("city_slug", { ascending: true })
    .limit(limit);
  if (error) throw error;
  if (!slugs || !slugs.length) return data ?? [];
  const set = new Set(slugs);
  return (data ?? []).filter((c: CityRow) => set.has(c.city_slug));
}

async function fetchAirQuality(city: string, lat: number, lon: number): Promise<number | null> {
  if (!WAQI_API_TOKEN) {
    console.warn(`[waqi-health] ${city}: no WAQI_API_TOKEN set, skipping (no fabricated fallback)`);
    return null;
  }
  try {
    const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${WAQI_API_TOKEN}`;
    const response = await fetch(url, { headers: { "User-Agent": "glo-temp.com/1.0 (+https://glo-temp.com)" } });
    if (!response.ok) {
      console.warn(`[waqi-health] ${city}: HTTP ${response.status}, skipping`);
      return null;
    }
    const data = await response.json();
    if (data.status !== "ok" || !data.data || typeof data.data.aqi !== "number") {
      console.warn(`[waqi-health] ${city}: WAQI status="${data.status}", skipping`);
      return null;
    }
    return data.data.aqi;
  } catch (error) {
    console.error(`[waqi-health] ${city}: exception - ${(error as Error).message}, skipping`);
    return null;
  }
}

async function insertReading(citySlug: string, metric: string, value: number, label: string, confidence: number): Promise<boolean> {
  const { error } = await supabase.from("readings").insert({
    city_slug: citySlug, vertical: "health", metric, value, label,
    source: "waqi", source_url: "https://waqi.info", confidence,
    fetched_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`[waqi-health] insert failed for ${citySlug}/${metric}: ${error.message}`);
    return false;
  }
  return true;
}

Deno.serve(async (req: Request) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ success: false, error: "Missing Supabase credentials" }), {
      headers: { "Content-Type": "application/json" }, status: 500,
    });
  }

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? FULL_COVERAGE_LIMIT) || FULL_COVERAGE_LIMIT, 1), FULL_COVERAGE_LIMIT);
  const rawSlugs = url.searchParams.get("slugs");
  const slugs = rawSlugs ? rawSlugs.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

  try {
    const cities = await loadCities(limit, slugs);
    let rowsWritten = 0;
    let citiesProcessed = 0;

    for (const c of cities) {
      if (c.lat == null || c.lon == null) continue;
      const aqi = await fetchAirQuality(c.city_slug, c.lat, c.lon);
      if (aqi === null) continue;
      const ok = await insertReading(c.city_slug, "air_quality_index", aqi, "Air Quality Index", 0.85);
      if (ok) { rowsWritten++; citiesProcessed++; }
    }

    console.log(`[waqi-health] wrote ${rowsWritten} row(s) across ${citiesProcessed} of ${cities.length} cities checked`);

    return new Response(
      JSON.stringify({ success: true, rows: rowsWritten, cities: citiesProcessed, checked: cities.length }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[waqi-health] fatal error:", error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" }, status: 500,
    });
  }
});
