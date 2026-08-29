import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// FIXED: every branch (no API key, HTTP failure, exception, and even the
// real-success branch) wrote nightlife_score as Math.random() -- there is
// no free Ticketmaster field for it, so it was pure fabrication on every
// row. The no-key and failure branches also fabricated event_frequency
// and venue_count via Math.random() instead of writing nothing, and
// insertReading's own errors were only logged, never surfaced, so a
// silently-failing insert still counted as a "successful" city.
//
// Now: only event_frequency and venue_count are written, only when
// TICKETMASTER_API_KEY is set and the API call actually returns real
// events. Any failure (no key, bad HTTP, exception, or zero events)
// writes nothing for that city rather than a fabricated number.
//
// Not coordinate-expandable the way Overpass/Wikidata are: Ticketmaster's
// Discovery API is queried by countryCode, not a lat/lon radius, so this
// stays scoped to cities with a confirmed country mapping rather than a
// forced 300-city list.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const TICKETMASTER_API_KEY = Deno.env.get("TICKETMASTER_API_KEY");

const cityCodes: Record<string, string> = {
  "tokyo": "JPN", "nyc": "USA", "london": "GBR", "paris": "FRA", "berlin": "DEU",
  "dubai": "ARE", "singapore": "SGP", "hong-kong": "HKG", "toronto": "CAN", "sydney": "AUS",
  "bangkok": "THA", "shanghai": "CHN", "delhi": "IND", "mumbai": "IND", "sao-paulo": "BRA",
  "mexico-city": "MEX", "cairo": "EGY", "seoul": "KOR", "medellin": "COL", "buenos-aires": "ARG",
};

async function fetchTicketmasterData(city: string, countryCode: string) {
  if (!TICKETMASTER_API_KEY) {
    console.warn(`[ticketmaster-entertainment] ${city}: no TICKETMASTER_API_KEY set, skipping`);
    return null;
  }
  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?countryCode=${countryCode}&size=200&apikey=${TICKETMASTER_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[ticketmaster-entertainment] ${city}: HTTP ${response.status}, skipping`);
      return null;
    }
    const data = await response.json();
    const events = data._embedded?.events || [];
    if (events.length === 0) return null;

    return {
      event_frequency: Math.min(250, events.length * 2),
      venue_count: Math.min(330, events.length),
      confidence: Math.min(0.85, events.length / 200),
    };
  } catch (error) {
    console.error(`[ticketmaster-entertainment] ${city}: exception - ${(error as Error).message}, skipping`);
    return null;
  }
}

async function insertReading(citySlug: string, metric: string, value: number, label: string, confidence: number): Promise<boolean> {
  const { error } = await supabase.from("readings").insert({
    city_slug: citySlug, vertical: "entertainment", metric, value, label,
    source: "ticketmaster", source_url: "https://www.ticketmaster.com", confidence,
    fetched_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`[ticketmaster-entertainment] insert failed for ${citySlug}/${metric}: ${error.message}`);
    return false;
  }
  return true;
}

Deno.serve(async (req: Request) => {
  try {
    let rowsWritten = 0;
    let citiesProcessed = 0;

    for (const [city, countryCode] of Object.entries(cityCodes)) {
      const result = await fetchTicketmasterData(city, countryCode);
      if (!result) continue;

      const results = await Promise.all([
        insertReading(city, "event_frequency", result.event_frequency, "Cultural events monthly", result.confidence),
        insertReading(city, "venue_count", result.venue_count, "Theaters, museums, concert halls", result.confidence),
      ]);
      const successes = results.filter(Boolean).length;
      rowsWritten += successes;
      if (successes > 0) citiesProcessed++;
    }

    console.log(`[ticketmaster-entertainment] wrote ${rowsWritten} row(s) across ${citiesProcessed} of ${Object.keys(cityCodes).length} cities`);

    return new Response(
      JSON.stringify({ success: true, rows: rowsWritten, cities: citiesProcessed }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[ticketmaster-entertainment] fatal error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" }, status: 500,
    });
  }
});
