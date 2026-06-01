const moods = ['Happy', 'Calm', 'Anxious', 'Stressed', 'Excited', 'Bored', 'Romantic', 'Angry', 'Hopeful'];
const vibes = ['Dead', 'Chill', 'Buzzing', 'Tense', 'Cozy', 'Chaotic', 'Romantic'];
const contexts = ['Work', 'Home', 'Commute', 'Nightlife', 'Date', 'Shopping', 'Study'];
const GNEWS_API_KEY = 'demo';
const MAX_NEWS_HEADLINES = 3;
const MAX_SPORTS_RESULTS = 3;
const MAX_EVENTS_RESULTS = 3;
const SENTIMENT_PLACEHOLDER = 'pending';
const NEWS_PULSE_TEXT = `News pulse: ${MAX_NEWS_HEADLINES} headlines loaded`;
const DEFAULT_SPORTS_PULSE_TEXT = 'neutral';
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
    is_day: currentWeather.is_day
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
    england: '4328',
    'united kingdom': '4328',
    'great britain': '4328'
  };

  return leagueByCountry[normalizedCountry] || '4328';
}

async function fetchSports(country) {
  const leagueId = resolveSportsLeagueId(country);
  const sportsUrl = `https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=${leagueId}`;
  const sportsResponse = await fetch(sportsUrl);
  if (!sportsResponse.ok) {
    throw new Error(`Sports request failed (${sportsResponse.status}).`);
  }

  const sportsData = await sportsResponse.json();
  const events = sportsData?.events || [];
  const lastResults = events.slice(0, MAX_SPORTS_RESULTS).map(mapMatchOutcome);

  return {
    country,
    results: lastResults,
    sportsMood: resolveSportsPulse(lastResults)
  };
}

function normalizeEventType(type) {
  const normalizedType = type.trim().toLowerCase();
  if (normalizedType.includes('concert') || normalizedType.includes('music')) return 'concert';
  if (normalizedType.includes('festival')) return 'festival';
  if (normalizedType.includes('sport')) return 'sports';
  if (normalizedType.includes('theatre') || normalizedType.includes('theater') || normalizedType.includes('art')) return 'theatre';
  return normalizedType || 'unknown';
}

function resolveEventEnergy(eventType) {
  if (eventType === 'concert' || eventType === 'festival') return 'high energy';
  if (eventType === 'theatre') return 'calm energy';
  return 'steady energy';
}

function mapTicketmasterEvent(event) {
  const segmentName = event?.classifications?.[0]?.segment?.name || '';
  const genreName = event?.classifications?.[0]?.genre?.name || '';
  const eventType = normalizeEventType(`${segmentName} ${genreName}`);

  return {
    name: event.name || 'Untitled event',
    type: eventType,
    eventEnergy: resolveEventEnergy(eventType)
  };
}

async function fetchEvents(city) {
  const encodedCity = encodeURIComponent(city);
  const eventsUrl = `https://app.ticketmaster.com/discovery/v2/events.json?city=${encodedCity}&apikey=demo`;
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

const selectionState = {
  mood: '',
  vibe: '',
  context: ''
};

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
  const checkinData = { city, country, mood, vibe, context };
  try {
    weatherResult = await fetchWeather(city, country);
    console.log('Weather result:', weatherResult);
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
  console.log('Glotemp check-in:', { ...checkinData, weather: weatherResult, news: newsResult, sports: sportsResult, events: eventsResult });

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

function createIndicator(className, text) {
  const indicator = document.createElement('small');
  indicator.className = className;
  indicator.textContent = text;
  return indicator;
}

function createCityCard({
  city,
  moodLabel,
  tempoLabel,
  tags,
  temperature,
  weatherCode,
  newsPulseText,
  sportsPulseText,
  upcomingEvents
}) {
  const card = document.createElement('article');
  card.className = 'city-card';

  const title = document.createElement('h3');
  title.textContent = city;

  card.appendChild(title);
  card.appendChild(createMetaParagraph('Mood', moodLabel));
  card.appendChild(createMetaParagraph('Tempo', tempoLabel));
  card.appendChild(createMetaParagraph('Tags', tags.join(', ')));
  card.appendChild(createMetaParagraph('Temperature', `${temperature}°C`));
  card.appendChild(createMetaParagraph('Weather', getWeatherLabel(weatherCode)));
  card.appendChild(createIndicator('news-pulse', newsPulseText));
  card.appendChild(createIndicator('sports-pulse', `Sports pulse: ${sportsPulseText}`));
  card.appendChild(createIndicator('events-pulse', `Events: ${upcomingEvents} upcoming`));

  return card;
}

function renderCityCards() {
  const cityCards = document.getElementById('city-cards');
  if (!cityCards) return;

  const placeholderCards = [
    { city: 'Lagos', temperature: 30, weatherCode: 1, moodLabel: 'Hopeful', tempoLabel: 'Buzzing', tags: ['work rush', 'warm evening', 'street energy'], newsPulseText: NEWS_PULSE_TEXT, sportsPulseText: DEFAULT_SPORTS_PULSE_TEXT, upcomingEvents: 3 },
    { city: 'London', temperature: 12, weatherCode: 61, moodLabel: 'Calm', tempoLabel: 'Chill', tags: ['light rain', 'after work', 'coffee'], newsPulseText: NEWS_PULSE_TEXT, sportsPulseText: DEFAULT_SPORTS_PULSE_TEXT, upcomingEvents: 3 },
    { city: 'Tokyo', temperature: 19, weatherCode: 3, moodLabel: 'Anxious', tempoLabel: 'Tense', tags: ['commute', 'late night', 'neon'], newsPulseText: NEWS_PULSE_TEXT, sportsPulseText: DEFAULT_SPORTS_PULSE_TEXT, upcomingEvents: 3 },
    { city: 'São Paulo', temperature: 24, weatherCode: 0, moodLabel: 'Excited', tempoLabel: 'Chaotic', tags: ['traffic', 'music', 'social pulse'], newsPulseText: NEWS_PULSE_TEXT, sportsPulseText: DEFAULT_SPORTS_PULSE_TEXT, upcomingEvents: 3 }
  ];

  const cardElements = placeholderCards.map(createCityCard);
  cityCards.replaceChildren(...cardElements);
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
