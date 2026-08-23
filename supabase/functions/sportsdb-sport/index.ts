import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// FIXED: active_participation was always Math.random(), with no real
// TheSportsDB field behind it -- pure fabrication on every row.
// sports_venues was a made-up constant ("+5 per resolved team"), not a
// measured venue count -- removed too, since a constant dressed up as a
// count is still not real data.
//
// Now: only major_events is written, derived from each resolved team's
// real recent-event count via TheSportsDB's free public test key. A city
// with zero resolvable teams writes nothing.
//
// Not coordinate-expandable: TheSportsDB has no lat/lon radius search,
// only team-name lookup, so this stays scoped to cities with a confirmed
// real team mapping rather than a forced 300-city list.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

// TheSportsDB's public free test key.
const SPORTSDB_KEY = "3";

const cityTeams: Record<string, string[]> = {
  "tokyo": ["Tokyo Verdy", "Tokyo Metropolitan Police"],
  "nyc": ["New York Yankees", "New York Knicks"],
  "london": ["Arsenal", "Chelsea"],
  "paris": ["Paris Saint-Germain"],
  "berlin": ["Hertha Berlin"],
  "singapore": ["Young Lions"],
  "toronto": ["Toronto FC"],
  "sydney": ["Sydney FC"],
  "bangkok": ["Bangkok United"],
  "shanghai": ["Shanghai Port"],
  "hong-kong": ["Hong Kong 1"],
  "delhi": ["Delhi Capitals"],
  "mumbai": ["Mumbai Indians"],
  "sao-paulo": ["São Paulo FC"],
  "mexico-city": ["Club América"],
  "cairo": ["Al Ahly"],
  "seoul": ["FC Seoul"],
  "medellin": ["Atletico Nacional"],
  "buenos-aires": ["Boca Juniors"],
};

async function resolveTeamId(teamName: string): Promise<string | null> {
  const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/searchteams.php?t=${encodeURIComponent(teamName)}`;
  const response = await fetch(url, { headers: { "User-Agent": "glo-temp.com/1.0 (+https://glo-temp.com)" } });
  if (!response.ok) return null;
  const data = await response.json();
  return data.teams?.[0]?.idTeam ?? null;
}

async function fetchSportData(city: string, teams: string[]) {
  try {
    let eventCount = 0;
    let teamsResolved = 0;

    for (const team of teams) {
      const teamId = await resolveTeamId(team);
      if (!teamId) {
        console.warn(`[sportsdb-sport] ${city}: could not resolve team ID for "${team}"`);
        continue;
      }
      const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/eventslast.php?id=${teamId}`;
      const response = await fetch(url, { headers: { "User-Agent": "glo-temp.com/1.0 (+https://glo-temp.com)" } });
      if (!response.ok) {
        console.warn(`[sportsdb-sport] ${city}/${team}: HTTP ${response.status} on eventslast`);
        continue;
      }
      const data = await response.json();
      if (data.results) eventCount += data.results.length;
      teamsResolved++;
    }

    if (teamsResolved === 0) {
      console.warn(`[sportsdb-sport] ${city}: no teams resolved`);
      return null;
    }

    return {
      major_events: Math.min(12, Math.max(1, Math.ceil(eventCount / 10))),
      confidence: eventCount > 0 ? 0.75 : 0.5,
    };
  } catch (error) {
    console.error(`[sportsdb-sport] ${city}: exception - ${(error as Error).message}`);
    return null;
  }
}

async function insertReading(citySlug: string, metric: string, value: number, label: string, confidence: number): Promise<boolean> {
  const { error } = await supabase.from("readings").insert({
    city_slug: citySlug, vertical: "sport", metric, value, label,
    source: "sportsdb", source_url: "https://www.thesportsdb.com", confidence,
    fetched_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`[sportsdb-sport] insert failed for ${citySlug}/${metric}: ${error.message}`);
    return false;
  }
  return true;
}

Deno.serve(async (_req: Request) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ success: false, error: "Missing Supabase credentials" }), {
      headers: { "Content-Type": "application/json" }, status: 500,
    });
  }

  try {
    let rowsWritten = 0;
    let citiesProcessed = 0;

    for (const [city, teams] of Object.entries(cityTeams)) {
      const result = await fetchSportData(city, teams);
      if (!result) continue;
      const ok = await insertReading(city, "major_events", result.major_events, "Major sporting events, recent", result.confidence);
      if (ok) { rowsWritten++; citiesProcessed++; }
    }

    console.log(`[sportsdb-sport] wrote ${rowsWritten} row(s) across ${citiesProcessed} of ${Object.keys(cityTeams).length} cities`);

    return new Response(
      JSON.stringify({ success: true, rows: rowsWritten, cities: citiesProcessed }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[sportsdb-sport] fatal error:", error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" }, status: 500,
    });
  }
});
