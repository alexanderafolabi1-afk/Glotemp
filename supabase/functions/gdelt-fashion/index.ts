import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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
    // Using GDELT 2.0 API for fashion mentions
    const baseUrl = "https://api.gdeltproject.org/api/v2/news/news";
    const query = keywords[0];
    const url = `${baseUrl}?query=${encodeURIComponent(query)}&mode=ListRec&maxrecords=50&sort=date&format=json`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.articles || data.articles.length === 0) return null;

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
    console.error(`Error fetching fashion data for ${city}:`, error);
    return null;
  }
}

async function insertReading(
  citySlug: string,
  metric: string,
  value: number,
  label: string,
  confidence: number
) {
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

  if (error) console.error("Insert error:", error);
}

Deno.serve(async (req: Request) => {
  try {
    let successCount = 0;

    for (const [city, keywords] of Object.entries(cityKeywords)) {
      const result = await fetchFashionSentiment(city, keywords);
      if (result) {
        await insertReading(city, "designer_brands", result.designer_brands, "Major fashion brands present", result.confidence);
        await insertReading(city, "fashion_events", result.fashion_events, "Major fashion events annually", result.confidence);
        await insertReading(city, "style_influence", result.style_influence, "Fashion influence & trendiness", result.confidence);
        successCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, cities: successCount }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
