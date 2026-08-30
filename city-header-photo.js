// Glotemp city header photo. Priority order, highest confidence first:
//
//   1. /city-media/ -- server-side-fetched, licence-checked photos already
//      committed to this repo (see city-media-photo.js,
//      scripts/fetch-city-media.js). A same-origin static file, so this
//      never depends on a visitor's browser successfully reaching a
//      third-party API.
//   2. The 24 cities with a hand-verified landmark (see
//      city-landmark-photos.js's LANDMARK_TITLES) -- a specific, correct
//      landmark reads better than whatever a city's own Wikipedia infobox
//      happens to show.
//   3. The exact same cached Wikipedia thumbnail already fetched for the
//      "About this city" panel (see city-wiki.js's getCityImageUrl, now a
//      two-tier lookup against Wikipedia's own summary + pageimages
//      endpoints).
//
// No paid image service anywhere in this chain.
(function () {
  function renderCredit(wrap, photo) {
    const existing = wrap.querySelector('.city-header-photo-credit');
    if (existing) existing.remove();
    if (!photo || !photo.creator) return;
    const a = document.createElement('a');
    a.className = 'city-header-photo-credit';
    a.href = photo.sourceUrl || '#';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = `Photo: ${photo.creator}${photo.licence ? ` (${photo.licence})` : ''}`;
    wrap.appendChild(a);
  }

  function loadHeaderPhoto(cityName, country, citySlug) {
    const wrap = document.getElementById('city-header-photo');
    const img = document.getElementById('city-header-photo-img');
    if (!wrap || !img || !cityName) return;

    function apply(url, credit) {
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
      renderCredit(wrap, credit);
    }

    const mediaPromise = (citySlug && window.GlotempCityMedia && window.GlotempCityMedia.getPhoto)
      ? window.GlotempCityMedia.getPhoto(citySlug)
      : Promise.resolve(null);

    mediaPromise.then((photo) => {
      if (photo && photo.url) return apply(photo.url, photo);

      const landmarkPromise = (citySlug && window.GlotempLandmarkPhotos && window.GlotempLandmarkPhotos.hasPhoto(citySlug))
        ? window.GlotempLandmarkPhotos.getPhotoUrl(citySlug)
        : Promise.resolve(null);

      return landmarkPromise.then((landmarkUrl) => {
        if (landmarkUrl) return apply(landmarkUrl, null);
        if (!window.GlotempWiki || !window.GlotempWiki.getCityImageUrl) return;
        return window.GlotempWiki.getCityImageUrl(cityName, country).then((url) => apply(url, null));
      });
    }).catch(() => { /* fallback: ground stays as-is */ });
  }

  window.GlotempHeaderPhoto = { loadHeaderPhoto };
})();
