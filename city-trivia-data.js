// Glotemp city trivia: short, verifiable, delightful facts for every city
// in cities-data.js. Kept to safely-true, widely-documented facts rather
// than precise unverifiable statistics -- where a claim is a commonly
// repeated legend rather than settled history (e.g. Lisbon vs Rome's age),
// the wording says so ("is often said to be", "legend holds"). Two facts
// per city where a good second one exists; never fabricated to hit a
// round number.
const CITY_TRIVIA = {
  tokyo: [
    "Tokyo has more Michelin-starred restaurants than any other city on Earth.",
    "Shibuya Crossing can see up to 3,000 people cross at once when the lights change.",
  ],
  delhi: [
    "Delhi has been continuously inhabited for over 2,500 years, across at least seven historic cities.",
    "The Qutub Minar in Delhi is the tallest brick minaret in the world.",
  ],
  shanghai: [
    "Shanghai's name literally translates to \"upon the sea\".",
    "The Shanghai Tower's lift is among the fastest in the world, reaching over 20 metres a second.",
  ],
  "sao-paulo": [
    "São Paulo has one of the largest Japanese populations of any city outside Japan.",
    "The city hosts one of the world's biggest Pride parades every year.",
  ],
  "mexico-city": [
    "Mexico City is slowly sinking. It's built on the drained bed of a former lake, Lake Texcoco.",
    "Xochimilco, its floating garden district, is still farmed and navigated by boat today.",
  ],
  cairo: [
    "Cairo sits just a few kilometres from the last standing wonder of the ancient world, the Great Pyramid of Giza.",
    "Cairo's Al-Azhar University, founded in 970, is one of the oldest continuously operating universities on Earth.",
  ],
  mumbai: [
    "Mumbai's dabbawalas deliver over 200,000 lunchboxes a day with near-perfect accuracy, no barcodes involved.",
    "The city was originally seven separate islands, joined together over centuries by land reclamation.",
  ],
  beijing: [
    "Legend holds the Forbidden City has 9,999.5 rooms, deliberately one half-room short of heaven's mythical 10,000.",
    "Beijing's subway is one of the longest and busiest metro systems in the world.",
  ],
  osaka: [
    "Osaka is nicknamed \"Japan's Kitchen\" for its street food culture, especially takoyaki.",
    "Osaka Castle's current structure dates to a 1931 rebuild, with elevators quietly added inside.",
  ],
  nyc: [
    "New York's subway runs 24 hours a day, every day of the year.",
    "Central Park is larger than the entire country of Monaco.",
  ],
  london: [
    "The London Underground opened in 1863, making it the world's oldest metro system.",
    "London has more parks and green space than most other major European capitals.",
  ],
  paris: [
    "The Eiffel Tower grows about 15cm taller in summer as its iron expands in the heat.",
    "Paris is said to have only one official stop sign in the entire city.",
  ],
  toronto: [
    "Toronto is one of the most multicultural cities on Earth. Over half its residents were born outside Canada.",
    "The CN Tower held the record for the world's tallest freestanding structure for over 30 years.",
  ],
  sydney: [
    "The Sydney Opera House's roof shells were inspired by orange peel segments.",
    "Locals call the Sydney Harbour Bridge \"the Coathanger\".",
  ],
  berlin: [
    "Berlin has more bridges than Venice.",
    "The city has three opera houses and around 180 kilometres of navigable waterways.",
  ],
  dubai: [
    "The Burj Khalifa is tall enough to watch the sunset twice: once at ground level, once again riding up before it sets.",
    "Dubai was mostly desert and fishing villages before the 1960s oil discovery reshaped it entirely.",
  ],
  singapore: [
    "Changi Airport has its own butterfly garden and a rooftop swimming pool for transit passengers.",
    "Singapore is one of only three surviving fully sovereign city-states in the world.",
  ],
  "hong-kong": [
    "Hong Kong has more skyscrapers than any other city on the planet.",
    "The Star Ferry has been crossing Victoria Harbour since 1888.",
  ],
  bangkok: [
    "Bangkok's full ceremonial name is one of the longest place names in the world, at over 160 letters.",
    "The city is still criss-crossed by canals locally known as klongs.",
  ],
  istanbul: [
    "Istanbul is the only city in the world that sits on two continents.",
    "The Grand Bazaar has over 4,000 shops under one roof and has been trading since 1461.",
  ],
  medellin: [
    "Medellín is known as the City of Eternal Spring for its famously mild, near-constant climate.",
    "Outdoor escalators built into a hillside neighbourhood became a symbol of the city's urban transformation.",
  ],
  bogota: [
    "Bogotá sits at over 2,600 metres above sea level, one of the highest capital cities in the world.",
    "The city closes over 120km of roads to cars every Sunday for Ciclovía, one of the world's largest recurring car-free events.",
  ],
  "buenos-aires": [
    "Tango was born in the working-class neighbourhoods of Buenos Aires in the late 19th century.",
    "The city has more bookshops per capita than almost anywhere else in the world.",
  ],
  santiago: [
    "Santiago sits in a valley framed by the Andes, visible from the city on a clear day.",
    "Chile's wine country begins just a short drive from downtown Santiago.",
  ],
  lima: [
    "Dozens of pre-Columbian pyramids sit within Lima's modern city limits.",
    "Peru's capital is considered one of the culinary capitals of the world.",
  ],
  moscow: [
    "Several Moscow Metro stations look like underground palaces, complete with chandeliers and mosaics.",
    "Red Square isn't named for communism. \"Red\" in old Russian also meant \"beautiful\".",
  ],
  seoul: [
    "Seoul has been the capital of Korea for over 600 years.",
    "The city has one of the fastest average internet speeds of any major city in the world.",
  ],
  ankara: [
    "Ankara became Turkey's capital in 1923, replacing Istanbul.",
    "The city has been continuously inhabited since the Bronze Age.",
  ],
  nairobi: [
    "Nairobi is one of the only capital cities in the world with a national park inside its limits, home to lions and giraffes.",
  ],
  lagos: [
    "Lagos is one of the fastest-growing megacities on Earth.",
    "Nollywood, based largely in Lagos, produces more films a year by count than Hollywood.",
  ],
  "los-angeles": [
    "LA has over 100 museums, more than any other city in the US.",
    "The Hollywood Sign originally read \"Hollywoodland\", built as a real-estate advertisement.",
  ],
  chicago: [
    "Chicago reversed the flow of its own river in 1900, an engineering feat still studied today.",
    "The city's deep-dish pizza and its skyline share the same trait: total confidence.",
  ],
  miami: [
    "Miami is the only major US city founded by a woman, Julia Tuttle.",
    "More than half of Miami's residents were born outside the United States.",
  ],
  houston: [
    "\"Houston\" really was the first word spoken from the surface of the Moon.",
    "The city has no formal zoning code, one of the only major US cities without one.",
  ],
  vancouver: [
    "Vancouver was ranked the world's most liveable city for several years running in the 2000s and 2010s.",
    "Stanley Park is larger than New York's Central Park.",
  ],
  montreal: [
    "Montreal is the second-largest French-speaking city in the world after Paris.",
    "An underground network of tunnels and shops stretches over 30km beneath the city.",
  ],
  "san-francisco": [
    "The Golden Gate Bridge's colour has an official name: International Orange.",
    "San Francisco's cable cars are a moving National Historic Landmark, the only one in the world.",
  ],
  guadalajara: [
    "Mariachi music and tequila both trace their roots to Guadalajara's home state, Jalisco.",
  ],
  atlanta: [
    "Coca-Cola was invented in Atlanta in 1886.",
    "Atlanta's airport has been among the world's busiest for over two decades running.",
  ],
  seattle: [
    "Seattle is home to the first Starbucks, opened in 1971.",
    "The Space Needle was built in under a year for the 1962 World's Fair.",
  ],
  "washington-dc": [
    "No building in Washington DC is allowed to be taller than the Capitol dome, by long-standing height limit.",
    "The White House has 132 rooms and its own bowling alley.",
  ],
  phoenix: [
    "Phoenix is the sunniest major city in the United States, with sunshine on the vast majority of days each year.",
  ],
  boston: [
    "Boston's subway, the \"T\", opened in 1897, making it the oldest in the Americas.",
    "The Boston Marathon is the world's oldest annual marathon, run every year since 1897.",
  ],
  monterrey: [
    "Monterrey is framed by the dramatic Cerro de la Silla, a mountain shaped like a saddle.",
  ],
  dallas: [
    "Dallas–Fort Worth shares one of the largest airports in the world by land area.",
  ],
  minneapolis: [
    "Minneapolis has more theatre seats per capita than any US city outside New York.",
    "The city's name blends the Dakota word for water, \"minne\", with the Greek word for city, \"polis\".",
  ],
  denver: [
    "Denver's official elevation is exactly one mile, 5,280 feet, marked on a step of the State Capitol.",
  ],
  philadelphia: [
    "Philadelphia hosted the signing of both the Declaration of Independence and the US Constitution.",
    "The Liberty Bell's famous crack appeared long before it became a symbol of freedom.",
  ],
  "san-diego": [
    "San Diego has one of the mildest climates in the United States, rarely straying far from perfect.",
  ],
  havana: [
    "Havana's classic American cars, many from the 1950s, are still kept running decades after imports stopped.",
  ],
  madrid: [
    "Madrid is Europe's highest capital city by altitude.",
    "The Prado Museum in Madrid holds one of the finest art collections in the world.",
  ],
  barcelona: [
    "Sagrada Família has been under construction since 1882 and still isn't finished.",
    "Barcelona's Eixample district was designed with chamfered corners specifically to improve visibility and airflow.",
  ],
  rome: [
    "Rome is home to a country within a country: Vatican City sits entirely inside it.",
    "The Trevi Fountain collects around a million euros in tossed coins every year, donated to charity.",
  ],
  milan: [
    "Milan's Duomo took nearly 600 years to complete.",
    "The city is one of the world's fashion capitals, hosting Fashion Week twice a year.",
  ],
  amsterdam: [
    "Amsterdam has more bicycles than people.",
    "The city's historic centre is built on more than 11,000 wooden piles.",
  ],
  warsaw: [
    "Warsaw was almost entirely rebuilt after WWII, brick by brick, using old paintings and photographs as reference.",
  ],
  stockholm: [
    "Stockholm is built across 14 islands, connected by more than 50 bridges.",
    "The city has hosted the Nobel Prize ceremony every year since 1901.",
  ],
  vienna: [
    "Vienna has topped global liveability rankings more often than almost any other city.",
    "The Vienna State Opera stages a different production on almost every night of its season.",
  ],
  prague: [
    "Prague's Astronomical Clock, installed in 1410, is the oldest of its kind still operating.",
  ],
  budapest: [
    "Budapest was once two cities, Buda and Pest, joined together across the Danube in 1873.",
    "The city sits on natural thermal springs, and its bathhouses have been in use since Roman times.",
  ],
  zurich: [
    "Zurich's lake sits right in the city centre, clean enough to swim in every summer.",
  ],
  munich: [
    "Munich's Oktoberfest began in 1810 as a royal wedding celebration and simply never stopped.",
  ],
  lisbon: [
    "Lisbon is often said to be older than Rome, with a history that may stretch back over 3,000 years.",
    "Its iconic yellow trams still climb some of the steepest streets in Europe.",
  ],
  brussels: [
    "Brussels has an official open-air comic route, dotted with murals of famous comic strip characters.",
  ],
  oslo: [
    "Oslo has gifted London a Christmas tree every year since 1947, as thanks for wartime support.",
  ],
  copenhagen: [
    "Copenhagen is one of the most bike-friendly cities in the world, with more bikes than cars commuting downtown.",
  ],
  helsinki: [
    "Helsinki has one of the highest concentrations of saunas per capita of any city on Earth.",
  ],
  athens: [
    "Athens has been continuously inhabited for over 3,000 years.",
    "The Parthenon has almost no straight lines. Its columns subtly curve to look perfectly straight from a distance.",
  ],
  bucharest: [
    "Bucharest's Palace of the Parliament is recognised as the heaviest building in the world.",
  ],
  kyiv: [
    "Kyiv's traditional founding dates back over 1,500 years, among the oldest cities in Eastern Europe.",
  ],
  dublin: [
    "Dublin's Ha'penny Bridge takes its name from the toll once charged to cross it.",
  ],
  lyon: [
    "Many chefs consider Lyon the culinary capital of France.",
    "The city's traboules, hidden passageways through buildings, once sheltered Resistance fighters.",
  ],
  rotterdam: [
    "Rotterdam was almost entirely rebuilt after WWII, and is now known for bold modern architecture, including cube houses tilted at 45 degrees.",
  ],
  krakow: [
    "Wawel Castle in Kraków was the seat of Polish kings for over 500 years.",
    "A trumpet call still plays hourly from a Kraków church tower, stopping abruptly mid-note in memory of a medieval watchman.",
  ],
  hamburg: [
    "Hamburg has more bridges than Amsterdam, Venice, and London combined.",
  ],
  edinburgh: [
    "Edinburgh's Old Town and New Town are both UNESCO World Heritage Sites, side by side.",
    "Parts of Harry Potter were reportedly written in the city's cafés.",
  ],
  seville: [
    "Seville's cathedral is the largest Gothic church in the world.",
    "Flamenco has deep roots in Seville's Triana neighbourhood.",
  ],
  porto: [
    "Port wine is named after this very city, where it has aged in riverside cellars for centuries.",
  ],
  sofia: [
    "Sofia is one of the oldest capital cities in Europe, with roughly 7,000 years of continuous habitation.",
  ],
  vilnius: [
    "Vilnius's Old Town is one of the largest surviving medieval old towns in Central and Eastern Europe.",
  ],
  bangalore: [
    "Bangalore is nicknamed India's Silicon Valley, home to thousands of tech companies.",
    "The city sits at a higher elevation than most of India, giving it famously mild weather.",
  ],
  hyderabad: [
    "Hyderabad's Charminar has stood at the city's heart since 1591.",
  ],
  dhaka: [
    "Dhaka is often called the rickshaw capital of the world, with hundreds of thousands plying its streets.",
  ],
  karachi: [
    "Karachi is one of the largest cities in the world by population, and Pakistan's main seaport.",
    "It's sometimes called the \"City of Lights\" for its round-the-clock energy.",
  ],
  kolkata: [
    "Kolkata was the capital of British India until 1911.",
    "The city is home to the oldest operating tramway network in Asia.",
  ],
  guangzhou: [
    "Guangzhou has been a major trading port for over 2,000 years.",
  ],
  shenzhen: [
    "Shenzhen grew from a fishing village of a few thousand people into a megacity of millions in about 40 years.",
  ],
  chengdu: [
    "Chengdu is home to a research base dedicated to giant panda breeding, one of the best places on Earth to see them.",
  ],
  wuhan: [
    "Wuhan sits at the confluence of the Yangtze and Han rivers and is a major transport hub.",
  ],
  taipei: [
    "Taipei 101 held the title of world's tallest building for six years after opening in 2004.",
  ],
  "kuala-lumpur": [
    "The Petronas Towers were the tallest buildings in the world until 2004, and remain the tallest twin towers on Earth.",
    "The city's name literally translates to \"muddy confluence\", describing where two rivers meet.",
  ],
  jakarta: [
    "Jakarta is sinking faster than almost any city in the world, part of why Indonesia is building a new capital elsewhere.",
    "It's affectionately nicknamed \"the Big Durian\", a nod to New York's Big Apple.",
  ],
  manila: [
    "Manila is one of the most densely populated cities on Earth.",
    "Its Intramuros walled city dates back to Spanish colonial rule in the 16th century.",
  ],
  "ho-chi-minh": [
    "Ho Chi Minh City was known as Saigon until 1976, a name many locals still use today.",
  ],
  hanoi: [
    "Hanoi has served as a capital city, on and off, for over a thousand years.",
  ],
  melbourne: [
    "Melbourne topped global liveability rankings for seven years running in the 2010s.",
    "The city is famous for weather that can shift through all four seasons in a single day.",
  ],
  auckland: [
    "Auckland is built across roughly 50 volcanic cones, most now dormant parks.",
  ],
  lahore: [
    "Lahore's Badshahi Mosque was, at completion in 1673, the largest mosque in the world.",
  ],
  colombo: [
    "Colombo's name likely comes from a Sinhalese phrase referring to its harbour, though the exact origin is debated.",
  ],
  yangon: [
    "The Shwedagon Pagoda in Yangon is said to be over 2,500 years old and is capped with thousands of diamonds and gemstones.",
    "Traffic still drives on the right, even though most cars are imported with the steering wheel on the right-hand side too.",
  ],
  kathmandu: [
    "Kathmandu Valley holds seven UNESCO World Heritage Sites within a relatively small area.",
  ],
  chennai: [
    "Chennai's Marina Beach is one of the longest urban beaches in the world.",
    "The city is one of India's major centres for classical Bharatanatyam dance.",
  ],
  pune: [
    "Pune is one of India's major education hubs, sometimes called the \"Oxford of the East\".",
  ],
  tianjin: [
    "Tianjin's Binhai Library, opened in 2017, looks like a giant eye when viewed from inside its curved shelving.",
  ],
  chongqing: [
    "Chongqing is built across such steep, mountainous terrain that some local transit works almost like an elevator.",
  ],
  nanjing: [
    "Nanjing has served as China's capital under several dynasties, and briefly during the early Republic era.",
  ],
  perth: [
    "Perth is one of the most isolated major cities in the world, separated from its nearest big-city neighbour by over 2,000km.",
  ],
  brisbane: [
    "Brisbane's river winds so much through the city that a ferry trip can cover far more distance than the same trip by road.",
  ],
  "phnom-penh": [
    "Legend says Phnom Penh takes its name from a hill (phnom) where a woman named Penh founded a temple after finding Buddha statues in the river.",
  ],
  busan: [
    "Busan is home to one of the world's largest department stores by floor area.",
    "The city hosts one of Asia's most prominent film festivals every autumn.",
  ],
  nagoya: [
    "Nagoya Castle's roof is topped with a pair of golden shachihoko, mythical tiger-headed carp.",
    "The city is a major centre of Japan's car industry.",
  ],
  fukuoka: [
    "Fukuoka is considered the birthplace of the modern ramen stall tradition, the yatai.",
    "It regularly ranks among the world's most liveable cities.",
  ],
  surabaya: [
    "Surabaya's name and symbol come from a legendary battle between a shark (sura) and a crocodile (baya).",
  ],
  "xi-an": [
    "Xi'an was the starting point of the ancient Silk Road, and is home to the Terracotta Army.",
  ],
  harbin: [
    "Harbin hosts one of the largest ice and snow sculpture festivals in the world every winter.",
  ],
  adelaide: [
    "Adelaide was carefully planned from its founding in 1836, ringed by parkland that still encircles the city today.",
  ],
  ulaanbaatar: [
    "Ulaanbaatar is the coldest capital city in the world by average annual temperature.",
    "Despite the cold, it's also one of the sunniest capitals on Earth.",
  ],
  sapporo: [
    "Sapporo's streets were laid out on a grid inspired by American city planning in the 1870s.",
    "It hosted the 1972 Winter Olympics, the first ever held in Asia.",
  ],
  vientiane: [
    "Vientiane is one of the smallest and quietest capital cities in Southeast Asia.",
    "The city sits directly on the Mekong River, across from Thailand.",
  ],
  tehran: [
    "Tehran sits at the foot of the Alborz mountains, with ski resorts less than an hour from downtown.",
  ],
  caracas: [
    "Caracas sits in a valley over 900 metres above sea level, close enough to the coast that a cable car connects it to the beach.",
  ],
  guayaquil: [
    "Guayaquil is Ecuador's largest city and main port, nicknamed the \"Pearl of the Pacific\".",
  ],
  quito: [
    "Quito's historic centre was one of the first UNESCO World Heritage Sites ever designated, in 1978.",
  ],
  fortaleza: [
    "Fortaleza is one of Brazil's sunniest cities, with beaches right along its urban coastline.",
  ],
  "belo-horizonte": [
    "Belo Horizonte was one of Brazil's first planned cities, laid out in the 1890s.",
  ],
  "porto-alegre": [
    "Porto Alegre pioneered participatory budgeting, letting residents vote directly on parts of the city budget, a model since copied worldwide.",
  ],
  recife: [
    "Recife is criss-crossed by rivers and bridges, earning it the nickname \"the Venice of Brazil\".",
  ],
  cali: [
    "Cali is considered the salsa capital of the world.",
  ],
  montevideo: [
    "Montevideo's Rambla waterfront promenade stretches over 20km, one of the longest continuous ones in the world.",
  ],
  curitiba: [
    "Curitiba is a pioneer of urban planning, and its bus rapid transit system has been studied by cities worldwide.",
  ],
  johannesburg: [
    "Johannesburg grew out of a 19th-century gold rush and is still nicknamed \"Egoli\", city of gold.",
  ],
  "cape-town": [
    "Cape Town's Table Mountain is older than the Himalayas and the Alps.",
  ],
  kinshasa: [
    "Kinshasa and Brazzaville are the closest pair of capital cities in the world, facing each other across the Congo River.",
  ],
  "addis-ababa": [
    "Addis Ababa sits at roughly 2,300 metres above sea level, one of the highest capital cities in the world.",
    "It's home to the headquarters of the African Union.",
  ],
  accra: [
    "Accra's name comes from \"nkran\", a local word for the black ants once common in the area.",
  ],
  "dar-es-salaam": [
    "Dar es Salaam's name means \"haven of peace\" in Arabic.",
    "Despite being Tanzania's largest city, it hasn't been the official capital since the 1970s. That's Dodoma.",
  ],
  casablanca: [
    "Casablanca's Hassan II Mosque has one of the tallest minarets in the world.",
    "Despite the famous film's title, almost none of \"Casablanca\" was actually shot there. It was filmed in a Hollywood studio.",
  ],
  dakar: [
    "Dakar is the westernmost city in mainland Africa.",
    "It's the traditional finish line of the original Dakar Rally, though the race itself now runs elsewhere.",
  ],
  algiers: [
    "Algiers is nicknamed \"Alger la Blanche\", Algiers the White, for the pale buildings covering its hillsides.",
  ],
  tunis: [
    "Tunis sits close to the ruins of ancient Carthage, one of antiquity's great trading powers.",
  ],
  riyadh: [
    "Riyadh's name comes from the Arabic word for gardens.",
  ],
  doha: [
    "Doha transformed from a pearling town into a global city largely within a single generation.",
    "Qatar hosted the first FIFA World Cup held in the Middle East in 2022, with matches played right here.",
  ],
  "abu-dhabi": [
    "Abu Dhabi sits mostly on an island, connected to the mainland by a handful of bridges.",
    "It's home to the Sheikh Zayed Grand Mosque, one of the largest in the world.",
  ],
  amman: [
    "Amman was built across seven hills, much like Rome, and locals still refer to some neighbourhoods by their hill numbers.",
  ],
  "tel-aviv": [
    "Tel Aviv has one of the largest collections of Bauhaus-style buildings in the world, earning its centre UNESCO status as the \"White City\".",
  ],
  beirut: [
    "Beirut is one of the oldest continuously inhabited cities in the world, with a history stretching back thousands of years.",
  ],
  muscat: [
    "Muscat has long limited building heights, keeping its skyline famously low compared to its Gulf neighbours.",
  ],
  "kuwait-city": [
    "Kuwait City's skyline is anchored by the Kuwait Towers, part water tower, part observation deck.",
  ],
  jeddah: [
    "Jeddah's Corniche stretches for kilometres along the Red Sea, dotted with public sculpture.",
    "The city is the traditional gateway for pilgrims travelling to Mecca.",
  ],
  baghdad: [
    "Baghdad was, for centuries, one of the largest and most advanced cities in the world, home to the legendary House of Wisdom.",
  ],
  "milton-keynes": [
    "Milton Keynes was purpose-built as a new town from 1967, laid out on a grid and famous for its roundabouts and grazing concrete cows.",
  ],
  lanzarote: [
    "In La Geria, Lanzarote's vines are grown in individual pits dug into volcanic ash and sheltered by small crescent-shaped stone walls called zocos, a wine-growing method found almost nowhere else on Earth.",
    "Lanzarote-born artist César Manrique shaped much of the island's architecture, including Jameos del Agua and Mirador del Río, around blending directly into its volcanic landscape rather than standing apart from it.",
  ],
};

if (typeof window !== 'undefined') window.CITY_TRIVIA = CITY_TRIVIA;
