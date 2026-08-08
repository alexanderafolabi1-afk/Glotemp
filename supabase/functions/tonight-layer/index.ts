// Glotemp Tonight -- the thirteenth layer.
//
// Computes five modes (eat / drink / watch / move / make) per city, each
// with a 0-10 reading AND a 24-point local-hour curve, from four free
// sources. Every third-party key lives in Deno.env here; none is ever
// shipped to the browser.
//
// Sources:
//   OpenStreetMap Overpass  -- venue taxonomy, all five modes  (no key)
//   Ticketmaster Discovery  -- watch events + start-time curve (key, env)
//   Open-Meteo              -- hourly move viability            (no key)
//   OurAirports             -- scheduled seat capacity          (no key)
//
// HARD RULE, and the reason this file does not resemble the older
// functions in this directory: a mode that has no real data does not get
// published. There is no Math.random() fallback anywhere below. The UI
// renders a designed empty state for an absent mode, which is honest;
// a synthesised number would not be.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Mode = "eat" | "drink" | "watch" | "move" | "make";
const MODES: Mode[] = ["eat", "drink", "watch", "move", "make"];

interface Source { name: string; url: string; kind: "live" | "modelled"; }

interface City {
  slug: string; name: string; country: string; iso: string;
  lat: number; lon: number; timezone: string; metro_pop: number;
}

// ---------------------------------------------------------------------
// Overpass: venue taxonomy for all five modes in ONE query per city.
// watch = cinema, theatre, gigs, matches, museums
// move  = kayaking, hiking, climbing, swimming, cycling, running
// make  = workshops, classes, maker spaces
// ---------------------------------------------------------------------
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function overpassQuery(lat: number, lon: number, radius = 12000): string {
  const a = (k: string, v: string) => `nwr[${k}="${v}"](around:${radius},${lat},${lon});`;
  return `[out:json][timeout:60];
(
  ${a("amenity", "restaurant")} ${a("amenity", "cafe")} ${a("amenity", "fast_food")} ${a("amenity", "food_court")}
  ${a("amenity", "bar")} ${a("amenity", "pub")} ${a("amenity", "nightclub")} ${a("amenity", "biergarten")}
  ${a("amenity", "cinema")} ${a("amenity", "theatre")} ${a("amenity", "arts_centre")} ${a("tourism", "museum")} ${a("leisure", "stadium")}
  ${a("leisure", "park")} ${a("leisure", "sports_centre")} ${a("leisure", "swimming_pool")} ${a("leisure", "pitch")}
  ${a("leisure", "fitness_centre")} ${a("sport", "climbing")} ${a("sport", "canoe")} ${a("route", "hiking")} ${a("route", "bicycle")}
  ${a("amenity", "workshop")} ${a("leisure", "hackerspace")} ${a("amenity", "community_centre")} ${a("craft", "workshop")} ${a("shop", "craft")}
);
out tags qt 4000;`;
}

// Which OSM tag values roll up into which mode.
const TAXONOMY: Record<Mode, Array<[string, string]>> = {
  eat: [["amenity", "restaurant"], ["amenity", "cafe"], ["amenity", "fast_food"], ["amenity", "food_court"]],
  drink: [["amenity", "bar"], ["amenity", "pub"], ["amenity", "nightclub"], ["amenity", "biergarten"]],
  watch: [["amenity", "cinema"], ["amenity", "theatre"], ["amenity", "arts_centre"], ["tourism", "museum"], ["leisure", "stadium"]],
  move: [["leisure", "park"], ["leisure", "sports_centre"], ["leisure", "swimming_pool"], ["leisure", "pitch"],
         ["leisure", "fitness_centre"], ["sport", "climbing"], ["sport", "canoe"], ["route", "hiking"], ["route", "bicycle"]],
  make: [["amenity", "workshop"], ["leisure", "hackerspace"], ["amenity", "community_centre"], ["craft", "workshop"], ["shop", "craft"]],
};

async function fetchVenues(city: City): Promise<Record<Mode, number> | null> {
  try {
    const resp = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(overpassQuery(city.lat, city.lon)),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const elements: Array<{ tags?: Record<string, string> }> = data.elements || [];
    if (!elements.length) return null;

    const counts = { eat: 0, drink: 0, watch: 0, move: 0, make: 0 } as Record<Mode, number>;
    for (const el of elements) {
      const tags = el.tags || {};
      for (const mode of MODES) {
        if (TAXONOMY[mode].some(([k, v]) => tags[k] === v)) { counts[mode]++; break; }
      }
    }
    return counts;
  } catch (_e) {
    return null;
  }
}

// ---------------------------------------------------------------------
// Ticketmaster Discovery -> watch event count + a REAL start-time curve.
// Key comes from the environment only.
// ---------------------------------------------------------------------
async function fetchWatchEvents(city: City): Promise<{ count: number; hours: number[] } | null> {
  const apiKey = Deno.env.get("TICKETMASTER_API_KEY");
  if (!apiKey) return null; // No key -> no watch event data. Never synthesised.
  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json` +
      `?latlong=${city.lat},${city.lon}&radius=40&unit=km&size=200&apikey=${apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const events = data?._embedded?.events || [];
    if (!events.length) return null;

    // Histogram of local start hours -- this is a measured curve.
    const hours = new Array(24).fill(0);
    let placed = 0;
    for (const ev of events) {
      const t = ev?.dates?.start?.localTime;
      if (typeof t === "string" && /^\d{2}:/.test(t)) {
        hours[parseInt(t.slice(0, 2), 10) % 24]++;
        placed++;
      }
    }
    return { count: events.length, hours: placed > 0 ? hours : new Array(24).fill(0) };
  } catch (_e) {
    return null;
  }
}

// ---------------------------------------------------------------------
// Open-Meteo -> whether MOVE is viable, hour by hour, today. No key.
// Viability is a real function of measured precipitation, wind and
// temperature, so the move curve is live rather than modelled.
// ---------------------------------------------------------------------
async function fetchMoveViability(city: City): Promise<{ hours: number[]; viableToday: boolean } | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
      `&hourly=temperature_2m,precipitation,wind_speed_10m&forecast_days=1&timezone=auto`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const temp: number[] = data?.hourly?.temperature_2m || [];
    const precip: number[] = data?.hourly?.precipitation || [];
    const wind: number[] = data?.hourly?.wind_speed_10m || [];
    if (temp.length < 24) return null;

    const hours: number[] = [];
    for (let h = 0; h < 24; h++) {
      let score = 10;
      const p = precip[h] ?? 0, w = wind[h] ?? 0, t = temp[h] ?? 15;
      score -= Math.min(6, p * 4);                       // rain dominates
      score -= Math.min(3, Math.max(0, (w - 25) / 10));  // wind above 25km/h
      if (t < 0) score -= 4; else if (t < 6) score -= 2;
      else if (t > 35) score -= 4; else if (t > 30) score -= 2;
      hours.push(Math.max(0, Math.min(10, score)));
    }
    const daylight = hours.slice(7, 21);
    return { hours, viableToday: daylight.some((v) => v >= 6) };
  } catch (_e) {
    return null;
  }
}

// ---------------------------------------------------------------------
// OurAirports -> scheduled seat capacity into the city.
//
// OurAirports publishes airport infrastructure, not live schedules, so
// the seat figure is DERIVED from the scheduled-service airports serving
// the city and their class. It is therefore a modelled figure and is
// flagged as such; the interface labels it "scheduled seat capacity" and
// never as arrivals or passengers.
// ---------------------------------------------------------------------
const AIRPORTS_CSV = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const SEATS_BY_TYPE: Record<string, number> = {
  large_airport: 45000, medium_airport: 9000, small_airport: 900,
};

let airportCache: Array<{ lat: number; lon: number; type: string }> | null = null;

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function loadAirports(): Promise<typeof airportCache> {
  if (airportCache) return airportCache;
  try {
    const resp = await fetch(AIRPORTS_CSV);
    if (!resp.ok) return null;
    const text = await resp.text();
    const lines = text.split("\n");
    const header = parseCsvLine(lines[0]);
    const iLat = header.indexOf("latitude_deg");
    const iLon = header.indexOf("longitude_deg");
    const iType = header.indexOf("type");
    const iSched = header.indexOf("scheduled_service");
    if (iLat < 0 || iLon < 0 || iType < 0 || iSched < 0) return null;

    const rows: Array<{ lat: number; lon: number; type: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const f = parseCsvLine(lines[i]);
      if (f[iSched] !== "yes") continue;           // scheduled service only
      if (!SEATS_BY_TYPE[f[iType]]) continue;
      const lat = parseFloat(f[iLat]), lon = parseFloat(f[iLon]);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      rows.push({ lat, lon, type: f[iType] });
    }
    airportCache = rows;
    return airportCache;
  } catch (_e) {
    return null;
  }
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371, dLat = (bLat - aLat) * Math.PI / 180, dLon = (bLon - aLon) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function seatCapacityFor(city: City): Promise<number | null> {
  const airports = await loadAirports();
  if (!airports) return null;
  let seats = 0, found = 0;
  for (const a of airports) {
    if (haversineKm(city.lat, city.lon, a.lat, a.lon) <= 90) {
      seats += SEATS_BY_TYPE[a.type] || 0;
      found++;
    }
  }
  return found > 0 ? seats : null;
}

// ---------------------------------------------------------------------
// Curves. Each mode has a characteristic shape; where a live curve
// exists (watch from event start times, move from hourly weather) the
// live one wins and the row is not flagged modelled on that account.
// ---------------------------------------------------------------------
const BASE_CURVES: Record<Mode, number[]> = {
  //      0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
  eat:   [1, 0, 0, 0, 0, 1, 2, 4, 5, 4, 4, 6, 9,10, 8, 5, 4, 5, 7, 9,10, 8, 5, 3],
  drink: [6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 4, 5, 7, 8, 9,10,10, 9, 8],
  watch: [2, 1, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 6, 6, 6, 7, 8, 9,10,10, 8, 5, 3],
  move:  [0, 0, 0, 0, 1, 3, 6, 9,10, 9, 8, 7, 6, 6, 6, 7, 8, 9,10, 8, 5, 2, 1, 0],
  make:  [0, 0, 0, 0, 0, 1, 2, 3, 5, 7, 9,10, 8, 7, 8, 9, 9, 8, 8, 7, 5, 3, 1, 0],
};

function normalise(curve: number[], peak: number): number[] {
  const max = Math.max(...curve);
  if (max <= 0) return new Array(24).fill(0);
  return curve.map((v) => Math.round((v / max) * peak * 100) / 100);
}

// Venue density -> 0-10, log-scaled: the difference between 5 and 50
// venues matters far more than between 500 and 550.
function densityReading(count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(10, Math.log10(count + 1) * 3.6));
}

async function computeCity(city: City) {
  const [venues, watchEvents, move, seats] = await Promise.all([
    fetchVenues(city),
    fetchWatchEvents(city),
    fetchMoveViability(city),
    seatCapacityFor(city),
  ]);

  const rows: Array<Record<string, unknown>> = [];

  for (const mode of MODES) {
    const sources: Source[] = [];
    let modelled = false;
    let reading: number | null = null;
    let curve: number[] | null = null;
    let venueCount: number | null = null;
    let eventCount: number | null = null;
    let weatherViable: boolean | null = null;

    if (venues && venues[mode] > 0) {
      venueCount = venues[mode];
      reading = densityReading(venues[mode]);
      sources.push({ name: "OpenStreetMap Overpass", url: OVERPASS_URL, kind: "live" });
    }

    if (mode === "watch" && watchEvents) {
      eventCount = watchEvents.count;
      // Events lift the reading; blend measured event volume with venues.
      const eventReading = Math.max(0, Math.min(10, Math.log10(watchEvents.count + 1) * 4.2));
      reading = reading === null ? eventReading : (reading * 0.5 + eventReading * 0.5);
      sources.push({ name: "Ticketmaster Discovery", url: "https://developer.ticketmaster.com", kind: "live" });
      if (watchEvents.hours.some((h) => h > 0)) {
        curve = normalise(watchEvents.hours, reading);
      }
    }

    if (mode === "move" && move) {
      weatherViable = move.viableToday;
      const weatherReading = move.hours.reduce((s, v) => s + v, 0) / 24;
      reading = reading === null ? weatherReading : (reading * 0.5 + weatherReading * 0.5);
      sources.push({ name: "Open-Meteo", url: "https://open-meteo.com", kind: "live" });
      curve = move.hours.map((v) => Math.round(v * (reading! / 10) * 100) / 100);
    }

    // A mode with no live signal at all is NOT published.
    if (reading === null) continue;

    // No live curve for this mode -> shape is modelled, magnitude is live.
    if (!curve) {
      curve = normalise(BASE_CURVES[mode], reading);
      modelled = true;
      sources.push({ name: "Modelled time-of-day shape", url: "", kind: "modelled" });
    }

    // Seat capacity rides along on every mode as city-level context. It
    // is a derivation from airport class, so it always sets modelled.
    if (seats !== null) {
      modelled = true;
      sources.push({ name: "OurAirports (scheduled seat capacity, derived)", url: AIRPORTS_CSV, kind: "modelled" });
    }

    rows.push({
      city_slug: city.slug,
      mode,
      reading: Math.round(reading * 100) / 100,
      curve,
      venue_count: venueCount,
      event_count: eventCount,
      seat_capacity: seats,
      weather_viable: weatherViable,
      sources,
      modelled,
      computed_at: new Date().toISOString(),
    });
  }

  if (!rows.length) return 0;
  const { error } = await supabase
    .from("tonight_readings")
    .upsert(rows, { onConflict: "city_slug,mode" });
  if (error) {
    console.error(`[tonight-layer] upsert failed for ${city.slug}: ${error.message}`);
    return 0;
  }
  return rows.length;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const cities: City[] = body.cities || [];
    if (!Array.isArray(cities) || !cities.length) {
      return new Response(JSON.stringify({ error: "cities[] required" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    let published = 0, skipped = 0;
    // Sequential with a pause: Overpass is a shared free endpoint and
    // will (rightly) rate-limit a burst of 150 parallel queries.
    for (const city of cities) {
      const n = await computeCity(city);
      published += n;
      if (n === 0) skipped++;
      await new Promise((r) => setTimeout(r, 1200));
    }

    return new Response(JSON.stringify({ ok: true, published, cities_with_no_data: skipped }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
