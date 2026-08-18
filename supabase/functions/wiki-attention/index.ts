// The attention layer. Server side, on a schedule, never from a browser.
//
// TWO JOBS, ONE FUNCTION, SELECTED BY ?job=
//   pageviews   Wikipedia Pageviews API -- how much the world is looking
//   revisions   MediaWiki revisions API, polled -- something happening now
//
// Both free, keyless Wikimedia sources. No EventStreams: that is a
// persistent server-sent-events connection and would hang an edge
// function exactly like the ICY radio streams did before music-sync
// read a bounded number of bytes and cancelled. Polling instead.
//
// Wikimedia REQUIRES a descriptive User-Agent identifying the site and a
// contact point on every REST/API request. Missing it gets requests
// blocked outright, not just rate-limited.
//
// city_points had no stored Wikipedia article title before this -- the
// existing client-side integration (city-wiki.js) has always guessed it
// per page load (cityName, then "cityName, country") and never
// persisted the result anywhere. jobPageviews resolves and caches it in
// city_points.wikipedia_title on first run per city; every run after
// that, and jobRevisions always, reads the cached title rather than
// re-deriving it.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const UA = "glo-temp.com/1.0 (+https://glo-temp.com; info@glo-temp.com)";
const TIMEOUT_MS = 5000;
const REQUEST_GAP_MS = 150;

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

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

// ---------- title resolution (cached in city_points.wikipedia_title) ----------
async function fetchCanonicalTitle(query: string): Promise<string | null> {
  const { signal, done } = withTimeout(TIMEOUT_MS);
  try {
    const resp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { headers: { "User-Agent": UA, Accept: "application/json" }, signal },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data || data.type === "disambiguation") return null;
    // titles.canonical is the real underscore-form article title Wikipedia
    // resolved this query to (redirects included) -- the thing every
    // other Wikimedia API in this function needs, not the display title.
    return data.titles?.canonical || data.title || null;
  } catch {
    return null;
  } finally {
    done();
  }
}

async function resolveTitle(citySlug: string, name: string, country: string | null): Promise<string | null> {
  let title = await fetchCanonicalTitle(name);
  if (!title && country) title = await fetchCanonicalTitle(`${name}, ${country}`);
  if (title) {
    await rest(`city_points?city_slug=eq.${encodeURIComponent(citySlug)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ wikipedia_title: title }),
    }).catch((e) => console.error(`[wiki-attention] title cache write failed for ${citySlug}`, String(e)));
  }
  return title;
}

interface CityRow { city_slug: string; name: string; country: string | null; wikipedia_title: string | null; }

async function loadCities(limit: number): Promise<CityRow[]> {
  const resp = await rest(
    `city_points?select=city_slug,name,country,wikipedia_title&order=city_slug.asc&limit=${limit}`,
  );
  return await resp.json();
}

// ---------- job: pageviews ----------
const BACKFILL_DAYS = 90;
// Pageview data typically publishes with a 1-2 day lag; re-checking the
// last few days on every run (not just brand-new dates) catches a day
// that was incomplete on first fetch and has since settled.
const RECHECK_DAYS = 4;

async function fetchPageviews(article: string, start: string, end: string): Promise<{ date: string; views: number }[] | null> {
  const { signal, done } = withTimeout(TIMEOUT_MS);
  try {
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(article)}/daily/${start}/${end}`;
    const resp = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal });
    if (resp.status === 404) return []; // no data for this article/range yet -- not an error
    if (!resp.ok) {
      console.error(`[wiki-attention] pageviews ${article}: HTTP ${resp.status} ${(await resp.text().catch(() => "")).slice(0, 300)}`);
      return null;
    }
    const data = await resp.json();
    const items = Array.isArray(data.items) ? data.items : [];
    return items.map((it: { timestamp: string; views: number }) => ({
      date: `${it.timestamp.slice(0, 4)}-${it.timestamp.slice(4, 6)}-${it.timestamp.slice(6, 8)}`,
      views: it.views,
    }));
  } catch (e) {
    console.error(`[wiki-attention] pageviews ${article}: exception`, String(e));
    return null;
  } finally {
    done();
  }
}

async function jobPageviews(limitCities: number) {
  const cities = await loadCities(limitCities);
  const today = new Date();
  const cityErrors: { city_slug: string; stage: string; detail: string }[] = [];
  let citiesWritten = 0, rowsWritten = 0;

  for (const c of cities) {
    try {
      let title = c.wikipedia_title;
      if (!title) {
        title = await resolveTitle(c.city_slug, c.name, c.country);
        if (!title) {
          console.log(`[wiki-attention] pageviews ${c.city_slug}: no Wikipedia article resolved`);
          cityErrors.push({ city_slug: c.city_slug, stage: "title_resolve", detail: "no article found" });
          continue;
        }
      }

      // First run for this city (no existing rows) backfills 90 days;
      // every run after that only re-checks the last few days.
      const existing = await rest(
        `city_pageviews?city_slug=eq.${encodeURIComponent(c.city_slug)}&select=date&limit=1`,
      ).then((r) => r.json());
      const spanDays = existing.length ? RECHECK_DAYS : BACKFILL_DAYS;

      const end = new Date(today);
      end.setUTCDate(end.getUTCDate() - 1); // yesterday -- today's count is still incomplete
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - (spanDays - 1));

      const rows = await fetchPageviews(title, yyyymmdd(start), yyyymmdd(end));
      if (rows === null) {
        cityErrors.push({ city_slug: c.city_slug, stage: "fetch", detail: "pageviews API call failed" });
        continue;
      }
      if (rows.length === 0) continue; // genuinely no data yet, not an error

      const payload = rows.map((r) => ({ city_slug: c.city_slug, date: r.date, views: r.views }));
      try {
        await rest("city_pageviews?on_conflict=city_slug,date", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(payload),
        });
        rowsWritten += payload.length;
        citiesWritten++;
      } catch (e) {
        console.error(`[wiki-attention] pageviews ${c.city_slug}: insert failed`, String(e));
        cityErrors.push({ city_slug: c.city_slug, stage: "insert", detail: String(e) });
      }
    } catch (e) {
      console.error(`[wiki-attention] pageviews ${c.city_slug}: exception`, String(e));
      cityErrors.push({ city_slug: c.city_slug, stage: "exception", detail: String(e) });
    } finally {
      await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
    }
  }

  return { cities: cities.length, citiesWritten, rowsWritten, errors: cityErrors };
}

// ---------- job: revisions ----------
// Multiplier and floor both have to hold for a flag: 3x a near-zero
// baseline is noise, and a city with a genuinely high baseline needs a
// proportionally bigger jump, not just "more than usual by one edit".
const SPIKE_MULTIPLIER = 3;
const SPIKE_MIN_ABS = 3;
// How many of a city's own past checks feed its baseline. Deliberately
// excludes the current reading -- a spike can't be measured against
// itself.
const BASELINE_WINDOW = 24;

async function fetchRecentRevisionCount(title: string): Promise<number | null> {
  const { signal, done } = withTimeout(TIMEOUT_MS);
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600_000);
    const url = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({
      action: "query", format: "json", prop: "revisions", titles: title,
      rvlimit: "500", rvprop: "timestamp", rvdir: "older",
      rvstart: now.toISOString(), rvend: oneHourAgo.toISOString(),
      formatversion: "2",
    });
    const resp = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal });
    if (!resp.ok) {
      console.error(`[wiki-attention] revisions ${title}: HTTP ${resp.status} ${(await resp.text().catch(() => "")).slice(0, 300)}`);
      return null;
    }
    const data = await resp.json();
    const page = data?.query?.pages?.[0];
    if (!page || page.missing) return 0;
    return Array.isArray(page.revisions) ? page.revisions.length : 0;
  } catch (e) {
    console.error(`[wiki-attention] revisions ${title}: exception`, String(e));
    return null;
  } finally {
    done();
  }
}

async function jobRevisions(limitCities: number) {
  const cities = await loadCities(limitCities);
  const cityErrors: { city_slug: string; stage: string; detail: string }[] = [];
  let checked = 0, spikes = 0;

  for (const c of cities) {
    try {
      let title = c.wikipedia_title;
      if (!title) {
        title = await resolveTitle(c.city_slug, c.name, c.country);
        if (!title) {
          cityErrors.push({ city_slug: c.city_slug, stage: "title_resolve", detail: "no article found" });
          continue;
        }
      }

      const count = await fetchRecentRevisionCount(title);
      if (count === null) {
        cityErrors.push({ city_slug: c.city_slug, stage: "fetch", detail: "revisions API call failed" });
        continue;
      }

      const history = await rest(
        `city_edit_activity?city_slug=eq.${encodeURIComponent(c.city_slug)}` +
        `&select=revisions_1h&order=checked_at.desc&limit=${BASELINE_WINDOW}`,
      ).then((r) => r.json()) as { revisions_1h: number }[];

      const baseline = history.length
        ? history.reduce((sum, h) => sum + h.revisions_1h, 0) / history.length
        : count; // first-ever check: nothing to compare against, so not a spike

      const isSpike = history.length > 0 && count >= SPIKE_MIN_ABS && count >= baseline * SPIKE_MULTIPLIER;
      if (isSpike) spikes++;

      await rest("city_edit_activity", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          city_slug: c.city_slug, revisions_1h: count,
          baseline_avg: Number(baseline.toFixed(2)), is_spike: isSpike,
        }),
      });
      checked++;
    } catch (e) {
      console.error(`[wiki-attention] revisions ${c.city_slug}: exception`, String(e));
      cityErrors.push({ city_slug: c.city_slug, stage: "exception", detail: String(e) });
    } finally {
      await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
    }
  }

  return { cities: cities.length, checked, spikes, errors: cityErrors };
}

const FULL_COVERAGE_LIMIT = 500;
const DEFAULT_LIMIT: Record<string, number> = {
  pageviews: FULL_COVERAGE_LIMIT,
  revisions: FULL_COVERAGE_LIMIT,
};

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const job = url.searchParams.get("job") ?? "";
  const rawLimit = url.searchParams.get("limit");
  const fallback = DEFAULT_LIMIT[job] ?? 25;
  const limit = Math.min(Math.max(Number(rawLimit ?? fallback) || fallback, 1), FULL_COVERAGE_LIMIT);

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[wiki-attention] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "not_configured" }, 500);
  }

  try {
    let result: Record<string, unknown>;
    switch (job) {
      case "pageviews": result = await jobPageviews(limit); break;
      case "revisions": result = await jobRevisions(limit); break;
      default:
        return json({ error: "unknown_job", jobs: ["pageviews", "revisions"] }, 400);
    }
    console.log(`[wiki-attention] ${job}`, JSON.stringify(result));

    // A run is a real failure when it processed cities but succeeded on
    // none of them -- not when it succeeded and simply found nothing new
    // (a quiet city genuinely has zero revisions this hour; that is real
    // data, not a failure).
    const cities = Number(result.cities ?? 0);
    const succeededField = job === "pageviews" ? "citiesWritten" : "checked";
    const succeeded = Number(result[succeededField] ?? 0);
    if (cities > 0 && succeeded === 0) {
      console.error(`[wiki-attention] ${job}: processed ${cities} cities, succeeded on 0`, JSON.stringify(result));
      return json({ job, ...result, all_failed: true }, 500);
    }

    return json({ job, ...result });
  } catch (e) {
    console.error(`[wiki-attention] ${job} failed`, String(e));
    return json({ job, error: String(e) }, 502);
  }
});
