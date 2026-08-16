// Glotemp Auth: Supabase Auth (GoTrue) against the REST endpoints directly.
//
// No CDN client library on purpose -- this site is plain classic <script>
// tags with no bundler, and the one third-party CDN script it does load
// (twemoji) is decorative. Auth is not something to make dependent on a
// third-party CDN being reachable, so this talks to /auth/v1/* itself.
//
// Email magic-link only. Google and Apple OAuth used to be offered here
// too, but both require a client ID/secret configured in the Supabase
// dashboard (Authentication -> Providers) -- project config, not code,
// that was never actually done. Signing in with either produced a raw
// GoTrue "Unsupported provider" error page instead of a check-in. Email
// OTP needs no such per-provider setup, so it is the one path offered
// until OAuth is properly configured server-side. signInWithOAuth is
// kept below for that day, just not wired to any button.
(function () {
  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  const SESSION_KEY = 'glotemp-auth-session';
  const PROFILE_KEY = 'glotemp-auth-profile';

  let cachedProfile = null;
  let modalEl = null;
  let pendingResolve = null;

  // ---------- session storage ----------
  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeSession(session) {
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* storage unavailable -- session stays in-memory only */ }
  }

  function isExpired(session) {
    if (!session || !session.expires_at) return true;
    // 60s skew so a token that dies mid-request refreshes first.
    return Date.now() > (session.expires_at * 1000) - 60000;
  }

  async function refreshSession(session) {
    if (!session || !session.refresh_token) return null;
    try {
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      const next = normalizeSession(data);
      writeSession(next);
      return next;
    } catch (e) {
      return null;
    }
  }

  function normalizeSession(data) {
    if (!data || !data.access_token) return null;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      user: data.user || null,
    };
  }

  // Returns a valid session or null. Refreshes transparently.
  async function getSession() {
    let session = readSession();
    if (!session) return null;
    if (isExpired(session)) {
      session = await refreshSession(session);
      if (!session) {
        writeSession(null);
        cachedProfile = null;
        return null;
      }
    }
    return session;
  }

  function isSignedIn() {
    const s = readSession();
    return !!(s && s.access_token);
  }

  // ---------- OAuth / email-link redirect handling ----------
  // GoTrue's /verify endpoint lands the browser back here in one of two
  // shapes, and this page has to handle both:
  //
  //   1. Implicit flow: finished tokens in the URL FRAGMENT
  //      (#access_token=...&refresh_token=...). Consume and scrub them so
  //      the access token never lingers in the address bar or in history.
  //
  //   2. Verify-link flow: a #token_hash= / #type= pair in the fragment
  //      instead of finished tokens (current Supabase/GoTrue default for
  //      confirmation and magic-link emails). GoTrue did the actual token
  //      verification server-side already -- what lands here is a second,
  //      short-lived credential that this page has to exchange itself with
  //      one more call to /auth/v1/verify. Previously this page only ever
  //      checked for `access_token=`, so a token_hash-shaped link matched
  //      neither branch and consumeRedirect() returned false immediately --
  //      the page would sit on "Confirming..." until the 3s poll in
  //      auth/confirm/index.html gave up, which is exactly what "I click
  //      verify and nothing happens" looks like from the outside.
  async function consumeRedirect() {
    if (!window.location.hash) return false;
    const params = new URLSearchParams(window.location.hash.slice(1));

    if (params.has('access_token')) {
      const session = normalizeSession({
        access_token: params.get('access_token'),
        refresh_token: params.get('refresh_token'),
        expires_in: Number(params.get('expires_in')) || 3600,
      });
      if (!session) return false;
      writeSession(session);
      history.replaceState(null, '', window.location.pathname + window.location.search);
      // Fetch the user record so first-sign-in profile capture has an email.
      await fetchUser();
      return true;
    }

    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    if (tokenHash && type) {
      try {
        const resp = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, token_hash: tokenHash }),
        });
        if (!resp.ok) return false;
        const session = normalizeSession(await resp.json());
        if (!session) return false;
        writeSession(session);
        history.replaceState(null, '', window.location.pathname + window.location.search);
        await fetchUser();
        return true;
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  async function fetchUser() {
    const session = await getSession();
    if (!session) return null;
    try {
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) return null;
      const user = await resp.json();
      session.user = user;
      writeSession(session);
      return user;
    } catch (e) {
      return null;
    }
  }

  function getUser() {
    const s = readSession();
    return s ? s.user : null;
  }

  // ---------- profile ----------
  async function fetchProfile() {
    const session = await getSession();
    if (!session) return null;
    const user = session.user || (await fetchUser());
    if (!user || !user.id) return null;
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_id,display_name,home_city,created_at`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' } }
      );
      // A transient failure is NOT evidence that the user has no profile.
      // Fall back to whatever is cached, or the caller (and init()) would
      // re-prompt an already-onboarded user for their profile every time
      // the network hiccups.
      if (!resp.ok) return getCachedProfile();
      const rows = await resp.json();
      if (rows && rows.length) {
        cachedProfile = rows[0];
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(cachedProfile)); } catch (e) { /* non-fatal */ }
        return cachedProfile;
      }
      // Response was OK and empty: the server is telling us definitively
      // that no profile row exists yet. Only here is clearing correct.
      cachedProfile = null;
      try { localStorage.removeItem(PROFILE_KEY); } catch (e) { /* non-fatal */ }
      return null;
    } catch (e) {
      return getCachedProfile();
    }
  }

  function getCachedProfile() {
    if (cachedProfile) return cachedProfile;
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      cachedProfile = raw ? JSON.parse(raw) : null;
    } catch (e) {
      cachedProfile = null;
    }
    return cachedProfile;
  }

  async function saveProfile(displayName, homeCity) {
    const session = await getSession();
    if (!session) throw new Error('not signed in');
    const user = session.user || (await fetchUser());
    if (!user) throw new Error('no user');
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({ user_id: user.id, display_name: displayName, home_city: homeCity }),
    });
    if (!resp.ok) throw new Error('profile save failed: ' + resp.status);
    const rows = await resp.json();
    cachedProfile = rows && rows.length ? rows[0] : { user_id: user.id, display_name: displayName, home_city: homeCity };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(cachedProfile)); } catch (e) { /* non-fatal */ }
    return cachedProfile;
  }

  // ---------- sign in / out ----------
  function signInWithOAuth(provider) {
    // Same rule as the email link: the provider must return to a host that
    // exists in production, not whatever origin this page happens to be
    // served from.
    rememberReturn();
    const redirectTo = encodeURIComponent(confirmRedirectURL());
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirectTo}`;
  }

  // Where the confirmation link must land. Always the production origin --
  // never window.location.origin, which on a preview deploy or a local
  // server would put an unreachable host into a link sent to a real inbox.
  const SITE_ORIGIN = 'https://glo-temp.com';
  const CONFIRM_PATH = '/auth/confirm/';
  const RETURN_KEY = 'glotemp-auth-return';

  function confirmRedirectURL() {
    return SITE_ORIGIN + CONFIRM_PATH;
  }

  // Remember what the visitor was doing so the confirmation page can put
  // them back there instead of dumping them on the homepage.
  function rememberReturn() {
    try {
      const here = window.location.pathname + window.location.search + window.location.hash;
      // Only same-site paths, and never the confirm page itself.
      if (here.indexOf('//') === 0 || here.indexOf(CONFIRM_PATH) === 0) return;
      localStorage.setItem(RETURN_KEY, here);
    } catch (e) { /* private mode -- the confirm page falls back to '/' */ }
  }

  async function signInWithEmail(email) {
    rememberReturn();

    // The redirect target goes in BOTH the query string and the body.
    //
    // This is the localhost bug. The previous call passed
    // `options: { email_redirect_to }`, which is the supabase-js client's
    // shape, NOT the GoTrue REST API's -- the REST endpoint reads
    // `redirect_to` (query param, or top-level body field) and silently
    // ignores an unknown `options` object. With no redirect it could
    // recognise, GoTrue fell back to the project's Site URL, which is
    // http://localhost:3000 by default. That is why every confirmation
    // link in every real inbox pointed at a host the recipient cannot
    // reach. Sending it both ways works whichever GoTrue version is
    // deployed, and neither form is an error to the other.
    const redirect = confirmRedirectURL();
    const url = `${SUPABASE_URL}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, create_user: true, redirect_to: redirect }),
    });
    if (!resp.ok) {
      // A rate-limit response here almost always means an earlier request
      // for the same email already went through server-side (most often a
      // double tap on the submit button, or a slow connection making a
      // visitor tap again before anything on screen changed) -- GoTrue's
      // per-address send limit is what's blocking the SECOND request, not
      // evidence that no email was ever sent. Surfacing that distinction
      // to the caller means the UI can tell the truth instead of reporting
      // a hard failure while an email is genuinely on its way.
      let code = null;
      try { code = (await resp.json()).error_code || null; } catch (e) { /* no JSON body */ }
      const err = new Error('email sign-in failed: ' + resp.status);
      err.rateLimited = resp.status === 429 || code === 'over_email_send_rate_limit';
      throw err;
    }
    return true;
  }

  // Email and password. Used by /admin only; the public sign-in box on
  // the rest of the site is unchanged and still uses the magic link
  // above. This exists because the admin has to be reachable when email
  // is not, and Supabase's built-in sender does not reliably deliver.
  async function signInWithPassword(email, password) {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    });
    if (!resp.ok) {
      let body = {};
      try { body = await resp.json(); } catch (e) { /* no JSON body */ }
      const code = body.error_code || body.error || '';
      const msg = body.msg || body.error_description || '';
      const err = new Error(msg || 'sign-in failed: ' + resp.status);
      // GoTrue's own wording explains nothing, so it is translated here.
      if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) {
        err.friendly = 'That email and password do not match an account.';
      } else if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) {
        err.friendly = 'That account has not been confirmed yet. Confirm it in the Supabase dashboard.';
      } else if (code === 'email_provider_disabled' || /email logins are disabled/i.test(msg)) {
        err.friendly = 'Email and password sign-in is switched off for this project. Turn it on in Supabase, under Authentication, Sign In / Providers, Email.';
      } else if (resp.status === 429) {
        err.friendly = 'Too many attempts. Wait a minute and try again.';
      } else {
        // Never swallow a reason we do not recognise. "Try again shortly"
        // sent someone chasing a problem that was never going to clear on
        // its own, so whatever the server actually said is shown instead.
        err.friendly = msg
          ? msg + ' (' + resp.status + (code ? ', ' + code : '') + ')'
          : 'Sign-in failed with status ' + resp.status + '. Nothing more was returned.';
      }
      throw err;
    }
    const session = normalizeSession(await resp.json());
    if (!session) throw new Error('no session returned');
    writeSession(session);
    cachedProfile = null;
    document.dispatchEvent(new CustomEvent('glotemp:auth-changed', { detail: { signedIn: true } }));
    return session;
  }

  // Change the signed-in user's own password. GoTrue takes this on the
  // user endpoint with the caller's own access token, so it can only ever
  // change the password of whoever is signed in.
  async function updatePassword(newPassword) {
    const session = await getSession();
    if (!session) {
      const err = new Error('not signed in');
      err.friendly = 'You are not signed in.';
      throw err;
    }
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!resp.ok) {
      let body = {};
      try { body = await resp.json(); } catch (e) { /* no JSON body */ }
      const code = body.error_code || body.error || '';
      const msg = body.msg || body.error_description || '';
      const err = new Error(msg || 'password change failed: ' + resp.status);
      if (code === 'weak_password' || /password should be at least/i.test(msg)) {
        err.friendly = msg || 'That password is too short.';
      } else if (code === 'same_password' || /should be different/i.test(msg)) {
        err.friendly = 'That is the password you already have.';
      } else {
        // Same rule as sign-in: show what the server said rather than a
        // reassurance that hides a problem which will not clear itself.
        err.friendly = msg
          ? msg + ' (' + resp.status + (code ? ', ' + code : '') + ')'
          : 'Password change failed with status ' + resp.status + '.';
      }
      throw err;
    }
    return true;
  }

  function signOut() {
    writeSession(null);
    cachedProfile = null;
    try { localStorage.removeItem(PROFILE_KEY); } catch (e) { /* non-fatal */ }
    document.dispatchEvent(new CustomEvent('glotemp:auth-changed', { detail: { signedIn: false } }));
  }

  // ---------- modal ----------
  function buildModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'gt-auth-overlay';
    modalEl.id = 'gt-auth-overlay';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-label', 'Sign in to Glotemp');
    modalEl.hidden = true;
    modalEl.innerHTML = `
      <div class="gt-auth-modal" role="document">
        <button class="gt-auth-close" type="button" aria-label="Close sign in">&#10005;</button>
        <div data-step="signin">
          <p class="eyebrow">Glotemp</p>
          <h2 class="gt-auth-title">Sign in to add your signal</h2>
          <p class="gt-auth-copy" id="gt-auth-reason">Browsing stays anonymous. Signing in is only needed to add a reading, comment, or follow a city.</p>
          <form class="gt-auth-email-form" id="gt-auth-email-form">
            <label class="gt-auth-label" for="gt-auth-email">Email</label>
            <input class="gt-auth-input" type="email" id="gt-auth-email" placeholder="you@example.com" required autocomplete="email">
            <button class="btn-neon gt-auth-submit" type="submit">Email me a sign-in link</button>
          </form>
          <p class="gt-auth-status" id="gt-auth-status" role="status" aria-live="polite"></p>
          <p class="gt-auth-copy gt-auth-microcopy">No password to remember -- we'll email you a one-time link, valid for this browser.</p>
        </div>
        <div data-step="profile" hidden>
          <p class="eyebrow">One last thing</p>
          <h2 class="gt-auth-title">Set up your profile</h2>
          <p class="gt-auth-copy">This is how your readings appear to everyone else.</p>
          <form class="gt-auth-email-form" id="gt-auth-profile-form">
            <label class="gt-auth-label" for="gt-auth-display-name">Display name</label>
            <input class="gt-auth-input" type="text" id="gt-auth-display-name" maxlength="60" required autocomplete="nickname">
            <label class="gt-auth-label" for="gt-auth-home-city">Home city</label>
            <select class="gt-auth-input" id="gt-auth-home-city" required>
              <option value="">Select your home city…</option>
            </select>
            <button class="btn-neon gt-auth-submit" type="submit">Finish</button>
          </form>
          <p class="gt-auth-status" id="gt-auth-profile-status" role="status" aria-live="polite"></p>
        </div>
      </div>`;
    document.body.appendChild(modalEl);

    modalEl.querySelector('.gt-auth-close').addEventListener('click', () => closeModal(false));
    modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeModal(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modalEl.hidden) closeModal(false);
    });

    modalEl.querySelector('#gt-auth-email-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = modalEl.querySelector('#gt-auth-status');
      const submitBtn = modalEl.querySelector('.gt-auth-submit');
      const email = modalEl.querySelector('#gt-auth-email').value.trim();
      if (!email || submitBtn.disabled) return;
      statusEl.textContent = 'Sending…';
      submitBtn.disabled = true;
      try {
        await signInWithEmail(email);
        statusEl.textContent = 'Check your inbox for a sign-in link.';
      } catch (err) {
        statusEl.textContent = err && err.rateLimited
          ? "A link is already on its way to that address -- check your inbox (it can take a minute to arrive)."
          : 'Could not send that link. Try again shortly.';
      } finally {
        submitBtn.disabled = false;
      }
    });

    modalEl.querySelector('#gt-auth-profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = modalEl.querySelector('#gt-auth-profile-status');
      const name = modalEl.querySelector('#gt-auth-display-name').value.trim();
      const city = modalEl.querySelector('#gt-auth-home-city').value;
      if (!name || !city) {
        statusEl.textContent = 'Both fields are required.';
        return;
      }
      statusEl.textContent = 'Saving…';
      try {
        await saveProfile(name, city);
        statusEl.textContent = '';
        closeModal(true);
        document.dispatchEvent(new CustomEvent('glotemp:auth-changed', { detail: { signedIn: true } }));
      } catch (err) {
        statusEl.textContent = 'Could not save that. Try again shortly.';
      }
    });

    return modalEl;
  }

  function populateHomeCityOptions() {
    const sel = modalEl && modalEl.querySelector('#gt-auth-home-city');
    if (!sel || sel.dataset.populated === '1') return;
    const cities = (window.CITIES_DATA || []).filter(c => c.available !== false)
      .slice().sort((a, b) => a.name.localeCompare(b.name));
    cities.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.slug;
      opt.textContent = `${c.name} - ${c.country}`;
      sel.appendChild(opt);
    });
    if (cities.length) sel.dataset.populated = '1';
  }

  function showStep(step) {
    if (!modalEl) return;
    modalEl.querySelectorAll('[data-step]').forEach(el => {
      el.hidden = el.getAttribute('data-step') !== step;
    });
  }

  function openModal(reason, step) {
    buildModal();
    populateHomeCityOptions();
    if (reason) {
      const reasonEl = modalEl.querySelector('#gt-auth-reason');
      if (reasonEl) reasonEl.textContent = reason;
    }
    showStep(step || 'signin');
    modalEl.hidden = false;
    document.body.style.overflow = 'hidden';
    const focusTarget = modalEl.querySelector(step === 'profile' ? '#gt-auth-display-name' : '#gt-auth-email');
    if (focusTarget) focusTarget.focus();
  }

  function closeModal(success) {
    if (!modalEl) return;
    modalEl.hidden = true;
    document.body.style.overflow = '';
    if (pendingResolve) {
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve(!!success);
    }
  }

  // Gate for any write action. Resolves true only when the user ends up
  // signed in AND has a profile; false if they dismissed the modal.
  // Browsing never calls this -- it is only invoked on comment / check-in
  // / watch.
  async function requireAuth(reason) {
    if (isSignedIn()) {
      const profile = getCachedProfile() || (await fetchProfile());
      if (profile) return true;
      // Signed in but no profile yet -- first sign-in capture.
      return new Promise((resolve) => {
        pendingResolve = resolve;
        openModal(reason, 'profile');
      });
    }
    return new Promise((resolve) => {
      pendingResolve = resolve;
      openModal(reason, 'signin');
    });
  }

  // On load: consume an OAuth/magic-link redirect if present, then if the
  // user is signed in without a profile, prompt for it immediately.
  async function init() {
    await consumeRedirect();
    if (isSignedIn()) {
      const profile = await fetchProfile();
      if (!profile) {
        openModal('Tell us who you are so your readings have a name.', 'profile');
      } else {
        // Announce a resolved signed-in state on every load, not only
        // after an OAuth return. Other modules (the check-in composer)
        // mount synchronously on DOMContentLoaded, before this async
        // profile fetch settles, so without this event they would stay
        // stuck rendering their signed-out state for an already
        // signed-in user.
        document.dispatchEvent(new CustomEvent('glotemp:auth-changed', { detail: { signedIn: true } }));
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GlotempAuth = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    getSession,
    isSignedIn,
    getUser,
    fetchProfile,
    getCachedProfile,
    saveProfile,
    signInWithOAuth,
    confirmRedirectURL,
    takeReturnPath: function () {
      try {
        const v = localStorage.getItem(RETURN_KEY);
        localStorage.removeItem(RETURN_KEY);
        return v || '/';
      } catch (e) { return '/'; }
    },
    signInWithEmail,
    signInWithPassword,
    updatePassword,
    signOut,
    requireAuth,
    openModal,
    closeModal,
  };
})();
