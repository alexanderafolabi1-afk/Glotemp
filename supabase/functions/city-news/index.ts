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
// Split across the two passes. Local leads because it is what the
// section is for; the wider view is a tail, not half the list.
const LOCAL_LIMIT = 5;
const GLOBAL_LIMIT = 3;
// Five seconds, hard. Every network call this function makes is bounded
// by it, and a slow GDELT is treated as no answer rather than allowed to
// hold the run open.
const GDELT_TIMEOUT_MS = 5000;
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
  // Drives the global pass: the wider query is the country, so the
  // stories it finds are ones actually reaching this place rather than
  // an arbitrary world feed.
  country: string;
}

// Generated from cities-data.js, not hand-typed: this function has no
// access to that file at runtime, and the previous hand-maintained copy
// had no country on it at all. Regenerate this block from the roster
// rather than editing entries here one at a time.
const CITIES: CityRef[] = [
  { slug: "tokyo", name: "Tokyo", country: "Japan" },
  { slug: "delhi", name: "Delhi", country: "India" },
  { slug: "shanghai", name: "Shanghai", country: "China" },
  { slug: "sao-paulo", name: "S\u00e3o Paulo", country: "Brazil" },
  { slug: "mexico-city", name: "Mexico City", country: "Mexico" },
  { slug: "cairo", name: "Cairo", country: "Egypt" },
  { slug: "mumbai", name: "Mumbai", country: "India" },
  { slug: "beijing", name: "Beijing", country: "China" },
  { slug: "osaka", name: "Osaka", country: "Japan" },
  { slug: "nyc", name: "New York", country: "USA" },
  { slug: "london", name: "London", country: "UK" },
  { slug: "paris", name: "Paris", country: "France" },
  { slug: "toronto", name: "Toronto", country: "Canada" },
  { slug: "sydney", name: "Sydney", country: "Australia" },
  { slug: "berlin", name: "Berlin", country: "Germany" },
  { slug: "dubai", name: "Dubai", country: "UAE" },
  { slug: "singapore", name: "Singapore", country: "Singapore" },
  { slug: "hong-kong", name: "Hong Kong", country: "Hong Kong" },
  { slug: "bangkok", name: "Bangkok", country: "Thailand" },
  { slug: "istanbul", name: "Istanbul", country: "Turkey" },
  { slug: "medellin", name: "Medell\u00edn", country: "Colombia" },
  { slug: "bogota", name: "Bogot\u00e1", country: "Colombia" },
  { slug: "buenos-aires", name: "Buenos Aires", country: "Argentina" },
  { slug: "santiago", name: "Santiago", country: "Chile" },
  { slug: "lima", name: "Lima", country: "Peru" },
  { slug: "moscow", name: "Moscow", country: "Russia" },
  { slug: "seoul", name: "Seoul", country: "South Korea" },
  { slug: "ankara", name: "Ankara", country: "Turkey" },
  { slug: "nairobi", name: "Nairobi", country: "Kenya" },
  { slug: "lagos", name: "Lagos", country: "Nigeria" },
  { slug: "los-angeles", name: "Los Angeles", country: "USA" },
  { slug: "chicago", name: "Chicago", country: "USA" },
  { slug: "miami", name: "Miami", country: "USA" },
  { slug: "houston", name: "Houston", country: "USA" },
  { slug: "vancouver", name: "Vancouver", country: "Canada" },
  { slug: "montreal", name: "Montreal", country: "Canada" },
  { slug: "san-francisco", name: "San Francisco", country: "USA" },
  { slug: "guadalajara", name: "Guadalajara", country: "Mexico" },
  { slug: "atlanta", name: "Atlanta", country: "USA" },
  { slug: "seattle", name: "Seattle", country: "USA" },
  { slug: "washington-dc", name: "Washington DC", country: "USA" },
  { slug: "phoenix", name: "Phoenix", country: "USA" },
  { slug: "boston", name: "Boston", country: "USA" },
  { slug: "monterrey", name: "Monterrey", country: "Mexico" },
  { slug: "dallas", name: "Dallas", country: "USA" },
  { slug: "minneapolis", name: "Minneapolis", country: "USA" },
  { slug: "denver", name: "Denver", country: "USA" },
  { slug: "philadelphia", name: "Philadelphia", country: "USA" },
  { slug: "san-diego", name: "San Diego", country: "USA" },
  { slug: "havana", name: "Havana", country: "Cuba" },
  { slug: "madrid", name: "Madrid", country: "Spain" },
  { slug: "barcelona", name: "Barcelona", country: "Spain" },
  { slug: "rome", name: "Rome", country: "Italy" },
  { slug: "milan", name: "Milan", country: "Italy" },
  { slug: "amsterdam", name: "Amsterdam", country: "Netherlands" },
  { slug: "warsaw", name: "Warsaw", country: "Poland" },
  { slug: "stockholm", name: "Stockholm", country: "Sweden" },
  { slug: "vienna", name: "Vienna", country: "Austria" },
  { slug: "prague", name: "Prague", country: "Czechia" },
  { slug: "budapest", name: "Budapest", country: "Hungary" },
  { slug: "zurich", name: "Zurich", country: "Switzerland" },
  { slug: "munich", name: "Munich", country: "Germany" },
  { slug: "lisbon", name: "Lisbon", country: "Portugal" },
  { slug: "brussels", name: "Brussels", country: "Belgium" },
  { slug: "oslo", name: "Oslo", country: "Norway" },
  { slug: "copenhagen", name: "Copenhagen", country: "Denmark" },
  { slug: "helsinki", name: "Helsinki", country: "Finland" },
  { slug: "athens", name: "Athens", country: "Greece" },
  { slug: "bucharest", name: "Bucharest", country: "Romania" },
  { slug: "kyiv", name: "Kyiv", country: "Ukraine" },
  { slug: "dublin", name: "Dublin", country: "Ireland" },
  { slug: "lyon", name: "Lyon", country: "France" },
  { slug: "rotterdam", name: "Rotterdam", country: "Netherlands" },
  { slug: "krakow", name: "Krak\u00f3w", country: "Poland" },
  { slug: "hamburg", name: "Hamburg", country: "Germany" },
  { slug: "edinburgh", name: "Edinburgh", country: "UK" },
  { slug: "seville", name: "Seville", country: "Spain" },
  { slug: "porto", name: "Porto", country: "Portugal" },
  { slug: "sofia", name: "Sofia", country: "Bulgaria" },
  { slug: "vilnius", name: "Vilnius", country: "Lithuania" },
  { slug: "bangalore", name: "Bangalore", country: "India" },
  { slug: "hyderabad", name: "Hyderabad", country: "India" },
  { slug: "dhaka", name: "Dhaka", country: "Bangladesh" },
  { slug: "karachi", name: "Karachi", country: "Pakistan" },
  { slug: "kolkata", name: "Kolkata", country: "India" },
  { slug: "guangzhou", name: "Guangzhou", country: "China" },
  { slug: "shenzhen", name: "Shenzhen", country: "China" },
  { slug: "chengdu", name: "Chengdu", country: "China" },
  { slug: "wuhan", name: "Wuhan", country: "China" },
  { slug: "taipei", name: "Taipei", country: "Taiwan" },
  { slug: "kuala-lumpur", name: "Kuala Lumpur", country: "Malaysia" },
  { slug: "jakarta", name: "Jakarta", country: "Indonesia" },
  { slug: "manila", name: "Manila", country: "Philippines" },
  { slug: "ho-chi-minh", name: "Ho Chi Minh City", country: "Vietnam" },
  { slug: "hanoi", name: "Hanoi", country: "Vietnam" },
  { slug: "melbourne", name: "Melbourne", country: "Australia" },
  { slug: "auckland", name: "Auckland", country: "New Zealand" },
  { slug: "lahore", name: "Lahore", country: "Pakistan" },
  { slug: "colombo", name: "Colombo", country: "Sri Lanka" },
  { slug: "yangon", name: "Yangon", country: "Myanmar" },
  { slug: "kathmandu", name: "Kathmandu", country: "Nepal" },
  { slug: "chennai", name: "Chennai", country: "India" },
  { slug: "pune", name: "Pune", country: "India" },
  { slug: "tianjin", name: "Tianjin", country: "China" },
  { slug: "chongqing", name: "Chongqing", country: "China" },
  { slug: "nanjing", name: "Nanjing", country: "China" },
  { slug: "perth", name: "Perth", country: "Australia" },
  { slug: "brisbane", name: "Brisbane", country: "Australia" },
  { slug: "phnom-penh", name: "Phnom Penh", country: "Cambodia" },
  { slug: "busan", name: "Busan", country: "South Korea" },
  { slug: "nagoya", name: "Nagoya", country: "Japan" },
  { slug: "fukuoka", name: "Fukuoka", country: "Japan" },
  { slug: "surabaya", name: "Surabaya", country: "Indonesia" },
  { slug: "xi-an", name: "Xi\u2019an", country: "China" },
  { slug: "harbin", name: "Harbin", country: "China" },
  { slug: "adelaide", name: "Adelaide", country: "Australia" },
  { slug: "ulaanbaatar", name: "Ulaanbaatar", country: "Mongolia" },
  { slug: "sapporo", name: "Sapporo", country: "Japan" },
  { slug: "vientiane", name: "Vientiane", country: "Laos" },
  { slug: "tehran", name: "Tehran", country: "Iran" },
  { slug: "caracas", name: "Caracas", country: "Venezuela" },
  { slug: "guayaquil", name: "Guayaquil", country: "Ecuador" },
  { slug: "quito", name: "Quito", country: "Ecuador" },
  { slug: "fortaleza", name: "Fortaleza", country: "Brazil" },
  { slug: "belo-horizonte", name: "Belo Horizonte", country: "Brazil" },
  { slug: "porto-alegre", name: "Porto Alegre", country: "Brazil" },
  { slug: "recife", name: "Recife", country: "Brazil" },
  { slug: "cali", name: "Cali", country: "Colombia" },
  { slug: "montevideo", name: "Montevideo", country: "Uruguay" },
  { slug: "curitiba", name: "Curitiba", country: "Brazil" },
  { slug: "johannesburg", name: "Johannesburg", country: "South Africa" },
  { slug: "cape-town", name: "Cape Town", country: "South Africa" },
  { slug: "kinshasa", name: "Kinshasa", country: "DRC" },
  { slug: "addis-ababa", name: "Addis Ababa", country: "Ethiopia" },
  { slug: "accra", name: "Accra", country: "Ghana" },
  { slug: "dar-es-salaam", name: "Dar es Salaam", country: "Tanzania" },
  { slug: "casablanca", name: "Casablanca", country: "Morocco" },
  { slug: "dakar", name: "Dakar", country: "Senegal" },
  { slug: "algiers", name: "Algiers", country: "Algeria" },
  { slug: "tunis", name: "Tunis", country: "Tunisia" },
  { slug: "riyadh", name: "Riyadh", country: "Saudi Arabia" },
  { slug: "doha", name: "Doha", country: "Qatar" },
  { slug: "abu-dhabi", name: "Abu Dhabi", country: "UAE" },
  { slug: "amman", name: "Amman", country: "Jordan" },
  { slug: "tel-aviv", name: "Tel Aviv", country: "Israel" },
  { slug: "beirut", name: "Beirut", country: "Lebanon" },
  { slug: "muscat", name: "Muscat", country: "Oman" },
  { slug: "kuwait-city", name: "Kuwait City", country: "Kuwait" },
  { slug: "jeddah", name: "Jeddah", country: "Saudi Arabia" },
  { slug: "baghdad", name: "Baghdad", country: "Iraq" },
  { slug: "milton-keynes", name: "Milton Keynes", country: "UK" },
  { slug: "kyoto", name: "Kyoto", country: "Japan" },
  { slug: "hiroshima", name: "Hiroshima", country: "Japan" },
  { slug: "nara", name: "Nara", country: "Japan" },
  { slug: "kanazawa", name: "Kanazawa", country: "Japan" },
  { slug: "yokohama", name: "Yokohama", country: "Japan" },
  { slug: "kobe", name: "Kobe", country: "Japan" },
  { slug: "sendai", name: "Sendai", country: "Japan" },
  { slug: "nagasaki", name: "Nagasaki", country: "Japan" },
  { slug: "naha", name: "Naha", country: "Japan" },
  { slug: "takayama", name: "Takayama", country: "Japan" },
  { slug: "beppu", name: "Beppu", country: "Japan" },
  { slug: "lanzarote", name: "Lanzarote", country: "Spain" },
  { slug: "gran-canaria", name: "Gran Canaria", country: "Spain" },
  { slug: "salzburg", name: "Salzburg", country: "Austria" },
  { slug: "hallstatt", name: "Hallstatt", country: "Austria" },
  { slug: "bruges", name: "Bruges", country: "Belgium" },
  { slug: "interlaken", name: "Interlaken", country: "Switzerland" },
  { slug: "chania", name: "Chania", country: "Greece" },
  { slug: "dubrovnik", name: "Dubrovnik", country: "Croatia" },
  { slug: "split", name: "Split", country: "Croatia" },
  { slug: "ljubljana", name: "Ljubljana", country: "Slovenia" },
  { slug: "bled", name: "Bled", country: "Slovenia" },
  { slug: "faro", name: "Faro", country: "Portugal" },
  { slug: "valletta", name: "Valletta", country: "Malta" },
  { slug: "reykjavik", name: "Reykjav\u00edk", country: "Iceland" },
  { slug: "tromso", name: "Troms\u00f8", country: "Norway" },
  { slug: "gdansk", name: "Gda\u0144sk", country: "Poland" },
  { slug: "matera", name: "Matera", country: "Italy" },
  { slug: "funchal", name: "Funchal", country: "Portugal" },
  { slug: "ronda", name: "Ronda", country: "Spain" },
  { slug: "colmar", name: "Colmar", country: "France" },
  { slug: "tbilisi", name: "Tbilisi", country: "Georgia" },
  { slug: "batumi", name: "Batumi", country: "Georgia" },
  { slug: "almaty", name: "Almaty", country: "Kazakhstan" },
  { slug: "astana", name: "Astana", country: "Kazakhstan" },
  { slug: "tashkent", name: "Tashkent", country: "Uzbekistan" },
  { slug: "bishkek", name: "Bishkek", country: "Kyrgyzstan" },
  { slug: "wadi-musa", name: "Wadi Musa (Petra)", country: "Jordan" },
  { slug: "luxor", name: "Luxor", country: "Egypt" },
  { slug: "aswan", name: "Aswan", country: "Egypt" },
  { slug: "sharm-el-sheikh", name: "Sharm El Sheikh", country: "Egypt" },
  { slug: "paphos", name: "Paphos", country: "Cyprus" },
  { slug: "salalah", name: "Salalah", country: "Oman" },
  { slug: "aqaba", name: "Aqaba", country: "Jordan" },
  { slug: "marrakech", name: "Marrakech", country: "Morocco" },
  { slug: "chefchaouen", name: "Chefchaouen", country: "Morocco" },
  { slug: "essaouira", name: "Essaouira", country: "Morocco" },
  { slug: "zanzibar-city", name: "Zanzibar City", country: "Tanzania" },
  { slug: "kigali", name: "Kigali", country: "Rwanda" },
  { slug: "victoria-falls", name: "Victoria Falls", country: "Zimbabwe" },
  { slug: "lalibela", name: "Lalibela", country: "Ethiopia" },
  { slug: "cusco", name: "Cusco", country: "Peru" },
  { slug: "antigua-guatemala", name: "Antigua Guatemala", country: "Guatemala" },
  { slug: "ushuaia", name: "Ushuaia", country: "Argentina" },
  { slug: "bariloche", name: "San Carlos de Bariloche", country: "Argentina" },
  { slug: "salvador", name: "Salvador", country: "Brazil" },
  { slug: "iguazu", name: "Puerto Iguaz\u00fa", country: "Argentina" },
  { slug: "san-miguel-de-allende", name: "San Miguel de Allende", country: "Mexico" },
  { slug: "oaxaca", name: "Oaxaca", country: "Mexico" },
  { slug: "banos", name: "Ba\u00f1os", country: "Ecuador" },
  { slug: "punta-del-este", name: "Punta del Este", country: "Uruguay" },
  { slug: "cartagena", name: "Cartagena", country: "Colombia" },
  { slug: "nassau", name: "Nassau", country: "Bahamas" },
  { slug: "bridgetown", name: "Bridgetown", country: "Barbados" },
  { slug: "george-town-cayman", name: "George Town", country: "Cayman Islands" },
  { slug: "tulum", name: "Tulum", country: "Mexico" },
  { slug: "cancun", name: "Canc\u00fan", country: "Mexico" },
  { slug: "luang-prabang", name: "Luang Prabang", country: "Laos" },
  { slug: "hoi-an", name: "Hoi An", country: "Vietnam" },
  { slug: "hue", name: "Hue", country: "Vietnam" },
  { slug: "da-nang", name: "Da Nang", country: "Vietnam" },
  { slug: "da-lat", name: "Da Lat", country: "Vietnam" },
  { slug: "siem-reap", name: "Siem Reap", country: "Cambodia" },
  { slug: "bali-denpasar", name: "Bali (Denpasar)", country: "Indonesia" },
  { slug: "ubud", name: "Ubud", country: "Indonesia" },
  { slug: "chiang-mai", name: "Chiang Mai", country: "Thailand" },
  { slug: "chiang-rai", name: "Chiang Rai", country: "Thailand" },
  { slug: "krabi", name: "Krabi", country: "Thailand" },
  { slug: "phuket", name: "Phuket", country: "Thailand" },
  { slug: "boracay", name: "Boracay", country: "Philippines" },
  { slug: "el-nido", name: "El Nido", country: "Philippines" },
  { slug: "george-town-penang", name: "George Town", country: "Malaysia" },
  { slug: "vang-vieng", name: "Vang Vieng", country: "Laos" },
  { slug: "koh-samui", name: "Koh Samui", country: "Thailand" },
  { slug: "jaipur", name: "Jaipur", country: "India" },
  { slug: "goa", name: "Goa (Panaji)", country: "India" },
  { slug: "varanasi", name: "Varanasi", country: "India" },
  { slug: "udaipur", name: "Udaipur", country: "India" },
  { slug: "jaisalmer", name: "Jaisalmer", country: "India" },
  { slug: "munnar", name: "Munnar", country: "India" },
  { slug: "galle", name: "Galle", country: "Sri Lanka" },
  { slug: "pokhara", name: "Pokhara", country: "Nepal" },
  { slug: "male", name: "Mal\u00e9", country: "Maldives" },
  { slug: "yangshuo", name: "Yangshuo", country: "China" },
  { slug: "queenstown", name: "Queenstown", country: "New Zealand" },
  { slug: "nadi", name: "Nadi", country: "Fiji" },
  { slug: "bora-bora", name: "Bora Bora", country: "French Polynesia" },
  { slug: "granada-nicaragua", name: "Granada", country: "Nicaragua" },
  { slug: "san-pedro-la-laguna", name: "San Pedro La Laguna", country: "Guatemala" },
  { slug: "las-vegas", name: "Las Vegas", country: "USA" },
  { slug: "venice", name: "Venice", country: "Italy" },
  { slug: "florence", name: "Florence", country: "Italy" },
  { slug: "ibiza", name: "Ibiza", country: "Spain" },
  { slug: "santorini", name: "Santorini", country: "Greece" },
  { slug: "new-orleans", name: "New Orleans", country: "USA" },
  { slug: "key-west", name: "Key West", country: "USA" },
  { slug: "whistler", name: "Whistler", country: "Canada" },
  { slug: "banff", name: "Banff", country: "Canada" },
  { slug: "mykonos", name: "Mykonos", country: "Greece" },
  { slug: "capri", name: "Capri", country: "Italy" },
  { slug: "amalfi", name: "Amalfi", country: "Italy" },
  { slug: "positano", name: "Positano", country: "Italy" },
  { slug: "lake-como", name: "Como", country: "Italy" },
  { slug: "st-tropez", name: "Saint-Tropez", country: "France" },
  { slug: "bordeaux", name: "Bordeaux", country: "France" },
  { slug: "monaco", name: "Monaco", country: "Monaco" },
  { slug: "zermatt", name: "Zermatt", country: "Switzerland" },
  { slug: "innsbruck", name: "Innsbruck", country: "Austria" },
  { slug: "san-sebastian", name: "San Sebasti\u00e1n", country: "Spain" },
  { slug: "cordoba", name: "C\u00f3rdoba", country: "Spain" },
  { slug: "rhodes", name: "Rhodes", country: "Greece" },
  { slug: "heraklion", name: "Heraklion", country: "Greece" },
  { slug: "jerusalem", name: "Jerusalem", country: "Israel" },
  { slug: "tangier", name: "Tangier", country: "Morocco" },
  { slug: "sousse", name: "Sousse", country: "Tunisia" },
  { slug: "hurghada", name: "Hurghada", country: "Egypt" },
  { slug: "mombasa", name: "Mombasa", country: "Kenya" },
  { slug: "st-lucia", name: "Castries", country: "Saint Lucia" },
  { slug: "aruba", name: "Oranjestad", country: "Aruba" },
  { slug: "curacao", name: "Willemstad", country: "Cura\u00e7ao" },
  { slug: "puerto-vallarta", name: "Puerto Vallarta", country: "Mexico" },
  { slug: "playa-del-carmen", name: "Playa del Carmen", country: "Mexico" },
  { slug: "aguas-calientes", name: "Aguas Calientes", country: "Peru" },
  { slug: "valparaiso", name: "Valpara\u00edso", country: "Chile" },
  { slug: "mendoza", name: "Mendoza", country: "Argentina" },
  { slug: "langkawi", name: "Langkawi", country: "Malaysia" },
  { slug: "ha-long", name: "Ha Long", country: "Vietnam" },
  { slug: "sapa", name: "Sapa", country: "Vietnam" },
  { slug: "pai", name: "Pai", country: "Thailand" },
  { slug: "bagan", name: "Bagan", country: "Myanmar" },
  { slug: "kandy", name: "Kandy", country: "Sri Lanka" },
  { slug: "shimla", name: "Shimla", country: "India" },
  { slug: "rishikesh", name: "Rishikesh", country: "India" },
  { slug: "amritsar", name: "Amritsar", country: "India" },
  { slug: "gyeongju", name: "Gyeongju", country: "South Korea" },
  { slug: "jeju", name: "Jeju City", country: "South Korea" },
  { slug: "kota-kinabalu", name: "Kota Kinabalu", country: "Malaysia" },
  { slug: "cairns", name: "Cairns", country: "Australia" },
  { slug: "gold-coast", name: "Gold Coast", country: "Australia" },
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
  // Null unless the feed itself supplied a publish date. Never the run
  // time, never GDELT's crawl time -- see publishedAtFromFeed below.
  published_at: string | null;
  // NOT listed here on purpose: fetched_at. The column defaults to now()
  // in the database and this function must never send a value for it,
  // so that "when did we get this" is recorded by the thing doing the
  // getting rather than by whatever clock the caller happened to hold.
  // 'local'  -- the city's own outlets and stories naming the city.
  // 'global' -- wider stories reaching that city, found by querying the
  //             city's COUNTRY rather than the city. This is a second
  //             real GDELT query against real outlets, not a rewrite of
  //             a local story and not anything generated here: "framed
  //             for that city" means selected for that city, which is
  //             the only kind of framing that can be sourced.
  scope: "local" | "global";
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
// WHY published_at IS NOW ALWAYS NULL FOR GDELT ROWS
//
// This used to write GDELT's `seendate` into published_at, and that is
// the bug behind "every row lands on an exact quarter hour". seendate is
// not a publication date: it is the moment GDELT's own crawler first saw
// the article, and GDELT crawls in fifteen-minute windows, so every
// value it returns is quantised to :00, :15, :30 or :45. Storing it as a
// publication date made freshness unverifiable -- a reader, and this
// project's own admin, could not tell a story published this morning
// from one GDELT happened to notice this morning.
//
// GDELT's DOC 2.0 ArtList response has NO publication-date field at all.
// Its documented columns are url, url_mobile, title, seendate,
// socialimage, domain, language and sourcecountry. There is nothing here
// to put in published_at, so nothing goes in it: null is the honest
// value, and city_news.fetched_at (defaulted by the database, never set
// by this function) carries recency instead. Every consumer sorts and
// filters on coalesce(published_at, fetched_at).
//
// This is kept, unused by the insert path, because it is still the right
// way to read a seendate should this function ever need one for
// diagnostics -- and so that the next person to reach for it finds this
// comment rather than reinventing the bug.
function parseSeendate(s?: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s ?? "");
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se)).toISOString();
}

// The feed's own publish field, and only that. GDELT ArtList has none,
// so this returns null for every GDELT article -- which is the point.
// A feed that does carry one (an RSS pubDate, a JSON published field)
// can be added here, and only here, without any caller changing.
function publishedAtFromFeed(a: GdeltArticle): string | null {
  const raw = (a as Record<string, unknown>).publishdate
    ?? (a as Record<string, unknown>).published
    ?? (a as Record<string, unknown>).pubDate;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  // A publish date in the future is a broken feed, not a scoop.
  if (t > Date.now() + 6 * 3600_000) return null;
  return new Date(t).toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// null means "GDELT did not actually answer this query" (rate-limited,
// timed out, or sent something unparseable) -- distinct from [], which
// means GDELT answered normally and there was nothing in the window.
// refreshCity below depends on telling these apart: a failed call must
// never be treated as "this city has no news right now."
async function fetchCityArticles(cityName: string): Promise<GdeltArticle[] | null> {
  const params = new URLSearchParams({
    query: `"${cityName.replace(/["\\]/g, "")}"`,
    mode: "ArtList",
    maxrecords: "50",
    sort: "DateDesc",
    format: "json",
    // The last 72 hours, exactly what the section shows -- the client
    // filters on the same window, so a story can never be stored here
    // and then rendered past its own cut-off. No fallback to a wider
    // window: a city genuinely quiet for three days is a real answer,
    // not a bug to paper over by reaching further back.
    timespan: "3d",
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
        return null;
      }
      if (!resp.ok) {
        console.error(`GDELT ${cityName}: HTTP ${resp.status}`);
        return null;
      }
      // GDELT answers a rate-limited or malformed query with a text body
      // and a 200, so this cannot assume JSON just because status is ok.
      const text = await resp.text();
      try {
        const data = JSON.parse(text);
        return Array.isArray(data?.articles) ? data.articles : [];
      } catch (e) {
        console.error(`GDELT ${cityName}: non-JSON response: ${text.slice(0, 200)}`);
        return null;
      }
    } catch (e) {
      console.error(`GDELT ${cityName}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

// One item per outlet, no repeated headline -- breaking news gets
// syndicated, and eight copies of one story is not eight facts.
function distinct(
  citySlug: string,
  articles: GdeltArticle[],
  scope: "local" | "global",
  limit: number,
  seenDomain: Set<string> = new Set<string>(),
  seenTitle: Set<string> = new Set<string>(),
): StoredItem[] {
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
      published_at: publishedAtFromFeed(a),
      scope,
    });
    if (out.length >= limit) break;
  }
  return out;
}

// One "feed" is one GDELT query. Each city attempts two: local (the
// city name) and global (its country). Both are counted, and a failure
// of either is recorded with the reason rather than swallowed -- the
// symptom that made this necessary was six cities out of 300 producing
// rows while the other 294 failed silently and the run still reported
// success.
interface CityResult {
  slug: string;
  count: number;
  feedsAttempted: number;
  feedsSucceeded: number;
  errors: string[];
  error: string | null;
}

async function refreshCity(
  supabase: ReturnType<typeof createClient>,
  city: CityRef,
): Promise<CityResult> {
  const errors: string[] = [];
  let feedsAttempted = 0;
  let feedsSucceeded = 0;
  try {
    feedsAttempted++;
    const articles = await fetchCityArticles(city.name);

    // null means GDELT did not actually answer (rate-limited, timed out,
    // unparseable) -- this is the fix for the bug this comment used to
    // describe incorrectly. The old code ran the delete unconditionally,
    // so a rate-limited call reported success while silently erasing the
    // city's last good headlines -- worse than doing nothing, and with
    // GDELT rate-limiting this heavily, it was erasing far more cities
    // than it was ever refreshing. A failed call must leave whatever is
    // already stored untouched and try again next time this city's turn
    // comes up in the rotation.
    if (articles === null) {
      const msg = `${city.slug}/local: gdelt_unavailable`;
      console.error(`refreshCity ${msg}`);
      errors.push(msg);
      return {
        slug: city.slug, count: 0, feedsAttempted, feedsSucceeded,
        errors, error: "gdelt_unavailable",
      };
    }
    feedsSucceeded++;

    // Local first, and the local pass owns the dedupe sets so a wider
    // story that a local outlet already ran cannot appear twice.
    const seenDomain = new Set<string>();
    const seenTitle = new Set<string>();
    const items = distinct(city.slug, articles, "local", LOCAL_LIMIT, seenDomain, seenTitle);

    // Then the wider view: a second real GDELT query, against the city's
    // country rather than the city, for stories reaching this place from
    // outside it. A failure here is not a failure of the city -- local
    // news alone is a complete section, so this never aborts the run and
    // never blocks the store.
    if (city.country) {
      feedsAttempted++;
      const wider = await fetchCityArticles(city.country);
      if (wider !== null) {
        feedsSucceeded++;
        items.push(...distinct(city.slug, wider, "global", GLOBAL_LIMIT, seenDomain, seenTitle));
      } else {
        const msg = `${city.slug}/global(${city.country}): gdelt_unavailable`;
        console.error(`refreshCity ${msg}`);
        errors.push(msg);
      }
    }

    // Replace strategy: a city that has dropped out of the 72-hour
    // window since the last run should end up with nothing stored, which
    // is what makes the client hide the section rather than show a stale
    // headline. Reaching here means GDELT did answer, so an empty items[]
    // is a genuine "nothing in the last 72 hours", not a failed call --
    // the one case this delete is actually meant for.
    const del = await supabase.from("city_news").delete().eq("city_slug", city.slug);
    if (del.error) throw new Error(`delete: ${del.error.message}`);

    if (items.length) {
      const ins = await supabase.from("city_news").insert(items);
      if (ins.error) throw new Error(`insert: ${ins.error.message}`);
    }

    return {
      slug: city.slug, count: items.length, feedsAttempted, feedsSucceeded,
      errors, error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`refreshCity ${city.slug}: ${message}`);
    errors.push(`${city.slug}: ${message}`);
    return {
      slug: city.slug, count: 0, feedsAttempted, feedsSucceeded,
      errors, error: message,
    };
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

  // The run ledger. Opened before any work so that a run which dies
  // early still leaves a row with a null finished_at -- which is what
  // makes "the job stopped running" visible in city_news_health instead
  // of silently looking like "no news today".
  let runId: number | string | null = null;
  const { data: runRow, error: runErr } = await supabase
    .from("city_news_runs")
    .insert({})
    .select("id")
    .single();
  if (runErr) {
    // Not fatal: a broken ledger must not stop the news being fetched.
    // It is logged loudly because an unrecorded run is exactly the blind
    // spot this table was added to close.
    console.error(`city-news: could not open run row: ${runErr.message}`);
  } else {
    runId = (runRow as { id: number | string }).id;
  }

  // Closes the ledger exactly once, whatever path the handler leaves by.
  let runClosed = false;
  async function closeRun(fields: {
    feeds_attempted: number;
    feeds_succeeded: number;
    rows_inserted: number;
    error: string | null;
  }) {
    if (runId === null || runClosed) return;
    runClosed = true;
    const { error: closeErr } = await supabase
      .from("city_news_runs")
      .update({ finished_at: new Date().toISOString(), ...fields })
      .eq("id", runId);
    if (closeErr) console.error(`city-news: could not close run ${runId}: ${closeErr.message}`);
  }

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
        await closeRun({ feeds_attempted: 0, feeds_succeeded: 0, rows_inserted: 0, error: "locked_by_another_run" });
        return json({ skipped: "locked_by_another_run", rows_inserted: 0 }, 409);
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
        await closeRun({ feeds_attempted: 0, feeds_succeeded: 0, rows_inserted: 0, error: "locked_by_another_run" });
        return json({ skipped: "locked_by_another_run", rows_inserted: 0 }, 409);
      }
      lockHeld = true;

      const start = batchIndex * BATCH_SIZE;
      cities = CITIES.slice(start, start + BATCH_SIZE);
      mode = `scheduled batch ${batchIndex}/${totalBatches}`;
    }

    if (!cities.length) {
      await closeRun({ feeds_attempted: 0, feeds_succeeded: 0, rows_inserted: 0, error: "no_matching_cities" });
      return json({ mode, rows_inserted: 0, error: "no_matching_cities" }, 400);
    }

    const results = await refreshBatch(supabase, cities);
    const failures = results.filter((r) => r.error);
    const succeeded = results.length - failures.length;

    // The actual number of rows written, summed from what each city
    // stored. This is what the response reports and what the ledger
    // records -- not {success: true}, which is what let 294 cities fail
    // silently while the run looked healthy.
    const rowsInserted = results.reduce((n, r) => n + r.count, 0);
    const feedsAttempted = results.reduce((n, r) => n + r.feedsAttempted, 0);
    const feedsSucceeded = results.reduce((n, r) => n + r.feedsSucceeded, 0);

    // Every per-feed failure, kept rather than swallowed. Truncated so
    // one systemic outage cannot write a megabyte into the ledger.
    const feedErrors = results.flatMap((r) => r.errors);
    const errorText = feedErrors.length ? feedErrors.join("; ").slice(0, 4000) : null;

    // Zero rows across every feed is a failure, whether or not any
    // individual city "succeeded" by returning an empty list: a run that
    // stores nothing has not refreshed anything, and the cron must
    // record that rather than count it as a healthy run.
    if (rowsInserted === 0) {
      const detail = errorText ?? "all feeds returned zero rows";
      console.error(`city-news: no rows inserted (${mode}): ${detail}`);
      await closeRun({
        feeds_attempted: feedsAttempted,
        feeds_succeeded: feedsSucceeded,
        rows_inserted: 0,
        error: detail,
      });
      return json({
        mode, rows_inserted: 0,
        feeds_attempted: feedsAttempted, feeds_succeeded: feedsSucceeded,
        refreshed: succeeded, failed: failures.length,
        results, error: "no_rows_inserted",
      }, 502);
    }

    await closeRun({
      feeds_attempted: feedsAttempted,
      feeds_succeeded: feedsSucceeded,
      rows_inserted: rowsInserted,
      error: errorText,
    });

    return json({
      mode,
      rows_inserted: rowsInserted,
      feeds_attempted: feedsAttempted,
      feeds_succeeded: feedsSucceeded,
      refreshed: succeeded,
      failed: failures.length,
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`city-news: ${message}`);
    await closeRun({ feeds_attempted: 0, feeds_succeeded: 0, rows_inserted: 0, error: message });
    return json({ rows_inserted: 0, error: message }, 500);
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
