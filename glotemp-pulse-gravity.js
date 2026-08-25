// Pulse Gravity: a small "similar mood elsewhere, right now" block on
// city pages, linking onward to 4 other cities with the closest current
// mood reading.
//
// Why this exists: every city page on this site is currently a dead end
// -- nothing links sideways to any other city. If a single page ever
// catches a spike of outside traffic (a news event, a shared link), that
// traffic has nowhere to go but away. This gives it somewhere to go,
// using data the site already computes (city.mood, GlotempCore.moodToBand)
// -- no new data source, no third-party call.
(function () {
  'use strict';

  var RELATED_COUNT = 4;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function currentSlugFromPath() {
    var m = window.location.pathname.match(/\/cities\/([^/]+)\.html$/);
    return m ? m[1] : null;
  }

  function relatedCities(current, all) {
    return all
      .filter(function (c) { return c.slug !== current.slug && c.available !== false && typeof c.mood === 'number'; })
      .sort(function (a, b) { return Math.abs(a.mood - current.mood) - Math.abs(b.mood - current.mood); })
      .slice(0, RELATED_COUNT);
  }

  function itemHTML(city) {
    var band = GlotempCore.moodToBand(city.mood);
    return (
      '<a class="pulse-gravity-item" href="/cities/' + esc(city.slug) + '.html" ' +
        'data-city-link="' + esc(city.slug) + '" data-city-nav="false" ' +
        'style="--pg-color:' + esc(band.color) + '">' +
        '<span class="pulse-gravity-name">' + esc(city.name) + '</span>' +
        '<span class="pulse-gravity-meta">' + esc(city.country) + ' &middot; ' + city.mood.toFixed(1) + '</span>' +
      '</a>'
    );
  }

  function mount() {
    var slug = currentSlugFromPath();
    if (!slug) return;
    if (typeof GlotempCore === 'undefined' || !window.CITIES_DATA) return;

    var all = window.CITIES_DATA;
    var current = all.find(function (c) { return c.slug === slug; });
    if (!current || typeof current.mood !== 'number') return;

    var related = relatedCities(current, all);
    if (!related.length) return;

    var section = document.createElement('section');
    section.className = 'glass-card pulse-gravity-section';
    section.id = 'pulse-gravity-mount';
    section.setAttribute('aria-label', 'Cities with a similar mood right now');
    section.innerHTML =
      '<p class="eyebrow">Similar mood, elsewhere, right now</p>' +
      '<div class="pulse-gravity-list">' + related.map(itemHTML).join('') + '</div>';

    var socialProof = document.getElementById('social-proof-mount');
    var footer = document.querySelector('footer.footer');
    if (socialProof && socialProof.parentNode) {
      socialProof.insertAdjacentElement('afterend', section);
    } else if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(section, footer);
    } else {
      return;
    }

    GlotempCore.wireCityLinks(section);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
