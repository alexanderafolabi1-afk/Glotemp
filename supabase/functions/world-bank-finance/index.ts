import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// City-to-Country ISO mappings for World Bank API
const cityCountries: Record<string, string> = {
  "tokyo": "JPN",
  "nyc": "USA",
  "london": "GBR",
  "paris": "FRA",
  "berlin": "DEU",
  "dubai": "ARE",
  "singapore": "SGP",
  "hong-kong": "HKG",
  "toronto": "CAN",
  "sydney": "AUS",
  "bangkok": "THA",
  "shanghai": "CHN",
  "delhi": "IND",
  "mumbai": "IND",
  "sao-paulo": "BRA",
  "mexico-city": "MEX",
  "cairo": "EGY",
  "seoul": "KOR",
  "medellin": "COL",
  "buenos-aires": "ARG",
};

async function fetchWorldBankData(country: string) {
  try {
    // World Bank Open Data API (free, no auth required)
    // Fetch inflation (FP.CPI.TOTL.ZG) and cost metrics
    const inflationUrl = `https://api.worldbank.org/v2/country/${country}/indicator/FP.CPI.TOTL.ZG?format=json&per_page=1`;

    const response = await fetch(inflationUrl);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data[1] || data[1].length === 0) return null;

    const latestData = data[1][0];
    const inflationRate = latestData.value ? Math.max(0, Math.min(10, parseFloat(latestData.value))) : null;

    if (!inflationRate) return null;

    // cost_of_living and currency_strength used to be Math.random() here
    // -- the World Bank indicator this function actually queries is CPI
    // inflation, which has no bearing on either. Only inflation_rate
    // (real) is written.
    return {
      inflation_rate: inflationRate,
      confidence: 0.85,
    };
  } catch (error) {
    console.error(`Error fetching World Bank data for ${country}:`, error);
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
    vertical: "finance",
    metric,
    value,
    label,
    source: "world_bank",
    source_url: "https://data.worldbank.org",
    confidence,
    fetched_at: new Date().toISOString(),
  });

  if (error) console.error("Insert error:", error);
}

Deno.serve(async (req: Request) => {
  try {
    let successCount = 0;

    for (const [city, country] of Object.entries(cityCountries)) {
      const result = await fetchWorldBankData(country);
      if (result) {
        await insertReading(city, "inflation_rate", result.inflation_rate, "Annual inflation %", result.confidence);
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
