// Glotemp Food Signature: a short, well-established food or drink
// specialty per city -- the Philly cheesesteak, Lagos jollof rice and
// suya, Naples-style pizza in Rome's case, Peking duck in Beijing. These
// are the same kind of thing as city-sports-data.js's local club names:
// real, verifiable, commonly-known public facts, not a business
// recommendation and not a claim about "the best" anything. Held to the
// same bar as that file -- included only where this is genuinely
// well-established, deliberately left out rather than guessed for
// cities without one this confident. No live API, no fabrication: this
// is a static, hand-checked list, the same kind of source city-trivia-data.js
// already uses successfully elsewhere on this site.
(function () {
  const CITY_FOOD_SIGNATURE = {
    tokyo: 'Sushi and ramen',
    delhi: 'Chaat and butter chicken',
    shanghai: 'Xiaolongbao, soup dumplings',
    'sao-paulo': 'Feijoada and pastel',
    'mexico-city': 'Tacos al pastor',
    cairo: 'Koshari',
    mumbai: 'Vada pav and pav bhaji',
    beijing: 'Peking duck',
    osaka: 'Takoyaki and okonomiyaki',
    nyc: 'New York-style pizza and bagels',
    london: 'Fish and chips',
    paris: 'Croissants and baguettes',
    sydney: 'Meat pies and flat white coffee',
    berlin: 'Currywurst and doner kebab',
    dubai: 'Shawarma and Arabic mezze',
    singapore: 'Hainanese chicken rice and laksa',
    'hong-kong': 'Dim sum',
    bangkok: 'Pad thai and som tam',
    istanbul: 'Turkish kebab and baklava',
    medellin: 'Bandeja paisa',
    bogota: 'Ajiaco',
    'buenos-aires': 'Asado and empanadas',
    santiago: 'Empanadas and pastel de choclo',
    lima: 'Ceviche',
    moscow: 'Borscht and pelmeni',
    seoul: 'Korean barbecue and kimchi',
    nairobi: 'Nyama choma',
    lagos: 'Jollof rice and suya',
    'los-angeles': 'Tacos and food-truck culture',
    chicago: 'Deep-dish pizza and Chicago-style hot dogs',
    miami: 'Cuban sandwiches',
    houston: 'Tex-Mex and barbecue brisket',
    vancouver: 'Fresh seafood and West Coast sushi',
    montreal: 'Poutine and smoked meat sandwiches',
    'san-francisco': 'Sourdough bread and Mission-style burritos',
    guadalajara: 'Tortas ahogadas and birria',
    atlanta: 'Southern soul food and peach cobbler',
    seattle: 'Coffee culture and fresh seafood',
    'washington-dc': 'A large Ethiopian food scene alongside classic Southern cooking',
    phoenix: 'Sonoran hot dogs and Mexican food',
    boston: 'Clam chowder and lobster rolls',
    monterrey: 'Cabrito, roast goat',
    dallas: 'Tex-Mex and barbecue brisket',
    denver: 'Green chile and craft beer',
    philadelphia: 'The Philly cheesesteak',
    'san-diego': 'Fish tacos and California-style burritos',
    havana: 'Ropa vieja and mojitos',
    madrid: 'Tapas and jamón ibérico',
    barcelona: 'Tapas and paella',
    rome: 'Pasta alla carbonara and Roman-style pizza',
    milan: 'Risotto alla milanese',
    amsterdam: 'Stroopwafels and Dutch cheese',
    warsaw: 'Pierogi',
    stockholm: 'Meatballs and fika, coffee-and-cinnamon-bun culture',
    vienna: 'Wiener schnitzel and Sachertorte',
    prague: 'Goulash and Czech beer',
    budapest: 'Goulash and lángos',
    zurich: 'Fondue and rösti',
    munich: 'Bavarian pretzels and beer culture',
    lisbon: 'Pastéis de nata and bacalhau',
    brussels: 'Waffles and Belgian chocolate',
    oslo: 'Salmon and Norwegian seafood',
    copenhagen: 'Smørrebrød and New Nordic cuisine',
    helsinki: 'Rye bread and Finnish salmon soup',
    athens: 'Souvlaki and Greek salad',
    bucharest: 'Sarmale, stuffed cabbage rolls',
    kyiv: 'Borscht and varenyky',
    dublin: 'Irish stew and Guinness',
    lyon: 'Traditional French bouchon cuisine',
    krakow: 'Pierogi and obwarzanek',
    hamburg: 'Fischbrötchen, fish sandwiches',
    edinburgh: 'Haggis',
    seville: 'Tapas and gazpacho',
    porto: 'Francesinha and port wine',
    vilnius: 'Cepelinai, potato dumplings',
    bangalore: 'Dosa and filter coffee',
    hyderabad: 'Hyderabadi biryani',
    dhaka: 'Biryani and hilsa fish',
    karachi: 'Biryani and nihari',
    kolkata: 'Bengali sweets and fish curry',
    guangzhou: 'Cantonese dim sum',
    chengdu: 'Sichuan hotpot and mapo tofu',
    wuhan: 'Reganmian, hot dry noodles',
    taipei: 'Beef noodle soup and night-market snacks',
    'kuala-lumpur': 'Nasi lemak and satay',
    jakarta: 'Nasi goreng and satay',
    manila: 'Adobo and lechon',
    'ho-chi-minh': 'Pho and banh mi',
    hanoi: 'Pho and bun cha',
    melbourne: 'Coffee culture and a diverse food scene',
    lahore: 'Lahori karahi and street food',
    colombo: 'Sri Lankan rice and curry',
    yangon: 'Mohinga, fish noodle soup',
    kathmandu: 'Momos and dal bhat',
    chennai: 'Dosa and filter coffee',
    tianjin: 'Goubuli baozi, steamed buns',
    chongqing: 'Chongqing hotpot',
    nanjing: 'Nanjing salted duck',
    perth: 'Fresh Western Australian seafood',
    'phnom-penh': 'Khmer amok',
    busan: 'Fresh seafood and Busan-style fish cake',
    nagoya: 'Hitsumabushi, grilled eel, and miso katsu',
    fukuoka: 'Hakata ramen',
    'xi-an': 'Biang biang noodles',
    ulaanbaatar: 'Buuz dumplings and Mongolian dairy',
    sapporo: 'Miso ramen and fresh seafood',
    vientiane: 'Lao sticky rice and laap',
    tehran: 'Persian kebab and saffron rice',
    caracas: 'Arepas',
    guayaquil: 'Ceviche and encebollado',
    quito: 'Locro and ceviche',
    fortaleza: 'Seafood and northeastern Brazilian cuisine',
    'belo-horizonte': 'Minas cuisine, including pão de queijo',
    'porto-alegre': 'Churrasco, Brazilian barbecue',
    recife: 'Seafood and northeastern Brazilian cuisine',
    cali: 'Sancocho de gallina',
    montevideo: 'Asado and chivito sandwiches',
    johannesburg: 'Braai, South African barbecue, and biltong',
    'cape-town': 'Cape Malay cuisine and braai',
    'addis-ababa': 'Injera and doro wat',
    accra: 'Jollof rice and banku',
    'dar-es-salaam': 'Swahili cuisine and pilau',
    casablanca: 'Moroccan tagine and couscous',
    dakar: 'Thieboudienne, Senegal’s national dish',
    algiers: 'Couscous',
    tunis: 'Couscous and brik',
    riyadh: 'Kabsa',
    doha: 'Machbous, spiced rice',
    'abu-dhabi': 'Emirati cuisine and Arabic mezze',
    amman: 'Mansaf',
    'tel-aviv': 'Hummus and falafel',
    beirut: 'Lebanese mezze',
    muscat: 'Omani shuwa',
    'kuwait-city': 'Machboos',
    jeddah: 'Saudi seafood and Hijazi cuisine',
    baghdad: 'Masgouf, grilled fish',
  };

  function escapeHTML(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Synchronous and static -- no network call -- so this always renders
  // first in #food-context, ahead of the (async) Wikipedia excerpt
  // city-wiki.js appends afterward.
  function render(citySlug) {
    const fact = CITY_FOOD_SIGNATURE[citySlug];
    const mount = document.getElementById('food-context');
    if (!fact || !mount) return;
    mount.insertAdjacentHTML('beforeend', `
      <div class="context-block context-signature">
        <span class="context-tag">Known for</span>
        <p class="context-fact">${escapeHTML(fact)}</p>
      </div>
    `);
  }

  window.GlotempFoodSignature = { render, has: (slug) => !!CITY_FOOD_SIGNATURE[slug] };
})();
