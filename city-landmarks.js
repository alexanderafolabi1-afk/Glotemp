// Glotemp city landmarks: a small set of hand-drawn line-art insignias for
// cities with one unmistakable global landmark, plus a single honest
// fallback glyph (a plain minimal skyline) for every other city. Never
// guesses at an obscure "local landmark" for a city we don't have solid
// footing on -- that risks putting something factually wrong next to a
// city's name, presented as fact. Consistent viewBox, stroke width, and
// currentColor everywhere, so it always matches whatever text color it
// sits next to.
(function () {
  const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

  const LANDMARKS = {
    paris: '<path d="M12 2l-1.8 5h-1l-1 4.5h1.3l-1.3 5.5h1l-1.5 4h8.6l-1.5-4h1l-1.3-5.5h1.3l-1-4.5h-1l-1.8-5z"/><path d="M9 11h6M8.3 15.5h7.4"/>',
    london: '<path d="M8 22V10l4-6 4 6v12"/><path d="M8 22h8"/><circle cx="12" cy="10" r="2.1"/><path d="M12 8.9v1.1l0.8 0.5"/>',
    nyc: '<path d="M9 22V12a3 3 0 016 0v10z"/><path d="M9.4 6l.9-1.4h3.4l.9 1.4"/><path d="M15 9l4-4"/><path d="M18.3 3.6c.6-.5 1.6-.2 1.8.5.2.6-.3 1.3-1 1.4-.9.1-1.4-1-.8-1.9z"/>',
    tokyo: '<path d="M4 8h16M5.5 5.5h13M7 5.5v14M17 5.5v14"/>',
    rome: '<path d="M4 20V9a8 3 0 0116 0v11"/><path d="M4 20h16"/><path d="M7.5 20v-5a1.3 1.8 0 012.6 0v5M11 20v-6a1.3 2 0 012.6 0v6M14.5 20v-5a1.3 1.8 0 012.6 0v5"/>',
    sydney: '<path d="M3 20h18"/><path d="M5 20c0-4 2-7 4-7-1 3 0 5.5 1.5 7z"/><path d="M10 20c0-5 2.5-9 5-9-1.5 4 0 7 2.5 9z"/><path d="M16 20c0-3.5 1.5-6 3.5-6-1 2.5 0 4.5 1.5 6z"/>',
    dubai: '<path d="M11 22V8l.5-3 .5-3 .5 3 .5 3v14z"/><path d="M9.5 22h5M10.5 15h3M10.7 11h2.6"/>',
    beijing: '<path d="M6 10a6 4 0 0112 0z"/><rect x="9" y="10" width="6" height="8"/><path d="M12 2v3M6 21h12"/>',
    moscow: '<path d="M4 20h16"/><path d="M7 20v-5a2 2 0 014 0v5"/><path d="M13 20v-7a2 2.5 0 014 0v7"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="10.5" r="2.3"/>',
    berlin: '<path d="M4 20h16M4 20V9M8 20V9M12 20V9M16 20V9M20 20V9M3 9h18"/>',
    barcelona: '<path d="M4 20V10l1.5-4 1.5 4v10"/><path d="M9 20V7l2-5 2 5v13"/><path d="M15 20V10l1.5-4 1.5 4v10"/>',
    cairo: '<path d="M12 4l7 16H5z"/><path d="M9 20l3-7 3 7"/>',
    istanbul: '<path d="M4 20V8a2 4 0 014 0v12"/><path d="M16 20V8a2 4 0 014 0v12"/><path d="M8 20v-6a4 3 0 018 0v6"/>',
    'san-francisco': '<path d="M3 16c3-4 15-4 18 0"/><path d="M7 6v12M17 6v12"/><path d="M3 20h18"/>',
    chicago: '<path d="M9 22V6l3-3 3 3v16"/><path d="M12 3V1M7 22h10"/>',
    'los-angeles': '<path d="M12 22V13"/><path d="M12 13c-3-1-5-3-6-6 3 0 5 2 6 5M12 13c3-1 5-3 6-6-3 0-5 2-6 5M12 13c-2-2-3-4-3-7 2 1 3 3 3 6M12 13c2-2 3-4 3-7-2 1-3 3-3 6"/>',
    singapore: '<path d="M6 21V9M12 21V6M18 21V9"/><path d="M4 8c1-1.5 3-1.5 4 0M10 5c1-1.5 3-1.5 4 0M16 8c1-1.5 3-1.5 4 0"/><path d="M3 21h18"/>',
    'hong-kong': '<path d="M3 21V13h3v8M8 21V9h3v12M13 21V15h3v6M18 21V11h3v10"/><path d="M3 21h18"/>',
    seoul: '<path d="M12 22V10"/><circle cx="12" cy="7" r="2.5"/><path d="M12 4.5V2"/>',
    amsterdam: '<path d="M5 21V13l2-2 2 2v-2l2-2 2 2v-2l2-2 2 2v8"/><path d="M5 21h14"/>',
    'washington-dc': '<path d="M6 21V15h12v6"/><path d="M8 15a4 3.5 0 018 0"/><path d="M12 4v4M10 8h4"/><path d="M4 21h16"/>',
    toronto: '<path d="M12 22V9"/><path d="M9.5 9c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5-1 2-2.5 2-2.5-.5-2.5-2z"/><path d="M12 4v2.5"/>',
    mumbai: '<path d="M5 21V11a7 6 0 0114 0v10"/><path d="M8 21V13M16 21V13"/><path d="M3 21h18"/>',
    delhi: '<path d="M6 21V9h2v6h8V9h2v12"/><path d="M4 21h16"/>',
    'kuala-lumpur': '<path d="M8 21V6l1-2 1 2v15M14 21V6l1-2 1 2v15"/><path d="M8 14h8"/>',
  };

  // The one fallback: a plain, honest three-building skyline. Used for
  // every city without a hand-drawn landmark above (Milton Keynes and
  // ~125 others) -- deliberately generic rather than guessing at a local
  // symbol we can't verify.
  const FALLBACK = '<path d="M4 21V11h4v10M10 21V7h4v14M16 21V13h4v8"/><path d="M3 21h18"/>';

  function cityIconInner(slug) {
    return LANDMARKS[slug] || FALLBACK;
  }

  function cityIconHTML(slug, opts) {
    const o = opts || {};
    const size = o.size || 18;
    const cls = o.className ? ` class="${o.className}"` : '';
    return `<svg width="${size}" height="${size}" ${ICON_ATTRS}${cls}>${cityIconInner(slug)}</svg>`;
  }

  const api = { cityIconHTML, hasLandmark: (slug) => !!LANDMARKS[slug] };

  // Used both client-side (city hero, dial grid, instrument room) and
  // server-side by the page generators (compare pages bake city names in
  // at build time, not client-side) -- same icon set, same fallback rule,
  // either way.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.GlotempLandmarks = api;
  }
})();
