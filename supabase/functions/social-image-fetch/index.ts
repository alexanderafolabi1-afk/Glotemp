// Real, reuse-licensed images for the social content queue, sourced
// live from Wikimedia Commons -- free, keyless, no invented approach.
//
// SAME MECHANISM AS city-of-day-photos.js / THE CITY-OF-THE-WEEK SPEC:
// Commons' action API (commons.wikimedia.org/w/api.php), queried for
// files in the File namespace (ns=6), filtered to real photographs by
// mime type (jpeg/png only -- svg is almost always a diagram, map,
// flag or logo), a minimum pixel dimension (drops icons/thumbnails),
// and a title-keyword blocklist for the common non-photo categories
// that slip through the mime filter. origin=* is Wikimedia's
// documented opt-in for anonymous cross-origin reads; no key, no auth.
//
// ONE DELIBERATE DIFFERENCE FROM city-of-day-photos.js: that file
// looks up a fixed Commons category (Category:<CityName>) because it
// always has a real city name to work with. image_search_term here is
// free-text ("Tokyo skyline or Shinjuku crossing, wide shot, golden
// hour if available") -- a literal Category: lookup on that string
// would return nothing for almost every row. So this function uses
// Commons' generator=search instead of generator=categorymembers --
// same API, same app, same filtering rules, just the query type
// suited to a free-text term instead of an exact category name.
//
// NEVER A PLACEHOLDER. If nothing passes the filters, this returns a
// clear "no image found" response, not a fabricated or generic URL --
// the caller (social-next-post) decides what to do with that, but it
// will never be silently handed a fake image.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const UA = "glo-temp.com/1.0 (+https://glo-temp.com; info@glo-temp.com)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const TIMEOUT_MS = 5000;
const MIN_DIMENSION = 400;
const THUMB_WIDTH = 1600;
const SEARCH_LIMIT = 20;

const BAD_TITLE = /logo|coat[\s_]of[\s_]arms|seal[\s_]of|flag[\s_]of|\bmap\b|diagram|chart|icon|emblem|locator/i;

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

function stripFilePrefix(title: string): string {
  return String(title || "").replace(/^File:/i, "");
}

interface CommonsPage {
  title?: string;
  imageinfo?: Array<{
    mime?: string;
    width?: number;
    height?: number;
    url?: string;
    thumburl?: string;
    extmetadata?: { LicenseShortName?: { value?: string } };
  }>;
}

function looksLikeRealPhoto(page: CommonsPage): boolean {
  const info = page?.imageinfo?.[0];
  if (!info) return false;
  const mime = String(info.mime || "").toLowerCase();
  if (mime !== "image/jpeg" && mime !== "image/png") return false;
  if ((info.width || 0) < MIN_DIMENSION && (info.height || 0) < MIN_DIMENSION) return false;
  if (BAD_TITLE.test(stripFilePrefix(page.title || ""))) return false;
  return !!(info.thumburl || info.url);
}

async function searchCommons(term: string): Promise<CommonsPage[] | null> {
  const { signal, done } = withTimeout(TIMEOUT_MS);
  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `filetype:bitmap ${term}`,
      gsrnamespace: "6",
      gsrlimit: String(SEARCH_LIMIT),
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: String(THUMB_WIDTH),
      format: "json",
      origin: "*",
    });
    const resp = await fetch(`${COMMONS_API}?${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal,
    });
    if (!resp.ok) {
      console.error(`[social-image-fetch] Commons search HTTP ${resp.status} for "${term}"`);
      return null;
    }
    const data = await resp.json();
    const pages = data?.query?.pages;
    if (!pages) return []; // no results is a real, legitimate outcome
    return Object.values(pages) as CommonsPage[];
  } catch (e) {
    console.error(`[social-image-fetch] Commons search exception for "${term}"`, String(e));
    return null;
  } finally {
    done();
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const term = (url.searchParams.get("term") || "").trim();
  if (!term) return json({ error: "missing_term" }, 400);

  const pages = await searchCommons(term);
  if (pages === null) {
    return json({ term, image_url: null, error: "commons_fetch_failed" }, 502);
  }

  const match = pages.find(looksLikeRealPhoto);
  if (!match) {
    // A real, honest outcome -- not every search term resolves to a
    // qualifying photo. Never fabricate a fallback URL here.
    return json({ term, image_url: null, reason: "no_image_found" }, 200);
  }

  const info = match.imageinfo![0];
  return json({
    term,
    image_url: info.thumburl || info.url,
    source: "wikimedia-commons",
    page_title: stripFilePrefix(match.title || ""),
    license: info.extmetadata?.LicenseShortName?.value || null,
  });
});
