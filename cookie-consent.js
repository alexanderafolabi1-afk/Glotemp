(function () {
  'use strict';

  var STORAGE_KEY = 'cookieConsent';

  function getLang() {
    return localStorage.getItem('glotemp-lang') || (navigator.language || 'en').split('-')[0];
  }

  var msgs = {
    en: {
      text: 'We use essential cookies to remember your language preference and mood check-ins. No third-party tracking.',
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
      '#cookie-consent-banner {',
      '  position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);',
      '  width: calc(100% - 3rem); max-width: 680px; z-index: 9999;',
      '  background: rgba(10,15,26,0.75); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);',
      '  border: 1px solid rgba(0,242,254,0.15); border-radius: 1rem;',
      '  box-shadow: 0 8px 32px rgba(0,0,0,0.5); padding: 1.25rem 1.5rem;',
      '  display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;',
      '  color: #e0e8f0; font-family: inherit; font-size: 0.9rem; line-height: 1.5;',
      '}',
      '#cookie-consent-banner p { margin: 0; flex: 1; min-width: 200px; }',
      '#cookie-consent-banner .cookie-btns { display: flex; gap: 0.75rem; flex-shrink: 0; }',
      '#cookie-consent-banner .btn-cookie-accept {',
      '  background: linear-gradient(135deg, #00f2fe, #4facfe);',
      '  color: #0a0f1a; border: none; border-radius: 0.5rem;',
      '  padding: 0.5rem 1.25rem; font-weight: 700; cursor: pointer; font-size: 0.9rem;',
      '}',
      '#cookie-consent-banner .btn-cookie-accept:hover { opacity: 0.85; }',
      '#cookie-consent-banner .btn-cookie-settings {',
      '  background: transparent; color: #a0b4c8;',
      '  border: 1px solid rgba(160,180,200,0.3); border-radius: 0.5rem;',
      '  padding: 0.5rem 1.25rem; cursor: pointer; font-size: 0.9rem;',
      '}',
      '#cookie-consent-banner .btn-cookie-settings:hover { border-color: rgba(0,242,254,0.5); color: #00f2fe; }'
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
