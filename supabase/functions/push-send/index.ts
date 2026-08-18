import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Trigger 2 only (v1, per project direction): "a followed city's reading
// has moved significantly since last checked." Trigger 1 (Ticketmaster
// event today / Pulse Engine Crisis threshold) is NOT implemented here --
// neither signal exists for real right now (see PR description).
//
// "Significantly" is defined as: for a given (city_slug, metric), compare
// the latest reading to the most recent prior reading that is at least
// 20 hours older (approximates "since yesterday" without assuming every
// source refreshes on the same cadence -- world_bank is daily,
// github_activity is hourly, etc). Trigger when the relative change is
// >= 15%, with an absolute floor of 0.5 so a metric sitting near zero
// doesn't produce a "200% change" from noise.
const SIGNIFICANT_PCT = 0.15;
const SIGNIFICANT_ABS_FLOOR = 0.5;
const MIN_GAP_HOURS = 20;

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
// Public key coordinates match the client's hardcoded VAPID_PUBLIC_KEY
// (push-notifications.js) -- both sides of the same self-generated pair.
const VAPID_PUBLIC_RAW = b64urlDecode(
  "BG1M909CorlzFBuXEMqBxCAKG56SzYC7dyW-gMj0Oae1Arez1HkAFmB1p-c1ZVT5hh3dfs9xH4qYxTzA6mLOU7U"
);
const VAPID_SUBJECT = "mailto:info@glo-temp.com";

async function getVapidPrivateKeyJwk(): Promise<JsonWebKey> {
  // PostgREST only exposes the `public` schema, not `vault` -- read via
  // the security-definer RPC (get_vapid_private_key.sql), same pattern
  // invoke_edge_function() uses for the service-role key.
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
  const uaPublic = b64urlDecode(p256dhB64url); // subscriber's public key, uncompressed point
  const authSecret = b64urlDecode(authB64url); // 16 bytes

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

  // PRK_key = HKDF-Extract(salt=auth_secret, ikm=ecdh_secret)
  const prkKeyHmacKey = await importHmacKey(authSecret);
  const prkKey = await hmacSha256(prkKeyHmacKey, sharedSecret);

  // IKM = HKDF-Expand(PRK_key, "WebPush: info" || 0x00 || ua_pub || as_pub, 32)
  const keyInfo = concatBytes(enc.encode("WebPush: info\0"), uaPublic, asPublicRaw);
  const prkKeyHmac = await importHmacKey(prkKey);
  const ikm = (await hmacSha256(prkKeyHmac, concatBytes(keyInfo, new Uint8Array([1])))).slice(0, 32);

  // RFC 8188 aes128gcm derivation from IKM, with a fresh random salt.
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prkHmacKey = await importHmacKey(salt);
  const prk = await hmacSha256(prkHmacKey, ikm);

  const prkHmac = await importHmacKey(prk);
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const cek = (await hmacSha256(prkHmac, concatBytes(cekInfo, new Uint8Array([1])))).slice(0, 16);
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const nonce = (await hmacSha256(prkHmac, concatBytes(nonceInfo, new Uint8Array([1])))).slice(0, 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  // 0x02 delimiter byte marks this as the (only, final) record -- RFC 8188 padding.
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

// ---------- significant-move detection ----------
interface ReadingRow { city_slug: string; metric: string; value: number; fetched_at: string; }

async function findSignificantMoves(citySlugs: string[]): Promise<Map<string, { metric: string; pct: number }>> {
  const results = new Map<string, { metric: string; pct: number }>();
  if (citySlugs.length === 0) return results;

  const { data, error } = await supabase
    .from("readings")
    .select("city_slug, metric, value, fetched_at")
    .in("city_slug", citySlugs)
    .order("fetched_at", { ascending: false })
    .limit(2000);
  if (error || !data) return results;

  const byKey = new Map<string, ReadingRow[]>();
  for (const row of data as ReadingRow[]) {
    const key = `${row.city_slug}::${row.metric}`;
    const arr = byKey.get(key) || [];
    arr.push(row);
    byKey.set(key, arr);
  }

  for (const [key, rows] of byKey) {
    if (rows.length < 2) continue;
    const latest = rows[0];
    const latestTime = new Date(latest.fetched_at).getTime();
    const prior = rows.find((r) => (latestTime - new Date(r.fetched_at).getTime()) / 36e5 >= MIN_GAP_HOURS);
    if (!prior) continue;

    const delta = Math.abs(latest.value - prior.value);
    if (delta < SIGNIFICANT_ABS_FLOOR) continue;
    const base = Math.max(Math.abs(prior.value), SIGNIFICANT_ABS_FLOOR);
    const pct = delta / base;
    if (pct < SIGNIFICANT_PCT) continue;

    const [citySlug, metric] = key.split("::");
    const existing = results.get(citySlug);
    if (!existing || pct > existing.pct) results.set(citySlug, { metric, pct });
  }

  return results;
}

Deno.serve(async (_req: Request) => {
  try {
    const privateJwk = await getVapidPrivateKeyJwk();

    const { data: watchers, error: wErr } = await supabase
      .from("city_watchers")
      .select("user_id, city_slug");
    if (wErr || !watchers) throw new Error(`city_watchers query failed: ${wErr?.message}`);

    const citySlugs = [...new Set(watchers.map((w) => w.city_slug))];
    const moves = await findSignificantMoves(citySlugs);

    let sent = 0, skippedCap = 0, skippedNoMove = 0, skippedNoSub = 0, failed = 0;

    for (const watcher of watchers) {
      const move = moves.get(watcher.city_slug);
      if (!move) { skippedNoMove++; continue; }

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth_key")
        .eq("user_id", watcher.user_id);
      if (!subs || subs.length === 0) { skippedNoSub++; continue; } // not opted in -- don't burn today's cap slot on nothing

      // Cap enforcement: the primary key IS the cap -- a conflict means
      // this (user, city, day) already got a push today.
      const { error: logErr } = await supabase
        .from("push_notification_log")
        .insert({ user_id: watcher.user_id, city_slug: watcher.city_slug, metric: move.metric });
      if (logErr) { skippedCap++; continue; }

      const payload = JSON.stringify({
        title: "Glotemp",
        body: `${watcher.city_slug} moved ${Math.round(move.pct * 100)}% on ${move.metric.replace(/_/g, " ")}.`,
        citySlug: watcher.city_slug,
      });

      for (const sub of subs) {
        try {
          const result = await sendPush(sub.endpoint, sub.p256dh, sub.auth_key, privateJwk, payload);
          if (result.ok) sent++;
          else failed++;
        } catch (e) {
          console.error(`[push-send] send failed for ${watcher.user_id}/${watcher.city_slug}: ${e.message}`);
          failed++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, skippedCap, skippedNoMove, skippedNoSub, failed }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[push-send] fatal error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
