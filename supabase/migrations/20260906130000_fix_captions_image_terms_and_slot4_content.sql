-- PART 1a: five rows still say a fixed "300 cities" / "all 300" -- the
-- rest of the site (index.html's hero-subhead and city-tiles-hint) never
-- commits to a hard number, it says "a growing register of cities" --
-- because the count is not fixed (151 -> 250 -> 300 already, and still
-- growing). A hardcoded "300" in perpetuity goes stale the next time the
-- roster grows. Only these 5 rows' captions are touched; every other
-- row is left exactly as it is.
update social_content_queue set caption =
  'Somewhere, right now, a city is waking up. Somewhere else, one is going quiet. glo-temp.com reads a growing register of cities — live. 🌙'
  where day_number = 4 and slot_number = 3;

update social_content_queue set caption =
  'Halfway through the month. Still a growing register of cities. Still reading live. glo-temp.com. 🌍'
  where day_number = 15 and slot_number = 3;

update social_content_queue set caption =
  'glo-temp.com isn''t trying to replace a guidebook. It''s trying to replace the guesswork. A growing register of cities, live. 🌍'
  where day_number = 24 and slot_number = 3;

update social_content_queue set caption =
  'Every city has a story happening right now, not just the ones in headlines. glo-temp.com reads a growing register of them, live. 🌍'
  where day_number = 27 and slot_number = 3;

update social_content_queue set caption =
  'One month down. A growing register of cities read, live, every single day. This was just the beginning. Swipe through a month of pulses. →'
  where day_number = 30 and slot_number = 2;

-- PART 1b: the repeated-image bug, root cause and fix.
--
-- REAL BUG, CONFIRMED LIVE: three (in fact far more than three --
-- essentially every already-posted day) posted rows carried the exact
-- same rendered photo across multiple different captions. The original
-- 20260818201000 seed migration gave every row its OWN considered
-- image_search_term (a human creative brief, e.g. "Slide 1: London
-- skyline. Slide 2: residential street..." or "Brand card, minimal,
-- month-1 milestone framing") -- but the LIVE table today holds none of
-- that. At some point, an unlogged, un-migrated manual UPDATE (no
-- trigger, function or cron job in this database ever touches
-- image_search_term -- confirmed by querying pg_proc for every function
-- referencing social_content_queue, which returned zero rows) replaced
-- EVERY row's image_search_term with that day's slot-1 "City pride"
-- city, regardless of what the row's own caption was actually about.
-- Since social-image-fetch's Commons search is deterministic for a
-- given term, three (or more) rows sharing one city's search term
-- always resolve to the same photo -- captions differ, the term and
-- therefore the image do not.
--
-- THE FIX, applied row by row rather than table-wide:
--   - "City pride" rows (slot 1, every day) and "Bracket event" rows
--     already correctly name the one real city their own caption is
--     about -- left untouched.
--   - Two ordinary slot-2 rows (day 1: London, day 2: Manila, day 3:
--     Bangalore, day 4: NYC) whose own caption explicitly names a real
--     city are also correct as they stand -- left untouched.
--   - Every other Vertical / Emotional / Pulse / Engagement /
--     Positioning row never had a single real city as its own subject
--     in the first place (the original brief called for "branded
--     graphic", "brand card, minimal", "collage of multiple city
--     skylines" -- never a specific photograph). These are set to NULL.
--     social-next-post already has a real, honest path for a null
--     image_search_term (see its own comment): it renders the plain
--     branded 1080x1080 card with no photo, exactly what these rows'
--     original creative direction actually asked for -- never another
--     city's unrelated photo standing in for it.
update social_content_queue set image_search_term = null
  where (day_number, slot_number) in (
    (1,3), (2,3), (3,3), (4,3),
    (5,2), (5,3),
    (6,2),
    (7,2), (7,3),
    (8,2),
    (9,2), (9,3),
    (10,2), (10,3),
    (11,2), (11,3),
    (12,2),
    (13,2), (13,3),
    (14,2),
    (15,2), (15,3),
    (16,2), (16,3),
    (17,2),
    (18,2), (18,3),
    (19,2),
    (20,2), (20,3),
    (21,2),
    (22,2), (22,3),
    (23,2),
    (24,2), (24,3),
    (25,2), (25,3),
    (26,2),
    (27,2), (27,3),
    (28,2),
    (29,2), (29,3),
    (30,2), (30,3)
  );

-- PART 1b continued / PART 2 foundation: the slot-4 trivia/lost-city
-- content (city-trivia-data.js facts + real/mythical lost-cities-data.js
-- entries) was fully written and migrated (20260823110000 /
-- 20260823110100 / 20260823110200) but was never actually applied to
-- this database -- confirmed directly: `select * from
-- social_content_queue where slot_number = 4` returned zero rows, and
-- the table's own slot_number CHECK constraint still read `between 1
-- and 3`, not the widened `between 1 and 4` those migrations were
-- supposed to leave behind. Applying it now is both the second half of
-- the image-repeat fix's own housekeeping and the concrete start of
-- Part 2's trivia requirement -- 30 more real, honest, already-written
-- posts, none of them affected by the image bug above since they were
-- never touched by whatever ran that UPDATE.
alter table social_content_queue drop constraint if exists social_content_queue_slot_number_check;
alter table social_content_queue add constraint social_content_queue_slot_number_check
  check (slot_number between 1 and 4);

alter table x_content_calendar drop constraint if exists x_content_calendar_slot_number_check;
alter table x_content_calendar add constraint x_content_calendar_slot_number_check
  check (slot_number between 1 and 4);

insert into social_content_queue
  (day_number, slot_number, scheduled_time, platform, format, theme, caption, image_search_term)
values
  (1, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Cairo sits close enough to the Great Pyramid of Giza that it''s basically a neighbour to the last standing wonder of the ancient world. 🏙️🐫 And Al-Azhar University, founded in 970, is STILL teaching classes today -- older than most countries currently on a map. Some cities have history. Cairo never stopped making it. #glotemp #Cairo', 'Cairo skyline with Great Pyramid of Giza'),
  (2, 4, '16:30', 'instagram', 'Single image', 'Lost city', 'They call it the Treasury, but nobody ever found gold in it. 🏛️ Legend said a pharaoh hid his fortune in the stone urn above Al-Khazneh''s door -- so for centuries, people literally shot at it hoping gold would spill out. It''s a tomb. It was always a tomb. Petra, Jordan: carved by the Nabataeans over 2,000 years ago, unknown to Europe until 1812. Real place, real history, occasionally real bullet holes. #glotemp #LostCities', 'Petra Jordan Treasury Al-Khazneh facade'),
  (3, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Istanbul is the only city on Earth that sits on two continents -- Europe on one side of the Bosphorus, Asia on the other, one bridge apart. The Grand Bazaar has been trading under one roof since 1461, and it''s still going. Some cities pick a side. Istanbul just built a bridge. 🌉 #glotemp #Istanbul', 'Istanbul Bosphorus bridge skyline'),
  (4, 4, '16:30', 'instagram', 'Carousel (2 slides)', 'Legend', 'According to Plato, Atlantis was a naval power beyond the Pillars of Heracles that grew greedy, attacked Athens, and was swallowed by the sea in a single day and night. 🌊 Here''s the twist: his own student Aristotle seems to have thought he made it up. No coordinates. No ruins. No trace, anywhere, ever. Atlantis isn''t a lost city -- it''s a 2,400-year-old cautionary tale with an unreasonably good marketing team. Swipe for the only map anyone ever seriously drew of it. →', 'Mundus Subterraneus Athanasius Kircher Atlantis map'),
  (5, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Some cities have a metro. Moscow has underground palaces. 🚇✨ Several stations come with chandeliers, mosaics and marble like they''re expecting royalty on the 6:15. And Red Square isn''t named for communism -- ''red'' in old Russian also just meant ''beautiful.'' Moscow was doing branding before branding was a word. #glotemp #Moscow', 'Moscow Metro station chandelier mosaic'),
  (6, 4, '16:30', 'instagram', 'Single image', 'Lost city', 'The Spanish conquistadors never found Machu Picchu. Not because it was hidden -- because the Inca simply never told them it was there. 🏔️ Built around 1450 at 2,430 metres, its finest walls are cut so precisely they hold with zero mortar and flex rather than collapse in earthquakes. When it was ''discovered'' in 1911, local farming families were already living on the site. They just hadn''t mentioned it to anyone with an army. #glotemp #LostCities', 'Machu Picchu Peru wide shot'),
  (7, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'There''s a whole country inside Rome. Vatican City -- its own nation, complete with its own postal service -- sits entirely within Rome''s city limits. Meanwhile the Trevi Fountain quietly collects around €1 million a year in tossed coins, all donated to charity. Rome: technically two capitals, one very expensive wishing well. 🪙 #glotemp #Rome', 'Trevi Fountain Rome'),
  (8, 4, '16:30', 'instagram', 'Carousel (2 slides)', 'Legend', 'El Dorado wasn''t a golden city. It was never even a place. It was a MAN -- ''el hombre dorado,'' the gilded one: a Muisca ruler covered in gold dust, rowed onto Lake Guatavita to make offerings to the water. Retellings turned the man into a city, and the city into an empire, and thousands died in the Spanish search for a place that was always a ceremony. The gold offerings were real -- divers really did recover them from the lake. The city never existed. Swipe for the actual gold raft that started it all. →', 'Muisca raft gold Museo del Oro Bogota'),
  (9, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Amsterdam genuinely has more bicycles than people. And the entire historic centre -- canals, houses, all of it -- is built on more than 11,000 wooden piles driven into the ground. So technically the whole city is floating on a very old, very patient forest. 🚲🌊 #glotemp #Amsterdam', 'Amsterdam canal houses bicycles'),
  (10, 4, '16:30', 'instagram', 'Single image', 'Lost city', 'Pompeii wasn''t destroyed. It was paused. 🌋 Buried under metres of ash in 79 CE, what survived wasn''t just buildings -- it was loaves still in ovens, election slogans on walls, graffiti about who loved whom. The famous body-shaped casts aren''t bodies -- they''re VOIDS left in the hardened ash where bodies had been. Someone worked out you could pour plaster into the gap in the 1860s. History doesn''t get much more literal than that. #glotemp #LostCities', 'Pompeii ruins Vesuvius'),
  (11, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Vienna keeps winning ''most liveable city'' polls so often it''s basically a part-time job at this point. The State Opera stages a DIFFERENT production almost every single night of the season -- no reruns, no filler, just relentless Austrian excellence. 🎭 #glotemp #Vienna', 'Vienna State Opera building'),
  (12, 4, '16:30', 'instagram', 'Single image', 'Legend', 'Shangri-La isn''t an ancient legend. It''s younger than sliced bread. 🍞 James Hilton invented it in 1933 for his novel ''Lost Horizon'' -- a hidden valley where people barely age. He borrowed loosely from Shambhala, a real Tibetan Buddhist concept, and travel writing he read at the British Museum. He never actually went. In 2001, a real Chinese county officially renamed itself Shangri-La for tourism -- so now a real town carries the name of a place a novelist made up 68 years earlier. Fiction: undefeated. 📖 #glotemp #LostCities', 'Shangri-La county Yunnan mountains China'),
  (13, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Tango was born in the working-class neighbourhoods of Buenos Aires in the late 1800s -- and the city still has more bookshops per capita than almost anywhere else on Earth. Dance first, read later. Or the other way round. Either way, a lot of feeling per square metre. 💃📚 #glotemp #BuenosAires', 'Buenos Aires street tango'),
  (14, 4, '16:30', 'instagram', 'Single image', 'Lost city', 'Angkor was never actually lost. That''s the plot twist. 🛕 At its peak, this was one of the largest pre-industrial urban complexes anywhere -- a thousand square kilometres of temples, roads and reservoirs. Buddhist monks maintained it continuously the whole time; European visitors described it as early as the 1500s. What happened in 1860 is that Europe finally believed a Frenchman''s travel account and decided it had ''discovered'' a place that had never once stopped being cared for. #glotemp #LostCities', 'Angkor Wat Cambodia temple'),
  (15, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Athens has been continuously inhabited for over 3,000 years. And the Parthenon -- famous for its perfectly straight lines -- has almost NO straight lines. Its columns subtly curve so that from a distance, they look perfectly straight. Ancient Greek architects: solving optical illusions before optics was a science. 🏛️ #glotemp #Athens', 'Parthenon Athens Acropolis'),
  (16, 4, '16:30', 'instagram', 'Single image', 'Legend', 'Somewhere in the Bay of Douarnenez, Brittany, there''s supposed to be a drowned city with church bells that still ring under the water in bad weather. 🔔🌊 The legend: Ys sat below sea level behind a single gated dyke, the only key hung around the king''s neck -- until his daughter opened it one night, and the sea took everything. There''s a Breton saying: ''When Paris is drowned, Ys will rise again.'' No trace of Ys has ever actually been found in that bay. Doesn''t stop it being a genuinely great bedtime story. #glotemp #LostCities', 'Bay of Douarnenez Brittany coast'),
  (17, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Chicago once reversed the flow of an entire river. On purpose. In 1900. Still studied today as one of the great engineering flexes in American history. The deep-dish pizza situation and the skyline share exactly one trait: total, unwavering confidence. 🍕🏙️ #glotemp #Chicago', 'Chicago river skyline'),
  (18, 4, '16:30', 'instagram', 'Single image', 'Lost city', 'Troy wasn''t one city. It was at least NINE, stacked on top of each other across 3,000 years. 🏺 When Heinrich Schliemann went digging in 1870, he was in such a hurry to find Homer''s Troy that he drove a trench straight down THROUGH the layer he was actually looking for. The gold he proudly called ''the Treasure of Priam''? It belongs to a layer roughly a thousand years older than any war Homer could have described. #glotemp #LostCities', 'Troy Hisarlik archaeological site Turkey'),
  (19, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Mumbai''s dabbawalas deliver over 200,000 lunchboxes a day, city-wide, with near-perfect accuracy -- no barcodes, no app, no GPS. Also, the whole city used to be seven separate islands, quietly stitched together over centuries. Mumbai: turning logistics and geography into a personality trait. 🍱🏝️ #glotemp #Mumbai', 'Mumbai dabbawalas lunchbox delivery'),
  (20, 4, '16:30', 'instagram', 'Single image', 'Legend', 'Off the tip of Cornwall, legend says there''s an entire drowned country -- lost in a single night, its church bells still ringing in bad weather. Tristan, of Arthurian legend, is said to be from there. Here''s the real bit underneath the story: rising seas after the last Ice Age genuinely DID drown land around the Isles of Scilly, splitting islands that used to be joined. It just happened over thousands of years, long before the legend''s timeline. Even the myth has a footnote in fact. 🌊⚓ #glotemp #LostCities', 'Land''s End Cornwall Isles of Scilly coast'),
  (21, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Dublin''s Ha''penny Bridge gets its name from the toll once charged to cross it -- half a penny, cash only, no exceptions. Somehow the nickname outlived the toll by about 150 years. Some branding just sticks. 🌉 #glotemp #Dublin', 'Ha''penny Bridge Dublin'),
  (22, 4, '16:30', 'instagram', 'Single image', 'Lost city', 'We don''t actually know what the people who built Teotihuacan called themselves, or what language they spoke. 🌄 ''Teotihuacan'' is a name the Aztecs gave it CENTURIES after it fell -- they found it already ruined and treated it as sacred ground, as far removed from its builders in time as we are from the Norman Conquest. In 2003, archaeologists opened a tunnel sealed for around 1,800 years and found a floor scattered with pyrite, to imitate stars. #glotemp #LostCities', 'Teotihuacan Avenue of the Dead Mexico'),
  (23, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Nairobi is one of the only capital cities on Earth with an actual national park inside its limits -- lions, giraffes, the whole cast, a short drive from the skyline. Most cities have a zoo. Nairobi just left the wildlife where it was and built around it. 🦁🏙️ #glotemp #Nairobi', 'Nairobi National Park lions skyline'),
  (24, 4, '16:30', 'instagram', 'Single image', 'Legend', 'Hyperborea was supposed to be a land ''beyond the north wind'' where nobody got sick, nobody grew old, and the sun never really set. Ancient Greek writers described it with total confidence -- while admitting they''d only ever heard about it secondhand, from people who''d also only heard about it. 🧊 Even Herodotus, writing in the 5th century BCE, basically said ''look, I''m just repeating what I was told.'' Cartographers were STILL drawing it on ''serious'' maps 2,000 years later. No evidence. Incredible commitment. #glotemp #LostCities', null),
  (25, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Madrid is Europe''s highest-altitude capital city, and the Prado holds one of the finest art collections anywhere on the continent. High up, high culture. Coincidence? Probably. Still fun to say. 🎨⛰️ #glotemp #Madrid', 'Prado Museum Madrid'),
  (26, 4, '16:30', 'instagram', 'Single image', 'Lost city', 'For decades, colonial writers insisted Africans couldn''t have built Great Zimbabwe -- and credited it to literally anyone else, including a Biblical queen. 🏯 The truth: it was built by ancestral Shona people, granite walls up to 11 metres high, laid without a drop of mortar. A 1929 excavation PROVED African origin, and the finding was suppressed for decades anyway. Modern Zimbabwe took its name from this site at independence in 1980. #glotemp #LostCities', 'Great Zimbabwe ruins granite walls'),
  (27, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Jakarta is sinking faster than almost any city on Earth -- part of why Indonesia is literally building a new capital elsewhere. It''s also affectionately nicknamed ''the Big Durian,'' a cheeky nod to New York''s ''Big Apple.'' Same energy, considerably more pungent fruit. 🌆 #glotemp #Jakarta', 'Jakarta skyline Indonesia'),
  (28, 4, '16:30', 'instagram', 'Single image', 'Legend', 'The Seven Cities of Cíbola were supposed to be golden. What Coronado''s expedition actually found in 1540 was a Zuni pueblo called Hawikuh -- real people, real homes, zero gold. 😬 A friar had reported seeing ''a great city'' from a distance the year before. He hadn''t gone closer. He should have gone closer. The golden cities never existed. The people who paid for that mistake were very real. #glotemp #LostCities', 'Hawikuh Zuni pueblo ruins New Mexico'),
  (29, 4, '16:30', 'instagram', 'Single image', 'Trivia', 'Edinburgh''s Old Town and New Town are BOTH UNESCO World Heritage Sites, sitting right next to each other -- a genuinely rare flex. Also: parts of Harry Potter were reportedly written in the city''s cafés. Mild history AND main character energy, on the same street. ✨☕ #glotemp #Edinburgh', 'Edinburgh Old Town skyline'),
  (30, 4, '16:30', 'instagram', 'Single image', 'Legend', 'As an army approached Lake Svetloyar in 1238, legend says the people of Kitezh didn''t fight and didn''t flee. They prayed -- and the whole city sank beneath the lake rather than be taken. 🔔 The story says it''s still down there, and that the pure of heart can still hear its bells ringing under the water. Lake Svetloyar is real -- pilgrims still walk around it today. The city under it was never found, because there''s nothing to find. Real ruins, pure legend, always clearly labelled either way. 🌍 #glotemp #LostCities', 'Lake Svetloyar Russia')
on conflict (day_number, slot_number) do nothing;

insert into x_content_calendar (day_number, slot_number, scheduled_time, theme, tweet_text, image_note) values
  (1, 4, '16:00', 'Trivia', 'Cairo''s Al-Azhar University was founded in 970 and is still teaching classes today -- older than most countries currently on a map. glo-temp.com reads Cairo''s pulse live.', 'Image: city photo'),
  (2, 4, '16:00', 'Lost city', 'Petra''s famous ''Treasury'' facade is called that because of a legend a pharaoh hid gold in the stone urn above the door. People shot at it for centuries hoping gold would spill out. It''s a tomb. Bullet marks are still there.', 'Image: city photo'),
  (3, 4, '16:00', 'Trivia', 'Istanbul is the only city in the world that sits on two continents. The Grand Bazaar there has been trading since 1461 -- over 4,000 shops, one roof, five and a half centuries. glo-temp.com reads Istanbul live.', 'Image: city photo'),
  (4, 4, '16:00', 'Legend', 'Atlantis was never lost because it was never real. Plato invented it around 360 BCE as a moral story -- his own student Aristotle seems to have thought he made it up. No coordinates. No ruins. Just an extremely durable rumour.', 'Image: city photo'),
  (5, 4, '16:00', 'Trivia', 'Several Moscow Metro stations look like underground palaces -- chandeliers, mosaics, marble. Also: Red Square isn''t named for communism. ''Red'' in old Russian also meant ''beautiful.'' glo-temp.com reads Moscow''s pulse live.', 'Image: city photo'),
  (6, 4, '16:00', 'Lost city', 'The Spanish conquistadors never found Machu Picchu -- not because it was hidden, but because nobody told them. When it was ''discovered'' in 1911, local farming families were already living there. They''d known the whole time.', 'Image: city photo'),
  (7, 4, '16:00', 'Trivia', 'Vatican City is an entire sovereign country sitting inside Rome. The Trevi Fountain collects about €1 million a year in tossed coins, donated to charity. Rome contains multitudes, several of them literal nations.', 'Image: city photo'),
  (8, 4, '16:00', 'Legend', 'El Dorado was never a golden city. It was a MAN -- a Muisca ruler covered in gold dust, rowed onto Lake Guatavita to make offerings. The story grew a city around him. Thousands died searching for a place that was always a ceremony.', 'Image: city photo'),
  (9, 4, '16:00', 'Trivia', 'Amsterdam has more bicycles than people, and its historic centre is built on over 11,000 wooden piles. The whole city is basically standing on a very old, very patient forest.', 'Image: city photo'),
  (10, 4, '16:00', 'Lost city', 'Pompeii''s famous body casts aren''t bodies -- they''re voids left in hardened ash where bodies decayed away. Someone worked out you could pour plaster into the gaps in the 1860s. History, paused mid-sentence.', 'Image: city photo'),
  (11, 4, '16:00', 'Trivia', 'Vienna''s State Opera stages a different production on almost every night of its season. No reruns. Also, Vienna''s topped global liveability rankings so often it''s basically got a trophy shelf.', 'Image: city photo'),
  (12, 4, '16:00', 'Legend', 'Shangri-La isn''t ancient folklore. It''s a novel -- James Hilton invented it in 1933 and never even visited the region he based it on. In 2001 a real Chinese county renamed itself Shangri-La for tourism. Fiction, out here rewriting maps.', 'Image: city photo'),
  (13, 4, '16:00', 'Trivia', 'Buenos Aires: birthplace of tango, and it has more bookshops per capita than almost anywhere on Earth. A city that dances hard and reads harder.', 'Image: city photo'),
  (14, 4, '16:00', 'Lost city', 'Angkor was never actually lost. Buddhist monks maintained it continuously for centuries and European visitors described it as early as the 1500s. In 1860, Europe just finally believed a Frenchman''s account and called it ''discovered.''', 'Image: city photo'),
  (15, 4, '16:00', 'Trivia', 'The Parthenon has almost no straight lines -- its columns subtly curve so they LOOK perfectly straight from a distance. Ancient Greek architects were correcting for optical illusion 2,500 years before it had a name.', 'Image: city photo'),
  (16, 4, '16:00', 'Legend', 'Breton legend says a city called Ys sank beneath the Bay of Douarnenez, and its church bells still ring under the water in storms. There''s an old saying: ''When Paris is drowned, Ys will rise again.'' Nothing''s ever actually been found there.', 'Image: city photo'),
  (17, 4, '16:00', 'Trivia', 'In 1900, Chicago reversed the flow of its own river -- a deliberate engineering feat still studied today. This is a city that looked at a river going the wrong way and just... fixed it.', 'Image: city photo'),
  (18, 4, '16:00', 'Lost city', 'Troy wasn''t one city -- it was at least nine, stacked across 3,000 years. When Schliemann dug for Homer''s Troy in 1870, he was in such a rush he drilled straight through the layer he was looking for. His ''Treasure of Priam'' is a thousand years too old.', 'Image: city photo'),
  (19, 4, '16:00', 'Trivia', 'Mumbai''s dabbawalas deliver 200,000+ lunchboxes a day with near-perfect accuracy -- no barcodes, no app. The city itself used to be seven separate islands, slowly joined into one over centuries.', 'Image: city photo'),
  (20, 4, '16:00', 'Legend', 'Legend says a whole country called Lyonesse sank off Cornwall in a single night. The sea floor''s been surveyed -- nothing''s there. But rising seas after the Ice Age really did slowly drown land around Scilly, over thousands of years, not one night.', 'Image: city photo'),
  (21, 4, '16:00', 'Trivia', 'Dublin''s Ha''penny Bridge is named for the toll once charged to cross it. The toll''s long gone. The name stuck around for 150+ years anyway.', 'Image: city photo'),
  (22, 4, '16:00', 'Lost city', 'Nobody knows what the builders of Teotihuacan called themselves -- even the Aztecs found it already ruined, centuries later, and treated it as sacred ground. A tunnel sealed for ~1,800 years was opened in 2003: pyrite scattered on the floor to imitate stars.', 'Image: city photo'),
  (23, 4, '16:00', 'Trivia', 'Nairobi has a full national park -- lions, giraffes, the works -- inside its city limits, a short drive from downtown. Most cities build a zoo. Nairobi just kept the original.', 'Image: city photo'),
  (24, 4, '16:00', 'Legend', 'Hyperborea was a mythical land ''beyond the north wind'' where nobody aged. Even Herodotus admitted in the 5th century BCE he only had the story secondhand. Cartographers were STILL drawing it on serious maps 2,000 years later.', 'No image'),
  (25, 4, '16:00', 'Trivia', 'Madrid is Europe''s highest capital city by altitude. The Prado Museum there holds one of the finest art collections in the world. Make of that combination what you will.', 'Image: city photo'),
  (26, 4, '16:00', 'Lost city', 'Great Zimbabwe was built by ancestral Shona people, granite walls up to 11 metres high, zero mortar. Colonial writers insisted it couldn''t be African-built. A 1929 excavation proved otherwise -- and got suppressed anyway. Modern Zimbabwe took its name from this site in 1980.', 'Image: city photo'),
  (27, 4, '16:00', 'Trivia', 'Jakarta is sinking faster than almost any city on Earth -- part of why Indonesia is building an entirely new capital elsewhere. It''s nicknamed ''the Big Durian,'' a nod to NYC''s ''Big Apple.'' Same swagger, louder fruit.', 'Image: city photo'),
  (28, 4, '16:00', 'Legend', 'The ''Seven Cities of Cíbola'' were supposed to be gold. Coronado''s 1540 expedition found a Zuni pueblo instead -- real homes, zero gold, based on a friar''s report who''d seen a city from a distance and never gone closer. Should''ve gone closer.', 'Image: city photo'),
  (29, 4, '16:00', 'Trivia', 'Edinburgh''s Old Town and New Town are both UNESCO World Heritage Sites, side by side. Also: parts of Harry Potter were reportedly written in the city''s cafés. Rare combo, honestly.', 'Image: city photo'),
  (30, 4, '16:00', 'Legend', 'Legend says the city of Kitezh sank into Lake Svetloyar in 1238 rather than be conquered -- and the pure of heart can still hear its bells underwater. The lake is real. The city was never found, because it was never there. More lost & mythical cities: glo-temp.com/gem', 'Image: city photo')
on conflict (day_number, slot_number) do nothing;
