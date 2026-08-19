// Callable by Make after a successful post: marks ONE platform's slot
// on the row as posted. This is deliberately per-platform, not a
// single shared posted_at/post_id -- every row posts to both
// Instagram and Facebook independently, and a retry must only
// re-attempt whichever platform actually failed. Marking both from one
// call (or gating on "both succeeded") would either re-post to the
// network that already worked, or silently skip the one that failed.
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
        body: JSON.stringify({ [columns.at]: new Date().toISOString(), [columns.id]: post_id ?? null }),
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
