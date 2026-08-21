-- X (Twitter) content calendar for /admin: 30 days, 3 posts/day, 90 rows
-- total. X stays manual/copy-paste by design -- no posting API, no
-- automation, unlike social_content_queue's Instagram/Facebook pipeline.
-- This table exists purely so the admin can open /admin, read a post's
-- text, and paste it into X's own native scheduler by hand.
--
-- RLS rather than a security-definer RPC, per the outreach_leads
-- precedent (20260820150500_admin_outreach_leads.sql): this table holds
-- no user data, only pre-written marketing copy the admin reads and
-- copies. A plain is_admin()-gated SELECT policy is the right amount of
-- machinery here, not a hand-written RPC for a read-only list.
--
-- Content is exactly what was supplied for this calendar -- reproduced
-- verbatim, not paraphrased or regenerated.
create table if not exists x_content_calendar (
  id uuid primary key default gen_random_uuid(),
  day_number integer not null check (day_number between 1 and 30),
  slot_number integer not null check (slot_number between 1 and 3),
  scheduled_time text not null,
  theme text not null,
  tweet_text text not null,
  image_note text not null
    check (image_note in ('No image', 'Image: brand card', 'Image: city photo')),
  created_at timestamptz not null default now(),
  unique (day_number, slot_number)
);

comment on table x_content_calendar is
  'Admin-only X/Twitter content calendar. Copy-paste only -- no posting API. No public read path, no client-side reference anywhere outside /admin.';

alter table x_content_calendar enable row level security;

drop policy if exists x_content_calendar_admin_select on x_content_calendar;
create policy x_content_calendar_admin_select on x_content_calendar
  for select to authenticated
  using (is_admin());

insert into x_content_calendar (day_number, slot_number, scheduled_time, theme, tweet_text, image_note) values
  (1, 1, '08:00', 'Trivia', 'Tokyo runs one of the busiest rail networks on Earth — Shinjuku Station alone handles over 3 million passengers a day. glo-temp.com reads Tokyo''s pulse live, transit and all.', 'No image'),
  (1, 2, '13:00', 'Positioning', 'Most city guides are frozen in whatever year someone wrote them. glo-temp.com isn''t a guide. It''s a live reading — 300 cities, updated in real time.', 'No image'),
  (1, 3, '19:00', 'Pulse', 'A city doesn''t stop when you leave it. Its clock, its sky, its radio still run. glo-temp.com — the city you left is still going.', 'Image: brand card'),
  (2, 1, '08:00', 'Trivia', 'London''s Underground opened in 1863 — the world''s first underground railway. It''s still moving 5 million people a day. glo-temp.com reads London live, right now.', 'No image'),
  (2, 2, '13:00', 'Property', 'Ever wonder what a city''s rental pressure actually feels like this week, not last year''s report? That''s exactly what glo-temp.com''s Property read is built for.', 'No image'),
  (2, 3, '19:00', 'Engagement', 'Quick one: which city''s weather would surprise you most right now? Reply and we''ll check the live read.', 'No image'),
  (3, 1, '08:00', 'Trivia', 'Manila is one of the most densely populated cities on Earth — and right now it''s reading live on glo-temp.com: weather, clock, radio, mood, all at once.', 'Image: city photo'),
  (3, 2, '13:00', 'Food', 'Every city has a dish that explains it better than any guidebook. Our Food read surfaces what''s actually on the table right now, city by city.', 'No image'),
  (3, 3, '19:00', 'Positioning', 'Weather apps tell you the sky. glo-temp.com tells you the whole city — mood, transit, radio, press, all in one read.', 'No image'),
  (4, 1, '08:00', 'Trivia', 'Berlin has more bridges than Venice — around 950 of them. glo-temp.com reads Berlin''s pulse live: mood, weather, and what''s on the radio right now.', 'No image'),
  (4, 2, '13:00', 'Tech', 'Github activity, hiring signals, tech-scene energy — our Tech read shows which cities are quietly building right now, not just the usual suspects.', 'No image'),
  (4, 3, '19:00', 'Pulse', 'Right now, somewhere, a city is waking up and another is going quiet. glo-temp.com reads all 300, live.', 'Image: brand card'),
  (5, 1, '08:00', 'Trivia', 'Singapore''s Changi Airport has its own butterfly garden and a rooftop pool — inside the terminal. glo-temp.com reads Singapore''s pulse live, right now.', 'No image'),
  (5, 2, '13:00', 'Transport', 'Traffic mood isn''t just a number — it''s whether a city feels like it''s flowing or stuck. Our Transport read captures that, live, city by city.', 'No image'),
  (5, 3, '19:00', 'Engagement', 'If you had to guess: which city has the best ''right now'' energy today? Drop your guess.', 'No image'),
  (6, 1, '08:00', 'Trivia', 'New York''s subway runs 24 hours a day, 365 days a year — one of the only systems in the world that never fully stops. glo-temp.com reads NYC live.', 'Image: city photo'),
  (6, 2, '13:00', 'Work', 'Job openings, hiring pulse, remote-friendly energy — our Work read shows which cities are actually hiring right now, not last quarter.', 'No image'),
  (6, 3, '19:00', 'Positioning', 'A city has a temperature. Most of us just never had a way to read it. Now you do — glo-temp.com.', 'No image'),
  (7, 1, '08:00', 'Trivia', 'Toronto is home to over 200 distinct neighbourhoods, each with its own character. glo-temp.com reads Toronto''s pulse live, right now.', 'No image'),
  (7, 2, '13:00', 'Entertainment', 'Concerts, festivals, big nights out — our Entertainment read surfaces what''s actually happening in a city this week.', 'No image'),
  (7, 3, '19:00', 'Pulse', 'Week one down. 293 more cities to go. glo-temp.com — know how a city feels before you go.', 'Image: brand card'),
  (8, 1, '08:00', 'Trivia', 'Sydney Harbour Bridge is nicknamed ''the Coathanger'' by locals for its shape. glo-temp.com reads Sydney''s pulse live, right now.', 'No image'),
  (8, 2, '13:00', 'Education', 'University towns have their own rhythm — term time, exam season, quiet summers. Our Education read is starting to capture exactly that.', 'No image'),
  (8, 3, '19:00', 'Engagement', 'Genuinely curious: what would you want a ''live city reading'' to tell you that no app currently does? Reply, we''re listening.', 'No image'),
  (9, 1, '08:00', 'Trivia', 'Bangalore is nicknamed India''s Silicon Valley — home to thousands of tech startups and a genuinely huge developer community. glo-temp.com reads Bangalore''s pulse live.', 'No image'),
  (9, 2, '13:00', 'Finance', 'Economic energy isn''t just GDP — it''s whether a city feels like it''s building or bracing. Our Finance read is built around that distinction.', 'No image'),
  (9, 3, '19:00', 'Positioning', 'You''ve checked the weather. Now check the city. glo-temp.com — mood, radio, press, pulse, live.', 'No image'),
  (10, 1, '08:00', 'Trivia', 'Helsinki was ranked one of the world''s happiest cities for years running. glo-temp.com reads Helsinki''s pulse live — see what ''happy'' actually looks like today.', 'Image: city photo'),
  (10, 2, '13:00', 'Health', 'A city''s health pulse isn''t just hospital stats — it''s the everyday feel of a place. We''re building toward reading that too.', 'No image'),
  (10, 3, '19:00', 'Pulse', 'Some cities are loud today. Some are quiet. glo-temp.com reads both, live, without judgment.', 'No image'),
  (11, 1, '08:00', 'Trivia', 'Seoul has one of the fastest average internet speeds of any major city in the world. glo-temp.com reads Seoul''s pulse live, right now.', 'No image'),
  (11, 2, '13:00', 'Sport', 'Match days change a city''s whole rhythm — traffic, noise, energy. Our Sport read is designed to capture exactly that shift.', 'No image'),
  (11, 3, '19:00', 'Engagement', 'Two cities, one choice: would you rather land in a city that''s buzzing tonight, or one that''s dead calm? Reply with your pick.', 'No image'),
  (12, 1, '08:00', 'Trivia', 'Bangkok''s official ceremonial name is one of the longest place names in the world — over 160 letters. glo-temp.com reads Bangkok''s pulse live, right now.', 'No image'),
  (12, 2, '13:00', 'Fashion', 'Style isn''t static — it shifts block by block, season by season. Our Fashion read is where that texture eventually lives.', 'No image'),
  (12, 3, '19:00', 'Positioning', 'Most platforms show you a city. glo-temp.com lets you feel one. 300 cities, live, right now.', 'Image: brand card'),
  (13, 1, '08:00', 'Trivia', 'Mexico City is sinking roughly 20 inches a year in some areas — built on a former lakebed. glo-temp.com reads Mexico City''s pulse live.', 'No image'),
  (13, 2, '13:00', 'Property', 'Rental pressure spikes and eases with the seasons in most cities — our Property read is built to actually show that movement.', 'No image'),
  (13, 3, '19:00', 'Pulse', 'Right now, somewhere on glo-temp.com, someone just checked in on their hometown from 6,000 miles away. That''s the whole point.', 'No image'),
  (14, 1, '08:00', 'Trivia', 'São Paulo has more helicopters in regular use than almost any other city on Earth, largely due to traffic. glo-temp.com reads São Paulo''s pulse live.', 'Image: city photo'),
  (14, 2, '13:00', 'Food', 'A city''s food scene is a live signal, not a fixed guidebook entry. Our Food read tries to capture what''s actually trending this week.', 'No image'),
  (14, 3, '19:00', 'Engagement', 'Two weeks in — what''s one city you''d want us to add next? Tell us and we''ll take a look.', 'No image'),
  (15, 1, '08:00', 'Trivia', 'Delhi''s Chandni Chowk is one of the oldest and busiest markets in India, still trading much as it has for centuries. glo-temp.com reads Delhi''s pulse live.', 'No image'),
  (15, 2, '13:00', 'Tech', 'Developer activity is a real, live signal of a city''s momentum — not a lagging report. That''s exactly what our Tech read tracks.', 'No image'),
  (15, 3, '19:00', 'Positioning', 'Halfway through the month. Still 300 cities. Still reading live. glo-temp.com.', 'No image'),
  (16, 1, '08:00', 'Trivia', 'Hong Kong has more skyscrapers than any other city in the world — over 500 buildings above 150 metres. glo-temp.com reads Hong Kong''s pulse live.', 'No image'),
  (16, 2, '13:00', 'Transport', 'Some cities move fast. Some move slow. Neither is wrong — but you should know which one you''re walking into. Our Transport read tells you.', 'No image'),
  (16, 3, '19:00', 'Pulse', 'You''ve noticed we check in on cities daily. Some of you have started checking in too — and we''ve noticed that.', 'No image'),
  (17, 1, '08:00', 'Trivia', 'Shanghai''s Maglev train reaches speeds of over 430 km/h, connecting the airport to the city in about 8 minutes. glo-temp.com reads Shanghai''s pulse live.', 'Image: city photo'),
  (17, 2, '13:00', 'Work', 'Remote-friendly hiring signals move fast — faster than most job boards update. Our Work read is built to keep pace with that.', 'No image'),
  (17, 3, '19:00', 'Engagement', 'If glo-temp.com added one new feature next, what would you actually want? We''re building this with the people using it.', 'No image'),
  (18, 1, '08:00', 'Trivia', 'Paris has exactly 6 cats living officially inside the Louvre, historically kept to protect the art from rodents. glo-temp.com reads Paris''s pulse live.', 'No image'),
  (18, 2, '13:00', 'Entertainment', 'Festival season changes a city''s entire pulse — louder streets, fuller venues, different energy after dark. We''re starting to capture that shift.', 'No image'),
  (18, 3, '19:00', 'Positioning', 'A city you''ve never visited still has a pulse today. glo-temp.com lets you feel it before you ever book a flight.', 'No image'),
  (19, 1, '08:00', 'Trivia', 'Berlin has a 24-hour public transport network on weekends — the city genuinely doesn''t sleep on Fridays and Saturdays. glo-temp.com reads Berlin live.', 'No image'),
  (19, 2, '13:00', 'Education', 'Some cities empty out in summer and fill back up in September — university rhythm is a real, visible pulse shift. We''re working toward reading it.', 'No image'),
  (19, 3, '19:00', 'Pulse', 'Founding Voices: the earliest people checking in on their cities are helping shape what this becomes. If that''s you — thank you, genuinely.', 'No image'),
  (20, 1, '08:00', 'Trivia', 'Toronto''s underground PATH network stretches over 30km beneath the city — built partly to survive the winters. glo-temp.com reads Toronto''s pulse live.', 'No image'),
  (20, 2, '13:00', 'Health', 'City energy and wellbeing are more connected than most data shows. We''re working toward a health read that reflects that honestly.', 'No image'),
  (20, 3, '19:00', 'Engagement', 'Real question: does a city''s mood actually change how you''d plan a trip there? We think it should. Curious what you think.', 'No image'),
  (21, 1, '08:00', 'Trivia', 'Sydney''s Opera House took 14 years longer to build than planned and cost 15x the original budget — now it''s one of the most recognisable buildings on Earth. glo-temp.com reads Sydney live.', 'Image: city photo'),
  (21, 2, '13:00', 'Sport', 'Big match tonight somewhere? Our Sport read is built to catch that shift in a city''s energy before, during, and after.', 'No image'),
  (21, 3, '19:00', 'Positioning', 'Three weeks of reading 300 cities, live, every day. This is just the start. glo-temp.com.', 'No image'),
  (22, 1, '08:00', 'Trivia', 'Singapore has strict rules on chewing gum — but also some of the best-maintained public transit on Earth. glo-temp.com reads Singapore''s pulse live.', 'No image'),
  (22, 2, '13:00', 'Finance', 'A city''s economic pulse shifts week to week, not just quarter to quarter. Our Finance read is built to actually catch that.', 'No image'),
  (22, 3, '19:00', 'Pulse', 'Founding Voices get first access as our sponsor rewards roll out — hotel stays, vouchers, partner perks. Check in on your city today, be first in line.', 'No image'),
  (23, 1, '08:00', 'Trivia', 'Manila has over 20 million people in its greater metro area — one of the most densely packed urban regions on the planet. glo-temp.com reads Manila''s pulse live.', 'No image'),
  (23, 2, '13:00', 'Property', 'Housing pressure is a real, felt thing in a city — not just a headline number. Our Property read is built around that texture.', 'No image'),
  (23, 3, '19:00', 'Engagement', 'Which city are you most curious about right now — not where you live, somewhere you''ve never been? Reply, we''ll pull the live read.', 'No image'),
  (24, 1, '08:00', 'Trivia', 'Bangkok''s canals, or khlongs, were once the city''s main transport routes before roads took over. glo-temp.com reads Bangkok''s pulse live, right now.', 'No image'),
  (24, 2, '13:00', 'Food', 'Street food scenes shift with the seasons and the hour — lunch energy is not dinner energy. Our Food read is built to notice that.', 'No image'),
  (24, 3, '19:00', 'Positioning', 'glo-temp.com isn''t trying to replace a guidebook. It''s trying to replace the guesswork. 300 cities, live.', 'Image: brand card'),
  (25, 1, '08:00', 'Trivia', 'Tokyo''s Shibuya Crossing sees up to 3,000 people cross at once during peak times — one of the busiest intersections on Earth. glo-temp.com reads Tokyo live.', 'No image'),
  (25, 2, '13:00', 'Tech', 'Tech-scene energy isn''t evenly spread — some cities are quietly building faster than the headlines suggest. Our Tech read surfaces that.', 'No image'),
  (25, 3, '19:00', 'Pulse', 'Founding Voices — check in on your city, and you''re first in line as sponsor rewards roll out. Real perks, real partners, coming soon.', 'No image'),
  (26, 1, '08:00', 'Trivia', 'New York''s Central Park is bigger than the entire country of Monaco. glo-temp.com reads NYC''s pulse live, right now — mood, weather, radio, all at once.', 'No image'),
  (26, 2, '13:00', 'Transport', 'Rush hour mood is its own kind of pulse — some cities handle it calmly, some don''t. Our Transport read shows the difference.', 'No image'),
  (26, 3, '19:00', 'Engagement', 'Almost a month in — what''s the one thing about your own city you''d want the world to actually know? Reply, tell us.', 'No image'),
  (27, 1, '08:00', 'Trivia', 'Seoul''s subway system has some of the widest free WiFi coverage of any transit network in the world. glo-temp.com reads Seoul''s pulse live, right now.', 'Image: city photo'),
  (27, 2, '13:00', 'Work', 'Hiring pulse shifts fast in tech-heavy cities — sometimes week to week. Our Work read is built to actually keep up with that.', 'No image'),
  (27, 3, '19:00', 'Positioning', 'Every city has a story happening right now, not just the ones in headlines. glo-temp.com reads all 300 of them, live.', 'No image'),
  (28, 1, '08:00', 'Trivia', 'Delhi is home to three UNESCO World Heritage Sites within the city itself — the Red Fort, Qutub Minar, and Humayun''s Tomb. glo-temp.com reads Delhi''s pulse live.', 'No image'),
  (28, 2, '13:00', 'Education', 'Campus energy is one of the most distinct pulses a city can have — we''re building toward reading it properly, city by city.', 'No image'),
  (28, 3, '19:00', 'Pulse', 'Founding Voices: check in on your city today. Early contributors get first access as our sponsor rewards roll out — hotel stays, vouchers, and more.', 'No image'),
  (29, 1, '08:00', 'Trivia', 'Hong Kong''s tram system, nicknamed ''Ding Ding'' for its bell sound, has been running since 1904. glo-temp.com reads Hong Kong''s pulse live, right now.', 'No image'),
  (29, 2, '13:00', 'Entertainment', 'Big events change a city''s whole rhythm for days, not just hours. Our Entertainment read is built to catch that shift as it happens.', 'No image'),
  (29, 3, '19:00', 'Engagement', 'One month of daily reads. Genuinely — what''s kept you checking in? Reply, we read every one of these.', 'No image'),
  (30, 1, '08:00', 'Trivia', 'Shanghai''s skyline has more buildings over 200 metres tall than almost any other city on the planet. glo-temp.com reads Shanghai''s pulse live, right now.', 'No image'),
  (30, 2, '13:00', 'Positioning', 'One month down. 300 cities read, live, every single day. This was just the beginning — glo-temp.com.', 'Image: brand card'),
  (30, 3, '19:00', 'Pulse', 'Founding Voices, thank you for being early. Check in on your city — the earliest voices shape what this becomes, and the rewards are coming. glo-temp.com.', 'No image');
