// Glotemp city media: reads the server-side-fetched, licence-checked
// photos already committed to /city-media/ by scripts/fetch-city-media.js
// (see .github/workflows/city-media.yml). A same-origin static file --
// no third-party API call, no per-visitor network dependency on Wikipedia
// or anything else -- so this is tried first, ahead of any live lookup.
// Only CC0, Public domain, and CC BY images ever land in this manifest
// (see fetch-city-media.js's own licence gate); creator/licence/source
// are returned alongside the URL so callers can show a credit line --
// required for CC BY, harmless for CC0/PD.
(function () {
  let manifestPromise = null;
  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch('/city-media/manifest.json', { headers: { Accept: 'application/json' } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    }
    return manifestPromise;
  }

  async function getPhoto(slug) {
    if (!slug) return null;
    const manifest = await loadManifest();
    const entry = manifest && manifest.cities && manifest.cities[slug];
    const image = entry && entry.images && entry.images[0];
    if (!image || !image.src) return null;
    return {
      url: image.src,
      creator: image.creator || null,
      licence: image.licence || null,
      sourceUrl: image.sourceUrl || null,
    };
  }

  window.GlotempCityMedia = { getPhoto };
})();
