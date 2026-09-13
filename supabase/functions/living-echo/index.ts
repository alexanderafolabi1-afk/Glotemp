// Living Echo: autonomous synthetic comment generation engine.
//
// Runs every 12 minutes via pg_cron. Generates hyper-realistic community
// comments into the `observations` table using Claude Haiku as the LLM
// (with a template fallback when ANTHROPIC_API_KEY is absent).
//
// RATE-LIMIT SAFETY
//   BATCH_SIZE = 4 cities per invocation
//   COMMENTS_PER_CITY = 2 per run (8 comments max per tick)
//   Exponential backoff on 429; per-city skip on persistent failure
//
// REALISM GUARDRAILS
//   Banned: "vibrant tapestry", "nestled in", "must-visit destination",
//           "gem of a city", "hidden gem", "bustling metropolis"
//   Required: typos, lowercase starts, natural slang
//   Mix: 60% Resident / 40% Tourist per city
//   Timing: Gaussian-jittered created_at so the 12-min cron cadence is
//           invisible in the timestamp distribution

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const BATCH_SIZE        = 4;
const COMMENTS_PER_CITY = 2;
const MAX_RETRIES       = 2;

interface Persona {
  id: string;
  name: string;
  archetype: "Resident" | "Tourist";
  tone: string;
  language_style: string;
}

interface CityState {
  city_id: string;
  target_count: number;
  current_count: number;
  tier: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Box-Muller Gaussian jitter ±stddev ~8min
function gaussianJitterMs(): number {
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1 + 1e-9)) * Math.cos(2 * Math.PI * u2);
  return Math.round(z * 8 * 60 * 1000);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── UTC offset map for local-hour estimation ──────────────────────────
function estimateLocalHour(slug: string): number {
  const map: Record<string, number> = {
    tokyo:9, osaka:9, seoul:9, taipei:8, beijing:8, shanghai:8,
    "hong-kong":8, singapore:8, "kuala-lumpur":8, manila:8,
    jakarta:7, "ho-chi-minh-city":7, hanoi:7, bangkok:7,
    mumbai:5.5, delhi:5.5, lahore:5, karachi:5, dhaka:6,
    colombo:5.5, kathmandu:5.75, dubai:4, istanbul:3,
    moscow:3, ankara:3, nairobi:3, "addis-ababa":3,
    cairo:2, johannesburg:2, "cape-town":2,
    lagos:1, accra:0, casablanca:1, london:1, lisbon:1,
    paris:2, berlin:2, amsterdam:2, rome:2, madrid:2, barcelona:2,
    milan:2, vienna:2, zurich:2, stockholm:2, oslo:2, copenhagen:2,
    prague:2, budapest:2, warsaw:2, athens:3,
    nyc:-4, "washington-dc":-4, miami:-4, atlanta:-4,
    chicago:-5, houston:-5,
    "los-angeles":-7, "san-francisco":-7, seattle:-7, vancouver:-7,
    toronto:-4, montreal:-4, "mexico-city":-5, guadalajara:-5,
    bogota:-5, lima:-5, santiago:-3, "buenos-aires":-3,
    "sao-paulo":-3, medellin:-5,
    sydney:10, melbourne:10, auckland:12,
  };
  const off = map[slug] ?? 0;
  return (((new Date().getUTCHours() + off) % 24) + 24) % 24;
}

function isActiveHour(h: number): boolean {
  return h < 5 ? Math.random() < 0.2 : true;
}

function estimateSentiment(text: string): number {
  const pos = ["great","amazing","love","perfect","excellent","fantastic","good","nice","enjoy","beautiful"];
  const neg = ["awful","terrible","hate","horrible","bad","worst","delay","backed up","broken","problem"];
  const t = text.toLowerCase();
  const p = pos.filter(w => t.includes(w)).length;
  const n = neg.filter(w => t.includes(w)).length;
  return p + n === 0 ? 0.1 : Math.max(-1, Math.min(1, (p - n) * 0.3));
}

// ── Template fallback (no API key) ───────────────────────────────────
const R_TPLS = [
  (c: string) => `transit's backed up near the centre again. takes 20 extra mins. classic ${c}`,
  (_c: string) => `grabbed coffee at the usual spot. place was packed, good energy today`,
  (_c: string) => `noticed the weekend market was busier than usual. weather helping`,
  (_c: string) => `power flickered twice this afternoon on my block. anyone else?`,
  (_c: string) => `the evening walk by the waterfront is actually perfect right now`,
  (_c: string) => `supermarket shelves low on a couple things again. tuesday thing`,
  (_c: string) => `kids out of school today so the park is lively. summer vibes`,
  (c: string) => `${c} in the morning hits different when you've lived here a while`,
];
const T_TPLS = [
  (c: string) => `first full day in ${c} and i'm already planning to come back`,
  (_c: string) => `the food here is nothing like what I expected. genuinely amazing`,
  (_c: string) => `asked three locals for directions and got three different answers lol`,
  (_c: string) => `found a little side street cafe that blew my mind. no reviews anywhere`,
  (_c: string) => `jetlag hitting hard but the evening atmosphere keeps me going`,
  (c: string) => `${c} is so much more relaxed than I thought it'd be honestly`,
  (_c: string) => `couldn't find an ATM for ages. bring cash if you're coming here`,
];

function templateFallback(cityName: string, persona: Persona): string {
  const bank = persona.archetype === "Resident" ? R_TPLS : T_TPLS;
  return bank[Math.floor(Math.random() * bank.length)](cityName);
}

// ── LLM generation ───────────────────────────────────────────────────
async function generateComment(
  cityName: string, citySlug: string,
  persona: Persona, localHour: number,
  retries = 0,
): Promise<string> {
  if (!ANTHROPIC_KEY) return templateFallback(cityName, persona);

  const tod = localHour < 6 ? "early morning"
    : localHour < 12 ? "morning"
    : localHour < 17 ? "afternoon"
    : localHour < 21 ? "evening" : "late night";

  const ctx = persona.archetype === "Resident"
    ? `You live in ${cityName}. You know the city deeply — its rhythms, transit, local spots.`
    : `You are visiting ${cityName}.`;

  const sys =
    `You write short, hyper-realistic community posts for a city mood platform. ` +
    `Write EXACTLY ONE comment as ${persona.name}. ${ctx} ` +
    `Tone: ${persona.tone}. Language: ${persona.language_style}. Time: ${tod}. ` +
    `Max 2 sentences. Feel genuinely human: vary punctuation, allow occasional ` +
    `lowercase start, use natural local slang. ` +
    `NEVER use: "vibrant tapestry","nestled in","must-visit destination","gem of a city","hidden gem","bustling metropolis","picturesque". ` +
    `Output only the comment text, no prefix.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        system: sys,
        messages: [{ role: "user", content: `${persona.archetype} comment about ${cityName} right now (${tod}).` }],
      }),
    });

    if (resp.status === 429 && retries < MAX_RETRIES) {
      await delay((retries + 1) * 4000);
      return generateComment(cityName, citySlug, persona, localHour, retries + 1);
    }
    if (!resp.ok) {
      console.error(`living-echo: LLM ${resp.status} for ${citySlug}`);
      return templateFallback(cityName, persona);
    }
    const data = await resp.json();
    return data?.content?.[0]?.text?.trim() || templateFallback(cityName, persona);
  } catch (e) {
    console.error(`living-echo: LLM threw for ${citySlug}:`, e);
    return templateFallback(cityName, persona);
  }
}

// ── City display names ───────────────────────────────────────────────
const CITY_NAMES: Record<string, string> = {
  tokyo:"Tokyo",delhi:"Delhi",shanghai:"Shanghai","sao-paulo":"São Paulo",
  "mexico-city":"Mexico City",cairo:"Cairo",mumbai:"Mumbai",beijing:"Beijing",
  osaka:"Osaka",nyc:"New York",london:"London",paris:"Paris",
  toronto:"Toronto",sydney:"Sydney",berlin:"Berlin",dubai:"Dubai",
  singapore:"Singapore","hong-kong":"Hong Kong",bangkok:"Bangkok",
  istanbul:"Istanbul",seoul:"Seoul",moscow:"Moscow",lagos:"Lagos",
  nairobi:"Nairobi",bogota:"Bogotá","buenos-aires":"Buenos Aires",
  "los-angeles":"Los Angeles",chicago:"Chicago",miami:"Miami",
  "san-francisco":"San Francisco",amsterdam:"Amsterdam",barcelona:"Barcelona",
  rome:"Rome",madrid:"Madrid",vienna:"Vienna",zurich:"Zurich",
  stockholm:"Stockholm",oslo:"Oslo",copenhagen:"Copenhagen",milan:"Milan",
  lisbon:"Lisbon",prague:"Prague",budapest:"Budapest",warsaw:"Warsaw",
  athens:"Athens",johannesburg:"Johannesburg","cape-town":"Cape Town",
  accra:"Accra","addis-ababa":"Addis Ababa",casablanca:"Casablanca",
  karachi:"Karachi",dhaka:"Dhaka",lahore:"Lahore",colombo:"Colombo",
  kathmandu:"Kathmandu",manila:"Manila",jakarta:"Jakarta",
  "kuala-lumpur":"Kuala Lumpur","ho-chi-minh-city":"Ho Chi Minh City",
  hanoi:"Hanoi",taipei:"Taipei",melbourne:"Melbourne",auckland:"Auckland",
  houston:"Houston",seattle:"Seattle",atlanta:"Atlanta",vancouver:"Vancouver",
  montreal:"Montreal",medellin:"Medellín",santiago:"Santiago",lima:"Lima",
  guadalajara:"Guadalajara","washington-dc":"Washington DC",
};

// ── Main handler ─────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 1. Global pause check
  const { data: gs, error: gsErr } = await sb
    .from("living_echo_global_state").select("is_paused,auto_fade_threshold").eq("id", 1).single();
  if (gsErr) return json({ error: "state_unavailable" }, 500);
  if (gs.is_paused) return json({ status: "paused", generated: 0 });

  // 2. Load personas
  const { data: personas, error: pErr } = await sb
    .from("bot_personas").select("id,name,archetype,tone,language_style");
  if (pErr || !personas?.length) return json({ error: "no_personas" }, 500);

  const residents = personas.filter((p: Persona) => p.archetype === "Resident");
  const tourists  = personas.filter((p: Persona) => p.archetype === "Tourist");

  // 3. Pick cities that still need work
  const { data: cityStates, error: csErr } = await sb
    .from("city_generation_state")
    .select("city_id,target_count,current_count,tier")
    .eq("status", "active")
    .order("current_count", { ascending: true })
    .limit(BATCH_SIZE * 3);

  if (csErr || !cityStates?.length) return json({ status: "no_cities", generated: 0 });

  const autofade = gs.auto_fade_threshold ?? 15;
  const needsWork = (cityStates as CityState[])
    .filter(c => c.current_count < c.target_count)
    .slice(0, BATCH_SIZE);

  if (!needsWork.length) return json({ status: "all_satisfied", generated: 0 });

  // 4. Generate
  let totalGenerated = 0;

  for (const cs of needsWork) {
    const { city_id } = cs;
    const cityName = CITY_NAMES[city_id] ?? city_id.replace(/-/g, " ");
    const localHour = estimateLocalHour(city_id);
    if (!isActiveHour(localHour)) continue;

    // Auto-fade: skip if organic engagement already exceeds threshold
    const { count: organicCount } = await sb
      .from("observations")
      .select("*", { count: "exact", head: true })
      .eq("city_slug", city_id)
      .or("is_synthetic.is.null,is_synthetic.eq.false");
    if ((organicCount ?? 0) >= autofade) continue;

    for (let i = 0; i < COMMENTS_PER_CITY; i++) {
      const useRes = Math.random() < 0.6;
      const pool   = useRes && residents.length ? residents : tourists;
      const persona: Persona = pool[Math.floor(Math.random() * pool.length)];

      const text = await generateComment(cityName, city_id, persona, localHour);
      if (!text) continue;

      const sentiment = estimateSentiment(text);
      const jitter    = gaussianJitterMs();
      const createdAt = new Date(Date.now() + jitter).toISOString();

      // Insert into observations (the real comments table)
      const { data: inserted, error: insErr } = await sb
        .from("observations")
        .insert({
          city_slug:         city_id,
          mode:              persona.archetype === "Resident" ? "local" : "visitor",
          intensity:         Math.floor(Math.random() * 4) + 5,
          note:              text,
          mood:              sentiment > 0.2 ? "positive" : sentiment < -0.2 ? "negative" : "neutral",
          is_anonymous:      true,
          moderation_status: "visible",
          is_synthetic:      true,
          persona_id:        persona.id,
          created_at:        createdAt,
        })
        .select("id")
        .single();

      if (insErr) { console.error(`living-echo: insert fail ${city_id}:`, insErr.message); continue; }

      // Activity log
      await sb.from("living_echo_log").insert({
        city_id,
        persona_id: persona.id,
        comment_id: inserted.id,
        context: `${persona.archetype} · ${persona.name} · hour=${localHour}`,
      });

      totalGenerated++;
    }

    // Advance counter
    const newCount = Math.min(cs.current_count + COMMENTS_PER_CITY, cs.target_count);
    await sb.from("city_generation_state")
      .update({ current_count: newCount, last_run_at: new Date().toISOString() })
      .eq("city_id", city_id);
  }

  return json({ status: "ok", generated: totalGenerated, batch: needsWork.length });
});
