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
const SPORTS_PULSE_CLASS_NAME = 'sports-pulse';
const EVENTS_PULSE_CLASS_NAME = 'events-pulse';
const SPORTS_PULSE_LABEL = 'Sports pulse';
const EVENTS_UPCOMING_LABEL = 'Events';
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

const goldenPath = {
  visitedCities: [],
  visitedCoords: [],
  unlocked: false
};

let goldenMapSvg = null;
let goldenMapLineLayer = null;
let goldenMapDotLayer = null;

function projectGoldenCoord(coord) {
  const x = ((coord.longitude + 180) / 360) * 1000;
  const y = ((90 - coord.latitude) / 180) * 360;
  return { x, y };
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

  goldenMapLineLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  goldenMapDotLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  goldenMapSvg.appendChild(goldenMapLineLayer);
  goldenMapSvg.appendChild(goldenMapDotLayer);
  mapContainer.appendChild(goldenMapSvg);
}

function drawGoldenPath() {
  initGoldenMap();
  if (!goldenMapLineLayer || !goldenMapDotLayer) return;

  goldenMapLineLayer.replaceChildren();
  goldenMapDotLayer.replaceChildren();

  const points = goldenPath.visitedCoords
    .filter((coord) => Number.isFinite(coord?.latitude) && Number.isFinite(coord?.longitude))
    .map(projectGoldenCoord);

  points.forEach((point, index) => {
    if (index > 0) {
      const previousPoint = points[index - 1];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', previousPoint.x);
      line.setAttribute('y1', previousPoint.y);
      line.setAttribute('x2', point.x);
      line.setAttribute('y2', point.y);
      line.setAttribute('class', 'golden-line');
      goldenMapLineLayer.appendChild(line);
    }

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', point.x);
    dot.setAttribute('cy', point.y);
    dot.setAttribute('r', '4');
    dot.setAttribute('class', 'golden-dot');
    goldenMapDotLayer.appendChild(dot);
  });
}

function showGoldenMap() {
  const mapContainer = document.getElementById('golden-map');
  if (!mapContainer) return;

  mapContainer.style.display = 'block';
  mapContainer.setAttribute('aria-hidden', 'false');
  initGoldenMap();
  drawGoldenPath();
}

function recordVisit(city, coords) {
  const normalizedCity = city?.trim().toLowerCase();
  if (normalizedCity && !goldenPath.visitedCities.some((savedCity) => savedCity.trim().toLowerCase() === normalizedCity)) {
    goldenPath.visitedCities.push(city);
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

  console.log('Golden Path updated:', goldenPath);
}

function checkGoldenPathUnlock() {
  const wasUnlocked = goldenPath.unlocked;
  goldenPath.unlocked = goldenPath.visitedCities.length >= 3;

  if (goldenPath.unlocked && !wasUnlocked) {
    console.log('Golden Path unlocked');
    showGoldenMap();
    return;
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

  let weatherResult = null;
  let newsResult = null;
  let sportsResult = null;
  let eventsResult = null;
  let tourismResult = null;
  const checkinData = { city, country, mood, vibe, context };
  try {
    weatherResult = await fetchWeather(city, country);
    console.log('Weather result:', weatherResult);
    recordVisit(city, weatherResult?.coords);
    checkGoldenPathUnlock();
  } catch (error) {
    console.error('Weather fetch failed:', error);
  }
  try {
    newsResult = await fetchNews(country);
    console.log('News headlines:', newsResult.headlines);
  } catch (error) {
    console.error('News fetch failed:', error);
  }
  try {
    sportsResult = await fetchSports(country);
    console.log('Sports results:', sportsResult.results);
  } catch (error) {
    console.error('Sports fetch failed:', error);
  }
  try {
    eventsResult = await fetchEvents(city);
    console.log('Events results:', eventsResult.events);
  } catch (error) {
    console.error('Events fetch failed:', error);
  }
  try {
    tourismResult = await fetchTourism(city);
  } catch (error) {
    console.error('Tourism fetch failed:', error);
  }
  console.log('Tourism data:', tourismResult);
  const allData = { city, country, mood, vibe, context, weather: weatherResult, news: newsResult, sports: sportsResult, events: eventsResult, tourism: tourismResult };
  console.log('Glotemp check-in:', allData);

  try {
    const synthesizedMood = await synthesizeMood(allData);
    console.log('Synthesized mood:', synthesizedMood);
    allData.claude_synthesis = synthesizedMood;
    const pulseObject = buildPulseObject(allData);
    console.log('Final pulse object:', pulseObject);
    updateCityCard(pulseObject);
  } catch (error) {
    console.error('Mood synthesis failed:', error);
  }

  if (message) {
    message.textContent = `Thanks! Your check-in is shaping the Glotemp wave in ${city}.`;
  }
}

function attachFormListeners() {
  const checkinForm = document.querySelector('#checkin form');
  if (!checkinForm) return;
  checkinForm.addEventListener('submit', handleCheckinSubmit);
}

function createMetaParagraph(label, value) {
  const paragraph = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = `${label}:`;
  paragraph.appendChild(strong);
  paragraph.append(` ${value}`);
  return paragraph;
}

function createPulseIndicator(className, text) {
  const indicator = document.createElement('small');
  indicator.className = className;
  indicator.textContent = text;
  return indicator;
}

function appendScoreIfDefined(card, label, value) {
  if (value !== null && value !== undefined) {
    card.appendChild(createMetaParagraph(label, value));
  }
}

function formatMetricValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return value;
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

  if (tempo) tempo.textContent = `Tempo score: ${formatMetricValue(pulse.tempo_score)}`;
  if (romance) romance.textContent = `Romantic index: ${formatMetricValue(pulse.romantic_index)}`;
  if (economic) economic.textContent = `Economic vibe: ${formatMetricValue(pulse.economic_vibe)}`;
  if (cultural) cultural.textContent = `Cultural heat: ${formatMetricValue(pulse.cultural_heat)}`;
  if (weather) weather.textContent = `Weather influence: ${formatMetricValue(pulse.weather_influence)}`;
  if (news) news.textContent = `News influence: ${formatMetricValue(pulse.news_influence)}`;
  if (sports) sports.textContent = `Sports influence: ${formatMetricValue(pulse.sports_influence)}`;
  if (tourism) tourism.textContent = `Tourism influence: ${formatMetricValue(pulse.tourism_influence)}`;
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
  renderCategoryButtons(moods, 'mood-buttons', 'mood');
  renderCategoryButtons(vibes, 'vibe-buttons', 'vibe');
  renderCategoryButtons(contexts, 'context-buttons', 'context');
  renderCityCards();
  attachSelectionListeners();
  attachFormListeners();
}

document.addEventListener('DOMContentLoaded', init);
