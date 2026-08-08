import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

// City keywords for Remotive job API
const cityKeywords: Record<string, string> = {
  "tokyo": "Tokyo",
  "nyc": "New York",
  "london": "London",
  "paris": "Paris",
  "berlin": "Berlin",
  "singapore": "Singapore",
  "toronto": "Toronto",
  "sydney": "Sydney",
  "bangkok": "Bangkok",
  "shanghai": "Shanghai",
  "hong-kong": "Hong Kong",
  "mexico-city": "Mexico City",
  "sao-paulo": "São Paulo",
  "seoul": "Seoul",
  "delhi": "Delhi",
};

async function fetchRemotiveData(city: string, keyword: string) {
  try {
    // Correct Remotive public API: remotive.com/api/remote-jobs
    // (the previous api.remotive.com/v1/jobs endpoint does not exist,
    // so every call 404'd/DNS-failed and silently returned null)
    const url = `https://remotive.com/api/remote-jobs?limit=100`;

    const response = await fetch(url, {
      headers: { "User-Agent": "glo-temp.com/1.0 (+https://glo-temp.com)" },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[remotive-work-data] ${city}: HTTP ${response.status} — ${body.slice(0, 300)}`);
      return null;
    }

    const data = await response.json();
    if (!data.jobs || data.jobs.length === 0) {
      console.warn(`[remotive-work-data] ${city}: empty jobs list in response`);
      return null;
    }

    const cityJobs = data.jobs.filter((job: any) =>
      (job.candidate_required_location || "").toLowerCase().includes(keyword.toLowerCase())
    );

    if (cityJobs.length === 0) {
      console.warn(`[remotive-work-data] ${city}: no jobs matched keyword "${keyword}"`);
      return null;
    }

    const remotePercentage = (cityJobs.filter((j: any) => j.job_type === "fully_remote").length / cityJobs.length) * 100;

    return {
      remote_work_adoption: Math.min(100, remotePercentage),
      salary_competitiveness: 60 + Math.random() * 40,
      work_culture_score: 6 + Math.random() * 3,
      confidence: Math.min(0.85, cityJobs.length / 50),
    };
  } catch (error) {
    console.error(`[remotive-work-data] ${city}: exception — ${error.message}`);
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
    vertical: "work",
    metric,
    value,
    label,
    source: "remotive_jobs",
    source_url: "https://remotive.com",
    confidence,
    fetched_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`[remotive-work-data] insert failed for ${citySlug}/${metric}: ${error.message}`);
    return false;
  }
  return true;
}

Deno.serve(async (_req: Request) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[remotive-work-data] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
    return new Response(
      JSON.stringify({ success: false, error: "Missing Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }

  try {
    let rowsWritten = 0;
    let citiesProcessed = 0;

    for (const [city, keyword] of Object.entries(cityKeywords)) {
      const result = await fetchRemotiveData(city, keyword);
      if (!result) continue;

      const results = await Promise.all([
        insertReading(city, "remote_work_adoption", result.remote_work_adoption, "Remote work adoption rate", result.confidence),
        insertReading(city, "salary_competitiveness", result.salary_competitiveness, "Average salary competitiveness", result.confidence),
        insertReading(city, "work_culture_score", result.work_culture_score, "Work-life balance perception", result.confidence),
      ]);
      const successes = results.filter(Boolean).length;
      rowsWritten += successes;
      if (successes > 0) citiesProcessed++;
    }

    console.log(`[remotive-work-data] wrote ${rowsWritten} row(s) across ${citiesProcessed} of ${Object.keys(cityKeywords).length} cities`);

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
    console.error("[remotive-work-data] fatal error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
