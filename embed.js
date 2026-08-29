// Glotemp embeddable badge. Drop this on any page, anywhere:
//
//   <div class="glotemp-badge" data-glotemp-city="lanzarote"></div>
//   <script src="https://glo-temp.com/embed.js" async></script>
//
// Self-contained on purpose -- this runs on someone else's site, not
// this one, so it carries its own styles (scoped under one class so it
// cannot collide with the host page's CSS), fetches its own data, and
// depends on nothing else Glotemp ships. It reads the same city_mood
// table every city's own "City reading" section already shows, via the
// public, keyless /v1/badge/{slug} route on the api-v1 edge function --
// so a badge on someone else's site never disagrees with what that
// city's own Glotemp page says right now.
//
// A dial, not a card: this site already has enough rectangles. The ring
// itself is the reading -- how far it's swept round is the mood.
(function () {
  'use strict';

  var API = 'https://hnysztednzqfzbmiqqgl.supabase.co/functions/v1/api-v1/v1/badge/';
  var SITE = 'https://glo-temp.com';

  var BAND_COLOR = {
    charged: '#C86BE0',
    warm: '#F5A25A',
    equilibrium: '#F0E0C8',
    restrained: '#6BA8F5',
    low: '#4FD8E8',
  };
  var BAND_LABEL = {
    charged: 'Charged',
    warm: 'Warm',
    equilibrium: 'Equilibrium',
    restrained: 'Restrained',
    low: 'Low',
  };

  var STYLE_ID = 'glotemp-badge-style';
  var CSS = '' +
    '.glotemp-badge{display:inline-flex;align-items:center;gap:0.65rem;' +
    'padding:0.55rem 0.9rem 0.55rem 0.55rem;border-radius:999px;' +
    'background:#0B0A10;border:1px solid rgba(240,224,200,0.14);' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
    'text-decoration:none;max-width:290px;box-sizing:border-box;' +
    'transition:border-color 160ms ease,transform 160ms ease}' +
    '.glotemp-badge:hover{border-color:rgba(240,224,200,0.34);transform:translateY(-1px)}' +
    '.glotemp-badge__dial{flex:0 0 auto;display:block}' +
    '.glotemp-badge__text{display:flex;flex-direction:column;gap:0.08rem;min-width:0}' +
    '.glotemp-badge__city{color:#F0E0C8;font-size:0.86rem;font-weight:600;' +
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}' +
    '.glotemp-badge__reading{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;' +
    'font-size:0.72rem;letter-spacing:0.02em;line-height:1.3}' +
    '.glotemp-badge__mark{color:#B08D57;font-size:0.62rem;letter-spacing:0.08em;' +
    'text-transform:uppercase;margin-top:0.12rem;line-height:1}' +
    '.glotemp-badge--loading .glotemp-badge__city{color:rgba(240,224,200,0.5)}' +
    '.glotemp-badge--error{opacity:0.55}';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // A ring, not a bar: circumference swept in proportion to mood/10, so
  // "how charged this city is right now" is a shape, not just a number.
  function dialSVG(mood, color) {
    var r = 15;
    var c = 2 * Math.PI * r;
    var frac = Math.max(0, Math.min(1, (mood || 0) / 10));
    var dash = (frac * c).toFixed(1) + ' ' + c.toFixed(1);
    return '<svg class="glotemp-badge__dial" width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">' +
      '<circle cx="19" cy="19" r="' + r + '" fill="none" stroke="rgba(240,224,200,0.14)" stroke-width="3"/>' +
      '<circle cx="19" cy="19" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="3" ' +
      'stroke-linecap="round" stroke-dasharray="' + dash + '" transform="rotate(-90 19 19)"/>' +
      '<text x="19" y="23" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" ' +
      'font-size="10.5" fill="' + color + '">' + (mood != null ? mood.toFixed(1) : '--') + '</text>' +
      '</svg>';
  }

  function render(el, state, data) {
    el.className = 'glotemp-badge' + (state === 'loading' ? ' glotemp-badge--loading' : '') +
      (state === 'error' ? ' glotemp-badge--error' : '');

    if (state === 'error') {
      el.innerHTML = '<span class="glotemp-badge__text"><span class="glotemp-badge__city">Glotemp</span>' +
        '<span class="glotemp-badge__reading">reading unavailable</span></span>';
      return;
    }
    if (state === 'loading') {
      el.innerHTML = dialSVG(null, '#B08D57') +
        '<span class="glotemp-badge__text"><span class="glotemp-badge__city">' + esc(data.name) + '</span>' +
        '<span class="glotemp-badge__reading">reading…</span></span>';
      return;
    }

    var color = BAND_COLOR[data.band] || '#F0E0C8';
    var label = BAND_LABEL[data.band] || data.band;
    el.innerHTML = dialSVG(data.mood, color) +
      '<span class="glotemp-badge__text">' +
        '<span class="glotemp-badge__city">' + esc(data.name) + '</span>' +
        '<span class="glotemp-badge__reading" style="color:' + color + ';">' + esc(label) + ' &middot; ' + data.mood.toFixed(1) + '/10</span>' +
        '<span class="glotemp-badge__mark">Glotemp &middot; live</span>' +
      '</span>';
  }

  function titleCase(slug) {
    return String(slug || '').split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  function mountOne(el) {
    var slug = el.getAttribute('data-glotemp-city');
    if (!slug || el.getAttribute('data-glotemp-mounted') === '1') return;
    el.setAttribute('data-glotemp-mounted', '1');

    var a = document.createElement('a');
    a.href = SITE + '/cities/' + encodeURIComponent(slug) + '.html';
    a.target = '_blank';
    a.rel = 'noopener';
    render(a, 'loading', { name: titleCase(slug) });
    el.appendChild(a);

    fetch(API + encodeURIComponent(slug))
      .then(function (resp) { return resp.ok ? resp.json() : Promise.reject(resp.status); })
      .then(function (data) {
        render(a, 'ok', {
          // The real curated name from city_mood, not a guessed
          // title-case of the slug -- "nyc" should read "New York", not
          // "Nyc". Falls back to title-case only if a name is somehow
          // missing, which real rows never are.
          name: data.name || titleCase(data.city),
          band: data.band,
          mood: data.mood,
        });
      })
      .catch(function () {
        render(a, 'error', {});
      });
  }

  function mountAll() {
    ensureStyle();
    var nodes = document.querySelectorAll('[data-glotemp-city]');
    for (var i = 0; i < nodes.length; i++) mountOne(nodes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }

  // A late-added embed (e.g. a CMS that renders its body after this
  // script already ran) still gets picked up on demand.
  window.GlotempEmbed = { mount: mountAll };
})();
