(function () {
  // Real photos, sourced live via the free/keyless Wikipedia REST summary
  // API (the same one city-wiki.js already uses for the "About this city"
  // panel, whose CC BY-SA 4.0 attribution line already covers imagery
  // pulled from Wikipedia on the page). Two tiers:
  //
  //   1. The 24 cities below have a hand-picked, verified landmark --
  //      Paris gets the Eiffel Tower's own photo, not a generic Paris
  //      street scene, which reads as more distinctive.
  //   2. Every other city (see resolveTitle() below) falls back to its own
  //      Wikipedia article via cities-data.js's real name field, rather
  //      than guessing a landmark and its exact article title for 127
  //      cities this file's author cannot personally verify -- a real
  //      photo of the actual city is honest, a wrong or misspelled
  //      landmark guess is not.
  //
  // This is a progressive enhancement, never a replacement: city-landmarks.js
  // (the hand-drawn SVG set) always renders first and instantly, with no
  // network dependency. If the fetch below succeeds, the SVG is swapped for
  // the real photo; if it fails, or the resolved article turns out to be a
  // disambiguation page with no thumbnail, the SVG simply stands as the
  // fallback -- this is the "clean, high-quality public domain alternative"
  // fallback path, not an error state.
  const LANDMARK_TITLES = {
    paris: 'Eiffel Tower',
    london: 'Big Ben',
    nyc: 'Statue of Liberty',
    tokyo: 'Tokyo Tower',
    rome: 'Colosseum',
    sydney: 'Sydney Opera House',
    dubai: 'Burj Khalifa',
    beijing: 'Temple of Heaven',
    moscow: "Saint Basil's Cathedral",
    berlin: 'Brandenburg Gate',
    barcelona: 'Sagrada Família',
    cairo: 'Great Pyramid of Giza',
    istanbul: 'Hagia Sophia',
    'san-francisco': 'Golden Gate Bridge',
    chicago: 'Willis Tower',
    'los-angeles': 'Hollywood Sign',
    singapore: 'Marina Bay Sands',
    'hong-kong': 'Victoria Harbour',
    seoul: 'N Seoul Tower',
    amsterdam: 'Canals of Amsterdam',
    'washington-dc': 'United States Capitol',
    toronto: 'CN Tower',
    mumbai: 'Gateway of India',
    delhi: 'India Gate',
    'kuala-lumpur': 'Petronas Towers',
  };

  const API_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  const cache = new Map();

  // For every city without a hand-picked landmark above: fall back to the
  // city's own Wikipedia article rather than guessing a landmark name and
  // its exact article title for 127 cities this file's author cannot
  // personally verify. A real photo of the actual city is honest; a wrong
  // or misspelled landmark title is not -- it either 404s (handled, see
  // upgrade()'s existing fallback-to-SVG path) or, worse, silently
  // resolves to the wrong place. window.CITIES_DATA (cities-data.js) is
  // already loaded on every page that calls into this module.
  function resolveTitle(slug) {
    if (LANDMARK_TITLES[slug]) return LANDMARK_TITLES[slug];
    const city = (typeof window !== 'undefined' && window.CITIES_DATA || [])
      .find((c) => c.slug === slug);
    return city ? city.name : null;
  }

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

  // Swaps the .city-landmark-icon SVG inside containerEl for a real photo
  // of that city's landmark, if one is available. Leaves the SVG in place
  // (does nothing) on any failure, including no mapping, no network, or a
  // response with no thumbnail -- the SVG is a complete UI on its own.
  async function upgrade(containerEl, slug, size) {
    const title = resolveTitle(slug);
    if (!title || !containerEl) return;
    const svg = containerEl.querySelector('.city-landmark-icon');
    if (!svg) return;
    const src = await fetchThumbnail(title);
    if (!src) return;
    if (!containerEl.isConnected || !containerEl.contains(svg)) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.className = 'city-landmark-photo';
    img.width = size || 18;
    img.height = size || 18;
    img.referrerPolicy = 'no-referrer';
    svg.replaceWith(img);
  }

  // Thin public wrapper around the same cache/fetch used by upgrade(),
  // for callers that just want the photo URL (or null) rather than a
  // DOM swap -- e.g. the Trending cities cards, which build their own
  // markup instead of starting from a .city-landmark-icon SVG.
  function getPhotoUrl(slug) {
    const title = resolveTitle(slug);
    return title ? fetchThumbnail(title) : Promise.resolve(null);
  }

  const api = { upgrade, hasPhoto: (slug) => !!resolveTitle(slug), getPhotoUrl };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.GlotempLandmarkPhotos = api;
  }
})();
