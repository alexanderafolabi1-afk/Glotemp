// Glotemp Core: shared band logic + global city pin, used across every
// page beyond the homepage (explore, about, blog, rankings, compare,
// city/vertical profiles). Plain script, no bundler -- everything here
// hangs off `window` so any page can use it after including this file.

(function () {
  const PIN_KEY = 'glotemp-pinned-city';
  const WATCH_KEY = 'glotemp-watched-cities';

  const BANDS = [
    { min: 8.5, band: 'charged', color: '#C86BE0', img: '/assets/barometer-charged.png' },
    { min: 7.0, band: 'warm', color: '#F5A25A', img: '/assets/barometer-warm.png' },
    { min: 5.0, band: 'equilibrium', color: '#F0E0C8', img: '/assets/barometer-equilibrium.png' },
    { min: 3.0, band: 'restrained', color: '#6BA8F5', img: '/assets/barometer-restrained.png' },
    { min: -Infinity, band: 'low', color: '#4FD8E8', img: '/assets/barometer-low.png' },
  ];

  function moodToBand(mood) {
    const m = typeof mood === 'number' && !Number.isNaN(mood) ? mood : 5.0;
    const found = BANDS.find((b) => m >= b.min);
    return { band: found.band, color: found.color, img: found.img };
  }

  function getPinnedCity() {
    try {
      return localStorage.getItem(PIN_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  function setPinnedCity(slug) {
    if (!slug) return;
    try {
      localStorage.setItem(PIN_KEY, slug);
    } catch (e) { /* storage unavailable, degrade silently */ }
    document.dispatchEvent(new CustomEvent('glotemp:city-pinned', { detail: { slug } }));
  }

  function getWatchedCities() {
    try {
      const raw = localStorage.getItem(WATCH_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function isWatched(slug) {
    return getWatchedCities().includes(slug);
  }

  function toggleWatch(slug) {
    const list = getWatchedCities();
    const idx = list.indexOf(slug);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(slug);
    try {
      localStorage.setItem(WATCH_KEY, JSON.stringify(list));
    } catch (e) { /* storage unavailable, degrade silently */ }
    document.dispatchEvent(new CustomEvent('glotemp:watch-changed', { detail: { slug, watching: idx < 0 } }));
    return idx < 0;
  }

  function getTimeAgo(date) {
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  let previewEl = null;
  function ensurePreviewEl() {
    if (previewEl) return previewEl;
    previewEl = document.createElement('div');
    previewEl.className = 'city-hover-preview';
    document.body.appendChild(previewEl);
    return previewEl;
  }

  function showPreview(el, slug) {
    const city = (window.CITIES_DATA || []).find((c) => c.slug === slug);
    if (!city) return;
    const { band, color } = moodToBand(city.mood);
    const el2 = ensurePreviewEl();
    el2.innerHTML = `<strong style="color:${color};">${city.name}</strong><br>
      <span style="color:${color}; text-transform:uppercase; font-family:var(--font-mono); font-size:0.72rem;">${band}</span>
      <span style="font-family:var(--font-mono); font-size:0.72rem;"> · ${city.mood.toFixed(1)}/10</span>`;
    el2.style.borderColor = color;
    const rect = el.getBoundingClientRect();
    el2.style.left = `${rect.left + window.scrollX}px`;
    el2.style.top = `${rect.bottom + window.scrollY + 8}px`;
    el2.classList.add('is-visible');
  }

  function hidePreview() {
    if (previewEl) previewEl.classList.remove('is-visible');
  }

  function wireCityLinks(root) {
    (root || document).querySelectorAll('[data-city-link]:not([data-city-wired])').forEach((el) => {
      el.setAttribute('data-city-wired', '1');
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        const slug = el.getAttribute('data-city-link');
        setPinnedCity(slug);
        if (el.getAttribute('data-city-nav') !== 'false') {
          window.location.href = `/cities/${slug}.html`;
        }
      });
      const slug = el.getAttribute('data-city-link');
      el.addEventListener('mouseenter', () => showPreview(el, slug));
      el.addEventListener('mouseleave', hidePreview);
      el.addEventListener('focus', () => showPreview(el, slug));
      el.addEventListener('blur', hidePreview);
    });
  }

  function imgSlotHTML(src, alt, label, extraClass) {
    const safeAlt = String(alt || '').replace(/"/g, '&quot;');
    const safeLabel = String(label || '').replace(/</g, '&lt;');
    return `<div class="img-slot ${extraClass || ''}">
      <img src="${src}" alt="${safeAlt}" loading="lazy" decoding="async"
           onerror="this.closest('.img-slot').classList.add('img-slot--broken'); this.remove();">
      <div class="img-slot-fallback"><span>${safeLabel}</span></div>
    </div>`;
  }

  function applyMoodBackground(mood) {
    const m = typeof mood === 'number' && !Number.isNaN(mood) ? mood : 5.0;
    const normalized = m / 10;
    document.documentElement.style.setProperty('--ambient-warmth', normalized.toFixed(2));
  }

  function initAmbientMood() {
    const pinned = getPinnedCity();
    const city = pinned && window.CITIES_DATA ? window.CITIES_DATA.find((c) => c.slug === pinned) : null;
    applyMoodBackground(city ? city.mood : undefined);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAmbientMood);
  } else {
    initAmbientMood();
  }

  function reconcileVerticalOrder(verticalSlug) {
    const content = document.getElementById(`${verticalSlug}-content`);
    const context = document.getElementById(`${verticalSlug}-context`);
    if (!content || !context) return;
    const isEmpty = !!content.querySelector('.empty-state');
    const hasContext = context.children.length > 0;
    if (isEmpty && hasContext) {
      content.classList.add('vertical-content--secondary');
      if (content.previousElementSibling !== context) {
        content.parentNode.insertBefore(context, content);
      }
    } else {
      content.classList.remove('vertical-content--secondary');
    }
  }

  // Step 3: load positive-only moderation engine on city pages
  (function loadModeration() {
    function inject(src) {
      if (document.querySelector('script[src="' + src + '"]')) return;
      var s = document.createElement('script');
      s.src = src;
      document.head.appendChild(s);
    }
    inject('/glotemp-moderation.js');
    inject('/glotemp-moderation-wire.js');
  })();

  window.GlotempCore = {
    moodToBand,
    getPinnedCity,
    setPinnedCity,
    reconcileVerticalOrder,
    getWatchedCities,
    isWatched,
    toggleWatch,
    getTimeAgo,
    wireCityLinks,
    imgSlotHTML,
    applyMoodBackground,
  };
})();
