/const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co'; // e.g. https://abc123.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_
'; // eyJ... ----- i18n Setup -----
const translations = {
  en: {
    install_title: "Add Glotemp to Home Screen",
    install_btn: "Install",
    dismiss: "✕",
    mood: "Mood",
    trip_engine_title: "Trip Engine",
    trip_question: "Should I travel to <strong></strong> this weekend?",
    trip_go_reason: "The city is buzzing with events and great energy.",
    trip_maybe_reason: "It’s decent, but check the weather first.",
    trip_wait_reason: "Mood is low; maybe next weekend.",
    checkin_title: "Report Your Mood",
    stars: "Stars",
    stars_share: "Top contributors share 5% of sponsorship revenue",
    footer_tagline: "Measuring the world’s heartbeat",
    privacy_policy: "Privacy Policy",
    terms_of_service: "Terms of Service",
    cookie_settings: "Cookie Settings",
    cookie_banner_text: "We use essential cookies to remember your language preference and mood check-ins. No third-party tracking.",
    cookie_accept: "Accept All",
    cookie_settings_btn: "Settings",
    dimensions: ["Mood","Economic","Nightlife","Study","Tourism","Safety","Health","Traffic","Events","Community","Weather","Innovation"],
    nav_stories: "Stories",
    blog_search_placeholder: "Search by city…",
    blog_all_cities: "All Cities",
    blog_no_stories: "No stories found",
    blog_read_full: "Read full story",
    blog_back: "Back to stories",
    blog_trivia: "Trivia",
    blog_history: "History",
    blog_loading: "Loading stories…",
    blog_error: "Couldn't load stories. Please try again later.",
    daily_story: "Daily Story",
    trivia: "Trivia",
    history: "History",
    read_more: "Read more"
  },
  es: {
    install_title: "Añadir Glotemp a inicio",
    install_btn: "Instalar",
    dismiss: "✕",
    mood: "Ánimo",
    trip_engine_title: "Motor de Viaje",
    trip_question: "¿Debería viajar a <strong></strong> este fin de semana?",
    trip_go_reason: "La ciudad está llena de eventos y buena energía.",
    trip_maybe_reason: "Está bien, pero revisa el clima primero.",
    trip_wait_reason: "El ánimo está bajo; tal vez el próximo fin de semana.",
    checkin_title: "Reporta tu estado de ánimo",
    stars: "Estrellas",
    stars_share: "Los principales contribuyentes comparten el 5% de los patrocinios",
    footer_tagline: "Midiendo el latido del mundo",
    privacy_policy: "Política de Privacidad",
    terms_of_service: "Términos de Servicio",
    cookie_settings: "Configuración de Cookies",
    cookie_banner_text: "Usamos cookies esenciales para recordar tu idioma y registros de ánimo. Sin rastreo de terceros.",
    cookie_accept: "Aceptar todo",
    cookie_settings_btn: "Configuración",
    dimensions: ["Ánimo","Economía","Vida nocturna","Estudio","Turismo","Seguridad","Salud","Tráfico","Eventos","Comunidad","Clima","Innovación"],
    nav_stories: "Historias",
    blog_search_placeholder: "Buscar por ciudad…",
    blog_all_cities: "Todas las ciudades",
    blog_no_stories: "No se encontraron historias",
    blog_read_full: "Leer historia completa",
    blog_back: "Volver a historias",
    blog_trivia: "Curiosidades",
    blog_history: "Historia",
    blog_loading: "Cargando historias…",
    blog_error: "No se pudieron cargar las historias. Inténtalo de nuevo.",
    daily_story: "Historia del día",
    trivia: "Curiosidades",
    history: "Historia",
    read_more: "Leer más"
  },
  fr: {
    install_title: "Ajouter Glotemp à l'écran d'accueil",
    install_btn: "Installer",
    dismiss: "✕",
    mood: "Humeur",
    trip_engine_title: "Moteur de voyage",
    trip_question: "Devrais-je voyager à <strong></strong> ce week-end ?",
    trip_go_reason: "La ville vibre d'événements et d'énergie.",
    trip_maybe_reason: "C'est correct, mais vérifiez la météo.",
    trip_wait_reason: "L'humeur est basse, peut-être le week-end prochain.",
    checkin_title: "Signalez votre humeur",
    stars: "Étoiles",
    stars_share: "Les meilleurs contributeurs partagent 5% des revenus de sponsoring",
    footer_tagline: "Mesurer les battements du cœur du monde",
    privacy_policy: "Politique de Confidentialité",
    terms_of_service: "Conditions d'Utilisation",
    cookie_settings: "Paramètres des Cookies",
    cookie_banner_text: "Nous utilisons des cookies essentiels pour mémoriser votre langue et vos humeurs. Aucun suivi tiers.",
    cookie_accept: "Tout accepter",
    cookie_settings_btn: "Paramètres",
    dimensions: ["Humeur","Économie","Vie nocturne","Étude","Tourisme","Sécurité","Santé","Trafic","Événements","Communauté","Météo","Innovation"],
    nav_stories: "Histoires",
    blog_search_placeholder: "Rechercher par ville…",
    blog_all_cities: "Toutes les villes",
    blog_no_stories: "Aucune histoire trouvée",
    blog_read_full: "Lire l'histoire complète",
    blog_back: "Retour aux histoires",
    blog_trivia: "Anecdotes",
    blog_history: "Histoire",
    blog_loading: "Chargement des histoires…",
    blog_error: "Impossible de charger les histoires. Veuillez réessayer.",
    daily_story: "Histoire du jour",
    trivia: "Anecdotes",
    history: "Histoire",
    read_more: "En savoir plus"
  },
  de: {
    install_title: "Glotemp zum Startbildschirm hinzufügen",
    install_btn: "Installieren",
    dismiss: "✕",
    mood: "Stimmung",
    trip_engine_title: "Reise-Motor",
    trip_question: "Sollte ich dieses Wochenende nach <strong></strong> reisen?",
    trip_go_reason: "Die Stadt pulsiert vor Events und Energie.",
    trip_maybe_reason: "Ganz okay, aber prüfe das Wetter.",
    trip_wait_reason: "Stimmung ist niedrig; vielleicht nächstes Wochenende.",
    checkin_title: "Deine Stimmung melden",
    stars: "Sterne",
    stars_share: "Top-Beitragende teilen sich 5% der Sponsoring-Einnahmen",
    footer_tagline: "Den Herzschlag der Welt messen",
    privacy_policy: "Datenschutzrichtlinie",
    terms_of_service: "Nutzungsbedingungen",
    cookie_settings: "Cookie-Einstellungen",
    cookie_banner_text: "Wir verwenden essentielle Cookies, um Ihre Spracheinstellung und Stimmungs-Check-ins zu speichern. Kein Drittanbieter-Tracking.",
    cookie_accept: "Alle akzeptieren",
    cookie_settings_btn: "Einstellungen",
    dimensions: ["Stimmung","Wirtschaft","Nachtleben","Studium","Tourismus","Sicherheit","Gesundheit","Verkehr","Events","Gemeinschaft","Wetter","Innovation"],
    nav_stories: "Geschichten",
    blog_search_placeholder: "Nach Stadt suchen…",
    blog_all_cities: "Alle Städte",
    blog_no_stories: "Keine Geschichten gefunden",
    blog_read_full: "Ganze Geschichte lesen",
    blog_back: "Zurück zu Geschichten",
    blog_trivia: "Wissenswertes",
    blog_history: "Geschichte",
    blog_loading: "Geschichten werden geladen…",
    blog_error: "Geschichten konnten nicht geladen werden. Bitte versuche es später erneut.",
    daily_story: "Geschichte des Tages",
    trivia: "Wissenswertes",
    history: "Geschichte",
    read_more: "Mehr lesen"
  },
  pt: {
    install_title: "Adicionar Glotemp à tela inicial",
    install_btn: "Instalar",
    dismiss: "✕",
    mood: "Humor",
    trip_engine_title: "Motor de Viagem",
    trip_question: "Devo viajar para <strong></strong> neste fim de semana?",
    trip_go_reason: "A cidade está cheia de eventos e ótima energia.",
    trip_maybe_reason: "Está razoável, mas verifique o clima.",
    trip_wait_reason: "O humor está baixo; talvez no próximo fim de semana.",
    checkin_title: "Relate seu humor",
    stars: "Estrelas",
    stars_share: "Principais contribuidores dividem 5% da receita de patrocínios",
    footer_tagline: "Medindo o batimento cardíaco do mundo",
    privacy_policy: "Política de Privacidade",
    terms_of_service: "Termos de Serviço",
    cookie_settings: "Configurações de Cookies",
    cookie_banner_text: "Usamos cookies essenciais para lembrar sua preferência de idioma e registros de humor. Sem rastreamento de terceiros.",
    cookie_accept: "Aceitar tudo",
    cookie_settings_btn: "Configurações",
    dimensions: ["Humor","Economia","Vida noturna","Estudo","Turismo","Segurança","Saúde","Tráfego","Eventos","Comunidade","Clima","Inovação"],
    nav_stories: "Histórias",
    blog_search_placeholder: "Buscar por cidade…",
    blog_all_cities: "Todas as cidades",
    blog_no_stories: "Nenhuma história encontrada",
    blog_read_full: "Ler história completa",
    blog_back: "Voltar às histórias",
    blog_trivia: "Curiosidades",
    blog_history: "História",
    blog_loading: "Carregando histórias…",
    blog_error: "Não foi possível carregar as histórias. Tente novamente.",
    daily_story: "História do dia",
    trivia: "Curiosidades",
    history: "História",
    read_more: "Ler mais"
  },
  ja: {
    install_title: "Glotempをホーム画面に追加",
    install_btn: "インストール",
    dismiss: "✕",
    mood: "気分",
    trip_engine_title: "旅行エンジン",
    trip_question: "今週末<strong></strong>に旅行すべき？",
    trip_go_reason: "街はイベントとエネルギーで溢れています。",
    trip_maybe_reason: "まあまあですが、天気を確認してください。",
    trip_wait_reason: "気分は低め、次の週末かも。",
    checkin_title: "気分を報告",
    stars: "スター",
    stars_share: "トップ貢献者がスポンサー収益の5%を共有",
    footer_tagline: "世界の鼓動を測る",
    privacy_policy: "プライバシーポリシー",
    terms_of_service: "利用規約",
    cookie_settings: "Cookieの設定",
    cookie_banner_text: "言語設定とムードチェックインを記憶するために必須Cookieを使用します。第三者追跡なし。",
    cookie_accept: "すべて受け入れる",
    cookie_settings_btn: "設定",
    dimensions: ["気分","経済","ナイトライフ","学習","観光","安全","健康","交通","イベント","コミュニティ","天気","イノベーション"],
    nav_stories: "ストーリー",
    blog_search_placeholder: "都市名で検索…",
    blog_all_cities: "すべての都市",
    blog_no_stories: "ストーリーが見つかりません",
    blog_read_full: "全文を読む",
    blog_back: "ストーリーに戻る",
    blog_trivia: "トリビア",
    blog_history: "歴史",
    blog_loading: "ストーリーを読み込み中…",
    blog_error: "ストーリーを読み込めませんでした。後でもう一度お試しください。",
    daily_story: "今日のストーリー",
    trivia: "トリビア",
    history: "歴史",
    read_more: "続きを読む"
  }
};

const supportedLangs = Object.keys(translations);
let currentLang = (navigator.language || 'en').split('-')[0];
if (!supportedLangs.includes(currentLang)) currentLang = 'en';

function setLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  localStorage.setItem('glotemp-lang', lang);
  applyTranslations();
}

function t(key) {
  return translations[currentLang]?.[key] || translations.en[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key === 'trip_question') {
      // special handling because it contains <strong>
      el.innerHTML = t(key).replace('<strong></strong>', `<strong>${document.getElementById('trip-city')?.textContent || ''}</strong>`);
    } else {
      el.textContent = t(key);
    }
  });
}

// ----- Language Switch Modal -----
(function initLangUI() {
  const modal = document.createElement('div');
  modal.className = 'lang-modal';
  modal.id = 'lang-modal';
  const list = document.createElement('div');
  list.className = 'lang-list';
  const langNames = { en:'English', es:'Español', fr:'Français', de:'Deutsch', pt:'Português', ja:'日本語' };
  supportedLangs.forEach(code => {
    const opt = document.createElement('div');
    opt.className = 'lang-option';
    opt.textContent = langNames[code];
    opt.onclick = () => { setLanguage(code); modal.style.display = 'none'; };
    list.appendChild(opt);
  });
  modal.appendChild(list);
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
  document.body.appendChild(modal);
  document.getElementById('lang-switch').onclick = () => modal.style.display = 'flex';
})();

// Restore language
const savedLang = localStorage.getItem('glotemp-lang');
if (savedLang && supportedLangs.includes(savedLang)) currentLang = savedLang;
document.documentElement.lang = currentLang;

// ----- Pulse Simulation & Canvas -----
const canvas = document.getElementById('pulse-canvas');
const ctx = canvas.getContext('2d');
let animationId;
let pulsePoints = [];

function resizeCanvas() {
  canvas.width = canvas.parentElement.offsetWidth;
  canvas.height = canvas.parentElement.offsetHeight;
  initPulsePoints();
}
window.addEventListener('resize', resizeCanvas);

function initPulsePoints() {
  pulsePoints = [];
  const count = 15;
  for (let i = 0; i < count; i++) {
    pulsePoints.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.8,
      speedY: (Math.random() - 0.5) * 0.8,
      color: `hsl(${Math.random() * 60 + 180}, 80%, 70%)`
    });
  }
}

function drawPulse() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // draw connecting lines
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < pulsePoints.length; i++) {
    for (let j = i+1; j < pulsePoints.length; j++) {
      const p1 = pulsePoints[i], p2 = pulsePoints[j];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (dist < 180) {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
    }
  }
  ctx.stroke();

  // draw points
  pulsePoints.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    // move
    p.x += p.speedX;
    p.y += p.speedY;
    if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
    if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
  });
  ctx.shadowBlur = 0;
  animationId = requestAnimationFrame(drawPulse);
}

// City data simulation
const cities = {
  nyc: { name: "New York", mood: 7.8, dims: [8.2,7.1,9.0,7.5,8.8,6.9,7.0,5.2,9.3,8.0,7.4,8.1] },
  london: { name: "London", mood: 6.9, dims: [7.0,6.8,7.5,7.2,8.0,7.1,6.5,5.8,7.8,7.3,6.9,7.6] },
  tokyo: { name: "Tokyo", mood: 8.4, dims: [8.5,8.0,8.8,8.2,8.9,9.2,8.1,7.5,9.0,8.4,7.9,9.1] },
  berlin: { name: "Berlin", mood: 7.2, dims: [7.3,6.5,8.2,7.0,7.8,7.5,7.2,6.0,8.5,7.6,7.0,7.9] },
  "sao-paulo": { name: "São Paulo", mood: 7.0, dims: [7.1,6.2,7.8,6.8,7.0,5.9,6.4,4.8,7.2,6.9,7.3,6.5] },
  paris: { name: "Paris", mood: 7.5, dims: [7.6,7.0,7.9,7.4,8.5,7.2,7.3,5.5,8.0,7.5,7.2,7.8] }
};

function updateCity(selected) {
  const city = cities[selected];
  document.getElementById('city-name').textContent = city.name;
  document.getElementById('mood-score').textContent = city.mood.toFixed(1);
  document.getElementById('trip-city').textContent = city.name;
  // dimensions
  const dimNames = t('dimensions');
  const grid = document.getElementById('dimensions-grid');
  grid.innerHTML = '';
  city.dims.forEach((val, idx) => {
    const badge = document.createElement('span');
    badge.className = 'dim-badge';
    badge.innerHTML = `<span>${dimNames[idx] || idx}</span> <strong>${val.toFixed(1)}</strong>`;
    grid.appendChild(badge);
  });
  // Trip verdict
  const verdictEl = document.getElementById('trip-verdict');
  const reasonEl = document.getElementById('trip-reason');
  if (city.mood >= 7.8) {
    verdictEl.textContent = 'GO';
    verdictEl.className = 'verdict verdict-go';
    reasonEl.textContent = t('trip_go_reason');
  } else if (city.mood >= 6.5) {
    verdictEl.textContent = 'MAYBE';
    verdictEl.className = 'verdict verdict-maybe';
    reasonEl.textContent = t('trip_maybe_reason');
  } else {
    verdictEl.textContent = 'WAIT';
    verdictEl.className = 'verdict verdict-wait';
    reasonEl.textContent = t('trip_wait_reason');
  }
}

// Check-in & Stars
function loadStars() {
  const stars = parseInt(localStorage.getItem('glotemp-stars') || '0');
  document.getElementById('stars-count').textContent = stars;
  const rankEl = document.getElementById('user-rank');
  if (stars > 200) rankEl.textContent = 'Luminary ✨';
  else if (stars > 50) rankEl.textContent = 'Pathfinder';
  else rankEl.textContent = 'Explorer';
}
function addStars(amount) {
  const current = parseInt(localStorage.getItem('glotemp-stars') || '0');
  localStorage.setItem('glotemp-stars', current + amount);
  loadStars();
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  resizeCanvas();
  drawPulse();
  updateCity('nyc');
  document.getElementById('city-select').addEventListener('change', (e) => updateCity(e.target.value));
  loadStars();

  // Mood check-in buttons
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addStars(10);
      alert(`${t('stars')} +10!`);
    });
  });

  // Install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-banner').style.display = 'block';
  });
  document.getElementById('install-btn').addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      document.getElementById('install-banner').style.display = 'none';
    }
  });
  document.getElementById('dismiss-install').addEventListener('click', () => {
    document.getElementById('install-banner').style.display = 'none';
  });
});
function loadDailyStory() {
  const storySection = document.getElementById('story-content');
  const fallback = document.getElementById('story-fallback');

  fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=*&featured=eq.true&order=date.desc&limit=1`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data && data.length > 0) {
      const story = data[0];
      document.getElementById('story-emoji').textContent = story.emoji || '🌍';
      document.getElementById('story-city').textContent = story.city;
      document.getElementById('story-title').textContent = story.title;
      document.getElementById('story-excerpt').textContent = story.excerpt || '';

      document.getElementById('trivia-btn').onclick = () => {
        const el = document.getElementById('trivia-text');
        el.textContent = story.trivia || 'No trivia available.';
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
      };
      document.getElementById('history-btn').onclick = () => {
        const el = document.getElementById('history-text');
        el.textContent = story.history_nugget || 'No history available.';
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
      };

      storySection.style.display = 'block';
      fallback.style.display = 'none';

      if (window.twemoji) {
        twemoji.parse(document.getElementById('daily-story'));
      }
    } else {
      throw new Error('No featured story');
    }
  })
  .catch(() => {
    storySection.style.display = 'none';
    fallback.style.display = 'block';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // ... existing code like applyTranslations, resizeCanvas, etc.
  loadDailyStory(); // add this line
});
