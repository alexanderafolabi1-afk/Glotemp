// Glotemp city suggestions: the public "suggest a city" form at
// /suggest-city. Posts straight into city_applications -- a queue an
// admin reviews by hand (see admin/index.html's "City suggestions"
// panel). No auto-approval: this script's only job is to record the
// submission and say thank you. It never touches cities-data.js, and it
// never claims the city is live.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  async function onSubmit(e) {
    e.preventDefault();
    var status = document.getElementById('suggest-feedback');
    var btn = document.getElementById('suggest-submit');
    var cityName = document.getElementById('suggest-city-name').value.trim();
    var country = document.getElementById('suggest-country').value.trim();
    var email = document.getElementById('suggest-email').value.trim();
    var note = document.getElementById('suggest-note').value.trim();
    if (!cityName || !country || !email || btn.disabled) return;

    status.textContent = 'Sending...';
    btn.disabled = true;
    try {
      var resp = await fetch(SUPABASE_URL + '/rest/v1/city_applications', {
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
          city_name: cityName,
          country: country,
          contact_email: email,
          note: note || null,
        }),
      });
      if (!resp.ok) throw new Error('post failed ' + resp.status);
      status.textContent = 'Thank you -- a person will read this.';
      document.getElementById('city-suggest-form').reset();
    } catch (err) {
      status.textContent = "Couldn't send that just now -- try again shortly.";
    } finally {
      btn.disabled = false;
    }
  }

  function mount() {
    var form = document.getElementById('city-suggest-form');
    if (form) form.addEventListener('submit', onSubmit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
