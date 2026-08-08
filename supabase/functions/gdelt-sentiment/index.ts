import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

// City keywords for GDELT sentiment analysis
const cityKeywords: Record<string, string[]> = {
  "tokyo": ["Tokyo", "Japan tech", "Shibuya"],
  "new-york": ["New York", "NYC", "Manhattan"],
  "london": ["London", "UK tech", "Silicon Roundabout"],
  "berlin": ["Berlin", "Germany tech"],
  "singapore": ["Singapore", "fintech"],
  "toronto": ["Toronto", "Canada tech"],
  "sydney": ["Sydney", "Australia"],
  "paris": ["Paris", "France"],
  "dubai": ["Dubai", "UAE"],
  "mexico-city": ["Mexico City", "CDMX"],
  "sao-paulo": ["São Paulo", "Brazil"],
  "bangkok": ["Bangkok", "Thailand"],
  "hong-kong": ["Hong Kong"],
  "seoul": ["Seoul", "Korea"],
  "shanghai": ["Shanghai", "China"],
  "mumbai": ["Mumbai", "India"],
  "delhi": ["Delhi", "India"],
  "cairo": ["Cairo", "Egypt"],
  "medellin": ["Medellín", "Colombia"],
  "lagos": ["Lagos", "Nigeria"],
};

async function fetchGDELTSentiment(city: string, keywords: string[]) {
  try {
    // GDELT 2.0 DOC API - tonechart mode returns tone distribution bins,
    // which is the correct way to get sentiment (the old /v2/news/news
    // endpoint doesn't exist and article-level "tone" isn't part of ArtList).
    const baseUrl = "https://api.gdeltproject.org/api/v2/doc/doc";
    const query = keywords[0];
    const url = `${baseUrl}?query=${encodeURIComponent(query)}&mode=tonechart&format=json`;

    const response = await fetch(url, {
      headers: { "User-Agent": "glo-temp.com/1.0 (+https://glo-temp.com)" },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[gdelt-sentiment] ${city}: HTTP ${response.status} ${response.statusText} — ${body.slice(0, 300)}`);
      return null;
    }

    const data = await response.json();
    const bins: { bin: number; count: number }[] = data.tonechart || [];
    if (bins.length === 0) {
      console.warn(`[gdelt-sentiment] ${city}: no tonechart bins in response`);
      return null;
    }

    let weightedSum = 0;
    let totalCount = 0;
    for (const b of bins) {
      weightedSum += b.bin * b.count;
      totalCount += b.count;
    }

    if (totalCount === 0) {
      console.warn(`[gdelt-sentiment] ${city}: tonechart bins had zero total count`);
      return null;
    }

    const avgTone = weightedSum / totalCount; // typically -10..+10
    const normalizedScore = Math.max(0, Math.min(10, (avgTone + 10) / 2));

    return {
      value: normalizedScore,
      confidence: Math.min(0.9, totalCount / 200),
      signalVolume: totalCount,
    };
  } catch (error) {
    console.error(`[gdelt-sentiment] ${city}: exception — ${error.message}`);
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
    vertical: "pulse",
    metric,
    value,
    label,
    source: "gdelt_sentiment",
    source_url: "https://www.gdeltproject.org",
    confidence,
    fetched_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`[gdelt-sentiment] insert failed for ${citySlug}/${metric}: ${error.message}`);
    return false;
  }
  return true;
}

Deno.serve(async (_req: Request) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[gdelt-sentiment] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
    return new Response(
      JSON.stringify({ success: false, error: "Missing Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }

  try {
    let rowsWritten = 0;
    let citiesProcessed = 0;

    for (const [city, keywords] of Object.entries(cityKeywords)) {
      const result = await fetchGDELTSentiment(city, keywords);
      if (!result) continue;

      const ok = await insertReading(city, "sentiment_score", result.value, "News Sentiment", result.confidence);
      if (ok) {
        rowsWritten++;
        citiesProcessed++;
      }
    }

    console.log(`[gdelt-sentiment] wrote ${rowsWritten} row(s) across ${citiesProcessed} of ${Object.keys(cityKeywords).length} cities`);

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
    console.error("[gdelt-sentiment] fatal error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
