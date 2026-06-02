// ═══════════════════════════════════════════════════════════════════
//  GLOTEMP — COMPLETE APP.JS
//  Full pulse engine + new design system UI renders merged.
//  Drop this file directly into your repo as app.js — done.
// ═══════════════════════════════════════════════════════════════════

// Basic in-memory state
const pulses = [];
const goldenPath = {
  visitedCities: [],
  visitedCoords: [],
  unlocked: false,
  pilgrimScore: 0
};
const cityHeat = {};
const HUMAN_CHECKINS = [];
let hasSeededLegacyCheckins = false;

let latestPulseByCity = {};
let deferredPrompt = null;

const RANK_TIERS = [
  { minStars: 1000, label: "Luminary" },
  { minStars: 500,  label: "Vanguard" },
  { minStars: 200,  label: "Pathfinder" },
  { minStars: 50,   label: "Explorer II" },
  { minStars: 0,    label: "Explorer I" }
];

function getRankForStars(stars) {
  const safeStars = Number.isFinite(stars) ? stars : 0;
  const tier = RANK_TIERS.find(({ minStars }) => safeStars >= minStars);
  return tier ? tier.label : "Explorer I";
}

// ─── USER PROFILE ─────────────────────────────────────────────────
let USER_PROFILE = (() => {
  const baseProfile = {
    id: generateUUID(),
    identityMode: "anonymous",
    nickname: null,
    legalName: null,
    stars: 0,
    rank: "Explorer I",
    checkins: 0,
    citiesVisited: []
  };
  try {
    const stored = localStorage.getItem("gt_user_profile");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object") return baseProfile;
      const storedStars =
        typeof parsed.stars === "number" && Number.isFinite(parsed.stars)
          ? parsed.stars
          : typeof parsed.points === "number" && Number.isFinite(parsed.points)
            ? parsed.points
            : 0;
      return {
        ...baseProfile,
        ...parsed,
        stars: storedStars,
        rank: getRankForStars(storedStars),
        identityMode: normalizeIdentityMode(parsed.identityMode),
        nickname: typeof parsed.nickname === "string" ? parsed.nickname : null,
        legalName: typeof parsed.legalName === "string" ? parsed.legalName : null,
        citiesVisited: Array.isArray(parsed.citiesVisited) ? parsed.citiesVisited : []
      };
    }
  } catch (_) {}
  return baseProfile;
})();

const REVENUE_POOL = (() => {
  const basePool = { monthlySponsorRevenue: 0, communityPool: 0, distributionLog: [] };
  try {
    const stored = localStorage.getItem("gt_revenue_pool");
    if (!stored) return basePool;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return basePool;
    return {
      monthlySponsorRevenue: typeof parsed.monthlySponsorRevenue === "number" && Number.isFinite(parsed.monthlySponsorRevenue) ? parsed.monthlySponsorRevenue : 0,
      communityPool: typeof parsed.communityPool === "number" && Number.isFinite(parsed.communityPool) ? parsed.communityPool : 0,
      distributionLog: Array.isArray(parsed.distributionLog) ? parsed.distributionLog : []
    };
  } catch (_) { return basePool; }
})();

// ─── CITY INDEX ───────────────────────────────────────────────────
const CITY_INDEX = [
  { id: "beijing-cn",    name: "Beijing",    country: "China",          lat: 39.9042,  lng: 116.4074, tier: "global_economic", tags: ["capital","political","economic"] },
  { id: "frankfurt-de",  name: "Frankfurt",  country: "Germany",        lat: 50.1109,  lng: 8.6821,   tier: "finance_hub",     tags: ["finance","europe","weekend_city"] },
  { id: "london-uk",     name: "London",     country: "United Kingdom", lat: 51.5074,  lng: -0.1278,  tier: "global_economic", tags: ["finance","nightlife","uni"] },
  { id: "sao-paulo-br",  name: "São Paulo",  country: "Brazil",         lat: -23.5505, lng: -46.6333, tier: "mega_city",        tags: ["nightlife","street_culture"] },
  { id: "sunderland-uk", name: "Sunderland", country: "United Kingdom", lat: 54.9069,  lng: -1.3838,  tier: "uni_club_city",   tags: ["uni","club_scene","football"] }
];

const PULSE_DIMENSIONS = {
  mood:      ["calm","hopeful","excited","anxious","restless"],
  nightlife: ["club_intensity","bar_intensity","street_energy"],
  economic:  ["local_spend","business_confidence","footfall"],
  study:     ["uni_activity","exam_stress","campus_vibe"],
  tourism:   ["tourist_density","photo_spots","weekend_attractiveness"]
};

const cityPulseState = {};

// ─── HELPERS ──────────────────────────────────────────────────────
function clamp(val, min, max) { return Math.max(min, Math.min(max, Math.round(val))); }
function avg(arr) { if (!arr.length) return 0; return arr.reduce((a, b) => a + b, 0) / arr.length; }

function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount || 0);
}

function getNextDistributionDate() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function normalizeIdentityMode(identityMode) {
  if (identityMode === "nickname") return "nickname";
  if (identityMode === "legal" || identityMode === "legalName") return "legal";
  return "anonymous";
}

// ─── SPONSORSHIPS ─────────────────────────────────────────────────
const NIGHTLIFE_SCENES = ["club","bar","street","stadium","festival"];

const SPONSORSHIPS = [
  { id: "red-bull-nightlife-scene",       type: "scene",   target: "nightlife",            brand: "Red Bull",     rewardMultiplier: 2, bannerText: "Powered by Red Bull" },
  { id: "visit-dubai-tourism-scene",      type: "scene",   target: "tourism",              brand: "Visit Dubai",  rewardMultiplier: 2, bannerText: "Tourism Boost by Visit Dubai" },
  { id: "citymapper-london-city",         type: "city",    target: "london-uk",            brand: "CityMapper",   rewardMultiplier: 2, bannerText: "London Pulse powered by CityMapper" },
  { id: "qatar-airways-london-sao-paulo", type: "trip",    target: "london-uk->sao-paulo-br", brand: "Qatar Airways", rewardMultiplier: 2, bannerText: "Route powered by Qatar Airways" },
  { id: "airbnb-tourism-checkin",         type: "checkin", target: "tourism",              brand: "Airbnb",       rewardMultiplier: 2, bannerText: "Check-ins boosted by Airbnb" }
];

function getRouteId(fromCityId, toCityId) {
  if (!fromCityId || !toCityId) return "";
  return `${fromCityId}->${toCityId}`;
}

function matchesSponsorshipTarget(target, context = {}) {
  const { cityId, scene, routeId, scenario, sceneCategory } = context;
  if (!target) return false;
  if (target === cityId)  return true;
  if (target === routeId) return true;
  if (target === "nightlife") return NIGHTLIFE_SCENES.includes(scene) || scenario === "nightlife" || sceneCategory === "nightlife";
  if (target === "tourism") {
    const isTripWeekend = !scene && !sceneCategory && scenario === "weekend";
    return scene === "tourism" || sceneCategory === "tourism" || isTripWeekend;
  }
  return false;
}

function getMatchingSponsorships(context = {}, allowedTypes = []) {
  return SPONSORSHIPS.filter((s) => {
    if (!s || !s.type || !s.target) return false;
    if (allowedTypes.length && !allowedTypes.includes(s.type)) return false;
    return matchesSponsorshipTarget(s.target, context);
  });
}

function getBestSponsorship(sponsorships = []) {
  if (!sponsorships.length) return null;
  return sponsorships.reduce((best, current) => current.rewardMultiplier > best.rewardMultiplier ? current : best);
}

function getCitySponsor(city) {
  const byCity = getMatchingSponsorships({ cityId: city.id }, ["city"]);
  if (byCity.length) return getBestSponsorship(byCity);
  const nightlifeTagMatch = city.tags.some(tag => ["nightlife","club_scene","street_culture"].includes(tag));
  const tourismTagMatch   = city.tags.some(tag => ["tourism","weekend_city"].includes(tag));
  let sceneCategory = "";
  if (nightlifeTagMatch)      sceneCategory = "nightlife";
  else if (tourismTagMatch)   sceneCategory = "tourism";
  else {
    const scores = computeCityPulseScores(city.id);
    sceneCategory = (scores?.nightlifeScore ?? 0) >= (scores?.tourismScore ?? 0) ? "nightlife" : "tourism";
  }
  return getBestSponsorship(getMatchingSponsorships({ cityId: city.id, sceneCategory }, ["scene"]));
}

function updateCheckinSponsorBanner() {
  const container = document.getElementById("checkin-sponsor-banner");
  if (!container) return;
  const cityId = document.getElementById("checkin-city")?.value || "";
  const scene  = document.getElementById("checkin-scene")?.value || "";
  const sponsor = getBestSponsorship(getMatchingSponsorships({ cityId, scene }, ["scene","city","checkin"]));
  container.innerHTML = sponsor
    ? `<div class="gt-sponsor-banner">★ ${escapeHtml(sponsor.bannerText)} · ${sponsor.rewardMultiplier}×</div>`
    : "";
}

// ─── TIER WEIGHTS & DEFAULTS ──────────────────────────────────────
const TIER_WEIGHTS = {
  global_economic: { nightlife: 0.20, economic: 0.40, study: 0.10, tourism: 0.20, mood: 0.10 },
  finance_hub:     { nightlife: 0.10, economic: 0.35, study: 0.05, tourism: 0.35, mood: 0.15 },
  uni_club_city:   { nightlife: 0.35, economic: 0.05, study: 0.35, tourism: 0.10, mood: 0.15 },
  mega_city:       { nightlife: 0.35, economic: 0.20, study: 0.05, tourism: 0.30, mood: 0.10 }
};

const TIER_DEFAULTS = {
  global_economic: {
    mood:      { calm: 30, hopeful: 35, excited: 20, anxious: 10, restless: 5 },
    nightlife: { club_intensity: 65, bar_intensity: 68, street_energy: 60 },
    economic:  { local_spend: 70, business_confidence: 75, footfall: 72 },
    study:     { uni_activity: 65, exam_stress: 50, campus_vibe: 60 },
    tourism:   { tourist_density: 70, photo_spots: 72, weekend_attractiveness: 62 }
  },
  finance_hub: {
    mood:      { calm: 35, hopeful: 30, excited: 18, anxious: 12, restless: 5 },
    nightlife: { club_intensity: 55, bar_intensity: 62, street_energy: 50 },
    economic:  { local_spend: 72, business_confidence: 82, footfall: 68 },
    study:     { uni_activity: 55, exam_stress: 45, campus_vibe: 50 },
    tourism:   { tourist_density: 58, photo_spots: 55, weekend_attractiveness: 72 }
  },
  uni_club_city: {
    mood:      { calm: 20, hopeful: 35, excited: 30, anxious: 10, restless: 5 },
    nightlife: { club_intensity: 82, bar_intensity: 75, street_energy: 70 },
    economic:  { local_spend: 50, business_confidence: 48, footfall: 52 },
    study:     { uni_activity: 85, exam_stress: 65, campus_vibe: 78 },
    tourism:   { tourist_density: 30, photo_spots: 35, weekend_attractiveness: 45 }
  },
  mega_city: {
    mood:      { calm: 10, hopeful: 28, excited: 42, anxious: 12, restless: 8 },
    nightlife: { club_intensity: 92, bar_intensity: 88, street_energy: 90 },
    economic:  { local_spend: 65, business_confidence: 62, footfall: 75 },
    study:     { uni_activity: 62, exam_stress: 50, campus_vibe: 58 },
    tourism:   { tourist_density: 78, photo_spots: 80, weekend_attractiveness: 82 }
  }
};

const TIER_SUMMARIES = {
  global_economic: "Global powerhouse — economic weight, cultural depth, and round-the-clock energy.",
  finance_hub:     "Finance nerve centre — business confidence high, weekend draw rising.",
  uni_club_city:   "Student energy and late-night intensity define the city's rhythm.",
  mega_city:       "A 24-hour megacity — street culture, nightlife, and raw momentum."
};
const DEFAULT_CITY_SUMMARY = "A city alive with its own pulse.";

// ─── PULSE ENGINE ─────────────────────────────────────────────────
function computeCityPulseScores(cityId) {
  const state = cityPulseState[cityId];
  const city  = CITY_INDEX.find(c => c.id === cityId);
  if (!state || !city) return null;

  const m = state.mood;
  const moodScore = clamp(avg([m.calm, m.hopeful, m.excited]) * 0.75 + (100 - avg([m.anxious, m.restless])) * 0.25, 0, 100);
  const nightlifeScore = clamp(avg(Object.values(state.nightlife)), 0, 100);
  const economicScore  = clamp(avg(Object.values(state.economic)), 0, 100);
  const s = state.study;
  const studyScore = clamp(avg([s.uni_activity, s.campus_vibe]) * 0.8 + (100 - s.exam_stress) * 0.2, 0, 100);
  const tourismScore   = clamp(avg(Object.values(state.tourism)), 0, 100);

  const w = TIER_WEIGHTS[city.tier] || TIER_WEIGHTS.global_economic;
  const overall = clamp(
    nightlifeScore * w.nightlife + economicScore * w.economic +
    studyScore * w.study + tourismScore * w.tourism + moodScore * w.mood,
    0, 100
  );

  return {
    overall:        Math.round(overall),
    moodScore:      Math.round(moodScore),
    nightlifeScore: Math.round(nightlifeScore),
    economicScore:  Math.round(economicScore),
    studyScore:     Math.round(studyScore),
    tourismScore:   Math.round(tourismScore)
  };
}

function syncCityDerivedState(cityId) {
  const state = cityPulseState[cityId];
  const city  = CITY_INDEX.find(c => c.id === cityId);
  if (!state || !city) return null;
  const scores = computeCityPulseScores(cityId);
  if (!scores) return null;
  state.overall = scores.overall;
  state.moodScore = scores.moodScore;
  state.nightlifeScore = scores.nightlifeScore;
  state.economicScore  = scores.economicScore;
  state.studyScore     = scores.studyScore;
  state.tourismScore   = scores.tourismScore;
  state.narrative = buildCityNarrative(cityId, scores);
  const entry = latestPulseByCity[city.name];
  if (entry) {
    entry.pulse_score       = scores.overall;
    entry.tempo_score       = Math.round(avg([state.nightlife.street_energy, state.economic.footfall]));
    entry.romantic_index    = Math.round(avg([state.tourism.photo_spots, state.mood.calm]));
    entry.economic_vibe     = scores.economicScore;
    entry.cultural_heat     = Math.round(scores.tourismScore / 20);
    entry.tourism_influence = Math.round(scores.tourismScore / 10);
    entry.nightlife_index   = scores.nightlifeScore;
    entry.uni_vibe          = scores.studyScore;
    entry.mood_distribution = Object.entries(state.mood).map(([label, value]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), value }));
  }
  return scores;
}

// ─── NARRATIVE ENGINE ─────────────────────────────────────────────
function buildCityNarrative(cityId, scores) {
  const city = CITY_INDEX.find(c => c.id === cityId);
  if (!scores || !city) return { headline: "Data loading…", line1: "", line2: "", tags: [] };
  const { nightlifeScore, economicScore, studyScore, tourismScore, moodScore, overall } = scores;
  let headline = "", line1 = "", line2 = "";

  if (nightlifeScore >= 75 && tourismScore >= 65) {
    headline = "The city is running hot tonight.";
    line1 = "Clubs are alive and tourists are flooding the streets.";
    line2 = "If you want energy, this is your moment.";
  } else if (economicScore >= 70 && nightlifeScore < 60) {
    headline = "Money is moving, but the nights are quiet.";
    line1 = "Business confidence is strong and spending is high.";
    line2 = "Come for the deals, not the dance floors.";
  } else if (studyScore >= 70) {
    headline = "Campus energy is peaking.";
    line1 = "University activity is at its highest.";
    line2 = "Great time to network, learn, and grow.";
  } else if (tourismScore >= 70 && nightlifeScore < 60) {
    headline = "A destination moment — sights and scenes await.";
    line1 = "Tourist spots and photo opportunities are thriving.";
    line2 = "Perfect for the weekend explorer.";
  } else if (moodScore >= 70) {
    headline = "The city has a quiet confidence about it.";
    line1 = "Calm and hopeful vibes flow through the streets.";
    line2 = "A good time to arrive and settle in.";
  } else if (overall >= 60) {
    headline = "Steady pulse — city is in motion.";
    line1 = "Energy levels are solid across the board.";
    line2 = "No extreme highs, but nothing quiet either.";
  } else {
    headline = "The city is catching its breath.";
    line1 = "Things are slower than usual right now.";
    line2 = "Could be a good time to visit off-peak.";
  }

  const tags = [];
  if (nightlifeScore >= 70)      tags.push("Nightlife strong");
  else if (nightlifeScore >= 50) tags.push("Nightlife steady");
  else                            tags.push("Low nightlife");
  if (economicScore >= 70)       tags.push("Economy strong");
  else if (economicScore >= 50)  tags.push("Economy steady");
  else                            tags.push("Economy slow");
  if (studyScore >= 70)          tags.push("Campus buzzing");
  if (tourismScore >= 65)        tags.push("Good for weekend");
  if (moodScore >= 70)           tags.push("Positive mood");
  if (overall >= 70)             tags.push("High energy city");
  else if (overall < 50)         tags.push("Low tempo");

  return { headline, line1, line2, tags };
}

// ─── TRIP PULSE ENGINE ────────────────────────────────────────────
function computeTripPulse(fromCityId, toCityId, scenario) {
  const fromScores = computeCityPulseScores(fromCityId);
  const toScores   = computeCityPulseScores(toCityId);
  if (!fromScores || !toScores) return null;
  const toState = cityPulseState[toCityId];
  let score = 0, headline = "";
  const reasons = [];

  switch (scenario) {
    case "sell": {
      const footfall = toState?.economic?.footfall ?? toScores.economicScore;
      score = Math.round(toScores.economicScore * 0.45 + toScores.tourismScore * 0.35 + footfall * 0.20);
      headline = score >= 65 ? "Strong commercial conditions at destination." : score >= 45 ? "Mixed commercial outlook — proceed with caution." : "Low commercial energy — consider waiting.";
      reasons.push(toScores.economicScore >= 65 ? "Local spend is strong" : "Local spend is weak");
      reasons.push(toScores.tourismScore >= 65  ? "Tourist density is high" : "Tourist density is low");
      reasons.push(footfall >= 65 ? "Footfall is high" : "Footfall is low");
      break;
    }
    case "weekend": {
      score = Math.round(toScores.nightlifeScore * 0.40 + toScores.tourismScore * 0.40 + toScores.moodScore * 0.20);
      headline = score >= 65 ? "Perfect weekend destination — go now." : score >= 45 ? "Decent weekend potential — worth a look." : "Weekend pulse is weak there right now.";
      reasons.push(toScores.nightlifeScore >= 65 ? "Nightlife is firing" : "Nightlife is quiet");
      reasons.push(toScores.tourismScore >= 65   ? "Tourism scene is buzzing" : "Tourism is subdued");
      reasons.push(toScores.moodScore >= 65      ? "City mood is positive" : "City mood is flat");
      break;
    }
    case "study": {
      score = Math.round(toScores.studyScore * 0.65 + toScores.moodScore * 0.35);
      headline = score >= 65 ? "Great study environment at destination." : score >= 45 ? "Acceptable study conditions." : "Study environment is challenging right now.";
      reasons.push(toScores.studyScore >= 65 ? "Campus activity is strong" : "Campus activity is low");
      reasons.push(toScores.moodScore >= 65  ? "Mood is calm and focused" : "City mood may be distracting");
      const examStress = toState?.study?.exam_stress ?? 50;
      reasons.push(examStress >= 65 ? "High exam stress — intense environment" : "Low exam pressure — relaxed campus");
      break;
    }
    case "nightlife": default: {
      score = Math.round(toScores.nightlifeScore * 0.75 + toScores.moodScore * 0.25);
      headline = score >= 70 ? "This city goes hard tonight." : score >= 50 ? "Decent scene but not peak energy." : "Quiet nights — not the time for this city.";
      const ns = toState?.nightlife;
      const lv = v => v >= 70 ? "high" : v >= 50 ? "moderate" : "low";
      reasons.push(ns ? `Club intensity is ${lv(ns.club_intensity)} (${ns.club_intensity})` : "Club data loading");
      reasons.push(ns ? `Bar intensity is ${lv(ns.bar_intensity)} (${ns.bar_intensity})` : "Bar data loading");
      reasons.push(ns ? `Street energy is ${lv(ns.street_energy)} (${ns.street_energy})` : "Street data loading");
      break;
    }
  }

  score = clamp(score, 0, 100);
  const verdict = score >= 65 ? "go" : score >= 40 ? "maybe" : "wait";
  return { score, verdict, headline, reasons };
}

// ─── TRIP RESULT RENDERER ─────────────────────────────────────────
function renderTripResult(result) {
  const container = document.getElementById("trip-result");
  if (!container) return;
  const verdictLabel = { go: "GO ✓", maybe: "MAYBE ~", wait: "WAIT ✗" };
  const verdictClass = { go: "gt-verdict-go", maybe: "gt-verdict-maybe", wait: "gt-verdict-wait" };
  const routeId = getRouteId(result.fromCityId, result.toCityId);
  const sponsor = getBestSponsorship(getMatchingSponsorships({ routeId, scenario: result.scenario }, ["trip","scene"]));
  const sponsorHtml = sponsor ? `<div class="gt-sponsor-banner" style="margin:0.8rem 0;">★ ${escapeHtml(sponsor.bannerText)} · ${sponsor.rewardMultiplier}×</div>` : "";

  container.innerHTML = `
    <div class="gt-trip-output">
      <div class="gt-trip-score-big">${result.score}</div>
      <div class="gt-trip-verdict ${verdictClass[result.verdict]}">${verdictLabel[result.verdict]}</div>
      <p class="gt-trip-headline">${escapeHtml(result.headline)}</p>
      ${sponsorHtml}
      <ul class="gt-trip-reasons">
        ${result.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join("")}
      </ul>
    </div>
  `;
}

// ─── SEED CITY PULSES ─────────────────────────────────────────────
function seedCityPulses() {
  CITY_INDEX.forEach((city) => {
    const defaults = TIER_DEFAULTS[city.tier];
    if (!defaults) return;
    cityPulseState[city.id] = {
      mood:      { ...defaults.mood },
      nightlife: { ...defaults.nightlife },
      economic:  { ...defaults.economic },
      study:     { ...defaults.study },
      tourism:   { ...defaults.tourism },
      lastUpdated: Date.now()
    };
    const s = cityPulseState[city.id];
    const nightlifeAvg = avg(Object.values(s.nightlife));
    const economicAvg  = avg(Object.values(s.economic));
    const studyAvg     = avg(Object.values(s.study));
    const tourismAvg   = avg(Object.values(s.tourism));
    const moodAvg      = avg(Object.values(s.mood));
    const entry = {
      city: city.name, country: city.country,
      pulse_score:        Math.round(avg([nightlifeAvg, economicAvg, tourismAvg, moodAvg])),
      summary_text:       TIER_SUMMARIES[city.tier] || DEFAULT_CITY_SUMMARY,
      mood_distribution:  Object.entries(s.mood).map(([label, value]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), value })),
      tempo_score:        Math.round(avg([s.nightlife.street_energy, s.economic.footfall])),
      romantic_index:     Math.round((tourismAvg + s.mood.calm) / 2),
      economic_vibe:      Math.round(economicAvg),
      cultural_heat:      Math.round(tourismAvg / 20),
      weather_influence:  10,
      news_influence:     3,
      sports_influence:   3,
      tourism_influence:  Math.round(tourismAvg / 10),
      nightlife_index:    Math.round(nightlifeAvg),
      uni_vibe:           Math.round(studyAvg)
    };
    pulses.push(entry);
    latestPulseByCity[city.name] = entry;
    syncCityDerivedState(city.id);
  });
}

function computeCityCardView(cityId) {
  const state = cityPulseState[cityId];
  const city  = CITY_INDEX.find(c => c.id === cityId);
  if (!state || !city) return null;
  const nightlifeAvg = avg(Object.values(state.nightlife));
  const economicAvg  = avg(Object.values(state.economic));
  const studyAvg     = avg(Object.values(state.study));
  const tourismAvg   = avg(Object.values(state.tourism));
  const moodAvg      = avg(Object.values(state.mood));
  return {
    cityId, name: city.name, country: city.country,
    overallPulseScore: Math.round(avg([nightlifeAvg, economicAvg, studyAvg, tourismAvg, moodAvg])),
    nightlifeAvg: Math.round(nightlifeAvg), economicAvg: Math.round(economicAvg),
    studyAvg: Math.round(studyAvg), tourismAvg: Math.round(tourismAvg)
  };
}

// ─── CITY DETAIL MODAL ────────────────────────────────────────────
function openCityDetail(cityName) {
  const pulse     = latestPulseByCity[cityName];
  if (!pulse) return;
  const cityEntry = CITY_INDEX.find(c => c.name === cityName);
  const state     = cityEntry ? cityPulseState[cityEntry.id] : null;
  const scores    = cityEntry ? computeCityPulseScores(cityEntry.id) : null;
  const narrative = cityEntry ? buildCityNarrative(cityEntry.id, scores) : null;
  const citySponsor = cityEntry ? getCitySponsor(cityEntry) : null;
  const modal = document.getElementById("city-modal");
  const body  = document.getElementById("city-modal-body");
  const cityCheckins = HUMAN_CHECKINS.filter(c => c.cityId === (cityEntry && cityEntry.id)).slice(-5).reverse();
  const sponsorHtml = citySponsor ? `<div class="gt-sponsor-banner" style="margin:0.6rem 0;">★ ${escapeHtml(citySponsor.bannerText)} · ${citySponsor.rewardMultiplier}×</div>` : "";

  body.innerHTML = `
    <h2 class="gt-modal-body-title">${escapeHtml(pulse.city)}</h2>
    ${sponsorHtml}
    ${narrative ? `
      <p class="gt-modal-narrative-headline">${escapeHtml(narrative.headline)}</p>
      <p class="gt-modal-narrative-line">${escapeHtml(narrative.line1)}</p>
      <p class="gt-modal-narrative-line">${escapeHtml(narrative.line2)}</p>
      <div class="gt-mood-tags" style="margin-bottom:1rem;">
        ${narrative.tags.map(t => `<span class="gt-tag">${escapeHtml(t)}</span>`).join("")}
      </div>
    ` : `<p class="gt-modal-body-sub">${escapeHtml(pulse.summary_text)}</p>`}
    ${scores ? `
      <div class="gt-modal-grid">
        <div class="gt-modal-section-header">Dimensional Scores</div>
        ${metricBlock("Overall Pulse", scores.overall)}
        ${metricBlock("Mood Score", scores.moodScore)}
        ${metricBlock("Nightlife", scores.nightlifeScore)}
        ${metricBlock("Economic", scores.economicScore)}
        ${metricBlock("Study", scores.studyScore)}
        ${metricBlock("Tourism", scores.tourismScore)}
        ${state ? `
          <div class="gt-modal-section-header">Nightlife Breakdown</div>
          ${Object.entries(state.nightlife).map(([k,v]) => metricBlock(k.replace(/_/g," "), v)).join("")}
          <div class="gt-modal-section-header">Economic Breakdown</div>
          ${Object.entries(state.economic).map(([k,v]) => metricBlock(k.replace(/_/g," "), v)).join("")}
          <div class="gt-modal-section-header">Study Breakdown</div>
          ${Object.entries(state.study).map(([k,v]) => metricBlock(k.replace(/_/g," "), v)).join("")}
          <div class="gt-modal-section-header">Tourism Breakdown</div>
          ${Object.entries(state.tourism).map(([k,v]) => metricBlock(k.replace(/_/g," "), v)).join("")}
          <div class="gt-modal-section-header">Mood Breakdown</div>
          ${Object.entries(state.mood).map(([k,v]) => metricBlock(k.charAt(0).toUpperCase()+k.slice(1), v)).join("")}
        ` : ""}
      </div>
    ` : ""}
    ${cityCheckins.length ? `
      <div class="gt-checkins-section">
        <div class="gt-checkins-section-header">Recent Check-ins</div>
        ${cityCheckins.map(c => renderCheckinItem(c)).join("")}
      </div>
    ` : ""}
  `;
  modal.classList.remove("gt-hidden");
}

function metricBlock(label, value) {
  return `<div class="gt-modal-metric"><div class="gt-modal-metric-label">${escapeHtml(label)}</div><div class="gt-modal-metric-value">${value ?? "—"}</div></div>`;
}

function closeCityModal() {
  document.getElementById("city-modal").classList.add("gt-hidden");
}

// ─── GOLDEN PATH ──────────────────────────────────────────────────
function recordVisit(city, coords) {
  if (!goldenPath.visitedCities.includes(city)) goldenPath.visitedCities.push(city);
  goldenPath.visitedCoords.push(coords);
  const cityEntry = CITY_INDEX.find(c => c.name === city);
  if (cityEntry && cityPulseState[cityEntry.id]) {
    const state = cityPulseState[cityEntry.id];
    const boost = 2;
    state.tourism.tourist_density        = clamp(state.tourism.tourist_density + boost, 0, 100);
    state.tourism.weekend_attractiveness = clamp(state.tourism.weekend_attractiveness + boost, 0, 100);
    state.nightlife.street_energy        = clamp(state.nightlife.street_energy + boost, 0, 100);
    state.lastUpdated = Date.now();
    syncCityDerivedState(cityEntry.id);
  }
  calculatePilgrimScore();
  checkGoldenPathUnlock();
  renderVisitedCities();
}

function calculatePilgrimScore() {
  goldenPath.pilgrimScore = Math.min(100, goldenPath.visitedCities.length * 5);
  const el = document.getElementById("pilgrim-score-display");
  if (el) el.textContent = `${goldenPath.pilgrimScore}%`;
}

function checkGoldenPathUnlock() {
  if (goldenPath.visitedCities.length >= 3 && !goldenPath.unlocked) {
    goldenPath.unlocked = true;
    activateExplorerMode();
  }
}

function activateExplorerMode() {
  const section = document.getElementById("explorer-mode");
  if (section) section.classList.remove("gt-section-hidden");
  initGoldenMap();
  drawGoldenPath();
}

function renderVisitedCities() {
  const list = document.getElementById("visited-cities-list");
  if (!list) return;
  list.innerHTML = goldenPath.visitedCities.length
    ? goldenPath.visitedCities.map(c => `<span style="display:block;padding:0.3rem 0;border-bottom:1px solid var(--line);color:var(--gold);">◎ ${escapeHtml(c)}</span>`).join("")
    : "No cities yet. Your constellation awaits.";
}

let goldenSvg = null;
function initGoldenMap() {
  const container = document.getElementById("golden-map");
  if (!container) return;
  container.innerHTML = "";
  const svgNS = "http://www.w3.org/2000/svg";
  goldenSvg = document.createElementNS(svgNS, "svg");
  goldenSvg.setAttribute("width", "100%");
  goldenSvg.setAttribute("height", "100%");
  container.appendChild(goldenSvg);
}

function drawGoldenPath() {
  if (!goldenSvg) return;
  const svgNS = "http://www.w3.org/2000/svg";
  while (goldenSvg.firstChild) goldenSvg.removeChild(goldenSvg.firstChild);
  const coords = goldenPath.visitedCoords;
  if (!coords.length) return;
  const xs = coords.map(c => c.lng), ys = coords.map(c => c.lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 24;

  coords.forEach((c, i) => {
    const x = ((c.lng - minX) / (maxX - minX || 1)) * (goldenSvg.clientWidth - pad*2) + pad;
    const y = ((c.lat - minY) / (maxY - minY || 1)) * (goldenSvg.clientHeight - pad*2) + pad;

    if (i > 0) {
      const prev = coords[i-1];
      const px = ((prev.lng - minX) / (maxX - minX || 1)) * (goldenSvg.clientWidth - pad*2) + pad;
      const py = ((prev.lat - minY) / (maxY - minY || 1)) * (goldenSvg.clientHeight - pad*2) + pad;
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", px); line.setAttribute("y1", py);
      line.setAttribute("x2", x);  line.setAttribute("y2", y);
      line.setAttribute("stroke", "#E8B84B");
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-dasharray", "4 4");
      line.setAttribute("opacity", "0.6");
      goldenSvg.appendChild(line);
    }

    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", 5);
    dot.setAttribute("fill", "#E8B84B");
    dot.setAttribute("filter", "drop-shadow(0 0 6px #E8B84B)");
    goldenSvg.appendChild(dot);
  });
}

// ─── CITY HEAT ────────────────────────────────────────────────────
function calculateCityGoldenHeat(city) {
  if (!cityHeat[city]) cityHeat[city] = { intersections: 0, dropsClaimed: 0, explorerVisits: 0, pulseHistory: [], heatScore: 0 };
  const entry = cityHeat[city];
  entry.explorerVisits += 1;
  entry.intersections = goldenPath.visitedCities.filter(c => c === city).length;
  const cityEntry = CITY_INDEX.find(c => c.name === city);
  const scores    = cityEntry ? computeCityPulseScores(cityEntry.id) : null;
  const nightlifeScore = scores ? scores.nightlifeScore : (latestPulseByCity[city]?.nightlife_index ?? 50);
  const tourismScore   = scores ? scores.tourismScore   : (latestPulseByCity[city]?.tourism_influence ?? 50);
  if (scores) entry.pulseHistory.push(scores.overall);
  const avgPulse = entry.pulseHistory.reduce((a,b) => a+b, 0) / (entry.pulseHistory.length || 1);
  entry.heatScore = Math.round(
    entry.intersections * 2 + entry.dropsClaimed * 5 + entry.explorerVisits +
    nightlifeScore * 0.3 + tourismScore * 0.3 + avgPulse * 0.4
  );
  updateGlobalScoreboard();
}

// ─── LIVE SIMULATION ──────────────────────────────────────────────
const LIVE_PULSE_INTERVAL_MS = 4500;
const PULSE_MIN = 30, PULSE_MAX = 100, PULSE_DRIFT = 6, TEMPO_DRIFT = 4;
const NIGHTLIFE_MIN = 20, UNI_MIN = 20;
let livePulseIntervalId = null;

function simulateLivePulses() {
  livePulseIntervalId = setInterval(() => {
    const utcHour = new Date().getUTCHours();
    Object.values(latestPulseByCity).forEach((pulse) => {
      pulse.pulse_score = clamp(pulse.pulse_score + (Math.random() * PULSE_DRIFT - PULSE_DRIFT/2), PULSE_MIN, PULSE_MAX);
      pulse.tempo_score = clamp(pulse.tempo_score + (Math.random() * TEMPO_DRIFT - TEMPO_DRIFT/2), PULSE_MIN, PULSE_MAX);
      if (pulse.nightlife_index !== undefined) {
        const isNight   = utcHour >= 21 || utcHour <= 4;
        const nightTarget = isNight ? 88 : 55;
        pulse.nightlife_index = clamp(pulse.nightlife_index + (nightTarget - pulse.nightlife_index) * 0.08 + (Math.random() * 4 - 2), NIGHTLIFE_MIN, PULSE_MAX);
      }
      if (pulse.uni_vibe !== undefined) {
        const isUniHours = utcHour >= 8 && utcHour <= 18;
        const uniTarget  = isUniHours ? 85 : 45;
        pulse.uni_vibe = clamp(pulse.uni_vibe + (uniTarget - pulse.uni_vibe) * 0.06 + (Math.random() * 3 - 1.5), UNI_MIN, PULSE_MAX);
      }
    });
    renderCityCards();
  }, LIVE_PULSE_INTERVAL_MS);
}

// ─── PWA INSTALL ──────────────────────────────────────────────────
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("install-banner")?.classList.remove("gt-hidden");
});

function setupInstallButton() {
  const btn = document.getElementById("install-btn");
  if (!btn) return;
  btn.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt = null;
    document.getElementById("install-banner")?.classList.add("gt-hidden");
  };
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// ─── CHECK-IN SYSTEM ──────────────────────────────────────────────
const MOOD_EMOJIS  = { excited: "😄", calm: "😌", stressed: "😤", hopeful: "🌟", anxious: "😰" };
const MOOD_TO_DIM  = { excited: "excited", calm: "calm", hopeful: "hopeful", stressed: "anxious", anxious: "anxious" };
const LOW_PULSE_THRESHOLD = 40;

function getCheckinDisplayName(checkin) {
  const mode = normalizeIdentityMode(checkin.identityMode);
  if (mode === "anonymous") return "Anonymous Explorer";
  if (mode === "nickname")  return checkin.nickname || checkin.nameOrNickname || "Anonymous Explorer";
  return checkin.legalName || checkin.nameOrNickname || "Anonymous Explorer";
}

function applyCheckinToCityState(checkin) {
  const state = cityPulseState[checkin.cityId];
  if (!state) return;
  const nudge = (checkin.intensity / 100) * 5;
  const moodDim = MOOD_TO_DIM[checkin.mood];
  if (moodDim && state.mood[moodDim] !== undefined) state.mood[moodDim] = clamp(state.mood[moodDim] + nudge, 0, 100);
  switch (checkin.scene) {
    case "club":    state.nightlife.club_intensity  = clamp(state.nightlife.club_intensity + nudge, 0, 100); break;
    case "bar":     state.nightlife.bar_intensity   = clamp(state.nightlife.bar_intensity + nudge, 0, 100); break;
    case "street":  state.nightlife.street_energy   = clamp(state.nightlife.street_energy + nudge, 0, 100); break;
    case "uni":     state.study.uni_activity = clamp(state.study.uni_activity + nudge, 0, 100); state.study.campus_vibe = clamp(state.study.campus_vibe + nudge, 0, 100); break;
    case "work":    state.economic.business_confidence = clamp(state.economic.business_confidence + nudge, 0, 100); state.economic.footfall = clamp(state.economic.footfall + nudge, 0, 100); break;
    case "tourism": state.tourism.tourist_density = clamp(state.tourism.tourist_density + nudge, 0, 100); state.tourism.photo_spots = clamp(state.tourism.photo_spots + nudge, 0, 100); break;
    case "stadium": state.nightlife.street_energy = clamp(state.nightlife.street_energy + nudge, 0, 100); state.tourism.tourist_density = clamp(state.tourism.tourist_density + nudge/2, 0, 100); break;
    case "home":    state.mood.calm = clamp(state.mood.calm + nudge/2, 0, 100); break;
  }
  state.lastUpdated = Date.now();
  syncCityDerivedState(checkin.cityId);
}

function renderCheckinItem(checkin) {
  const timeAgo = formatTimeAgo(checkin.timestamp);
  const mode    = normalizeIdentityMode(checkin.identityMode);
  const modeLabel = mode === "nickname" ? "Nickname" : mode === "legal" ? "Legal name" : "Anonymous";
  const emoji = MOOD_EMOJIS[checkin.mood] || "";
  return `
    <div class="gt-checkin-item">
      <div class="gt-checkin-identity-row">
        <div class="gt-checkin-identity">${escapeHtml(getCheckinDisplayName(checkin))}</div>
        <div class="gt-checkin-mode">${escapeHtml(modeLabel)}</div>
      </div>
      <div class="gt-checkin-meta">
        <span class="gt-checkin-mood">${emoji} ${escapeHtml(checkin.mood)}</span>
        <span class="gt-checkin-scene">@ ${escapeHtml(checkin.scene)}</span>
        <span class="gt-checkin-time">${escapeHtml(timeAgo)}</span>
      </div>
    </div>
  `;
}

function openCheckinModal() {
  const mode = normalizeIdentityMode(USER_PROFILE.identityMode);
  const activeRadio = document.querySelector(`input[name="checkin-identity-mode"][value="${mode}"]`);
  if (activeRadio) activeRadio.checked = true;
  const nicknameInput  = document.getElementById("checkin-nickname");
  const legalNameInput = document.getElementById("checkin-legal-name");
  if (nicknameInput)  nicknameInput.value  = USER_PROFILE.nickname  || "";
  if (legalNameInput) legalNameInput.value = USER_PROFILE.legalName || "";
  updateIdentityFields(mode);
  document.getElementById("checkin-modal").classList.remove("gt-hidden");
}

function closeCheckinModal() {
  document.getElementById("checkin-modal").classList.add("gt-hidden");
  const errEl = document.getElementById("checkin-error");
  if (errEl) { errEl.classList.add("gt-hidden"); errEl.textContent = ""; }
}

function submitHumanCheckin() {
  const cityId       = document.getElementById("checkin-city").value;
  const activeMood   = document.querySelector("#checkin-mood-picker .gt-mood-btn-active");
  const mood         = activeMood ? activeMood.dataset.mood : "";
  const intensity    = parseInt(document.getElementById("checkin-intensity").value, 10);
  const scene        = document.getElementById("checkin-scene").value;
  const activeIdent  = document.querySelector('input[name="checkin-identity-mode"]:checked');
  const identityMode = normalizeIdentityMode(activeIdent ? activeIdent.value : "anonymous");
  const nicknameInput  = document.getElementById("checkin-nickname").value.trim();
  const legalNameInput = document.getElementById("checkin-legal-name").value.trim();
  const errEl = document.getElementById("checkin-error");

  if (!cityId || !mood) {
    errEl.textContent = !cityId ? "Please select a city." : "Please select a mood.";
    errEl.classList.remove("gt-hidden"); return;
  }
  if (identityMode === "nickname" && !nicknameInput) { errEl.textContent = "Please enter your nickname."; errEl.classList.remove("gt-hidden"); return; }
  if (identityMode === "legal"    && !legalNameInput) { errEl.textContent = "Please enter your legal name."; errEl.classList.remove("gt-hidden"); return; }
  errEl.classList.add("gt-hidden");

  const checkin = {
    id: generateUUID(), cityId, mood, intensity, scene, identityMode,
    nickname:      identityMode === "nickname" ? nicknameInput : "",
    legalName:     identityMode === "legal"    ? legalNameInput : "",
    nameOrNickname: identityMode === "nickname" ? nicknameInput : identityMode === "legal" ? legalNameInput : "",
    timestamp: Date.now()
  };

  const matchedSponsor = getBestSponsorship(getMatchingSponsorships({ cityId, scene }, ["scene","city","checkin"]));
  const baseStars      = computeCheckinStars(checkin);
  const multiplier     = matchedSponsor?.rewardMultiplier || 1;
  const earnedStars    = baseStars * multiplier;
  checkin.sponsorId        = matchedSponsor?.id || null;
  checkin.rewardMultiplier = multiplier;

  HUMAN_CHECKINS.push(checkin);
  USER_PROFILE.checkins += 1;
  USER_PROFILE.stars    += earnedStars;
  USER_PROFILE.rank      = getRankForStars(USER_PROFILE.stars);
  if (!USER_PROFILE.citiesVisited.includes(cityId)) USER_PROFILE.citiesVisited.push(cityId);
  USER_PROFILE.identityMode = identityMode;
  if (identityMode === "nickname" && nicknameInput) USER_PROFILE.nickname  = nicknameInput;
  if (identityMode === "legal"    && legalNameInput) USER_PROFILE.legalName = legalNameInput;
  saveUserProfile();
  renderUserProfile();

  applyCheckinToCityState(checkin);

  const cityEntry = CITY_INDEX.find(c => c.id === cityId);
  if (cityEntry) {
    const isNew = !goldenPath.visitedCities.includes(cityEntry.name);
    if (isNew) recordVisit(cityEntry.name, { lat: cityEntry.lat, lng: cityEntry.lng });
    calculateCityGoldenHeat(cityEntry.name);
    drawGoldenPath();
  }

  renderCityCards();
  closeCheckinModal();
}

function getOverallPulseForCity(cityId) {
  const state = cityPulseState[cityId];
  if (typeof state?.overall === "number") return state.overall;
  return computeCityPulseScores(cityId)?.overall ?? null;
}

function computeCheckinStars(checkin) {
  let stars = 1;
  if (!USER_PROFILE.citiesVisited.includes(checkin.cityId)) stars += 2;
  if (["club","stadium","festival"].includes(checkin.scene)) stars += 3;
  const overallPulse = getOverallPulseForCity(checkin.cityId);
  if (typeof overallPulse === "number" && overallPulse < LOW_PULSE_THRESHOLD) stars += 5;
  const dayStart   = new Date(); dayStart.setHours(0,0,0,0);
  const dayStartMs = dayStart.getTime();
  const hasToday   = HUMAN_CHECKINS.some(c => c.cityId === checkin.cityId && c.timestamp >= dayStartMs && c.timestamp < dayStartMs + 86400000);
  if (!hasToday) stars += 10;
  return stars;
}

function populateCheckinCitySelect() {
  const select = document.getElementById("checkin-city");
  if (!select) return;
  select.innerHTML = '<option value="">Select a city…</option>';
  CITY_INDEX.forEach(city => {
    const opt = document.createElement("option");
    opt.value = city.id;
    opt.textContent = `${city.name}, ${city.country}`;
    select.appendChild(opt);
  });
}

function setupCheckinModal() {
  document.getElementById("checkin-modal-close").onclick = closeCheckinModal;
  document.getElementById("checkin-modal-backdrop").onclick = closeCheckinModal;
  const slider = document.getElementById("checkin-intensity");
  const valSpan = document.getElementById("checkin-intensity-val");
  slider.oninput = () => { valSpan.textContent = slider.value; };
  document.querySelectorAll("#checkin-mood-picker .gt-mood-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("#checkin-mood-picker .gt-mood-btn").forEach(b => b.classList.remove("gt-mood-btn-active"));
      btn.classList.add("gt-mood-btn-active");
    };
  });
  document.querySelectorAll('input[name="checkin-identity-mode"]').forEach(radio => {
    radio.onchange = () => {
      if (!radio.checked) return;
      const mode = normalizeIdentityMode(radio.value);
      USER_PROFILE.identityMode = mode;
      updateIdentityFields(mode);
      saveUserProfile();
    };
  });
  document.getElementById("checkin-submit").onclick = submitHumanCheckin;
  document.getElementById("checkin-city").onchange  = updateCheckinSponsorBanner;
  document.getElementById("checkin-scene").onchange = updateCheckinSponsorBanner;
}

function updateIdentityFields(identityMode) {
  const mode = normalizeIdentityMode(identityMode);
  document.getElementById("checkin-nickname-field")?.classList.toggle("gt-hidden", mode !== "nickname");
  document.getElementById("checkin-legal-name-field")?.classList.toggle("gt-hidden", mode !== "legal");
}

function setupCheckin() {
  document.getElementById("checkin-btn")?.addEventListener("click", openCheckinModal);
}

function populateTripSelects() {
  ["trip-from","trip-to"].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="">Select a city…</option>';
    CITY_INDEX.forEach(city => {
      const opt = document.createElement("option");
      opt.value = city.id;
      opt.textContent = `${city.name}, ${city.country}`;
      select.appendChild(opt);
    });
  });
}

function setupTripEvaluate() {
  const btn = document.getElementById("trip-evaluate");
  if (!btn) return;
  btn.onclick = () => {
    const fromId   = document.getElementById("trip-from")?.value;
    const toId     = document.getElementById("trip-to")?.value;
    const scenario = document.getElementById("trip-scenario")?.value || "weekend";
    const container = document.getElementById("trip-result");
    if (!fromId || !toId) { if (container) container.innerHTML = `<p style="color:var(--ember);padding:1rem;">Please select both cities.</p>`; return; }
    if (fromId === toId)  { if (container) container.innerHTML = `<p style="color:var(--ember);padding:1rem;">Start and destination must differ.</p>`; return; }
    const result = computeTripPulse(fromId, toId, scenario);
    if (result) renderTripResult({ ...result, fromCityId: fromId, toCityId: toId, scenario });
  };
}

function setupExplore() {
  document.getElementById("explore-btn")?.addEventListener("click", activateExplorerMode);
}

function setupModalClose() {
  document.getElementById("city-modal-close")?.addEventListener("click", closeCityModal);
  document.getElementById("city-modal")?.addEventListener("click", e => { if (e.target.id === "city-modal") closeCityModal(); });
}

// ─── PROFILE & REVENUE ────────────────────────────────────────────
function saveUserProfile()  { try { localStorage.setItem("gt_user_profile", JSON.stringify(USER_PROFILE)); } catch (_) {} }
function saveRevenuePool()  { try { localStorage.setItem("gt_revenue_pool",  JSON.stringify(REVENUE_POOL)); } catch (_) {} }

function getRevenueParticipants() {
  if (Array.isArray(window.USER_PROFILES) && window.USER_PROFILES.length) return window.USER_PROFILES.filter(p => Number.isFinite(p?.stars) && p.stars > 0);
  return Number.isFinite(USER_PROFILE.stars) && USER_PROFILE.stars > 0 ? [USER_PROFILE] : [];
}

function updateRevenuePool(revenue) {
  const safeRevenue = Number(revenue);
  if (!Number.isFinite(safeRevenue)) return;
  REVENUE_POOL.monthlySponsorRevenue += safeRevenue;
  REVENUE_POOL.communityPool = safeRevenue * 0.05;
  saveRevenuePool();
  renderRevenuePool();
}

function distributeCommunityPool() {
  const participants = getRevenueParticipants();
  const totalStars   = participants.reduce((sum, u) => sum + u.stars, 0);
  const payouts      = participants.map(u => ({ userId: u.id || null, payout: totalStars > 0 ? (u.stars / totalStars) * REVENUE_POOL.communityPool : 0 }));
  REVENUE_POOL.distributionLog.push({ timestamp: Date.now(), totalStars, communityPool: REVENUE_POOL.communityPool, payouts });
  saveRevenuePool();
  renderRevenuePool();
  return payouts;
}

// ─── LEGACY CHECK-INS ─────────────────────────────────────────────
function legacySceneHourWeights(hour) {
  const isNightlife = hour >= 21 || hour < 4;
  const isWork      = hour >= 8  && hour < 17;
  const isUni       = hour >= 10 && hour < 16;
  const isTourism   = hour >= 11 && hour < 20;
  const isEvening   = hour >= 17 && hour < 21;
  return { club: isNightlife?25:2, bar: isNightlife?18:(isEvening?12:2), street: isNightlife?12:(isWork||isTourism?7:4), work: isWork?28:2, uni: isUni?22:3, tourism: isTourism?18:4, home:8, stadium:3 };
}

const LEGACY_TIER_SCENE_BIAS = {
  global_economic: { club:1.0,bar:1.0,street:1.0,work:1.5,uni:1.0,tourism:1.2,home:1.0,stadium:1.0 },
  finance_hub:     { club:0.7,bar:1.2,street:0.8,work:2.0,uni:0.7,tourism:1.3,home:1.0,stadium:0.8 },
  uni_club_city:   { club:2.0,bar:1.5,street:1.0,work:0.5,uni:2.5,tourism:0.7,home:1.0,stadium:1.2 },
  mega_city:       { club:1.8,bar:1.3,street:1.5,work:1.0,uni:0.8,tourism:1.5,home:0.8,stadium:1.2 }
};

const LEGACY_SCENE_MOODS = {
  club:["excited","excited","calm","anxious"], bar:["calm","excited","hopeful","calm"],
  street:["excited","hopeful","anxious","calm"], work:["stressed","hopeful","calm","anxious"],
  uni:["stressed","hopeful","anxious","excited"], tourism:["excited","hopeful","excited","calm"],
  home:["calm","calm","hopeful","anxious"], stadium:["excited","excited","hopeful","anxious"]
};

const LEGACY_SCENE_TIME_WINDOWS = { nightlife:{start:21,end:3}, work:{start:8,end:17}, uni:{start:10,end:16}, tourism:{start:11,end:20} };

function randomHourInWindow(start, end) {
  if (start <= end) return start + Math.floor(Math.random() * (end - start + 1));
  const span = 24 - start + (end + 1);
  const offset = Math.floor(Math.random() * span);
  return offset < (24 - start) ? start + offset : offset - (24 - start);
}

function pickLegacyHourForScene(scene) {
  if (["club","bar","street","stadium","festival"].includes(scene)) return randomHourInWindow(21, 3);
  if (scene === "work")    return randomHourInWindow(8, 17);
  if (scene === "uni")     return randomHourInWindow(10, 16);
  if (scene === "tourism") return randomHourInWindow(11, 20);
  return randomHourInWindow(6, 23);
}

function pickLegacyScene(hour, tier) {
  const effectiveHour = Number.isFinite(hour) ? hour : Math.floor(Math.random() * 24);
  const base = legacySceneHourWeights(effectiveHour);
  const bias = LEGACY_TIER_SCENE_BIAS[tier] || {};
  const weighted = {};
  for (const scene of Object.keys(base)) weighted[scene] = base[scene] * (bias[scene] || 1);
  const total = Object.values(weighted).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (const [scene, w] of Object.entries(weighted)) { rand -= w; if (rand <= 0) return scene; }
  return "home";
}

function pickLegacyMood(scene) {
  const opts = LEGACY_SCENE_MOODS[scene] || ["calm","hopeful","excited","anxious","stressed"];
  return opts[Math.floor(Math.random() * opts.length)];
}

function seedLegacyCheckins() {
  if (hasSeededLegacyCheckins) return;
  if (HUMAN_CHECKINS.some(c => c.legacy)) return;
  hasSeededLegacyCheckins = true;
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayStartMs = todayStart.getTime();
  const DAY_MS = 86400000;
  const legacyCheckins = [];

  CITY_INDEX.forEach(city => {
    for (let day = 0; day < 30; day++) {
      const daysAgo = 30 - day;
      const count   = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        const scene     = pickLegacyScene(undefined, city.tier);
        const hour      = pickLegacyHourForScene(scene);
        const mood      = pickLegacyMood(scene);
        const intensity = 20 + Math.floor(Math.random() * 71);
        const jitter    = Math.floor(Math.random() * 60) * 60000;
        legacyCheckins.push({ id: generateUUID(), cityId: city.id, mood, intensity, scene, identityMode: "anonymous", nameOrNickname: "", timestamp: todayStartMs - daysAgo * DAY_MS + hour * 3600000 + jitter, legacy: true });
      }
    }
  });

  legacyCheckins.sort((a, b) => a.timestamp - b.timestamp);
  HUMAN_CHECKINS.push(...legacyCheckins);

  CITY_INDEX.forEach(city => {
    const state = cityPulseState[city.id];
    if (!state) return;
    const cc = legacyCheckins.filter(c => c.cityId === city.id);
    const sc = {}, mc = {};
    cc.forEach(c => { sc[c.scene] = (sc[c.scene]||0)+1; mc[c.mood] = (mc[c.mood]||0)+1; });
    const g = (o, k) => o[k] || 0;
    const pts  = n => Math.min(n, 40) * 0.09;
    const mpts = n => Math.min(n, 30) * 0.07;
    state.nightlife.club_intensity        = clamp(state.nightlife.club_intensity        + pts(g(sc,"club")), 0, 100);
    state.nightlife.bar_intensity         = clamp(state.nightlife.bar_intensity         + pts(g(sc,"bar")), 0, 100);
    state.nightlife.street_energy         = clamp(state.nightlife.street_energy         + pts(g(sc,"street")+g(sc,"stadium")), 0, 100);
    state.economic.business_confidence    = clamp(state.economic.business_confidence    + pts(g(sc,"work")), 0, 100);
    state.economic.footfall               = clamp(state.economic.footfall               + pts(g(sc,"work")+g(sc,"tourism")), 0, 100);
    state.economic.local_spend            = clamp(state.economic.local_spend            + pts(g(sc,"tourism")+g(sc,"club")+g(sc,"bar")), 0, 100);
    state.study.uni_activity              = clamp(state.study.uni_activity              + pts(g(sc,"uni")), 0, 100);
    state.study.campus_vibe               = clamp(state.study.campus_vibe               + pts(g(sc,"uni")), 0, 100);
    state.tourism.tourist_density         = clamp(state.tourism.tourist_density         + pts(g(sc,"tourism")), 0, 100);
    state.tourism.photo_spots             = clamp(state.tourism.photo_spots             + pts(g(sc,"tourism")), 0, 100);
    state.tourism.weekend_attractiveness  = clamp(state.tourism.weekend_attractiveness  + pts(Math.floor(g(sc,"tourism")/2)), 0, 100);
    state.mood.excited  = clamp(state.mood.excited  + mpts(g(mc,"excited")), 0, 100);
    state.mood.calm     = clamp(state.mood.calm     + mpts(g(mc,"calm")), 0, 100);
    state.mood.hopeful  = clamp(state.mood.hopeful  + mpts(g(mc,"hopeful")), 0, 100);
    state.mood.anxious  = clamp(state.mood.anxious  + mpts(g(mc,"stressed")+g(mc,"anxious")), 0, 100);
    state.mood.restless = clamp(state.mood.restless + mpts(g(mc,"anxious")), 0, 100);
    state.lastUpdated   = Date.now();
    syncCityDerivedState(city.id);
  });

  CITY_INDEX.forEach(city => calculateCityGoldenHeat(city.name));
}

// ═══════════════════════════════════════════════════════════════════
//  NEW UI RENDERS — Design system v2
//  These replace the old render functions. Engine untouched above.
// ═══════════════════════════════════════════════════════════════════

function renderCityCards() {
  const container = document.getElementById("city-cards");
  if (!container) return;
  container.innerHTML = "";

  if (!CITY_INDEX.length) {
    container.innerHTML = '<p class="gt-empty" style="padding:3rem;grid-column:1/-1;">No cities yet. Check in to start the pulse.</p>';
    return;
  }

  CITY_INDEX.forEach((city) => {
    const scores      = computeCityPulseScores(city.id);
    const narrative   = buildCityNarrative(city.id, scores);
    const heatScore   = cityHeat[city.name]?.heatScore || 0;
    const weekAgo     = Date.now() - 7 * 86400000;
    const recentCount = HUMAN_CHECKINS.filter(c => c.cityId === city.id && c.timestamp >= weekAgo).length;
    const citySponsor = getCitySponsor(city);
    const displayScore = scores ? scores.overall : 0;
    const n = scores || { nightlifeScore:0, economicScore:0, studyScore:0, tourismScore:0 };

    const card = document.createElement("article");
    card.className = "gt-city-card";
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `${city.name} city pulse`);
    card.onclick = () => openCityDetail(city.name);
    card.onkeydown = e => { if (e.key === "Enter" || e.key === " ") openCityDetail(city.name); };

    const tags = (narrative.tags || []).slice(0, 3).map(t => `<span class="gt-tag">${escapeHtml(t)}</span>`).join("");
    const sponsorHtml = citySponsor ? `<div class="gt-sponsor-banner">★ ${escapeHtml(citySponsor.bannerText)} · ${citySponsor.rewardMultiplier}×</div>` : "";

    card.innerHTML = `
      <div class="gt-city-card-header">
        <div class="gt-city-name-block">
          <div class="gt-city-name">${escapeHtml(city.name)}</div>
          <div class="gt-city-country">${escapeHtml(city.country)}</div>
        </div>
        <div class="gt-pulse-score">${displayScore}</div>
      </div>
      <p class="gt-narrative-headline">${escapeHtml(narrative.headline || "Reading the city…")}</p>
      ${sponsorHtml}
      <div class="gt-mood-tags">${tags}</div>
      <div class="gt-dimension-bars">
        <div class="gt-dim-bar">
          <div class="gt-dim-bar-header"><span class="gt-dim-bar-label">Nightlife</span><span class="gt-dim-bar-val">${n.nightlifeScore}</span></div>
          <div class="gt-dim-bar-track"><div class="gt-dim-bar-fill nightlife" style="width:${n.nightlifeScore}%"></div></div>
        </div>
        <div class="gt-dim-bar">
          <div class="gt-dim-bar-header"><span class="gt-dim-bar-label">Economic</span><span class="gt-dim-bar-val">${n.economicScore}</span></div>
          <div class="gt-dim-bar-track"><div class="gt-dim-bar-fill economic" style="width:${n.economicScore}%"></div></div>
        </div>
        <div class="gt-dim-bar">
          <div class="gt-dim-bar-header"><span class="gt-dim-bar-label">Study</span><span class="gt-dim-bar-val">${n.studyScore}</span></div>
          <div class="gt-dim-bar-track"><div class="gt-dim-bar-fill study" style="width:${n.studyScore}%"></div></div>
        </div>
        <div class="gt-dim-bar">
          <div class="gt-dim-bar-header"><span class="gt-dim-bar-label">Tourism</span><span class="gt-dim-bar-val">${n.tourismScore}</span></div>
          <div class="gt-dim-bar-track"><div class="gt-dim-bar-fill tourism" style="width:${n.tourismScore}%"></div></div>
        </div>
      </div>
      <div class="gt-city-card-footer">
        <span class="gt-live-activity-chip">
          <span style="width:5px;height:5px;background:var(--green);border-radius:50%;display:inline-block;box-shadow:0 0 4px var(--green);"></span>
          ${recentCount} this week
        </span>
        <span class="gt-heat-chip">🔥 ${heatScore}</span>
      </div>
    `;
    container.appendChild(card);
  });

  // Update hero stat
  const heroEl = document.getElementById("hero-checkins-count");
  if (heroEl) heroEl.textContent = HUMAN_CHECKINS.filter(c => c.timestamp >= Date.now() - 86400000).length;
}

function updateGlobalScoreboard() {
  const container = document.getElementById("global-scoreboard");
  if (!container) return;
  const entries = Object.entries(cityHeat);
  if (!entries.length) { container.innerHTML = '<p class="gt-empty">No heat data yet. Check in to start the pulse.</p>'; return; }
  entries.sort((a, b) => b[1].heatScore - a[1].heatScore);
  container.innerHTML = entries.slice(0, 10).map(([city, data], idx) => `
    <div class="gt-scoreboard-row" role="listitem">
      <span class="gt-score-rank">#${idx + 1}</span>
      <span class="gt-score-city">${escapeHtml(city)}</span>
      <span class="gt-score-heat">${Math.round(data.heatScore)}</span>
    </div>
  `).join("");
}

function renderSponsorWall() {
  const container = document.getElementById("sponsor-wall-list");
  if (!container) return;
  if (!SPONSORSHIPS.length) { container.innerHTML = '<p class="gt-empty" style="padding:2rem;grid-column:1/-1;">No active sponsors yet.</p>'; return; }
  container.innerHTML = SPONSORSHIPS.map(s => `
    <article class="gt-sponsor-card" role="listitem">
      <div class="gt-sponsor-brand">${escapeHtml(s.brand)}</div>
      <div class="gt-sponsor-meta">${escapeHtml(s.type)} · ${escapeHtml(s.target)}</div>
      <div class="gt-sponsor-copy">${escapeHtml(s.bannerText)}</div>
      <div class="gt-sponsor-reward">◈ ${s.rewardMultiplier}× star multiplier active</div>
    </article>
  `).join("");
}

function renderUserProfile() {
  const nicknameEl = document.getElementById("profile-nickname");
  const rankEl     = document.getElementById("profile-rank");
  const starsEl    = document.getElementById("profile-stars");
  const checkinsEl = document.getElementById("profile-checkins");
  const citiesEl   = document.getElementById("profile-cities");

  const mode = normalizeIdentityMode(USER_PROFILE.identityMode);
  const displayName = mode === "nickname" ? (USER_PROFILE.nickname || "Anonymous Explorer") : mode === "legal" ? (USER_PROFILE.legalName || "Anonymous Explorer") : "Anonymous Explorer";
  if (nicknameEl) nicknameEl.textContent = displayName;

  if (rankEl) {
    const rank = USER_PROFILE.rank || "Explorer I";
    const rankClass = rank === "Luminary" ? "gt-rank-luminary" : rank === "Vanguard" ? "gt-rank-vanguard" : rank === "Pathfinder" ? "gt-rank-pathfinder" : rank === "Explorer II" ? "gt-rank-explorer2" : "gt-rank-explorer";
    rankEl.className = `gt-profile-rank ${rankClass}`;
    rankEl.textContent = rank;
  }

  if (starsEl)    starsEl.textContent    = USER_PROFILE.stars    || 0;
  if (checkinsEl) checkinsEl.textContent = USER_PROFILE.checkins || 0;
  if (citiesEl)   citiesEl.textContent   = (USER_PROFILE.citiesVisited || []).length;
}

function renderRevenuePool() {
  const monthlyEl   = document.getElementById("revenue-monthly");
  const communityEl = document.getElementById("revenue-community");
  const nextDateEl  = document.getElementById("revenue-next-date");
  if (monthlyEl)   monthlyEl.textContent   = formatCurrency(REVENUE_POOL.monthlySponsorRevenue);
  if (communityEl) communityEl.textContent = formatCurrency(REVENUE_POOL.communityPool);
  if (nextDateEl)  nextDateEl.textContent  = getNextDistributionDate();
}

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  seedCityPulses();
  seedLegacyCheckins();
  renderCityCards();
  renderSponsorWall();
  populateTripSelects();
  populateCheckinCitySelect();
  setupInstallButton();
  setupCheckin();
  setupCheckinModal();
  setupExplore();
  setupTripEvaluate();
  setupModalClose();
  renderUserProfile();
  renderRevenuePool();
  updateCheckinSponsorBanner();
  simulateLivePulses();
});

window.updateRevenuePool       = updateRevenuePool;
window.distributeCommunityPool = distributeCommunityPool;
