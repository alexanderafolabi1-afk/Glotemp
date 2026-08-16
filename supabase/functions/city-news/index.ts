// Local press for a city, fetched server side.
//
// WHY THIS EXISTS AT ALL
// city-news.js originally called api.gdeltproject.org straight from the
// browser. GDELT sends no Access-Control-Allow-Origin header, so every
// one of those requests was blocked by the browser before any response
// could be read. The client's catch turned that into "Nothing filed",
// which looked like a city with no coverage rather than a request that
// never completed. It failed the same way for all 151 cities.
//
// Server to server has no CORS check, so the fetch simply works. This
// function is the only thing that talks to GDELT, and it sets the CORS
// headers the browser needs on the way back out.
//
// THE QUERY
// The old one was `"Warsaw" "Poland"`, and two quoted phrases in GDELT
// are an implicit AND: both must appear in the article. Local Polish
// coverage of Warsaw very rarely contains the word "Poland", so that
// query would have returned almost nothing even with CORS fixed. The
// city name alone is the high-recall query, and ambiguity (there is a
// Santiago in several countries) is a smaller problem than zero results.
//
// Nothing is written, rewritten or summarised here. Each item is a real
// headline from a real outlet, passed through with its own link.

const GDELT = "https://api.gdeltproject.org/api/v2/doc/doc";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

type Article = {
  title?: string;
  url?: string;
  domain?: string;
  language?: string;
  seendate?: string;
};

async function ask(query: string, timespan?: string): Promise<Article[]> {
  const params = new URLSearchParams({
    query,
    mode: "ArtList",
    maxrecords: "75",
    sort: "DateDesc",
    format: "json",
  });
  if (timespan) params.set("timespan", timespan);

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const resp = await fetch(`${GDELT}?${params}`, {
      signal: ctl.signal,
      // GDELT throttles unidentified clients harder than identified ones.
      headers: { "User-Agent": "glo-temp.com/1.0 (+https://glo-temp.com)" },
    });
    if (!resp.ok) return [];
    // GDELT answers a rate-limited or malformed query with a text body
    // and a 200, so this cannot assume JSON just because the status is ok.
    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      return Array.isArray(data?.articles) ? data.articles : [];
    } catch {
      return [];
    }
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// One item per outlet, and no repeated headline. Breaking news gets
// syndicated, and six copies of one story reads as a broken feed rather
// than a busy city.
function distinct(articles: Article[], limit: number): Article[] {
  const seenDomain = new Set<string>();
  const seenTitle = new Set<string>();
  const out: Article[] = [];
  for (const a of articles) {
    if (!a?.title || !a?.url) continue;
    if (!/^https?:\/\//i.test(a.url)) continue;
    const d = String(a.domain ?? "").toLowerCase();
    const t = String(a.title).toLowerCase().slice(0, 60);
    if (seenDomain.has(d) || seenTitle.has(t)) continue;
    seenDomain.add(d);
    seenTitle.add(t);
    out.push({
      title: a.title,
      url: a.url,
      domain: a.domain ?? "",
      language: a.language ?? "",
      seendate: a.seendate ?? "",
    });
    if (out.length >= limit) break;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET") return json({ error: "method_not_allowed", articles: [] }, 405);

  const url = new URL(req.url);
  const city = (url.searchParams.get("city") ?? "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 6) || 6, 1), 20);

  if (!city || city.length > 60) {
    return json({ error: "bad_city", articles: [] }, 400);
  }

  // Quotes make it a phrase, so "New York" cannot match "new" and "york"
  // separately. Any quote the caller sent is stripped first so the phrase
  // cannot be broken open.
  const phrase = `"${city.replace(/["\\]/g, "")}"`;

  // Widen only if needed. The default window is a few days, which is what
  // a feed should show; falling back to a month means a quiet city still
  // has something rather than an empty panel.
  let articles = await ask(phrase);
  if (articles.length === 0) articles = await ask(phrase, "1w");
  if (articles.length === 0) articles = await ask(phrase, "1m");

  const items = distinct(articles, limit);

  return json(
    { city, count: items.length, articles: items },
    200,
    // A news feed does not change second to second and GDELT rate limits
    // by caller, so this is cached hard at the edge. s-maxage covers the
    // shared cache; stale-while-revalidate keeps it instant while it
    // refreshes behind the reader.
    { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" },
  );
});
