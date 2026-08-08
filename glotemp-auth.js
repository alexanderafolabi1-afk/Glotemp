// Glotemp Auth: Supabase Auth (GoTrue) against the REST endpoints directly.
//
// No CDN client library on purpose -- this site is plain classic <script>
// tags with no bundler, and the one third-party CDN script it does load
// (twemoji) is decorative. Auth is not something to make dependent on a
// third-party CDN being reachable, so this talks to /auth/v1/* itself.
//
// Providers: Google and Apple are primary, email magic-link is secondary.
// Those three and nothing else. Note that Google/Apple must also be
// enabled with client credentials in the Supabase dashboard
// (Authentication -> Providers) -- that is project config, not code, and
// cannot be committed here.
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

  // ---------- OAuth redirect handling ----------
  // GoTrue returns tokens in the URL fragment. Consume and scrub them so
  // the access token never lingers in the address bar or in history.
  async function consumeRedirect() {
    if (!window.location.hash || window.location.hash.indexOf('access_token=') === -1) return false;
    const params = new URLSearchParams(window.location.hash.slice(1));
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
    const redirectTo = encodeURIComponent(window.location.href.split('#')[0]);
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirectTo}`;
  }

  async function signInWithEmail(email) {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: window.location.href.split('#')[0] } }),
    });
    if (!resp.ok) throw new Error('email sign-in failed: ' + resp.status);
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
          <p class="gt-auth-copy" id="gt-auth-reason">Browsing stays anonymous. Signing in is only needed to check in, comment, or watch a city.</p>
          <div class="gt-auth-providers">
            <button class="gt-auth-provider" type="button" data-provider="google">Continue with Google</button>
            <button class="gt-auth-provider" type="button" data-provider="apple">Continue with Apple</button>
          </div>
          <div class="gt-auth-divider"><span>or</span></div>
          <form class="gt-auth-email-form" id="gt-auth-email-form">
            <label class="gt-auth-label" for="gt-auth-email">Email</label>
            <input class="gt-auth-input" type="email" id="gt-auth-email" placeholder="you@example.com" required autocomplete="email">
            <button class="btn-neon gt-auth-submit" type="submit">Email me a sign-in link</button>
          </form>
          <p class="gt-auth-status" id="gt-auth-status" role="status" aria-live="polite"></p>
        </div>
        <div data-step="profile" hidden>
          <p class="eyebrow">One last thing</p>
          <h2 class="gt-auth-title">Set up your profile</h2>
          <p class="gt-auth-copy">This is how your check-ins appear to everyone else.</p>
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

    modalEl.querySelectorAll('.gt-auth-provider').forEach(btn => {
      btn.addEventListener('click', () => signInWithOAuth(btn.getAttribute('data-provider')));
    });

    modalEl.querySelector('#gt-auth-email-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = modalEl.querySelector('#gt-auth-status');
      const email = modalEl.querySelector('#gt-auth-email').value.trim();
      if (!email) return;
      statusEl.textContent = 'Sending…';
      try {
        await signInWithEmail(email);
        statusEl.textContent = 'Check your inbox for a sign-in link.';
      } catch (err) {
        statusEl.textContent = 'Could not send that link. Try again shortly.';
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
      opt.textContent = `${c.name} — ${c.country}`;
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
    const focusTarget = modalEl.querySelector(step === 'profile' ? '#gt-auth-display-name' : '.gt-auth-provider');
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
        openModal('Tell us who you are so your check-ins have a name.', 'profile');
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
    signInWithEmail,
    signOut,
    requireAuth,
    openModal,
    closeModal,
  };
})();
