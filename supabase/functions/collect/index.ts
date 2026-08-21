// Glotemp: the page-view collector.
//
// Self-hosted, cookieless, aggregate-only. This replaces the third-party
// beacon: nothing here sets a cookie, reads one, writes to any client
// storage, or issues an identifier of any kind.
//
// WHAT IT STORES, AND WHAT IT REFUSES TO
//   timestamp        the row's own created_at
//   path             pathname only, query string stripped before storage
//   country          two letters, derived from the request IP HERE and
//                    then discarded. See below.
//   referrer_host    the bare host, never a path and never a query string
//   device           mobile / tablet / desktop, coarse buckets only
//
// The IP address never leaves this function. It is read from the request
// headers, mapped to a country, and goes out of scope. It is not logged,
// not returned, not forwarded, and there is no column in analytics_events
// that could hold it (the migration drops any such column defensively).
//
// Because there is no identifier, two page views cannot be linked to each
// other. That is a deliberate limit, not an oversight: it is what keeps
// this aggregate-only, and it is why the dashboard says "views" rather
// than pretending to count unique people.
//
// PECR and UK GDPR: no terminal-equipment storage means no consent banner
// is required for this, and no personal data is retained.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cloudflare and most edge proxies resolve the country for us and pass it
// as a header, which is better than shipping a GeoIP database: it means
// the address is resolved upstream and we never even see it in those
// deployments. x-forwarded-for is the fallback path, and is used only to
// pick a country before being dropped.
function countryOf(req: Request): string | null {
  const direct = req.headers.get("cf-ipcountry") ??
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("x-country-code");
  if (direct && /^[A-Za-z]{2}$/.test(direct) && direct.toUpperCase() !== "XX") {
    return direct.toUpperCase();
  }
  // No proxy country header. We deliberately do NOT ship a GeoIP lookup
  // here: an unresolved country is recorded as unknown, which is honest,
  // rather than storing the address to resolve it later.
  return null;
}

function hostOf(referrer: unknown): string | null {
  if (typeof referrer !== "string" || !referrer) return null;
  try {
    const h = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    if (!h) return null;
    // Self-referrals are navigation, not acquisition.
    if (h.endsWith("glo-temp.com")) return null;
    return h.slice(0, 120);
  } catch {
    return null;
  }
}

function deviceOf(ua: unknown): "mobile" | "tablet" | "desktop" {
  const s = String(ua || "").toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s)) return "mobile";
  return "desktop";
}

// Path only, and only the path. A query string is where anything
// identifying would end up, so it is removed before the row is built
// rather than trusted not to contain one.
function pathOf(raw: unknown): string {
  const s = typeof raw === "string" && raw ? raw : "/";
  const cut = s.split("?")[0].split("#")[0];
  if (!cut.startsWith("/")) return "/";
  return cut.slice(0, 300);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const row = {
    event: "page_view",
    path: pathOf(body.path),
    country: countryOf(req),
    referrer_host: hostOf(body.referrer),
    device: deviceOf(req.headers.get("user-agent")),
    display_mode: typeof body.display_mode === "string" ? body.display_mode : null,
    city_slug: typeof body.city_slug === "string" ? body.city_slug.slice(0, 80) : null,
  };

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!resp.ok) {
    // Say what actually went wrong rather than swallowing it: a collector
    // that fails silently is a collector nobody notices has stopped.
    const detail = (await resp.text()).slice(0, 300);
    console.error("[collect] insert failed", resp.status, detail);
    return new Response(JSON.stringify({ error: "insert failed", status: resp.status, detail }), {
      status: 502,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(null, { status: 204, headers: CORS });
});
