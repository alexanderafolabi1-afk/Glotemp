// Glotemp curated city -> sports team mapping, in two layers:
//
// 1. CITY_SPORTS: real, specific local clubs for cities where I'm confident
//    of the club. Deliberately incomplete rather than guessed.
// 2. COUNTRY_NATIONAL_TEAMS + CITY_NATIONAL_FOOTBALL_OVERRIDE below: every
//    city's country resolves to its real national football team (and,
//    where the sport is genuinely major there, its national rugby and
//    cricket teams too), so every one of the 151 cities gets live coverage
//    -- not just the ones with a locally curated club.
//
// glotemp-sports.js resolves every team name to a live ID via TheSportsDB's
// search endpoint at runtime, so this file only needs to get the name
// right, not any numeric ID.
const CITY_SPORTS = {
  london: { football: ['Arsenal', 'Chelsea'], rugby: ['Harlequins'] },
  madrid: { football: ['Real Madrid'] },
  barcelona: { football: ['Barcelona'] },
  rome: { football: ['AS Roma'] },
  milan: { football: ['AC Milan'] },
  munich: { football: ['Bayern Munich'] },
  paris: { football: ['Paris Saint-Germain'], rugby: ['Stade Francais'] },
  amsterdam: { football: ['Ajax'] },
  lisbon: { football: ['Benfica'] },
  porto: { football: ['FC Porto'] },
  vienna: { football: ['Rapid Wien'] },
  prague: { football: ['Slavia Prague'] },
  warsaw: { football: ['Legia Warszawa'] },
  stockholm: { football: ['AIK'] },
  copenhagen: { football: ['FC Copenhagen'] },
  oslo: { football: ['Valerenga'] },
  helsinki: { football: ['HJK Helsinki'] },
  athens: { football: ['Panathinaikos'] },
  bucharest: { football: ['FCSB'] },
  kyiv: { football: ['Dynamo Kyiv'] },
  dublin: { football: ['Shamrock Rovers'], rugby: ['Leinster Rugby'] },
  brussels: { football: ['RSC Anderlecht'] },
  zurich: { football: ['FC Zurich'] },
  hamburg: { football: ['Hamburger SV'] },
  edinburgh: { football: ['Heart of Midlothian'], rugby: ['Edinburgh Rugby'] },
  seville: { football: ['Sevilla'] },
  sofia: { football: ['Levski Sofia'] },
  istanbul: { football: ['Galatasaray'] },
  moscow: { football: ['Spartak Moscow'] },
  lyon: { football: ['Olympique Lyonnais'], rugby: ['Lyon OU'] },

  'buenos-aires': { football: ['Boca Juniors'] },
  'sao-paulo': { football: ['Corinthians'] },
  'belo-horizonte': { football: ['Atletico Mineiro'] },
  'porto-alegre': { football: ['Gremio'] },
  fortaleza: { football: ['Fortaleza EC'] },
  recife: { football: ['Sport Recife'] },
  curitiba: { football: ['Athletico Paranaense'] },
  montevideo: { football: ['Penarol'] },
  santiago: { football: ['Colo-Colo'] },
  lima: { football: ['Universitario de Deportes'] },
  bogota: { football: ['Millonarios FC'] },
  medellin: { football: ['Atletico Nacional'] },
  quito: { football: ['LDU Quito'] },
  guayaquil: { football: ['Barcelona SC'] },
  caracas: { football: ['Caracas FC'] },
  'mexico-city': { football: ['Club America'] },
  guadalajara: { football: ['Chivas Guadalajara'] },
  monterrey: { football: ['CF Monterrey'] },

  toronto: { football: ['Toronto FC'] },
  montreal: { football: ['CF Montreal'] },
  vancouver: { football: ['Vancouver Whitecaps'] },
  nyc: { football: ['New York City FC'] },
  'los-angeles': { football: ['LA Galaxy'] },
  chicago: { football: ['Chicago Fire'] },
  atlanta: { football: ['Atlanta United'] },
  seattle: { football: ['Seattle Sounders'] },
  houston: { football: ['Houston Dynamo'] },
  dallas: { football: ['FC Dallas'] },
  philadelphia: { football: ['Philadelphia Union'] },
  'washington-dc': { football: ['DC United'] },
  denver: { football: ['Colorado Rapids'] },
  minneapolis: { football: ['Minnesota United FC'] },
  phoenix: { football: ['Phoenix Rising FC'] },
  boston: { football: ['New England Revolution'] },

  johannesburg: { football: ['Kaizer Chiefs'], rugby: ['Emirates Lions'], cricket: ['Joburg Super Kings'] },
  'cape-town': { football: ['Cape Town City FC'], rugby: ['DHL Stormers'], cricket: ['MI Cape Town'] },
  nairobi: { football: ['Gor Mahia'] },
  accra: { football: ['Accra Hearts of Oak'] },
  casablanca: { football: ['Raja Casablanca'] },
  algiers: { football: ['USM Alger'] },
  tunis: { football: ['Esperance de Tunis'] },
  'addis-ababa': { football: ['Saint George SA'] },
  'dar-es-salaam': { football: ['Simba SC'] },
  kinshasa: { football: ['AS Vita Club'] },

  'tel-aviv': { football: ['Maccabi Tel Aviv'] },
  riyadh: { football: ['Al Hilal'] },
  jeddah: { football: ['Al-Ittihad'] },
  doha: { football: ['Al Sadd'] },
  'abu-dhabi': { football: ['Al Jazira'] },
  dubai: { football: ['Shabab Al Ahli'] },
  amman: { football: ['Al-Faisaly'] },
  beirut: { football: ['Al Ansar'] },
  'kuwait-city': { football: ['Al-Kuwait SC'] },
  baghdad: { football: ['Al-Zawraa'] },
  tehran: { football: ['Persepolis'] },

  dhaka: { football: ['Abahani Limited Dhaka'] },
  'kuala-lumpur': { football: ['Kuala Lumpur City FC'] },
  jakarta: { football: ['Persija Jakarta'] },
  hanoi: { football: ['Hanoi FC'] },
  bangkok: { football: ['Bangkok United'] },
  'hong-kong': { football: ['Kitchee'] },
  guangzhou: { football: ['Guangzhou FC'] },
  shenzhen: { football: ['Shenzhen FC'] },
  chengdu: { football: ['Chengdu Rongcheng'] },
  wuhan: { football: ['Wuhan Three Towns'] },
  tianjin: { football: ['Tianjin Jinmen Tiger'] },
  shanghai: { football: ['Shanghai Port'] },
  beijing: { football: ['Beijing Guoan'] },
  seoul: { football: ['FC Seoul'] },
  busan: { football: ['Busan IPark'] },
  nagoya: { football: ['Nagoya Grampus'] },
  fukuoka: { football: ['Avispa Fukuoka'] },
  sapporo: { football: ['Consadole Sapporo'] },
  osaka: { football: ['Cerezo Osaka'] },
  tokyo: { football: ['FC Tokyo'] },
  yangon: { football: ['Yangon United'] },

  perth: { football: ['Perth Glory'], cricket: ['Perth Scorchers'] },
  adelaide: { football: ['Adelaide United'], cricket: ['Adelaide Strikers'] },
  brisbane: { football: ['Brisbane Roar'], cricket: ['Brisbane Heat'] },
  melbourne: { football: ['Melbourne Victory'], cricket: ['Melbourne Stars'] },
  sydney: { football: ['Sydney FC'], rugby: ['NSW Waratahs'], cricket: ['Sydney Sixers'] },
  auckland: { football: ['Auckland FC'], rugby: ['Auckland Blues'] },

  mumbai: { cricket: ['Mumbai Indians'] },
  delhi: { cricket: ['Delhi Capitals'] },
  kolkata: { cricket: ['Kolkata Knight Riders'] },
  bangalore: { cricket: ['Royal Challengers Bengaluru'] },
  hyderabad: { cricket: ['Sunrisers Hyderabad'] },
  chennai: { cricket: ['Chennai Super Kings'] },
  lahore: { cricket: ['Lahore Qalandars'] },
  karachi: { cricket: ['Karachi Kings'] },
};

// Grand Prix host cities are resolved live against the current F1 calendar
// in glotemp-sports.js (matching circuit locality to city name) rather than
// hardcoded here -- calendars shift year to year and a stale hardcoded list
// would go stale silently.

// Every city's `country` field (from cities-data.js) resolves to its real
// national football team name -- this is the universal layer that gives
// every one of the 151 cities live sport coverage, not just the ones with
// a hand-curated local club above. Names match how the country is commonly
// listed in sports databases, which occasionally differs from the
// cities-data.js country string (e.g. "Czechia" -> "Czech Republic").
const COUNTRY_NATIONAL_FOOTBALL = {
  Algeria: 'Algeria', Argentina: 'Argentina', Australia: 'Australia', Austria: 'Austria',
  Bangladesh: 'Bangladesh', Belgium: 'Belgium', Brazil: 'Brazil', Bulgaria: 'Bulgaria',
  Cambodia: 'Cambodia', Canada: 'Canada', Chile: 'Chile', China: 'China',
  Colombia: 'Colombia', Cuba: 'Cuba', Czechia: 'Czech Republic', DRC: 'DR Congo',
  Denmark: 'Denmark', Ecuador: 'Ecuador', Egypt: 'Egypt', Ethiopia: 'Ethiopia',
  Finland: 'Finland', France: 'France', Germany: 'Germany', Ghana: 'Ghana',
  Greece: 'Greece', 'Hong Kong': 'Hong Kong', Hungary: 'Hungary', India: 'India',
  Indonesia: 'Indonesia', Iran: 'Iran', Iraq: 'Iraq', Ireland: 'Republic of Ireland',
  Israel: 'Israel', Italy: 'Italy', Japan: 'Japan', Jordan: 'Jordan', Kenya: 'Kenya',
  Kuwait: 'Kuwait', Laos: 'Laos', Lebanon: 'Lebanon', Lithuania: 'Lithuania',
  Malaysia: 'Malaysia', Mexico: 'Mexico', Mongolia: 'Mongolia', Morocco: 'Morocco',
  Myanmar: 'Myanmar', Nepal: 'Nepal', Netherlands: 'Netherlands', 'New Zealand': 'New Zealand',
  Nigeria: 'Nigeria', Norway: 'Norway', Oman: 'Oman', Pakistan: 'Pakistan', Peru: 'Peru',
  Philippines: 'Philippines', Poland: 'Poland', Portugal: 'Portugal', Qatar: 'Qatar',
  Romania: 'Romania', Russia: 'Russia', 'Saudi Arabia': 'Saudi Arabia', Senegal: 'Senegal',
  Singapore: 'Singapore', 'South Africa': 'South Africa', 'South Korea': 'South Korea',
  Spain: 'Spain', 'Sri Lanka': 'Sri Lanka', Sweden: 'Sweden', Switzerland: 'Switzerland',
  Taiwan: 'Chinese Taipei', Tanzania: 'Tanzania', Thailand: 'Thailand', Tunisia: 'Tunisia',
  Turkey: 'Turkey', UAE: 'United Arab Emirates', UK: 'England', USA: 'United States',
  Ukraine: 'Ukraine', Uruguay: 'Uruguay', Venezuela: 'Venezuela', Vietnam: 'Vietnam',
};

// The UK is not itself a FIFA nation -- London and Milton Keynes are in
// England's football association, Edinburgh is in Scotland's.
const CITY_NATIONAL_FOOTBALL_OVERRIDE = {
  edinburgh: 'Scotland',
};

// National rugby and cricket teams, limited to countries where the sport
// is genuinely a major one nationally -- not attempted everywhere the way
// football is, since most countries don't field a nationally-followed
// rugby or cricket side.
const COUNTRY_NATIONAL_RUGBY = {
  UK: 'England', Ireland: 'Ireland', France: 'France', Italy: 'Italy',
  'South Africa': 'South Africa', 'New Zealand': 'New Zealand', Australia: 'Australia',
  Argentina: 'Argentina', Japan: 'Japan', USA: 'United States', Canada: 'Canada',
  Romania: 'Romania', Portugal: 'Portugal', Spain: 'Spain',
};
const CITY_NATIONAL_RUGBY_OVERRIDE = {
  edinburgh: 'Scotland',
};

const COUNTRY_NATIONAL_CRICKET = {
  India: 'India', Pakistan: 'Pakistan', 'Sri Lanka': 'Sri Lanka', Bangladesh: 'Bangladesh',
  Australia: 'Australia', UK: 'England', 'South Africa': 'South Africa',
  'New Zealand': 'New Zealand', Ireland: 'Ireland',
};

if (typeof window !== 'undefined') {
  window.CITY_SPORTS = CITY_SPORTS;
  window.COUNTRY_NATIONAL_FOOTBALL = COUNTRY_NATIONAL_FOOTBALL;
  window.CITY_NATIONAL_FOOTBALL_OVERRIDE = CITY_NATIONAL_FOOTBALL_OVERRIDE;
  window.COUNTRY_NATIONAL_RUGBY = COUNTRY_NATIONAL_RUGBY;
  window.CITY_NATIONAL_RUGBY_OVERRIDE = CITY_NATIONAL_RUGBY_OVERRIDE;
  window.COUNTRY_NATIONAL_CRICKET = COUNTRY_NATIONAL_CRICKET;
}
