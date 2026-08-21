// Serves the Instagram/Facebook share card: exactly 1080x1080, always.
//
// THIS IS THE ENDPOINT THE AUTOMATION FETCHES FOR THE IMAGE.
// social-next-post hands Make a URL pointing here, Make hands it to the
// Graph API, and the Graph API downloads these bytes. Before this
// function existed, that URL was a raw Wikimedia Commons thumbnail
// (iiurlwidth=1600) whose height was whatever the source photograph's
// aspect ratio produced -- a skyline panorama arrives at roughly
// 1600x450, which is 3.6:1. Instagram accepts 4:5 to 1.91:1 and
// rejected every one of them with error 36003, then deactivated the
// automation. Nothing in the old path ever looked at the shape.
//
// WHAT THIS DOES
//   1. Resolves a real, reuse-licensed photograph by calling
//      social-image-fetch -- that function keeps its job, this one does
//      not duplicate its Commons search, its licence filtering or its
//      relevance check.
//   2. Downloads the photograph and inlines it into an SVG card built
//      by _shared/social-card.ts, composed onto a square rather than
//      cropped out of one.
//   3. Rasterises to PNG at exactly CARD_PX x CARD_PX.
//   4. Checks the finished bytes really are 1080x1080, and refuses to
//      serve them if not.
//
// THE GUARD IS ON THE BYTES, NOT ON THE REQUEST
// assertSquare() reads the PNG's own IHDR header. Asking the rasteriser
// for 1080 and being handed 1080 are two different claims, and it is
// the served bytes Instagram measures. A failure logs the actual
// dimensions and returns 500: it never serves a wrongly-shaped image,
// because a wrongly-shaped image is what deactivated the account.
//
// NO PHOTO IS NOT AN ERROR
// If Commons has nothing qualifying, the card still renders -- brand
// ground, frame and mark, still exactly 1080x1080. A missing photograph
// makes a plainer post; it does not make a wrongly-shaped one, and it
// does not make a fabricated one. Nothing here invents an image.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { initWasm, Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";
import {
  assertSquare,
  buildCardSVG,
  CARD_PX,
  CardSizeError,
} from "../_shared/social-card.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const IMAGE_FETCH_URL = Deno.env.get("SOCIAL_IMAGE_FETCH_URL")
  ?? `${SUPABASE_URL}/functions/v1/social-image-fetch`;

const WASM_URL = "https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm";
const UA = "glo-temp.com/1.0 (+https://glo-temp.com; info@glo-temp.com)";
const TIMEOUT_MS = 8000;
// A Commons thumbnail at iiurlwidth=1600 is comfortably under this.
// The cap exists so one enormous file cannot exhaust the function's
// memory; over it, the card renders without the photograph rather than
// failing the whole post.
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

// initWasm() may only be called once per isolate. Cached as a promise
// so concurrent requests during a cold start all await the same init
// instead of racing into a second one.
let wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = (async () => {
      const resp = await fetch(WASM_URL);
      if (!resp.ok) throw new Error(`resvg wasm HTTP ${resp.status}`);
      await initWasm(await resp.arrayBuffer());
    })().catch((e) => {
      // Let the next request retry rather than caching a permanent
      // failure for the lifetime of the isolate.
      wasmReady = null;
      throw e;
    });
  }
  return wasmReady;
}

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

function toBase64(bytes: Uint8Array): string {
  // Chunked: String.fromCharCode(...bytes) on a multi-megabyte array
  // blows the argument limit.
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

async function resolvePhotoURL(term: string): Promise<string | null> {
  const { signal, done } = withTimeout(TIMEOUT_MS);
  try {
    const resp = await fetch(`${IMAGE_FETCH_URL}?term=${encodeURIComponent(term)}`, { signal });
    if (!resp.ok) {
      console.error(`[social-card] image fetch HTTP ${resp.status} for "${term}"`);
      return null;
    }
    const data = await resp.json();
    return data?.image_url ?? null;
  } catch (e) {
    console.error(`[social-card] image fetch failed for "${term}"`, String(e));
    return null;
  } finally {
    done();
  }
}

async function inlinePhoto(url: string): Promise<string | null> {
  const { signal, done } = withTimeout(TIMEOUT_MS);
  try {
    const resp = await fetch(url, { headers: { "User-Agent": UA }, signal });
    if (!resp.ok) {
      console.error(`[social-card] photo download HTTP ${resp.status} for ${url}`);
      return null;
    }
    const type = (resp.headers.get("content-type") || "").split(";")[0].trim();
    if (type !== "image/jpeg" && type !== "image/png") {
      console.error(`[social-card] photo is ${type || "untyped"}, not jpeg/png: ${url}`);
      return null;
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.byteLength > MAX_PHOTO_BYTES) {
      console.error(`[social-card] photo ${buf.byteLength} bytes exceeds cap: ${url}`);
      return null;
    }
    return `data:${type};base64,${toBase64(buf)}`;
  } catch (e) {
    console.error(`[social-card] photo download failed for ${url}`, String(e));
    return null;
  } finally {
    done();
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const term = (url.searchParams.get("term") || "").trim();
  const accent = url.searchParams.get("accent");

  try {
    await ensureWasm();
  } catch (e) {
    console.error("[social-card] resvg init failed", String(e));
    return json({ error: "rasteriser_unavailable" }, 503);
  }

  // A photograph is optional; the card is not. See the header note.
  let photoData: string | null = null;
  let photoURL: string | null = null;
  if (term) {
    photoURL = await resolvePhotoURL(term);
    if (photoURL) photoData = await inlinePhoto(photoURL);
  }

  let png: Uint8Array;
  try {
    const svg = buildCardSVG({ photo: photoData, accent });
    // fitTo width is belt to the SVG's own braces: the document is
    // already CARD_PX square, and this pins the raster to the same
    // number so neither can drift from the other.
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: CARD_PX } });
    png = resvg.render().asPng();
  } catch (e) {
    console.error(`[social-card] render failed for "${term}"`, String(e));
    return json({ error: "render_failed" }, 500);
  }

  // The guard. Nothing leaves this function without passing it.
  try {
    assertSquare(png);
  } catch (e) {
    const got = e instanceof CardSizeError ? e.got : "unknown";
    console.error(
      `[social-card] REJECTED: card for "${term}" measured ${got}, ` +
      `expected ${CARD_PX}x${CARD_PX}. Not serving -- a wrongly-shaped ` +
      `image is what Instagram error 36003 deactivated the automation over. ` +
      `photo=${photoURL ?? "none"}`,
    );
    return json({ error: "card_dimension_check_failed", expected: `${CARD_PX}x${CARD_PX}`, got }, 500);
  }

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.byteLength),
      // The queue row for a given term is stable, and the Graph API may
      // fetch the same URL more than once across a retry.
      "Cache-Control": "public, max-age=86400",
      "X-Card-Size": `${CARD_PX}x${CARD_PX}`,
    },
  });
});
