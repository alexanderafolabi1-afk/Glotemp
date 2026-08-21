/* Glotemp: lost and mythical cities, for the /gem die.
 *
 * TWO CATEGORIES, NEVER BLURRED
 *   category: 'ancient'  A real place. It exists, you can stand in it,
 *                        it has been excavated and dated. Everything in
 *                        `beats` is history.
 *   category: 'legend'   NOT a real place. Everything in `beats` is
 *                        what the story says, phrased as the story
 *                        saying it. Every legend entry additionally
 *                        carries a `status` line that states outright
 *                        that it has never been found -- that line is
 *                        mandatory (see the guard at the bottom of this
 *                        file) and glotemp-gem.js always renders it.
 *
 * A visitor must never be able to come away from this page thinking
 * Atlantis is a confirmed location. The category label, the "According
 * to legend" framing and the status line are three independent things
 * all saying so, so no single missing piece can leave a legend reading
 * as geography.
 *
 * TEXT
 * `beats` here are the curated tier. Where an entry has none,
 * glotemp-gem.js falls back to real Wikipedia extract sentences -- the
 * same two tiers, in the same order, that city-spotlight.js uses for
 * live cities. Nothing is ever written there to pad a thin entry out.
 *
 * IMAGES
 * `wikiTitle` is the article whose lead image and extract are fetched.
 *
 * For 'ancient' entries that image is a photograph of a real place, so
 * the article's own lead image is exactly right.
 *
 * For 'legend' entries it is NOT: an article about a myth can carry any
 * illustration at all, including modern fantasy art, and showing that
 * as though it documented somewhere would be the precise thing this
 * page must not do. So legends never use their own article's image.
 * They may name an `artwork` -- a specific, documented historical work
 * or map, with a caption saying what it is, who made it and when -- and
 * anything without one is text-only by design. glotemp-gem.js also
 * checks the article it gets back is the one it asked for before
 * showing any legend image, and falls back to text-only otherwise.
 */
(function () {
  'use strict';

  var ANCIENT = [
    {
      slug: 'machu-picchu',
      name: 'Machu Picchu',
      where: 'Peru',
      era: 'Built around 1450',
      wikiTitle: 'Machu Picchu',
      beats: [
        'Built for the Inca ruler Pachacuti around 1450 on a ridge at about 2,430 metres, and abandoned roughly a century later, around the time of the Spanish conquest. The Spanish never found it.',
        'Its finest walls are ashlar: blocks cut so precisely that they hold without mortar, and flex rather than fall in the earthquakes this region gets.',
        'Hiram Bingham brought it to international attention in 1911, but he was led there. Local farming families were living on the site and already knew the name.',
      ],
    },
    {
      slug: 'petra',
      name: 'Petra',
      where: 'Jordan',
      era: 'Nabataean capital from the 4th century BCE',
      wikiTitle: 'Petra',
      beats: [
        'The Nabataeans cut it into rose sandstone and grew rich taxing the incense and spice caravans that had to pass through their canyon.',
        'The real feat is water. Dams, rock-cut channels and cisterns caught flash floods and held them, which is the only reason a city of this size could sit in a desert gorge.',
        'Al-Khazneh, the facade everyone photographs, is called "the Treasury" because of a legend that a pharaoh hid gold in the urn above the door. Bullet marks from people shooting at the urn are still there. It is a tomb.',
        'Unknown to Europe until Johann Ludwig Burckhardt talked his way in disguised as a pilgrim in 1812. The Bedouin who guided him had never lost it.',
      ],
    },
    {
      slug: 'pompeii',
      name: 'Pompeii',
      where: 'Italy',
      era: 'Buried by Vesuvius in 79 CE',
      wikiTitle: 'Pompeii',
      beats: [
        'Vesuvius buried the town under metres of pumice and ash in 79 CE. Pliny the Younger watched from across the bay and wrote the only eyewitness account that survives.',
        'Rediscovered in 1748, forty years after neighbouring Herculaneum. What was preserved was not just buildings but the ordinary: loaves in ovens, election slogans painted on walls, graffiti about who loved whom.',
        'The famous casts came from a technique Giuseppe Fiorelli worked out in the 1860s. Bodies had decayed and left voids in the hardened ash; he poured plaster into the voids.',
      ],
    },
    {
      slug: 'angkor',
      name: 'Angkor',
      where: 'Cambodia',
      era: 'Khmer capital, 9th to 15th century',
      wikiTitle: 'Angkor',
      beats: [
        'At its height Angkor was among the largest pre-industrial urban complexes anywhere, spread across roughly a thousand square kilometres of temples, roads and reservoirs.',
        'Angkor Wat was built under Suryavarman II in the early 12th century as a Hindu temple to Vishnu, and became a Buddhist site later. It has never been fully abandoned.',
        'It was never really lost. Buddhist monks maintained it continuously and Portuguese and Spanish visitors described it in the 16th century. Henri Mouhot\'s account of 1860 is what made Europe believe it had been found.',
        'Its barays, vast rectangular reservoirs, fed a hydraulic system so large that its decline may have been partly a failure of water management.',
      ],
    },
    {
      slug: 'troy',
      name: 'Troy',
      where: 'Hisarlik, Türkiye',
      era: 'Occupied from about 3000 BCE',
      wikiTitle: 'Troy',
      beats: [
        'Not one city but at least nine, built on top of each other across three thousand years. Archaeologists number the layers Troy I to Troy IX.',
        'Frank Calvert identified the mound first and owned part of it. Heinrich Schliemann, digging from 1870, drove a trench straight down through the layers he was looking for in his hurry to reach them.',
        'The gold he called the Treasure of Priam belongs to a layer roughly a thousand years older than any war Homer could have been describing.',
      ],
    },
    {
      slug: 'palenque',
      name: 'Palenque',
      where: 'Mexico',
      era: 'Classic Maya, peak in the 7th century',
      wikiTitle: 'Palenque',
      beats: [
        'In 1952 Alberto Ruz Lhuillier lifted a slab in the floor of the Temple of the Inscriptions, found a stairway packed with rubble, and after four seasons of clearing it reached the tomb of K\'inich Janaab\' Pakal.',
        'Palenque carries one of the densest bodies of Maya hieroglyphic text anywhere, and it was central to the decipherment of the script.',
        'Only a fraction has been excavated. Most of the city is still under forest, and estimates of its extent keep growing.',
      ],
    },
    {
      slug: 'great-zimbabwe',
      name: 'Great Zimbabwe',
      where: 'Zimbabwe',
      era: '11th to 15th century',
      wikiTitle: 'Great Zimbabwe',
      beats: [
        'Built by ancestral Shona people. Its granite walls are laid without mortar, up to eleven metres high and five metres thick in the Great Enclosure.',
        'Colonial-era writers insisted Africans could not have built it and attributed it to Phoenicians or the Queen of Sheba. Gertrude Caton-Thompson\'s 1929 excavation confirmed African origin, and Rhodesian censors later suppressed that conclusion.',
        'Finds include Chinese celadon, Persian faience and coins from Kilwa: this was a node on the Indian Ocean trade network, not an isolated one.',
        'Modern Zimbabwe took its name from the site at independence in 1980.',
      ],
    },
    {
      slug: 'mesa-verde',
      name: 'Mesa Verde',
      where: 'Colorado, United States',
      era: 'Cliff dwellings built in the 1190s to 1270s',
      wikiTitle: 'Mesa Verde National Park',
      beats: [
        'Ancestral Puebloan people had farmed the mesa top for seven centuries before moving down into the alcoves in the cliff faces. Cliff Palace has about 150 rooms.',
        'They lived in the cliff dwellings for less than a hundred years. By the end of the 1200s the whole region had been left, during a long drought.',
        'Ranchers Richard Wetherill and Charlie Mason came upon Cliff Palace looking for stray cattle in 1888. In 1906 it became the first US national park created for what people built rather than for landscape.',
      ],
    },
    {
      slug: 'chan-chan',
      name: 'Chan Chan',
      where: 'Peru',
      era: 'Chimú capital, about 900 to 1470 CE',
      wikiTitle: 'Chan Chan',
      beats: [
        'The largest adobe city in the Americas: roughly twenty square kilometres of mud brick on the desert coast near modern Trujillo.',
        'Nine or ten walled royal compounds, each apparently built for a new ruler while the last one was kept as his mausoleum.',
        'Its walls carry friezes of fish, seabirds and nets. This was an ocean city, and the Chimú engineered canals to irrigate the desert around it.',
        'The Inca took it around 1470. Its enemy now is rain: adobe survives in a desert until El Niño brings water.',
      ],
    },
    {
      slug: 'mohenjo-daro',
      name: 'Mohenjo-daro',
      where: 'Sindh, Pakistan',
      era: 'Indus Valley, built around 2500 BCE',
      wikiTitle: 'Mohenjo-daro',
      beats: [
        'Laid out on a grid, with standardised fired brick, covered street drains and household bathrooms, at a date when most of the world had none of that.',
        'R. D. Banerji identified it in 1922. Before that, bricks from the site had been carted off to ballast a railway line.',
        'No palace and no obvious temple has been identified, and no royal burials. What the Indus cities were governed by is genuinely unknown.',
        'Its script is undeciphered, so we do not know what its people called it. "Mohenjo-daro" is a modern Sindhi name, roughly "mound of the dead".',
      ],
    },
    {
      slug: 'persepolis',
      name: 'Persepolis',
      where: 'Iran',
      era: 'Begun by Darius I around 518 BCE',
      wikiTitle: 'Persepolis',
      beats: [
        'The ceremonial capital of the Achaemenid Empire. The Apadana staircase reliefs show delegations from across the empire bringing tribute, each carved with its own dress and gifts.',
        'It burned in 330 BCE during Alexander\'s campaign. Ancient sources disagree on whether it was an accident during a drunken feast or deliberate revenge for the burning of Athens, and the argument is not settled.',
        'Clay tablets from the fortification archive record rations and wages paid to the workers who built it, women among them, which cuts against the old assumption of slave labour.',
      ],
    },
    {
      slug: 'skara-brae',
      name: 'Skara Brae',
      where: 'Orkney, Scotland',
      era: 'Occupied about 3180 to 2500 BCE',
      wikiTitle: 'Skara Brae',
      beats: [
        'Older than Stonehenge and older than the pyramids at Giza, and lived in for roughly six hundred years.',
        'A storm in the winter of 1850 stripped the grass off a dune and exposed the stone houses underneath.',
        'Orkney has almost no timber, so the furniture is stone and it survived: dressers facing the door, box beds, hearths, and tanks in the floor that may have held shellfish bait.',
      ],
    },
    {
      slug: 'teotihuacan',
      name: 'Teotihuacan',
      where: 'Mexico',
      era: 'Peak around 100 to 550 CE',
      wikiTitle: 'Teotihuacan',
      beats: [
        'At its height one of the largest cities in the world, well over a hundred thousand people, laid out on a grid along the Avenue of the Dead.',
        'We do not know what its builders called themselves or what language they spoke. "Teotihuacan" is Nahuatl, the name the Aztecs gave it centuries after it fell, meaning roughly the place where the gods were created.',
        'The Aztecs found it already ruined and treated it as sacred ground. They were as far from its builders in time as we are from the Norman conquest.',
        'A tunnel under the Temple of the Feathered Serpent, sealed for around 1,800 years and reopened from 2003, held thousands of offerings and a floor scattered with pyrite to imitate stars.',
      ],
    },
    {
      slug: 'hattusa',
      name: 'Hattusa',
      where: 'Boğazkale, Türkiye',
      era: 'Hittite capital, 17th to 12th century BCE',
      wikiTitle: 'Hattusa',
      beats: [
        'An entire empire had dropped out of history. Excavation of the cuneiform archives from 1906 recovered the Hittites, and with them the oldest recorded Indo-European language.',
        'Around 30,000 clay tablets came out of the city, including a copy of the treaty ending the war with Egypt after the battle of Kadesh: one of the earliest surviving international peace treaties.',
        'Its walls run for over six kilometres, with gates carved as lions and sphinxes and a stone tunnel driven under the rampart.',
      ],
    },
    {
      slug: 'ephesus',
      name: 'Ephesus',
      where: 'Türkiye',
      era: 'Greek and then Roman, from about 1000 BCE',
      wikiTitle: 'Ephesus',
      beats: [
        'The Temple of Artemis here was counted among the Seven Wonders of the ancient world. Almost nothing of it is left standing.',
        'The Library of Celsus, finished around 117 CE, was built by a son for his father and is also his father\'s tomb: Celsus is buried in a chamber beneath it.',
        'The city died of geography. The Cayster river silted its harbour up faster than it could be dredged, the sea retreated several kilometres, and the trade went elsewhere.',
      ],
    },
    {
      slug: 'caral',
      name: 'Caral',
      where: 'Supe Valley, Peru',
      era: 'About 2600 BCE',
      wikiTitle: 'Caral',
      beats: [
        'Among the oldest urban centres in the Americas, raised while the pyramids at Giza were being built.',
        'Ruth Shady\'s excavations from 1994 found six platform mounds and sunken circular plazas, and no fortifications, no weapons and no bodies showing battle injuries.',
        'Thirty-two flutes made from pelican and condor bone were found in one place, which suggests something the whole settlement did together.',
      ],
    },
  ];

  // Every entry here is a story. `status` is not optional and is not
  // decoration: it is the sentence that stops the page reading as
  // geography, and the guard below refuses to ship an entry without it.
  var LEGEND = [
    {
      slug: 'atlantis',
      name: 'Atlantis',
      where: 'Somewhere beyond the Pillars of Heracles',
      era: 'First written down around 360 BCE',
      origin: 'Plato, in the dialogues Timaeus and Critias',
      status: 'Atlantis is not a real place. No trace of it has ever been found, and most classicists read it as an invention of Plato\'s rather than a memory of anywhere.',
      wikiTitle: 'Atlantis',
      artwork: {
        title: 'Mundus Subterraneus',
        caption: 'Athanasius Kircher\'s map of Atlantis, printed in Mundus Subterraneus in 1669 and drawn with south at the top.',
      },
      beats: [
        'According to Plato, Atlantis was a naval power beyond the Pillars of Heracles that set out to conquer Athens, failed, and was swallowed by the sea in a single day and night of misfortune.',
        'He tells it as a moral: a well-ordered state that grew greedy and was destroyed. His pupil Aristotle appears to have thought his teacher made it up.',
        'Every location anyone has proposed since is later speculation, not something Plato wrote. He gives no coordinates that resolve.',
        'The Bronze Age eruption of Thera and the collapse it caused on Minoan Crete is sometimes offered as a real event behind the story. That is a suggestion about where an idea might have come from, not a discovery of Atlantis.',
      ],
    },
    {
      slug: 'el-dorado',
      name: 'El Dorado',
      where: 'Sought across northern South America',
      era: 'Spanish accounts from the 1530s',
      origin: 'Spanish reports of Muisca ritual in the Colombian highlands',
      status: 'No golden city has ever been found. The ritual behind the story was real; the city was not.',
      wikiTitle: 'El Dorado',
      artwork: {
        title: 'Muisca raft',
        caption: 'The Muisca raft, a gold votive piece made between about 600 and 1600 CE and now in the Museo del Oro in Bogotá. It shows the offering ceremony the legend grew out of.',
      },
      beats: [
        'El Dorado was first a man, not a place: el hombre dorado, the gilded one. A new Muisca ruler was covered in gold dust and taken out onto Lake Guatavita on a raft to make offerings to the water.',
        'Retelling turned the gilded man into a golden city, and the city into a whole kingdom. Each version was further away and richer than the last.',
        'The hunt for it was lethal. Gonzalo Pizarro\'s expedition of 1541 and Walter Raleigh\'s two voyages to the Orinoco found nothing, and the searches cost thousands of Indigenous lives.',
        'Attempts to drain Lake Guatavita began in the 16th century and continued into the 20th. Gold offerings really were recovered from it. A city was not.',
      ],
    },
    {
      slug: 'shangri-la',
      name: 'Shangri-La',
      where: 'A valley in the Kunlun mountains',
      era: 'Invented in 1933',
      origin: 'James Hilton\'s novel Lost Horizon',
      status: 'Shangri-La is a work of twentieth-century fiction. It is not a folk tradition and not a place: Hilton coined the name for a novel.',
      wikiTitle: 'Shangri-La',
      artwork: null,
      beats: [
        'In the novel it is a lamasery in a hidden valley where people age very slowly and the outside world\'s troubles do not reach.',
        'Hilton borrowed loosely from Shambhala, a real concept in Tibetan Buddhist tradition, and from travel writing about Kham and Yunnan that he read in the British Museum. He never went.',
        'In 2001 the Chinese county of Zhongdian was officially renamed Shangri-La for tourism. A real town now carries the name of a fictional one.',
      ],
    },
    {
      slug: 'ys',
      name: 'Ys',
      where: 'Said to lie in the Bay of Douarnenez, Brittany',
      era: 'Breton oral tradition, written from the 15th century',
      origin: 'Breton folklore, later shaped by 19th-century collectors',
      status: 'Ys is a legend. Nothing resembling a drowned city has been found in the Bay of Douarnenez.',
      wikiTitle: 'Ys',
      artwork: null,
      beats: [
        'The legend holds that Ys was built below sea level behind a dyke, with a single gate whose only key hung around the neck of King Gradlon.',
        'His daughter Dahut opens the gate at night and the sea takes the city. In the versions the church later favoured she is tricked into it by a devil, and it is her sin that drowns everyone.',
        'Gradlon rides for Quimper with Dahut behind him, and is told to throw her off. He does. In some tellings she becomes a mermaid in the bay.',
        'A Breton saying runs: pa vo beuzet Paris, ec\'h adsavo Ker Is. When Paris is drowned, Ys will rise again.',
      ],
    },
    {
      slug: 'lyonesse',
      name: 'Lyonesse',
      where: 'Said to lie between Land\'s End and the Isles of Scilly',
      era: 'Cornish and Arthurian tradition',
      origin: 'Cornish folklore, attached to the Tristan romances',
      status: 'Lyonesse is a legend. The sea floor there has been surveyed and there is no drowned country under it.',
      wikiTitle: 'Lyonesse',
      artwork: null,
      beats: [
        'The story is of a country lost beneath the waves in a single night, its church bells still ringing under the water in bad weather.',
        'In some Arthurian tellings Tristan comes from Lyonesse, which is what tied a local Cornish tale into a much larger cycle.',
        'There is a real fact underneath it, and it is slower and stranger than the legend: rising seas after the last ice age genuinely did drown land around Scilly, separating islands that had been one. That happened over thousands of years, and long before the period the legend imagines.',
      ],
    },
    {
      slug: 'hyperborea',
      name: 'Hyperborea',
      where: 'Beyond the north wind',
      era: 'Greek geographic myth, recorded by the 5th century BCE',
      origin: 'Greek writers including Pindar and Herodotus',
      status: 'Hyperborea is mythical. It was a place of the Greek imagination, not a location anyone had been to.',
      wikiTitle: 'Hyperborea',
      artwork: null,
      beats: [
        'The myth describes a people living in perpetual sunshine somewhere past Boreas, the north wind, untroubled by disease, war or old age.',
        'Herodotus was already sceptical in the 5th century BCE, pointing out that he had the story only at second and third hand and that the people who should have known of it did not.',
        'It had a long afterlife on maps that were otherwise serious. Cartographers into the 16th century were still drawing a polar landmass split by four rivers around a black magnetic rock, on no evidence at all.',
      ],
    },
    {
      slug: 'thule',
      name: 'Thule',
      where: 'Six days north of Britain, by one account',
      era: 'Reported around 325 BCE',
      origin: 'The Greek explorer Pytheas of Massalia, in an account now lost',
      status: 'Pytheas may well have reached a real northern land, but nobody knows which one. Ultima Thule became a name for the edge of the known world rather than a place anyone can point to.',
      wikiTitle: 'Thule',
      artwork: null,
      beats: [
        'Pytheas reported sailing six days north of Britain to a land where the sun barely set in summer, and beyond it a sea that was neither water nor air but something curdled, which could not be sailed or walked on.',
        'Iceland, Norway, the Faroes and Shetland have all been argued for. There is no consensus.',
        'Strabo called him a liar. Later readers have wondered whether the curdled sea was simply someone describing pack ice to people who had never seen any.',
      ],
    },
    {
      slug: 'cibola',
      name: 'The Seven Cities of Cíbola',
      where: 'Sought in what is now New Mexico',
      era: 'Spanish accounts from 1539',
      origin: 'An Iberian legend of seven bishops, carried to the Americas',
      status: 'The seven golden cities never existed. What the expedition actually reached were Zuni pueblos, and the people living in them paid for the mistake.',
      wikiTitle: 'Cibola (mythical city)',
      artwork: null,
      beats: [
        'The legend arrived from Iberia: seven bishops fleeing the Muslim conquest were said to have sailed west and founded seven cities. In the 1530s the story was relocated to North America.',
        'Fray Marcos de Niza reported in 1539 that he had seen a great city from a distance, larger than Mexico City. He had not gone closer.',
        'Coronado marched north in 1540 and reached Hawikuh, a Zuni settlement of stone and adobe. He took it by force, found no gold, and wrote back that the friar had told the truth about nothing.',
        'He then spent a year crossing the plains chasing a further rumour called Quivira, and found grass-thatched villages in what is now Kansas.',
      ],
    },
    {
      slug: 'kitezh',
      name: 'Kitezh',
      where: 'Said to lie beneath Lake Svetloyar, Russia',
      era: 'Written down around the 18th century',
      origin: 'Russian Old Believer tradition, in the Kitezh Chronicle',
      status: 'Kitezh is a legend. Lake Svetloyar is a real lake and has been surveyed; there is no city in it.',
      wikiTitle: 'Kitezh',
      artwork: null,
      beats: [
        'As Batu Khan\'s army approached in 1238, the story goes, the people of Kitezh did not fight and did not flee. They prayed, and the city sank into the lake rather than be taken.',
        'The legend holds that it is still down there and still inhabited, and that the pure of heart can hear its bells and see the domes reflected in the water.',
        'Pilgrims still walk around Lake Svetloyar. Rimsky-Korsakov turned the story into an opera in 1907.',
      ],
    },
    {
      slug: 'zerzura',
      name: 'Zerzura',
      where: 'Sought in the Libyan Desert, west of the Nile',
      era: 'Recorded in the 13th century, hunted in the 1930s',
      origin: 'The Arabic Kitab al-Kanuz, the Book of Hidden Pearls',
      status: 'Zerzura was never found, and no oasis matching the description exists. The search for it was real; the city was not.',
      wikiTitle: 'Zerzura',
      artwork: null,
      beats: [
        'The medieval text describes a white city in the desert, its gate carved with a bird, and a king and queen asleep inside who must not be disturbed.',
        'In the 1920s and 30s a loose group of European explorers calling themselves the Zerzura Club went looking for it with cars and aircraft, mapping large parts of the Libyan Desert in the process.',
        'They found the Gilf Kebir plateau and the prehistoric rock paintings at the Cave of Swimmers, which are extraordinary and real, and no white city at all.',
        'One of them, the Hungarian László Almásy, became the loose basis for the title character of The English Patient.',
      ],
    },
  ];

  var ALL = ANCIENT.map(function (e) {
    return Object.assign({ category: 'ancient' }, e);
  }).concat(LEGEND.map(function (e) {
    return Object.assign({ category: 'legend' }, e);
  }));

  // Ship-time guard. If a legend entry ever loses its status line, or an
  // ancient entry picks one up, that is a category error and this is
  // where it gets caught rather than on the page.
  ALL.forEach(function (e) {
    if (e.category === 'legend' && !e.status) {
      throw new Error('lost-cities-data: legend entry "' + e.slug + '" has no status line');
    }
    if (e.category === 'ancient' && e.status) {
      throw new Error('lost-cities-data: ancient entry "' + e.slug + '" should not carry a legend status line');
    }
    if (!e.wikiTitle || !e.name || !e.slug) {
      throw new Error('lost-cities-data: entry "' + (e.slug || e.name) + '" is incomplete');
    }
  });

  window.LOST_CITIES = ALL;
})();
