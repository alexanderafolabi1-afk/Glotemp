// The public Glotemp API. This is the thing customers pay for.
//
// Everything it does is one of three steps:
//   1. read the key off the request
//   2. ask the database whether that key may proceed (which also records
//      the call, so usage is billable)
//   3. serve the reading
//
// No key material is held here. api_authorise takes the key, hashes it
// and compares; this function never sees a stored key and cannot list
// them. If this function's source leaked it would give an attacker
// nothing, which is the same property the admin page has.
//
// Routes:
//   GET /v1/cities/{slug}            one city's current reading
//   GET /v1/cities/{slug}?hours=48   same, over a longer window (1..168)
//   GET /v1/health                   no key needed, for uptime checks

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

function fail(status: number, error: string, message: string) {
  // A machine-readable code plus a sentence a human can act on. An
  // integrator reading "forbidden" learns nothing; reading which of
  // revoked / over-limit / unknown it was, they do.
  return json({ error, message }, status);
}

// Accepts either `Authorization: Bearer <key>` or `X-API-Key: <key>`.
// Both are common, and rejecting one of them is a support ticket that
// costs more than supporting both.
function readKey(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();
  const direct = req.headers.get("x-api-key");
  return direct ? direct.trim() : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET") return fail(405, "method_not_allowed", "This API is read only. Use GET.");

  const url = new URL(req.url);
  // Supabase mounts the function under /functions/v1/api-v1, so that
  // prefix is stripped before routing. Both the mounted and the bare form
  // are accepted so a custom domain pointing straight at this works too.
  const path = url.pathname
    .replace(/^\/functions\/v1\/api-v1/, "")
    .replace(/^\/api-v1/, "")
    || "/";

  if (path === "/v1/health" || path === "/health") {
    return json({ status: "ok", time: new Date().toISOString() });
  }

  const key = readKey(req);
  if (!key) {
    return fail(
      401,
      "no_key",
      "Send your key as 'Authorization: Bearer glo_live_...' or 'X-API-Key: glo_live_...'.",
    );
  }

  const { data: auth, error: authError } = await db
    .rpc("api_authorise", { p_key: key, p_path: path })
    .maybeSingle();

  if (authError) {
    console.error("[api-v1] authorise failed", authError.message);
    return fail(503, "unavailable", "Could not check that key right now. Try again shortly.");
  }

  if (!auth || !auth.allowed) {
    const reason = auth?.reason ?? "invalid_key";
    if (reason === "monthly_limit_reached") {
      return fail(429, reason, "This key has used its calls for the month. Upgrade the plan or wait for the reset.");
    }
    if (reason === "revoked") {
      return fail(403, reason, "This key has been revoked.");
    }
    return fail(401, "invalid_key", "That key is not recognised.");
  }

  // ---- routes ----
  const city = path.match(/^\/v1\/cities\/([a-z0-9-]+)\/?$/);
  if (city) {
    const hoursRaw = Number(url.searchParams.get("hours") ?? "24");
    // Clamped here as well as in SQL so a nonsense value is a predictable
    // 24 rather than a NaN handed to the database.
    const hours = Number.isFinite(hoursRaw) ? Math.min(Math.max(Math.trunc(hoursRaw), 1), 168) : 24;

    const { data, error } = await db
      .rpc("api_city_reading", { p_city_slug: city[1], p_hours: hours })
      .maybeSingle();

    if (error) {
      console.error("[api-v1] reading failed", error.message);
      return fail(503, "unavailable", "Could not read that city right now. Try again shortly.");
    }
    if (!data) return fail(404, "not_found", "No such city.");

    return json({
      city: data.city_slug,
      band: data.band,
      intensity: data.intensity === null ? null : Number(data.intensity),
      observations: Number(data.observations),
      top_mode: data.top_mode,
      window_hours: data.window_hours,
      as_of: data.as_of,
    }, 200, {
      // A reading built from a rolling window does not change second to
      // second, and a customer polling it should not pay for that.
      "Cache-Control": "public, max-age=60",
    });
  }

  return fail(404, "not_found", "Unknown route. Try GET /v1/cities/{slug}.");
});
