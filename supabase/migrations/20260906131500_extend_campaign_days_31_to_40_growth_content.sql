-- PART 2: growth engine, first real extension beyond the original fixed
-- 30-day launch calendar. Every row below carries at least one of the
-- four required elements (real trivia, a genuine CTA, a tasteful
-- tier/stars mention, or a collab-open signal) -- see the report for
-- which. Widened to 90 so there's real runway without needing another
-- schema change for the next couple of months; days 41-90 are not yet
-- authored (disclosed, not silently left to 404 -- social-next-post
-- simply won't find a due row past day 40 until more are added).
alter table social_content_queue drop constraint if exists social_content_queue_day_number_check;
alter table social_content_queue add constraint social_content_queue_day_number_check
  check (day_number between 1 and 90);

alter table x_content_calendar drop constraint if exists x_content_calendar_day_number_check;
alter table x_content_calendar add constraint x_content_calendar_day_number_check
  check (day_number between 1 and 90);

insert into social_content_queue
  (day_number, slot_number, scheduled_time, platform, format, theme, caption, image_search_term)
values
  (31, 1, '09:00', 'instagram', 'Single image', 'City pride', 'Legend says the Forbidden City has 9,999.5 rooms — deliberately half a room short of heaven''s mythical 10,000. If this is home, you''ve always lived somewhere just shy of celestial. #glotemp #Beijing', 'Beijing Forbidden City skyline'),
  (31, 2, '14:00', 'instagram', 'Single image', 'Tier/Stars', 'Check in enough days on glo-temp.com and it notices. Temp-Reporter, then Senior Reporter, then Chief Correspondent — earned by consistency, never bought, never gamed. See where you land. 🏅', null),
  (31, 3, '19:00', 'instagram', 'Single image', 'Emotional/Engagement', 'A city''s pulse doesn''t pause for your time zone. Beijing''s reading right now, whether or not you''re awake to see it. Curious which city''s current mood would surprise you most? Drop a guess. 👇', null),

  (32, 1, '09:00', 'instagram', 'Single image', 'City pride', 'Osaka''s nicknamed "Japan''s Kitchen" — and Osaka Castle''s current structure is a 1931 rebuild with elevators quietly tucked inside. Old bones, new conveniences. If this is home, you already knew both. #glotemp #Osaka', 'Osaka Castle skyline'),
  (32, 2, '14:00', 'instagram', 'Carousel', 'Vertical: Food', 'Street food is a live signal, not a guidebook page — takoyaki stalls tell you more about a neighbourhood''s mood tonight than any review ever could. Swipe to see how our Food read captures that. →', null),
  (32, 3, '19:00', 'instagram', 'Single image', 'Collab-open', 'Glo-temp.com is open for the right partnerships — tourism boards, hospitality brands, anyone who wants their city read honestly. Partner with this instrument: marketing@glo-temp.com. 🤝', null),

  (33, 1, '09:00', 'instagram', 'Single image', 'City pride', 'Lisbon is often said to be older than Rome — a history that may stretch back over 3,000 years. Its yellow trams still climb some of Europe''s steepest streets like it''s nothing. If this is home, uphill is just Tuesday. #glotemp #Lisbon', 'Lisbon skyline trams'),
  (33, 2, '14:00', 'instagram', 'Single image', 'Tier/Stars', 'Referral stars aren''t a leaderboard flex — they''re a quiet record of who actually showed up. Invite someone, check in consistently, watch your own total grow. glo-temp.com ⭐', null),
  (33, 3, '19:00', 'instagram', 'Single image', 'Emotional/Engagement', 'You don''t need to be somewhere to know how it feels right now. That''s the whole idea behind glo-temp.com. Which city are you most curious about today? Tell us below. 👇', null),

  (34, 1, '09:00', 'instagram', 'Single image', 'City pride', 'Sagrada Família has been under construction since 1882 and still isn''t finished — Barcelona''s most famous building has technically never been done. If this is home, patience is basically a civic virtue. #glotemp #Barcelona', 'Sagrada Familia Barcelona skyline'),
  (34, 2, '14:00', 'instagram', 'Carousel', 'Vertical: Property', 'Barcelona''s Eixample district was designed with chamfered corners just to improve visibility and airflow — city planning as quiet, permanent kindness. Our Property read tries to capture texture like that. Swipe to see how. →', null),
  (34, 3, '19:00', 'instagram', 'Single image', 'Collab-open', 'Sponsor placements, city partnerships, tourism board collaborations — glo-temp.com is genuinely open to the right ones. Details in bio, or straight to marketing@glo-temp.com. 🤝', null),

  (35, 1, '09:00', 'instagram', 'Single image', 'City pride', 'The Burj Khalifa is tall enough to watch the sunset twice — once at ground level, once again riding up before it sets. If this is home, you''ve out-run daylight and won. #glotemp #Dubai', 'Burj Khalifa Dubai skyline'),
  (35, 2, '14:00', 'instagram', 'Single image', 'Tier/Stars', 'Chief Correspondent isn''t a title glo-temp.com hands out lightly — it''s the platform''s way of noticing its most consistent, longest-standing observers. No shortcuts, no gaming it. Just showing up. 🏅', null),
  (35, 3, '19:00', 'instagram', 'Single image', 'Emotional/Engagement', 'Dubai was mostly desert and fishing villages before the 1960s reshaped it entirely. Every city on glo-temp.com has a version of that story. Tag the city whose transformation surprised you most. 👇', null),

  (36, 1, '09:00', 'instagram', 'Single image', 'City pride', 'Cape Town''s Table Mountain is older than the Himalayas and the Alps — this city has been the backdrop for longer than most of the planet''s other famous views. If this is home, you live next to something ancient. #glotemp #CapeTown', 'Table Mountain Cape Town skyline'),
  (36, 2, '14:00', 'instagram', 'Carousel', 'Vertical', 'Some cities announce their mood loudly. Others make you look for it. Our reads are built to catch both. Swipe to see this week''s. →', null),
  (36, 3, '19:00', 'instagram', 'Single image', 'Collab-open', 'Building something in travel, hospitality, or tourism? glo-temp.com reads real city mood, live — and we''re genuinely open to partnering with people building real things. marketing@glo-temp.com. 🤝', null),

  (37, 1, '09:00', 'instagram', 'Single image', 'City pride', 'Prague''s Astronomical Clock has been running since 1410 — the oldest of its kind still operating, still telling the same city the same time it always has. If this is home, you carry six centuries lightly. #glotemp #Prague', 'Prague Astronomical Clock skyline'),
  (37, 2, '14:00', 'instagram', 'Single image', 'Tier/Stars', 'Your streak on glo-temp.com is your longest, not your current one — reached once, kept forever. No nagging progress bar, no "3 days to next tier." Just a quiet record that you were consistent. 🏅', null),
  (37, 3, '19:00', 'instagram', 'Single image', 'Emotional/Engagement', 'Some cities keep perfect time. Some barely notice the clock. glo-temp.com reads both, without judgment. Which kind is your city tonight? 👇', null),

  (38, 1, '09:00', 'instagram', 'Single image', 'City pride', 'Budapest was once two cities, Buda and Pest, joined across the Danube in 1873 — and it still sits on natural thermal springs, bathhouses in use since Roman times. If this is home, you''ve been soaking in history literally. #glotemp #Budapest', 'Budapest Danube skyline'),
  (38, 2, '14:00', 'instagram', 'Carousel', 'Vertical: Health', 'A thermal spring city has a different relationship with rest than most places do. Our Health read is starting to notice things like that. Swipe to see how. →', null),
  (38, 3, '19:00', 'instagram', 'Single image', 'Collab-open', 'Tourism boards, hospitality partners, anyone who wants a real read on a real city instead of a stock photo and a guess — glo-temp.com is open. marketing@glo-temp.com. 🤝', null),

  (39, 1, '09:00', 'instagram', 'Single image', 'City pride', 'Warsaw was almost entirely rebuilt after WWII, brick by brick, using old paintings and photographs as reference. If this is home, the whole city is a memory somebody chose to keep. #glotemp #Warsaw', 'Warsaw Old Town skyline'),
  (39, 2, '14:00', 'instagram', 'Single image', 'Tier/Stars', 'Every check-in on glo-temp.com is a real row in a real table, tied to a real streak. Temp-Reporter, Senior Reporter, Chief Correspondent — earned the same way every time: by actually being there. 🏅', null),
  (39, 3, '19:00', 'instagram', 'Single image', 'Emotional/Engagement', 'A rebuilt city still has a pulse — arguably more of one. Comment the city you''d want rebuilt exactly as it was, brick by brick. 👇', null),

  (40, 1, '09:00', 'instagram', 'Single image', 'City pride', 'A trumpet call still plays hourly from a Kraków church tower, stopping abruptly mid-note — in memory of a medieval watchman, seven centuries running. Wawel Castle held Polish kings for 500 of those years. If this is home, tradition just means Tuesday. #glotemp #Krakow', 'Krakow Wawel Castle skyline'),
  (40, 2, '14:00', 'instagram', 'Carousel', 'Vertical', 'Some traditions outlive the reason anyone remembers for keeping them. Our reads try to capture what a city carries forward, not just what''s trending this week. Swipe for the read. →', null),
  (40, 3, '19:00', 'instagram', 'Single image', 'Collab-open/Positioning', 'Forty days in, still reading live, still genuinely open to the right partnerships — tourism boards, hospitality brands, anyone building something real. marketing@glo-temp.com. glo-temp.com 🤝', null)
on conflict (day_number, slot_number) do nothing;
