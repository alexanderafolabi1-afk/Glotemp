-- Slot 4 of the X/Twitter calendar: same new recurring content type as
-- 20260823110100 (social_content_queue slot 4) -- real city trivia and
-- real/mythical lost cities -- rewritten to X's shorter, punchier
-- register rather than reused verbatim, matching how the existing 90
-- rows already differ in voice from their Instagram/Facebook
-- counterparts even when covering the same city. Depends on the schema
-- change in 20260823110000.
--
-- image_note is constrained to the same three values the table already
-- uses ('No image' / 'Image: brand card' / 'Image: city photo'); every
-- row below that has a real photographable subject (including legend
-- entries pointing at a real artwork or real place, never fantasy art
-- of the myth itself) uses 'Image: city photo'. Hyperborea has no such
-- real anchor, so it's 'No image', same call as its social_content_queue
-- counterpart having no image_search_term.
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
  (30, 4, '16:00', 'Legend', 'Legend says the city of Kitezh sank into Lake Svetloyar in 1238 rather than be conquered -- and the pure of heart can still hear its bells underwater. The lake is real. The city was never found, because it was never there. More lost & mythical cities: glo-temp.com/gem', 'Image: city photo');
