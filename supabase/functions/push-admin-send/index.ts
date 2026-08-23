import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Push notifications TO the admin/owner -- a separate feature from
// push-send (which notifies followers about their watched cities). Same
// mechanism (self-owned VAPID keypair, no paid service), same encryption
// code (duplicated below rather than factored into a shared module: this
// repo has no shared-function convention yet, and push-send is already
// shipped and working -- touching it to introduce one was judged more
// risk than the duplication is worth for two files).
//
// FOUR REAL TRIGGERS, EACH BACKED BY DATA THAT ALREADY EXISTS:
//   1. New sign-up            -- profiles rows
//   2. New reaction on a check-in -- reactions rows (see
//      20260823120000_fix_reactions_comment_id_type.sql: this was
//      actually broken, zero reactions had ever saved, until that
//      migration; "new comment" collapses into this because there is no
//      live, separate comment entity -- city_comments does not exist in
//      this database, and a check-in's own `note` field is written at
//      creation time, not as a reply afterward)
//   3. Milestones -- three, all reusing data/logic that already exists:
//      a city's observations crossing a check-in threshold
//      (checkin_counts_by_city), a sponsor lead's status flipping to
//      'replied' (outreach_leads), a contributor reaching Keeper or
//      Founder (contributor_tiers_for_notify -> admin_contributor_tier(),
//      the same function the admin dashboard's own tier counts use --
//      Voice is deliberately excluded, since every single check-in-er
//      reaches it on day one and pinging for that would be noise, not a
//      milestone)
//   4. X content due today -- x_content_calendar rows for today's
//      campaign day, same CAMPAIGN_START_DATE anchor social-next-post
//      uses for the sibling Instagram/Facebook calendar (both launched
//      together; the X table itself has never needed a day-number/date
//      mapping before, since it's manual/copy-paste with nothing to
//      "run" on a schedule until now)
//
// EVERY TRIGGER IS ONE-SHOT, NOT REPEATING: admin_notification_log's
// primary key (kind, ref_key) is the cap, same pattern as
// push_notification_log -- an item is only ever included in a push once,
// ever. The schema migration backfills everything already true as of
// deploy as already-notified, so day one reports only genuinely new
// events, not the site's whole history as a burst.
//
// BATCHING: every trigger type is gathered in the same run and combined
// into ONE push, not one push per item or per category -- five things
// clustering inside one 15-minute window becomes one notification with
// five lines, never five separate pushes.
const SIGNUP_LIMIT = 200;
const REACTION_LIMIT = 200;
const LEAD_LIMIT = 200;
const CHECKIN_THRESHOLDS = [5, 10, 25, 50, 100, 250, 500, 1000];
// Same real date social-next-post's CAMPAIGN_START_DATE anchors on: the
// day this project's content campaign actually went live. Both the
// Instagram/Facebook and X calendars share day_number 1-30 against it.
const CAMPAIGN_START_DATE = "2026-08-19";
// 08:00 London -- matches the X calendar's own slot-1 scheduled_time, a
// sensible "here's today's posting" moment rather than firing the
// instant midnight ticks over.
const REMINDER_HOUR_LONDON = 8;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- base64url ----------
function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- VAPID key material ----------
// Same keypair as push-send: the public half here matches the client's
// hardcoded VAPID_PUBLIC_KEY (push-notifications.js, and admin/push-admin.js
// below). VAPID identifies the SENDING server, not the subscriber, so
// reusing one keypair across the consumer and admin push features is
// correct -- there is nothing a second keypair would add.
const VAPID_PUBLIC_RAW = b64urlDecode(
  "BG1M909CorlzFBuXEMqBxCAKG56SzYC7dyW-gMj0Oae1Arez1HkAFmB1p-c1ZVT5hh3dfs9xH4qYxTzA6mLOU7U"
);
const VAPID_SUBJECT = "mailto:info@glo-temp.com";

async function getVapidPrivateKeyJwk(): Promise<JsonWebKey> {
  const { data, error } = await supabase.rpc("get_vapid_private_key");
  if (error || !data) throw new Error(`vapid key unavailable: ${error?.message}`);
  return rawScalarToJwk(data as string);
}

function rawScalarToJwk(privB64url: string): JsonWebKey {
  const x = VAPID_PUBLIC_RAW.slice(1, 33);
  const y = VAPID_PUBLIC_RAW.slice(33, 65);
  return {
    kty: "EC",
    crv: "P-256",
    x: b64urlEncode(x),
    y: b64urlEncode(y),
    d: privB64url,
    ext: true,
  };
}

async function buildVapidAuthHeader(endpoint: string, privateJwk: JsonWebKey): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: VAPID_SUBJECT };
  const enc = new TextEncoder();
  const signingInput =
    b64urlEncode(enc.encode(JSON.stringify(header))) + "." + b64urlEncode(enc.encode(JSON.stringify(payload)));

  const key = await crypto.subtle.importKey(
    "jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput)
  );
  const jwt = signingInput + "." + b64urlEncode(new Uint8Array(sig));
  const k = b64urlEncode(VAPID_PUBLIC_RAW);
  return `vapid t=${jwt}, k=${k}`;
}

// ---------- RFC 8291 payload encryption ----------
async function hmacSha256(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return new Uint8Array(sig);
}
async function importHmacKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

async function encryptPayload(
  plaintext: string,
  p256dhB64url: string,
  authB64url: string
): Promise<{ body: Uint8Array; contentEncoding: string }> {
  const enc = new TextEncoder();
  const uaPublic = b64urlDecode(p256dhB64url);
  const authSecret = b64urlDecode(authB64url);

  const asKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", asKeyPair.publicKey));

  const uaPublicKey = await crypto.subtle.importKey(
    "raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaPublicKey }, asKeyPair.privateKey, 256)
  );

  const prkKeyHmacKey = await importHmacKey(authSecret);
  const prkKey = await hmacSha256(prkKeyHmacKey, sharedSecret);

  const keyInfo = concatBytes(enc.encode("WebPush: info\0"), uaPublic, asPublicRaw);
  const prkKeyHmac = await importHmacKey(prkKey);
  const ikm = (await hmacSha256(prkKeyHmac, concatBytes(keyInfo, new Uint8Array([1])))).slice(0, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prkHmacKey = await importHmacKey(salt);
  const prk = await hmacSha256(prkHmacKey, ikm);

  const prkHmac = await importHmacKey(prk);
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const cek = (await hmacSha256(prkHmac, concatBytes(cekInfo, new Uint8Array([1])))).slice(0, 16);
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const nonce = (await hmacSha256(prkHmac, concatBytes(nonceInfo, new Uint8Array([1])))).slice(0, 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const padded = concatBytes(enc.encode(plaintext), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, padded)
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const idlen = new Uint8Array([asPublicRaw.length]);
  const header = concatBytes(salt, rs, idlen, asPublicRaw);

  return { body: concatBytes(header, ciphertext), contentEncoding: "aes128gcm" };
}

async function sendPush(
  endpoint: string, p256dh: string, authKey: string, privateJwk: JsonWebKey, payload: string
): Promise<{ ok: boolean; status: number }> {
  const { body, contentEncoding } = await encryptPayload(payload, p256dh, authKey);
  const authHeader = await buildVapidAuthHeader(endpoint, privateJwk);
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": contentEncoding,
      "TTL": "86400",
      "Authorization": authHeader,
    },
    body,
  });
  return { ok: resp.ok, status: resp.status };
}

// ---------- claim-once helper ----------
// Bulk-inserts candidate (kind, ref_key) pairs with ignore-duplicates,
// asking PostgREST to hand back only the rows that were genuinely new
// (return=representation on an ignore-duplicates upsert omits anything
// that hit the primary key conflict). Two overlapping runs racing on the
// same item can only ever have one of them win the insert, so this is
// also what keeps a double-fire impossible, not just an app-level check.
async function claimNew<T>(
  kind: string,
  candidates: T[],
  keyFn: (item: T) => string
): Promise<T[]> {
  if (candidates.length === 0) return [];
  const rows = candidates.map((c) => ({ kind, ref_key: keyFn(c) }));
  const { data, error } = await supabase
    .from("admin_notification_log")
    .upsert(rows, { onConflict: "kind,ref_key", ignoreDuplicates: true })
    .select("ref_key");
  if (error) {
    console.error(`[push-admin-send] claim failed for kind=${kind}: ${error.message}`);
    return [];
  }
  const claimedKeys = new Set((data ?? []).map((r: { ref_key: string }) => r.ref_key));
  return candidates.filter((c) => claimedKeys.has(keyFn(c)));
}

// ---------- London clock ----------
function londonNow(): { dateStr: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { dateStr, minutes };
}

// ---------- the four triggers ----------

interface ProfileRow { user_id: string; display_name: string | null; created_at: string; }
async function gatherSignups(): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, created_at")
    .order("created_at", { ascending: false })
    .limit(SIGNUP_LIMIT);
  if (error || !data || data.length === 0) return [];
  const claimed = await claimNew("signup", data as ProfileRow[], (r) => r.user_id);
  if (claimed.length === 0) return [];
  if (claimed.length <= 3) {
    return [`New sign-up: ${claimed.map((r) => r.display_name || "Someone").join(", ")}`];
  }
  return [`${claimed.length} new sign-ups`];
}

interface ReactionRow { id: string; observations: { city_slug: string } | null; }
async function gatherReactions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("reactions")
    .select("id, observations(city_slug)")
    .order("created_at", { ascending: false })
    .limit(REACTION_LIMIT);
  if (error || !data || data.length === 0) return [];
  const claimed = await claimNew("reaction", data as unknown as ReactionRow[], (r) => r.id);
  if (claimed.length === 0) return [];
  if (claimed.length === 1) {
    const city = claimed[0].observations?.city_slug;
    return [city ? `New reaction on a ${city} check-in` : "New reaction on a check-in"];
  }
  return [`${claimed.length} new reactions on check-ins`];
}

interface CityCount { city_slug: string; total: number; }
async function gatherCheckinMilestones(): Promise<string[]> {
  const { data, error } = await supabase.rpc("checkin_counts_by_city");
  if (error || !data || data.length === 0) return [];

  const candidates: { city_slug: string; threshold: number }[] = [];
  for (const row of data as CityCount[]) {
    for (const t of CHECKIN_THRESHOLDS) {
      if (Number(row.total) >= t) candidates.push({ city_slug: row.city_slug, threshold: t });
    }
  }
  const claimed = await claimNew(
    "milestone_checkin_threshold",
    candidates,
    (c) => `${c.city_slug}:${c.threshold}`
  );
  if (claimed.length === 0) return [];

  // One line per city, the HIGHEST threshold it newly crossed this run --
  // a city that jumped two thresholds at once (cron was briefly down, a
  // burst of check-ins landed) still gets logged for both so neither
  // re-fires later, but the admin only reads the milestone that matters.
  const bestPerCity = new Map<string, number>();
  for (const c of claimed) {
    const cur = bestPerCity.get(c.city_slug) ?? 0;
    if (c.threshold > cur) bestPerCity.set(c.city_slug, c.threshold);
  }
  return [...bestPerCity.entries()].map(([city, t]) => `${city} just crossed ${t} check-ins`);
}

interface LeadRow { id: string; org_name: string; }
async function gatherLeadReplies(): Promise<string[]> {
  const { data, error } = await supabase
    .from("outreach_leads")
    .select("id, org_name")
    .eq("status", "replied")
    .order("updated_at", { ascending: false })
    .limit(LEAD_LIMIT);
  if (error || !data || data.length === 0) return [];
  const claimed = await claimNew("milestone_lead_replied", data as LeadRow[], (r) => r.id);
  return claimed.map((r) => `${r.org_name} replied to your outreach`);
}

interface TierRow { user_id: string; display_name: string; tier: string; }
async function gatherTierPromotions(): Promise<string[]> {
  const { data, error } = await supabase.rpc("contributor_tiers_for_notify");
  if (error || !data || data.length === 0) return [];
  const claimed = await claimNew(
    "milestone_tier",
    data as TierRow[],
    (r) => `${r.user_id}:${r.tier}`
  );
  return claimed.map((r) => `${r.display_name} reached ${r.tier[0].toUpperCase()}${r.tier.slice(1)}`);
}

interface XPostRow { scheduled_time: string; theme: string; }
async function gatherXReminder(): Promise<string[]> {
  const { dateStr, minutes } = londonNow();
  if (minutes < REMINDER_HOUR_LONDON * 60) return [];

  const startMs = Date.parse(`${CAMPAIGN_START_DATE}T00:00:00Z`);
  const todayMs = Date.parse(`${dateStr}T00:00:00Z`);
  const dayNumber = Math.floor((todayMs - startMs) / 86_400_000) + 1;
  if (dayNumber < 1 || dayNumber > 30) return [];

  const claimed = await claimNew("x_content_reminder", [dateStr], (d) => d as string);
  if (claimed.length === 0) return []; // already reminded today

  const { data, error } = await supabase
    .from("x_content_calendar")
    .select("scheduled_time, theme")
    .eq("day_number", dayNumber)
    .order("scheduled_time", { ascending: true });
  if (error || !data || data.length === 0) return [];

  const rows = data as XPostRow[];
  const times = rows.map((r) => r.scheduled_time).join(", ");
  return [`${rows.length} X post${rows.length === 1 ? "" : "s"} ready for today (${times})`];
}

Deno.serve(async (_req: Request) => {
  try {
    const [signups, reactions, checkins, leads, tiers, xReminder] = await Promise.all([
      gatherSignups(),
      gatherReactions(),
      gatherCheckinMilestones(),
      gatherLeadReplies(),
      gatherTierPromotions(),
      gatherXReminder(),
    ]);

    const lines = [...signups, ...reactions, ...checkins, ...leads, ...tiers, ...xReminder];
    if (lines.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "nothing_due" }), {
        headers: { "Content-Type": "application/json" }, status: 200,
      });
    }

    const { data: subs, error: subsErr } = await supabase
      .from("admin_push_subscriptions")
      .select("endpoint, p256dh, auth_key");
    if (subsErr) throw new Error(`admin_push_subscriptions query failed: ${subsErr.message}`);
    if (!subs || subs.length === 0) {
      // Real events happened but no admin is subscribed to hear about them --
      // report it plainly rather than silently doing nothing.
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "no_subscriptions", lines }), {
        headers: { "Content-Type": "application/json" }, status: 200,
      });
    }

    const privateJwk = await getVapidPrivateKeyJwk();
    const MAX_BODY = 480;
    let body = lines.join("\n");
    if (body.length > MAX_BODY) body = body.slice(0, MAX_BODY - 1) + "…";

    const payload = JSON.stringify({
      title: "Glotemp Admin",
      body,
      target: "/admin",
      tag: "admin-digest",
    });

    let sent = 0, failed = 0;
    for (const sub of subs) {
      try {
        const result = await sendPush(sub.endpoint, sub.p256dh, sub.auth_key, privateJwk, payload);
        if (result.ok) sent++; else failed++;
      } catch (e) {
        console.error(`[push-admin-send] send failed: ${e.message}`);
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, sent, failed, lines }), {
      headers: { "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    console.error("[push-admin-send] fatal error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
