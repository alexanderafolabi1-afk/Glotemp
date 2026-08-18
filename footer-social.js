// Footer social links: Instagram + X.
//
// Two structurally different footer patterns exist across this site --
// a plain <footer class="footer glass"><p>...</p> chain, and a wrapped
// <footer class="footer glass-card"><div class="footer-content">...
// variant used by the vertical pages and the city template -- and
// neither is behind a shared function or constant; every page and
// generator types its footer markup out independently. Rather than add
// the icon markup in yet another (now thirty-plus) places, this mounts
// once, at runtime, wherever a footer actually is -- the one thing this
// site's nav-component.js already does for the header, applied here for
// the same reason: the next time an icon needs to change, this is the
// only file that changes.
(function () {
  var LINKS = [
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/glo_temp?igsh=MWRpaWdybHc0bG4zMw%3D%3D&utm_source=qr',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="3" y="3" width="18" height="18" rx="5"/>' +
        '<circle cx="12" cy="12" r="4"/>' +
        '<circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none"/>' +
        '</svg>',
    },
    {
      name: 'X',
      url: 'https://x.com/glotempo?s=11',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M4.5 4.5l15 15M19.5 4.5l-15 15"/>' +
        '</svg>',
    },
  ];

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function mount() {
    var footer = document.querySelector('footer.footer');
    if (!footer || footer.querySelector('.footer-social')) return;

    var row = document.createElement('p');
    row.className = 'footer-social';
    row.innerHTML = LINKS.map(function (l) {
      return '<a class="footer-social-link" href="' + esc(l.url) + '" target="_blank" rel="noopener" aria-label="Glotemp on ' + esc(l.name) + '">' + l.svg + '</a>';
    }).join('');

    // Both footer patterns end in a .footer-lang-row paragraph -- placing
    // the icons directly before it keeps them the last content line
    // ahead of the language switcher, in every variant, without needing
    // to know which of the two structures a given page uses.
    var langRow = footer.querySelector('.footer-lang-row');
    if (langRow) footer.insertBefore(row, langRow);
    else footer.appendChild(row);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
