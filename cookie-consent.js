(function () {
  'use strict';

  var STORAGE_KEY = 'cookieConsent';

  function getLang() {
    return localStorage.getItem('glotemp-lang') || (navigator.language || 'en').split('-')[0];
  }

  var msgs = {
    en: {
      text: 'We use essential cookies to remember your language preference and mood readings. No third-party tracking.',
      accept: 'Accept All',
      settings: 'Settings'
    },
    es: {
      text: 'Usamos cookies esenciales para recordar tu idioma y registros de ánimo. Sin rastreo de terceros.',
      accept: 'Aceptar todo',
      settings: 'Configuración'
    },
    fr: {
      text: "Nous utilisons des cookies essentiels pour mémoriser votre langue et vos humeurs. Aucun suivi tiers.",
      accept: 'Tout accepter',
      settings: 'Paramètres'
    },
    de: {
      text: 'Wir verwenden essentielle Cookies, um Ihre Spracheinstellung und Stimmungs-Check-ins zu speichern. Kein Drittanbieter-Tracking.',
      accept: 'Alle akzeptieren',
      settings: 'Einstellungen'
    },
    pt: {
      text: 'Usamos cookies essenciais para lembrar sua preferência de idioma e registros de humor. Sem rastreamento de terceiros.',
      accept: 'Aceitar tudo',
      settings: 'Configurações'
    },
    ja: {
      text: '言語設定とムードチェックインを記憶するために必須Cookieを使用します。第三者追跡なし。',
      accept: 'すべて受け入れる',
      settings: '設定'
    }
  };

  function getMsg(key) {
    var lang = getLang();
    return (msgs[lang] || msgs.en)[key];
  }

  function injectStyles() {
    if (document.getElementById('cookie-consent-style')) return;
    var style = document.createElement('style');
    style.id = 'cookie-consent-style';
    style.textContent = [
      // This banner is injected from JS, so it never inherited the site
      // stylesheet's ground rules and was the last piece of the retired
      // cyan-on-navy design still shipping: a rounded, drop-shadowed
      // panel filled rgba(10,15,26,.75) with #00f2fe gradient buttons and
      // cool-grey #a0b4c8 text, on every page. Rebuilt in the warm
      // palette as a flush hairline strip -- no radius, no fill panel,
      // no shadow.
      '#cookie-consent-banner {',
      '  position: fixed; bottom: 0; left: 0; right: 0;',
      '  width: 100%; z-index: 9999;',
      '  background: #14100B; border-top: 1px solid rgba(176,141,87,0.22);',
      '  border-radius: 0; box-shadow: none;',
      '  padding: 1rem 1.5rem;',
      '  display: flex; align-items: center; justify-content: center; gap: 1.5rem; flex-wrap: wrap;',
      '  color: #C9B79C; font-family: inherit; font-size: 0.85rem; line-height: 1.5;',
      '}',
      '#cookie-consent-banner p { margin: 0; flex: 1 1 260px; max-width: 60ch; }',
      '#cookie-consent-banner .cookie-btns { display: flex; gap: 1.25rem; flex-shrink: 0; }',
      '#cookie-consent-banner .btn-cookie-accept {',
      '  background: transparent; color: #F0E0C8;',
      '  border: none; border-bottom: 1px solid #B08D57; border-radius: 0;',
      '  padding: 0.5rem 0.25rem; cursor: pointer; font-size: 0.8rem;',
      '  font-variant-caps: small-caps; letter-spacing: 0.1em;',
      '  transition: color 200ms ease, border-color 200ms ease;',
      '}',
      '#cookie-consent-banner .btn-cookie-accept:hover { color: #B08D57; }',
      '#cookie-consent-banner .btn-cookie-settings {',
      '  background: transparent; color: #C9B79C;',
      '  border: none; border-bottom: 1px solid rgba(176,141,87,0.22); border-radius: 0;',
      '  padding: 0.5rem 0.25rem; cursor: pointer; font-size: 0.8rem;',
      '  font-variant-caps: small-caps; letter-spacing: 0.1em;',
      '  transition: color 200ms ease, border-color 200ms ease;',
      '}',
      '#cookie-consent-banner .btn-cookie-settings:hover { border-bottom-color: #B08D57; color: #F0E0C8; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  function createBanner() {
    var banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.setAttribute('aria-live', 'polite');
    var p = document.createElement('p');
    p.setAttribute('data-i18n', 'cookie_banner_text');
    p.textContent = getMsg('text');

    var btns = document.createElement('div');
    btns.className = 'cookie-btns';

    var acceptBtn = document.createElement('button');
    acceptBtn.className = 'btn-cookie-accept';
    acceptBtn.setAttribute('data-i18n', 'cookie_accept');
    acceptBtn.textContent = getMsg('accept');

    var settingsBtn = document.createElement('button');
    settingsBtn.className = 'btn-cookie-settings';
    settingsBtn.setAttribute('data-i18n', 'cookie_settings_btn');
    settingsBtn.textContent = getMsg('settings');

    acceptBtn.addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, 'true');
      hideBanner();
    });

    settingsBtn.addEventListener('click', function () {
      // Functional storage is always kept; hiding banner acts as dismissal
      localStorage.setItem(STORAGE_KEY, 'dismissed');
      hideBanner();
    });

    btns.appendChild(acceptBtn);
    btns.appendChild(settingsBtn);
    banner.appendChild(p);
    banner.appendChild(btns);
    document.body.appendChild(banner);
  }

  function hideBanner() {
    var banner = document.getElementById('cookie-consent-banner');
    if (banner) banner.remove();
  }

  function showBanner() {
    if (!document.getElementById('cookie-consent-banner')) {
      injectStyles();
      createBanner();
    }
  }

  function init() {
    var consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      showBanner();
    }

    // Allow "Cookie Settings" link to re-open banner
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'cookie-settings') {
        e.preventDefault();
        localStorage.removeItem(STORAGE_KEY);
        showBanner();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
