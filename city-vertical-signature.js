// Glotemp Vertical Signature: the starter content layer for the ten
// verticals that don't already have a live per-vertical data source
// (Pulse is the check-in system itself; Radio is Radio Browser's live
// station index -- neither needs this).
//
// WHY THIS EXISTS
// #<vertical>-content is meant to hold live readings from the `readings`
// table, populated by scheduled edge functions. Most of the platform's
// 300 cities have thin or no reading history yet, which is what an early
// site looks like -- but an empty accordion body reads as broken, not
// early. This is the fallback of last resort: it only ever renders when
// the live reading fetch in generate-city-pages.js's loadCityData()
// comes back with zero rows for that vertical, so a real reading always
// wins the moment one exists.
//
// TWO TIERS, BOTH HONEST
//   1. CURATED -- a hand-picked set of well-known real institutions and
//      landmarks for a few dozen major, globally-recognised cities.
//      Held to the same bar as city-food-signature.js: real, commonly
//      known, never a specific unverifiable claim.
//   2. GENERATED -- for every other city, a short paragraph built from
//      real attributes already in cities-data.js (region, country, metro
//      size) and an honest, size-appropriate register. No invented
//      company names, no invented institutions -- a small city with no
//      real tech scene is told exactly that, not handed a fabricated
//      list of startups. This is deliberately more conservative than the
//      Food vertical's editorial placeholders (city-venues.js), because
//      claiming a named bank or hospital exists is a different kind of
//      claim than suggesting a plausible restaurant style.
//
// Deterministic per (city, vertical): the same city always gets the same
// generated variant, selected by a seeded hash rather than Math.random,
// so reloading a page doesn't reshuffle its own copy.
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function seedFrom(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  // ===== 1. curated real facts for well-known cities =====
  // Not every vertical for every city here -- only where the fact is
  // genuinely well established and worth naming specifically.
  var CURATED = {
    tokyo: {
      tech: 'Home to Sony, Rakuten and Sony’s Shibuya-area startup corridor, with a dense coworking scene around Roppongi and Shibuya.',
      finance: 'Asia’s largest stock exchange, the Tokyo Stock Exchange, sits in Chuo, alongside the head offices of Japan’s largest banking groups.',
      education: 'The University of Tokyo and Waseda University anchor a city with one of the world’s highest concentrations of higher education.',
      sport: 'Home to the Tokyo Dome and the Yomiuri Giants, plus the 2020 Olympic venues still in daily use across the city.',
      entertainment: 'Kabuki-za theatre, Shinjuku’s live-music basements, and the neon density of Shibuya and Shinjuku after dark.',
      transport: 'Haneda and Narita airports, and a rail network -- the Yamanote Line at its core -- regularly ranked among the world’s most punctual.',
    },
    london: {
      tech: 'A major European tech hub centred on Shoreditch and King’s Cross, home to DeepMind and a dense fintech cluster.',
      finance: 'The City of London and Canary Wharf together form one of the world’s two or three largest financial centres, home to the London Stock Exchange.',
      education: 'Imperial College London, UCL, and the London School of Economics sit among a genuinely dense concentration of world-ranked universities.',
      sport: 'Wembley Stadium, Lord’s Cricket Ground, and a football culture spread across a dozen professional clubs.',
      entertainment: 'The West End theatre district, alongside live-music venues from Brixton Academy to the O2.',
      transport: 'Heathrow, one of the world’s busiest international airports, and the London Underground, the world’s oldest metro system.',
    },
    nyc: {
      tech: 'A major US tech hub second only to Silicon Valley in scale, with startup density concentrated around Manhattan and Brooklyn.',
      finance: 'Wall Street and the New York Stock Exchange anchor the world’s largest financial centre by market capitalisation.',
      education: 'Columbia University and NYU sit among a city with more universities than almost anywhere else in the country.',
      sport: 'Madison Square Garden, Yankee Stadium, and professional franchises across nearly every major US sport.',
      entertainment: 'Broadway’s theatre district, plus a live-music scene running from small Brooklyn venues to Radio City Music Hall.',
      transport: 'JFK and LaGuardia airports, and a 24-hour subway system that is the backbone of how the city actually moves.',
    },
    paris: {
      tech: 'Station F, one of the world’s largest startup campuses, anchors a growing tech and coworking scene.',
      finance: 'La Défense is France’s primary business district, home to the headquarters of much of the country’s largest companies.',
      education: 'The Sorbonne and Sciences Po sit among a centuries-old university system that still shapes the city’s Left Bank.',
      sport: 'The Stade de France and Parc des Princes, home to Paris Saint-Germain.',
      entertainment: 'A theatre and cabaret tradition running from the Comédie-Française to the Moulin Rouge.',
      transport: 'Charles de Gaulle airport and the Métro, one of the densest metro networks in the world.',
    },
    berlin: {
      tech: 'A major European startup hub, especially around Mitte and Kreuzberg, with a coworking density to match.',
      finance: 'Germany’s political capital rather than its financial one -- Frankfurt carries that role -- though Berlin’s fintech scene has grown fast.',
      education: 'Humboldt University and the Free University of Berlin anchor a large, historic public university system.',
      sport: 'The Olympiastadion and a football culture built around Hertha BSC and Union Berlin.',
      entertainment: 'A techno and club scene built around venues like Berghain, alongside a serious theatre and opera tradition.',
      transport: 'Berlin Brandenburg airport and an S-Bahn/U-Bahn network that covers the city thoroughly.',
    },
    singapore: {
      tech: 'A major Southeast Asian tech and fintech hub, with Grab and Sea Group headquartered here.',
      finance: 'One of the world’s largest financial centres, home to the Monetary Authority of Singapore and a dense concentration of global bank offices.',
      education: 'The National University of Singapore and Nanyang Technological University both rank among Asia’s strongest research universities.',
      sport: 'The Singapore Sports Hub and an annual Formula 1 night race through the city’s streets.',
      transport: 'Changi Airport, consistently rated among the world’s best, and an MRT network that makes a car close to unnecessary.',
    },
    dubai: {
      tech: 'Dubai Internet City anchors a growing regional tech and startup scene backed by government investment.',
      finance: 'The Dubai International Financial Centre is the Middle East’s largest financial free zone.',
      sport: 'The Dubai World Cup horse race and a growing calendar of international golf and tennis events.',
      entertainment: 'A nightlife and entertainment scene built around Downtown Dubai and Dubai Marina.',
      transport: 'Dubai International Airport, one of the world’s busiest by international passenger traffic, and a driverless metro line.',
    },
    'hong-kong': {
      tech: 'A dense fintech and startup scene concentrated around Cyberport and Science Park.',
      finance: 'One of the world’s largest financial centres, home to the Hong Kong Stock Exchange and a dense concentration of global bank headquarters.',
      education: 'The University of Hong Kong and HKUST both rank among Asia’s top research universities.',
      transport: 'Hong Kong International Airport and the MTR, a metro system known for running close to full capacity, reliably.',
    },
    'san-francisco': {
      tech: 'The historic centre of the US tech industry, with startup and venture-capital density unmatched almost anywhere.',
      finance: 'A significant West Coast banking presence, though smaller in scale than New York’s.',
      education: 'UC San Francisco and Stanford, just south in Silicon Valley, anchor the region’s research base.',
      transport: 'San Francisco International Airport and BART, the regional rail system connecting the Bay Area.',
    },
    'los-angeles': {
      tech: 'A growing tech scene nicknamed "Silicon Beach," concentrated around Santa Monica and Venice.',
      entertainment: 'Hollywood, still the symbolic centre of the global film industry, alongside a genuinely large live-music scene.',
      sport: 'SoFi Stadium and the Dodgers, Lakers and Clippers all calling the city home.',
      transport: 'Los Angeles International Airport, one of the world’s busiest, and a metro rail network still expanding.',
    },
    mumbai: {
      finance: 'India’s financial capital, home to the Bombay Stock Exchange and the headquarters of most of the country’s largest banks.',
      entertainment: 'The centre of Bollywood, India’s Hindi-language film industry, based largely out of Film City.',
      transport: 'Chhatrapati Shivaji Maharaj International Airport and a suburban rail network that moves millions of commuters daily.',
    },
    shanghai: {
      finance: 'China’s financial capital, home to the Shanghai Stock Exchange and the Lujiazui financial district in Pudong.',
      tech: 'A major Chinese tech hub, with a dense concentration of startups and e-commerce companies.',
      transport: 'Two international airports and the Shanghai Maglev, the world’s first commercially operated high-speed maglev line.',
    },
    sydney: {
      sport: 'The Sydney Cricket Ground and Accor Stadium, alongside one of the world’s most active harbour sailing cultures.',
      entertainment: 'The Sydney Opera House anchors a genuinely large performing-arts and live-music scene.',
      transport: 'Sydney Airport and a train and ferry network built around the harbour.',
    },
    toronto: {
      tech: 'Canada’s largest tech hub, with a fast-growing AI research cluster tied to the University of Toronto.',
      finance: 'Canada’s financial capital, home to the Toronto Stock Exchange and the headquarters of the country’s largest banks.',
      education: 'The University of Toronto is consistently ranked among the world’s top research universities.',
      sport: 'Scotiabank Arena, home to the Maple Leafs and Raptors.',
    },
    amsterdam: {
      tech: 'A significant European startup hub, with a strong fintech and agtech presence.',
      finance: 'Euronext Amsterdam is one of Europe’s oldest stock exchanges, tracing back to the Dutch East India Company.',
      transport: 'Schiphol Airport, one of Europe’s busiest, and a cycling culture that shapes the whole city’s infrastructure.',
    },
    barcelona: {
      tech: 'A growing Southern European tech hub, host to the Mobile World Congress each year.',
      sport: 'Camp Nou, home to FC Barcelona, and a strong recreational cycling and running culture along the coast.',
      entertainment: 'A live-music and nightlife scene built around the Gothic Quarter and El Raval.',
    },
    seoul: {
      tech: 'Home to Samsung and Naver, with a startup scene concentrated around the Gangnam district.',
      entertainment: 'The centre of the K-pop and Korean drama industry, with entertainment agencies clustered around Gangnam and Hongdae.',
      transport: 'Incheon International Airport and one of the world’s most extensive metro systems.',
    },
    bangkok: {
      entertainment: 'A nightlife scene spanning rooftop bars, live-music venues, and the markets of Chatuchak.',
      transport: 'Suvarnabhumi Airport and the BTS Skytrain, which cut through the city’s notorious traffic.',
    },
    lagos: {
      tech: 'West Africa’s largest tech hub, nicknamed "Yabacon Valley" around the Yaba district, home to a dense cluster of fintech startups.',
      finance: 'Nigeria’s commercial capital, home to the Nigerian Exchange and the country’s largest banks.',
      entertainment: 'The commercial centre of Nigeria’s Afrobeats music industry and Nollywood film production.',
    },
    nairobi: {
      tech: 'East Africa’s leading tech hub, nicknamed "Silicon Savannah," with a fintech scene built on the success of M-Pesa mobile money.',
      finance: 'Kenya’s financial capital, home to the Nairobi Securities Exchange.',
    },
    istanbul: {
      finance: 'Turkey’s commercial and financial capital, home to Borsa Istanbul and the Levent business district.',
      transport: 'Istanbul Airport, one of the world’s busiest, and a ferry network across the Bosphorus that functions as everyday transit.',
    },
    moscow: {
      finance: 'Russia’s financial capital, home to the Moscow Exchange and the Moscow International Business Center.',
      transport: 'The Moscow Metro, famous for its ornate Soviet-era stations, still carries millions of passengers daily.',
    },
    'sao-paulo': {
      finance: 'Brazil’s financial capital, home to B3, Latin America’s largest stock exchange.',
      tech: 'Latin America’s largest tech hub, with a startup scene concentrated around the Vila Madalena district.',
    },
    'mexico-city': {
      finance: 'Mexico’s financial capital, home to the Bolsa Mexicana de Valores.',
      education: 'UNAM, one of Latin America’s largest and oldest universities, anchors the city’s academic life.',
    },
    cairo: {
      education: 'Cairo University and the American University in Cairo anchor one of the Arab world’s oldest university systems.',
      transport: 'Cairo International Airport and a metro system that is the oldest in Africa.',
    },
  };

  // ===== 2. generated fallback for everywhere else =====
  var TIER_THRESHOLDS = { major: 3000000, mid: 500000 };
  function tierFor(metroPop) {
    if (metroPop >= TIER_THRESHOLDS.major) return 'major';
    if (metroPop >= TIER_THRESHOLDS.mid) return 'mid';
    return 'small';
  }

  var TEMPLATES = {
    tech: {
      major: [
        '{city}’s tech scene has real weight for a city this size — coworking spaces, funded startups, and a visible remote-work culture threading through {region}.',
        'As one of {country}’s larger metros, {city} carries a genuine startup and coworking footprint, with founders and remote workers drawn to its pace.',
        '{city} punches as a regional tech node — enough density of coworking spaces and early-stage companies that building here is a real option, not a stretch.',
      ],
      mid: [
        '{city} has a smaller but real tech presence — a handful of coworking spaces and a growing pool of remote workers who’ve chosen {region} over the bigger hubs.',
        'Not a tech capital, but {city} has the coworking infrastructure and connectivity for founders who want {region} without the crowd.',
        '{city}’s tech footprint is modest and growing — coworking spaces are appearing, and remote workers are starting to notice {region}.',
      ],
      small: [
        '{city} is not a tech hub, and it doesn’t pretend to be — but reliable connectivity and a slower pace have made it a quiet pick for a handful of remote workers passing through {region}.',
        'Tech infrastructure in {city} is thin — this is a place people visit, not build startups in, though a laptop and decent wifi will get you through.',
        '{city} offers little in the way of a formal tech scene; its appeal to remote workers is more about {region}’s pace than its coworking density.',
      ],
    },
    finance: {
      major: [
        '{city} carries real financial weight for {country} — a genuine banking and business-district presence, the kind of place fintech and traditional finance both take seriously.',
        'As a major economic centre in {region}, {city} has the banks, business districts and financial infrastructure to back it up.',
        '{city}’s financial sector is substantial enough to matter regionally — banking headquarters, business districts, and a visible fintech push all feature here.',
      ],
      mid: [
        '{city} has a functioning, if modest, financial sector — enough banking presence to serve {region} without rivalling the national centres.',
        'Finance in {city} is regional in scale: local banks, a business district of manageable size, and steady rather than spectacular economic signals.',
        '{city} plays a supporting financial role in {country} — solid banking access, without the scale of a national hub.',
      ],
      small: [
        '{city} has limited financial infrastructure of its own — most serious banking and business activity happens elsewhere in {region}.',
        'Finance is not {city}’s draw; expect basic banking services and little else in the way of a business district.',
        '{city}’s economy leans on other things — tourism and services more than finance — so banking presence here stays modest.',
      ],
    },
    work: {
      major: [
        'The job market in {city} is broad enough to support real career moves — major employers across multiple sectors, and a coworking scene that makes remote work genuinely comfortable.',
        '{city} functions as a real labour market — enough scale and diversity of employers that moving here for work is a normal decision.',
        'Work in {city} spans a wide range of employers and sectors, with the coworking infrastructure to match a metro of this size.',
      ],
      mid: [
        '{city}’s job market is regional in character — steady local employers, a workable but not sprawling range of sectors.',
        'Work here tends to be tied to {region}’s core industries rather than a broad, diversified market — solid, if not expansive.',
        '{city} offers a modest but real job market, anchored in {region}’s established industries.',
      ],
      small: [
        '{city}’s job market is small and closely tied to tourism and services — most residents work locally, in and around what the city itself offers visitors.',
        'Formal employment options in {city} are limited; the local economy runs largely on hospitality and small trade.',
        'Work opportunities in {city} are narrow — this is a place people visit and pass through more than one they relocate to for a career.',
      ],
    },
    property: {
      major: [
        'Housing in {city} reflects its size — a genuine range of neighbourhoods, from dense central districts to quieter outer areas, with rent and property prices to match a major metro.',
        '{city}’s property market has real depth: distinct neighbourhoods with their own character, and a rental market active enough to have a real seasonal rhythm.',
        'Real estate in {city} spans everything from compact central apartments to larger family homes further out — a market with genuine range.',
      ],
      mid: [
        '{city}’s housing market is smaller but legible — a handful of recognisable neighbourhoods, with rent that stays reasonable relative to {region}’s bigger cities.',
        'Property in {city} tends toward modest, stable pricing — fewer distinct districts than a major metro, but a market with its own steady character.',
        '{city} offers a manageable property market: a few clear neighbourhoods, rents that don’t spike the way they do in {region}’s larger centres.',
      ],
      small: [
        '{city}’s property market is small and largely local — few rental listings aimed at newcomers, and housing here tends to be inherited or long-held rather than actively traded.',
        'Formal real estate activity in {city} is limited; most housing turnover happens quietly, outside any visible rental market.',
        '{city} has little in the way of an active property market — it’s a place people are from, more than a place people move to.',
      ],
    },
    education: {
      major: [
        '{city} has real educational infrastructure — universities, established schools, and public libraries that serve a metro of genuine size.',
        'As a major centre in {region}, {city} carries the university presence and school system you’d expect from a city this size.',
        'Education in {city} spans multiple universities and a developed school system, with libraries woven through its neighbourhoods.',
      ],
      mid: [
        '{city} has a smaller but functioning education system — local schools and at least one institution of higher learning serving {region}.',
        'Education here is regional in scale: solid schools, a library or two, and higher learning that draws from {region} rather than the whole country.',
        '{city}’s schools and libraries serve the city well without the density of a major university town.',
      ],
      small: [
        '{city}’s education system is small — local schools cover the basics, but higher education means leaving for a bigger city in {region}.',
        'Formal education infrastructure in {city} is limited to what a small population needs; anything beyond that means travel.',
        '{city} has modest schooling and little in the way of higher education — most young people here eventually study elsewhere.',
      ],
    },
    sport: {
      major: [
        '{city} has a real sporting culture — stadiums, organised leagues, and enough population density to support serious fitness and outdoor-activity infrastructure.',
        'Sport in {city} runs deep: professional or semi-professional venues, active leagues, and a visible fitness culture across the city.',
        '{city}’s scale supports genuine sporting infrastructure — stadiums, clubs, and enough people to keep multiple sports genuinely competitive locally.',
      ],
      mid: [
        '{city} has a modest but real sports culture — local clubs and enough population to support recreational leagues, even without major stadiums.',
        'Sport in {city} tends toward participation over spectacle: gyms, local clubs, and outdoor activity rather than professional venues.',
        '{city}’s sporting life is community-scale — local leagues and fitness culture, without the stadium infrastructure of a bigger metro.',
      ],
      small: [
        '{city}’s sport is mostly informal — outdoor activity tied to the landscape around it, rather than organised leagues or venues.',
        'There’s little formal sporting infrastructure in {city}; what fitness culture exists here leans on the outdoors rather than gyms or stadiums.',
        'Sport in {city} means the outdoors more than anything organised — the terrain around {region} does most of the work.',
      ],
    },
    entertainment: {
      major: [
        '{city}’s entertainment scene has real range — theatres, cinemas, live music venues, and a nightlife that runs late across multiple districts.',
        'Entertainment in {city} spans the formal and the informal: established venues alongside a nightlife scene with genuine depth.',
        '{city} supports a full entertainment calendar — theatre, live music, cinema, and nightlife that doesn’t rely on any single district.',
      ],
      mid: [
        '{city} has a modest entertainment scene — a cinema or two, occasional live music, and nightlife that’s real but doesn’t run citywide.',
        'Entertainment here is concentrated rather than sprawling — a handful of venues that carry the city’s nightlife and culture.',
        '{city}’s evenings run on a smaller circuit — local venues rather than a citywide nightlife district.',
      ],
      small: [
        '{city}’s entertainment options are limited and mostly seasonal — tied to tourism more than a resident nightlife scene.',
        'There isn’t much formal entertainment infrastructure in {city}; evenings here tend to be quiet, tourism-dependent, or both.',
        'Entertainment in {city} leans on what visitors bring with them more than what the city runs on its own.',
      ],
    },
    fashion: {
      major: [
        '{city} has a visible style identity — enough retail density and design activity that fashion here reads as a real scene, not an afterthought.',
        'Fashion in {city} draws on {region}’s broader style influences, with enough scale to support its own retail and design identity.',
        '{city}’s fashion scene benefits from its size: real retail density, and enough people to sustain a genuine local style identity.',
      ],
      mid: [
        '{city} has a modest fashion identity — local style shaped more by {region}’s broader trends than by any citywide scene of its own.',
        'Fashion here is practical rather than a scene: retail exists, but {city} doesn’t function as a style destination the way {region}’s larger cities do.',
        '{city}’s style leans on what {region} wears more broadly — a real but understated fashion presence.',
      ],
      small: [
        '{city} doesn’t have a fashion scene of its own — clothing and style here follow {region}’s broader norms rather than any local identity.',
        'Formal fashion retail is thin in {city}; most style influence here comes from outside, via {region} at large.',
        'There’s little to call a fashion scene in {city} — practicality outweighs style in a place this size.',
      ],
    },
    health: {
      major: [
        '{city} has real healthcare infrastructure — hospitals, clinics, and a wellness culture with the density to match a major metro.',
        'Healthcare in {city} spans hospitals, private clinics, and a visible wellness scene — genuine depth for a city this size.',
        '{city}’s scale supports real healthcare access: hospitals, pharmacies, and a wellness culture running alongside them.',
      ],
      mid: [
        '{city} has functioning but modest healthcare — local clinics and pharmacies cover daily needs, with hospitals for anything more serious often meaning a trip into {region}.',
        'Healthcare in {city} is regional in scale: clinics and pharmacies handle the everyday, without the specialist depth of a bigger city.',
        '{city}’s health infrastructure is adequate for daily life, though specialist care often means travelling further into {region}.',
      ],
      small: [
        '{city}’s healthcare is basic — a clinic or pharmacy for everyday needs, with anything serious meaning travel to a larger centre in {region}.',
        'Formal healthcare infrastructure in {city} is thin; visitors and residents alike lean on {region}’s bigger cities for anything beyond routine care.',
        'Health services in {city} cover the essentials and little more — this isn’t a place with hospital-level infrastructure of its own.',
      ],
    },
    transport: {
      major: [
        '{city} moves at the scale you’d expect — real airport access, a functioning transit network, and enough infrastructure that getting around doesn’t require a car.',
        'Transport in {city} has real depth: airport connectivity, public transit, and a walkability that varies by district but is genuinely there.',
        '{city}’s size brings real transport infrastructure — airports, transit lines, and enough density that walking or public transport are genuine options.',
      ],
      mid: [
        '{city} has workable transport — a regional airport or reasonable access to one, and enough local transit to get around without much friction.',
        'Getting around {city} is manageable: not a transit-dense metro, but airport access and local transport cover most needs.',
        '{city}’s transport infrastructure is modest but functional — a workable way in and around the city, if not a sprawling network.',
      ],
      small: [
        '{city} has limited transport infrastructure — getting here usually means a longer overland journey or a connection through a bigger airport in {region}.',
        'Transport in {city} is minimal by design; this is a place reached deliberately, not passed through on a major transit line.',
        '{city}’s transport options are basic — expect to arrange travel in advance rather than rely on frequent local transit or a nearby airport.',
      ],
    },
  };

  function fill(template, city) {
    return template
      .replace(/\{city\}/g, city.name)
      .replace(/\{region\}/g, city.region)
      .replace(/\{country\}/g, city.country);
  }

  function generatedText(vertical, city) {
    var bank = TEMPLATES[vertical];
    if (!bank) return null;
    var tier = tierFor(city.metro_pop || 0);
    var variants = bank[tier];
    if (!variants || !variants.length) return null;
    var idx = seedFrom(city.slug + ':' + vertical) % variants.length;
    return fill(variants[idx], city);
  }

  function signatureText(vertical, city) {
    var curated = CURATED[city.slug] && CURATED[city.slug][vertical];
    return curated || generatedText(vertical, city);
  }

  // Renders only when the caller has already confirmed the live reading
  // fetch came back empty -- see generate-city-pages.js's loadCityData().
  function renderFallback(vertical, city) {
    var mount = document.getElementById(vertical + '-content');
    if (!mount || mount.children.length > 0 || mount.textContent.trim()) return;
    var text = signatureText(vertical, city);
    if (!text) return;
    var isCurated = !!(CURATED[city.slug] && CURATED[city.slug][vertical]);
    mount.innerHTML =
      '<div class="vertical-signature">' +
        '<p class="vertical-signature-text">' + esc(text) + '</p>' +
        '<span class="vertical-signature-tag">' +
          (isCurated ? 'What ' + esc(city.name) + ' is known for' : 'A starting read on ' + esc(city.name)) +
        '</span>' +
      '</div>';
  }

  window.GlotempVerticalSignature = { renderFallback: renderFallback, signatureText: signatureText };
})();
