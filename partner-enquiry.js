// Glotemp partner enquiry: the public "offer something to this city" form
// at /partners, linked from the foot of every Offers Panel. Posts straight
// into partner_leads -- an admin reviews it by hand, same shape as
// city-suggestions.js and city_applications. No auto-listing: this
// script's only job is to record the enquiry and say thank you.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  function prefillCity() {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('city');
    if (!slug) return;
    var input = document.getElementById('partner-city');
    if (!input) return;
    var city = (window.CITIES_DATA || []).find(function (c) { return c.slug === slug; });
    input.value = city ? city.name : slug;
  }

  function populateCityList() {
    var list = document.getElementById('partner-city-list');
    if (!list || !window.CITIES_DATA) return;
    window.CITIES_DATA.filter(function (c) { return c.available !== false; }).forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.name;
      list.appendChild(opt);
    });
  }

  function populateVerticalSelect() {
    var select = document.getElementById('partner-vertical');
    if (!select || !window.GlotempVerticalStyle) return;
    window.GlotempVerticalStyle.VERTICALS.forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v;
      opt.textContent = window.GlotempVerticalStyle.LABEL[v];
      select.appendChild(opt);
    });
  }

  function citySlugFromInput(value) {
    var trimmed = value.trim().toLowerCase();
    var match = (window.CITIES_DATA || []).find(function (c) { return c.name.toLowerCase() === trimmed; });
    return match ? match.slug : null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    var status = document.getElementById('partner-feedback');
    var btn = document.getElementById('partner-submit');
    var businessName = document.getElementById('partner-business-name').value.trim();
    var cityValue = document.getElementById('partner-city').value.trim();
    var vertical = document.getElementById('partner-vertical').value || null;
    var email = document.getElementById('partner-email').value.trim();
    var note = document.getElementById('partner-note').value.trim();
    if (!businessName || !cityValue || !email || btn.disabled) return;

    status.textContent = 'Sending...';
    btn.disabled = true;
    try {
      var resp = await fetch(SUPABASE_URL + '/rest/v1/partner_leads', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          // Anon can insert but not read back -- RLS is intentionally
          // one-directional here, so this must not ask for the row.
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          business_name: businessName,
          city_slug: citySlugFromInput(cityValue),
          vertical: vertical,
          contact_email: email,
          note: (note ? note + '\n\n' : '') + 'City as entered: ' + cityValue,
        }),
      });
      if (!resp.ok) throw new Error('post failed ' + resp.status);
      status.textContent = 'Thank you -- a person will read this.';
      document.getElementById('partner-lead-form').reset();
    } catch (err) {
      status.textContent = "Couldn't send that just now -- try again shortly.";
    } finally {
      btn.disabled = false;
    }
  }

  function mount() {
    prefillCity();
    populateCityList();
    populateVerticalSelect();
    var form = document.getElementById('partner-lead-form');
    if (form) form.addEventListener('submit', onSubmit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
