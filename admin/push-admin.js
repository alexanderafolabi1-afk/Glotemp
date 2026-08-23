// Glotemp Admin: push notifications TO the admin/owner.
//
// Same permission-request-on-explicit-click rule as the consumer version
// (push-notifications.js): Notification.requestPermission() is only ever
// called from inside a click handler on the toggle button below, never
// on page load or on any other timer.
//
// The admin page loads no app.js and so has never registered a service
// worker at all until now -- registration here (below) is the minimal
// slice of what app.js does for the public site, just enough for a
// PushManager to exist on this scope, not its full update/reload
// management machinery, which this page does not need.
(function () {
  'use strict';

  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  // Same keypair push-notifications.js and push-send/push-admin-send use
  // -- VAPID identifies the server, not the subscriber.
  const VAPID_PUBLIC_KEY = 'BG1M909CorlzFBuXEMqBxCAKG56SzYC7dyW-gMj0Oae1Arez1HkAFmB1p-c1ZVT5hh3dfs9xH4qYxTzA6mLOU7U';

  function urlBase64ToUint8Array(base64url) {
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  function supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Registered unconditionally, once, as soon as this file runs -- not
  // deferred until the toggle is clicked. navigator.serviceWorker.ready
  // (used below to check whether a subscription already exists) never
  // resolves unless *something* has called .register() for this scope
  // first; gating registration behind the click would leave the very
  // first render of this toggle hanging forever on a fresh admin visit.
  var swReady = ('serviceWorker' in navigator)
    ? navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => null)
    : Promise.resolve(null);

  async function authedHeaders() {
    const session = await GlotempAuth.getSession();
    if (!session) return null;
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  async function saveSubscription(subscription) {
    const headers = await authedHeaders();
    const user = GlotempAuth.getUser();
    if (!headers || !user) return false;
    const json = subscription.toJSON();
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/admin_push_subscriptions`, {
      method: 'POST',
      headers: Object.assign({}, headers, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth_key: json.keys.auth,
      }),
    });
    return resp.ok;
  }

  async function deleteSubscription(endpoint) {
    const headers = await authedHeaders();
    if (!headers) return false;
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
      { method: 'DELETE', headers }
    );
    return resp.ok;
  }

  async function currentSubscription() {
    if (!supported()) return null;
    const registration = await swReady;
    if (!registration) return null;
    return registration.pushManager.getSubscription().catch(() => null);
  }

  async function enable() {
    const registration = await swReady;
    if (!registration) throw new Error('Service worker registration failed');
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const saved = await saveSubscription(subscription);
    if (!saved) throw new Error('Could not save subscription');
    return subscription;
  }

  async function disable() {
    const subscription = await currentSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe().catch(() => {});
    await deleteSubscription(endpoint);
  }

  // ---------- the toggle ----------

  function renderButton(state) {
    // state: 'off' | 'on' | 'busy' | 'unsupported' | 'denied'
    const labels = {
      off: 'Enable admin notifications',
      on: 'Admin notifications on -- disable',
      busy: 'Working…',
      unsupported: 'Notifications not supported in this browser',
      denied: 'Notifications blocked -- allow them in browser settings',
    };
    return (
      '<button type="button" class="adm-action" id="adm-push-toggle"' +
      (state === 'busy' || state === 'unsupported' || state === 'denied' ? ' disabled' : '') +
      ' data-state="' + state + '">' + labels[state] + '</button>'
    );
  }

  async function mount(container) {
    if (!container) return;
    if (!supported()) { container.innerHTML = renderButton('unsupported'); return; }
    if (Notification.permission === 'denied') { container.innerHTML = renderButton('denied'); return; }

    const subscription = await currentSubscription();
    let state = (Notification.permission === 'granted' && subscription) ? 'on' : 'off';
    container.innerHTML = renderButton(state);

    container.querySelector('#adm-push-toggle').addEventListener('click', async () => {
      container.innerHTML = renderButton('busy');
      try {
        if (state === 'off') {
          // Explicit click, right here -- the only place this page ever
          // calls anything that can trigger the permission prompt.
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            container.innerHTML = renderButton(permission === 'denied' ? 'denied' : 'off');
            return;
          }
          await enable();
        } else {
          await disable();
        }
      } catch (e) {
        // Fall through to a fresh mount() either way -- it re-derives
        // state from Notification.permission and the real subscription
        // rather than trusting what this click attempted, so a failed
        // enable()/disable() can never leave the button lying about
        // whether it worked.
      }
      mount(container);
    });
  }

  window.GlotempAdminPush = { mount, supported };
})();
