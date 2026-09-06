// Callable by Make after a successful post: the solemn-content twin of
// social-mark-posted, on solemn_content_queue instead. Same per-platform
// idempotent update, same reason for not releasing claimed_at here (see
// social-mark-posted's own header comment for the full race-condition
// story this avoids re-opening) -- CLAIM_EXPIRY_MINUTES in
// solemn-next-post is the only thing that ever releases a claim.
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
    console.error("[solemn-mark-posted] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/solemn_content_queue?id=eq.${encodeURIComponent(row_id)}&${columns.at}=is.null`,
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
        }),
      },
    );
    if (!resp.ok) {
      const detail = await resp.text();
      console.error(`[solemn-mark-posted] update failed for ${row_id}/${platform}: HTTP ${resp.status} ${detail}`);
      return json({ error: "update_failed", detail }, 502);
    }
    const updated = await resp.json();
    if (!updated.length) {
      return json({ success: true, already_posted_or_not_found: true, row_id, platform });
    }
    return json({ success: true, row_id, platform, posted_at: updated[0][columns.at] });
  } catch (e) {
    console.error(`[solemn-mark-posted] exception for ${row_id}/${platform}`, String(e));
    return json({ error: String(e) }, 502);
  }
});
