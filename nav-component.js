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

  // Full HTML-escape, not just quotes -- unlike NAV_ITEMS labels (which
  // are hardcoded strings above), the account control renders a
  // visitor-supplied display_name, so this has to be safe as text content
  // too (&, <, >), not merely as an attribute value.
  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
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

  // Account control: the ONE persistent, always-visible sign-in entry
  // point on the site. Every other sign-in trigger (Follow, comment,
  // check-in) is contextual -- gated behind an action someone was already
  // taking -- so a visitor who just wants to know "am I signed in, and if
  // not, where do I do that" had nowhere to look. This renders into both
  // the desktop nav and the mobile panel and re-renders itself whenever
  // auth state changes, including on first load for an already-signed-in
  // returning visitor.
  //
  // GlotempAuth loads via a later <script> tag than this file (nav mounts
  // synchronously near the top of <body>, auth is one of the last scripts
  // before the page's own bootstrap), so at first render() it may not
  // exist yet. Rendered as signed-out by default and corrected the moment
  // GlotempAuth is ready -- see wireAccountControl below.
  function accountLabel() {
    if (!window.GlotempAuth || !window.GlotempAuth.isSignedIn()) return null;
    var profile = window.GlotempAuth.getCachedProfile();
    var user = window.GlotempAuth.getUser();
    return (profile && profile.display_name) || (user && user.email) || 'Account';
  }

  function accountControlHTML(idSuffix) {
    var signedIn = window.GlotempAuth && window.GlotempAuth.isSignedIn();
    var label = signedIn ? accountLabel() : 'Sign in';
    return (
      '<div class="nav-account" id="nav-account' + idSuffix + '">' +
        '<button type="button" class="nav-account-btn" id="nav-account-btn' + idSuffix + '" aria-haspopup="true" aria-expanded="false">' + escapeHTML(label) + '</button>' +
        '<div class="nav-account-menu" id="nav-account-menu' + idSuffix + '" hidden>' +
          // Private, self-only: filled in by loadAccountStars() the
          // moment the menu opens, never rendered with real numbers up
          // front (there is nothing to fetch yet at initial page render,
          // and this must never show anyone else's numbers -- it only
          // ever exists inside the signed-in owner's own dropdown).
          '<div class="nav-account-stars" id="nav-account-stars' + idSuffix + '"></div>' +
          '<button type="button" class="nav-account-signout" id="nav-account-signout' + idSuffix + '">Sign out</button>' +
        '</div>' +
      '</div>'
    );
  }

  // Fetches and renders this signed-in visitor's own star total and
  // invite link into their account dropdown -- see glotemp-auth.js's
  // get_my_stars()/ensureReferralCode(). Fired on menu open rather than
  // on every render, since it is two network round trips and the menu
  // usually stays closed.
  var starsLoadedFor = {};
  function loadAccountStars(idSuffix) {
    var box = document.getElementById('nav-account-stars' + idSuffix);
    if (!box || !window.GlotempAuth || !window.GlotempAuth.isSignedIn()) return;
    if (starsLoadedFor[idSuffix]) return;
    starsLoadedFor[idSuffix] = true;
    box.innerHTML = '<p class="nav-account-stars-loading">Loading&hellip;</p>';
    Promise.all([window.GlotempAuth.getMyStars(), window.GlotempAuth.ensureReferralCode()])
      .then(function (results) {
        var stars = results[0];
        var code = results[1] || stars.referral_code;
        var link = code ? (window.location.origin + '/?ref=' + encodeURIComponent(code)) : null;
        box.innerHTML =
          '<p class="nav-account-stars-count">' + escapeHTML(stars.total_stars) + ' star' + (stars.total_stars === 1 ? '' : 's') + '</p>' +
          (link
            ? '<p class="nav-account-invite-label">Your invite link</p>' +
              '<div class="nav-account-invite-row">' +
                '<input class="nav-account-invite-link" id="nav-account-invite-link' + idSuffix + '" type="text" readonly value="' + escapeAttr(link) + '">' +
                '<button type="button" class="nav-account-invite-copy" id="nav-account-invite-copy' + idSuffix + '">Copy</button>' +
              '</div>'
            : '');
        var copyBtn = document.getElementById('nav-account-invite-copy' + idSuffix);
        var linkInput = document.getElementById('nav-account-invite-link' + idSuffix);
        if (copyBtn && linkInput) {
          copyBtn.addEventListener('click', function () {
            var done = function () { copyBtn.textContent = 'Copied'; setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2000); };
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(linkInput.value).then(done, function () { linkInput.select(); });
            } else {
              linkInput.select();
            }
          });
        }
      })
      .catch(function () {
        starsLoadedFor[idSuffix] = false;
        box.innerHTML = '';
      });
  }

  function refreshAccountControls() {
    ['', '-mobile'].forEach(function (idSuffix) {
      var root = document.getElementById('nav-account' + idSuffix);
      if (!root) return;
      var signedIn = window.GlotempAuth && window.GlotempAuth.isSignedIn();
      var btn = document.getElementById('nav-account-btn' + idSuffix);
      var menu = document.getElementById('nav-account-menu' + idSuffix);
      if (btn) btn.textContent = signedIn ? (accountLabel() || 'Account') : 'Sign in';
      if (menu && !signedIn) { menu.hidden = true; if (btn) btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  function wireAccountControl(idSuffix) {
    var btn = document.getElementById('nav-account-btn' + idSuffix);
    var menu = document.getElementById('nav-account-menu' + idSuffix);
    var signoutBtn = document.getElementById('nav-account-signout' + idSuffix);
    if (!btn || !menu || !signoutBtn) return;

    btn.addEventListener('click', function () {
      var signedIn = window.GlotempAuth && window.GlotempAuth.isSignedIn();
      if (!signedIn) {
        if (window.GlotempAuth) window.GlotempAuth.openModal('Sign in to Glotemp', 'signin');
        return;
      }
      var open = !menu.hidden;
      menu.hidden = open;
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (!open) loadAccountStars(idSuffix);
    });
    signoutBtn.addEventListener('click', function () {
      if (window.GlotempAuth) window.GlotempAuth.signOut();
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      // A different account may sign in next -- never carry over a
      // stale star count/invite link into their dropdown.
      starsLoadedFor[idSuffix] = false;
      var starsBox = document.getElementById('nav-account-stars' + idSuffix);
      if (starsBox) starsBox.innerHTML = '';
      refreshAccountControls();
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  var accountEventsWired = false;
  function wireAccountEvents() {
    if (accountEventsWired) return;
    accountEventsWired = true;
    document.addEventListener('glotemp:auth-changed', refreshAccountControls);
    // GlotempAuth's own init() (consuming a magic-link redirect, checking
    // an existing session) is async and may still be in flight when nav
    // renders -- poll briefly until it's defined, then do one refresh to
    // catch an already-signed-in returning visitor whose profile fetch
    // resolves without necessarily firing the change event in every path.
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      if (window.GlotempAuth) {
        refreshAccountControls();
        clearInterval(iv);
      } else if (attempts > 40) {
        clearInterval(iv); // ~10s -- give up quietly, stays "Sign in"
      }
    }, 250);
  }

  function render() {
    var mount = document.getElementById('site-nav');
    if (!mount) return;
    var active = mount.getAttribute('data-active') || detectActive();

    mount.className = 'navbar glass';
    mount.innerHTML =
      '<div class="nav-left">' +
        '<a href="/" class="nav-brand" aria-label="Glotemp home">' +
          '<img src="/assets/logo.png" alt="Glotemp" class="nav-logo">' +
        '</a>' +
        // The mantra. One line, every page, at every width -- it sits
        // between the mark and the hamburger on a phone, and between the
        // mark and the links on a desktop. It replaces the old
        // desktop-only tagline rather than joining it: two lines of
        // positioning copy in one bar is one too many.
        //
        // The line stands alone. Nothing precedes it.
        '<span class="nav-mantra">' +
          '<span class="nav-mantra-line">Control the pulse of your city&hellip;</span>' +
        '</span>' +
      '</div>' +
      '<div class="nav-links" id="nav-links-desktop">\n        ' +
        linksHTML(active) +
        accountControlHTML('') +
      '\n      </div>' +
      '<button id="nav-hamburger" class="nav-hamburger" aria-label="Open navigation" aria-expanded="false" aria-controls="nav-panel">' +
        '<span></span><span></span><span></span>' +
      '</button>';

    buildPanel(active);
    wireHamburger();
    wireAccountControl('');
    wireAccountControl('-mobile');
    wireAccountEvents();
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
      '\n      </nav>' +
      accountControlHTML('-mobile');
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
