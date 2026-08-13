// Accordion behaviour for the main city page's vertical sections (each a
// native <details>/<summary> now -- see generate-city-pages.js). Modern
// browsers already auto-expand a <details> that's the target of a URL
// fragment, but that's a newer engine feature this audience can't be
// assumed to have -- this click handler is the robust fallback: it opens
// the target itself rather than waiting on native fragment-targeting.
(function () {
  function wire() {
    document.querySelectorAll('.vertical-nav .vertical-link').forEach(function (link) {
      link.addEventListener('click', function () {
        var id = link.getAttribute('href');
        if (!id || id.charAt(0) !== '#') return;
        var target = document.getElementById(id.slice(1));
        if (target && target.tagName === 'DETAILS') target.open = true;
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
