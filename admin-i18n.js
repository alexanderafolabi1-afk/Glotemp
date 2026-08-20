// Admin i18n: same shape as verticals-i18n.js (a translations object keyed
// by language, each value a flat key -> string map, looked up through a
// t(key, fallback) helper) -- reused rather than reinvented. The one
// difference is this file supplies its OWN translations object and t(),
// instead of extending the sitewide one from app.js: admin/index.html is a
// private, standalone page that deliberately does not load app.js (see its
// own header comment -- no public nav, no homepage weight), so there is no
// existing `translations`/`t()` to extend here. Same pattern, self-contained
// because the host page is self-contained.
//
// Covers only the private contributor-tier and outreach copy /admin needs.
// Everything else in /admin is already English-only inline strings; this
// file does not attempt to translate the whole dashboard, just the new
// surface that introduced a "reuse the i18n pattern" requirement.
(function () {
  'use strict';

  var translations = {
    en: {
      adm_tier_voice: 'Voice',
      adm_tier_keeper: 'Keeper',
      adm_tier_founder: 'Founder',
      adm_contributors_eyebrow: 'Private, admin-only',
      adm_contributors_title: 'Contributor tiers',
      adm_contributors_copy: 'Voice / Keeper / Founder, computed from check-in count and streak. Never shown publicly -- see admin_contributor_tier() for the current thresholds.',
      adm_contributors_top_heading: 'Top contributors',
      adm_contributors_empty: 'Nobody has reached a tier yet.',
      adm_outreach_eyebrow: 'Private, admin-only',
      adm_outreach_title: 'Outreach',
      adm_outreach_copy: 'Sponsor and partner leads. A place to track status, not a CRM.',
      adm_outreach_add: 'Add lead',
      adm_outreach_org: 'Organisation',
      adm_outreach_contact_name: 'Contact name',
      adm_outreach_contact_email: 'Contact email',
      adm_outreach_category: 'Category',
      adm_outreach_notes: 'Notes',
      adm_outreach_status: 'Status',
      adm_outreach_save: 'Save lead',
      adm_outreach_status_not_contacted: 'Not contacted',
      adm_outreach_status_contacted: 'Contacted',
      adm_outreach_status_replied: 'Replied',
      adm_outreach_status_closed: 'Closed',
    },
    es: {
      adm_tier_voice: 'Voz',
      adm_tier_keeper: 'Guardián',
      adm_tier_founder: 'Fundador',
      adm_contributors_eyebrow: 'Privado, solo admin',
      adm_contributors_title: 'Niveles de colaborador',
      adm_contributors_copy: 'Voz / Guardián / Fundador, calculado a partir del número de check-ins y la racha. Nunca se muestra públicamente.',
      adm_contributors_top_heading: 'Principales colaboradores',
      adm_contributors_empty: 'Nadie ha alcanzado un nivel todavía.',
      adm_outreach_eyebrow: 'Privado, solo admin',
      adm_outreach_title: 'Contactos',
      adm_outreach_copy: 'Posibles patrocinadores y socios. Un lugar para seguir el estado, no un CRM.',
      adm_outreach_add: 'Añadir contacto',
      adm_outreach_org: 'Organización',
      adm_outreach_contact_name: 'Nombre de contacto',
      adm_outreach_contact_email: 'Correo de contacto',
      adm_outreach_category: 'Categoría',
      adm_outreach_notes: 'Notas',
      adm_outreach_status: 'Estado',
      adm_outreach_save: 'Guardar contacto',
      adm_outreach_status_not_contacted: 'Sin contactar',
      adm_outreach_status_contacted: 'Contactado',
      adm_outreach_status_replied: 'Respondió',
      adm_outreach_status_closed: 'Cerrado',
    },
    fr: {
      adm_tier_voice: 'Voix',
      adm_tier_keeper: 'Gardien',
      adm_tier_founder: 'Fondateur',
      adm_contributors_eyebrow: 'Privé, admin uniquement',
      adm_contributors_title: 'Niveaux de contributeur',
      adm_contributors_copy: 'Voix / Gardien / Fondateur, calculé à partir du nombre de check-ins et de la série. Jamais affiché publiquement.',
      adm_contributors_top_heading: 'Meilleurs contributeurs',
      adm_contributors_empty: 'Personne n’a encore atteint de niveau.',
      adm_outreach_eyebrow: 'Privé, admin uniquement',
      adm_outreach_title: 'Prospection',
      adm_outreach_copy: 'Pistes de sponsors et partenaires. Un suivi de statut, pas un CRM.',
      adm_outreach_add: 'Ajouter une piste',
      adm_outreach_org: 'Organisation',
      adm_outreach_contact_name: 'Nom du contact',
      adm_outreach_contact_email: 'E-mail du contact',
      adm_outreach_category: 'Catégorie',
      adm_outreach_notes: 'Notes',
      adm_outreach_status: 'Statut',
      adm_outreach_save: 'Enregistrer',
      adm_outreach_status_not_contacted: 'Non contacté',
      adm_outreach_status_contacted: 'Contacté',
      adm_outreach_status_replied: 'A répondu',
      adm_outreach_status_closed: 'Clos',
    },
    de: {
      adm_tier_voice: 'Stimme',
      adm_tier_keeper: 'Hüter',
      adm_tier_founder: 'Gründer',
      adm_contributors_eyebrow: 'Privat, nur Admin',
      adm_contributors_title: 'Beitragende-Stufen',
      adm_contributors_copy: 'Stimme / Hüter / Gründer, berechnet aus Check-in-Anzahl und Serie. Nie öffentlich sichtbar.',
      adm_contributors_top_heading: 'Top-Beitragende',
      adm_contributors_empty: 'Noch niemand hat eine Stufe erreicht.',
      adm_outreach_eyebrow: 'Privat, nur Admin',
      adm_outreach_title: 'Kontaktaufnahme',
      adm_outreach_copy: 'Sponsoren- und Partner-Leads. Ein Ort für den Status, kein CRM.',
      adm_outreach_add: 'Lead hinzufügen',
      adm_outreach_org: 'Organisation',
      adm_outreach_contact_name: 'Ansprechpartner',
      adm_outreach_contact_email: 'E-Mail des Kontakts',
      adm_outreach_category: 'Kategorie',
      adm_outreach_notes: 'Notizen',
      adm_outreach_status: 'Status',
      adm_outreach_save: 'Speichern',
      adm_outreach_status_not_contacted: 'Nicht kontaktiert',
      adm_outreach_status_contacted: 'Kontaktiert',
      adm_outreach_status_replied: 'Geantwortet',
      adm_outreach_status_closed: 'Abgeschlossen',
    },
    pt: {
      adm_tier_voice: 'Voz',
      adm_tier_keeper: 'Guardião',
      adm_tier_founder: 'Fundador',
      adm_contributors_eyebrow: 'Privado, apenas admin',
      adm_contributors_title: 'Níveis de colaborador',
      adm_contributors_copy: 'Voz / Guardião / Fundador, calculado a partir do número de check-ins e da sequência. Nunca exibido publicamente.',
      adm_contributors_top_heading: 'Principais colaboradores',
      adm_contributors_empty: 'Ainda ninguém atingiu um nível.',
      adm_outreach_eyebrow: 'Privado, apenas admin',
      adm_outreach_title: 'Contatos',
      adm_outreach_copy: 'Possíveis patrocinadores e parceiros. Um lugar para acompanhar o status, não um CRM.',
      adm_outreach_add: 'Adicionar contato',
      adm_outreach_org: 'Organização',
      adm_outreach_contact_name: 'Nome do contato',
      adm_outreach_contact_email: 'E-mail do contato',
      adm_outreach_category: 'Categoria',
      adm_outreach_notes: 'Notas',
      adm_outreach_status: 'Status',
      adm_outreach_save: 'Salvar contato',
      adm_outreach_status_not_contacted: 'Não contatado',
      adm_outreach_status_contacted: 'Contatado',
      adm_outreach_status_replied: 'Respondeu',
      adm_outreach_status_closed: 'Encerrado',
    },
    ja: {
      adm_tier_voice: 'ボイス',
      adm_tier_keeper: 'キーパー',
      adm_tier_founder: 'ファウンダー',
      adm_contributors_eyebrow: '非公開・管理者のみ',
      adm_contributors_title: '貢献者ティア',
      adm_contributors_copy: 'チェックイン数と連続記録から算出。公開されることはありません。',
      adm_contributors_top_heading: 'トップ貢献者',
      adm_contributors_empty: 'まだティアに到達した人はいません。',
      adm_outreach_eyebrow: '非公開・管理者のみ',
      adm_outreach_title: 'アウトリーチ',
      adm_outreach_copy: 'スポンサー・パートナー候補。CRMではなく、状況を記録する場所です。',
      adm_outreach_add: 'リードを追加',
      adm_outreach_org: '組織名',
      adm_outreach_contact_name: '担当者名',
      adm_outreach_contact_email: '担当者メール',
      adm_outreach_category: 'カテゴリー',
      adm_outreach_notes: 'メモ',
      adm_outreach_status: 'ステータス',
      adm_outreach_save: '保存',
      adm_outreach_status_not_contacted: '未連絡',
      adm_outreach_status_contacted: '連絡済み',
      adm_outreach_status_replied: '返信あり',
      adm_outreach_status_closed: '終了',
    },
  };

  var supportedLangs = Object.keys(translations);
  var stored = null;
  try { stored = localStorage.getItem('glotemp-lang'); } catch (e) { /* non-fatal */ }
  var currentLang = stored || (navigator.language || 'en').split('-')[0];
  if (!supportedLangs.includes(currentLang)) currentLang = 'en';

  function t(key, fallback) {
    var localized = translations[currentLang] && translations[currentLang][key];
    if (typeof localized === 'string' && localized.length) return localized;
    var english = translations.en[key];
    if (typeof english === 'string' && english.length) return english;
    return fallback === undefined ? '' : fallback;
  }

  window.AdminI18n = { t: t, currentLang: currentLang };
})();
