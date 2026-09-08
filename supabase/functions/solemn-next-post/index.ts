// Callable by Make: the solemn-content twin of social-next-post, on its
// own tables (solemn_situations / solemn_content_queue), its own weekly
// cadence, and its own Make scenario -- see that function's header for
// the atomic-claim reasoning this reuses verbatim (same race, same fix).
//
// WHAT'S DIFFERENT FROM social-next-post, AND WHY
//   - "Due" is next_due_at (an absolute timestamp per row), not a daily
//     day_number + time-of-day slot. A weekly cadence doesn't fit the
//     campaign-day model, and forcing it to would mean inventing a fake
//     day_number for a situation that isn't a fixed-length campaign.
//   - The taper check runs FIRST, every poll: any situation whose
//     cutoff_estimate_date has passed is flipped inactive right here,
//     before anything else -- the real, checked stop mechanism the
//     brief asked for, not a cadence left running unwatched. An
//     inactive situation is never queried for due rows again.
//   - No image_search_term / photo lookup at all. Every solemn post
//     renders through social-card with an empty term -- the same plain,
//     text-only brand card (dark ground, one thin brass rule, no glow,
//     no photo) already used for growth-queue rows with nothing to
//     photograph, reused here deliberately: restrained is correct for
//     this content, not a fallback to make do with.
//   - The response never includes anything resembling a call-to-action
//     field, because solemn_content_queue has no such column to read --
//     structurally, not by omission here.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CARD_URL = Deno.env.get("SOCIAL_CARD_URL")
  ?? `${SUPABASE_URL}/functions/v1/social-card`;
const STORAGE_BUCKET = Deno.env.get("SOLEMN_CARD_BUCKET") ?? "social-cards";

const CARD_RENDER_TIMEOUT_MS = 15000;
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

interface SolemnRow {
  id: string;
  situation_key: string;
  message: string;
  next_due_at: string;
  posted_instagram_at: string | null;
  posted_facebook_at: string | null;
  claimed_at: string | null;
}

// The plain, text-only brand card -- same renderer social-next-post
// already uses for a row with no photo, called here the same way (empty
// term). Never anything more decorated than that for this content.
async function renderAndUploadCard(rowId: string): Promise<string | null> {
  const { signal, done } = withTimeout(CARD_RENDER_TIMEOUT_MS);
  let png: Uint8Array;
  try {
    const resp = await fetch(`${CARD_URL}?term=`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      signal,
    });
    if (!resp.ok) {
      console.error(`[solemn-next-post] card render HTTP ${resp.status}`);
      return null;
    }
    png = new Uint8Array(await resp.arrayBuffer());
  } catch (e) {
    console.error(`[solemn-next-post] card render failed`, String(e));
    return null;
  } finally {
    done();
  }

  const objectPath = `solemn-${rowId}.png`;
  try {
    const uploadResp = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
          "x-upsert": "true",
        },
        body: png,
      },
    );
    if (!uploadResp.ok) {
      console.error(`[solemn-next-post] storage upload HTTP ${uploadResp.status}`, await uploadResp.text());
      return null;
    }
  } catch (e) {
    console.error(`[solemn-next-post] storage upload failed`, String(e));
    return null;
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${objectPath}?v=${Date.now()}`;
}

// The taper check. Runs before anything else on every single poll --
// any situation past its own cutoff_estimate_date is flipped inactive
// right here, so a forgotten cadence cannot keep running unwatched.
async function retireExpiredSituations(): Promise<void> {
  const todayIso = new Date().toISOString().slice(0, 10);
  await rest(
    `solemn_situations?active=is.true&cutoff_estimate_date=lt.${todayIso}`,
    { method: "PATCH", body: JSON.stringify({ active: false }) },
  );
}

async function tryClaim(id: string): Promise<SolemnRow | null> {
  const cutoffIso = new Date(Date.now() - CLAIM_EXPIRY_MINUTES * 60_000).toISOString();
  const resp = await rest(
    `solemn_content_queue?id=eq.${encodeURIComponent(id)}` +
    `&and=(or(claimed_at.is.null,claimed_at.lt.${cutoffIso}),or(posted_instagram_at.is.null,posted_facebook_at.is.null))`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ claimed_at: new Date().toISOString() }),
    },
  );
  const updated: SolemnRow[] = await resp.json();
  return updated[0] ?? null;
}

Deno.serve(async (req: Request) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[solemn-next-post] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "not_configured" }, 500);
  }

  try {
    await retireExpiredSituations();

    const nowIso = new Date().toISOString();
    const cutoffIso = new Date(Date.now() - CLAIM_EXPIRY_MINUTES * 60_000).toISOString();

    // Only rows whose situation is still active, joined via an explicit
    // PostgREST embed filter rather than a second round trip.
    const rows: SolemnRow[] = await rest(
      `solemn_content_queue?select=id,situation_key,message,next_due_at,posted_instagram_at,posted_facebook_at,claimed_at,solemn_situations!inner(active)` +
      `&solemn_situations.active=eq.true` +
      `&next_due_at=lte.${nowIso}` +
      `&and=(or(posted_instagram_at.is.null,posted_facebook_at.is.null),or(claimed_at.is.null,claimed_at.lt.${cutoffIso}))` +
      `&order=next_due_at.asc&limit=1`,
    ).then((r) => r.json());

    const candidate = rows[0];
    if (!candidate) {
      return json({ due: false });
    }

    const claimed = await tryClaim(candidate.id);
    if (!claimed) {
      return json({ due: false, reason: "claim_lost_to_concurrent_call", row_id: candidate.id });
    }

    const needs_instagram = !claimed.posted_instagram_at;
    const needs_facebook = !claimed.posted_facebook_at;
    const image_url = await renderAndUploadCard(claimed.id);

    return json({
      due: true,
      row_id: claimed.id,
      situation_key: claimed.situation_key,
      // The only content field this response ever carries -- there is
      // no separate cta/link field to include, because none exists on
      // the row it was read from.
      caption: claimed.message,
      image_url,
      image_size: "1080x1080",
      needs_instagram,
      needs_facebook,
    });
  } catch (e) {
    console.error("[solemn-next-post] failed", String(e));
    return json({ error: String(e) }, 502);
  }
});
