// Glotemp city header photo: reuses the exact same cached Wikipedia
// thumbnail already fetched for the "About this city" panel (see
// city-wiki.js's getCityImageUrl, backed by the same memoized promise
// loadCityWiki uses) as a full-bleed, heavily darkened header background.
// No new network request is ever introduced by this file -- whichever of
// the two callers runs first is the only one that hits Wikipedia.
(function () {
  function loadHeaderPhoto(cityName, country) {
    const wrap = document.getElementById('city-header-photo');
    const img = document.getElementById('city-header-photo-img');
    if (!wrap || !img || !cityName) return;
    if (!window.GlotempWiki || !window.GlotempWiki.getCityImageUrl) return;

    window.GlotempWiki.getCityImageUrl(cityName, country).then((url) => {
      if (!url) return; // no photo for this city -- ground stays as-is, no gap
      // Signal the browser to prioritise this fetch over other, later,
      // below-fold images (which stay loading="lazy").
      const preload = document.createElement('link');
      preload.rel = 'preload';
      preload.as = 'image';
      preload.href = url;
      document.head.appendChild(preload);

      img.addEventListener('load', () => wrap.classList.add('is-loaded'), { once: true });
      if ('fetchPriority' in img) img.fetchPriority = 'high';
      img.src = url;
    }).catch(() => { /* fallback: ground stays as-is */ });
  }

  window.GlotempHeaderPhoto = { loadHeaderPhoto };
})();
