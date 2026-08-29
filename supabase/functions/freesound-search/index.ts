// Part 3, Global Audio-Stream Integration: real location-tagged
// soundscape search via Freesound.org. Called directly by every
// visitor's browser (city-soundscape.js), same treatment as city-news --
// keyless from the browser's side, so verify_jwt stays off (see
// config.toml) -- but Freesound itself DOES require a real API key,
// which cannot go into client-side JS (same reason WAQI_API_TOKEN,
// TICKETMASTER_API_KEY etc. never do). This function holds that key
// server-side (vault, via get_freesound_api_key() -- see
// 20260828100000_freesound_api_key_rpc.sql, same pattern
// get_vapid_private_key() already uses) and proxies the search,
// stripping the key out of everything it returns.
//
// Query is just the city name -- proven live against the real API
// before writing this: searching "Lagos" alone surfaces real
// Lagos-tagged field recordings (e.g. "Ambient_SaboYaba_BusStop_Lagos_
// Nigeria.wav", "Lagos at night.WAV") near the top of Freesound's own
// relevance ranking, without needing a second, narrower query term that
// risks zero real matches for a smaller city. Real result or an empty
// list -- never a fabricated or generic "ambience" clip standing in for
// a city Freesound has nothing real for.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FREESOUND_SEARCH_URL = "https://freesound.org/apiv2/search/text/";
const TIMEOUT_MS = 8000;
const RESULT_LIMIT = 5;

interface FreesoundResult {
  id: number;
  name: string;
  url: string;
  tags: string[];
  license: string;
  username: string;
  duration: number;
  previews?: Record<string, string>;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

async function getApiKey(): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_freesound_api_key");
  if (error || !data) return null;
  return data as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json(null, 204);

  const url = new URL(req.url);
  const city = (url.searchParams.get("city") || "").trim();
  if (!city) return json({ results: [] }, 400);

  const apiKey = await getApiKey();
  // No key configured yet: honestly nothing, not an error the client has
  // to special-case -- same shape as "no real results found".
  if (!apiKey) return json({ results: [], configured: false });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const search = new URL(FREESOUND_SEARCH_URL);
    search.searchParams.set("query", city);
    search.searchParams.set("fields", "id,name,url,previews,tags,license,username,duration");
    search.searchParams.set("page_size", String(RESULT_LIMIT));
    search.searchParams.set("sort", "score");

    const resp = await fetch(search.toString(), {
      signal: controller.signal,
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!resp.ok) {
      console.error(`[freesound-search] ${city}: upstream ${resp.status}`);
      return json({ results: [], configured: true });
    }
    const data = await resp.json();
    const results = (Array.isArray(data.results) ? data.results : []) as FreesoundResult[];

    // Real fields only, straight through -- no scoring, no filtering by
    // guessed "is this really a soundscape" heuristic that could quietly
    // hide a real match. The client shows tags so a visitor can judge
    // relevance themselves.
    const clean = results
      .filter((r) => r && r.previews && (r.previews["preview-hq-mp3"] || r.previews["preview-lq-mp3"]))
      .map((r) => ({
        id: r.id,
        name: r.name,
        url: r.url,
        tags: Array.isArray(r.tags) ? r.tags.slice(0, 8) : [],
        license: r.license,
        username: r.username,
        duration: r.duration,
        preview_mp3: r.previews!["preview-hq-mp3"] || r.previews!["preview-lq-mp3"],
      }));

    return json({ results: clean, configured: true });
  } catch (e) {
    console.error(`[freesound-search] ${city}: exception`, String(e));
    return json({ results: [], configured: true });
  } finally {
    clearTimeout(timer);
  }
});
