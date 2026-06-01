const moods = ['Happy', 'Calm', 'Anxious', 'Stressed', 'Excited', 'Bored', 'Romantic', 'Angry', 'Hopeful'];
const vibes = ['Dead', 'Chill', 'Buzzing', 'Tense', 'Cozy', 'Chaotic', 'Romantic'];
const contexts = ['Work', 'Home', 'Commute', 'Nightlife', 'Date', 'Shopping', 'Study'];

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
  const geoData = await geoResponse.json();
  const location = geoData?.results?.[0];

  if (!location) {
    throw new Error(`Unable to find coordinates for ${city}, ${country}.`);
  }

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true`;
  const weatherResponse = await fetch(weatherUrl);
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

  const checkinData = { city, country, mood, vibe, context };
  console.log('Glotemp check-in:', checkinData);
  try {
    const weather = await fetchWeather(city, country);
    console.log('Weather result:', weather);
  } catch (error) {
    console.error('Weather fetch failed:', error);
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

function createCityCard({ city, moodLabel, tempoLabel, tags, temperature, weatherCode }) {
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

  return card;
}

function renderCityCards() {
  const cityCards = document.getElementById('city-cards');
  if (!cityCards) return;

  const placeholderCards = [
    { city: 'Lagos', temperature: 30, weatherCode: 1, moodLabel: 'Hopeful', tempoLabel: 'Buzzing', tags: ['work rush', 'warm evening', 'street energy'] },
    { city: 'London', temperature: 12, weatherCode: 61, moodLabel: 'Calm', tempoLabel: 'Chill', tags: ['light rain', 'after work', 'coffee'] },
    { city: 'Tokyo', temperature: 19, weatherCode: 3, moodLabel: 'Anxious', tempoLabel: 'Tense', tags: ['commute', 'late night', 'neon'] },
    { city: 'São Paulo', temperature: 24, weatherCode: 0, moodLabel: 'Excited', tempoLabel: 'Chaotic', tags: ['traffic', 'music', 'social pulse'] }
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
