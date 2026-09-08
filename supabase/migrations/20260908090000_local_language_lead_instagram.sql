-- PART 1: local-language lead for Instagram content -- checked first
-- (grep across the whole repo: no language column, no language-handling
-- logic anywhere in social-next-post/social-card/the migrations; this
-- had never been applied). Built now.
--
-- CONVENTION, for this and every future hand-authored row: when a row's
-- own caption is centred on one real city whose primary local language
-- isn't English, that caption is prefixed with a short, real, correctly
-- written greeting in that city's own language, then a blank line, then
-- the existing English caption unchanged. The greeting is deliberately
-- short (a real "hello, <city>" rather than a full translation of the
-- caption's facts) -- a short greeting can be verified correct with
-- confidence; mistranslating a specific number or fact in twelve
-- languages is a real, avoidable risk this project's own honesty
-- standard doesn't allow taking. Only ENGLISH-primary cities (London,
-- NYC, Toronto, Sydney) and already-posted rows are left untouched --
-- a posted row is a real thing that already happened and can't be
-- retroactively changed.
--
-- LANGUAGE CHOSEN PER CITY, AND WHY (the "most representative real
-- language", not simply "an official language" where the two differ):
--   Bangalore   Kannada    -- the official language of Karnataka, the
--                             state Bangalore is capital of; English/
--                             Hindi are widely spoken there because of
--                             the tech industry, not because either is
--                             the city's own local language.
--   Berlin      German     -- uncontroversial.
--   Singapore   Malay      -- Singapore's constitutionally designated
--                             national language (the anthem is in
--                             Malay) even though English is the
--                             working/administrative language day to
--                             day -- "national language" is the more
--                             representative real answer to "this
--                             city/country's own language" than the
--                             lingua franca of commerce.
--   Manila      Filipino   -- the national language, Manila-based
--                             (built on Tagalog, the language of the
--                             Manila region specifically).
--   Bangkok     Thai       -- uncontroversial.
--   Tokyo       Japanese   -- uncontroversial.
--   Seoul       Korean     -- uncontroversial.
--   Delhi       Hindi      -- uncontroversial.
--   Hong Kong   Cantonese  -- Hong Kong's actual majority spoken
--                             language, distinct from Mandarin despite
--                             both being "Chinese" -- using Mandarin
--                             here would be the less accurate choice.
--   Shanghai    Mandarin   -- Shanghai's own dialect (Shanghainese) has
--                             no widely-agreed standard written form;
--                             Mandarin is the real, standard written/
--                             spoken Chinese any Shanghai resident
--                             reads and understands.
--   Beijing     Mandarin   -- uncontroversial (Beijing dialect IS the
--                             phonological basis of standard Mandarin).
--   Osaka       Japanese   -- uncontroversial.
--   Lisbon      Portuguese -- uncontroversial.
--   Barcelona   Catalan    -- Barcelona's own distinctly local, co-
--                             official language; Spanish (Castilian)
--                             is the national language of Spain
--                             generally and would be the right choice
--                             for almost any OTHER Spanish city, but
--                             Catalan is what actually makes Barcelona
--                             linguistically distinct.
--   Dubai       Arabic     -- uncontroversial.
--   Cape Town   Afrikaans  -- per South African census data, Afrikaans
--                             is the most commonly spoken home language
--                             in Cape Town specifically (~35%), ahead
--                             of isiXhosa and English -- the real
--                             answer for THIS city, not a generic
--                             "South Africa speaks 11 languages" shrug.
--   Prague      Czech      -- uncontroversial.
--   Budapest    Hungarian  -- uncontroversial.
--   Warsaw      Polish     -- uncontroversial.
--   Krakow      Polish     -- uncontroversial.
--
-- English-primary cities appearing in unposted rows (NYC, Toronto,
-- Sydney) are correctly left untouched -- there is no real "local
-- non-English language" to lead with.
update social_content_queue set caption =
  'ನಮಸ್ಕಾರ, ಬೆಂಗಳೂರು! 👋' || E'\n\n' || caption
  where day_number = 3 and slot_number = 2;

update social_content_queue set caption =
  'Hallo, Berlin! 👋' || E'\n\n' || caption
  where day_number = 4 and slot_number = 1;

update social_content_queue set caption =
  'Salam, Singapura! 👋' || E'\n\n' || caption
  where day_number in (5, 22) and slot_number = 1;

update social_content_queue set caption =
  'Kumusta, Maynila! 👋' || E'\n\n' || caption
  where day_number = 23 and slot_number = 1;

update social_content_queue set caption =
  'สวัสดี กรุงเทพฯ! 👋' || E'\n\n' || caption
  where day_number = 24 and slot_number = 1;

update social_content_queue set caption =
  'こんにちは、東京！👋' || E'\n\n' || caption
  where day_number = 25 and slot_number = 1;

update social_content_queue set caption =
  '안녕하세요, 서울! 👋' || E'\n\n' || caption
  where day_number = 27 and slot_number = 1;

update social_content_queue set caption =
  'नमस्ते, दिल्ली! 👋' || E'\n\n' || caption
  where day_number = 28 and slot_number = 1;

update social_content_queue set caption =
  '你好，香港！👋' || E'\n\n' || caption
  where day_number = 29 and slot_number = 1;

update social_content_queue set caption =
  '你好，上海！👋' || E'\n\n' || caption
  where day_number = 30 and slot_number = 1;

update social_content_queue set caption =
  '你好，北京！👋' || E'\n\n' || caption
  where day_number = 31 and slot_number = 1;

update social_content_queue set caption =
  'こんにちは、大阪！👋' || E'\n\n' || caption
  where day_number = 32 and slot_number = 1;

update social_content_queue set caption =
  'Olá, Lisboa! 👋' || E'\n\n' || caption
  where day_number = 33 and slot_number = 1;

update social_content_queue set caption =
  'Bon dia, Barcelona! 👋' || E'\n\n' || caption
  where day_number = 34 and slot_number = 1;

update social_content_queue set caption =
  'مرحبا، دبي! 👋' || E'\n\n' || caption
  where day_number = 35 and slot_number = 1;

update social_content_queue set caption =
  'Hallo, Kaapstad! 👋' || E'\n\n' || caption
  where day_number = 36 and slot_number = 1;

update social_content_queue set caption =
  'Ahoj, Praho! 👋' || E'\n\n' || caption
  where day_number = 37 and slot_number = 1;

update social_content_queue set caption =
  'Szia, Budapest! 👋' || E'\n\n' || caption
  where day_number = 38 and slot_number = 1;

update social_content_queue set caption =
  'Cześć, Warszawo! 👋' || E'\n\n' || caption
  where day_number = 39 and slot_number = 1;

update social_content_queue set caption =
  'Cześć, Krakowie! 👋' || E'\n\n' || caption
  where day_number = 40 and slot_number = 1;
