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
    scene_street: "Street",
    scene_work: "Work",
    scene_campus: "Campus",
    scene_cafe: "Café",
    scene_nightlife: "Nightlife",
    scene_transit: "Transit",
    scene_home: "Home",
    language_label: "Language lens",
    data_product_1: "Anonymous emotional climate feeds for researchers, cities, and cultural institutions",
    data_product_2: "Premium observatory archives with deeper historical city pulse windows",
    data_product_3: "Licensed City Climate Reports for tourism boards, hospitality groups, and transport planners",
    data_product_4: "Official node partnerships for cities, universities, and museums",
    data_product_5: "Native sponsorship foundations for refined constellation moments and observatory circles",
    region_incentive_1: "Africa & Middle East — event-aware prompts and multilingual context capture for rapidly shifting city scenes",
    region_incentive_2: "Europe — archive access and cultural season reports for repeat contributors across borders",
    region_incentive_3: "Asia-Pacific — local rhythm presets tuned for commuting, nightlife, campus, and festival cadence",
    region_incentive_4: "North America — city comparison briefs and premium observatory views for frequent travelers",
    region_incentive_5: "Latin America — neighbourhood storytelling and public wall invitations for culturally rich observations",
    milestone_title_1000: "Founding Observer – 1k",
    milestone_line_1000: "The first quiet thousand taught the instrument to listen.",
    milestone_title_2500: "Founding Observer – 2.5k",
    milestone_line_2500: "A wider ring of cities began to glow in sympathy.",
    milestone_title_5000: "Founding Observer – 5k",
    milestone_line_5000: "The atlas learned to hold many evenings at once.",
    milestone_title_10000: "Founding Observer – 10k",
    milestone_line_10000: "A new constellation formed in the disciplined dark.",
    milestone_title_25000: "Founding Observer – 25k",
    milestone_line_25000: "The observatory acquired a true planetary hum.",
    milestone_title_50000: "Founding Observer – 50k",
    milestone_line_50000: "Half a hundred thousand witnesses refined the signal.",
    milestone_title_100000: "Centenary Observer – 100k",
    milestone_line_100000: "One hundred thousand observers taught the sky a new geometry.",
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
    social_caption_prefix: "I claimed the {title} badge on @Glotemp — a quiet record of how cities feel in motion.",
    share_copied: "Caption copied for sharing.",
    automated_traffic_excluded: "Automated traffic excluded",
    select_mood_first: "Select a mood first.",
    social_login_feedback: "Social sign-in noted for this prototype. Complete the claim form to preserve your badge.",
    wall_default_note: "Quietly observing the movement of a city.",
    signal_human_confidence: "Human confidence score: {score}/{max}",
    signal_context_attached: "Recent note depth: Context attached",
    signal_signal_only: "Recent note depth: Signal only",
    signal_archive: "Observation archive: {count} recent entries saved locally",
    signal_geo_breadth_one: "Geographic breadth: {count} city lens observed",
    signal_geo_breadth_many: "Geographic breadth: {count} city lenses observed",
    signal_supporter_ready: "Supporter path: Observatory Circle ready",
    signal_supporter_progress: "Supporter path: Continue observing to unlock observatory circles",
    signal_badge_archive: "Badge archive: {count} constellation titles claimed",
    constellation_moment_eyebrow: "Constellation Moment",
    prototype_counter_notice: "Prototype note: observatory counts and badge thresholds are local to this device until a server-backed verification layer is introduced."
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
    read_more: "Leer más",
    checkin_eyebrow: "Ingreso de observación",
    checkin_intro: "Ofrece una señal discreta desde donde estás. Las observaciones más ricas profundizan el atlas sin romper el ritual.",
    intensity_label: "Intensidad",
    scene_label: "Escena",
    scene_street: "Calle",
    scene_work: "Trabajo",
    scene_campus: "Campus",
    scene_cafe: "Café",
    scene_nightlife: "Vida nocturna",
    scene_transit: "Tránsito",
    scene_home: "Casa",
    language_label: "Lente lingüística",
    cadence_label: "Cadencia de contribución",
    context_label: "Nota local opcional",
    context_placeholder: "Una observación breve, nota de evento o contexto emocional.",
    record_observation: "Registrar observación",
    human_signal_verified: "Señal humana verificada",
    contribution_quality_title: "Calidad de la señal",
    contribution_quality_copy: "El contexto sutil, la constancia y las notas multilingües aumentan el valor científico de cada entrada.",
    return_title: "Ruta de retorno",
    return_copy: "Las observaciones repetidas y diversas desbloquean reconocimiento, archivos más profundos e invitaciones curadas.",
    systems_eyebrow: "Sistemas del observatorio",
    systems_title: "Participación global, valor y patronazgo",
    systems_intro: "Diseñado como un instrumento privado: incorporación respetuosa, señales más ricas y vías de ingresos que preservan la confianza.",
    system_global_title: "Resonancia mundial",
    system_global_copy: "Los avisos sensibles al idioma, las escenas culturales y los ritmos locales hacen que participar se sienta nativo.",
    system_data_title: "Datos climáticos éticos",
    system_data_copy: "Prepara flujos anónimos para investigación, informes urbanos y alianzas institucionales con límites claros.",
    system_membership_title: "Patronazgo sereno",
    system_membership_copy: "Los círculos de apoyo y el acceso al archivo recompensan el cuidado sin convertir el producto en un juego.",
    data_products_eyebrow: "Productos de datos",
    data_products_title: "Arquitectura de ingresos preparada",
    geo_eyebrow: "Profundidad geográfica",
    geo_title: "Incentivos de participación por región",
    wall_eyebrow: "Muro de constelaciones",
    wall_title: "Observaciones seleccionadas del observatorio",
    wall_intro: "Un muro curado de portadores de insignias cuyas notas iluminan cómo se sentían las ciudades.",
    share_note_upgraded: "Quienes aportan con cuidado ayudan a que el atlas sea más preciso y confiable.",
    observation_saved: "Observación registrada.",
    observation_claim_prompt: "Tu insignia de constelación está lista para reclamarse.",
    badge_claim_cta: "Reclamar insignia",
    badge_download: "Descargar insignia",
    badge_share: "Compartir con discreción",
    badge_note_label: "Nota pública",
    badge_note_placeholder: "Una breve línea para el muro, si lo deseas.",
    badge_email_label: "Correo electrónico",
    badge_name_label: "Nombre visible",
    badge_social_label: "O continúa con",
    badge_story_invite: "¿Quieres que el observatorio considere esta nota para el Muro de Constelaciones?",
    premium_title: "Círculos del observatorio",
    premium_copy: "Los niveles de apoyo desbloquean archivos, informes anticipados, insignias privadas e invitaciones.",
    wall_empty: "El muro espera su próxima historia silenciosa.",
    observatory_moment_title: "Se ha formado una nueva constelación.",
    observatory_moment_subtitle: "Hemos alcanzado {milestone} observadores. El cielo ha cambiado.",
    observatory_moment_claimed: "Insignia reclamada. Bienvenido al muro.",
    social_caption_prefix: "Reclamé la insignia {title} en @Glotemp: un registro sereno de cómo se sienten las ciudades en movimiento.",
    share_copied: "Texto copiado para compartir.",
    automated_traffic_excluded: "Tráfico automatizado excluido",
    select_mood_first: "Selecciona un estado de ánimo primero.",
    social_login_feedback: "El acceso social se ha registrado para este prototipo. Completa el formulario para guardar tu insignia.",
    wall_default_note: "Observando en silencio el movimiento de una ciudad.",
    signal_human_confidence: "Nivel de confianza humana: {score}/{max}",
    signal_context_attached: "Profundidad reciente: contexto añadido",
    signal_signal_only: "Profundidad reciente: solo señal",
    signal_archive: "Archivo de observaciones: {count} entradas recientes guardadas localmente",
    signal_geo_breadth_one: "Amplitud geográfica: {count} lente de ciudad observada",
    signal_geo_breadth_many: "Amplitud geográfica: {count} lentes de ciudad observadas",
    signal_supporter_ready: "Ruta de apoyo: Círculo del Observatorio listo",
    signal_supporter_progress: "Ruta de apoyo: sigue observando para desbloquear los círculos del observatorio",
    signal_badge_archive: "Archivo de insignias: {count} títulos de constelación reclamados",
    constellation_moment_eyebrow: "Momento de constelación",
    prototype_counter_notice: "Nota del prototipo: los recuentos del observatorio y los hitos de insignias son locales a este dispositivo hasta que exista verificación en servidor."
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
    read_more: "En savoir plus",
    checkin_eyebrow: "Prise d'observation",
    checkin_intro: "Offrez un signal discret depuis votre position. Des observations plus riches approfondissent l'atlas sans rompre le rituel.",
    intensity_label: "Intensité",
    scene_label: "Scène",
    scene_street: "Rue",
    scene_work: "Travail",
    scene_campus: "Campus",
    scene_cafe: "Café",
    scene_nightlife: "Vie nocturne",
    scene_transit: "Transit",
    scene_home: "Domicile",
    language_label: "Perspective linguistique",
    cadence_label: "Cadence de contribution",
    context_label: "Note locale facultative",
    context_placeholder: "Une brève observation, une note d'événement ou un contexte émotionnel.",
    record_observation: "Enregistrer l'observation",
    human_signal_verified: "Signal humain vérifié",
    contribution_quality_title: "Qualité du signal",
    contribution_quality_copy: "Le contexte subtil, la régularité et les notes multilingues augmentent la valeur scientifique de chaque entrée.",
    return_title: "Parcours de retour",
    return_copy: "Les observations répétées et diversifiées débloquent reconnaissance, archives approfondies et invitations choisies.",
    systems_eyebrow: "Systèmes de l'observatoire",
    systems_title: "Participation mondiale, valeur et mécénat",
    systems_intro: "Conçu comme un instrument privé : intégration respectueuse, signaux plus riches et revenus qui préservent la confiance.",
    system_global_title: "Résonance mondiale",
    system_global_copy: "Les invites sensibles à la langue, les scènes culturelles et les rythmes locaux rendent la participation naturelle.",
    system_data_title: "Données climatiques éthiques",
    system_data_copy: "Préparez des flux anonymisés pour la recherche, des rapports urbains et des partenariats institutionnels avec des garde-fous clairs.",
    system_membership_title: "Mécénat discret",
    system_membership_copy: "Les cercles de soutien et l'accès aux archives récompensent l'attention sans gamifier l'expérience.",
    data_products_eyebrow: "Produits de données",
    data_products_title: "Architecture de revenus préparée",
    geo_eyebrow: "Profondeur géographique",
    geo_title: "Incitations par région",
    wall_eyebrow: "Mur des constellations",
    wall_title: "Observations choisies de l'observatoire",
    wall_intro: "Un mur raffiné de porteurs d'insignes dont les notes éclairent l'humeur des villes.",
    share_note_upgraded: "Les contributions attentives rendent l'atlas plus précis et digne de confiance.",
    observation_saved: "Observation enregistrée.",
    observation_claim_prompt: "Votre insigne de constellation est prêt à être réclamé.",
    badge_claim_cta: "Réclamer l'insigne",
    badge_download: "Télécharger l'insigne",
    badge_share: "Partager discrètement",
    badge_note_label: "Note publique",
    badge_note_placeholder: "Une courte phrase pour le mur, si vous le souhaitez.",
    badge_email_label: "E-mail",
    badge_name_label: "Nom affiché",
    badge_social_label: "Ou continuer avec",
    badge_story_invite: "Souhaitez-vous que l'observatoire étudie cette note pour le Mur des Constellations ?",
    premium_title: "Cercles de l'observatoire",
    premium_copy: "Les niveaux de soutien ouvrent les archives, les briefings anticipés, les insignes privés et les invitations.",
    wall_empty: "Le mur attend sa prochaine histoire silencieuse.",
    observatory_moment_title: "Une nouvelle constellation s'est formée.",
    observatory_moment_subtitle: "Nous avons atteint {milestone} observateurs. Le ciel a changé.",
    observatory_moment_claimed: "Insigne réclamé. Bienvenue sur le mur.",
    social_caption_prefix: "J'ai réclamé l'insigne {title} sur @Glotemp — un relevé discret de la manière dont les villes se sentent en mouvement.",
    share_copied: "Texte copié pour le partage.",
    automated_traffic_excluded: "Trafic automatisé exclu",
    select_mood_first: "Sélectionnez d'abord une humeur.",
    social_login_feedback: "La connexion sociale a été notée pour ce prototype. Complétez le formulaire pour conserver votre insigne.",
    wall_default_note: "Observer en silence le mouvement d'une ville.",
    signal_human_confidence: "Niveau de confiance humaine : {score}/{max}",
    signal_context_attached: "Profondeur récente : contexte ajouté",
    signal_signal_only: "Profondeur récente : signal seul",
    signal_archive: "Archive d'observations : {count} entrées récentes enregistrées localement",
    signal_geo_breadth_one: "Amplitude géographique : {count} regard urbain observé",
    signal_geo_breadth_many: "Amplitude géographique : {count} regards urbains observés",
    signal_supporter_ready: "Parcours soutien : Cercle de l'Observatoire prêt",
    signal_supporter_progress: "Parcours soutien : poursuivez pour débloquer les cercles de l'observatoire",
    signal_badge_archive: "Archive d'insignes : {count} titres de constellation réclamés",
    constellation_moment_eyebrow: "Moment Constellation",
    prototype_counter_notice: "Note prototype : les comptages et paliers d'insignes restent locaux à cet appareil jusqu'à l'arrivée d'une vérification serveur."
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
    read_more: "Mehr lesen",
    checkin_eyebrow: "Beobachtungseingang",
    checkin_intro: "Sende ein leises Signal von deinem Standort. Reichere Beobachtungen vertiefen den Atlas, ohne das Ritual zu stören.",
    intensity_label: "Intensität",
    scene_label: "Szene",
    scene_street: "Straße",
    scene_work: "Arbeit",
    scene_campus: "Campus",
    scene_cafe: "Café",
    scene_nightlife: "Nachtleben",
    scene_transit: "Transit",
    scene_home: "Zuhause",
    language_label: "Sprachperspektive",
    cadence_label: "Beitragsrhythmus",
    context_label: "Optionale lokale Notiz",
    context_placeholder: "Eine kurze Beobachtung, Ereignisnotiz oder Stimmungskontext.",
    record_observation: "Beobachtung speichern",
    human_signal_verified: "Menschliches Signal verifiziert",
    contribution_quality_title: "Signalqualität",
    contribution_quality_copy: "Subtiler Kontext, Wiederholung und mehrsprachige Notizen erhöhen den wissenschaftlichen Wert jeder Eingabe.",
    return_title: "Rückkehrpfad",
    return_copy: "Wiederholte und geografisch vielfältige Beobachtungen eröffnen Anerkennung, tiefere Archive und kuratierte Einladungen.",
    systems_eyebrow: "Observatoriumssysteme",
    systems_title: "Globale Teilnahme, Wert und Patronage",
    systems_intro: "Wie ein privates Instrument gestaltet: respektvolle Teilnahme, reichere Signale und Erlöswege, die Vertrauen bewahren.",
    system_global_title: "Weltweite Resonanz",
    system_global_copy: "Sprachsensible Hinweise, kulturelle Szenen und lokale Rhythmen lassen Teilnahme überall natürlich wirken.",
    system_data_title: "Ethische Klimadaten",
    system_data_copy: "Anonymisierte Forschungsfeeds, Stadtberichte und institutionelle Partnerschaften mit klaren Leitplanken vorbereiten.",
    system_membership_title: "Stille Patronage",
    system_membership_copy: "Unterstützerkreise und Archivzugang belohnen Sorgfalt, ohne das Produkt zu gamifizieren.",
    data_products_eyebrow: "Datenprodukte",
    data_products_title: "Vorbereitete Erlösarchitektur",
    geo_eyebrow: "Geografische Tiefe",
    geo_title: "Teilnahmeanreize nach Region",
    wall_eyebrow: "Konstellationswand",
    wall_title: "Ausgewählte Beobachtungen des Observatoriums",
    wall_intro: "Eine kuratierte Wand von Abzeichen-Trägern, deren Notizen zeigen, wie sich Städte anfühlten.",
    share_note_upgraded: "Wer sorgfältig beiträgt, macht den Atlas präziser und vertrauenswürdiger.",
    observation_saved: "Beobachtung gespeichert.",
    observation_claim_prompt: "Dein Konstellationsabzeichen ist bereit zur Beanspruchung.",
    badge_claim_cta: "Abzeichen beanspruchen",
    badge_download: "Abzeichen herunterladen",
    badge_share: "Still teilen",
    badge_note_label: "Öffentliche Notiz",
    badge_note_placeholder: "Eine kurze Zeile für die Wand, falls du möchtest.",
    badge_email_label: "E-Mail",
    badge_name_label: "Anzeigename",
    badge_social_label: "Oder fortfahren mit",
    badge_story_invite: "Soll das Observatorium diese Notiz für die Konstellationswand prüfen?",
    premium_title: "Observatoriumskreise",
    premium_copy: "Unterstützerstufen öffnen Archive, Frühbriefings, private Abzeichen und Einladungen.",
    wall_empty: "Die Wand wartet auf ihre nächste stille Geschichte.",
    observatory_moment_title: "Eine neue Konstellation hat sich gebildet.",
    observatory_moment_subtitle: "Wir haben {milestone} Beobachter erreicht. Der Himmel hat sich verändert.",
    observatory_moment_claimed: "Abzeichen beansprucht. Willkommen an der Wand.",
    social_caption_prefix: "Ich habe das Abzeichen {title} auf @Glotemp beansprucht — ein leiser Nachweis dafür, wie sich Städte in Bewegung anfühlen.",
    share_copied: "Text zum Teilen kopiert.",
    automated_traffic_excluded: "Automatisierter Traffic ausgeschlossen",
    select_mood_first: "Bitte zuerst eine Stimmung wählen.",
    social_login_feedback: "Soziale Anmeldung für diesen Prototyp vermerkt. Fülle das Formular aus, um dein Abzeichen zu sichern.",
    wall_default_note: "Beobachtet still die Bewegung einer Stadt.",
    signal_human_confidence: "Menschliche Vertrauenswertung: {score}/{max}",
    signal_context_attached: "Jüngste Notizentiefe: Kontext hinzugefügt",
    signal_signal_only: "Jüngste Notizentiefe: Nur Signal",
    signal_archive: "Beobachtungsarchiv: {count} aktuelle Einträge lokal gespeichert",
    signal_geo_breadth_one: "Geografische Breite: {count} Stadtlinse beobachtet",
    signal_geo_breadth_many: "Geografische Breite: {count} Stadtlinsen beobachtet",
    signal_supporter_ready: "Unterstützerpfad: Observatoriumskreis bereit",
    signal_supporter_progress: "Unterstützerpfad: Weiter beobachten, um Observatoriumskreise freizuschalten",
    signal_badge_archive: "Abzeichenarchiv: {count} Konstellationstitel beansprucht",
    constellation_moment_eyebrow: "Konstellationsmoment",
    prototype_counter_notice: "Prototyp-Hinweis: Observatoriumszähler und Abzeichen-Schwellen gelten lokal auf diesem Gerät, bis eine serverseitige Verifizierung ergänzt wird."
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
    read_more: "Ler mais",
    checkin_eyebrow: "Entrada de observação",
    checkin_intro: "Ofereça um sinal discreto de onde você está. Observações mais ricas aprofundam o atlas sem quebrar o ritual.",
    intensity_label: "Intensidade",
    scene_label: "Cena",
    scene_street: "Rua",
    scene_work: "Trabalho",
    scene_campus: "Campus",
    scene_cafe: "Café",
    scene_nightlife: "Vida noturna",
    scene_transit: "Trânsito",
    scene_home: "Casa",
    language_label: "Lente linguística",
    cadence_label: "Cadência de contribuição",
    context_label: "Nota local opcional",
    context_placeholder: "Uma breve observação, nota de evento ou contexto emocional.",
    record_observation: "Registrar observação",
    human_signal_verified: "Sinal humano verificado",
    contribution_quality_title: "Qualidade do sinal",
    contribution_quality_copy: "Contexto sutil, constância e notas multilíngues aumentam o valor científico de cada entrada.",
    return_title: "Caminho de retorno",
    return_copy: "Observações repetidas e geograficamente diversas desbloqueiam reconhecimento, arquivos mais profundos e convites curados.",
    systems_eyebrow: "Sistemas do observatório",
    systems_title: "Participação global, valor e patronato",
    systems_intro: "Projetado como um instrumento privado: entrada respeitosa, sinais mais ricos e receitas que preservam a confiança.",
    system_global_title: "Ressonância mundial",
    system_global_copy: "Prompts sensíveis ao idioma, cenas culturais e ritmos locais fazem a participação parecer nativa.",
    system_data_title: "Dados climáticos éticos",
    system_data_copy: "Prepare fluxos anónimos para pesquisa, relatórios urbanos e parcerias institucionais com salvaguardas claras.",
    system_membership_title: "Patronato discreto",
    system_membership_copy: "Círculos de apoio e acesso ao arquivo recompensam o cuidado sem gamificar o produto.",
    data_products_eyebrow: "Produtos de dados",
    data_products_title: "Arquitetura de receita preparada",
    geo_eyebrow: "Profundidade geográfica",
    geo_title: "Incentivos por região",
    wall_eyebrow: "Mural de constelações",
    wall_title: "Observações selecionadas do observatório",
    wall_intro: "Um mural curado de portadores de insígnias cujas notas iluminam como as cidades se sentiam.",
    share_note_upgraded: "Quem contribui com cuidado ajuda o atlas a tornar-se mais preciso e confiável.",
    observation_saved: "Observação registrada.",
    observation_claim_prompt: "Sua insígnia de constelação está pronta para ser reivindicada.",
    badge_claim_cta: "Reivindicar insígnia",
    badge_download: "Baixar insígnia",
    badge_share: "Compartilhar discretamente",
    badge_note_label: "Nota pública",
    badge_note_placeholder: "Uma linha breve para o mural, se desejar.",
    badge_email_label: "E-mail",
    badge_name_label: "Nome de exibição",
    badge_social_label: "Ou continue com",
    badge_story_invite: "Deseja que o observatório considere esta nota para o Mural de Constelações?",
    premium_title: "Círculos do observatório",
    premium_copy: "Níveis de apoio desbloqueiam arquivos, briefings antecipados, insígnias privadas e convites.",
    wall_empty: "O mural aguarda sua próxima história silenciosa.",
    observatory_moment_title: "Uma nova constelação se formou.",
    observatory_moment_subtitle: "Alcançámos {milestone} observadores. O céu mudou.",
    observatory_moment_claimed: "Insígnia reivindicada. Bem-vindo ao mural.",
    social_caption_prefix: "Reivindiquei a insígnia {title} no @Glotemp — um registo sereno de como as cidades se sentem em movimento.",
    share_copied: "Texto copiado para partilha.",
    automated_traffic_excluded: "Tráfego automatizado excluído",
    select_mood_first: "Selecione primeiro um humor.",
    social_login_feedback: "O login social foi registado para este protótipo. Complete o formulário para guardar a sua insígnia.",
    wall_default_note: "Observando em silêncio o movimento de uma cidade.",
    signal_human_confidence: "Nível de confiança humana: {score}/{max}",
    signal_context_attached: "Profundidade recente: contexto adicionado",
    signal_signal_only: "Profundidade recente: apenas sinal",
    signal_archive: "Arquivo de observações: {count} entradas recentes guardadas localmente",
    signal_geo_breadth_one: "Amplitude geográfica: {count} lente urbana observada",
    signal_geo_breadth_many: "Amplitude geográfica: {count} lentes urbanas observadas",
    signal_supporter_ready: "Caminho de apoio: Círculo do Observatório pronto",
    signal_supporter_progress: "Caminho de apoio: continue a observar para desbloquear os círculos do observatório",
    signal_badge_archive: "Arquivo de insígnias: {count} títulos de constelação reivindicados",
    constellation_moment_eyebrow: "Momento de Constelação",
    prototype_counter_notice: "Nota do protótipo: as contagens do observatório e os marcos de insígnias são locais neste dispositivo até existir verificação no servidor."
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
    read_more: "続きを読む",
    checkin_eyebrow: "観測入力",
    checkin_intro: "今いる場所から静かなシグナルを届けてください。より豊かな観測は儀式を壊さずにアトラスを深めます。",
    intensity_label: "強度",
    scene_label: "シーン",
    scene_street: "街頭",
    scene_work: "職場",
    scene_campus: "キャンパス",
    scene_cafe: "カフェ",
    scene_nightlife: "ナイトライフ",
    scene_transit: "交通機関",
    scene_home: "自宅",
    language_label: "言語レンズ",
    cadence_label: "投稿リズム",
    context_label: "任意のローカルメモ",
    context_placeholder: "短い観測、イベントメモ、または感情の背景。",
    record_observation: "観測を記録",
    human_signal_verified: "人間のシグナルを確認",
    contribution_quality_title: "シグナルの質",
    contribution_quality_copy: "繊細な文脈、継続性、多言語メモが各入力の科学的価値を高めます。",
    return_title: "継続への道",
    return_copy: "反復的で地理的に多様な観測は、認知、より深いアーカイブ、選ばれた招待につながります。",
    systems_eyebrow: "観測所システム",
    systems_title: "世界参加・価値・支援",
    systems_intro: "信頼を守る私的な計器として設計。丁寧な参加導線、豊かなシグナル、倫理的な収益経路を備えます。",
    system_global_title: "世界的な共鳴",
    system_global_copy: "言語に配慮した案内、文化的シーン、地域リズムにより、どこでも自然に参加できます。",
    system_data_title: "倫理的な気候データ",
    system_data_copy: "匿名研究フィード、都市レポート、制度的ノード提携のための基盤を明確なガードレール付きで準備します。",
    system_membership_title: "静かな支援",
    system_membership_copy: "サポーターサークルとアーカイブアクセスは、製品をゲーム化せずに配慮を報います。",
    data_products_eyebrow: "データプロダクト",
    data_products_title: "準備された収益アーキテクチャ",
    geo_eyebrow: "地理的な深度",
    geo_title: "地域別の参加インセンティブ",
    wall_eyebrow: "コンステレーション・ウォール",
    wall_title: "観測所が選んだ観測記録",
    wall_intro: "都市がどう感じられたかを照らす、バッジ保持者のノートを集めた洗練された壁です。",
    share_note_upgraded: "丁寧な投稿は、アトラスをより正確で信頼できるものにします。",
    observation_saved: "観測を記録しました。",
    observation_claim_prompt: "あなたのコンステレーション・バッジを受け取れます。",
    badge_claim_cta: "バッジを受け取る",
    badge_download: "バッジをダウンロード",
    badge_share: "静かに共有",
    badge_note_label: "公開ノート",
    badge_note_placeholder: "希望する場合は壁に添える短い一文。",
    badge_email_label: "メール",
    badge_name_label: "表示名",
    badge_social_label: "または次で続行",
    badge_story_invite: "このノートをコンステレーション・ウォール候補として観測所に送りますか？",
    premium_title: "観測所サークル",
    premium_copy: "支援レベルにより、アーカイブ、先行ブリーフィング、限定バッジ、招待が解放されます。",
    wall_empty: "壁は次の静かな物語を待っています。",
    observatory_moment_title: "新しい星座が生まれました。",
    observatory_moment_subtitle: "{milestone}人の観測者に到達しました。空の形が変わりました。",
    observatory_moment_claimed: "バッジを受け取りました。ウォールへようこそ。",
    social_caption_prefix: "@Glotempで{title}バッジを受け取りました。都市が動きの中でどう感じられるかを静かに記録するしるしです。",
    share_copied: "共有用の文面をコピーしました。",
    automated_traffic_excluded: "自動トラフィックを除外しました",
    select_mood_first: "先にムードを選んでください。",
    social_login_feedback: "このプロトタイプではソーシャルサインインを記録しました。バッジを残すにはフォームを完了してください。",
    wall_default_note: "都市の動きを静かに見つめています。",
    signal_human_confidence: "人間シグナル信頼度: {score}/{max}",
    signal_context_attached: "直近のメモ深度: 文脈あり",
    signal_signal_only: "直近のメモ深度: シグナルのみ",
    signal_archive: "観測アーカイブ: 最近の{count}件をローカル保存",
    signal_geo_breadth_one: "地理的広がり: {count}都市レンズを観測",
    signal_geo_breadth_many: "地理的広がり: {count}都市レンズを観測",
    signal_supporter_ready: "支援経路: 観測所サークルの準備完了",
    signal_supporter_progress: "支援経路: 観測を続けて観測所サークルを解放",
    signal_badge_archive: "バッジ記録: {count}件の星座称号を取得",
    constellation_moment_eyebrow: "コンステレーション・モーメント",
    prototype_counter_notice: "プロトタイプ注記: 観測数とバッジ到達条件は、サーバー検証層が導入されるまでこの端末内だけで管理されます。"
  }
};

// ===== TEMPO ECONOMY TRANSLATIONS =====
// Add these to each language
const tempoEconomyStrings = {
  en: {
    comment_title: "Comments & Pulse",
    comment_placeholder: "Share what you're feeling about this city (max 280 chars)",
    submit_comment: "Submit Comment",
    top_reporters: "🏆 Top Reporters",
    reporter_rank: "Rank",
    your_stars: "Your Stars",
    book_hotel: "Book a Hotel",
    find_flights: "Find Flights",
    travel_insurance: "Get Insurance",
    sponsored: "Sponsored",
    discover_local: "Discover local experiences in",
    city_mood_updated: "City mood updated",
    no_comments: "No comments yet. Be the first to share!",
    timestamp: "just now"
  },
  es: {
    comment_title: "Comentarios y Pulso",
    comment_placeholder: "Comparte lo que sientes sobre esta ciudad (máx 280 caracteres)",
    submit_comment: "Enviar Comentario",
    top_reporters: "🏆 Reporteros Principales",
    reporter_rank: "Rango",
    your_stars: "Tus Estrellas",
    book_hotel: "Reservar Hotel",
    find_flights: "Encontrar Vuelos",
    travel_insurance: "Obtener Seguro",
    sponsored: "Patrocinado",
    discover_local: "Descubre experiencias locales en",
    city_mood_updated: "Estado de ánimo de la ciudad actualizado",
    no_comments: "Sin comentarios aún. ¡Sé el primero en compartir!",
    timestamp: "hace poco"
  },
  fr: {
    comment_title: "Commentaires et Pouls",
    comment_placeholder: "Partagez ce que vous ressentez à propos de cette ville (max 280 caractères)",
    submit_comment: "Soumettre un Commentaire",
    top_reporters: "🏆 Meilleurs Reporters",
    reporter_rank: "Rang",
    your_stars: "Vos Étoiles",
    book_hotel: "Réserver un Hôtel",
    find_flights: "Trouver des Vols",
    travel_insurance: "Obtenir une Assurance",
    sponsored: "Sponsorisé",
    discover_local: "Découvrez les expériences locales à",
    city_mood_updated: "Humeur de la ville mise à jour",
    no_comments: "Pas encore de commentaires. Soyez le premier à partager!",
    timestamp: "à l'instant"
  },
  de: {
    comment_title: "Kommentare und Puls",
    comment_placeholder: "Teilen Sie, was Sie in dieser Stadt fühlen (max 280 Zeichen)",
    submit_comment: "Kommentar Einreichen",
    top_reporters: "🏆 Top-Reporter",
    reporter_rank: "Rang",
    your_stars: "Ihre Sterne",
    book_hotel: "Hotel Buchen",
    find_flights: "Flüge Finden",
    travel_insurance: "Versicherung Erhalten",
    sponsored: "Gesponsert",
    discover_local: "Entdecken Sie lokale Erlebnisse in",
    city_mood_updated: "Stimmung der Stadt aktualisiert",
    no_comments: "Noch keine Kommentare. Seien Sie der Erste, der teilt!",
    timestamp: "gerade eben"
  },
  pt: {
    comment_title: "Comentários e Pulso",
    comment_placeholder: "Compartilhe o que você sente sobre esta cidade (máx 280 caracteres)",
    submit_comment: "Enviar Comentário",
    top_reporters: "🏆 Melhores Repórteres",
    reporter_rank: "Classificação",
    your_stars: "Suas Estrelas",
    book_hotel: "Reservar Hotel",
    find_flights: "Encontrar Voos",
    travel_insurance: "Obter Seguro",
    sponsored: "Patrocinado",
    discover_local: "Descubra experiências locais em",
    city_mood_updated: "Humor da cidade atualizado",
    no_comments: "Ainda sem comentários. Seja o primeiro a compartilhar!",
    timestamp: "agora mesmo"
  },
  ja: {
    comment_title: "コメントとパルス",
    comment_placeholder: "この都市についてどう感じているか共有してください（最大280文字）",
    submit_comment: "コメント送信",
    top_reporters: "🏆 トップレポーター",
    reporter_rank: "ランク",
    your_stars: "あなたのスター",
    book_hotel: "ホテルを予約",
    find_flights: "フライトを検索",
    travel_insurance: "保険を取得",
    sponsored: "スポンサー付き",
    discover_local: "の地元体験を発見",
    city_mood_updated: "都市の気分が更新されました",
    no_comments: "まだコメントなし。最初に共有してください！",
    timestamp: "たった今"
  }
};

// Merge tempo economy strings into translations
Object.keys(tempoEconomyStrings).forEach(lang => {
  translations[lang] = { ...translations[lang], ...tempoEconomyStrings[lang] };
});

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
      el.innerHTML = t(key).replace('<strong></strong>', `<strong>${document.getElementById('trip-city')?.textContent || ''}</strong>`);
    } else {
      el.textContent = t(key);
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    el.setAttribute('placeholder', t(key));
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
const HUMAN_CONFIDENCE_MAX = 15;
const DEFAULT_HUMAN_COUNT = 0;
const MILESTONE_META = {
  1000: { metal: 'rose-gold', titleKey: 'milestone_title_1000', lineKey: 'milestone_line_1000' },
  2500: { metal: 'silver', titleKey: 'milestone_title_2500', lineKey: 'milestone_line_2500' },
  5000: { metal: 'rose-gold', titleKey: 'milestone_title_5000', lineKey: 'milestone_line_5000' },
  10000: { metal: 'platinum', titleKey: 'milestone_title_10000', lineKey: 'milestone_line_10000' },
  25000: { metal: 'silver', titleKey: 'milestone_title_25000', lineKey: 'milestone_line_25000' },
  50000: { metal: 'platinum', titleKey: 'milestone_title_50000', lineKey: 'milestone_line_50000' },
  100000: { metal: 'platinum', titleKey: 'milestone_title_100000', lineKey: 'milestone_line_100000' }
};
function getDataProducts() {
  return [1, 2, 3, 4, 5].map(n => t(`data_product_${n}`));
}
function getRegionIncentives() {
  return [1, 2, 3, 4, 5].map(n => t(`region_incentive_${n}`));
}

function getStoredObservatory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OBSERVATORY_STORAGE_KEY) || '{}');
    return {
      humanCount: typeof parsed.humanCount === 'number' ? parsed.humanCount : DEFAULT_HUMAN_COUNT,
      sessionTracked: Boolean(parsed.sessionTracked),
      claimedMilestones: parsed.claimedMilestones || {},
      profiles: parsed.profiles || [],
      pendingMoment: parsed.pendingMoment || null,
      observations: parsed.observations || [],
      humanConfidence: typeof parsed.humanConfidence === 'number' ? parsed.humanConfidence : 0
    };
  } catch (error) {
    return { humanCount: DEFAULT_HUMAN_COUNT, sessionTracked: false, claimedMilestones: {}, profiles: [], pendingMoment: null, observations: [], humanConfidence: 0 };
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

  const human = score >= 9 && signals.length < 2 && !signals.includes('ua');
  observatoryState.humanConfidence = score;
  saveObservatory();
  return { human, score, signals };
}

function chooseMilestone(count) {
  return BADGE_MILESTONES.find(m => m === count) || null;
}

function maybeTrackHumanVisit() {
  const assessment = assessHumanVisitor();
  observatoryState.humanConfidence = assessment.score;
  const pill = document.getElementById('human-signal-pill');
  if (pill) {
    pill.textContent = assessment.human ? t('human_signal_verified') : t('automated_traffic_excluded');
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
    title: t(meta.titleKey),
    line: t(meta.lineKey),
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
      <p class="eyebrow">${t('constellation_moment_eyebrow')}</p>
      <h2 id="constellation-title"></h2>
      <p id="constellation-copy" class="section-copy"></p>
      <p id="prototype-counter-note" class="small-print section-copy"></p>
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
    document.getElementById('badge-feedback').textContent = `${btn.dataset.provider}: ${t('social_login_feedback')}`;
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
  document.getElementById('prototype-counter-note').textContent = t('prototype_counter_notice');
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
  const title = meta ? t(meta.titleKey) : 'Glotemp observer';
  const text = t('social_caption_prefix').replace('{title}', title);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Glotemp Observatory', text, url: window.location.href + '#constellation-wall' });
      return;
    } catch (error) {
      if (error?.name && error.name !== 'AbortError') {
        console.warn('Share failed, falling back to clipboard.', error);
      }
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    document.getElementById('badge-feedback').textContent = t('share_copied');
  } catch (error) {
    document.getElementById('badge-feedback').textContent = text;
  }
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
    title: t(meta.titleKey),
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
  const visibleProfiles = observatoryState.profiles.filter(profile => profile.optedIn);
  if (!visibleProfiles.length) {
    wall.innerHTML = '';
    const empty = document.createElement('p');
    empty.className = 'wall-empty';
    empty.textContent = t('wall_empty');
    wall.appendChild(empty);
    return;
  }
  wall.innerHTML = '';
  visibleProfiles.forEach((profile) => {
    const card = document.createElement('article');
    card.className = 'wall-card';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = profile.title;
    const heading = document.createElement('h3');
    heading.textContent = profile.name;
    const city = document.createElement('p');
    city.className = 'wall-city';
    city.textContent = profile.city;
    const note = document.createElement('p');
    note.className = 'wall-note';
    note.textContent = profile.note || t('wall_default_note');
    const date = document.createElement('span');
    date.className = 'wall-date';
    date.textContent = new Date(profile.claimedAt).toLocaleDateString();
    card.append(eyebrow, heading, city, note, date);
    wall.appendChild(card);
  });
}

function renderSignalPanels() {
  const quality = document.getElementById('quality-indicators');
  const cadence = document.getElementById('cadence-indicators');
  const products = document.getElementById('product-list');
  const regions = document.getElementById('region-list');
  if (quality) {
    const last = observatoryState.observations[0];
    const items = [
      t('signal_human_confidence').replace('{score}', observatoryState.humanConfidence).replace('{max}', HUMAN_CONFIDENCE_MAX),
      last?.note ? t('signal_context_attached') : t('signal_signal_only'),
      t('signal_archive').replace('{count}', observatoryState.observations.length)
    ];
    quality.innerHTML = items.map(item => `<li>${item}</li>`).join('');
  }
  if (cadence) {
    const uniqueCities = new Set(observatoryState.observations.map(item => item.city)).size;
    const items = [
      t(uniqueCities === 1 ? 'signal_geo_breadth_one' : 'signal_geo_breadth_many').replace('{count}', uniqueCities),
      observatoryState.observations.length >= 5 ? t('signal_supporter_ready') : t('signal_supporter_progress'),
      t('signal_badge_archive').replace('{count}', Object.keys(observatoryState.claimedMilestones).length)
    ];
    cadence.innerHTML = items.map(item => `<li>${item}</li>`).join('');
  }
  if (products) products.innerHTML = getDataProducts().map(item => `<li>${item}</li>`).join('');
  if (regions) regions.innerHTML = getRegionIncentives().map(item => `<li>${item}</li>`).join('');
}

function recordObservation(event) {
  event.preventDefault();
  const activeMood = document.querySelector('.mood-btn.active');
  if (!activeMood) {
    document.getElementById('observation-feedback').textContent = t('select_mood_first');
    return;
  }
  const note = document.getElementById('context-note').value.trim();
  const selectedMood = activeMood.dataset.label;
  const observation = {
    mood: selectedMood,
    intensity: Number(document.getElementById('intensity-range').value),
    scene: document.getElementById('scene-select').value,
    lens: document.getElementById('language-lens').value,
    cadence: document.getElementById('cadence-select').value,
    note,
    city: cities[document.getElementById('city-select')?.value || 'nyc']?.name || 'New York',
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

  // Apply mood-responsive background tinting (0-10 scale)
  // Cool mood (0-5): shift towards blue, desaturate
  // Neutral (5-7.5): minimal tint
  // Warm mood (7.5-10): shift towards orange/red, increase saturation
  const moodNormalized = synthesizedMood / 10; // 0-1 scale
  const hueShift = (moodNormalized - 0.5) * 120; // -60 to +60 degrees
  const saturation = 0.8 + (Math.abs(moodNormalized - 0.5) * 0.6); // 0.8-1.1 based on distance from neutral

  document.documentElement.style.setProperty('--mood-hue', `${hueShift}deg`);
  document.documentElement.style.setProperty('--mood-saturation', saturation.toFixed(2));

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
  // Update affiliate links with city name
  if (typeof updateAffiliateLinks === 'function') {
    updateAffiliateLinks(city.name);
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

  // Service worker registration and update handling
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        let updateCheckNeeded = true;

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller && updateCheckNeeded) {
              updateCheckNeeded = false;
              newWorker.postMessage({ type: 'SKIP_WAITING' });

              // Reload page once to activate new service worker
              let reloadScheduled = false;
              navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!reloadScheduled) {
                  reloadScheduled = true;
                  window.location.reload();
                }
              });
            }
          });
        });

        // Check for updates periodically (every 10 seconds)
        setInterval(() => {
          registration.update();
        }, 10000);
      })
      .catch(error => console.error('ServiceWorker registration failed:', error));
  }
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

function renderStoryImage(story) {
  if (!story.image) {
    return `<div class="card-placeholder">
      <div class="card-placeholder-content">
        <div class="card-placeholder-name">${story.city}</div>
      </div>
    </div>`;
  }

  const imageName = story.image;
  return `<picture class="card-media">
    <source srcset="assets/art/${imageName}-1200.avif 1200w, assets/art/${imageName}-600.avif 600w" type="image/avif" />
    <source srcset="assets/art/${imageName}-1200.webp 1200w, assets/art/${imageName}-600.webp 600w" type="image/webp" />
    <img src="assets/art/${imageName}-1200.png"
         srcset="assets/art/${imageName}-1200.png 1200w, assets/art/${imageName}-600.png 600w"
         alt="${story.imageAlt || story.city}"
         width="1200"
         height="800"
         loading="eager"
         decoding="async" />
  </picture>`;
}

function loadDailyStory() {
  const storySection = document.getElementById('story-content');
  const fallback = document.getElementById('story-fallback');

  try {
    const story = getCurrentFeaturedStory();
    if (!story) throw new Error('No story available');

    const storyImageContainer = document.getElementById('story-image');
    if (storyImageContainer) {
      storyImageContainer.innerHTML = renderStoryImage(story);
    }

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
  } catch (e) {
    storySection.style.display = 'none';
    fallback.style.display = 'block';
  }
}
document.addEventListener('DOMContentLoaded', () => {
  // ... existing code like applyTranslations, resizeCanvas, etc.
  loadDailyStory(); // add this line
});
