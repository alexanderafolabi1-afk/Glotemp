// Glotemp Slots: a quiet, optional 0-3 name list for real operators, on
// /cities/<slug>/food/ ("On the table") and /cities/<slug>/pulse/
// ("Staying here" -- standing in for a tonight vertical that doesn't
// exist as its own city page). Reads partners/slots.json client-side; a
// city/slot with no entries mounts nothing at all: no empty state, no
// zero, no "be the first". Same shape as glotemp-offers.js's "renders
// nothing when there's nothing" rule.
(function () {
  'use strict';

  var HEADING = { food: 'On the table', tonight: 'Staying here' };
  var KIND_LABEL = { house: 'House', window: 'Window', partner: 'Partner' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function entryHTML(entry) {
    // Only http(s): an operator-supplied URL could hold anything, including
    // javascript:. Matches city-venues.js's safeSite pattern exactly.
    var safeUrl = entry.url && /^https?:\/\//i.test(entry.url) ? entry.url : '';
    var name = safeUrl
      ? '<a href="' + esc(safeUrl) + '" target="_blank" rel="noopener noreferrer" class="contact-link">' + esc(entry.name) + '</a>'
      : esc(entry.name);
    var kind = entry.kind && KIND_LABEL[entry.kind] ? ' &middot; ' + KIND_LABEL[entry.kind] : '';
    return '<li><strong>' + name + '</strong> ' + esc(entry.line || '') + kind + '</li>';
  }

  var slotsPromise = null;
  function loadSlots() {
    if (!slotsPromise) {
      slotsPromise = fetch('/partners/slots.json')
        .then(function (resp) { return resp.ok ? resp.json() : null; })
        .catch(function () { return null; });
    }
    return slotsPromise;
  }

  async function mountSlot(el) {
    var city = el.getAttribute('data-city');
    var slot = el.getAttribute('data-slot');
    if (!city || !slot) return;
    var data = await loadSlots();
    var entries = data && data[city] && Array.isArray(data[city][slot]) ? data[city][slot].slice(0, 3) : [];
    if (!entries.length) return; // stays [hidden] -- no empty state, no gap
    el.innerHTML =
      '<h2>' + esc(HEADING[slot] || '') + '</h2>' +
      '<ul class="about-list">' + entries.map(entryHTML).join('') + '</ul>';
    el.hidden = false;
  }

  function mount() {
    document.querySelectorAll('.slot-panel[data-city][data-slot]').forEach(mountSlot);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
