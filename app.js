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

// Clamp helper used by live simulation
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, Math.round(val)));
}

// Seed cities: Sunderland, São Paulo, London
function seedInitialPulses() {
  const seed = [
    {
      city: "Sunderland",
      country: "United Kingdom",
      pulse_score: 64,
      summary_text:
        "Wearside grit meets student energy — Sunderland's nightlife quarter hums and the uni scene is on the rise.",
      mood_distribution: [
        { label: "Determined", value: 38 },
        { label: "Hopeful", value: 34 },
        { label: "Restless", value: 28 }
      ],
      tempo_score: 66,
      romantic_index: 44,
      economic_vibe: 52,
      cultural_heat: 4,
      weather_influence: 8,
      news_influence: 2,
      sports_influence: 5,
      tourism_influence: 2.1,
      nightlife_index: 72,
      uni_vibe: 81
    },
    {
      city: "São Paulo",
      country: "Brazil",
      pulse_score: 88,
      summary_text:
        "A 24-hour megacity that never dims — jazz bars, concrete towers, and electric ambition drive the endless tempo.",
      mood_distribution: [
        { label: "Energised", value: 42 },
        { label: "Creative", value: 33 },
        { label: "Intense", value: 25 }
      ],
      tempo_score: 91,
      romantic_index: 68,
      economic_vibe: 74,
      cultural_heat: 5,
      weather_influence: 31,
      news_influence: 4,
      sports_influence: 4,
      tourism_influence: 7.8,
      nightlife_index: 96,
      uni_vibe: 62
    },
    {
      city: "London",
      country: "United Kingdom",
      pulse_score: 74,
      summary_text:
        "A rain-softened hum of purpose and creativity — world culture, finance, and late-night electricity in one city.",
      mood_distribution: [
        { label: "Ambitious", value: 38 },
        { label: "Calm", value: 32 },
        { label: "Curious", value: 30 }
      ],
      tempo_score: 73,
      romantic_index: 55,
      economic_vibe: 79,
      cultural_heat: 5,
      weather_influence: 14,
      news_influence: 5,
      sports_influence: 3,
      tourism_influence: 9.2,
      nightlife_index: 83,
      uni_vibe: 87
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
        ${pulse.nightlife_index !== undefined ? `
        <div class="gt-metric">
          <span class="gt-metric-label">Nightlife</span>
          <span class="gt-metric-value">${pulse.nightlife_index}</span>
        </div>` : ""}
        ${pulse.uni_vibe !== undefined ? `
        <div class="gt-metric">
          <span class="gt-metric-label">Uni</span>
          <span class="gt-metric-value">${pulse.uni_vibe}</span>
        </div>` : ""}
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
      ${pulse.nightlife_index !== undefined ? metricBlock("Nightlife index", pulse.nightlife_index) : ""}
      ${pulse.uni_vibe !== undefined ? metricBlock("Uni vibe", pulse.uni_vibe) : ""}
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

// Simulate live city pulses — nightlife and uni vibes ebb/flow with the hour
function simulateLivePulses() {
  setInterval(() => {
    const utcHour = new Date().getUTCHours();

    Object.values(latestPulseByCity).forEach((pulse) => {
      // Micro-drift on core scores
      pulse.pulse_score = clamp(
        pulse.pulse_score + (Math.random() * 6 - 3), 30, 100
      );
      pulse.tempo_score = clamp(
        pulse.tempo_score + (Math.random() * 4 - 2), 30, 100
      );

      // Nightlife peaks UTC 21:00–04:00
      if (pulse.nightlife_index !== undefined) {
        const isNight = utcHour >= 21 || utcHour <= 4;
        const nightTarget = isNight ? 88 : 55;
        pulse.nightlife_index = clamp(
          pulse.nightlife_index +
            (nightTarget - pulse.nightlife_index) * 0.08 +
            (Math.random() * 4 - 2),
          20, 100
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
          20, 100
        );
      }
    });

    renderCityCards();
  }, 4500);
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

// Simple "check in" stub: cycles through the 3 seeded cities
function setupCheckin() {
  const btn = document.getElementById("checkin-btn");
  if (!btn) return;
  let checkinIndex = 0;
  const checkinCities = [
    { city: "London", coords: { lat: 51.5074, lng: -0.1278 } },
    { city: "Sunderland", coords: { lat: 54.9069, lng: -1.3838 } },
    { city: "São Paulo", coords: { lat: -23.5505, lng: -46.6333 } }
  ];
  btn.onclick = () => {
    const { city, coords } = checkinCities[checkinIndex % checkinCities.length];
    checkinIndex++;
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
  simulateLivePulses();
});
