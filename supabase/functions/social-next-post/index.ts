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
// ATOMIC CLAIM (fixes a real, confirmed-live race condition)
// Two concurrent calls to this function -- the scheduled poller
// overlapping a manual/replay call, or two overlapping poller runs --
// could both SELECT the same row as due before either call's
// social-mark-posted write landed, so both would post to the same
// platform. The per-platform posted_instagram_at/posted_facebook_at
// gating stops a SINGLE execution from reposting to a platform it
// already succeeded on, but does nothing against two executions
// racing each other on a row neither has touched yet -- that needs an
// atomic claim, not just a re-check.
//
// The claim is a conditional UPDATE: SET claimed_at = now() WHERE
// id = <candidate> AND (claimed_at IS NULL OR claimed_at < <expiry
// cutoff>) AND (posted_instagram_at IS NULL OR posted_facebook_at IS
// NULL), via PostgREST with Prefer: return=representation. Postgres
// serializes concurrent UPDATEs against the same row: whichever
// request's UPDATE acquires the row lock first commits and the row's
// claimed_at is no longer null: the second request's WHERE clause is
// then re-evaluated against that committed state and matches zero
// rows, so PostgREST returns an empty array to it. Only one caller can
// ever receive that row as due from a single claim attempt -- this is
// not "should be fine", it is Postgres's own row-level locking making
// concurrent claims on the same row mutually exclusive by
// construction. A lost claim returns due:false with an explicit
// reason (claim_lost_to_concurrent_call) rather than silently trying
// another row, so a real race is visible in the response, not masked.
//
// The claim is released (claimed_at reset to null) by social-mark-posted
// the moment a platform is genuinely marked posted -- so a row still
// needing its other platform isn't blocked from being reclaimed until
// expiry. CLAIM_EXPIRY_MINUTES exists only for the crash case: an
// execution that claims a row and then dies before ever calling
// social-mark-posted (Make itself crashing, a network partition, etc).
// Without an expiry that row would be locked forever; with it, the row
// becomes claimable again once the claim is older than
// CLAIM_EXPIRY_MINUTES, comfortably inside the next poll cycle.
//
// CAMPAIGN_START_DATE (env var, with a real default below)
// social_content_queue rows are keyed by day_number (1-30), not a
// calendar date -- the calendar itself doesn't fix one. This function
// needs one real date to anchor day_number=1 to. DEFAULT_CAMPAIGN_START_DATE
// is that anchor (2026-08-19, the day the campaign actually went live)
// -- this environment has no way to set an actual Supabase Function
// secret (no CLI, no MCP secrets tool), so the anchor lives here as a
// source default instead. The CAMPAIGN_START_DATE env var, if ever
// set, still overrides it. An explicitly-set-but-unparsable env var is
// the one case this function still refuses to guess on, returning a
// real 500 rather than silently falling back.
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
const DEFAULT_CAMPAIGN_START_DATE = "2026-08-19";
const CAMPAIGN_START_DATE = Deno.env.get("CAMPAIGN_START_DATE") ?? DEFAULT_CAMPAIGN_START_DATE;
const IMAGE_FETCH_URL = Deno.env.get("SOCIAL_IMAGE_FETCH_URL")
  ?? `${SUPABASE_URL}/functions/v1/social-image-fetch`;
// The image_url handed to Make points HERE, not at Commons. A Commons
// thumbnail keeps its source photograph's aspect ratio -- a skyline
// arrives around 1600x450 -- and Instagram rejected every one of those
// with error 36003, unsupported aspect ratio, then deactivated the
// automation. social-card composes the photograph onto a 1080x1080
// canvas and refuses to serve anything that is not exactly that.
const CARD_URL = Deno.env.get("SOCIAL_CARD_URL")
  ?? `${SUPABASE_URL}/functions/v1/social-card`;

const TIMEZONE = "Europe/London";
const TIMEOUT_MS = 5000;
// Comfortably longer than this function's real worst-case runtime (one
// REST select, one REST claim, one image-fetch bounded by its own 5s
// timeout -- realistically under 10s total) and comfortably shorter
// than the 15-minute poll interval, so a genuinely crashed claim is
// always reclaimable by the very next scheduled poll, never stuck for
// a whole extra cycle.
const CLAIM_EXPIRY_MINUTES = 10;

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
  claimed_at: string | null;
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

// Returns the CARD url, which is what Make posts. social-image-fetch is
// still called first, purely to find out whether a qualifying, licensed
// photograph exists for this term -- so `photo_found: false` still
// surfaces in the response the way it always did, instead of being
// hidden behind a card URL that would render plain brand ground with no
// explanation. Either way the URL returned is a 1080x1080 card.
async function fetchImage(
  term: string,
): Promise<{ image_url: string | null; photo_found: boolean; error?: string }> {
  const cardUrl = `${CARD_URL}?term=${encodeURIComponent(term)}`;
  const { signal, done } = withTimeout(TIMEOUT_MS);
  try {
    const resp = await fetch(`${IMAGE_FETCH_URL}?term=${encodeURIComponent(term)}`, { signal });
    if (!resp.ok) {
      return { image_url: cardUrl, photo_found: false, error: `image_fetch_http_${resp.status}` };
    }
    const data = await resp.json();
    const found = !!data.image_url;
    return {
      image_url: cardUrl,
      photo_found: found,
      error: found ? undefined : (data.reason || "no_image_found"),
    };
  } catch {
    return { image_url: cardUrl, photo_found: false, error: "image_fetch_exception" };
  } finally {
    done();
  }
}

// Attempts to atomically claim `id`: succeeds only if, at the moment
// Postgres evaluates the WHERE clause under the row lock, the row is
// still unclaimed-or-stale AND still has an unposted platform. Returns
// the freshly-claimed row (server-authoritative posted_*/claimed_at,
// not whatever the earlier SELECT saw) on success, or null if another
// call won the race -- see the header comment for why this is atomic.
async function tryClaim(id: string): Promise<QueueRow | null> {
  const cutoffIso = new Date(Date.now() - CLAIM_EXPIRY_MINUTES * 60_000).toISOString();
  const resp = await rest(
    `social_content_queue?id=eq.${encodeURIComponent(id)}` +
    `&and=(or(claimed_at.is.null,claimed_at.lt.${cutoffIso}),or(posted_instagram_at.is.null,posted_facebook_at.is.null))`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ claimed_at: new Date().toISOString() }),
    },
  );
  const updated: QueueRow[] = await resp.json();
  return updated[0] ?? null;
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

    const cutoffIso = new Date(Date.now() - CLAIM_EXPIRY_MINUTES * 60_000).toISOString();
    const rows: QueueRow[] = await rest(
      `social_content_queue?select=id,scheduled_time,caption,image_search_term,posted_instagram_at,posted_facebook_at,claimed_at` +
      `&day_number=eq.${dayNumber}` +
      `&and=(or(posted_instagram_at.is.null,posted_facebook_at.is.null),or(claimed_at.is.null,claimed_at.lt.${cutoffIso}))` +
      `&order=scheduled_time.asc`,
    ).then((r) => r.json());

    // Due once its slot's time has arrived (Europe/London), for the
    // rest of that campaign day -- see the disclosed limitation above
    // for why this doesn't extend past day_number's own day.
    const candidate = rows.find((r) => nowMin >= minutesFromTimeString(r.scheduled_time));

    if (!candidate) {
      return json({ due: false, day_number: dayNumber, unposted_today: rows.length });
    }

    // Atomic claim -- the actual fix. A candidate found claimable a
    // moment ago in the SELECT above can still lose the claim here if
    // another call's UPDATE won the row lock first; that is exactly
    // the race this function now closes.
    const claimed = await tryClaim(candidate.id);
    if (!claimed) {
      return json({
        due: false, day_number: dayNumber,
        reason: "claim_lost_to_concurrent_call", row_id: candidate.id,
      });
    }

    const needs_instagram = !claimed.posted_instagram_at;
    const needs_facebook = !claimed.posted_facebook_at;

    if (!claimed.image_search_term) {
      // Still a card, still square. An Instagram feed post requires an
      // image, so a row with no search term gets plain brand ground
      // rather than nothing -- the reason is reported either way.
      return json({
        due: true, row_id: claimed.id, caption: claimed.caption,
        image_url: CARD_URL, image_size: "1080x1080", photo_found: false,
        image_error: "no_search_term", needs_instagram, needs_facebook,
      });
    }

    const { image_url, photo_found, error: imageError } = await fetchImage(claimed.image_search_term);
    return json({
      due: true,
      row_id: claimed.id,
      caption: claimed.caption,
      image_url,
      // Stated so a reader of this response never has to infer it, and
      // so a future change cannot quietly go back to serving something
      // of an arbitrary shape without this line becoming a lie.
      image_size: "1080x1080",
      photo_found,
      needs_instagram,
      needs_facebook,
      ...(imageError ? { image_error: imageError } : {}),
    });
  } catch (e) {
    console.error("[social-next-post] failed", String(e));
    return json({ error: String(e) }, 502);
  }
});
