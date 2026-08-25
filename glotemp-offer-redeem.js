// Glotemp partner redemption check: the whole "partner page" behind
// requirement 4. No login -- a partner's staff have no Glotemp account,
// so this calls redeem_offer_code() with the anon key. That RPC is
// security definer and returns only a status, never a user identity or
// any other code, so this page can never be used to browse unlocks.
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  var RESULT_TEXT = {
    valid: { text: 'Valid. Redeemed just now.', cls: 'is-valid' },
    already_used: { text: 'Already used.', cls: 'is-used' },
    not_found: { text: 'Not a real code.', cls: 'is-invalid' },
  };

  async function onSubmit(e) {
    e.preventDefault();
    var input = document.getElementById('redeem-code-input');
    var btn = document.getElementById('redeem-submit');
    var result = document.getElementById('redeem-result');
    var code = input.value.trim();
    if (!code || btn.disabled) return;

    btn.disabled = true;
    result.hidden = true;
    try {
      var resp = await fetch(SUPABASE_URL + '/rest/v1/rpc/redeem_offer_code', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_code: code }),
      });
      if (!resp.ok) throw new Error('rpc failed ' + resp.status);
      var data = await resp.json();
      var shown = RESULT_TEXT[data.status] || RESULT_TEXT.not_found;
      result.className = 'redeem-result ' + shown.cls;
      result.textContent = shown.text;
      result.hidden = false;
    } catch (err) {
      result.className = 'redeem-result is-invalid';
      result.textContent = "Couldn't check that just now. Try again.";
      result.hidden = false;
    } finally {
      btn.disabled = false;
    }
  }

  function mount() {
    var form = document.getElementById('redeem-form');
    if (form) form.addEventListener('submit', onSubmit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
