import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

// City keywords for fashion/brand mentions
const cityKeywords: Record<string, string[]> = {
  "tokyo": ["Tokyo fashion", "Harajuku style", "Japanese designers"],
  "nyc": ["New York fashion", "NYC fashion week"],
  "london": ["London fashion", "London Fashion Week"],
  "paris": ["Paris fashion", "haute couture"],
  "berlin": ["Berlin fashion week"],
  "dubai": ["Dubai luxury", "luxury brands", "designer fashion"],
  "singapore": ["Singapore fashion"],
  "hong-kong": ["Hong Kong fashion"],
  "toronto": ["Toronto fashion"],
  "sydney": ["Sydney fashion"],
  "bangkok": ["Bangkok street style"],
  "shanghai": ["Shanghai luxury", "Chinese fashion"],
  "delhi": ["Indian fashion"],
  "mumbai": ["Mumbai fashion"],
  "sao-paulo": ["São Paulo fashion"],
  "mexico-city": ["Mexican fashion"],
  "cairo": ["Cairo fashion"],
  "seoul": ["Seoul fashion", "Korean style"],
  "medellin": ["Medellin fashion"],
  "buenos-aires": ["Buenos Aires fashion"],
};

async function fetchFashionSentiment(city: string, keywords: string[]) {
  try {
    // GDELT 2.0 DOC API — the old /v2/news/news endpoint does not exist.
    const baseUrl = "https://api.gdeltproject.org/api/v2/doc/doc";
    const query = keywords[0];
    const url = `${baseUrl}?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=50`;

    const response = await fetch(url, {
      headers: { "User-Agent": "glo-temp.com/1.0 (+https://glo-temp.com)" },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[gdelt-fashion] ${city}: HTTP ${response.status} — ${body.slice(0, 300)}`);
      return null;
    }

    const data = await response.json();
    if (!data.articles || data.articles.length === 0) {
      console.warn(`[gdelt-fashion] ${city}: no articles for "${query}"`);
      return null;
    }

    const brandCount = Math.min(110, data.articles.length * 2);
    const eventCount = Math.floor(data.articles.length / 5);
    const influenceScore = 5 + (data.articles.length / 50) * 4;

    return {
      designer_brands: Math.min(110, brandCount),
      fashion_events: Math.min(9, Math.max(1, eventCount)),
      style_influence: Math.min(9, influenceScore),
      confidence: Math.min(0.8, data.articles.length / 50),
    };
  } catch (error) {
    console.error(`[gdelt-fashion] ${city}: exception — ${error.message}`);
    return null;
  }
}

async function insertReading(
  citySlug: string,
  metric: string,
  value: number,
  label: string,
  confidence: number
): Promise<boolean> {
  const { error } = await supabase.from("readings").insert({
    city_slug: citySlug,
    vertical: "fashion",
    metric,
    value,
    label,
    source: "gdelt_fashion",
    source_url: "https://www.gdeltproject.org",
    confidence,
    fetched_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`[gdelt-fashion] insert failed for ${citySlug}/${metric}: ${error.message}`);
    return false;
  }
  return true;
}

Deno.serve(async (_req: Request) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[gdelt-fashion] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
    return new Response(
      JSON.stringify({ success: false, error: "Missing Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }

  try {
    let rowsWritten = 0;
    let citiesProcessed = 0;

    for (const [city, keywords] of Object.entries(cityKeywords)) {
      const result = await fetchFashionSentiment(city, keywords);
      if (!result) continue;

      const results = await Promise.all([
        insertReading(city, "designer_brands", result.designer_brands, "Major fashion brands present", result.confidence),
        insertReading(city, "fashion_events", result.fashion_events, "Major fashion events annually", result.confidence),
        insertReading(city, "style_influence", result.style_influence, "Fashion influence & trendiness", result.confidence),
      ]);
      const successes = results.filter(Boolean).length;
      rowsWritten += successes;
      if (successes > 0) citiesProcessed++;
    }

    console.log(`[gdelt-fashion] wrote ${rowsWritten} row(s) across ${citiesProcessed} of ${Object.keys(cityKeywords).length} cities`);

    if (rowsWritten === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No rows written — all fetches or inserts failed", cities: 0 }),
        { headers: { "Content-Type": "application/json" }, status: 502 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, rows: rowsWritten, cities: citiesProcessed }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[gdelt-fashion] fatal error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
