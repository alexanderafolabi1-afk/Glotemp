// ----- i18n Setup -----
const translations = {
  en: {
    install_title: "Add Glotemp to Home Screen",
    install_btn: "Install",
    dismiss: "✕",
    mood: "Mood",
    trip_engine_title: "Trip Engine",
    trip_question: "Should you travel to <strong></strong> this weekend?",
    trip_go_reason: "The streets are charged. Energy is high. The moment is right.",
    trip_maybe_reason: "It’s decent, but check the weather first.",
    trip_wait_reason: "Mood is low; maybe next weekend.",
    checkin_title: "Share the pulse",
    stars: "Stars",
    stars_share: "Those who contribute most share in the city's reward.",
    footer_tagline: "Measuring the world's heartbeat.",
    about_title: "About Glotemp",
    about_text: "We measure what cannot be seen on a map — the collective feeling of a city. Glotemp is the world's first real-time mood infrastructure. It turns the silent emotional current of urban life into clear, living intelligence for travellers, businesses and communities. Every check-in adds a heartbeat. Every city gains a voice.",
    invest_title: "Seed Round Open",
    invest_text: "We are building the emotional layer of the internet of cities. A new category of location intelligence is forming — one based on collective human energy rather than static data. Early partners will help define it. Deck available on request.",
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
    daily_story: "Daily Pulse",
    trivia: "Trivia",
    history: "History",
    read_more: "Read more",
    checkin_eyebrow: "Observation intake",
    checkin_intro: "Offer a quiet signal from where you stand. Richer observations deepen the atlas while keeping the ritual gentle.",
    intensity_label: "Intensity",
    scene_label: "Scene",
    language_label: "Language lens",
    cadence_label: "Contribution cadence",
    context_label: "Optional local note",
    context_placeholder: "A small observation, event note, or mood context.",
    record_observation: "Record observation",
    human_signal_verified: "Human signal verified",
    contribution_quality_title: "Quality of signal",
    contribution_quality_copy: "Subtle context, repeat observations, and cross-language notes increase the scientific value of each entry.",
    return_title: "Return pathway",
    return_copy: "Repeated, geographically diverse observations gradually unlock supporter recognition, deeper archives, and curated invitations.",
    systems_eyebrow: "Observatory systems",
    systems_title: "Global participation, value, and patronage",
    systems_intro: "Designed as a private instrument: respectful onboarding, richer emotional climate signals, and revenue paths that preserve trust.",
    system_global_title: "Worldwide resonance",
    system_global_copy: "Language-sensitive prompts, cultural scenes, and local contribution rhythms make participation feel native from Lagos to Tokyo.",
    system_data_title: "Ethical climate data",
    system_data_copy: "Prepare anonymised research feeds, city climate reports, and institutional node partnerships with explicit guardrails and consent language.",
    system_membership_title: "Supporter patronage",
    system_membership_copy: "Quiet supporter tiers, observatory circles, and archival access reward care without turning the product into a game.",
    data_products_eyebrow: "Data products",
    data_products_title: "Prepared revenue architecture",
    geo_eyebrow: "Geographic depth",
    geo_title: "Participation incentives by region",
    wall_eyebrow: "Constellation wall",
    wall_title: "Selected observations from the observatory",
    wall_intro: "A curated wall of badge holders whose notes illuminate how cities felt in specific moments.",
    share_note_upgraded: "Those who contribute thoughtfully help the atlas become more precise, trusted, and global.",
    observation_saved: "Observation recorded.",
    observation_claim_prompt: "Your constellation badge is ready to be claimed.",
    badge_claim_cta: "Claim your badge",
    badge_download: "Download badge",
    badge_share: "Share quietly",
    badge_note_label: "Public note",
    badge_note_placeholder: "A short line for the wall, if you wish.",
    badge_email_label: "Email",
    badge_name_label: "Display name",
    badge_social_label: "Or continue with",
    badge_story_invite: "Would you like the observatory to consider this note for the Constellation Wall?",
    premium_title: "Observatory circles",
    premium_copy: "Supporter tiers unlock archives, early briefings, private badges, and invitations to city reports.",
    wall_empty: "The wall is waiting for its next quiet story.",
    observatory_moment_title: "A new constellation has formed.",
    observatory_moment_subtitle: "We have reached {milestone} observers. The sky has changed.",
    observatory_moment_claimed: "Badge claimed. Welcome to the wall.",
    social_caption_prefix: "I claimed the {title} badge on @Glotemp — a quiet record of how cities feel in motion."
  },
  es: {
    install_title: "Añadir Glotemp a inicio",
    install_btn: "Instalar",
    dismiss: "✕",
    mood: "Ánimo",
    trip_engine_title: "Motor de Viaje",
    trip_question: "¿Deberías viajar a <strong></strong> este fin de semana?",
    trip_go_reason: "Las calles están cargadas de energía. El momento es perfecto.",
    trip_maybe_reason: "Está bien, pero revisa el clima primero.",
    trip_wait_reason: "El ánimo está bajo; tal vez el próximo fin de semana.",
    checkin_title: "Comparte el pulso",
    stars: "Estrellas",
    stars_share: "Quienes más contribuyen comparten la recompensa de la ciudad.",
    footer_tagline: "Midiendo el latido del mundo.",
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
    daily_story: "Pulso del Día",
    trivia: "Curiosidades",
    history: "Historia",
    read_more: "Leer más"
  },
  fr: {
    install_title: "Ajouter Glotemp à l'écran d'accueil",
    install_btn: "Installer",
    dismiss: "✕",
    mood: "Humeur",
    trip_engine_title: "Moteur de Voyage",
    trip_question: "Devriez-vous voyager à <strong></strong> ce week-end ?",
    trip_go_reason: "Les rues sont chargées d'énergie. Le moment est parfait.",
    trip_maybe_reason: "C'est correct, mais vérifiez la météo.",
    trip_wait_reason: "L'humeur est basse, peut-être le week-end prochain.",
    checkin_title: "Partagez le pouls",
    stars: "Étoiles",
    stars_share: "Ceux qui contribuent le plus partagent la récompense de la ville.",
    footer_tagline: "Mesurer le battement du monde.",
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
    daily_story: "Pouls du Jour",
    trivia: "Anecdotes",
    history: "Histoire",
    read_more: "En savoir plus"
  },
  de: {
    install_title: "Glotemp zum Startbildschirm hinzufügen",
    install_btn: "Installieren",
    dismiss: "✕",
    mood: "Stimmung",
    trip_engine_title: "Reise-Engine",
    trip_question: "Sollten Sie dieses Wochenende nach <strong></strong> reisen?",
    trip_go_reason: "Die Straßen sind voller Energie. Der Moment ist richtig.",
    trip_maybe_reason: "Ganz okay, aber prüfe das Wetter.",
    trip_wait_reason: "Stimmung ist niedrig; vielleicht nächstes Wochenende.",
    checkin_title: "Teile den Puls",
    stars: "Sterne",
    stars_share: "Die stärksten Mitwirkenden teilen die Belohnung der Stadt.",
    footer_tagline: "Den Herzschlag der Welt messen.",
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
    daily_story: "Täglicher Puls",
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
    trip_question: "Você deveria viajar para <strong></strong> neste fim de semana?",
    trip_go_reason: "As ruas estão carregadas de energia. O momento é perfeito.",
    trip_maybe_reason: "Está razoável, mas verifique o clima.",
    trip_wait_reason: "O humor está baixo; talvez no próximo fim de semana.",
    checkin_title: "Compartilhe o pulso",
    stars: "Estrelas",
    stars_share: "Quem mais contribui compartilha a recompensa da cidade.",
    footer_tagline: "Medindo o batimento do mundo.",
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
    daily_story: "Pulso do Dia",
    trivia: "Curiosidades",
    history: "História",
    read_more: "Ler mais"
  },
  ja: {
    install_title: "Glotempをホーム画面に追加",
    install_btn: "インストール",
    dismiss: "✕",
    mood: "ムード",
    trip_engine_title: "トリップエンジン",
    trip_question: "今週末<strong></strong>へ旅行すべきですか？",
    trip_go_reason: "街はエネルギーに満ちています。今がその時です。",
    trip_maybe_reason: "まあまあですが、天気を確認してください。",
    trip_wait_reason: "気分は低め、次の週末かも。",
    checkin_title: "パルスを共有",
    stars: "スター",
    stars_share: "最も貢献した人が街の報酬を分かち合う。",
    footer_tagline: "世界の心拍を測る。",
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
    daily_story: "デイリーパルス",
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

// ----- Observatory System -----
const OBSERVATORY_STORAGE_KEY = 'glotemp-observatory';
const BOT_UA_PATTERN = /(bot|crawler|spider|scrapy|headless|phantom|playwright|selenium|puppeteer|curl|wget|python|java|go-http-client|facebookexternalhit|slurp|preview|discordbot|whatsapp|skypeuripreview|monitor|uptime|scan|fetch|httpclient)/i;
const BADGE_MILESTONES = [1000, 2500, 5000, 10000, 25000, 50000, 100000];
const MILESTONE_META = {
  1000: { metal: 'rose-gold', title: 'Founding Observer – 1k', line: 'The first quiet thousand taught the instrument to listen.' },
  2500: { metal: 'silver', title: 'Founding Observer – 2.5k', line: 'A wider ring of cities began to glow in sympathy.' },
  5000: { metal: 'rose-gold', title: 'Founding Observer – 5k', line: 'The atlas learned to hold many evenings at once.' },
  10000: { metal: 'platinum', title: 'Founding Observer – 10k', line: 'A new constellation formed in the disciplined dark.' },
  25000: { metal: 'silver', title: 'Founding Observer – 25k', line: 'The observatory acquired a true planetary hum.' },
  50000: { metal: 'platinum', title: 'Founding Observer – 50k', line: 'Half a hundred thousand witnesses refined the signal.' },
  100000: { metal: 'platinum', title: 'Centenary Observer – 100k', line: 'One hundred thousand observers taught the sky a new geometry.' }
};
const DATA_PRODUCTS = [
  'Anonymous emotional climate feeds for researchers, cities, and cultural institutions',
  'Premium observatory archives with deeper historical city pulse windows',
  'Licensed City Climate Reports for tourism boards, hospitality groups, and transport planners',
  'Official node partnerships for cities, universities, and museums',
  'Native sponsorship foundations for refined constellation moments and observatory circles'
];
const REGION_INCENTIVES = [
  'Africa & Middle East — event-aware prompts and multilingual context capture for rapidly shifting city scenes',
  'Europe — archive access and cultural season reports for repeat contributors across borders',
  'Asia-Pacific — local rhythm presets tuned for commuting, nightlife, campus, and festival cadence',
  'North America — city comparison briefs and premium observatory views for frequent travelers',
  'Latin America — neighbourhood storytelling and public wall invitations for culturally rich observations'
];

function getStoredObservatory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OBSERVATORY_STORAGE_KEY) || '{}');
    return {
      humanCount: parsed.humanCount || 987,
      sessionTracked: Boolean(parsed.sessionTracked),
      claimedMilestones: parsed.claimedMilestones || {},
      profiles: parsed.profiles || [],
      pendingMoment: parsed.pendingMoment || null,
      observations: parsed.observations || [],
      humanConfidence: typeof parsed.humanConfidence === 'number' ? parsed.humanConfidence : 0
    };
  } catch (error) {
    return { humanCount: 987, sessionTracked: false, claimedMilestones: {}, profiles: [], pendingMoment: null, observations: [], humanConfidence: 0 };
  }
}

let observatoryState = getStoredObservatory();

function saveObservatory() {
  localStorage.setItem(OBSERVATORY_STORAGE_KEY, JSON.stringify(observatoryState));
}

function assessHumanVisitor() {
  const ua = navigator.userAgent || '';
  const languages = navigator.languages || [];
  const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const webdriver = navigator.webdriver;
  const plugins = navigator.plugins ? navigator.plugins.length : 0;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const width = window.innerWidth || screen.width || 0;
  const signals = [];
  let score = 0;

  if (BOT_UA_PATTERN.test(ua)) signals.push('ua'); else score += 4;
  if (!webdriver) score += 3; else signals.push('webdriver');
  if (plugins > 0) score += 2; else signals.push('plugins');
  if (languages.length > 0) score += 2; else signals.push('languages');
  if (timezone) score += 1;
  if (width >= 360) score += 1;
  if (document.visibilityState === 'visible') score += 1;
  if (hasTouch || matchMedia('(pointer:fine)').matches) score += 1;

  const human = score >= 9 && signals.length < 2;
  observatoryState.humanConfidence = score;
  saveObservatory();
  return { human, score, signals };
}

function chooseMilestone(count) {
  return BADGE_MILESTONES.find(m => m === count) || null;
}

function maybeTrackHumanVisit() {
  const assessment = assessHumanVisitor();
  const pill = document.getElementById('human-signal-pill');
  if (pill) {
    pill.textContent = assessment.human ? t('human_signal_verified') : 'Automated traffic excluded';
    pill.classList.toggle('inactive', !assessment.human);
  }

  if (!assessment.human || observatoryState.sessionTracked) return;
  observatoryState.sessionTracked = true;
  observatoryState.humanCount += 1;
  const milestone = chooseMilestone(observatoryState.humanCount);
  if (milestone && !observatoryState.claimedMilestones[milestone]) {
    observatoryState.pendingMoment = milestone;
  }
  saveObservatory();
}

function buildBadgeData(milestone, profile = {}) {
  const meta = MILESTONE_META[milestone];
  return {
    milestone,
    metal: meta.metal,
    title: meta.title,
    line: meta.line,
    name: profile.name || 'Observer',
    note: profile.note || '',
    city: cities[document.getElementById('city-select')?.value || 'nyc']?.name || 'New York',
    date: new Date().toLocaleDateString()
  };
}

function ensureModal() {
  if (document.getElementById('constellation-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'constellation-modal';
  modal.className = 'constellation-modal';
  modal.innerHTML = `
    <div class="constellation-dialog glass-card">
      <button id="constellation-close" class="btn-text constellation-close" aria-label="Close">×</button>
      <p class="eyebrow">Constellation Moment</p>
      <h2 id="constellation-title"></h2>
      <p id="constellation-copy" class="section-copy"></p>
      <canvas id="badge-canvas" width="1400" height="1800" aria-label="Generated constellation badge"></canvas>
      <div class="badge-actions">
        <button id="download-badge" class="btn-neon" type="button"></button>
        <button id="share-badge" class="btn-text subtle-button" type="button"></button>
      </div>
      <form id="badge-claim-form" class="badge-form">
        <label>
          <span>${t('badge_name_label')}</span>
          <input id="badge-name" type="text" maxlength="48" required />
        </label>
        <label>
          <span>${t('badge_email_label')}</span>
          <input id="badge-email" type="email" maxlength="120" required />
        </label>
        <label>
          <span>${t('badge_note_label')}</span>
          <textarea id="badge-note" maxlength="180" rows="3" placeholder="${t('badge_note_placeholder')}"></textarea>
        </label>
        <label class="checkbox-row">
          <input id="wall-opt-in" type="checkbox" />
          <span>${t('badge_story_invite')}</span>
        </label>
        <div class="social-login-row">
          <span>${t('badge_social_label')}</span>
          <div>
            <button type="button" class="btn-text social-token" data-provider="Google">Google</button>
            <button type="button" class="btn-text social-token" data-provider="Apple">Apple</button>
          </div>
        </div>
        <button id="claim-badge" class="btn-neon" type="submit">${t('badge_claim_cta')}</button>
        <p id="badge-feedback" class="inline-feedback" aria-live="polite"></p>
      </form>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.classList.remove('active');
  });
  document.getElementById('constellation-close').addEventListener('click', () => modal.classList.remove('active'));
  document.getElementById('download-badge').addEventListener('click', downloadBadge);
  document.getElementById('share-badge').addEventListener('click', shareBadge);
  document.querySelectorAll('.social-token').forEach(btn => btn.addEventListener('click', () => {
    document.getElementById('badge-feedback').textContent = `${btn.dataset.provider} ${t('observation_saved')}`;
  }));
  document.getElementById('badge-claim-form').addEventListener('submit', claimBadge);
}

function drawBadge(data) {
  const canvas = document.getElementById('badge-canvas');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  const metalMap = {
    'rose-gold': ['#432126', '#d9a2a5'],
    silver: ['#26323d', '#dfe5ed'],
    platinum: ['#1d252f', '#f2f5fb']
  };
  const [edge, glow] = metalMap[data.metal] || metalMap.silver;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#090c11');
  gradient.addColorStop(1, '#151c24');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = glow;
  context.lineWidth = 12;
  context.strokeRect(80, 80, canvas.width - 160, canvas.height - 160);
  context.strokeStyle = edge;
  context.lineWidth = 2;
  context.strokeRect(120, 120, canvas.width - 240, canvas.height - 240);
  context.fillStyle = 'rgba(255,255,255,0.7)';
  context.font = '42px Georgia, serif';
  context.fillText('Glotemp Observatory', 150, 220);
  context.fillStyle = glow;
  context.font = '88px Georgia, serif';
  context.fillText(data.title, 150, 360, canvas.width - 300);
  context.fillStyle = '#d8dee8';
  context.font = '46px Georgia, serif';
  wrapCanvasText(context, data.line, 150, 470, canvas.width - 300, 60);
  context.font = '38px Arial';
  context.fillText(`Observer: ${data.name}`, 150, 680);
  context.fillText(`City witness: ${data.city}`, 150, 750);
  context.fillText(`Date: ${data.date}`, 150, 820);
  if (data.note) wrapCanvasText(context, `“${data.note}”`, 150, 980, canvas.width - 300, 58);
  drawConstellationGlyph(context, canvas.width / 2, 1320, glow);
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  words.forEach((word) => {
    const test = `${line}${word} `;
    if (context.measureText(test).width > maxWidth && line) {
      context.fillText(line.trim(), x, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = test;
    }
  });
  if (line) context.fillText(line.trim(), x, y);
}

function drawConstellationGlyph(context, centerX, centerY, color) {
  const points = [
    [centerX - 180, centerY + 60],
    [centerX - 70, centerY - 90],
    [centerX + 30, centerY - 30],
    [centerX + 180, centerY - 120],
    [centerX + 240, centerY + 40],
    [centerX + 40, centerY + 140],
    [centerX - 120, centerY + 180]
  ];
  context.strokeStyle = 'rgba(255,255,255,0.25)';
  context.lineWidth = 3;
  context.beginPath();
  points.forEach(([x, y], idx) => {
    if (!idx) context.moveTo(x, y); else context.lineTo(x, y);
  });
  context.closePath();
  context.stroke();
  points.forEach(([x, y], idx) => {
    context.beginPath();
    context.fillStyle = idx % 2 ? color : '#f3f5fb';
    context.arc(x, y, idx % 2 ? 12 : 9, 0, Math.PI * 2);
    context.fill();
  });
}

function openConstellationMoment(milestone) {
  ensureModal();
  const modal = document.getElementById('constellation-modal');
  const title = document.getElementById('constellation-title');
  const copy = document.getElementById('constellation-copy');
  const badge = buildBadgeData(milestone);
  title.textContent = t('observatory_moment_title');
  copy.textContent = t('observatory_moment_subtitle').replace('{milestone}', milestone.toLocaleString()) + ' ' + badge.line;
  document.getElementById('download-badge').textContent = t('badge_download');
  document.getElementById('share-badge').textContent = t('badge_share');
  document.getElementById('badge-feedback').textContent = t('observation_claim_prompt');
  document.getElementById('badge-claim-form').dataset.milestone = String(milestone);
  drawBadge(badge);
  modal.classList.add('active');
}

function downloadBadge() {
  const canvas = document.getElementById('badge-canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'glotemp-constellation-badge.png';
  link.click();
}

async function shareBadge() {
  const form = document.getElementById('badge-claim-form');
  const milestone = Number(form?.dataset.milestone || 0);
  const meta = MILESTONE_META[milestone];
  const title = meta?.title || 'Glotemp observer';
  const text = t('social_caption_prefix').replace('{title}', title);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Glotemp Observatory', text, url: window.location.href + '#constellation-wall' });
      return;
    } catch (error) {}
  }
  await navigator.clipboard?.writeText(text);
  document.getElementById('badge-feedback').textContent = 'Caption copied for sharing.';
}

function claimBadge(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const milestone = Number(form.dataset.milestone || 0);
  const meta = MILESTONE_META[milestone];
  if (!meta) return;
  const profile = {
    milestone,
    email: document.getElementById('badge-email').value.trim(),
    name: document.getElementById('badge-name').value.trim(),
    note: document.getElementById('badge-note').value.trim(),
    title: meta.title,
    city: cities[document.getElementById('city-select')?.value || 'nyc']?.name || 'New York',
    optedIn: document.getElementById('wall-opt-in').checked,
    claimedAt: new Date().toISOString()
  };
  observatoryState.claimedMilestones[milestone] = true;
  observatoryState.pendingMoment = null;
  observatoryState.profiles = [profile, ...observatoryState.profiles.filter(item => item.milestone !== milestone)].slice(0, 18);
  saveObservatory();
  drawBadge(buildBadgeData(milestone, profile));
  renderConstellationWall();
  loadStars();
  document.getElementById('badge-feedback').textContent = t('observatory_moment_claimed');
}

function renderConstellationWall() {
  const wall = document.getElementById('constellation-wall-grid');
  if (!wall) return;
  const visibleProfiles = observatoryState.profiles.filter(profile => profile.optedIn || profile.note);
  if (!visibleProfiles.length) {
    wall.innerHTML = `<p class="wall-empty">${t('wall_empty')}</p>`;
    return;
  }
  wall.innerHTML = visibleProfiles.map(profile => `
    <article class="wall-card">
      <p class="eyebrow">${profile.title}</p>
      <h3>${profile.name}</h3>
      <p class="wall-city">${profile.city}</p>
      <p class="wall-note">${profile.note || 'Quietly observing the movement of a city.'}</p>
      <span class="wall-date">${new Date(profile.claimedAt).toLocaleDateString()}</span>
    </article>
  `).join('');
}

function renderSignalPanels() {
  const quality = document.getElementById('quality-indicators');
  const cadence = document.getElementById('cadence-indicators');
  const products = document.getElementById('product-list');
  const regions = document.getElementById('region-list');
  if (quality) {
    const last = observatoryState.observations[0];
    const items = [
      `Human confidence score: ${observatoryState.humanConfidence}/14`,
      `Recent note depth: ${last?.note ? 'Context attached' : 'Signal only'}`,
      `Observation archive: ${observatoryState.observations.length} recent entries saved locally`
    ];
    quality.innerHTML = items.map(item => `<li>${item}</li>`).join('');
  }
  if (cadence) {
    const uniqueCities = new Set(observatoryState.observations.map(item => item.city)).size;
    const items = [
      `Geographic breadth: ${uniqueCities || 1} city lens${uniqueCities === 1 ? '' : 'es'} observed`,
      `Supporter path: ${observatoryState.observations.length >= 5 ? 'Observatory Circle ready' : 'Continue observing to unlock observatory circles'}`,
      `Badge archive: ${Object.keys(observatoryState.claimedMilestones).length} constellation titles claimed`
    ];
    cadence.innerHTML = items.map(item => `<li>${item}</li>`).join('');
  }
  if (products) products.innerHTML = DATA_PRODUCTS.map(item => `<li>${item}</li>`).join('');
  if (regions) regions.innerHTML = REGION_INCENTIVES.map(item => `<li>${item}</li>`).join('');
}

function recordObservation(event) {
  event.preventDefault();
  const selectedMood = document.querySelector('.mood-btn.active')?.dataset.label || 'Neutral';
  const note = document.getElementById('context-note').value.trim();
  const observation = {
    mood: selectedMood,
    intensity: Number(document.getElementById('intensity-range').value),
    scene: document.getElementById('scene-select').value,
    lens: document.getElementById('language-lens').value,
    cadence: document.getElementById('cadence-select').value,
    note,
    city: cities[document.getElementById('city-select').value].name,
    createdAt: new Date().toISOString()
  };
  observatoryState.observations.unshift(observation);
  observatoryState.observations = observatoryState.observations.slice(0, 24);
  saveObservatory();
  addStars(note ? 18 : 12);
  renderSignalPanels();
  document.getElementById('observation-feedback').textContent = t('observation_saved');
  if (observatoryState.pendingMoment) openConstellationMoment(observatoryState.pendingMoment);
}

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

// Multi-source Emotional Climate Engine
function synthesizeEmotionalTemperature(cityData) {
  // Fuse multiple sources into a single living temperature:
  // - Direct mood reports (40%)
  // - Conversational temperature (25%)
  // - Event signals (20%)
  // - Cross-city resonance (15%)
  const directMood = cityData.mood;
  const conversational = (cityData.dims[0] + cityData.dims[9]) / 2; // Mood + Community averages
  const eventSignal = cityData.dims[8]; // Events dimension
  const crossCityResonance = 7.3; // Global avg for now

  return (directMood * 0.4) + (conversational * 0.25) + (eventSignal * 0.2) + (crossCityResonance * 0.15);
}

// Barometer color based on mood temperature
function getBarometerState(mood) {
  if (mood >= 8.0) return { class: 'charged', label: 'Surging Energy', temp: 'Hot' };
  if (mood >= 7.2) return { class: 'warm', label: 'Expansive', temp: 'Warm' };
  if (mood >= 6.0) return { class: '', label: 'Equilibrium', temp: 'Balanced' };
  return { class: 'restrained', label: 'Reserved', temp: 'Cool' };
}

// Render the Living Barometer
function renderBarometer(mood, label) {
  const chamber = document.getElementById('barometer-chamber');
  const fluid = document.getElementById('barometer-fluid');
  const needle = document.getElementById('barometer-needle');
  const value = document.getElementById('barometer-value');
  const labelEl = document.getElementById('barometer-label');
  const state = getBarometerState(mood);

  // Update fluid height and color
  const height = Math.min(95, Math.max(10, mood * 12));
  fluid.style.height = height + '%';

  // Remove previous state classes
  fluid.className = 'barometer-fluid';
  if (state.class) fluid.classList.add(state.class);

  // Update chamber glow if ascending
  chamber.classList.remove('ascending');
  if (mood > 7.5) {
    setTimeout(() => chamber.classList.add('ascending'), 10);
  }

  // Update displays
  value.textContent = mood.toFixed(1);
  labelEl.textContent = state.label;

  // Animate needle
  needle.style.opacity = mood > 7.0 ? 1 : 0.4;
  needle.style.transform = `translateX(-50%) scaleY(${0.8 + (mood / 10) * 0.3})`;

  // Pressure graph (24-hour simulation)
  updatePressureGraph(mood);
}

function updatePressureGraph(currentMood) {
  const graph = document.getElementById('barometer-graph');
  if (!graph || graph.style.display === 'none') return;

  let points = (localStorage.getItem('pressure-history') || '').split(',').map(Number).filter(n => !isNaN(n));
  points.push(currentMood);
  if (points.length > 24) points = points.slice(-24);
  localStorage.setItem('pressure-history', points.join(','));

  const line = document.getElementById('pressure-line');
  const pointsStr = points.map((p, i) => `${(i/24)*240},${40 - (p/10)*40}`).join(' ');
  line.setAttribute('points', pointsStr);
}

// Time-based ambient lighting
function updateAmbientLighting() {
  const hour = new Date().getHours();
  let ambientClass = 'ambient-day';
  if (hour < 6) ambientClass = 'ambient-night';
  else if (hour < 12) ambientClass = 'ambient-morning';
  else if (hour < 17) ambientClass = 'ambient-day';
  else if (hour < 21) ambientClass = 'ambient-evening';
  else ambientClass = 'ambient-night';

  document.body.className = ambientClass;
}

function updateCity(selected) {
  const city = cities[selected];

  // Synthesize emotional temperature from multiple sources
  const synthesizedMood = synthesizeEmotionalTemperature(city);

  document.getElementById('city-name').textContent = city.name;
  document.getElementById('trip-city').textContent = city.name;

  // Render the Living Barometer
  renderBarometer(synthesizedMood, city.name);
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
  // Trip verdict using synthesized mood
  const verdictEl = document.getElementById('trip-verdict');
  const reasonEl = document.getElementById('trip-reason');
  if (synthesizedMood >= 7.8) {
    verdictEl.textContent = 'GO';
    verdictEl.className = 'verdict verdict-go';
    reasonEl.textContent = t('trip_go_reason');
  } else if (synthesizedMood >= 6.5) {
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
  if (stars > 500) rankEl.textContent = 'Founding Luminary';
  else if (stars > 200) rankEl.textContent = 'Observatory Circle';
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
  updateAmbientLighting();

  // Update ambient lighting periodically (every hour)
  setInterval(updateAmbientLighting, 3600000);

  document.getElementById('city-select').addEventListener('change', (e) => updateCity(e.target.value));
  loadStars();
  maybeTrackHumanVisit();
  renderConstellationWall();
  renderSignalPanels();
  if (observatoryState.pendingMoment) setTimeout(() => openConstellationMoment(observatoryState.pendingMoment), 800);

  const intensityRange = document.getElementById('intensity-range');
  const intensityValue = document.getElementById('intensity-value');
  intensityRange?.addEventListener('input', () => { intensityValue.textContent = intensityRange.value; });
  document.getElementById('observation-form')?.addEventListener('submit', recordObservation);

  // Mood check-in buttons with pulse animation
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(node => node.classList.remove('active'));
      btn.classList.add('active');

      const chamber = document.getElementById('barometer-chamber');
      if (chamber) {
        chamber.classList.remove('pulse');
        void chamber.offsetWidth;
        chamber.classList.add('pulse');
      }
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
function getCurrentFeaturedStory() {
  const ROTATION_DAYS = 7;
  const stories = (typeof STORIES !== 'undefined' && Array.isArray(STORIES)) ? STORIES : [];

  if (stories.length === 0) {
    localStorage.removeItem('featuredStoryIndex');
    localStorage.removeItem('lastRotationDate');
    return null;
  }

  let index = parseInt(localStorage.getItem('featuredStoryIndex') || '0', 10);
  if (isNaN(index) || index < 0 || index >= stories.length) index = 0;

  const lastRotation = localStorage.getItem('lastRotationDate') || '';
  const today = new Date().toISOString().slice(0, 10);
  const isValidRotationDate = /^\d{4}-\d{2}-\d{2}$/.test(lastRotation);
  const lastRotationDate = isValidRotationDate ? new Date(`${lastRotation}T00:00:00Z`) : null;

  if (!lastRotationDate || isNaN(lastRotationDate.getTime())) {
    localStorage.setItem('lastRotationDate', today);
    localStorage.setItem('featuredStoryIndex', String(index));
    return stories[index];
  }

  if (((new Date(`${today}T00:00:00Z`) - lastRotationDate) / 86400000) >= ROTATION_DAYS) {
    index = (index + 1) % stories.length;
    localStorage.setItem('featuredStoryIndex', String(index));
    localStorage.setItem('lastRotationDate', today);
  }

  return stories[index];
}

function loadDailyStory() {
  const storySection = document.getElementById('story-content');
  const fallback = document.getElementById('story-fallback');

  try {
    const story = getCurrentFeaturedStory();
    if (!story) throw new Error('No story available');

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
  } catch (e) {
    storySection.style.display = 'none';
    fallback.style.display = 'block';
  }
}
document.addEventListener('DOMContentLoaded', () => {
  // ... existing code like applyTranslations, resizeCanvas, etc.
  loadDailyStory(); // add this line
});
