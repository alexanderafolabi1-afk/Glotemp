// Glotemp creator drop submission: the public "attach your real work to
// a city" form at /creators. Posts straight into
// creator_drop_submissions -- an admin reviews it by hand, same shape as
// partner-enquiry.js and city_applications. No auto-listing: a real
// creator_drops row is a separate, later, manual step. This script's
// only job is to record the submission and say thank you.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  function prefillCity() {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('city');
    if (!slug) return;
    var input = document.getElementById('creator-city');
    if (!input) return;
    var city = (window.CITIES_DATA || []).find(function (c) { return c.slug === slug; });
    input.value = city ? city.name : slug;
  }

  function populateCityList() {
    var list = document.getElementById('creator-city-list');
    if (!list || !window.CITIES_DATA) return;
    window.CITIES_DATA.filter(function (c) { return c.available !== false; }).forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.name;
      list.appendChild(opt);
    });
  }

  function citySlugFromInput(value) {
    var trimmed = value.trim().toLowerCase();
    var match = (window.CITIES_DATA || []).find(function (c) { return c.name.toLowerCase() === trimmed; });
    return match ? match.slug : null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    var status = document.getElementById('creator-feedback');
    var btn = document.getElementById('creator-submit');
    var creatorName = document.getElementById('creator-name').value.trim();
    var creatorUrl = document.getElementById('creator-url').value.trim();
    var cityValue = document.getElementById('creator-city').value.trim();
    var contentType = document.getElementById('creator-content-type').value;
    var contentUrl = document.getElementById('creator-content-url').value.trim();
    var startsAt = document.getElementById('creator-starts-at').value || null;
    var endsAt = document.getElementById('creator-ends-at').value || null;
    var email = document.getElementById('creator-email').value.trim();
    var note = document.getElementById('creator-note').value.trim();
    if (!creatorName || !creatorUrl || !cityValue || !contentUrl || !email || btn.disabled) return;

    status.textContent = 'Sending...';
    btn.disabled = true;
    try {
      var resp = await fetch(SUPABASE_URL + '/rest/v1/creator_drop_submissions', {
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
          creator_name: creatorName,
          creator_url: creatorUrl,
          city_slug: citySlugFromInput(cityValue),
          city_as_entered: cityValue,
          content_type: contentType,
          content_url: contentUrl,
          proposed_starts_at: startsAt,
          proposed_ends_at: endsAt,
          contact_email: email,
          note: note || null,
        }),
      });
      if (!resp.ok) throw new Error('post failed ' + resp.status);
      status.textContent = 'Thank you -- a person will read this.';
      document.getElementById('creator-drop-form').reset();
    } catch (err) {
      status.textContent = "Couldn't send that just now -- try again shortly.";
    } finally {
      btn.disabled = false;
    }
  }

  function mount() {
    prefillCity();
    populateCityList();
    var form = document.getElementById('creator-drop-form');
    if (form) form.addEventListener('submit', onSubmit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
