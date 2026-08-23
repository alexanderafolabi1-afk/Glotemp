import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// FIXED: bike_share_bikes and congestion_level were always Math.random(),
// in both the success and failure branches -- there is no free Transitland
// field for either, so both were pure fabrication on every row. On any
// HTTP failure or exception, transit_quality was also silently replaced
// with a Math.random() fallback.
//
// Now: only transit_quality is written, only when TRANSITLAND_API_KEY is
// set and the API call actually succeeds with real stop/route data. Any
// failure writes nothing for that city rather than a fabricated number.
//
// COORDINATE-EXPANDABLE: uses each city's real city_points.lat/lon
// instead of a hardcoded 19-city coordinate table, so it's ready to
// cover all 300 cities the moment a real TRANSITLAND_API_KEY exists.
// Without one every request 401s and nothing is written -- a real,
// disclosed gap, not something this code can fabricate its way around.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TRANSITLAND_API_KEY = Deno.env.get("TRANSITLAND_API_KEY");

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

const FULL_COVERAGE_LIMIT = 300;
const RADIUS_DEG = 0.12; // ~13km at the equator, consistent with this codebase's other real-data radii

interface CityRow { city_slug: string; lat: number; lon: number }

async function loadCities(limit: number, slugs?: string[]): Promise<CityRow[]> {
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

async function fetchTransitQuality(city: string, lat: number, lon: number): Promise<number | null> {
  if (!TRANSITLAND_API_KEY) {
    console.warn(`[transitland-transport] ${city}: no TRANSITLAND_API_KEY set, skipping (no fabricated fallback)`);
    return null;
  }
  try {
    const bbox = `${lon - RADIUS_DEG},${lat - RADIUS_DEG},${lon + RADIUS_DEG},${lat + RADIUS_DEG}`;
    const query = `
      query {
        stops(where: {bbox: "${bbox}"}) { edges { node { id } } }
        routes(where: {bbox: "${bbox}"}) { edges { node { id } } }
      }
    `;
    const response = await fetch("https://api.transit.land/v2/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "glo-temp.com/1.0 (+https://glo-temp.com)",
        apikey: TRANSITLAND_API_KEY,
      },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      console.warn(`[transitland-transport] ${city}: HTTP ${response.status}, skipping`);
      return null;
    }
    const data = await response.json();
    const stopCount = data.data?.stops?.edges?.length || 0;
    const routeCount = data.data?.routes?.edges?.length || 0;
    if (stopCount === 0 && routeCount === 0) return null;
    return Math.min(9, 5 + stopCount / 100);
  } catch (error) {
    console.error(`[transitland-transport] ${city}: exception - ${(error as Error).message}, skipping`);
    return null;
  }
}

async function insertReading(citySlug: string, metric: string, value: number, label: string, confidence: number): Promise<boolean> {
  const { error } = await supabase.from("readings").insert({
    city_slug: citySlug, vertical: "transport", metric, value, label,
    source: "transitland", source_url: "https://transit.land", confidence,
    fetched_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`[transitland-transport] insert failed for ${citySlug}/${metric}: ${error.message}`);
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
      const quality = await fetchTransitQuality(c.city_slug, c.lat, c.lon);
      if (quality === null) continue;
      const ok = await insertReading(c.city_slug, "transit_quality", quality, "Public transit stop density", 0.75);
      if (ok) { rowsWritten++; citiesProcessed++; }
    }

    console.log(`[transitland-transport] wrote ${rowsWritten} row(s) across ${citiesProcessed} of ${cities.length} cities checked`);

    return new Response(
      JSON.stringify({ success: true, rows: rowsWritten, cities: citiesProcessed, checked: cities.length }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[transitland-transport] fatal error:", error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" }, status: 500,
    });
  }
});
