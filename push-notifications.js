// Glotemp push notifications.
//
// Never requests permission on load -- browsers auto-deny (or the user
// reflexively denies) a permission prompt that appears before they've
// done anything. The only entry point is promptAfterFollow(), called by
// glotemp-checkin.js right after a successful "follow this city" POST --
// an explicit action the visitor just took, about the exact thing the
// notification would be about.
(function () {
  'use strict';

  const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';
  // Public VAPID key -- safe client-side, this is what it's for. The
  // matching private key lives only in Supabase Vault, read solely by
  // the server-side push-send function.
  const VAPID_PUBLIC_KEY = 'BG1M909CorlzFBuXEMqBxCAKG56SzYC7dyW-gMj0Oae1Arez1HkAFmB1p-c1ZVT5hh3dfs9xH4qYxTzA6mLOU7U';

  const DISMISS_KEY = 'glotemp_push_prompt_dismissed';

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

  async function saveSubscription(session, user, subscription) {
    const json = subscription.toJSON();
    await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth_key: json.keys.auth,
      }),
    }).catch(() => {});
  }

  async function subscribeAndSave(session, user) {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await saveSubscription(session, user, subscription);
    return true;
  }

  function removePrompt(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // A small on-brand confirmation moment -- NOT the native browser
  // dialog directly. Clicking "Notify me" inside this is itself a fresh
  // user gesture, so Notification.requestPermission() from that handler
  // is on solid ground in every browser, including the stricter ones.
  function showPrompt(cityName, onYes) {
    if (document.getElementById('push-prompt')) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const el = document.createElement('div');
    el.id = 'push-prompt';
    el.className = 'push-prompt';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Notification permission');
    el.innerHTML =
      '<p class="push-prompt-text">Get a note when ' + cityName + ' moves?</p>' +
      '<div class="push-prompt-actions">' +
      '<button type="button" class="push-prompt-yes">Notify me</button>' +
      '<button type="button" class="push-prompt-no">Not now</button>' +
      '</div>';

    el.querySelector('.push-prompt-yes').addEventListener('click', async () => {
      removePrompt(el);
      await onYes();
    });
    el.querySelector('.push-prompt-no').addEventListener('click', () => {
      sessionStorage.setItem(DISMISS_KEY, '1');
      removePrompt(el);
    });

    document.body.appendChild(el);
  }

  async function promptAfterFollow(citySlug, cityName, session, user) {
    if (!supported()) return;
    if (Notification.permission === 'denied') return; // respected, never re-asked
    if (Notification.permission === 'granted') {
      await subscribeAndSave(session, user);
      return;
    }
    showPrompt(cityName || citySlug, async () => {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') await subscribeAndSave(session, user);
    });
  }

  window.GlotempPush = { promptAfterFollow, supported };
})();
