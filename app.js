const moods = ['Happy', 'Calm', 'Anxious', 'Stressed', 'Excited', 'Bored', 'Romantic', 'Angry', 'Hopeful'];
const vibes = ['Dead', 'Chill', 'Buzzing', 'Tense', 'Cozy', 'Chaotic', 'Romantic'];
const contexts = ['Work', 'Home', 'Commute', 'Nightlife', 'Date', 'Shopping', 'Study'];

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

  container.innerHTML = '';
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

function handleCheckinSubmit(event) {
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

function createCityCard({ city, moodLabel, tempoLabel, tags }) {
  const card = document.createElement('article');
  card.className = 'city-card';

  const title = document.createElement('h3');
  title.textContent = city;

  card.appendChild(title);
  card.appendChild(createMetaParagraph('Mood', moodLabel));
  card.appendChild(createMetaParagraph('Tempo', tempoLabel));
  card.appendChild(createMetaParagraph('Tags', tags.join(', ')));

  return card;
}

function renderCityCards() {
  const cityCards = document.getElementById('city-cards');
  if (!cityCards) return;

  const placeholderCards = [
    { city: 'Lagos', moodLabel: 'Hopeful', tempoLabel: 'Buzzing', tags: ['work rush', 'warm evening', 'street energy'] },
    { city: 'London', moodLabel: 'Calm', tempoLabel: 'Chill', tags: ['light rain', 'after work', 'coffee'] },
    { city: 'Tokyo', moodLabel: 'Focused', tempoLabel: 'Tense', tags: ['commute', 'late night', 'neon'] },
    { city: 'São Paulo', moodLabel: 'Excited', tempoLabel: 'Chaotic', tags: ['traffic', 'music', 'social pulse'] }
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
