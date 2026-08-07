import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

interface CityCoords {
  slug: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
}

// City coordinates database
const cityDatabase: Record<string, CityCoords> = {
  nyc: { slug: "nyc", name: "New York", lat: 40.7128, lon: -74.006, country: "US" },
  london: { slug: "london", name: "London", lat: 51.5074, lon: -0.1278, country: "GB" },
  tokyo: { slug: "tokyo", name: "Tokyo", lat: 35.6762, lon: 139.6503, country: "JP" },
  berlin: { slug: "berlin", name: "Berlin", lat: 52.52, lon: 13.405, country: "DE" },
  "sao-paulo": { slug: "sao-paulo", name: "São Paulo", lat: -23.5505, lon: -46.6333, country: "BR" },
  paris: { slug: "paris", name: "Paris", lat: 48.8566, lon: 2.3522, country: "FR" },
};

interface WeatherData {
  temp: number;
  condition: string;
  condition_code: number;
}

interface AirQualityData {
  aqi: number;
  health: string;
}

interface EventData {
  count: number;
  mood_impact: number;
}

interface MoodFactors {
  weather: number;
  airQuality: number;
  events: number;
  holiday: number;
}

async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
    );
    const data = await response.json();

    if (data.current) {
      const code = data.current.weather_code;
      // WMO weather codes: 0=clear, 1-3=cloudy, 45-48=foggy, 50-67=rain, 71-86=snow, 80-82=rain showers, 85-86=snow showers, 95-99=thunderstorm
      let moodImpact = 0;
      if (code === 0) moodImpact = 1.0; // Clear
      else if (code <= 3) moodImpact = 0.9; // Cloudy
      else if (code <= 48) moodImpact = 0.7; // Fog
      else if (code <= 67) moodImpact = 0.6; // Rain
      else if (code <= 86) moodImpact = 0.5; // Snow
      else moodImpact = 0.4; // Thunderstorm

      return {
        temp: data.current.temperature_2m,
        condition_code: code,
        condition: getWeatherCondition(code),
      };
    }
    return null;
  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
}

function getWeatherCondition(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 86) return "Snow";
  return "Thunderstorm";
}

async function fetchAirQualityData(lat: number, lon: number): Promise<AirQualityData | null> {
  try {
    const response = await fetch(
      `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${Deno.env.get("WAQI_API_KEY") || "demo"}`
    );
    const data = await response.json();

    if (data.status === "ok" && data.data) {
      const aqi = data.data.aqi;
      let health = "Unknown";
      if (aqi <= 50) health = "Good";
      else if (aqi <= 100) health = "Moderate";
      else if (aqi <= 150) health = "Unhealthy for Sensitive";
      else if (aqi <= 200) health = "Unhealthy";
      else if (aqi <= 300) health = "Very Unhealthy";
      else health = "Hazardous";

      return { aqi, health };
    }
    return null;
  } catch (error) {
    console.error("Air quality fetch error:", error);
    return null;
  }
}

async function fetchHolidayData(country: string): Promise<{ isHoliday: boolean; holidayName?: string }> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await fetch(
      `https://date.nager.at/api/v3/IsTodayPublicHoliday?countryCode=${country}`
    );
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return { isHoliday: true, holidayName: data[0]?.localName };
    }
    return { isHoliday: false };
  } catch (error) {
    console.error("Holiday fetch error:", error);
    return { isHoliday: false };
  }
}

async function fetchEventData(city: string): Promise<EventData | null> {
  try {
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?city=${encodeURIComponent(city)}&apikey=${Deno.env.get("TICKETMASTER_API_KEY") || ""}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const eventCount = data.page?.totalElements || 0;
    const moodImpact = Math.min(1.0, eventCount / 50); // Normalize: every 50 events = +1.0

    return { count: eventCount, mood_impact: moodImpact };
  } catch (error) {
    console.error("Event fetch error:", error);
    return null;
  }
}

function calculateMoodBoost(factors: MoodFactors): number {
  // Weather: -0.5 to +0.5
  const weatherBoost = (getWeatherMoodFactor(factors) - 0.5) * 1.0;

  // Air quality: -0.5 to +0.5 (good air = positive mood)
  const aqBoost = (factors.airQuality - 0.5) * 1.0;

  // Events: -0.2 to +0.5 (events boost mood)
  const eventBoost = factors.events * 0.7 - 0.2;

  // Holiday: +0.3 if holiday
  const holidayBoost = factors.holiday * 0.3;

  return weatherBoost + aqBoost + eventBoost + holidayBoost;
}

function getWeatherMoodFactor(factors: MoodFactors): number {
  // Returns 0-1 scale where 1 is best weather, 0 is worst
  return factors.weather;
}

async function updateCityMood(supabase: any, citySlug: string, baselineMood: number, moodBoost: number): Promise<void> {
  const finalMood = Math.max(1, Math.min(10, baselineMood + moodBoost));

  await supabase
    .from("city_pulse_cache")
    .upsert(
      {
        city: citySlug,
        mood_score: finalMood,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "city" }
    );
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase configuration" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const results: Record<string, any> = {};

    for (const [slug, city] of Object.entries(cityDatabase)) {
      const weather = await fetchWeatherData(city.lat, city.lon);
      const airQuality = await fetchAirQualityData(city.lat, city.lon);
      const holiday = await fetchHolidayData(city.country);
      const events = await fetchEventData(city.name);

      const factors: MoodFactors = {
        weather: weather ? (11 - parseInt(weather.condition_code.toString())) / 10 : 0.5,
        airQuality: airQuality ? Math.max(0, 1 - airQuality.aqi / 500) : 0.5,
        events: events?.mood_impact || 0.5,
        holiday: holiday.isHoliday ? 1 : 0,
      };

      const moodBoost = calculateMoodBoost(factors);

      // Baseline mood from comments (if available)
      const { data: cacheData } = await supabase
        .from("city_pulse_cache")
        .select("mood_score")
        .eq("city", slug)
        .single();

      const baselineMood = cacheData?.mood_score || 7.0;
      await updateCityMood(supabase, slug, baselineMood, moodBoost);

      results[slug] = {
        city: city.name,
        baselineMood,
        moodBoost,
        finalMood: Math.max(1, Math.min(10, baselineMood + moodBoost)),
        factors,
      };
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Aggregation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to aggregate city moods", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
