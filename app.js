const moods = ['Happy', 'Calm', 'Anxious', 'Stressed', 'Excited', 'Bored', 'Romantic', 'Angry', 'Hopeful'];
const vibes = ['Dead', 'Chill', 'Buzzing', 'Tense', 'Cozy', 'Chaotic', 'Romantic'];
const contexts = ['Work', 'Home', 'Commute', 'Nightlife', 'Date', 'Shopping', 'Study'];
const GNEWS_API_KEY = 'demo';
const THESPORTSDB_API_KEY = '3';
const TICKETMASTER_API_KEY = 'demo';
const CLAUDE_API_KEY = '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-opus-4-5';
const DEFAULT_LEAGUE_ID = '4328';
const MAX_NEWS_HEADLINES = 3;
const MAX_SPORTS_RESULTS = 3;
const MAX_EVENTS_RESULTS = 3;
const DEFAULT_INFLUENCE_SCORE = 3;
const SENTIMENT_PLACEHOLDER = 'pending';
const NEWS_PULSE_TEXT = `News pulse: ${MAX_NEWS_HEADLINES} headlines loaded`;
const DEFAULT_SPORTS_MOOD = 'neutral';
const DEFAULT_MOOD_TAG_LABEL = 'Mood pending';
const DEFAULT_PROFILE_AVATAR = '◉';
const SPORTS_PULSE_CLASS_NAME = 'sports-pulse';
const EVENTS_PULSE_CLASS_NAME = 'events-pulse';
const SPORTS_PULSE_LABEL = 'Sports pulse';
const EVENTS_UPCOMING_LABEL = 'Events';
const PILGRIM_SCORE_PER_CITY = 5;
const MAX_PILGRIM_SCORE = 100;
const GOLDEN_DROP_TYPES = ['surge', 'gift', 'event'];
const [SURGE_GOLDEN_DROP, GIFT_GOLDEN_DROP, EVENT_GOLDEN_DROP] = GOLDEN_DROP_TYPES;
const GOLDEN_DROP_PULSE_SCORE_THRESHOLD = 70;
const GOLDEN_DROP_CULTURAL_HEAT_THRESHOLD = 2;
const GOLDEN_DROP_ELIGIBILITY_DISTANCE_KM = 20;
const CHECKIN_DEBOUNCE_MS = 700;
const GOLDEN_PATH_STORAGE_KEY = 'glotemp.goldenPath.v1';
const CITY_HEAT_STORAGE_KEY = 'glotemp.cityHeat.v1';
const MAX_SCOREBOARD_ITEMS = 10;
const EXPLORER_USERNAME = 'Explorer';
const MAX_HEAT_DISPLAY_VALUE = 100;
const MAX_PULSE_SCORE_FOR_GLOW = 100;
const MAX_GOLDEN_MAP_ZOOM = 2.2;
const MIN_GOLDEN_MAP_ZOOM = 0.8;
const GOLDEN_MAP_ZOOM_STEP = 0.15;
const HEAT_BORDER_BASE_ALPHA = 0.25;
const HEAT_BORDER_DIVISOR = 250;
const HEAT_SHADOW_BASE_SIZE = 12;
const HEAT_SHADOW_SIZE_DIVISOR = 4;
const HEAT_SHADOW_BASE_ALPHA = 0.16;
const HEAT_SHADOW_ALPHA_DIVISOR = 380;
const MIN_PULSE_GLOW = 0.1;
const MAX_PULSE_GLOW = 0.9;
const GNEWS_SUPPORTED_COUNTRIES = new Set([
  'au', 'br', 'ca', 'cn', 'eg', 'fr', 'de', 'gr', 'hk', 'in', 'ie',
  'il', 'it', 'jp', 'nl', 'no', 'pk', 'pe', 'ph', 'pt', 'ro', 'ru',
  'sg', 'es', 'se', 'ch', 'tw', 'ua', 'gb', 'us', 'ng'
]);

function getWeatherLabel(weatherCode) {
  if (weatherCode === 0) return 'Sunny';
  if ([1, 2, 3, 45, 48].includes(weatherCode)) return 'Cloudy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return 'Rainy';
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'Snowy';
  if ([95, 96, 99].includes(weatherCode)) return 'Stormy';
  return 'Mixed';
}

async function fetchWeather(city, country) {
  const locationQuery = encodeURIComponent(`${city}, ${country}`);
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${locationQuery}&count=1`;
  const geoResponse = await fetch(geoUrl);
  if (!geoResponse.ok) {
    throw new Error(`Geocoding request failed (${geoResponse.status}).`);
  }
  const geoData = await geoResponse.json();
  const location = geoData?.results?.[0];

  if (!location) {
    throw new Error(`Unable to find coordinates for ${city}, ${country}.`);
  }

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true`;
  const weatherResponse = await fetch(weatherUrl);
  if (!weatherResponse.ok) {
    throw new Error(`Weather request failed (${weatherResponse.status}).`);
  }
  const weatherData = await weatherResponse.json();
  const currentWeather = weatherData?.current_weather;

  if (!currentWeather) {
    throw new Error(`No weather data returned for ${city}, ${country}.`);
  }

  return {
    temperature: currentWeather.temperature,
    weather_code: currentWeather.weathercode,
    windspeed: currentWeather.windspeed,
    is_day: currentWeather.is_day,
    coords: {
      latitude: location.latitude,
      longitude: location.longitude
    }
  };
}

function resolveCountryCode(country) {
  const normalizedCountry = country.trim().toLowerCase();
  const countryCodeMap = {
    nigeria: 'ng',
    'united kingdom': 'gb',
    japan: 'jp',
    brazil: 'br',
    'united states': 'us',
    usa: 'us'
  };

  if (/^[a-z]{2}$/.test(normalizedCountry) && GNEWS_SUPPORTED_COUNTRIES.has(normalizedCountry)) {
    return normalizedCountry;
  }

  const mappedCountryCode = countryCodeMap[normalizedCountry];
  if (mappedCountryCode && GNEWS_SUPPORTED_COUNTRIES.has(mappedCountryCode)) {
    return mappedCountryCode;
  }

  return 'us';
}

async function fetchNews(country) {
  const countryCode = resolveCountryCode(country);
  const newsUrl = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=${countryCode}&apikey=${GNEWS_API_KEY}`;
  const newsResponse = await fetch(newsUrl);
  if (!newsResponse.ok) {
    throw new Error(`News request failed (${newsResponse.status}).`);
  }
  const newsData = await newsResponse.json();
  const articles = newsData?.articles || [];
  const topHeadlines = articles.slice(0, MAX_NEWS_HEADLINES).map((article) => ({
    title: article.title || 'Untitled headline',
    sentiment: SENTIMENT_PLACEHOLDER
  }));

  return {
    headlines: topHeadlines,
    sentiment: SENTIMENT_PLACEHOLDER
  };
}

function toScore(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function clearObjectInPlace(objectReference) {
  Object.keys(objectReference).forEach((key) => {
    delete objectReference[key];
  });
}

function mapMatchOutcome(match) {
  const homeScore = toScore(match.intHomeScore);
  const awayScore = toScore(match.intAwayScore);
  const homeTeam = match.strHomeTeam || 'Unknown team';
  const awayTeam = match.strAwayTeam || 'Unknown team';

  if (homeScore === null || awayScore === null) {
    return {
      homeTeam,
      awayTeam,
      winningTeam: 'Pending',
      losingTeam: 'Pending',
      sportsMood: 'neutral'
    };
  }

  if (homeScore > awayScore) {
    return {
      homeTeam,
      awayTeam,
      winningTeam: homeTeam,
      losingTeam: awayTeam,
      sportsMood: 'positive'
    };
  }

  if (awayScore > homeScore) {
    return {
      homeTeam,
      awayTeam,
      winningTeam: awayTeam,
      losingTeam: homeTeam,
      sportsMood: 'negative'
    };
  }

  return {
    homeTeam,
    awayTeam,
    winningTeam: 'Draw',
    losingTeam: 'Draw',
    sportsMood: 'neutral'
  };
}

function resolveSportsPulse(results) {
  if (!results.length) return 'neutral';
  const moodCounts = results.reduce((counts, result) => {
    const mood = result.sportsMood;
    counts[mood] = (counts[mood] || 0) + 1;
    return counts;
  }, {});
  const positiveCount = moodCounts.positive || 0;
  const negativeCount = moodCounts.negative || 0;
  const neutralCount = moodCounts.neutral || 0;

  if (positiveCount > negativeCount && positiveCount > neutralCount) {
    return 'positive';
  }

  if (negativeCount > positiveCount && negativeCount > neutralCount) {
    return 'negative';
  }

  return 'neutral';
}

function resolveSportsLeagueId(country) {
  const normalizedCountry = country.trim().toLowerCase();
  const leagueByCountry = {
    england: DEFAULT_LEAGUE_ID,
    'united kingdom': DEFAULT_LEAGUE_ID,
    'great britain': DEFAULT_LEAGUE_ID
  };

  return leagueByCountry[normalizedCountry] || DEFAULT_LEAGUE_ID;
}

async function fetchSports(country) {
  const leagueId = resolveSportsLeagueId(country);
  const sportsUrl = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}/eventspastleague.php?id=${leagueId}`;
  const sportsResponse = await fetch(sportsUrl);
  if (!sportsResponse.ok) {
    throw new Error(`Sports request failed (${sportsResponse.status}).`);
  }

  const sportsData = await sportsResponse.json();
  const events = sportsData?.events || [];
  const recentMatches = events.slice(0, MAX_SPORTS_RESULTS).map(mapMatchOutcome);

  return {
    country,
    results: recentMatches,
    sportsMood: resolveSportsPulse(recentMatches),
    hasResults: recentMatches.length > 0
  };
}

function normalizeEventType(type) {
  if (!type) return 'unknown';
  const normalizedType = type.trim().toLowerCase();
  if (normalizedType.includes('concert') || normalizedType.includes('music')) return 'concert';
  if (normalizedType.includes('festival')) return 'festival';
  if (normalizedType.includes('sport')) return 'sports';
  if (normalizedType.includes('theatre') || normalizedType.includes('theater') || normalizedType.includes('art')) return 'theatre';
  return normalizedType;
}

function resolveEventEnergy(eventType) {
  if (eventType === 'concert' || eventType === 'festival') return 'high energy';
  if (eventType === 'theatre') return 'calm energy';
  return 'steady energy';
}

function mapTicketmasterEvent(event) {
  const segmentName = event?.classifications?.[0]?.segment?.name || '';
  const genreName = event?.classifications?.[0]?.genre?.name || '';
  const eventType = normalizeEventType([segmentName, genreName].filter(Boolean).join(' '));

  return {
    name: event.name || 'Untitled event',
    type: eventType,
    eventEnergy: resolveEventEnergy(eventType)
  };
}

async function fetchEvents(city) {
  const encodedCity = encodeURIComponent(city);
  const eventsUrl = `https://app.ticketmaster.com/discovery/v2/events.json?city=${encodedCity}&apikey=${TICKETMASTER_API_KEY}`;
  const eventsResponse = await fetch(eventsUrl);
  if (!eventsResponse.ok) {
    throw new Error(`Events request failed (${eventsResponse.status}).`);
  }

  const eventsData = await eventsResponse.json();
  const events = eventsData?._embedded?.events || [];
  const topEvents = events.slice(0, MAX_EVENTS_RESULTS).map(mapTicketmasterEvent);

  return {
    city,
    events: topEvents,
    upcomingCount: topEvents.length
  };
}

function buildCitySlug(city) {
  return city.trim().toLowerCase().replace(/\s+/g, '-');
}

async function fetchTourism(city) {
  const citySlug = buildCitySlug(city);
  const tourismUrl = `https://api.teleport.org/api/urban_areas/slug:${citySlug}/scores/`;
  let response;
  try {
    response = await fetch(tourismUrl);
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const data = await response.json();
  const categories = data?.categories || [];

  function findScore(name) {
    const entry = categories.find((c) => c.name.toLowerCase() === name);
    return entry ? Math.round(entry.score_out_of_10 * 10) / 10 : null;
  }

  return {
    tourismScore: findScore('tourism'),
    safetyScore: findScore('safety'),
    costOfLiving: findScore('cost of living'),
    nightlifeScore: findScore('nightlife')
  };
}

async function synthesizeMood(data) {
  const prompt = `You are a global mood analyst. Given the following real-time signals for a city check-in, return a JSON object with exactly these fields:
- mood_distribution: object where keys are mood labels and values are percentage weights (0–100) that sum to 100
- tempo_score: integer from 0 to 100 representing the city's energy level
- romantic_index: integer from 0 to 100 representing romantic atmosphere
- economic_vibe: integer from 0 to 100 representing economic optimism
- summary_text: 1–2 sentence string summarizing the city's current mood and atmosphere

Respond with valid JSON only. No explanation, no markdown fences.

Input signals:
${JSON.stringify(data, null, 2)}`;

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API request failed (${response.status}).`);
  }

  const result = await response.json();
  const rawText = result?.content?.[0]?.text || '';
  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(`Failed to parse Claude response as JSON. Raw response: ${rawText}`);
  }
}

function buildPulseObject(allData) {
  const {
    city,
    country,
    weather,
    news,
    sports,
    events,
    tourism,
    claude_synthesis: claudeSynthesis
  } = allData;

  const sportsCollection = Array.isArray(sports) ? sports : sports?.results;
  const eventsCollection = Array.isArray(events) ? events : events?.events;

  return {
    city,
    country,
    pulse_score: claudeSynthesis?.tempo_score ?? null,
    mood_distribution: claudeSynthesis?.mood_distribution ?? {},
    tempo_score: claudeSynthesis?.tempo_score ?? null,
    romantic_index: claudeSynthesis?.romantic_index ?? null,
    economic_vibe: claudeSynthesis?.economic_vibe ?? null,
    cultural_heat: eventsCollection?.length ?? 0,
    weather_influence: weather?.temperature ?? null,
    news_influence: news?.headlines?.length ?? 0,
    sports_influence: sportsCollection?.length ?? 0,
    tourism_influence: tourism?.tourism_score ?? tourism?.tourismScore ?? null,
    summary_text: claudeSynthesis?.summary_text ?? ''
  };
}

const selectionState = {
  mood: '',
  vibe: '',
  context: ''
};

const cityHeat = {};

const goldenPath = {
  visitedCities: [],
  visitedCoords: [],
  goldenDrops: [],
  unlocked: false,
  pilgrimScore: 0
};

let latestPulseScore = 0;
let goldenMapSvg = null;
let goldenMapLineLayer = null;
let goldenMapDotLayer = null;
let goldenMapViewport = null;
let goldenMapScale = 1;
let goldenMapOffsetX = 0;
let goldenMapOffsetY = 0;
let goldenLinesVisible = true;
const cityPulseByName = new Map();
const cityVisitCount = new Map();
let claimedDropCount = 0;
let checkinTimeoutId = null;

function projectGoldenCoord(coord) {
  // Simple equirectangular projection into the 1000x360 SVG viewBox.
  const x = ((coord.longitude + 180) / 360) * 1000;
  const y = ((90 - coord.latitude) / 180) * 360;
  return { x, y };
}

function applyGoldenMapTransform() {
  if (!goldenMapViewport) return;
  goldenMapViewport.setAttribute(
    'transform',
    `translate(${goldenMapOffsetX} ${goldenMapOffsetY}) scale(${goldenMapScale})`
  );
}

function initGoldenMap() {
  const mapContainer = document.getElementById('golden-map');
  if (!mapContainer) return;

  if (goldenMapSvg && mapContainer.contains(goldenMapSvg)) {
    return;
  }

  mapContainer.replaceChildren();
  goldenMapSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  goldenMapSvg.setAttribute('viewBox', '0 0 1000 360');
  goldenMapSvg.setAttribute('preserveAspectRatio', 'none');
  goldenMapSvg.setAttribute('role', 'img');
  goldenMapSvg.setAttribute('aria-label', 'Golden Path travel map');

  goldenMapViewport = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  goldenMapLineLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  goldenMapDotLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  goldenMapViewport.appendChild(goldenMapLineLayer);
  goldenMapViewport.appendChild(goldenMapDotLayer);
  goldenMapSvg.appendChild(goldenMapViewport);
  mapContainer.appendChild(goldenMapSvg);
  applyGoldenMapTransform();
}

function drawGoldenPath() {
  initGoldenMap();
  if (!goldenMapLineLayer || !goldenMapDotLayer) return;

  const points = goldenPath.visitedCoords
    .filter((coord) => coord && Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude))
    .map(projectGoldenCoord);

  const lineFragment = document.createDocumentFragment();
  const dotFragment = document.createDocumentFragment();

  points.forEach((point, index) => {
    if (index > 0) {
      const previousPoint = points[index - 1];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', previousPoint.x);
      line.setAttribute('y1', previousPoint.y);
      line.setAttribute('x2', point.x);
      line.setAttribute('y2', point.y);
      line.setAttribute('class', 'golden-line');
      lineFragment.appendChild(line);
    }

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', point.x);
    dot.setAttribute('cy', point.y);
    dot.setAttribute('r', '4');
    dot.setAttribute('class', 'golden-dot');
    dotFragment.appendChild(dot);
  });

  goldenMapLineLayer.replaceChildren(lineFragment);
  goldenMapDotLayer.replaceChildren(dotFragment);
  goldenMapLineLayer.style.display = goldenLinesVisible ? 'block' : 'none';
}

function showGoldenMap() {
  const mapContainer = document.getElementById('golden-map');
  if (!mapContainer) return;

  mapContainer.style.display = 'block';
  mapContainer.setAttribute('aria-hidden', 'false');
  initGoldenMap();
  drawGoldenPath();
}

function saveGoldenPath() {
  const storagePayload = {
    visitedCities: goldenPath.visitedCities,
    visitedCoords: goldenPath.visitedCoords,
    pilgrimScore: goldenPath.pilgrimScore,
    goldenDrops: goldenPath.goldenDrops,
    unlocked: goldenPath.unlocked,
    claimedDropCount
  };
  try {
    localStorage.setItem(GOLDEN_PATH_STORAGE_KEY, JSON.stringify(storagePayload));
    localStorage.setItem(CITY_HEAT_STORAGE_KEY, JSON.stringify(cityHeat));
  } catch (error) {
    console.error('Unable to persist Golden Path state:', error);
  }
}

function loadGoldenPath() {
  try {
    const savedGoldenPath = JSON.parse(localStorage.getItem(GOLDEN_PATH_STORAGE_KEY) || '{}');
    goldenPath.visitedCities = Array.isArray(savedGoldenPath.visitedCities) ? savedGoldenPath.visitedCities : [];
    goldenPath.visitedCoords = Array.isArray(savedGoldenPath.visitedCoords) ? savedGoldenPath.visitedCoords : [];
    goldenPath.goldenDrops = Array.isArray(savedGoldenPath.goldenDrops) ? savedGoldenPath.goldenDrops : [];
    goldenPath.unlocked = Boolean(savedGoldenPath.unlocked);
    goldenPath.pilgrimScore = Number.isFinite(savedGoldenPath.pilgrimScore) ? savedGoldenPath.pilgrimScore : 0;
    claimedDropCount = Number.isFinite(savedGoldenPath.claimedDropCount)
      ? Math.max(0, savedGoldenPath.claimedDropCount)
      : 0;
  } catch {
    goldenPath.visitedCities = [];
    goldenPath.visitedCoords = [];
    goldenPath.goldenDrops = [];
    goldenPath.unlocked = false;
    goldenPath.pilgrimScore = 0;
    claimedDropCount = 0;
  }

  try {
    const savedCityHeat = JSON.parse(localStorage.getItem(CITY_HEAT_STORAGE_KEY) || '{}');
    clearObjectInPlace(cityHeat);
    Object.assign(cityHeat, savedCityHeat);
  } catch {
    clearObjectInPlace(cityHeat);
  }

  cityVisitCount.clear();
  goldenPath.visitedCities.forEach((cityName) => {
    const key = cityName?.trim().toLowerCase();
    if (!key) return;
    cityVisitCount.set(key, (cityVisitCount.get(key) || 0) + 1);
  });
}

function updateUserProfileUI() {
  const username = document.getElementById('profile-username');
  const pilgrimScore = document.getElementById('profile-pilgrim-score');
  const visitedCount = document.getElementById('profile-visited-count');
  const dropsClaimed = document.getElementById('profile-drops-claimed');
  const avatar = document.querySelector('.avatar-placeholder');

  if (username) username.textContent = `Username: ${EXPLORER_USERNAME}`;
  if (pilgrimScore) pilgrimScore.textContent = `Pilgrim Score: ${goldenPath.pilgrimScore}`;
  if (visitedCount) visitedCount.textContent = `Visited Cities: ${goldenPath.visitedCities.length}`;
  if (dropsClaimed) dropsClaimed.textContent = `Golden Drops Claimed: ${claimedDropCount}`;
  if (avatar) avatar.textContent = DEFAULT_PROFILE_AVATAR;
}

function updateGlobalScoreboard() {
  const scoreboard = document.getElementById('global-scoreboard-list');
  if (!scoreboard) return;

  const rows = Object.entries(cityHeat)
    .map(([city, data]) => ({ city, ...data }))
    .sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0))
    .slice(0, MAX_SCOREBOARD_ITEMS)
    .map((entry) => {
      const row = document.createElement('article');
      row.className = 'scoreboard-row';
      const heatScore = Math.round(entry.heatScore || 0);
      const pulseScore = getAveragePulseScore(entry);
      const cityLabel = document.createElement('strong');
      cityLabel.textContent = entry.city;
      const heatLabel = document.createElement('span');
      heatLabel.textContent = `Heat ${heatScore}`;
      const pulseLabel = document.createElement('span');
      pulseLabel.textContent = `Pulse ${pulseScore}`;
      const visitsLabel = document.createElement('span');
      visitsLabel.textContent = `Visits ${entry.explorerVisits || 0}`;
      const barTrack = document.createElement('div');
      barTrack.className = 'scoreboard-heat-bar-track';
      const bar = document.createElement('div');
      bar.className = 'scoreboard-heat-bar';
      bar.style.width = `${Math.min(MAX_HEAT_DISPLAY_VALUE, heatScore)}%`;
      barTrack.appendChild(bar);
      row.append(cityLabel, heatLabel, pulseLabel, visitsLabel, barTrack);
      return row;
    });

  if (!rows.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No heat data yet.';
    scoreboard.replaceChildren(empty);
    return;
  }

  scoreboard.replaceChildren(...rows);
}

function showGoldenDropUI(drop) {
  if (!drop) return;
  const icon = document.getElementById('golden-drop-icon');
  const modal = document.getElementById('golden-drop-modal');
  const type = document.getElementById('golden-drop-type');
  const city = document.getElementById('golden-drop-city');
  const time = document.getElementById('golden-drop-time');
  if (!icon || !modal || !type || !city || !time) return;

  type.textContent = `Drop type: ${drop.type}`;
  city.textContent = `City: ${drop.city || 'Unknown'}`;
  time.textContent = `Timestamp: ${new Date(drop.timestamp).toLocaleString('en-US', { timeZone: 'UTC' })} UTC`;
  icon.hidden = false;
  modal.hidden = false;
}

function hideGoldenDropUI() {
  const icon = document.getElementById('golden-drop-icon');
  const modal = document.getElementById('golden-drop-modal');
  if (icon) icon.hidden = true;
  if (modal) modal.hidden = true;
}

function applyMapControl(control) {
  if (control === 'zoom-in') {
    goldenMapScale = Math.min(MAX_GOLDEN_MAP_ZOOM, goldenMapScale + GOLDEN_MAP_ZOOM_STEP);
  } else if (control === 'zoom-out') {
    goldenMapScale = Math.max(MIN_GOLDEN_MAP_ZOOM, goldenMapScale - GOLDEN_MAP_ZOOM_STEP);
  } else if (control === 'reset') {
    goldenMapScale = 1;
    goldenMapOffsetX = 0;
    goldenMapOffsetY = 0;
  } else if (control === 'toggle-lines') {
    goldenLinesVisible = !goldenLinesVisible;
    if (goldenMapLineLayer) {
      goldenMapLineLayer.style.display = goldenLinesVisible ? 'block' : 'none';
    }
  }
  applyGoldenMapTransform();
}

function attachGoldenUIListeners() {
  const icon = document.getElementById('golden-drop-icon');
  const closeDropButton = document.getElementById('close-drop-btn');
  const claimDropButton = document.getElementById('claim-drop-btn');
  const closeCityDetailButton = document.getElementById('close-city-detail-btn');
  const controls = document.getElementById('golden-map-controls');

  if (icon) {
    icon.addEventListener('click', () => {
      const modal = document.getElementById('golden-drop-modal');
      if (modal) modal.hidden = false;
    });
  }

  if (closeDropButton) {
    closeDropButton.addEventListener('click', hideGoldenDropUI);
  }

  if (claimDropButton) {
    claimDropButton.addEventListener('click', () => {
      claimedDropCount += 1;
      const latestDrop = goldenPath.goldenDrops[goldenPath.goldenDrops.length - 1];
      const heatCity = latestDrop?.city;
      if (heatCity && cityHeat[heatCity]) {
        cityHeat[heatCity].dropsClaimed = (cityHeat[heatCity].dropsClaimed || 0) + 1;
      }
      updateUserProfileUI();
      updateGlobalScoreboard();
      saveGoldenPath();
      hideGoldenDropUI();
    });
  }

  if (closeCityDetailButton) {
    closeCityDetailButton.addEventListener('click', () => {
      const modal = document.getElementById('city-detail-modal');
      if (modal) modal.hidden = true;
    });
  }

  if (controls) {
    controls.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      applyMapControl(button.dataset.control);
    });
  }
}

function calculatePilgrimScore() {
  goldenPath.pilgrimScore = Math.min(MAX_PILGRIM_SCORE, goldenPath.visitedCities.length * PILGRIM_SCORE_PER_CITY);
}

function calculateCityGoldenHeat(city) {
  const cityKey = city?.trim();
  if (!cityKey) return 0;

  if (!cityHeat[cityKey]) {
    cityHeat[cityKey] = {
      intersections: 0,
      dropsClaimed: 0,
      explorerVisits: 0,
      pulseHistory: [],
      pulseTotal: 0,
      pulseCount: 0,
      averagePulse: 0
    };
  }

  cityHeat[cityKey].explorerVisits += 1;
  const normalizedCityKey = cityKey.toLowerCase();
  cityHeat[cityKey].intersections = cityVisitCount.get(normalizedCityKey) || 0;
  cityHeat[cityKey].pulseHistory.push(latestPulseScore);
  cityHeat[cityKey].pulseTotal += latestPulseScore;
  cityHeat[cityKey].pulseCount += 1;
  cityHeat[cityKey].averagePulse = cityHeat[cityKey].pulseCount
    ? cityHeat[cityKey].pulseTotal / cityHeat[cityKey].pulseCount
    : 0;

  const averagePulseScore = cityHeat[cityKey].averagePulse;
  const heatScore = (
    cityHeat[cityKey].intersections * 2
    + cityHeat[cityKey].dropsClaimed * 5
    + cityHeat[cityKey].explorerVisits
    + averagePulseScore
  );

  cityHeat[cityKey].heatScore = heatScore;
  return heatScore;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(startCoords, endCoords) {
  const startLatitude = startCoords?.latitude;
  const startLongitude = startCoords?.longitude;
  const endLatitude = endCoords?.latitude;
  const endLongitude = endCoords?.longitude;

  if (![startLatitude, startLongitude, endLatitude, endLongitude].every(Number.isFinite)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(endLatitude - startLatitude);
  const deltaLongitude = toRadians(endLongitude - startLongitude);
  const startLatitudeRadians = toRadians(startLatitude);
  const endLatitudeRadians = toRadians(endLatitude);
  const haversineValue = (
    Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(startLatitudeRadians) * Math.cos(endLatitudeRadians) * Math.sin(deltaLongitude / 2) ** 2
  );
  const arc = 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));
  return earthRadiusKm * arc;
}

function generateGoldenDrops(pulse, coords) {
  const hasHighPulseScore = pulse?.pulse_score > GOLDEN_DROP_PULSE_SCORE_THRESHOLD;
  const hasHighCulturalHeat = pulse?.cultural_heat > GOLDEN_DROP_CULTURAL_HEAT_THRESHOLD;
  const shouldGenerateDrop = hasHighPulseScore || hasHighCulturalHeat;
  if (!shouldGenerateDrop) {
    return null;
  }

  const dropType = hasHighPulseScore && hasHighCulturalHeat
    ? EVENT_GOLDEN_DROP
    : hasHighPulseScore
      ? SURGE_GOLDEN_DROP
      : GIFT_GOLDEN_DROP;
  const drop = {
    city: pulse?.city,
    coords,
    type: dropType,
    timestamp: Date.now()
  };

  goldenPath.goldenDrops.push(drop);
  saveGoldenPath();
  return drop;
}

function checkDropEligibility(coords) {
  if (!goldenPath.unlocked) {
    return false;
  }

  const latestDrop = goldenPath.goldenDrops[goldenPath.goldenDrops.length - 1];
  if (!latestDrop?.coords) {
    return false;
  }

  const distanceKm = calculateDistanceKm(coords, latestDrop.coords);
  if (distanceKm === null) {
    return false;
  }

  return distanceKm < GOLDEN_DROP_ELIGIBILITY_DISTANCE_KM;
}

function recordVisit(city, coords) {
  const normalizedCity = city?.trim().toLowerCase();
  if (normalizedCity && !goldenPath.visitedCities.some((savedCity) => savedCity.trim().toLowerCase() === normalizedCity)) {
    goldenPath.visitedCities.push(city);
    cityVisitCount.set(normalizedCity, (cityVisitCount.get(normalizedCity) || 0) + 1);
    calculatePilgrimScore();
  }

  const latitude = coords?.latitude;
  const longitude = coords?.longitude;
  const hasValidCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  if (hasValidCoords) {
    const alreadyTracked = goldenPath.visitedCoords.some((savedCoords) => (
      savedCoords.latitude === latitude && savedCoords.longitude === longitude
    ));
    if (!alreadyTracked) {
      goldenPath.visitedCoords.push({ latitude, longitude });
    }
  }

  if (goldenPath.unlocked) {
    drawGoldenPath();
  }
  updateUserProfileUI();
  saveGoldenPath();
}

function activateExplorerMode() {
  const section = document.getElementById('explorer-mode');
  if (section) {
    section.hidden = false;
  }

  const scoreDisplay = document.getElementById('pilgrim-score-display');
  if (scoreDisplay) {
    scoreDisplay.textContent = `Pilgrim Score: ${goldenPath.pilgrimScore}`;
  }

  const citiesList = document.getElementById('visited-cities-list');
  if (citiesList) {
    citiesList.replaceChildren();
    goldenPath.visitedCities.forEach((city) => {
      const item = document.createElement('li');
      item.textContent = city;
      citiesList.appendChild(item);
    });
  }

  showGoldenMap();
  updateUserProfileUI();
}

function checkGoldenPathUnlock() {
  if (goldenPath.unlocked) {
    return;
  }

  if (goldenPath.visitedCities.length >= 3) {
    goldenPath.unlocked = true;
    activateExplorerMode();
    saveGoldenPath();
  }
}

function createSelectionButton(label, category) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset.value = label;
  button.dataset.category = category;
  return button;
}

function renderCategoryButtons(options, containerId, category) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.replaceChildren();
  options.forEach((option) => {
    container.appendChild(createSelectionButton(option, category));
  });
}

function setSelectedButton(container, button) {
  const buttons = container.querySelectorAll('button');
  buttons.forEach((currentButton) => {
    currentButton.classList.remove('selected');
    currentButton.setAttribute('aria-pressed', 'false');
  });
  button.classList.add('selected');
  button.setAttribute('aria-pressed', 'true');
}

function attachSelectionListeners() {
  const mappings = [
    { containerId: 'mood-buttons', stateKey: 'mood' },
    { containerId: 'vibe-buttons', stateKey: 'vibe' },
    { containerId: 'context-buttons', stateKey: 'context' }
  ];

  mappings.forEach(({ containerId, stateKey }) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.addEventListener('click', (event) => {
      const clickedButton = event.target.closest('button');
      if (!clickedButton || !container.contains(clickedButton)) return;

      setSelectedButton(container, clickedButton);
      selectionState[stateKey] = clickedButton.dataset.value || '';
    });
  });
}

async function handleCheckinSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const cityInput = form.querySelector('#city');
  const countryInput = form.querySelector('#country');
  const message = document.getElementById('checkin-message');

  const city = cityInput?.value.trim() || '';
  const country = countryInput?.value.trim() || '';
  const mood = selectionState.mood;
  const vibe = selectionState.vibe;
  const context = selectionState.context;

  if (!city || !country || !mood || !vibe || !context) {
    if (message) {
      message.textContent = 'Please complete all fields before submitting your check-in.';
    }
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  if (message) message.textContent = 'Syncing city pulse...';

  if (checkinTimeoutId) {
    clearTimeout(checkinTimeoutId);
  }

  checkinTimeoutId = window.setTimeout(async () => {
    const allData = { city, country, mood, vibe, context };
    try {
      const [weatherResponse, newsResponse, sportsResponse, eventsResponse, tourismResponse] = await Promise.allSettled([
        fetchWeather(city, country),
        fetchNews(country),
        fetchSports(country),
        fetchEvents(city),
        fetchTourism(city)
      ]);

      const weatherResult = weatherResponse.status === 'fulfilled' ? weatherResponse.value : null;
      const newsResult = newsResponse.status === 'fulfilled' ? newsResponse.value : null;
      const sportsResult = sportsResponse.status === 'fulfilled' ? sportsResponse.value : null;
      const eventsResult = eventsResponse.status === 'fulfilled' ? eventsResponse.value : null;
      const tourismResult = tourismResponse.status === 'fulfilled' ? tourismResponse.value : null;

      allData.weather = weatherResult;
      allData.news = newsResult;
      allData.sports = sportsResult;
      allData.events = eventsResult;
      allData.tourism = tourismResult;

      recordVisit(city, weatherResult?.coords);
      checkGoldenPathUnlock();

      const synthesizedMood = await synthesizeMood(allData);
      allData.claude_synthesis = synthesizedMood;
      const pulseObject = buildPulseObject(allData);
      latestPulseScore = Number.isFinite(pulseObject?.pulse_score) ? pulseObject.pulse_score : 0;
      const generatedDrop = generateGoldenDrops(pulseObject, weatherResult?.coords);
      const cityHeatScore = calculateCityGoldenHeat(pulseObject.city);

      updateCityCard(pulseObject);
      updateCityHeatUI(pulseObject.city, cityHeatScore);
      updateGlobalScoreboard();
      updateUserProfileUI();

      if (generatedDrop && checkDropEligibility(weatherResult?.coords)) {
        showGoldenDropUI(generatedDrop);
      }

      saveGoldenPath();

      if (message) {
        message.textContent = `Thanks! Your check-in is shaping the Glotemp wave in ${city}.`;
      }
    } catch (error) {
      console.error('Mood synthesis failed:', error);
      if (message) {
        message.textContent = 'We could not process your check-in right now. Please try again.';
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }, CHECKIN_DEBOUNCE_MS);
}

function attachFormListeners() {
  const checkinForm = document.querySelector('#checkin form');
  if (!checkinForm) return;
  checkinForm.addEventListener('submit', handleCheckinSubmit);
}

function attachCityCardListeners() {
  const cityCards = document.getElementById('city-cards');
  if (!cityCards) return;
  cityCards.addEventListener('click', (event) => {
    const card = event.target.closest('.city-card');
    if (!card) return;
    const city = card.querySelector('.city-name')?.textContent;
    openCityDetail(city);
  });
}

function formatMetricValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return value;
}

function getAveragePulseScore(heatEntry) {
  if (Number.isFinite(heatEntry?.averagePulse)) {
    return Math.round(heatEntry.averagePulse);
  }
  if (heatEntry?.pulseHistory?.length) {
    return Math.round(heatEntry.pulseHistory.reduce((sum, score) => sum + score, 0) / heatEntry.pulseHistory.length);
  }
  return 0;
}

function setMetricWithValueClass(element, label, value, className) {
  if (!element) return;
  element.textContent = `${label}: `;
  const span = document.createElement('span');
  span.className = className;
  span.textContent = String(formatMetricValue(value));
  element.appendChild(span);
}

function updatePulseUI(pulse) {
  if (!pulse?.city) return;
  const cityKey = pulse.city.trim().toLowerCase();
  const card = document.querySelector(`#city-cards .city-card[data-city="${cityKey}"]`);
  if (!card) return;

  card.classList.add('updating');
  window.requestAnimationFrame(() => {
    const pulseGlow = Math.max(
      MIN_PULSE_GLOW,
      Math.min(MAX_PULSE_GLOW, (Number(pulse.pulse_score) || 0) / MAX_PULSE_SCORE_FOR_GLOW)
    );
    card.style.boxShadow = `0 0 26px rgba(248, 255, 106, ${pulseGlow * 0.4})`;
    card.classList.remove('updating');
  });
}

function updateCityHeatUI(city, heatScore) {
  const cityKey = city?.trim().toLowerCase();
  if (!cityKey) return;
  const card = document.querySelector(`#city-cards .city-card[data-city="${cityKey}"]`);
  if (!card) return;

  const heatLabel = card.querySelector('.heat-label');
  const heatBar = card.querySelector('.heat-bar');
  if (heatLabel) heatLabel.textContent = `🔥 Heat Score: ${Math.round(heatScore)}`;

  const normalizedHeat = Math.max(0, Math.min(MAX_HEAT_DISPLAY_VALUE, Math.round(heatScore)));
  if (heatBar) heatBar.style.width = `${normalizedHeat}%`;
  card.style.borderColor = `rgba(255, 184, 107, ${HEAT_BORDER_BASE_ALPHA + normalizedHeat / HEAT_BORDER_DIVISOR})`;
  card.style.boxShadow = `0 0 ${HEAT_SHADOW_BASE_SIZE + normalizedHeat / HEAT_SHADOW_SIZE_DIVISOR}px rgba(255, 184, 107, ${HEAT_SHADOW_BASE_ALPHA + normalizedHeat / HEAT_SHADOW_ALPHA_DIVISOR})`;
}

function openCityDetail(city) {
  const cityKey = city?.trim().toLowerCase();
  if (!cityKey) return;
  const pulse = cityPulseByName.get(cityKey);
  if (!pulse) return;

  const modal = document.getElementById('city-detail-modal');
  const title = document.getElementById('city-detail-title');
  const content = document.getElementById('city-detail-content');
  if (!modal || !title || !content) return;

  title.textContent = `${pulse.city} Deep Dive`;
  const moodDistribution = Object.entries(pulse.mood_distribution || {})
    .map(([mood, value]) => `${mood}: ${value}%`)
    .join(', ') || '—';
  const detailItems = [
    `Mood distribution: ${moodDistribution}`,
    `Tempo score: ${formatMetricValue(pulse.tempo_score)}`,
    `Romantic index: ${formatMetricValue(pulse.romantic_index)}`,
    `Economic vibe: ${formatMetricValue(pulse.economic_vibe)}`,
    `Cultural heat: ${formatMetricValue(pulse.cultural_heat)}`,
    `Weather influence: ${formatMetricValue(pulse.weather_influence)}`,
    `News influence: ${formatMetricValue(pulse.news_influence)}`,
    `Sports influence: ${formatMetricValue(pulse.sports_influence)}`,
    `Tourism influence: ${formatMetricValue(pulse.tourism_influence)}`
  ];
  const detailNodes = detailItems.map((text) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  });
  content.replaceChildren(...detailNodes);
  modal.hidden = false;
}

function createCityCard(city) {
  const card = document.createElement('article');
  card.className = 'city-card';
  card.dataset.city = city.trim().toLowerCase();

  card.innerHTML = `
    <h3 class="city-name"></h3>
    <p class="pulse-score"></p>
    <p class="summary-text"></p>
    <div class="mood-tags"></div>
    <p class="heat-label">🔥 Heat Score: --</p>
    <div class="heat-bar-track"><div class="heat-bar"></div></div>
    <p class="tempo"></p>
    <p class="romance"></p>
    <p class="economic"></p>
    <p class="cultural"></p>
    <p class="weather"></p>
    <p class="news"></p>
    <p class="sports"></p>
    <p class="tourism"></p>
  `;

  return card;
}

function updateCityCard(pulse) {
  if (!pulse?.city) return;
  const cityCards = document.getElementById('city-cards');
  if (!cityCards) return;

  const cityKey = pulse.city.trim().toLowerCase();
  let card = [...cityCards.querySelectorAll('.city-card')].find((item) => item.dataset.city === cityKey);

  if (!card) {
    card = createCityCard(pulse.city);
    cityCards.appendChild(card);
  }

  card.dataset.city = cityKey;

  const cityName = card.querySelector('.city-name');
  const pulseScore = card.querySelector('.pulse-score');
  const summaryText = card.querySelector('.summary-text');
  const moodTags = card.querySelector('.mood-tags');
  const tempo = card.querySelector('.tempo');
  const romance = card.querySelector('.romance');
  const economic = card.querySelector('.economic');
  const cultural = card.querySelector('.cultural');
  const weather = card.querySelector('.weather');
  const news = card.querySelector('.news');
  const sports = card.querySelector('.sports');
  const tourism = card.querySelector('.tourism');

  if (cityName) cityName.textContent = pulse.city;
  if (pulseScore) pulseScore.textContent = `Pulse score: ${formatMetricValue(pulse.pulse_score)}`;
  if (summaryText) summaryText.textContent = pulse.summary_text || 'City pulse summary is updating.';

  if (moodTags) {
    moodTags.replaceChildren();
    const entries = Object.entries(pulse.mood_distribution || {}).filter(([_mood, value]) => value !== null && value !== undefined);
    const labels = entries.length ? entries : [[DEFAULT_MOOD_TAG_LABEL, '']];
    labels.forEach(([mood, value]) => {
      const tag = document.createElement('span');
      tag.textContent = value === '' ? mood : `${mood} ${value}%`;
      moodTags.appendChild(tag);
    });
  }

  setMetricWithValueClass(tempo, 'Tempo score', pulse.tempo_score, 'value-tempo');
  setMetricWithValueClass(romance, 'Romantic index', pulse.romantic_index, 'value-romance');
  setMetricWithValueClass(economic, 'Economic vibe', pulse.economic_vibe, 'value-economic');
  setMetricWithValueClass(cultural, 'Cultural heat', pulse.cultural_heat, 'value-cultural');
  if (weather) weather.textContent = `Weather influence: ${formatMetricValue(pulse.weather_influence)}`;
  if (news) news.textContent = `News influence: ${formatMetricValue(pulse.news_influence)}`;
  if (sports) sports.textContent = `Sports influence: ${formatMetricValue(pulse.sports_influence)}`;
  if (tourism) tourism.textContent = `Tourism influence: ${formatMetricValue(pulse.tourism_influence)}`;

  cityPulseByName.set(cityKey, pulse);

  const heatScore = cityHeat[pulse.city]?.heatScore || 0;
  updateCityHeatUI(pulse.city, heatScore);
  updatePulseUI(pulse);
}

function renderCityCards() {
  const cityCards = document.getElementById('city-cards');
  if (!cityCards) return;

  const placeholderCards = [
    {
      city: 'Lagos',
      pulse_score: 73,
      summary_text: 'Street energy is high with warm-weather optimism and strong social momentum.',
      mood_distribution: { Hopeful: 42, Excited: 33, Calm: 25 },
      tempo_score: 73,
      romantic_index: 57,
      economic_vibe: 68,
      cultural_heat: DEFAULT_INFLUENCE_SCORE,
      weather_influence: 30,
      news_influence: DEFAULT_INFLUENCE_SCORE,
      sports_influence: DEFAULT_INFLUENCE_SCORE,
      tourism_influence: 5.5
    },
    {
      city: 'London',
      pulse_score: 58,
      summary_text: 'A steady, rain-softened rhythm keeps the city balanced and focused.',
      mood_distribution: { Calm: 45, Hopeful: 30, Anxious: 25 },
      tempo_score: 58,
      romantic_index: 49,
      economic_vibe: 61,
      cultural_heat: DEFAULT_INFLUENCE_SCORE,
      weather_influence: 12,
      news_influence: DEFAULT_INFLUENCE_SCORE,
      sports_influence: DEFAULT_INFLUENCE_SCORE,
      tourism_influence: 8.3
    },
    {
      city: 'Tokyo',
      pulse_score: 66,
      summary_text: 'Neon-night momentum and dense movement keep the city alert and active.',
      mood_distribution: { Anxious: 38, Excited: 34, Calm: 28 },
      tempo_score: 66,
      romantic_index: 52,
      economic_vibe: 64,
      cultural_heat: DEFAULT_INFLUENCE_SCORE,
      weather_influence: 19,
      news_influence: DEFAULT_INFLUENCE_SCORE,
      sports_influence: DEFAULT_INFLUENCE_SCORE,
      tourism_influence: 8.7
    },
    {
      city: 'São Paulo',
      pulse_score: 70,
      summary_text: 'Music-driven intensity and social motion make for a vivid city pulse.',
      mood_distribution: { Excited: 41, Hopeful: 32, Stressed: 27 },
      tempo_score: 70,
      romantic_index: 60,
      economic_vibe: 59,
      cultural_heat: DEFAULT_INFLUENCE_SCORE,
      weather_influence: 24,
      news_influence: DEFAULT_INFLUENCE_SCORE,
      sports_influence: DEFAULT_INFLUENCE_SCORE,
      tourism_influence: 6.4
    }
  ];

  cityCards.replaceChildren();
  placeholderCards.forEach((pulse) => updateCityCard(pulse));
}

function init() {
  loadGoldenPath();
  renderCategoryButtons(moods, 'mood-buttons', 'mood');
  renderCategoryButtons(vibes, 'vibe-buttons', 'vibe');
  renderCategoryButtons(contexts, 'context-buttons', 'context');
  renderCityCards();
  attachSelectionListeners();
  attachFormListeners();
  attachCityCardListeners();
  attachGoldenUIListeners();
  updateUserProfileUI();
  updateGlobalScoreboard();
  if (goldenPath.unlocked) {
    activateExplorerMode();
  }
}

document.addEventListener('DOMContentLoaded', init);
