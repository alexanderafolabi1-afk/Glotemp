const STORIES = [
  {
    city: "Kyiv",
    title: "Kyiv’s Unbreakable Spirit",
    slug: "kyiv-unbreakable",
    content: "Despite the hardships, Kyiv’s soul shines through its people, street art, and hidden coffee spots. Every day, locals transform bomb shelters into art galleries, and the scent of fresh borscht still drifts from kitchen windows. Walk through Podil and you’ll find centuries‑old courtyards filled with laughter, music, and the hum of a city that refuses to be silenced. The golden domes of St. Sophia still catch the morning light, a reminder that beauty endures.",
    excerpt: "Discover how a city at war still dances, paints, and dreams.",
    imageAlt: "Golden domes of St. Sophia Cathedral overlooking Kyiv, with locals walking through historic streets",
    trivia: "- Kyiv’s metro is one of the deepest in the world.\n- The Motherland Monument is taller than the Statue of Liberty.\n- Every spring, chestnut trees blanket the city in white blossoms.",
    history_nugget: "Kyiv was founded in the 5th century and became the centre of Kyivan Rus, a powerful medieval state that shaped Eastern Europe.",
    date: "2025-01-15"
  },
  {
    city: "Tokyo",
    title: "Midnight Whispers in Golden Gai",
    slug: "tokyo-golden-gai",
    content: "In Tokyo’s Shinjuku district, the narrow alleys of Golden Gai hold over 200 tiny bars, each the size of a living room. Here, you’ll meet bartenders who have perfected a single cocktail over decades, and locals who treat you like a neighbour after one drink. The neon glow seeps through sliding doors, and the clink of ice against glass mixes with stories of yesteryear. It’s a place where time slows down, and the real Tokyo – nostalgic, intimate, surreal – reveals itself after midnight.",
    excerpt: "Tokyo’s best-kept secret: 200 tiny bars and a thousand stories.",
    imageAlt: "Neon-lit narrow alley in Golden Gai with traditional Japanese bar entrances",
    trivia: "- Golden Gai survived World War II bombings and 1960s redevelopment.\n- Many bars seat only 5–8 people.\n- It’s a favourite haunt of artists, writers, and film directors.",
    history_nugget: "Golden Gai began as a black market area after WWII and evolved into a maze of micro‑bars that preserve Showa‑era charm.",
    date: "2025-01-22"
  },
  {
    city: "Mexico City",
    title: "The Floating Gardens of Xochimilco",
    slug: "mexico-city-xochimilco",
    content: "A network of ancient canals winds through Mexico City’s southern edge, where colourful trajineras drift past floating gardens. Mariachi music bounces off the water as families, friends, and lovers celebrate life aboard painted boats. This isn’t just a tourist ride – it’s a living remnant of the Aztec chinampas, an agricultural marvel that fed an empire. Today, you can taste pulque, hear the rhythm of marimba, and watch the sun set behind the volcanoes, all while floating through a UNESCO World Heritage site.",
    excerpt: "Where Aztec canals, mariachi, and floating fiestas collide.",
    imageAlt: "Colorful trajineras boats on Xochimilco canals with floating gardens and flowers",
    trivia: "- Xochimilco means ‘place of the flowers’ in Nahuatl.\n- The chinampas are still used to grow vegetables today.\n- The canals stretch over 170 km.",
    history_nugget: "Xochimilco was built by the Aztecs as an intricate system of artificial islands for agriculture, later declared a World Heritage site in 1987.",
    date: "2025-01-29"
  },
  {
    city: "Lagos",
    title: "Afrobeats & Ocean Beats",
    slug: "lagos-afrobeats",
    content: "Lagos doesn’t just move – it pulses. From the sweat‑drenched dance floors of New Afrika Shrine to the sun‑soaked beaches of Elegushi, the city is a rhythm you feel in your chest. Afrobeats fills every corner, blending tradition with futuristic swagger, and the nightlife is legendary. But beyond the clubs, there’s the quiet resilience of street hawkers, the art galleries of Lekki, and the taste of jollof rice by the lagoon. Lagos is chaos and beauty, a megacity that teaches you to dance with the unexpected.",
    excerpt: "From beach parties to legendary clubs, Lagos never sleeps.",
    imageAlt: "Beachfront view of Lagos with vibrant street scenes and modern buildings at sunset",
    trivia: "- Lagos is Africa’s most populous city, with over 20 million people.\n- It has one of the fastest‑growing tech scenes in the world.\n- The ‘Fela shrine’ is a museum and live music venue dedicated to Fela Kuti.",
    history_nugget: "Originally a small Yoruba fishing village, Lagos was colonised by the British and later became Nigeria’s economic powerhouse, fuelled by oil and creativity.",
    date: "2025-02-05"
  },
  {
    city: "Lisbon",
    title: "Fado, Tiles & Secret Miradouros",
    slug: "lisbon-fado",
    content: "Lisbon is a city built on seven hills, each offering a secret viewpoint where the pastel‑coloured buildings tumble down to the Tagus River. In the Alfama district, the mournful strains of fado seep through tavern walls, telling tales of longing and the sea. The streets are paved with tiny white stones, and every corner reveals a stunning azulejo tile panel. Ride Tram 28 as it screeches around hairpin bends, then stop for a pastel de nata and a shot of ginjinha. Lisbon is melancholy and light, all at once.",
    excerpt: "A city of seven hills, soulful music, and secret views.",
    imageAlt: "Terracotta rooftops of Alfama district overlooking the Tagus River with traditional tram",
    trivia: "- Lisbon is older than Rome by four centuries.\n- The Vasco da Gama Bridge is the longest in Europe.\n- Pastéis de Belém still uses a secret recipe from 1837.",
    history_nugget: "Lisbon was the heart of a global maritime empire in the 15th–16th centuries, and its unique Manueline architecture still reflects that golden age.",
    date: "2025-02-12"
  },
  {
    city: "Dubai",
    title: "Beyond the Skyline: Old Souls & Souks",
    slug: "dubai-old-souls",
    content: "Everyone knows Dubai for its soaring towers and luxury malls, but cross the Creek on an abra and you enter a different world. In Deira, the gold and spice souks overflow with saffron, oud, and the scent of frankincense. Barter with traders whose families have been here for generations, then taste Emirati luqaimat – sweet dumplings dripping with date syrup. The Al Fahidi Historical Neighbourhood hides wind‑tower architecture and art galleries in its narrow lanes. Dubai’s true wealth isn’t in its skyscrapers; it’s in the warmth of its people and the layers of history beneath the gloss.",
    excerpt: "Cross the Creek to find the Dubai that existed before the towers.",
    imageAlt: "Historic windtower architecture of Al Fahidi district with traditional souks and Dubai Creek",
    trivia: "- The Dubai Creek was the original trading port, long before oil.\n- Falconry is a major part of Emirati heritage.\n- The Burj Khalifa is three times taller than the Eiffel Tower.",
    history_nugget: "Dubai began as a small pearl‑diving village in the 18th century and transformed rapidly after the discovery of oil in the 1960s, guided by visionary leadership.",
    date: "2025-02-19"
  },
  {
    city: "Reykjavik",
    title: "Northern Lights & Bookworms",
    slug: "reykjavik-books",
    content: "In Reykjavik, there are more writers per capita than anywhere on Earth, and you can feel it in the crisp Arctic air. Cosy bookshops line Laugavegur street, and the city’s obsession with storytelling stretches back to the Viking sagas. By day, soak in geothermal pools as the northern winds whip past; by night, chase the aurora borealis across a black‑velvet sky. The sun barely sets in summer, and in winter, the darkness is broken only by the glow of fairy lights and the spark of imagination. Reykjavik is a city that lives through its stories.",
    excerpt: "Where Vikings wrote sagas and modern writers fill cosy cafes.",
    imageAlt: "Aurora borealis glowing over Reykjavik with colorful bookshop and geothermal steam",
    trivia: "- Iceland publishes more books per capita than any other country.\n- The city’s hot water comes directly from geothermal springs.\n- Reykjavik runs on almost 100% renewable energy.",
    history_nugget: "Settled by Norse explorers in the 9th century, Reykjavik is the world’s northernmost capital and the home of the Althing, one of the oldest parliaments.",
    date: "2025-02-26"
  },
  {
    city: "Cairo",
    title: "Pyramids, Chaos & Street Feast",
    slug: "cairo-street-feast",
    content: "Cairo is a sensory overload in the best possible way. The call to prayer echoes over rooftops as the scent of sizzling kofta and fresh aish baladi fills the streets. Vendors hawk prickly pears while traffic weaves an impossible dance around Khan El Khalili bazaar. And always, on the horizon, the Pyramids of Giza remind you that this city has been thriving for over 4,000 years. From the Coptic churches of Old Cairo to the buzzing cafes of Zamalek, Cairo feeds your soul as much as your stomach.",
    excerpt: "Ancient wonders and modern street life collide in glorious chaos.",
    imageAlt: "Pyramids of Giza on the horizon beyond Khan El Khalili bazaar with bustling streets",
    trivia: "- Cairo’s Al‑Azhar University is one of the oldest in the world.\n- The Great Pyramid was the tallest man‑made structure for over 3,800 years.\n- Egyptians eat more bread per capita than any other nation.",
    history_nugget: "Founded in 969 AD by the Fatimid dynasty, Cairo sits near the ancient capital of Memphis and the Giza Plateau, blending millennia of civilisation.",
    date: "2025-03-05"
  },
  {
    city: "Medellín",
    title: "Spring Eternal & Urban Reinvention",
    slug: "medellin-spring",
    content: "Medellín is known as the City of Eternal Spring, but its warmth goes beyond the climate. Once the world’s most dangerous city, it reinvented itself through art, libraries, and cable cars that connect the hillside barrios to the valley. Ride the MetroCable up to Comuna 13 and you’ll find vibrant murals, street rappers, and a community that turned pain into power. Sip world‑class coffee in a cafe overlooking the Aburrá Valley, and you’ll understand why paisas – the locals – are famous for their hospitality. Medellín doesn’t just bloom; it blossoms.",
    excerpt: "From notorious past to innovation mecca – a city reborn.",
    imageAlt: "Vibrant street murals of Comuna 13 with cable car and colorful hillside architecture",
    trivia: "- The city’s MetroCable was the first urban gondola lift used for public transport.\n- Medellín hosts the largest flower parade in the world (Feria de las Flores).\n- It’s nicknamed the ‘Silicon Valley of South America’ for its tech startups.",
    history_nugget: "Medellín transformed dramatically in the 2000s after decades of cartel violence, using urban architecture and education to drive social change.",
    date: "2025-03-12"
  },
  {
    city: "Bangkok",
    title: "Temples, Tuk‑Tuks & Midnight Mango",
    slug: "bangkok-midnight",
    content: "Bangkok is a city of contrasts: gold‑leafed temples sit next to neon‑lit night markets, and the scent of jasmine mixes with the sizzle of street‑side pad thai. Glide through the khlongs (canals) at dawn and you’ll see monks in saffron robes receiving alms, while later you can sip a mango cocktail on a rooftop bar 60 floors above the chaos. The Chatuchak weekend market swallows you whole, and the Grand Palace dazzles under the tropical sun. Bangkok never stops, but it always welcomes.",
    excerpt: "Where golden temples meet sky‑high cocktails and street food symphonies.",
    imageAlt: "Gold-leafed Buddhist temple spires with neon night market lights and tuk-tuks",
    trivia: "- Bangkok’s full ceremonial name is the longest city name in the world.\n- The Chatuchak market has over 15,000 stalls.\n- Thai massage was added to UNESCO’s Intangible Cultural Heritage list.",
    history_nugget: "Bangkok became the capital of Siam in 1782 after the fall of Ayutthaya, and its grand temples were built to restore national pride.",
    date: "2025-03-19"
  }
];
