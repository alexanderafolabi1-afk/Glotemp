// Glotemp Admin: the ONE source of truth for admin navigation. Every
// admin page carries a bare mount point --
//   <header class="adm-bar" id="adm-nav-bar"></header>
// -- filled in here, plus the slide-in sidebar this appends to
// <body>. Same hamburger/panel mechanism as the public site's
// nav-component.js (open/close, Escape, backdrop click, focus return),
// adapted into a real left sidebar rather than the public nav's
// off-canvas link list, since five persistent destinations read better
// as a sidebar than as a dropdown.
(function () {
  'use strict';

  var ADMIN_PAGES = [
    { key: 'overview', label: 'Overview', href: '/admin/' },
    { key: 'contributors', label: 'Contributors', href: '/admin/contributors.html' },
    { key: 'outreach', label: 'Outreach', href: '/admin/outreach.html' },
    { key: 'content', label: 'Content', href: '/admin/content.html' },
    { key: 'settings', label: 'Settings', href: '/admin/settings.html' },
  ];

  function detectActive() {
    var path = window.location.pathname;
    if (path === '/admin/' || path === '/admin' || path === '/admin/index.html') return 'overview';
    if (path.indexOf('/admin/contributors') === 0) return 'contributors';
    if (path.indexOf('/admin/outreach') === 0) return 'outreach';
    if (path.indexOf('/admin/content') === 0) return 'content';
    if (path.indexOf('/admin/settings') === 0) return 'settings';
    return '';
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  function linksHTML(active) {
    return ADMIN_PAGES.map(function (item) {
      var cls = item.key === active ? ' class="active"' : '';
      var current = item.key === active ? ' aria-current="page"' : '';
      return '<a href="' + escapeAttr(item.href) + '"' + cls + current + '>' + item.label + '</a>';
    }).join('\n        ');
  }

  function render() {
    var mount = document.getElementById('adm-nav-bar');
    if (!mount) return;
    var active = mount.getAttribute('data-active') || detectActive();

    mount.className = 'adm-bar';
    mount.innerHTML =
      '<div class="adm-nav-left">' +
        '<button id="adm-nav-toggle" class="adm-nav-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="adm-nav-panel">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
        '<a href="/admin/" class="adm-nav-brand" aria-label="Glotemp Admin, overview">' +
          '<img src="/assets/logo.png" alt="" class="adm-nav-logo">' +
          '<span class="adm-nav-wordmark">Admin</span>' +
        '</a>' +
      '</div>' +
      '<a class="adm-back" href="/">Glotemp &#8599;</a>';

    buildPanel(active);
    wireToggle();
  }

  function buildPanel(active) {
    var panel = document.getElementById('adm-nav-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'adm-nav-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Admin navigation');
      document.body.appendChild(panel);
    }
    panel.className = 'adm-nav-panel';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<div class="adm-nav-panel-inner">' +
        '<div class="adm-nav-panel-head">' +
          '<img src="/assets/logo.png" alt="" class="adm-nav-logo">' +
          '<span class="adm-nav-wordmark">Glotemp Admin</span>' +
          '<button id="adm-nav-close" class="adm-nav-close" aria-label="Close navigation">&#10005;</button>' +
        '</div>' +
        '<nav class="adm-nav-panel-links" aria-label="Admin pages">\n        ' +
          linksHTML(active) +
        '\n      </nav>' +
        '<a class="adm-nav-panel-exit" href="/">Back to Glotemp &#8599;</a>' +
      '</div>';
  }

  function wireToggle() {
    var toggle = document.getElementById('adm-nav-toggle');
    var panel = document.getElementById('adm-nav-panel');
    var closeBtn = document.getElementById('adm-nav-close');
    if (!toggle || !panel || !closeBtn) return;

    function openPanel() {
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }
    function closePanel() {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      toggle.focus();
    }

    toggle.addEventListener('click', openPanel);
    closeBtn.addEventListener('click', closePanel);
    panel.addEventListener('click', function (e) {
      if (e.target === panel) closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
    });
    // Not closed on link click the way the public nav-panel closes on
    // its own same-page anchors: every link here is a real navigation to
    // a different document, so the browser is already leaving -- closing
    // first would just be a flash before the new page's own nav opens
    // fresh and closed.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();

  window.GlotempAdminNav = { render: render, ADMIN_PAGES: ADMIN_PAGES };
})();
