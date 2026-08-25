// Glotemp Live Blog, city edition: a vertical journal of real dispatches
// about this one city, mounted on the city's own page. Content comes
// entirely from GlotempLiveBlogData (see that file, and glotemp-live-blog-home.js
// for the homepage's rotating take on the same data).
(function () {
  'use strict';

  var ENTRY_COUNT = 6;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function currentSlugFromPath() {
    var m = window.location.pathname.match(/\/cities\/([^/]+)\.html$/);
    return m ? m[1] : null;
  }

  function entryHTML(dispatch, index) {
    return (
      '<li class="live-blog-entry" style="--entry-color:' + dispatch.color + '">' +
        '<span class="live-blog-entry-dot" aria-hidden="true"></span>' +
        '<div class="live-blog-entry-card">' +
          '<span class="live-blog-entry-label">' +
            (dispatch.icon ? '<span class="live-blog-entry-icon">' + dispatch.icon + '</span>' : '') +
            esc(dispatch.label) +
          '</span>' +
          '<h3 class="live-blog-entry-headline">' + esc(dispatch.headline) + '</h3>' +
          '<p class="live-blog-entry-body">' + esc(dispatch.body) + '</p>' +
        '</div>' +
      '</li>'
    );
  }

  function mount() {
    var section = document.getElementById('live-blog');
    if (!section || !window.CITIES_DATA || !window.GlotempLiveBlogData) return;

    var slug = currentSlugFromPath();
    var city = slug && window.CITIES_DATA.find(function (c) { return c.slug === slug; });
    if (!city) return;

    var pool = GlotempLiveBlogData.buildDispatchPool(city);
    if (!pool.length) return;

    var heading = document.getElementById('live-blog-heading');
    var list = document.getElementById('live-blog-list');
    if (!list) return;

    if (heading) heading.textContent = 'The ' + city.name + ' log';

    list.innerHTML = pool.slice(0, ENTRY_COUNT).map(entryHTML).join('');
    section.hidden = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
