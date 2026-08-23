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
//
// RELEVANCE CHECK (fixes a real bug, confirmed live): a search for
// "London skyline" once returned a real, well-formed, correctly-typed
// photo of San Diego ("Sandiego skyline at night.JPG"). Commons'
// generator=search is full-text relevance search, not a strict place
// match -- a generic word like "skyline" can rank an unrelated city's
// photo highly, and looksLikeRealPhoto only ever checked mime type,
// dimensions and a bad-title blocklist, never whether the result was
// actually of the requested place. locationHint extracts the leading
// run of capitalized words from `term` (image_search_term is always
// "<City name> skyline", so this reliably yields the city -- "Tokyo",
// "New York City", "Hong Kong", "Sao Paulo") and a candidate is only
// accepted if that hint appears, case-insensitively, in its title or
// Commons description. No hint extracted -> no location check applied
// (nothing reliable to check against, so this falls back to the prior
// quality-only behavior rather than rejecting everything). A qualifying
// but irrelevant photo is treated exactly like no photo at all: honest
// no_image_found, never a fallback to something merely well-formed.
//
// LIVE VERIFICATION (fixes a real, recurring bug, confirmed in Make's
// execution history): Instagram's publish step kept failing with two
// errors that trace to the same root cause --
//   9004  "Only photo or video can be accepted as media type."
//   36003 "The aspect ratio is not supported."
// Both mean this function handed Make a candidate that LOOKED fine by
// Commons' own metadata but wasn't actually postable. Two gaps caused
// it: (1) looksLikeRealPhoto trusted the `mime` Commons reports for the
// STORED file, never the content-type the thumbnail URL actually serves
// -- Commons' on-demand thumbnailer (thumb.php) can fail (a known,
// common MediaWiki failure mode for a large or malformed source file)
// and serve an HTML error page at a URL whose metadata still claims
// image/jpeg; (2) the only size check was a minimum-dimension floor,
// with no ceiling on how ELONGATED an image could be -- a real, valid
// jpeg panorama with a 5:1 or wider aspect ratio passed every check
// that existed, then failed at Instagram, outside its documented
// 4:5 (0.8) to 1.91:1 (1.91) accepted range.
//
// The fix: hasSupportedAspectRatio adds the missing ceiling/floor using
// the same width/height Commons already reports (thumbnails are scaled
// proportionally, so the ratio of the original is the ratio of whatever
// size is actually served -- no extra fetch needed for this part). And
// verifyIsDirectImage performs one real HEAD request against the exact
// URL this function is about to hand back, checking the ACTUAL served
// Content-Type rather than trusting metadata. The result: this function
// no longer picks "the first metadata-passing candidate" -- it walks
// candidates in order and only returns one that also survives a live
// check, so a broken thumbnail or an unsupported shape is skipped in
// favor of the next candidate, exactly like an irrelevant photo already
// was. If every candidate fails, the honest no_image_found response is
// what Make receives -- never a URL Instagram is going to reject.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const UA = "glo-temp.com/1.0 (+https://glo-temp.com; info@glo-temp.com)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const TIMEOUT_MS = 5000;
const MIN_DIMENSION = 400;
const THUMB_WIDTH = 1600;
const SEARCH_LIMIT = 20;

// Instagram's own documented accepted range for a feed image, width:height.
// 4:5 is the portrait floor, 1.91:1 is the landscape ceiling. A tiny
// epsilon absorbs float rounding on real-world pixel dimensions -- it
// does not meaningfully widen the range.
const MIN_ASPECT_RATIO = 4 / 5;
const MAX_ASPECT_RATIO = 1.91;
const ASPECT_EPSILON = 0.001;

const ACCEPTED_IMAGE_MIME = ["image/jpeg", "image/png"];

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
    extmetadata?: {
      LicenseShortName?: { value?: string };
      ImageDescription?: { value?: string };
    };
  }>;
}

// Uses the width/height Commons reports for the original file. Commons'
// thumb service scales proportionally -- it never crops -- so this ratio
// is the same ratio whatever size actually gets served, including the
// THUMB_WIDTH-capped thumburl this function hands back. No extra fetch
// needed to know the shape; verifyIsDirectImage below is what a real
// network call is for.
function hasSupportedAspectRatio(width: number, height: number): boolean {
  if (!width || !height) return false;
  const ratio = width / height;
  return ratio >= MIN_ASPECT_RATIO - ASPECT_EPSILON && ratio <= MAX_ASPECT_RATIO + ASPECT_EPSILON;
}

function looksLikeRealPhoto(page: CommonsPage): boolean {
  const info = page?.imageinfo?.[0];
  if (!info) return false;
  const mime = String(info.mime || "").toLowerCase();
  if (!ACCEPTED_IMAGE_MIME.includes(mime)) return false;
  if ((info.width || 0) < MIN_DIMENSION && (info.height || 0) < MIN_DIMENSION) return false;
  if (!hasSupportedAspectRatio(info.width || 0, info.height || 0)) return false;
  if (BAD_TITLE.test(stripFilePrefix(page.title || ""))) return false;
  return !!(info.thumburl || info.url);
}

// The one real network check: Commons' `mime` field describes the STORED
// file, not a guarantee about what a given URL serves right now -- the
// on-demand thumbnailer can fail and return an HTML error page at a URL
// whose metadata still claims image/jpeg. A HEAD request costs nothing
// extra to transfer and answers the only question that matters: is the
// Content-Type this URL actually serves an accepted image format.
async function verifyIsDirectImage(url: string): Promise<boolean> {
  const { signal, done } = withTimeout(TIMEOUT_MS);
  try {
    const resp = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA }, signal });
    if (!resp.ok) return false;
    const contentType = String(resp.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
    return ACCEPTED_IMAGE_MIME.includes(contentType);
  } catch (e) {
    console.error(`[social-image-fetch] Live verification failed for ${url}`, String(e));
    return false;
  } finally {
    done();
  }
}

// The leading run of capitalized words in `term` -- image_search_term is
// always "<City name> skyline", so this reliably yields just the city:
// "Tokyo", "New York City", "Hong Kong", "Sao Paulo". Returns "" if the
// term doesn't start with a capitalized word (nothing reliable to check).
function extractLocationHint(term: string): string {
  const m = /^([A-Z][\p{L}'-]*(?:\s+[A-Z][\p{L}'-]*)*)/u.exec(term.trim());
  return m ? m[1].trim() : "";
}

// Lowercases, strips diacritics, and turns underscores (Commons titles use
// them as spaces) into spaces, so "São_Paulo" and "Sao Paulo" compare equal.
function normalizeForMatch(s: string): string {
  return String(s || "")
    .replace(/_/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function matchesLocation(page: CommonsPage, hint: string): boolean {
  if (!hint) return true; // no reliable hint to check against -- don't reject on it
  const needle = normalizeForMatch(hint);
  if (!needle) return true;
  const title = normalizeForMatch(stripFilePrefix(page.title || ""));
  const description = normalizeForMatch(page?.imageinfo?.[0]?.extmetadata?.ImageDescription?.value || "");
  return title.includes(needle) || description.includes(needle);
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

  const hint = extractLocationHint(term);
  const candidates = pages.filter((p) => looksLikeRealPhoto(p) && matchesLocation(p, hint));

  // Walk candidates in Commons' own relevance order. Passing the metadata
  // checks only earns a candidate a live verification -- a candidate that
  // fails it (broken thumbnail, wrong content-type) is skipped in favor
  // of the next one, exactly like an irrelevant photo already was. Make
  // never sees a URL that wasn't actually confirmed postable.
  for (const candidate of candidates) {
    const info = candidate.imageinfo![0];
    const candidateUrl = info.thumburl || info.url!;
    if (!(await verifyIsDirectImage(candidateUrl))) {
      console.warn(`[social-image-fetch] Candidate failed live verification, trying next: ${candidateUrl}`);
      continue;
    }
    return json({
      term,
      image_url: candidateUrl,
      source: "wikimedia-commons",
      page_title: stripFilePrefix(candidate.title || ""),
      license: info.extmetadata?.LicenseShortName?.value || null,
    });
  }

  // A real, honest outcome -- not every search term resolves to a
  // qualifying, relevant, live-verified photo. Never fabricate a
  // fallback URL, and never hand back a candidate that only looked
  // right on paper.
  return json({ term, image_url: null, reason: "no_image_found" }, 200);
});
