// Rotating Instruments Carousel
// Four slots with staggered city rotation: 0s, 1.5s, 3s, 4.5s
// Cycles every 6 seconds per slot

class InstrumentsCarousel {
  constructor(cities) {
    this.allCities = cities || [];
    this.slots = { 1: null, 2: null, 3: null, 4: null };
    this.currentIndices = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.rotationIntervals = {};
    this.isPaused = false;
    this.pinnedSlot = null;
    this.timers = {};
    this.preloadedBands = {};
    this.visibilityHidden = false;

    this.init();
  }

  init() {
    if (this.allCities.length < 4) {
      console.warn('Carousel requires at least 4 cities');
      return;
    }

    // Initialize slots with shuffled cities
    this.shuffleAndAssign();
    this.renderAllSlots();
    this.preloadImages();
    this.setupEventListeners();
    this.startRotation();
  }

  shuffleAndAssign() {
    // Shuffle cities and assign unique cities to each slot
    const shuffled = [...this.allCities].sort(() => Math.random() - 0.5);
    this.slots[1] = shuffled[0];
    this.slots[2] = shuffled[1];
    this.slots[3] = shuffled[2];
    this.slots[4] = shuffled[3];
  }

  renderAllSlots() {
    Object.keys(this.slots).forEach(slot => {
      this.renderSlot(slot);
    });
  }

  renderSlot(slotNum) {
    const city = this.slots[slotNum];
    if (!city) return;

    const slotEl = document.querySelector(`.carousel-slot[data-slot="${slotNum}"]`);
    if (!slotEl) return;

    const cityNameEl = slotEl.querySelector('.instrument-city');
    const bandEl = slotEl.querySelector('.instrument-band');
    const imageEl = slotEl.querySelector('.barometer-image');

    cityNameEl.textContent = city.name;

    const band = getBandFromMood(city.mood);
    bandEl.textContent = band.toUpperCase();

    imageEl.src = `/assets/barometer-${band}.png`;
    imageEl.alt = `${city.name} mood: ${band}`;
  }

  advanceSlot(slotNum) {
    if (this.pinnedSlot === parseInt(slotNum)) {
      // Pinned slot doesn't rotate
      return;
    }

    const currentSlotCity = this.slots[slotNum];
    const otherCities = new Set(Object.entries(this.slots).filter(([s]) => s !== slotNum).map(([, c]) => c?.slug));

    // Find next unique city (must be different from current)
    let attempts = 0;
    let nextCity = null;

    while (attempts < 50) {
      const randomCity = this.allCities[Math.floor(Math.random() * this.allCities.length)];
      if (randomCity.slug !== currentSlotCity?.slug && !otherCities.has(randomCity.slug)) {
        nextCity = randomCity;
        break;
      }
      attempts++;
    }

    if (!nextCity) {
      nextCity = this.allCities[Math.floor(Math.random() * this.allCities.length)];
    }

    this.slots[slotNum] = nextCity;
    this.crossfadeSlot(slotNum);
  }

  crossfadeSlot(slotNum) {
    const slotEl = document.querySelector(`.carousel-slot[data-slot="${slotNum}"]`);
    const imageEl = slotEl.querySelector('.barometer-image');

    // Fade out
    imageEl.classList.add('transitioning');

    setTimeout(() => {
      this.renderSlot(slotNum);
      // Fade in
      imageEl.classList.remove('transitioning');
    }, 350); // Half of 700ms transition
  }

  startRotation() {
    if (this.visibilityHidden) return;

    // Staggered rotation: slot 1 @ 0s, slot 2 @ 1.5s, slot 3 @ 3s, slot 4 @ 4.5s
    const rotationSchedule = {
      1: { delay: 0, interval: 6000 },
      2: { delay: 1500, interval: 6000 },
      3: { delay: 3000, interval: 6000 },
      4: { delay: 4500, interval: 6000 }
    };

    Object.entries(rotationSchedule).forEach(([slot, config]) => {
      // Initial delay before first rotation
      this.timers[`delay-${slot}`] = setTimeout(() => {
        this.advanceSlot(slot);

        // Then rotate on interval
        this.rotationIntervals[slot] = setInterval(() => {
          this.advanceSlot(slot);
        }, config.interval);
      }, config.delay);
    });
  }

  stopRotation() {
    Object.values(this.rotationIntervals).forEach(interval => clearInterval(interval));
    Object.values(this.timers).forEach(timer => clearTimeout(timer));
    this.rotationIntervals = {};
    this.timers = {};
  }

  pause() {
    this.isPaused = true;
    this.stopRotation();
  }

  resume() {
    if (this.visibilityHidden) return;
    this.isPaused = false;
    this.startRotation();
  }

  pinSlot(slotNum, citySlug) {
    this.pinnedSlot = parseInt(slotNum);
    const city = this.allCities.find(c => c.slug === citySlug);

    if (city) {
      this.slots[slotNum] = city;
      this.renderSlot(slotNum);
    }
  }

  unpinSlot() {
    this.pinnedSlot = null;
    this.stopRotation();
    this.startRotation();
  }

  preloadImages() {
    // Preload all 5 band images
    const bands = ['low', 'restrained', 'equilibrium', 'warm', 'charged'];
    bands.forEach(band => {
      const img = new Image();
      img.src = `/assets/barometer-${band}.png`;
      this.preloadedBands[band] = img;
    });
  }

  setupEventListeners() {
    const carousel = document.getElementById('instruments-carousel');
    if (!carousel) return;

    // Pause on hover or focus
    carousel.addEventListener('mouseenter', () => this.pause());
    carousel.addEventListener('mouseleave', () => this.resume());
    carousel.addEventListener('focusin', () => this.pause());
    carousel.addEventListener('focusout', () => this.resume());

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      this.visibilityHidden = document.hidden;
      if (document.hidden) {
        this.stopRotation();
      } else if (!this.isPaused) {
        this.startRotation();
      }
    });

    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.pause();
    }
  }
}

// Mood to band mapping
function getBandFromMood(mood) {
  if (mood >= 8.5) return 'charged';
  if (mood >= 6.5) return 'warm';
  if (mood >= 4.5) return 'equilibrium';
  if (mood >= 2.0) return 'restrained';
  return 'low';
}

// Initialize carousel when DOM ready
function initCarousel(cities) {
  const carousel = new InstrumentsCarousel(cities);
  window.carousel = carousel;
  return carousel;
}

if (typeof window !== 'undefined') {
  window.InstrumentsCarousel = InstrumentsCarousel;
  window.initCarousel = initCarousel;
}
