// Callable by Make after a successful post: marks ONE platform's slot
// on the row as posted. This is deliberately per-platform, not a
// single shared posted_at/post_id -- every row posts to both
// Instagram and Facebook independently, and a retry must only
// re-attempt whichever platform actually failed. Marking both from one
// call (or gating on "both succeeded") would either re-post to the
// network that already worked, or silently skip the one that failed.
//
// REAL BUG, CONFIRMED LIVE (duplicate post to both platforms from two
// executions five seconds apart, one automatic, one manual): this used
// to also null out social-next-post's claim (claimed_at -> null) the
// moment ANY platform was marked posted -- including when the SAME
// execution still had the OTHER platform left to post. A single Make
// run typically posts Instagram, marks it, then posts Facebook, all
// within one invocation; nulling the claim after the FIRST of those
// re-opened the row to a concurrent claim (a second poll, or a manual
// run) for the entire window until the first execution got around to
// posting the second platform -- exactly the race social-next-post's
// atomic claim exists to prevent, just moved to fire mid-execution
// instead of at the start. The second execution would then post
// whichever platform still looked unposted, while the FIRST execution,
// unaware anything had changed, carried on and posted it too.
//
// The fix is to not release the claim here at all. CLAIM_EXPIRY_MINUTES
// (in social-next-post) is already the sole, sufficient safety net for
// the crash case -- a normal single execution never needs the claim
// released early, because it already holds everything it needs
// (needs_instagram/needs_facebook) from its own original claim response
// and never re-polls mid-run. The only cost of not releasing early is
// that a row where the SAME execution genuinely crashes between
// platforms stays locked for up to CLAIM_EXPIRY_MINUTES before the next
// poll can retry it -- a delay the function's own header comment already
// treats as an acceptable, ordinary case ("comfortably shorter than the
// 15-minute poll interval"), not a new tradeoff introduced by this fix.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const PLATFORM_COLUMNS: Record<string, { at: string; id: string }> = {
  instagram: { at: "posted_instagram_at", id: "posted_instagram_id" },
  facebook: { at: "posted_facebook_at", id: "posted_facebook_id" },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[social-mark-posted] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "not_configured" }, 500);
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  let body: { row_id?: string; platform?: string; post_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json_body" }, 400);
  }

  const { row_id, platform, post_id } = body;
  if (!row_id) return json({ error: "missing_row_id" }, 400);
  const columns = platform ? PLATFORM_COLUMNS[platform] : undefined;
  if (!columns) {
    return json({ error: "invalid_platform", allowed: Object.keys(PLATFORM_COLUMNS) }, 400);
  }

  try {
    // Only update while that platform's own column is still unset --
    // the same "already done, not an error" idempotency as before,
    // just scoped to one platform's column instead of the whole row.
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/social_content_queue?id=eq.${encodeURIComponent(row_id)}&${columns.at}=is.null`,
      {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          [columns.at]: new Date().toISOString(),
          [columns.id]: post_id ?? null,
          // claimed_at is deliberately left untouched -- see the header
          // comment. Only social-next-post's own atomic claim (and its
          // CLAIM_EXPIRY_MINUTES timeout) ever changes it.
        }),
      },
    );
    if (!resp.ok) {
      const detail = await resp.text();
      console.error(`[social-mark-posted] update failed for ${row_id}/${platform}: HTTP ${resp.status} ${detail}`);
      return json({ error: "update_failed", detail }, 502);
    }
    const updated = await resp.json();
    if (!updated.length) {
      // Real, meaningful outcome: either row_id doesn't exist, or this
      // platform was already marked posted (e.g. Make retried after a
      // timeout whose original call actually succeeded). Not a
      // failure -- surfaced plainly rather than confused with a no-op.
      return json({ success: true, already_posted_or_not_found: true, row_id, platform });
    }
    return json({ success: true, row_id, platform, posted_at: updated[0][columns.at] });
  } catch (e) {
    console.error(`[social-mark-posted] exception for ${row_id}/${platform}`, String(e));
    return json({ error: String(e) }, 502);
  }
});
