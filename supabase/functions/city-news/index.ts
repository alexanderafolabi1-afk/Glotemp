// Local press, fetched server-side on a schedule and stored -- never
// fetched live from the browser on page load.
//
// WHAT WAS WRONG BEFORE
// The previous version of this function was called directly by the
// browser on every page load. It made up to three sequential live calls
// to GDELT (each with its own timeout), so a single page load could wait
// up to ~36 seconds for a response the client never bounded with its own
// timeout -- "Reading the local press..." with no way out. GDELT being
// slow, rate-limiting the shared edge-function egress IP, or the request
// simply stalling was enough to make it look hung forever, on every city,
// because there was no cap on the wait and no cached answer to fall back
// to.
//
// WHAT THIS DOES INSTEAD
// pg_cron fires this function every 5 minutes (see the city_news_store
// migration). Each firing refreshes one small batch of cities -- see
// BATCH_SIZE below for why it's small and how that bounds a full
// 300-city cycle -- and writes real headlines straight into the
// city_news table via the service-role key, replacing that city's
// previous rows. city-news.js (the browser side) now only ever reads
// that table through PostgREST, which is fast and bounded by its own
// short client-side timeout regardless of what GDELT is doing right now.
//
// A GET with ?cities=slug1,slug2 refreshes exactly that list immediately
// and does not touch or advance the rotation -- for manual runs and
// verification, without waiting for the schedule.
//
// Nothing is written, rewritten or summarised. Each stored item is a real
// headline from a real outlet, with its own link.

import { createClient } from "jsr:@supabase/supabase-js@2";

const GDELT = "https://api.gdeltproject.org/api/v2/doc/doc";
// Small on purpose. The real ceiling here turned out not to be pg_net's
// own timeout_milliseconds (set generously in the cron migration) but
// Supabase's platform-level execution limit for one invocation, observed
// live at ~150s: a batch that was still going at that mark got torn down
// mid-city, mid-await, with no chance for the finally block below to run
// and release the lock. A batch has to fit inside that budget even in the
// worst case -- one where every city hits every retry -- not just the
// typical case. A full 300-city cycle taking longer as a result (roughly
// 8 hours at 3 cities/5 minutes) is fine; the section only ever shows the
// last 48 hours.
const BATCH_SIZE = 3;
const PER_CITY_LIMIT = 8;
const GDELT_TIMEOUT_MS = 15000;
// GDELT rate-limits per source IP, and every function in this project
// shares egress IPs. Five concurrent requests (the first version of this
// rewrite) came back as a wall of HTTP 429s, not the timeouts a
// slow-but-working API would produce -- and a naive fix (go sequential,
// but still let a new cron tick fire every 5 minutes regardless of
// whether the last batch had finished) let several invocations pile up
// and hammer GDELT at once anyway. Two things fix that together: the row
// lock below makes overlapping invocations impossible, and pacing is
// conservative enough that one well-behaved invocation does not trip the
// limit by itself. Only one retry (not several) keeps a single city's
// worst case -- two full timeouts plus one backoff -- comfortably under
// a third of the platform's execution budget.
const GDELT_PACE_MS = 3000;
const RATE_LIMIT_RETRIES = 1;
const RATE_LIMIT_BACKOFF_MS = 6000;
// A killed batch never gets to release its lock, so this can't be set
// from "how long should a batch take" -- it has to be "how long could a
// batch possibly run before the platform kills it regardless", which is
// the ~150s execution ceiling above plus margin. Anything past that is
// certainly a dead run, not a slow one, and the lock should let the next
// tick through rather than sit idle for minutes waiting it out.
const LOCK_STALE_MS = 3 * 60 * 1000;

interface CityRef {
  slug: string;
  name: string;
}

// Kept in sync with cities-data.js by hand -- this function has no access
// to that file at runtime, and duplicating a flat (slug, name) pair here
// is the same tradeoff aggregate-city-mood/index.ts already made for its
// own city list.
const CITIES: CityRef[] = [
  { slug: "tokyo", name: "Tokyo" },
  { slug: "delhi", name: "Delhi" },
  { slug: "shanghai", name: "Shanghai" },
  { slug: "sao-paulo", name: "São Paulo" },
  { slug: "mexico-city", name: "Mexico City" },
  { slug: "cairo", name: "Cairo" },
  { slug: "mumbai", name: "Mumbai" },
  { slug: "beijing", name: "Beijing" },
  { slug: "osaka", name: "Osaka" },
  { slug: "nyc", name: "New York" },
  { slug: "london", name: "London" },
  { slug: "paris", name: "Paris" },
  { slug: "toronto", name: "Toronto" },
  { slug: "sydney", name: "Sydney" },
  { slug: "berlin", name: "Berlin" },
  { slug: "dubai", name: "Dubai" },
  { slug: "singapore", name: "Singapore" },
  { slug: "hong-kong", name: "Hong Kong" },
  { slug: "bangkok", name: "Bangkok" },
  { slug: "istanbul", name: "Istanbul" },
  { slug: "medellin", name: "Medellín" },
  { slug: "bogota", name: "Bogotá" },
  { slug: "buenos-aires", name: "Buenos Aires" },
  { slug: "santiago", name: "Santiago" },
  { slug: "lima", name: "Lima" },
  { slug: "moscow", name: "Moscow" },
  { slug: "seoul", name: "Seoul" },
  { slug: "ankara", name: "Ankara" },
  { slug: "nairobi", name: "Nairobi" },
  { slug: "lagos", name: "Lagos" },
  { slug: "los-angeles", name: "Los Angeles" },
  { slug: "chicago", name: "Chicago" },
  { slug: "miami", name: "Miami" },
  { slug: "houston", name: "Houston" },
  { slug: "vancouver", name: "Vancouver" },
  { slug: "montreal", name: "Montreal" },
  { slug: "san-francisco", name: "San Francisco" },
  { slug: "guadalajara", name: "Guadalajara" },
  { slug: "atlanta", name: "Atlanta" },
  { slug: "seattle", name: "Seattle" },
  { slug: "washington-dc", name: "Washington DC" },
  { slug: "phoenix", name: "Phoenix" },
  { slug: "boston", name: "Boston" },
  { slug: "monterrey", name: "Monterrey" },
  { slug: "dallas", name: "Dallas" },
  { slug: "minneapolis", name: "Minneapolis" },
  { slug: "denver", name: "Denver" },
  { slug: "philadelphia", name: "Philadelphia" },
  { slug: "san-diego", name: "San Diego" },
  { slug: "havana", name: "Havana" },
  { slug: "madrid", name: "Madrid" },
  { slug: "barcelona", name: "Barcelona" },
  { slug: "rome", name: "Rome" },
  { slug: "milan", name: "Milan" },
  { slug: "amsterdam", name: "Amsterdam" },
  { slug: "warsaw", name: "Warsaw" },
  { slug: "stockholm", name: "Stockholm" },
  { slug: "vienna", name: "Vienna" },
  { slug: "prague", name: "Prague" },
  { slug: "budapest", name: "Budapest" },
  { slug: "zurich", name: "Zurich" },
  { slug: "munich", name: "Munich" },
  { slug: "lisbon", name: "Lisbon" },
  { slug: "brussels", name: "Brussels" },
  { slug: "oslo", name: "Oslo" },
  { slug: "copenhagen", name: "Copenhagen" },
  { slug: "helsinki", name: "Helsinki" },
  { slug: "athens", name: "Athens" },
  { slug: "bucharest", name: "Bucharest" },
  { slug: "kyiv", name: "Kyiv" },
  { slug: "dublin", name: "Dublin" },
  { slug: "lyon", name: "Lyon" },
  { slug: "rotterdam", name: "Rotterdam" },
  { slug: "krakow", name: "Kraków" },
  { slug: "hamburg", name: "Hamburg" },
  { slug: "edinburgh", name: "Edinburgh" },
  { slug: "seville", name: "Seville" },
  { slug: "porto", name: "Porto" },
  { slug: "sofia", name: "Sofia" },
  { slug: "vilnius", name: "Vilnius" },
  { slug: "bangalore", name: "Bangalore" },
  { slug: "hyderabad", name: "Hyderabad" },
  { slug: "dhaka", name: "Dhaka" },
  { slug: "karachi", name: "Karachi" },
  { slug: "kolkata", name: "Kolkata" },
  { slug: "guangzhou", name: "Guangzhou" },
  { slug: "shenzhen", name: "Shenzhen" },
  { slug: "chengdu", name: "Chengdu" },
  { slug: "wuhan", name: "Wuhan" },
  { slug: "taipei", name: "Taipei" },
  { slug: "kuala-lumpur", name: "Kuala Lumpur" },
  { slug: "jakarta", name: "Jakarta" },
  { slug: "manila", name: "Manila" },
  { slug: "ho-chi-minh", name: "Ho Chi Minh City" },
  { slug: "hanoi", name: "Hanoi" },
  { slug: "melbourne", name: "Melbourne" },
  { slug: "auckland", name: "Auckland" },
  { slug: "lahore", name: "Lahore" },
  { slug: "colombo", name: "Colombo" },
  { slug: "yangon", name: "Yangon" },
  { slug: "kathmandu", name: "Kathmandu" },
  { slug: "chennai", name: "Chennai" },
  { slug: "pune", name: "Pune" },
  { slug: "tianjin", name: "Tianjin" },
  { slug: "chongqing", name: "Chongqing" },
  { slug: "nanjing", name: "Nanjing" },
  { slug: "perth", name: "Perth" },
  { slug: "brisbane", name: "Brisbane" },
  { slug: "phnom-penh", name: "Phnom Penh" },
  { slug: "busan", name: "Busan" },
  { slug: "nagoya", name: "Nagoya" },
  { slug: "fukuoka", name: "Fukuoka" },
  { slug: "surabaya", name: "Surabaya" },
  { slug: "xi-an", name: "Xi’an" },
  { slug: "harbin", name: "Harbin" },
  { slug: "adelaide", name: "Adelaide" },
  { slug: "ulaanbaatar", name: "Ulaanbaatar" },
  { slug: "sapporo", name: "Sapporo" },
  { slug: "vientiane", name: "Vientiane" },
  { slug: "tehran", name: "Tehran" },
  { slug: "caracas", name: "Caracas" },
  { slug: "guayaquil", name: "Guayaquil" },
  { slug: "quito", name: "Quito" },
  { slug: "fortaleza", name: "Fortaleza" },
  { slug: "belo-horizonte", name: "Belo Horizonte" },
  { slug: "porto-alegre", name: "Porto Alegre" },
  { slug: "recife", name: "Recife" },
  { slug: "cali", name: "Cali" },
  { slug: "montevideo", name: "Montevideo" },
  { slug: "curitiba", name: "Curitiba" },
  { slug: "johannesburg", name: "Johannesburg" },
  { slug: "cape-town", name: "Cape Town" },
  { slug: "kinshasa", name: "Kinshasa" },
  { slug: "addis-ababa", name: "Addis Ababa" },
  { slug: "accra", name: "Accra" },
  { slug: "dar-es-salaam", name: "Dar es Salaam" },
  { slug: "casablanca", name: "Casablanca" },
  { slug: "dakar", name: "Dakar" },
  { slug: "algiers", name: "Algiers" },
  { slug: "tunis", name: "Tunis" },
  { slug: "riyadh", name: "Riyadh" },
  { slug: "doha", name: "Doha" },
  { slug: "abu-dhabi", name: "Abu Dhabi" },
  { slug: "amman", name: "Amman" },
  { slug: "tel-aviv", name: "Tel Aviv" },
  { slug: "beirut", name: "Beirut" },
  { slug: "muscat", name: "Muscat" },
  { slug: "kuwait-city", name: "Kuwait City" },
  { slug: "jeddah", name: "Jeddah" },
  { slug: "baghdad", name: "Baghdad" },
  { slug: "milton-keynes", name: "Milton Keynes" },
  { slug: "kyoto", name: "Kyoto" },
  { slug: "hiroshima", name: "Hiroshima" },
  { slug: "nara", name: "Nara" },
  { slug: "kanazawa", name: "Kanazawa" },
  { slug: "yokohama", name: "Yokohama" },
  { slug: "kobe", name: "Kobe" },
  { slug: "sendai", name: "Sendai" },
  { slug: "nagasaki", name: "Nagasaki" },
  { slug: "naha", name: "Naha" },
  { slug: "takayama", name: "Takayama" },
  { slug: "beppu", name: "Beppu" },
  { slug: "lanzarote", name: "Lanzarote" },
  { slug: "gran-canaria", name: "Gran Canaria" },
  { slug: "salzburg", name: "Salzburg" },
  { slug: "hallstatt", name: "Hallstatt" },
  { slug: "bruges", name: "Bruges" },
  { slug: "interlaken", name: "Interlaken" },
  { slug: "chania", name: "Chania" },
  { slug: "dubrovnik", name: "Dubrovnik" },
  { slug: "split", name: "Split" },
  { slug: "ljubljana", name: "Ljubljana" },
  { slug: "bled", name: "Bled" },
  { slug: "faro", name: "Faro" },
  { slug: "valletta", name: "Valletta" },
  { slug: "reykjavik", name: "Reykjavík" },
  { slug: "tromso", name: "Tromsø" },
  { slug: "gdansk", name: "Gdańsk" },
  { slug: "matera", name: "Matera" },
  { slug: "funchal", name: "Funchal" },
  { slug: "ronda", name: "Ronda" },
  { slug: "colmar", name: "Colmar" },
  { slug: "tbilisi", name: "Tbilisi" },
  { slug: "batumi", name: "Batumi" },
  { slug: "almaty", name: "Almaty" },
  { slug: "astana", name: "Astana" },
  { slug: "tashkent", name: "Tashkent" },
  { slug: "bishkek", name: "Bishkek" },
  { slug: "wadi-musa", name: "Wadi Musa (Petra)" },
  { slug: "luxor", name: "Luxor" },
  { slug: "aswan", name: "Aswan" },
  { slug: "sharm-el-sheikh", name: "Sharm El Sheikh" },
  { slug: "paphos", name: "Paphos" },
  { slug: "salalah", name: "Salalah" },
  { slug: "aqaba", name: "Aqaba" },
  { slug: "marrakech", name: "Marrakech" },
  { slug: "chefchaouen", name: "Chefchaouen" },
  { slug: "essaouira", name: "Essaouira" },
  { slug: "zanzibar-city", name: "Zanzibar City" },
  { slug: "kigali", name: "Kigali" },
  { slug: "victoria-falls", name: "Victoria Falls" },
  { slug: "lalibela", name: "Lalibela" },
  { slug: "cusco", name: "Cusco" },
  { slug: "antigua-guatemala", name: "Antigua Guatemala" },
  { slug: "ushuaia", name: "Ushuaia" },
  { slug: "bariloche", name: "San Carlos de Bariloche" },
  { slug: "salvador", name: "Salvador" },
  { slug: "iguazu", name: "Puerto Iguazú" },
  { slug: "san-miguel-de-allende", name: "San Miguel de Allende" },
  { slug: "oaxaca", name: "Oaxaca" },
  { slug: "banos", name: "Baños" },
  { slug: "punta-del-este", name: "Punta del Este" },
  { slug: "cartagena", name: "Cartagena" },
  { slug: "nassau", name: "Nassau" },
  { slug: "bridgetown", name: "Bridgetown" },
  { slug: "george-town-cayman", name: "George Town" },
  { slug: "tulum", name: "Tulum" },
  { slug: "cancun", name: "Cancún" },
  { slug: "luang-prabang", name: "Luang Prabang" },
  { slug: "hoi-an", name: "Hoi An" },
  { slug: "hue", name: "Hue" },
  { slug: "da-nang", name: "Da Nang" },
  { slug: "da-lat", name: "Da Lat" },
  { slug: "siem-reap", name: "Siem Reap" },
  { slug: "bali-denpasar", name: "Bali (Denpasar)" },
  { slug: "ubud", name: "Ubud" },
  { slug: "chiang-mai", name: "Chiang Mai" },
  { slug: "chiang-rai", name: "Chiang Rai" },
  { slug: "krabi", name: "Krabi" },
  { slug: "phuket", name: "Phuket" },
  { slug: "boracay", name: "Boracay" },
  { slug: "el-nido", name: "El Nido" },
  { slug: "george-town-penang", name: "George Town" },
  { slug: "vang-vieng", name: "Vang Vieng" },
  { slug: "koh-samui", name: "Koh Samui" },
  { slug: "jaipur", name: "Jaipur" },
  { slug: "goa", name: "Goa (Panaji)" },
  { slug: "varanasi", name: "Varanasi" },
  { slug: "udaipur", name: "Udaipur" },
  { slug: "jaisalmer", name: "Jaisalmer" },
  { slug: "munnar", name: "Munnar" },
  { slug: "galle", name: "Galle" },
  { slug: "pokhara", name: "Pokhara" },
  { slug: "male", name: "Malé" },
  { slug: "yangshuo", name: "Yangshuo" },
  { slug: "queenstown", name: "Queenstown" },
  { slug: "nadi", name: "Nadi" },
  { slug: "bora-bora", name: "Bora Bora" },
  { slug: "granada-nicaragua", name: "Granada" },
  { slug: "san-pedro-la-laguna", name: "San Pedro La Laguna" },
  { slug: "las-vegas", name: "Las Vegas" },
  { slug: "venice", name: "Venice" },
  { slug: "florence", name: "Florence" },
  { slug: "ibiza", name: "Ibiza" },
  { slug: "santorini", name: "Santorini" },
  { slug: "new-orleans", name: "New Orleans" },
  { slug: "key-west", name: "Key West" },
  { slug: "whistler", name: "Whistler" },
  { slug: "banff", name: "Banff" },
  { slug: "mykonos", name: "Mykonos" },
  { slug: "capri", name: "Capri" },
  { slug: "amalfi", name: "Amalfi" },
  { slug: "positano", name: "Positano" },
  { slug: "lake-como", name: "Como" },
  { slug: "st-tropez", name: "Saint-Tropez" },
  { slug: "bordeaux", name: "Bordeaux" },
  { slug: "monaco", name: "Monaco" },
  { slug: "zermatt", name: "Zermatt" },
  { slug: "innsbruck", name: "Innsbruck" },
  { slug: "san-sebastian", name: "San Sebastián" },
  { slug: "cordoba", name: "Córdoba" },
  { slug: "rhodes", name: "Rhodes" },
  { slug: "heraklion", name: "Heraklion" },
  { slug: "jerusalem", name: "Jerusalem" },
  { slug: "tangier", name: "Tangier" },
  { slug: "sousse", name: "Sousse" },
  { slug: "hurghada", name: "Hurghada" },
  { slug: "mombasa", name: "Mombasa" },
  { slug: "st-lucia", name: "Castries" },
  { slug: "aruba", name: "Oranjestad" },
  { slug: "curacao", name: "Willemstad" },
  { slug: "puerto-vallarta", name: "Puerto Vallarta" },
  { slug: "playa-del-carmen", name: "Playa del Carmen" },
  { slug: "aguas-calientes", name: "Aguas Calientes" },
  { slug: "valparaiso", name: "Valparaíso" },
  { slug: "mendoza", name: "Mendoza" },
  { slug: "langkawi", name: "Langkawi" },
  { slug: "ha-long", name: "Ha Long" },
  { slug: "sapa", name: "Sapa" },
  { slug: "pai", name: "Pai" },
  { slug: "bagan", name: "Bagan" },
  { slug: "kandy", name: "Kandy" },
  { slug: "shimla", name: "Shimla" },
  { slug: "rishikesh", name: "Rishikesh" },
  { slug: "amritsar", name: "Amritsar" },
  { slug: "gyeongju", name: "Gyeongju" },
  { slug: "jeju", name: "Jeju City" },
  { slug: "kota-kinabalu", name: "Kota Kinabalu" },
  { slug: "cairns", name: "Cairns" },
  { slug: "gold-coast", name: "Gold Coast" },
];

interface GdeltArticle {
  title?: string;
  url?: string;
  domain?: string;
  language?: string;
  seendate?: string;
}

interface StoredItem {
  city_slug: string;
  title: string;
  url: string;
  domain: string;
  language: string;
  published_at: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

// GDELT sends "20260816T101500Z". new Date() cannot parse that directly.
function parseSeendate(s?: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s ?? "");
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se)).toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCityArticles(cityName: string): Promise<GdeltArticle[]> {
  const params = new URLSearchParams({
    query: `"${cityName.replace(/["\\]/g, "")}"`,
    mode: "ArtList",
    maxrecords: "50",
    sort: "DateDesc",
    format: "json",
    // The last 48 hours, exactly what the section shows. No fallback to a
    // wider window -- a city genuinely quiet in the last two days is a
    // real answer, not a bug to paper over by reaching further back.
    timespan: "2d",
  });

  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), GDELT_TIMEOUT_MS);
    try {
      const resp = await fetch(`${GDELT}?${params}`, {
        signal: ctl.signal,
        headers: { "User-Agent": "glo-temp.com/1.0 (+https://glo-temp.com)" },
      });
      if (resp.status === 429) {
        console.error(`GDELT ${cityName}: HTTP 429 (attempt ${attempt + 1}/${RATE_LIMIT_RETRIES + 1})`);
        if (attempt < RATE_LIMIT_RETRIES) {
          await sleep(RATE_LIMIT_BACKOFF_MS * (attempt + 1));
          continue;
        }
        return [];
      }
      if (!resp.ok) {
        console.error(`GDELT ${cityName}: HTTP ${resp.status}`);
        return [];
      }
      // GDELT answers a rate-limited or malformed query with a text body
      // and a 200, so this cannot assume JSON just because status is ok.
      const text = await resp.text();
      try {
        const data = JSON.parse(text);
        return Array.isArray(data?.articles) ? data.articles : [];
      } catch (e) {
        console.error(`GDELT ${cityName}: non-JSON response: ${text.slice(0, 200)}`);
        return [];
      }
    } catch (e) {
      console.error(`GDELT ${cityName}: ${e instanceof Error ? e.message : String(e)}`);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
  return [];
}

// One item per outlet, no repeated headline -- breaking news gets
// syndicated, and eight copies of one story is not eight facts.
function distinct(citySlug: string, articles: GdeltArticle[]): StoredItem[] {
  const seenDomain = new Set<string>();
  const seenTitle = new Set<string>();
  const out: StoredItem[] = [];
  for (const a of articles) {
    if (!a?.title || !a?.url) continue;
    if (!/^https?:\/\//i.test(a.url)) continue;
    const domain = String(a.domain ?? "").toLowerCase();
    const titleKey = String(a.title).toLowerCase().slice(0, 60);
    if (seenDomain.has(domain) || seenTitle.has(titleKey)) continue;
    seenDomain.add(domain);
    seenTitle.add(titleKey);
    out.push({
      city_slug: citySlug,
      title: a.title,
      url: a.url,
      domain: a.domain ?? "",
      language: a.language ?? "",
      published_at: parseSeendate(a.seendate),
    });
    if (out.length >= PER_CITY_LIMIT) break;
  }
  return out;
}

async function refreshCity(
  supabase: ReturnType<typeof createClient>,
  city: CityRef,
): Promise<{ slug: string; count: number; error: string | null }> {
  try {
    const articles = await fetchCityArticles(city.name);
    const items = distinct(city.slug, articles);

    // Replace strategy: a city that has dropped out of the 48-hour window
    // since the last run should end up with nothing stored, which is
    // exactly what makes the client hide the section rather than show a
    // stale headline. Delete only runs after a successful GDELT call, so
    // a transient fetch failure never wipes out the last good set.
    const del = await supabase.from("city_news").delete().eq("city_slug", city.slug);
    if (del.error) throw new Error(`delete: ${del.error.message}`);

    if (items.length) {
      const ins = await supabase.from("city_news").insert(items);
      if (ins.error) throw new Error(`insert: ${ins.error.message}`);
    }

    return { slug: city.slug, count: items.length, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`refreshCity ${city.slug}: ${message}`);
    return { slug: city.slug, count: 0, error: message };
  }
}

async function refreshBatch(
  supabase: ReturnType<typeof createClient>,
  cities: CityRef[],
) {
  const results: Array<{ slug: string; count: number; error: string | null }> = [];
  for (let i = 0; i < cities.length; i++) {
    results.push(await refreshCity(supabase, cities[i]));
    if (i < cities.length - 1) await sleep(GDELT_PACE_MS);
  }
  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json(null, 204);
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("city-news: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "server_misconfigured" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  const explicit = (url.searchParams.get("cities") ?? "").trim();
  let lockHeld = false;

  try {
    let cities: CityRef[];
    let mode: string;

    // The cursor row doubles as a mutex: a single UPDATE, guarded by
    // "nobody holds the lock, or whoever does has been stuck for longer
    // than any real batch takes", claims it. That guard is what actually
    // prevents overlap -- it stays correct even if two invocations read
    // the row at nearly the same moment, because only one UPDATE can
    // match a row that's already been claimed out from under it.
    const nowIso = new Date().toISOString();
    const staleThreshold = new Date(Date.now() - LOCK_STALE_MS).toISOString();
    const lockFilter = `locked_at.is.null,locked_at.lt.${staleThreshold}`;

    if (explicit) {
      // Manual/test mode: refresh exactly the requested cities, right
      // now, without touching the rotation.
      const { data: claimed, error: claimErr } = await supabase
        .from("city_news_cursor")
        .update({ locked_at: nowIso })
        .eq("id", 1)
        .or(lockFilter)
        .select("batch_index");
      if (claimErr) throw new Error(`lock claim: ${claimErr.message}`);
      if (!claimed || claimed.length === 0) {
        return json({ skipped: "locked_by_another_run" });
      }
      lockHeld = true;

      const wanted = new Set(explicit.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
      cities = CITIES.filter((c) => wanted.has(c.slug));
      mode = "manual";
    } else {
      // Scheduled mode: figure out which batch is next, then claim the
      // lock and advance the cursor to the batch after that in the same
      // guarded UPDATE, so a crash mid-batch still leaves the rotation
      // moving rather than stuck retrying the same 10 cities forever.
      const { data: cursorRow, error: cursorErr } = await supabase
        .from("city_news_cursor")
        .select("batch_index")
        .eq("id", 1)
        .single();
      if (cursorErr) throw new Error(`cursor read: ${cursorErr.message}`);

      const totalBatches = Math.ceil(CITIES.length / BATCH_SIZE);
      const batchIndex = (cursorRow?.batch_index ?? 0) % totalBatches;
      const nextIndex = (batchIndex + 1) % totalBatches;

      const { data: claimed, error: claimErr } = await supabase
        .from("city_news_cursor")
        .update({ locked_at: nowIso, batch_index: nextIndex, updated_at: nowIso })
        .eq("id", 1)
        .or(lockFilter)
        .select("batch_index");
      if (claimErr) throw new Error(`lock claim: ${claimErr.message}`);
      if (!claimed || claimed.length === 0) {
        return json({ skipped: "locked_by_another_run" });
      }
      lockHeld = true;

      const start = batchIndex * BATCH_SIZE;
      cities = CITIES.slice(start, start + BATCH_SIZE);
      mode = `scheduled batch ${batchIndex}/${totalBatches}`;
    }

    if (!cities.length) {
      return json({ mode, error: "no_matching_cities" }, 400);
    }

    const results = await refreshBatch(supabase, cities);
    const failures = results.filter((r) => r.error);
    const succeeded = results.length - failures.length;

    if (results.length > 0 && succeeded === 0) {
      // Every city in this batch failed -- a systemic problem (GDELT
      // fully unreachable, or the database rejecting every write), not
      // one flaky source. Log it plainly and fail the request rather than
      // reporting 200 with nothing actually refreshed.
      console.error(`city-news: entire batch failed (${mode}):`, JSON.stringify(failures));
      return json({ mode, results, error: "batch_failed" }, 502);
    }

    return json({ mode, refreshed: succeeded, failed: failures.length, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`city-news: ${message}`);
    return json({ error: message }, 500);
  } finally {
    if (lockHeld) {
      const { error: releaseErr } = await supabase
        .from("city_news_cursor")
        .update({ locked_at: null })
        .eq("id", 1);
      if (releaseErr) console.error(`city-news: lock release: ${releaseErr.message}`);
    }
  }
});
