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

// Mock: generate a couple of real-feeling cities (you can replace with API later)
function seedInitialPulses() {
  const seed = [
    {
      city: "London",
      country: "United Kingdom",
      pulse_score: 58,
      summary_text:
        "A steady, rain-softened rhythm keeps the city balanced and focused.",
      mood_distribution: [
        { label: "Calm", value: 45 },
        { label: "Hopeful", value: 30 },
        { label: "Anxious", value: 25 }
      ],
      tempo_score: 58,
      romantic_index: 41,
      economic_vibe: 62,
      cultural_heat: 2,
      weather_influence: 12,
      news_influence: 3,
      sports_influence: 1,
      tourism_influence: 4.2
    },
    {
      city: "Lisbon",
      country: "Portugal",
      pulse_score: 71,
      summary_text:
        "Warm light, slow streets, and late-night terraces keep the city glowing.",
      mood_distribution: [
        { label: "Hopeful", value: 40 },
        { label: "Calm", value: 35 },
        { label: "Excited", value: 25 }
      ],
      tempo_score: 69,
      romantic_index: 76,
      economic_vibe: 60,
      cultural_heat: 3,
      weather_influence: 26,
      news_influence: 2,
      sports_influence: 2,
      tourism_influence: 6.1
    }
  ];
  seed.forEach((p) => {
    pulses.push(p);
    latestPulseByCity[p.city] = p;
  });
}

function renderCityCards() {
  const container = document.getElementById("city-cards");
  container.innerHTML = "";

  const list = Object.values(latestPulseByCity);
  if (!list.length) {
    container.innerHTML =
      '<p class="gt-empty">No cities yet. Check in to start the pulse.</p>';
    return;
  }

  list.forEach((pulse) => {
    const card = document.createElement("div");
    card.className = "gt-city-card";
    card.onclick = () => openCityDetail(pulse.city);

    const moodTags =
      pulse.mood_distribution
        ?.map(
          (m) =>
            `<span class="gt-tag">${m.label} ${m.value.toFixed
              ? m.value.toFixed(0)
              : m.value}%</span>`
        )
        .join("") || "";

    const heatScore = cityHeat[pulse.city]?.heatScore || 0;

    card.innerHTML = `
      <div class="gt-city-header">
        <div class="gt-city-name">${pulse.city}</div>
        <div class="gt-pulse-score">Pulse ${pulse.pulse_score}</div>
      </div>
      <p class="gt-summary-text">${pulse.summary_text}</p>
      <div class="gt-mood-tags">${moodTags}</div>
      <div class="gt-metrics-row">
        <div class="gt-metric">
          <span class="gt-metric-label">Tempo</span>
          <span class="gt-metric-value">${pulse.tempo_score}</span>
        </div>
        <div class="gt-metric">
          <span class="gt-metric-label">Romance</span>
          <span class="gt-metric-value">${pulse.romantic_index}</span>
        </div>
        <div class="gt-metric">
          <span class="gt-metric-label">Economic</span>
          <span class="gt-metric-value">${pulse.economic_vibe}</span>
        </div>
        <div class="gt-metric">
          <span class="gt-metric-label">Cultural</span>
          <span class="gt-metric-value">${pulse.cultural_heat}</span>
        </div>
        <div class="gt-metric">
          <span class="gt-metric-label">Weather</span>
          <span class="gt-metric-value">${pulse.weather_influence}</span>
        </div>
      </div>
      <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
        <span class="gt-heat-chip">🔥 Heat ${heatScore}</span>
        <span style="font-size:11px;color:#7f82a4;">Tap for full breakdown</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function openCityDetail(city) {
  const pulse = latestPulseByCity[city];
  if (!pulse) return;

  const modal = document.getElementById("city-modal");
  const body = document.getElementById("city-modal-body");

  body.innerHTML = `
    <h2 class="gt-modal-body-title">${pulse.city}</h2>
    <p class="gt-modal-body-sub">${pulse.summary_text}</p>
    <div class="gt-modal-grid">
      ${metricBlock("Pulse score", pulse.pulse_score)}
      ${metricBlock("Tempo score", pulse.tempo_score)}
      ${metricBlock("Romantic index", pulse.romantic_index)}
      ${metricBlock("Economic vibe", pulse.economic_vibe)}
      ${metricBlock("Cultural heat", pulse.cultural_heat)}
      ${metricBlock("Weather influence", pulse.weather_influence)}
      ${metricBlock("News influence", pulse.news_influence)}
      ${metricBlock("Sports influence", pulse.sports_influence)}
      ${metricBlock("Tourism influence", pulse.tourism_influence)}
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

// Simple “check in” stub: mark a visit and recalc heat
function setupCheckin() {
  const btn = document.getElementById("checkin-btn");
  if (!btn) return;
  btn.onclick = () => {
    // For now, just simulate a new city visit: London
    const city = "London";
    const coords = { lat: 51.5074, lng: -0.1278 };
    recordVisit(city, coords);
    calculateCityGoldenHeat(city);
    drawGoldenPath();
  };
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
  seedInitialPulses();
  renderCityCards();
  setupInstallButton();
  setupCheckin();
  setupExplore();
  setupModalClose();
});
