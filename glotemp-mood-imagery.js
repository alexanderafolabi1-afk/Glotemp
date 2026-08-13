// Glotemp Mood Imagery: replaces the flat mood-state emoji (Energized,
// Good, Neutral, Low, Cautious) with real photography, sourced live from
// each scene's own Wikipedia article via the same free/keyless REST
// summary API city-landmark-photos.js and city-wiki.js already use --
// covered by the same page-level CC BY-SA 4.0 Wikipedia attribution.
//
// Progressive enhancement only, same contract as city-landmark-photos.js:
// the emoji glyph already in the markup renders first, instantly, with
// no network dependency. If a real photo resolves, it replaces the
// glyph; if the fetch fails, the emoji simply stays -- never a blank or
// broken state.
(function () {
  // One representative real-world scene per mood band, not per city --
  // the mood picker is a generic input (five states, not yet tied to a
  // single city's imagery), so these are deliberately universal rather
  // than city-specific. Chosen for both mood fit and thumbnail
  // reliability on Wikipedia's own article.
  // A primary and a fallback article per mood -- some Wikipedia articles
  // occasionally have no thumbnail (an infobox image that isn't tagged as
  // one, a disambiguation redirect, etc.), so a single-title lookup can
  // leave the emoji showing for a reason that has nothing to do with the
  // network. Trying a second, different real scene before giving up
  // meaningfully improves how often a real photo actually lands.
  const MOOD_SCENE_TITLES = {
    charged: ['Times Square', 'Shibuya Crossing'],       // Energized: bright, dense, alive
    warm: ['Golden hour', 'Sunset'],                     // Good: warm, easy light
    equilibrium: ['Overcast', 'Cloud'],                  // Neutral: level, unremarkable
    restrained: ['Fog', 'Mist'],                         // Low: muted, quiet
    low: ['Thunderstorm', 'Lightning'],                  // Cautious: tension, alertness
  };

  const API_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  const cache = new Map();

  function fetchThumbnail(title) {
    if (cache.has(title)) return cache.get(title);
    const promise = (async () => {
      try {
        const resp = await fetch(API_BASE + encodeURIComponent(title), {
          headers: { Accept: 'application/json' },
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return (data && data.thumbnail && data.thumbnail.source) || null;
      } catch (e) {
        return null;
      }
    })();
    cache.set(title, promise);
    return promise;
  }

  async function fetchThumbnailWithFallback(titles) {
    for (const title of titles) {
      const src = await fetchThumbnail(title);
      if (src) return src;
    }
    return null;
  }

  async function upgradeMoodButtons(root) {
    const scope = root || document;
    const buttons = Array.from(scope.querySelectorAll('.mood-btn[data-band]'));
    await Promise.all(buttons.map(async (btn) => {
      const band = btn.getAttribute('data-band');
      const titles = MOOD_SCENE_TITLES[band];
      const iconEl = btn.querySelector('.mood-btn-icon');
      if (!titles || !iconEl) return;
      const src = await fetchThumbnailWithFallback(titles);
      if (!src || !iconEl.isConnected) return;
      // The JSON fetch succeeding only means Wikipedia named a thumbnail --
      // the image request itself (a separate round trip to
      // upload.wikimedia.org) can still fail. Keep the original emoji
      // markup so a load failure restores it instead of leaving the
      // button blank.
      const fallbackHTML = iconEl.innerHTML;
      const emoji = btn.getAttribute('data-mood') || '';
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.className = 'mood-btn-photo';
      img.onerror = () => { iconEl.innerHTML = fallbackHTML; };
      iconEl.innerHTML = '';
      iconEl.appendChild(img);
      // A real photo (Fog, Thunderstorm, Golden hour...) reads as an
      // arbitrary thumbnail on its own -- what actually communicates the
      // mood is the original emoji, so it stays as a small badge on the
      // photo rather than being dropped entirely. Photo for visual
      // richness, emoji for instant meaning; the text label underneath
      // backs both up.
      if (emoji) {
        const badge = document.createElement('span');
        badge.className = 'mood-btn-emoji-badge';
        badge.setAttribute('aria-hidden', 'true');
        badge.textContent = emoji;
        iconEl.appendChild(badge);
      }
    }));
  }

  window.GlotempMoodImagery = { upgradeMoodButtons, fetchThumbnail, MOOD_SCENE_TITLES };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => upgradeMoodButtons());
  } else {
    upgradeMoodButtons();
  }
})();
