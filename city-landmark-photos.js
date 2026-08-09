(function () {
  // Real landmark photos, sourced live from each landmark's own Wikipedia
  // article via the free/keyless Wikipedia REST summary API (the same one
  // city-wiki.js already uses for the "About this city" panel, whose CC
  // BY-SA 4.0 attribution line already covers imagery pulled from Wikipedia
  // on the page). Every entry below resolves to a real photograph on the
  // landmark's own article, not a placeholder.
  //
  // This is a progressive enhancement, never a replacement: city-landmarks.js
  // (the hand-drawn SVG set) always renders first and instantly, with no
  // network dependency. If the fetch below succeeds, the SVG is swapped for
  // the real photo; if it fails or a city has no landmark mapping, the SVG
  // simply stands as the fallback -- this is the "clean, high-quality public
  // domain alternative" fallback path, not an error state.
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
    const title = LANDMARK_TITLES[slug];
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

  const api = { upgrade, hasPhoto: (slug) => !!LANDMARK_TITLES[slug] };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.GlotempLandmarkPhotos = api;
  }
})();
