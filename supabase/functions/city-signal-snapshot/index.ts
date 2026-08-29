// Daily signal snapshot. Server side, on a schedule, never from a browser.
//
// Writes one row per city per day to city_signal_snapshots so a city page
// can eventually show a real "Why" line built from real stored deltas
// ("pulse moved from X to Y") instead of only ever describing the current
// instant. See 20260823140000_city_signal_snapshots.sql for the full
// reasoning on which signals this snapshots and why -- short version:
// `observations` (real user mood check-ins) is the genuinely live,
// currently-updating per-city human signal on this project today, not
// readings.vertical='pulse' (only a stale one-time seed exists there --
// gdelt-sentiment-hourly has been scheduled for weeks and has written
// zero real rows, a separate pre-existing bug, not fixed here).
//
// Only cities with at least one real signal (an observation, ever, or a
// non-seed reading in some vertical) get a row -- a city nobody has ever
// checked in on and that has no deeper collector data gets nothing
// written, honestly, rather than a row of zeroes standing in for "no
// data yet".
//
// FIRST RUN PER CITY backfills one row per real distinct calendar day
// found in that city's own observations history (same shape as
// wiki-attention's pageviews backfill) -- computed retroactively from
// real rows already in the database, not fabricated. Every value in a
// backfilled row is a real aggregate as of that day's end (cutoff-based:
// "every observation/reading with a timestamp before the next day
// started"), so a two-point delta is available immediately for any city
// whose real observations already span more than one calendar day,
// rather than waiting a week for enough daily cron runs to accumulate
// it.
//
// EVERY RUN AFTER THAT just writes/updates today's row.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const REQUEST_GAP_MS = 50;

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

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// End-of-day cutoff for a given date string: the instant the NEXT day
// starts. "created_at < cutoff" means "happened on or before this date".
function cutoffFor(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

interface Observation { city_slug: string; mood: string; intensity: number | null; created_at: string }
interface Reading { city_slug: string; vertical: string; metric: string; value: number | null; source: string; fetched_at: string }

// ---------- discover which cities have any real signal at all ----------
async function loadSignalCities(): Promise<string[]> {
  const [obsResp, readResp] = await Promise.all([
    rest(`observations?select=city_slug`),
    rest(`readings?select=city_slug&vertical=neq.pulse&source=neq.seed`),
  ]);
  const obs = (await obsResp.json()) as { city_slug: string }[];
  const reads = (await readResp.json()) as { city_slug: string }[];
  const slugs = new Set<string>();
  for (const r of obs) slugs.add(r.city_slug);
  for (const r of reads) slugs.add(r.city_slug);
  return [...slugs].sort();
}

// ---------- aggregate real values for one city as of one cutoff ----------
async function aggregateAsOf(citySlug: string, cutoff: string) {
  const obsResp = await rest(
    `observations?select=mood,intensity&city_slug=eq.${encodeURIComponent(citySlug)}` +
    `&created_at=lt.${encodeURIComponent(cutoff)}`,
  );
  const obs = (await obsResp.json()) as { mood: string; intensity: number | null }[];

  const observation_count = obs.length;
  const withIntensity = obs.filter((o) => typeof o.intensity === "number");
  const avg_intensity = withIntensity.length
    ? Number((withIntensity.reduce((s, o) => s + (o.intensity as number), 0) / withIntensity.length).toFixed(2))
    : null;
  const mood_counts: Record<string, number> = {};
  for (const o of obs) mood_counts[o.mood] = (mood_counts[o.mood] || 0) + 1;

  const readResp = await rest(
    `readings?select=vertical,metric,value,source,fetched_at&city_slug=eq.${encodeURIComponent(citySlug)}` +
    `&vertical=neq.pulse&source=neq.seed&fetched_at=lt.${encodeURIComponent(cutoff)}&order=fetched_at.desc&limit=200`,
  );
  const reads = (await readResp.json()) as Reading[];
  const deeper_signals: Record<string, { metric: string; value: number | null; source: string; fetched_at: string }> = {};
  for (const r of reads) {
    if (!deeper_signals[r.vertical]) {
      deeper_signals[r.vertical] = { metric: r.metric, value: r.value, source: r.source, fetched_at: r.fetched_at };
    }
  }

  return { observation_count, avg_intensity, mood_counts, deeper_signals };
}

async function jobSnapshot() {
  const cities = await loadSignalCities();
  const today = ymd(new Date());
  const cityErrors: { city_slug: string; stage: string; detail: string }[] = [];
  let citiesWritten = 0, rowsWritten = 0;

  for (const citySlug of cities) {
    try {
      const existing = await rest(
        `city_signal_snapshots?city_slug=eq.${encodeURIComponent(citySlug)}&select=snapshot_date&limit=1`,
      ).then((r) => r.json()) as { snapshot_date: string }[];

      let dates: string[];
      if (existing.length === 0) {
        // First run for this city: backfill one row per real distinct
        // calendar day its observations actually happened on, plus today.
        const obsResp = await rest(
          `observations?select=created_at&city_slug=eq.${encodeURIComponent(citySlug)}&order=created_at.asc`,
        );
        const obs = (await obsResp.json()) as { created_at: string }[];
        const dayset = new Set<string>(obs.map((o) => o.created_at.slice(0, 10)));
        dayset.add(today);
        dates = [...dayset].sort();
      } else {
        dates = [today];
      }

      const rows = [];
      for (const d of dates) {
        const agg = await aggregateAsOf(citySlug, cutoffFor(d));
        rows.push({
          city_slug: citySlug,
          snapshot_date: d,
          observation_count: agg.observation_count,
          avg_intensity: agg.avg_intensity,
          mood_counts: agg.mood_counts,
          deeper_signals: agg.deeper_signals,
        });
      }

      await rest("city_signal_snapshots?on_conflict=city_slug,snapshot_date", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows),
      });
      rowsWritten += rows.length;
      citiesWritten++;
    } catch (e) {
      console.error(`[city-signal-snapshot] ${citySlug}: exception`, String(e));
      cityErrors.push({ city_slug: citySlug, stage: "exception", detail: String(e) });
    } finally {
      await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
    }
  }

  return { cities: cities.length, citiesWritten, rowsWritten, errors: cityErrors };
}

Deno.serve(async (_req: Request) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[city-signal-snapshot] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "not_configured" }, 500);
  }

  try {
    const result = await jobSnapshot();
    console.log(`[city-signal-snapshot] snapshot`, JSON.stringify(result));

    if (result.cities > 0 && result.citiesWritten === 0) {
      console.error(`[city-signal-snapshot] processed ${result.cities} cities, succeeded on 0`, JSON.stringify(result));
      return json({ ...result, all_failed: true }, 500);
    }

    return json(result);
  } catch (e) {
    console.error(`[city-signal-snapshot] failed`, String(e));
    return json({ error: String(e) }, 502);
  }
});
