// Real per-university records for the campus layer. Server side, on a
// schedule, never from a browser.
//
// See 20260824090000_city_universities.sql for why this exists instead
// of hipolabs-education: that collector never stored a real
// per-university name or coordinate, and its API is currently fully
// unreachable regardless.
//
// SOURCE: Wikidata's free, keyless SPARQL endpoint. A geo-radius query
// against each city's own real city_points.lat/lon finds real entities
// that are instances of university (Q3918, subclasses included) with a
// real P625 coordinate. Every row this writes has both a real name and
// a real coordinate by construction -- there is nothing to fabricate,
// and a city with nothing real found gets no rows at all, not a
// placeholder.
//
// COVERAGE, ONE RUN AT A TIME. Wikidata's query service is free but not
// meant for hammering: each SPARQL geo query is heavier than a plain
// REST call, and a run across all 300 cities in one invocation risks
// the function's own timeout. Same shape as wiki-attention's backfill:
// a city already recorded in city_university_checks is skipped
// (re-checked on a future run only if explicitly forced), so repeated
// daily runs make forward progress across the full city list rather
// than re-querying the same cities every time. A city is marked
// checked whether or not it found anything real nearby -- a genuine
// zero result (a small town with no university within RADIUS_KM) is a
// real finding, not a reason to re-query it forever.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const UA = "glo-temp.com/1.0 (+https://glo-temp.com; info@glo-temp.com)";
const TIMEOUT_MS = 15000;
const REQUEST_GAP_MS = 250;
const RADIUS_KM = 15;
const FULL_COVERAGE_LIMIT = 300;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function rest(path: string, init: RequestInit = {}) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!resp.ok) throw new Error(`rest ${path} ${resp.status} ${await resp.text()}`);
  return resp;
}

function withTimeout(ms: number) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return { signal: ctl.signal, done: () => clearTimeout(t) };
}

interface CityRow { city_slug: string; lat: number; lon: number }

async function loadCities(limit: number, slugs?: string[]): Promise<CityRow[]> {
  const filter = slugs && slugs.length
    ? `&city_slug=in.(${slugs.map(encodeURIComponent).join(",")})`
    : "";
  const resp = await rest(
    `city_points?select=city_slug,lat,lon&order=city_slug.asc&limit=${limit}${filter}`,
  );
  return await resp.json();
}

async function loadAlreadyCovered(): Promise<Set<string>> {
  // city_university_checks marks a city done the moment it's actually
  // queried, whether or not anything real was found nearby -- a real
  // zero result is a legitimate finding, not something to re-check on
  // every run. See 20260824093000_city_university_checks.sql.
  const resp = await rest(`city_university_checks?select=city_slug`);
  const rows = (await resp.json()) as { city_slug: string }[];
  return new Set(rows.map((r) => r.city_slug));
}

async function markChecked(citySlug: string, foundCount: number) {
  await rest("city_university_checks?on_conflict=city_slug", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ city_slug: citySlug, checked_at: new Date().toISOString(), found_count: foundCount }]),
  });
}

interface University { wikidata_id: string; name: string; lat: number; lon: number; website: string | null }

// Instance-of university (Q3918), subclasses included (public/private
// universities etc. all subclass it), with a real coordinate, within
// RADIUS_KM of the city's own real point. LIMIT keeps one city's
// response bounded -- a metro area's full university list, not every
// higher-ed entity Wikidata has ever heard of nearby.
function buildQuery(lat: number, lon: number): string {
  return `SELECT ?university ?universityLabel ?coord ?website WHERE {
  SERVICE wikibase:around {
    ?university wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "${RADIUS_KM}" .
  }
  ?university wdt:P31/wdt:P279* wd:Q3918 .
  OPTIONAL { ?university wdt:P856 ?website . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 25`;
}

function parseCoord(wkt: string): { lat: number; lon: number } | null {
  const m = /Point\(([-\d.]+)\s+([-\d.]+)\)/.exec(wkt || "");
  if (!m) return null;
  return { lon: Number(m[1]), lat: Number(m[2]) };
}

async function fetchUniversities(lat: number, lon: number): Promise<University[] | null> {
  const { signal, done } = withTimeout(TIMEOUT_MS);
  try {
    const url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(buildQuery(lat, lon));
    const resp = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
      signal,
    });
    if (!resp.ok) {
      console.error(`[wikidata-universities] HTTP ${resp.status} ${(await resp.text().catch(() => "")).slice(0, 300)}`);
      return null;
    }
    const data = await resp.json();
    const bindings = data?.results?.bindings ?? [];
    const out: University[] = [];
    for (const b of bindings) {
      const uri = b.university?.value as string | undefined;
      const idMatch = uri ? /\/entity\/(Q\d+)$/.exec(uri) : null;
      const coord = b.coord?.value ? parseCoord(b.coord.value) : null;
      const name = b.universityLabel?.value as string | undefined;
      if (!idMatch || !coord || !name) continue;
      out.push({
        wikidata_id: idMatch[1],
        name,
        lat: coord.lat,
        lon: coord.lon,
        website: (b.website?.value as string | undefined) || null,
      });
    }
    // Dedupe by wikidata_id -- the OPTIONAL website triple can multiply
    // a row when a university has more than one P856 value.
    const seen = new Map<string, University>();
    for (const u of out) if (!seen.has(u.wikidata_id)) seen.set(u.wikidata_id, u);
    return [...seen.values()];
  } catch (e) {
    console.error(`[wikidata-universities] exception`, String(e));
    return null;
  } finally {
    done();
  }
}

async function jobFetch(limitCities: number, slugs?: string[], force?: boolean) {
  const cities = await loadCities(limitCities, slugs);
  const covered = force ? new Set<string>() : await loadAlreadyCovered();
  const cityErrors: { city_slug: string; stage: string; detail: string }[] = [];
  let citiesChecked = 0, citiesWithResults = 0, rowsWritten = 0;

  for (const c of cities) {
    if (covered.has(c.city_slug)) continue;
    if (c.lat == null || c.lon == null) continue;
    citiesChecked++;

    try {
      const unis = await fetchUniversities(c.lat, c.lon);
      if (unis === null) {
        cityErrors.push({ city_slug: c.city_slug, stage: "fetch", detail: "SPARQL query failed" });
        continue; // left unchecked -- worth retrying on a future run
      }
      if (unis.length === 0) {
        await markChecked(c.city_slug, 0); // genuinely nothing real found nearby -- not an error
        continue;
      }

      const payload = unis.map((u) => ({
        city_slug: c.city_slug,
        wikidata_id: u.wikidata_id,
        name: u.name,
        lat: u.lat,
        lon: u.lon,
        website: u.website,
      }));
      await rest("city_universities?on_conflict=wikidata_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(payload),
      });
      await markChecked(c.city_slug, payload.length);
      rowsWritten += payload.length;
      citiesWithResults++;
    } catch (e) {
      console.error(`[wikidata-universities] ${c.city_slug}: exception`, String(e));
      cityErrors.push({ city_slug: c.city_slug, stage: "exception", detail: String(e) });
    } finally {
      await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
    }
  }

  return { cities: cities.length, citiesChecked, citiesWithResults, rowsWritten, errors: cityErrors };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const rawLimit = url.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(rawLimit ?? FULL_COVERAGE_LIMIT) || FULL_COVERAGE_LIMIT, 1), FULL_COVERAGE_LIMIT);
  const rawSlugs = url.searchParams.get("slugs");
  const slugs = rawSlugs ? rawSlugs.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const force = url.searchParams.get("force") === "true";

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[wikidata-universities] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "not_configured" }, 500);
  }

  try {
    const result = await jobFetch(limit, slugs, force);
    console.log(`[wikidata-universities]`, JSON.stringify(result));

    // A real failure is "checked cities but every fetch errored", not
    // "checked cities and genuinely found nothing nearby for any of
    // them" -- the latter is real data (a quiet area), not a failure.
    if (result.citiesChecked > 0 && result.errors.length === result.citiesChecked) {
      return json({ ...result, all_failed: true }, 500);
    }

    return json(result);
  } catch (e) {
    console.error(`[wikidata-universities] failed`, String(e));
    return json({ error: String(e) }, 502);
  }
});
