// Glotemp Nav: the ONE source of truth for site navigation markup.
// Every page carries a bare mount point --
//   <nav id="site-nav" class="navbar glass"></nav><script src="/nav-component.js"></script>
// -- placed where the nav used to be hand-authored, non-deferred so it
// renders synchronously before any later script looks for
// #nav-hamburger / #nav-panel. This file is the only place nav markup
// (link order, labels, hamburger, mobile panel) may be authored -- see
// check-nav.js, which fails the build if nav-shaped markup shows up
// hand-written anywhere else.
(function () {
  var NAV_ITEMS = [
    { key: 'pulse', label: 'Pulse', href: '/' },
    { key: 'feed', label: 'Feed', href: '/feed' },
    { key: 'cities', label: 'Cities', href: '/explore' },
    { key: 'about', label: 'About', href: '/about' },
    { key: 'gem', label: 'Hidden gem', href: '/gem', extraClass: 'nav-gem', icon: '/assets/hidden-gem.png' },
  ];

  function detectActive() {
    var path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'pulse';
    if (path.indexOf('/feed') === 0) return 'feed';
    if (path.indexOf('/explore') === 0 || path.indexOf('/cities') === 0 ||
        path.indexOf('/compare') === 0 || path.indexOf('/rankings') === 0 ||
        path.indexOf('/verticals') === 0) return 'cities';
    if (path.indexOf('/about') === 0) return 'about';
    if (path.indexOf('/gem') === 0) return 'gem';
    return '';
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  // Items carrying an icon are represented by the mark alone -- no
  // visible label -- but still need an accessible name for screen
  // readers and title-attribute hover text, since there's no text left
  // to supply one.
  function itemInnerHTML(item) {
    if (item.icon) {
      return '<img src="' + escapeAttr(item.icon) + '" alt="' + escapeAttr(item.label) + '" class="nav-gem-icon">';
    }
    return item.label;
  }

  function linksHTML(active) {
    return NAV_ITEMS.map(function (item) {
      var classes = [];
      if (item.extraClass) classes.push(item.extraClass);
      if (item.key === active) classes.push('active');
      var cls = classes.length ? ' class="' + classes.join(' ') + '"' : '';
      var title = item.icon ? ' title="' + escapeAttr(item.label) + '"' : '';
      return '<a href="' + escapeAttr(item.href) + '"' + cls + title + '>' + itemInnerHTML(item) + '</a>';
    }).join('\n        ');
  }

  function render() {
    var mount = document.getElementById('site-nav');
    if (!mount) return;
    var active = mount.getAttribute('data-active') || detectActive();

    mount.className = 'navbar glass';
    mount.innerHTML =
      '<div class="nav-brand">' +
        '<img src="/assets/logo.png" alt="Glotemp" class="nav-logo">' +
        '<span class="logo-text">Glotemp</span>' +
        '<span class="pulse-dot" aria-hidden="true">❤️</span>' +
      '</div>' +
      '<div class="nav-links" id="nav-links-desktop">\n        ' +
        linksHTML(active) +
      '\n      </div>' +
      '<button id="nav-hamburger" class="nav-hamburger" aria-label="Open navigation" aria-expanded="false" aria-controls="nav-panel">' +
        '<span></span><span></span><span></span>' +
      '</button>';

    buildPanel(active);
    wireHamburger();
  }

  function buildPanel(active) {
    var panel = document.getElementById('nav-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'nav-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Navigation');
      document.body.appendChild(panel);
    }
    panel.className = 'nav-panel';
    panel.setAttribute('aria-hidden', 'true');
    // Panel links never carry .active -- only the desktop nav marks the
    // current page, matching the markup this replaces.
    panel.innerHTML =
      '<button id="nav-panel-close" class="nav-panel-close" aria-label="Close navigation">✕</button>' +
      '<nav class="nav-panel-links">\n        ' +
        NAV_ITEMS.map(function (item) {
          var cls = item.extraClass ? ' class="' + item.extraClass + '"' : '';
          var title = item.icon ? ' title="' + escapeAttr(item.label) + '"' : '';
          return '<a href="' + escapeAttr(item.href) + '"' + cls + title + '>' + itemInnerHTML(item) + '</a>';
        }).join('\n        ') +
      '\n      </nav>';
  }

  function wireHamburger() {
    var hamburger = document.getElementById('nav-hamburger');
    var panel = document.getElementById('nav-panel');
    var closeBtn = document.getElementById('nav-panel-close');
    if (!hamburger || !panel || !closeBtn) return;

    function openPanel() {
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }
    function closePanel() {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      hamburger.focus();
    }

    hamburger.addEventListener('click', openPanel);
    closeBtn.addEventListener('click', closePanel);
    panel.addEventListener('click', function (e) {
      if (e.target === panel) closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
    });
    panel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closePanel);
    });
  }

  render();

  window.GlotempNav = { render: render, NAV_ITEMS: NAV_ITEMS };
})();
