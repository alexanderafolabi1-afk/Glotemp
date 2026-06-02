// Basic in-memory state
const pulses = [];
const goldenPath = {
  visitedCities: [],
  visitedCoords: [],
  unlocked: false,
  pilgrimScore: 0
};
const cityHeat = {};

let latestPulseByCity = {};
let deferredPrompt = null;

// ─── Data layer ──────────────────────────────────────────────────────────────

const CITY_INDEX = [
  {
    id: "beijing-cn",
    name: "Beijing",
    country: "China",
    lat: 39.9042,
    lng: 116.4074,
    tier: "global_economic",
    tags: ["capital", "political", "economic"]
  },
  {
    id: "frankfurt-de",
    name: "Frankfurt",
    country: "Germany",
    lat: 50.1109,
    lng: 8.6821,
    tier: "finance_hub",
    tags: ["finance", "europe", "weekend_city"]
  },
  {
    id: "london-uk",
    name: "London",
    country: "United Kingdom",
    lat: 51.5074,
    lng: -0.1278,
    tier: "global_economic",
    tags: ["finance", "nightlife", "uni"]
  },
  {
    id: "sao-paulo-br",
    name: "São Paulo",
    country: "Brazil",
    lat: -23.5505,
    lng: -46.6333,
    tier: "mega_city",
    tags: ["nightlife", "street_culture"]
  },
  {
    id: "sunderland-uk",
    name: "Sunderland",
    country: "United Kingdom",
    lat: 54.9069,
    lng: -1.3838,
    tier: "uni_club_city",
    tags: ["uni", "club_scene", "football"]
  }
  // extend later with more cities using same structure
];

const PULSE_DIMENSIONS = {
  mood: ["calm", "hopeful", "excited", "anxious", "restless"],
  nightlife: ["club_intensity", "bar_intensity", "street_energy"],
  economic: ["local_spend", "business_confidence", "footfall"],
  study: ["uni_activity", "exam_stress", "campus_vibe"],
  tourism: ["tourist_density", "photo_spots", "weekend_attractiveness"]
};

// Keyed by city id — populated by seedCityPulses()
const cityPulseState = {};

// ─────────────────────────────────────────────────────────────────────────────

// Clamp helper used by live simulation
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Tier-based short summaries used by both seedCityPulses and computeCityCardView
const DEFAULT_CITY_SUMMARY = "A city alive with its own pulse.";
const TIER_SUMMARIES = {
  global_economic: "Global powerhouse — economic weight, cultural depth, and round-the-clock energy.",
  finance_hub: "Finance nerve centre — business confidence high, weekend draw rising.",
  uni_club_city: "Student energy and late-night intensity define the city's rhythm.",
  mega_city: "A 24-hour megacity — street culture, nightlife, and raw momentum."
};

// Tier-based default pulse values
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

function seedCityPulses() {
  CITY_INDEX.forEach((city) => {
    const defaults = TIER_DEFAULTS[city.tier];
    if (!defaults) return;

    cityPulseState[city.id] = {
      mood:        { ...defaults.mood },
      nightlife:   { ...defaults.nightlife },
      economic:    { ...defaults.economic },
      study:       { ...defaults.study },
      tourism:     { ...defaults.tourism },
      lastUpdated: Date.now()
    };

    // Sync latestPulseByCity for simulation + heat compatibility
    const s = cityPulseState[city.id];
    const nightlifeAvg = avg(Object.values(s.nightlife));
    const economicAvg  = avg(Object.values(s.economic));
    const studyAvg     = avg(Object.values(s.study));
    const tourismAvg   = avg(Object.values(s.tourism));
    const moodAvg      = avg(Object.values(s.mood));

    const entry = {
      city:               city.name,
      country:            city.country,
      pulse_score:        Math.round(avg([nightlifeAvg, economicAvg, tourismAvg, moodAvg])),
      summary_text:       TIER_SUMMARIES[city.tier] || DEFAULT_CITY_SUMMARY,
      mood_distribution:  Object.entries(s.mood).map(([label, value]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value
      })),
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
  });
}

// Derives the card-view object for a city from its pulse state
function computeCityCardView(cityId) {
  const state = cityPulseState[cityId];
  const city  = CITY_INDEX.find((c) => c.id === cityId);
  if (!state || !city) return null;

  const nightlifeAvg = avg(Object.values(state.nightlife));
  const economicAvg  = avg(Object.values(state.economic));
  const studyAvg     = avg(Object.values(state.study));
  const tourismAvg   = avg(Object.values(state.tourism));
  const moodAvg      = avg(Object.values(state.mood));

  const overallPulseScore = Math.round(avg([nightlifeAvg, economicAvg, studyAvg, tourismAvg, moodAvg]));

  const dims = [
    { label: "Nightlife", val: nightlifeAvg },
    { label: "Economy",   val: economicAvg },
    { label: "Study",     val: studyAvg },
    { label: "Tourism",   val: tourismAvg }
  ].sort((a, b) => b.val - a.val);

  const keyTags = dims.slice(0, 2).map((d) => {
    const level = d.val >= 75 ? "strong" : d.val >= 55 ? "steady" : "quiet";
    return `${d.label} ${level}`;
  }).join(" · ");

  return {
    cityId,
    name:               city.name,
    country:            city.country,
    overallPulseScore,
    shortSummary:       TIER_SUMMARIES[city.tier] || DEFAULT_CITY_SUMMARY,
    keyTags,
    nightlifeAvg:       Math.round(nightlifeAvg),
    economicAvg:        Math.round(economicAvg),
    studyAvg:           Math.round(studyAvg),
    tourismAvg:         Math.round(tourismAvg)
  };
}

function renderCityCards() {
  const container = document.getElementById("city-cards");
  container.innerHTML = "";

  if (!CITY_INDEX.length) {
    container.innerHTML =
      '<p class="gt-empty">No cities yet. Check in to start the pulse.</p>';
    return;
  }

  CITY_INDEX.forEach((city) => {
    const view     = computeCityCardView(city.id);
    const liveData = latestPulseByCity[city.name] || {};
    const heatScore = cityHeat[city.name]?.heatScore || 0;
    if (!view) return;

    const displayPulseScore = liveData.pulse_score ?? view.overallPulseScore;

    const card = document.createElement("div");
    card.className = "gt-city-card";
    card.onclick = () => openCityDetail(city.name);

    card.innerHTML = `
      <div class="gt-city-header">
        <div class="gt-city-name">${city.name}</div>
        <div class="gt-pulse-score">Pulse ${displayPulseScore}</div>
      </div>
      <p class="gt-summary-text">${view.shortSummary}</p>
      <div class="gt-mood-tags">${
        city.tags.map((t) => `<span class="gt-tag">${t.replace(/_/g, " ")}</span>`).join("")
      }</div>
      <div class="gt-metrics-row">
        <div class="gt-metric">
          <span class="gt-metric-label">Nightlife</span>
          <span class="gt-metric-value">${liveData.nightlife_index ?? view.nightlifeAvg}</span>
        </div>
        <div class="gt-metric">
          <span class="gt-metric-label">Economic</span>
          <span class="gt-metric-value">${liveData.economic_vibe ?? view.economicAvg}</span>
        </div>
        <div class="gt-metric">
          <span class="gt-metric-label">Study</span>
          <span class="gt-metric-value">${liveData.uni_vibe ?? view.studyAvg}</span>
        </div>
        <div class="gt-metric">
          <span class="gt-metric-label">Tourism</span>
          <span class="gt-metric-value">${view.tourismAvg}</span>
        </div>
      </div>
      <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;color:#a0a3c4;">${view.keyTags}</span>
        <span class="gt-heat-chip">🔥 Heat ${heatScore}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function openCityDetail(cityName) {
  const pulse = latestPulseByCity[cityName];
  if (!pulse) return;

  const cityEntry = CITY_INDEX.find((c) => c.name === cityName);
  const state = cityEntry ? cityPulseState[cityEntry.id] : null;

  const modal = document.getElementById("city-modal");
  const body = document.getElementById("city-modal-body");

  body.innerHTML = `
    <h2 class="gt-modal-body-title">${pulse.city}</h2>
    <p class="gt-modal-body-sub">${pulse.summary_text}</p>
    <div class="gt-modal-grid">
      ${metricBlock("Pulse score", pulse.pulse_score)}
      ${metricBlock("Nightlife index", pulse.nightlife_index)}
      ${metricBlock("Economic vibe", pulse.economic_vibe)}
      ${metricBlock("Uni vibe", pulse.uni_vibe)}
      ${metricBlock("Tourism influence", pulse.tourism_influence)}
      ${metricBlock("Tempo score", pulse.tempo_score)}
      ${metricBlock("Romantic index", pulse.romantic_index)}
      ${metricBlock("Cultural heat", pulse.cultural_heat)}
      ${metricBlock("Weather influence", pulse.weather_influence)}
      ${metricBlock("News influence", pulse.news_influence)}
      ${metricBlock("Sports influence", pulse.sports_influence)}
      ${state ? `
        <div class="gt-modal-section-header">Nightlife breakdown</div>
        ${Object.entries(state.nightlife).map(([k, v]) => metricBlock(k.replace(/_/g, " "), v)).join("")}
        <div class="gt-modal-section-header">Economic breakdown</div>
        ${Object.entries(state.economic).map(([k, v]) => metricBlock(k.replace(/_/g, " "), v)).join("")}
        <div class="gt-modal-section-header">Study breakdown</div>
        ${Object.entries(state.study).map(([k, v]) => metricBlock(k.replace(/_/g, " "), v)).join("")}
        <div class="gt-modal-section-header">Tourism breakdown</div>
        ${Object.entries(state.tourism).map(([k, v]) => metricBlock(k.replace(/_/g, " "), v)).join("")}
        <div class="gt-modal-section-header">Mood breakdown</div>
        ${Object.entries(state.mood).map(([k, v]) => metricBlock(k.charAt(0).toUpperCase() + k.slice(1), v)).join("")}
      ` : ""}
    </div>
  `;

  modal.classList.remove("gt-hidden");
}

function metricBlock(label, value) {
  return `
    <div class="gt-modal-metric">
      <div class="gt-modal-metric-label">${label}</div>
      <div class="gt-modal-metric-value">${value ?? "—"}</div>
    </div>
  `;
}

function closeCityModal() {
  document.getElementById("city-modal").classList.add("gt-hidden");
}

// Golden Path basics (kept minimal but real)
function recordVisit(city, coords) {
  if (!goldenPath.visitedCities.includes(city)) {
    goldenPath.visitedCities.push(city);
  }
  goldenPath.visitedCoords.push(coords);
  calculatePilgrimScore();
  checkGoldenPathUnlock();
  renderVisitedCities();
}

function calculatePilgrimScore() {
  const uniqueCount = goldenPath.visitedCities.length;
  goldenPath.pilgrimScore = Math.min(100, uniqueCount * 5);
  const el = document.getElementById("pilgrim-score-display");
  if (el) el.textContent = `${goldenPath.pilgrimScore}%`;
}

function checkGoldenPathUnlock() {
  if (goldenPath.visitedCities.length >= 3) {
    if (!goldenPath.unlocked) {
      goldenPath.unlocked = true;
      activateExplorerMode();
    }
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
  if (!goldenPath.visitedCities.length) {
    list.textContent = "No cities yet. Your constellation is waiting.";
    return;
  }
  list.innerHTML = goldenPath.visitedCities
    .map((c) => `• ${c}`)
    .join("<br>");
}

// Very simple SVG golden path
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

  // naive projection: map lat/lng into box
  const xs = coords.map((c) => c.lng);
  const ys = coords.map((c) => c.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const pad = 20;

  coords.forEach((c, i) => {
    const x =
      ((c.lng - minX) / (maxX - minX || 1)) * (goldenSvg.clientWidth - pad * 2) +
      pad;
    const y =
      ((c.lat - minY) / (maxY - minY || 1)) * (goldenSvg.clientHeight - pad * 2) +
      pad;

    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", 4);
    dot.setAttribute("fill", "#ffd700");
    dot.setAttribute("filter", "drop-shadow(0 0 6px #ffd700)");
    goldenSvg.appendChild(dot);

    if (i > 0) {
      const prev = coords[i - 1];
      const px =
        ((prev.lng - minX) / (maxX - minX || 1)) *
          (goldenSvg.clientWidth - pad * 2) +
        pad;
      const py =
        ((prev.lat - minY) / (maxY - minY || 1)) *
          (goldenSvg.clientHeight - pad * 2) +
        pad;

      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", px);
      line.setAttribute("y1", py);
      line.setAttribute("x2", x);
      line.setAttribute("y2", y);
      line.setAttribute("stroke", "#ffd700");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("opacity", "0.8");
      goldenSvg.appendChild(line);
    }
  });
}

// City heat (simple but real)
function calculateCityGoldenHeat(city) {
  if (!cityHeat[city]) {
    cityHeat[city] = {
      intersections: 0,
      dropsClaimed: 0,
      explorerVisits: 0,
      pulseHistory: [],
      heatScore: 0
    };
  }
  const entry = cityHeat[city];
  entry.explorerVisits += 1;
  entry.intersections = goldenPath.visitedCities.filter((c) => c === city).length;
  const latestPulse = latestPulseByCity[city];
  if (latestPulse) entry.pulseHistory.push(latestPulse.pulse_score);

  const avgPulse =
    entry.pulseHistory.reduce((a, b) => a + b, 0) /
    (entry.pulseHistory.length || 1);

  entry.heatScore =
    entry.intersections * 2 + entry.dropsClaimed * 5 + entry.explorerVisits + avgPulse;

  updateGlobalScoreboard();
}

function updateGlobalScoreboard() {
  const container = document.getElementById("global-scoreboard");
  const entries = Object.entries(cityHeat);
  if (!entries.length) {
    container.innerHTML =
      '<p class="gt-empty">No heat data yet. Check in to start the pulse.</p>';
    return;
  }
  entries.sort((a, b) => b[1].heatScore - a[1].heatScore);
  const top = entries.slice(0, 10);
  container.innerHTML = top
    .map(
      ([city, data], idx) => `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div>
        <span style="font-size:12px;color:#7f82a4;">#${idx + 1}</span>
        <span style="margin-left:6px;font-size:13px;">${city}</span>
      </div>
      <div style="font-size:12px;color:#ffd700;">Heat ${data.heatScore.toFixed(
        0
      )}</div>
    </div>
  `
    )
    .join("");
}

// Simulation constants
const LIVE_PULSE_INTERVAL_MS = 4500;
const PULSE_MIN = 30;
const PULSE_MAX = 100;
const PULSE_DRIFT_RANGE = 6;
const TEMPO_DRIFT_RANGE = 4;
const NIGHTLIFE_MIN = 20;
const UNI_MIN = 20;

let livePulseIntervalId = null;

// Simulate live city pulses — nightlife and uni vibes ebb/flow with the hour
function simulateLivePulses() {
  livePulseIntervalId = setInterval(() => {
    const utcHour = new Date().getUTCHours();

    Object.values(latestPulseByCity).forEach((pulse) => {
      // Micro-drift on core scores
      pulse.pulse_score = clamp(
        pulse.pulse_score + (Math.random() * PULSE_DRIFT_RANGE - PULSE_DRIFT_RANGE / 2),
        PULSE_MIN, PULSE_MAX
      );
      pulse.tempo_score = clamp(
        pulse.tempo_score + (Math.random() * TEMPO_DRIFT_RANGE - TEMPO_DRIFT_RANGE / 2),
        PULSE_MIN, PULSE_MAX
      );

      // Nightlife peaks UTC 21:00–04:00
      if (pulse.nightlife_index !== undefined) {
        const isNight = utcHour >= 21 || utcHour <= 4;
        const nightTarget = isNight ? 88 : 55;
        pulse.nightlife_index = clamp(
          pulse.nightlife_index +
            (nightTarget - pulse.nightlife_index) * 0.08 +
            (Math.random() * 4 - 2),
          NIGHTLIFE_MIN, PULSE_MAX
        );
      }

      // Uni vibe peaks UTC 08:00–18:00
      if (pulse.uni_vibe !== undefined) {
        const isUniHours = utcHour >= 8 && utcHour <= 18;
        const uniTarget = isUniHours ? 85 : 45;
        pulse.uni_vibe = clamp(
          pulse.uni_vibe +
            (uniTarget - pulse.uni_vibe) * 0.06 +
            (Math.random() * 3 - 1.5),
          UNI_MIN, PULSE_MAX
        );
      }
    });

    renderCityCards();
  }, LIVE_PULSE_INTERVAL_MS);
}

// Install banner
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById("install-banner");
  if (banner) banner.classList.remove("gt-hidden");
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

// Service worker registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Simple "check in" stub: cycles through all cities in CITY_INDEX
function setupCheckin() {
  const btn = document.getElementById("checkin-btn");
  if (!btn) return;
  let checkinIndex = 0;
  btn.onclick = () => {
    const city = CITY_INDEX[checkinIndex % CITY_INDEX.length];
    checkinIndex++;
    recordVisit(city.name, { lat: city.lat, lng: city.lng });
    calculateCityGoldenHeat(city.name);
    drawGoldenPath();
  };
}

function populateTripSelects() {
  ["trip-from", "trip-to"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="">Select a city…</option>';
    CITY_INDEX.forEach((city) => {
      const opt = document.createElement("option");
      opt.value = city.id;
      opt.textContent = `${city.name}, ${city.country}`;
      select.appendChild(opt);
    });
  });
}

function setupExplore() {
  const btn = document.getElementById("explore-btn");
  if (!btn) return;
  btn.onclick = () => {
    activateExplorerMode();
  };
}

function setupModalClose() {
  const closeBtn = document.getElementById("city-modal-close");
  if (!closeBtn) return;
  closeBtn.onclick = closeCityModal;
  document
    .getElementById("city-modal")
    .addEventListener("click", (e) => {
      if (e.target.id === "city-modal") closeCityModal();
    });
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  seedCityPulses();
  renderCityCards();
  populateTripSelects();
  setupInstallButton();
  setupCheckin();
  setupExplore();
  setupModalClose();
  simulateLivePulses();
});
