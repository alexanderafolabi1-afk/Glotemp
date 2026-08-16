// Verticals i18n strings (loaded after app.js)

if (typeof translations !== 'undefined') {
  const verticalStrings = {
    en: {
      nav_cities: "Cities",
      nav_verticals: "Verticals",
      cities_title: "Global Cities Directory",
      cities_subtitle: "Live profiles of 151 cities.",
      cities_search_placeholder: "Search cities...",
      vertical_pulse: "Pulse",
      vertical_tech: "Tech",
      vertical_finance: "Finance",
      pulse_description: "How does it feel right now?",
      tech_description: "Should I build or work here?",
      finance_description: "Should I invest or trade here?",
      verticals_title: "Verticals",
      verticals_subtitle: "Live rankings across every dimension.",
      glotemp_logo: "Glotemp",
      ranking_note: "Rankings require a minimum sample size to publish.",
      show_details: "Show Details",
      what_is_pulse: "What is Pulse?",
      pulse_explanation: "Pulse measures the emotional temperature of a city right now. It combines submitted readings, sentiment analysis from global news streams (GDELT), and local event signals.",
      pulse_sources: "Data Sources",
      source_user_checkins: "User readings",
      source_user_checkins_desc: "Direct mood reports from travelers",
      source_sentiment: "GDELT Sentiment",
      source_sentiment_desc: "Global news and social media sentiment analysis",
      source_events: "Event Signals",
      source_events_desc: "Concert, festival, and cultural event calendars",
      tech_sources: "Data Sources",
      finance_sources: "Data Sources",
      ranking_data_building: "This vertical is reading quietly right now.",
      error_loading: "Error loading rankings. Please try again later.",
      loading: "Loading rankings...",
      footer_copyright: "© 2026 Glotemp. Live city intelligence.",
      compare_title: "Compare with Another City"
    },
    es: {
      nav_cities: "Ciudades",
      nav_verticals: "Verticales",
      cities_title: "Directorio Global de Ciudades",
      cities_subtitle: "Perfiles en vivo de 151 ciudades en 12 dimensiones.",
      cities_search_placeholder: "Buscar ciudades...",
      vertical_pulse: "Pulso",
      vertical_tech: "Tecnología",
      vertical_finance: "Finanzas",
      pulse_description: "¿Cómo se siente ahora mismo?",
      tech_description: "¿Debería construir o trabajar aquí?",
      finance_description: "¿Debería invertir o comerciar aquí?",
      verticals_title: "Verticales",
      verticals_subtitle: "Rankings en vivo en cada dimensión.",
      glotemp_logo: "Glotemp",
      ranking_note: "Los rankings requieren volumen mínimo de señal para publicar.",
      show_details: "Mostrar detalles",
      what_is_pulse: "¿Qué es el Pulso?",
      pulse_explanation: "El Pulso mide la temperatura emocional de una ciudad en este momento.",
      ranking_data_building: "Esta vertical está en calma ahora mismo.",
      error_loading: "Error al cargar los rankings.",
      loading: "Cargando rankings...",
      footer_copyright: "© 2026 Glotemp. Inteligencia de ciudades en vivo."
    },
    fr: {
      nav_cities: "Villes",
      nav_verticals: "Verticales",
      cities_title: "Répertoire mondial des villes",
      cities_subtitle: "Profils en direct de 151 villes sur 12 dimensions.",
      vertical_pulse: "Pouls",
      vertical_tech: "Tech",
      vertical_finance: "Finance",
      pulse_description: "Comment se sent cette ville maintenant?",
      tech_description: "Devrais-je construire ou travailler ici?",
      finance_description: "Devrais-je investir ou commercer ici?",
      footer_copyright: "© 2026 Glotemp. Intelligence des villes en direct."
    },
    de: {
      nav_cities: "Städte",
      nav_verticals: "Vertikalen",
      cities_title: "Globales Städteverzeichnis",
      cities_subtitle: "Live-Profile von 151 Städten über 12 Dimensionen.",
      vertical_pulse: "Puls",
      vertical_tech: "Tech",
      vertical_finance: "Finanzen",
      pulse_description: "Wie fühlt sich diese Stadt gerade an?",
      tech_description: "Sollte ich hier bauen oder arbeiten?",
      finance_description: "Sollte ich hier investieren oder handeln?",
      footer_copyright: "© 2026 Glotemp. Live-Stadtnachrichten."
    },
    pt: {
      nav_cities: "Cidades",
      nav_verticals: "Verticais",
      cities_title: "Diretório Global de Cidades",
      cities_subtitle: "Perfis ao vivo de 151 cidades em 12 dimensões.",
      vertical_pulse: "Pulso",
      vertical_tech: "Tecnologia",
      vertical_finance: "Finanças",
      pulse_description: "Como esta cidade se sente agora?",
      tech_description: "Devo construir ou trabalhar aqui?",
      finance_description: "Devo investir ou negociar aqui?",
      footer_copyright: "© 2026 Glotemp. Inteligência de cidades ao vivo."
    },
    ja: {
      nav_cities: "都市",
      nav_verticals: "垂直",
      cities_title: "グローバル都市ディレクトリ",
      cities_subtitle: "151都市の12次元のライブプロフィール。",
      vertical_pulse: "パルス",
      vertical_tech: "テック",
      vertical_finance: "ファイナンス",
      pulse_description: "この都市は今どう感じていますか?",
      tech_description: "ここで構築または仕事をすべきですか?",
      finance_description: "ここで投資または取引をすべきですか?",
      footer_copyright: "© 2026 Glotemp。ライブシティインテリジェンス。"
    }
  };

  // Extend existing translations
  for (const lang in verticalStrings) {
    if (translations[lang]) {
      translations[lang] = { ...translations[lang], ...verticalStrings[lang] };
    }
  }
}
