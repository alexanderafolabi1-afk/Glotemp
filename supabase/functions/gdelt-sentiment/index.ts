import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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
    // Using GDELT 2.0 API (free tier, public data)
    // Query news mentions in last 24 hours
    const baseUrl = "https://api.gdeltproject.org/api/v2/news/news";
    const query = keywords[0]; // Use primary keyword
    const url = `${baseUrl}?query=${encodeURIComponent(query)}&mode=ListRec&maxrecords=50&sort=date&format=json`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.articles || data.articles.length === 0) return null;

    // Calculate average sentiment from articles (0-100 scale)
    let totalTone = 0;
    let count = 0;
    for (const article of data.articles) {
      if (article.tone !== undefined && article.tone !== null) {
        totalTone += parseFloat(article.tone);
        count++;
      }
    }

    if (count === 0) return null;
    const avgTone = totalTone / count; // Range: -100 to +100
    const normalizedScore = (avgTone + 100) / 20; // Convert to 0-10 scale

    return {
      value: normalizedScore,
      confidence: Math.min(0.9, count / 50), // Higher count = higher confidence
      signalVolume: count,
    };
  } catch (error) {
    console.error(`Error fetching GDELT sentiment for ${city}:`, error);
    return null;
  }
}

async function insertReading(
  citySlug: string,
  metric: string,
  value: number,
  label: string,
  confidence: number,
  signalVolume: number
) {
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

  if (error) console.error("Insert error:", error);
}

Deno.serve(async (req: Request) => {
  try {
    for (const [city, keywords] of Object.entries(cityKeywords)) {
      const result = await fetchGDELTSentiment(city, keywords);
      if (result) {
        await insertReading(
          city,
          "sentiment_score",
          result.value,
          "News Sentiment",
          result.confidence,
          result.signalVolume
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, cities: Object.keys(cityKeywords).length }),
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
