// Glotemp Live Blog, homepage edition: one large, cinematic, single-focus
// dispatch that changes to a different random city every few seconds --
// the feeling of "the whole network is alive right now", not a feed to
// scroll but a broadcast to watch. Content comes entirely from
// GlotempLiveBlogData (see that file); this module only picks and
// displays it.
(function () {
  'use strict';

  var ROTATE_MS = 8000;
  var timer = null;
  var lastSlug = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pickCity(cities) {
    var pool = cities.filter(function (c) { return c.available !== false; });
    if (pool.length > 1 && lastSlug) pool = pool.filter(function (c) { return c.slug !== lastSlug; });
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function paint() {
    var card = document.getElementById('live-blog-home-card');
    if (!card || !window.CITIES_DATA || !window.CITIES_DATA.length || !window.GlotempLiveBlogData) return;

    var city = pickCity(window.CITIES_DATA);
    if (!city) return;
    lastSlug = city.slug;

    var pool = GlotempLiveBlogData.buildDispatchPool(city);
    if (!pool.length) return;
    var dispatch = pool[Math.floor(Math.random() * pool.length)];

    card.style.setProperty('--card-color', dispatch.color);
    card.classList.remove('is-live'); // restart the progress-bar animation
    void card.offsetWidth; // force reflow so removing/re-adding the class actually restarts it
    card.innerHTML =
      '<span class="live-blog-home-progress" aria-hidden="true"></span>' +
      '<div class="live-blog-home-body">' +
        '<span class="live-blog-home-icon">' + (dispatch.icon || '') + '</span>' +
        '<p class="live-blog-home-city">' + esc(city.name) + '<span class="live-blog-home-country">' + esc(city.country) + '</span></p>' +
        '<h3 class="live-blog-home-headline">' + esc(dispatch.headline) + '</h3>' +
        '<p class="live-blog-home-fact">' + esc(dispatch.body) + '</p>' +
        '<a class="live-blog-home-link" href="/cities/' + esc(city.slug) + '.html#live-blog">Read ' + esc(city.name) + '’s full log &rarr;</a>' +
      '</div>';
    card.classList.add('is-live');
  }

  function scheduleNext() {
    if (timer) clearInterval(timer);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(function () {
      if (document.hidden) return;
      paint();
    }, ROTATE_MS);
  }

  function mount() {
    var section = document.getElementById('live-blog-home-section');
    if (!section) return;
    paint();
    section.hidden = false;
    scheduleNext();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
