// Callable by Make: figures out whether a post is due right now, and
// if so, hands back everything Make needs in one call -- caption,
// image URL, the row id to mark posted afterwards, and which of the
// two platforms this row still needs (so a retry after a partial
// failure only re-attempts the one that actually failed).
//
// WHY "DUE" IS COMPUTED HERE, NOT IN MAKE'S SCHEDULER
// Make's scenario scheduling only supports one fixed time (or a
// repeating interval) per scenario -- there is no "3 times a day at
// 09:00/14:00/19:00" schedule type. So the scenario instead polls this
// function every DUE_POLL_ASSUMED_MINUTES (see the Make blueprint --
// currently every 15 min), and THIS function is the source of truth
// for "is anything actually due right now, and for which platform(s)".
//
// CAMPAIGN_START_DATE (env var, required)
// social_content_queue rows are keyed by day_number (1-30), not a
// calendar date -- the calendar itself doesn't fix one. This function
// needs one real date to anchor day_number=1 to. Set the
// CAMPAIGN_START_DATE env var (YYYY-MM-DD) once, when the campaign
// actually goes live. Unset or unparsable -> this function refuses to
// guess and returns a real 500, not a wrong post.
//
// TIMEZONE: Europe/London, DST-aware
// scheduled_time (09:00/14:00/19:00) is interpreted in Europe/London
// wall-clock time, computed via Intl's IANA tz database rather than a
// fixed UTC offset -- a fixed offset would be right for half the year
// and an hour wrong across the BST/GMT switch.
//
// DISCLOSED LIMITATION: same-day retry window only. A row stays due
// for the rest of ITS OWN day_number once its scheduled_time arrives
// (not just a short window), so a partial failure (e.g. Instagram
// posted, Facebook didn't) keeps getting retried on every poll for
// the remainder of that day. If it's still not fully posted once
// day_number advances past it, this function stops surfacing it --
// campaign day N+1's query only looks at day_number = N+1. Recovering
// a multi-day-stale row would need a human to look at the table
// directly; this was judged out of scope for the specific "don't
// double-post the platform that already succeeded" fix requested.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CAMPAIGN_START_DATE = Deno.env.get("CAMPAIGN_START_DATE") ?? "";
const IMAGE_FETCH_URL = Deno.env.get("SOCIAL_IMAGE_FETCH_URL")
  ?? `${SUPABASE_URL}/functions/v1/social-image-fetch`;

const TIMEZONE = "Europe/London";
const TIMEOUT_MS = 5000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function withTimeout(ms: number) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return { signal: ctl.signal, done: () => clearTimeout(t) };
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

interface QueueRow {
  id: string;
  scheduled_time: string; // "HH:MM:SS"
  caption: string;
  image_search_term: string | null;
  posted_instagram_at: string | null;
  posted_facebook_at: string | null;
}

// Europe/London's current wall-clock date (YYYY-MM-DD) and
// minutes-since-midnight, via the IANA tz database rather than a
// fixed offset -- correct across the BST/GMT switch without tracking
// DST transition dates by hand.
function londonNow(): { dateStr: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { dateStr, minutes };
}

function minutesFromTimeString(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

async function fetchImage(term: string): Promise<{ image_url: string | null; error?: string }> {
  const { signal, done } = withTimeout(TIMEOUT_MS);
  try {
    const resp = await fetch(`${IMAGE_FETCH_URL}?term=${encodeURIComponent(term)}`, { signal });
    if (!resp.ok) return { image_url: null, error: `image_fetch_http_${resp.status}` };
    const data = await resp.json();
    return { image_url: data.image_url ?? null, error: data.image_url ? undefined : (data.reason || "no_image_found") };
  } catch {
    return { image_url: null, error: "image_fetch_exception" };
  } finally {
    done();
  }
}

Deno.serve(async (req: Request) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[social-next-post] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "not_configured" }, 500);
  }
  if (!CAMPAIGN_START_DATE || Number.isNaN(Date.parse(`${CAMPAIGN_START_DATE}T00:00:00Z`))) {
    console.error(`[social-next-post] CAMPAIGN_START_DATE unset or unparsable: "${CAMPAIGN_START_DATE}"`);
    return json({ error: "campaign_start_date_not_configured" }, 500);
  }

  try {
    const { dateStr, minutes: nowMin } = londonNow();
    const startMs = Date.parse(`${CAMPAIGN_START_DATE}T00:00:00Z`);
    const todayMs = Date.parse(`${dateStr}T00:00:00Z`);
    const dayNumber = Math.floor((todayMs - startMs) / 86_400_000) + 1;

    if (dayNumber < 1 || dayNumber > 30) {
      return json({ due: false, reason: "outside_campaign_window", day_number: dayNumber });
    }

    const rows: QueueRow[] = await rest(
      `social_content_queue?select=id,scheduled_time,caption,image_search_term,posted_instagram_at,posted_facebook_at` +
      `&day_number=eq.${dayNumber}&or=(posted_instagram_at.is.null,posted_facebook_at.is.null)&order=scheduled_time.asc`,
    ).then((r) => r.json());

    // Due once its slot's time has arrived (Europe/London), for the
    // rest of that campaign day -- see the disclosed limitation above
    // for why this doesn't extend past day_number's own day.
    const due = rows.find((r) => nowMin >= minutesFromTimeString(r.scheduled_time));

    if (!due) {
      return json({ due: false, day_number: dayNumber, unposted_today: rows.length });
    }

    const needs_instagram = !due.posted_instagram_at;
    const needs_facebook = !due.posted_facebook_at;

    if (!due.image_search_term) {
      return json({
        due: true, row_id: due.id, caption: due.caption, image_url: null,
        image_error: "no_search_term", needs_instagram, needs_facebook,
      });
    }

    const { image_url, error: imageError } = await fetchImage(due.image_search_term);
    return json({
      due: true,
      row_id: due.id,
      caption: due.caption,
      image_url,
      needs_instagram,
      needs_facebook,
      ...(imageError ? { image_error: imageError } : {}),
    });
  } catch (e) {
    console.error("[social-next-post] failed", String(e));
    return json({ error: String(e) }, 502);
  }
});
