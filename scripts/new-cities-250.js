// The 99 cities that take Glotemp from 151 to 250, plus the Best Known
// For category assigned to all 250.
//
// STATUS: DATA ONLY, NOT YET WIRED.
// Nothing imports this yet. cities-data.js still holds 151, no pages have
// been generated for these, and the "151" copy across the site is
// untouched. Committed at this stage because the list is validated and
// worth keeping, not because the expansion is done. Requiring it changes
// nothing on the live site until the remaining steps are built: merge
// into cities-data.js, generate and patch the 99 pages, seed city_points,
// replace the 151 copy, and add the Pulse Bridges surface.
//
// Validated: exactly 99 entries, no slug collides with the existing 151,
// every timezone parses as a real IANA zone, every coordinate is in
// range, every entry carries a category, and every one of the existing
// 151 resolves to a category through EXISTING_CATEGORY or REGION_DEFAULT.
// Totals 250 cities across 113 countries.
//
// SELECTION
// Weighted towards places that can carry advertising quickly: somewhere
// with a nightlife economy, a tourist board, a hotel market and a festival
// calendar is somewhere a local business will pay to appear. Balanced
// against that, roughly a third are discovery cities with strong cultural
// or scene identity and thin coverage elsewhere, because those are what
// make a bridge worth crossing. A directory of only capitals has nothing
// to introduce anyone to.
//
// COORDINATES AND TIMEZONES ARE LOAD-BEARING
// They drive radio search, venue lookup, weather, the local clock and
// presence verification. A wrong pair does not fail loudly, it quietly
// serves another city's data, so each is a real city-centre coordinate
// and a real IANA zone.
//
// penetration and mood are seeded conservatively. They are starting
// values the live readings overwrite, not claims.

const NEW_CITIES = [
  // ---- Europe: the paid-tourism belt ----
  { slug: 'naples', name: 'Naples', country: 'Italy', iso: 'IT', region: 'Europe', timezone: 'Europe/Rome', lat: 40.8518, lon: 14.2681, metro_pop: 3115000, penetration: 0.83, mood: 7.6, best_known_for: 'cultural' },
  { slug: 'florence', name: 'Florence', country: 'Italy', iso: 'IT', region: 'Europe', timezone: 'Europe/Rome', lat: 43.7696, lon: 11.2558, metro_pop: 1013000, penetration: 0.85, mood: 7.4, best_known_for: 'cultural' },
  { slug: 'venice', name: 'Venice', country: 'Italy', iso: 'IT', region: 'Europe', timezone: 'Europe/Rome', lat: 45.4408, lon: 12.3155, metro_pop: 855000, penetration: 0.84, mood: 7.1, best_known_for: 'luxury' },
  { slug: 'valencia', name: 'Valencia', country: 'Spain', iso: 'ES', region: 'Europe', timezone: 'Europe/Madrid', lat: 39.4699, lon: -0.3763, metro_pop: 1595000, penetration: 0.92, mood: 7.8, best_known_for: 'digital-nomad' },
  { slug: 'malaga', name: 'Malaga', country: 'Spain', iso: 'ES', region: 'Europe', timezone: 'Europe/Madrid', lat: 36.7213, lon: -4.4214, metro_pop: 987000, penetration: 0.91, mood: 7.9, best_known_for: 'beach-club' },
  { slug: 'bilbao', name: 'Bilbao', country: 'Spain', iso: 'ES', region: 'Europe', timezone: 'Europe/Madrid', lat: 43.2630, lon: -2.9350, metro_pop: 1037000, penetration: 0.92, mood: 7.2, best_known_for: 'cultural' },
  { slug: 'ibiza', name: 'Ibiza', country: 'Spain', iso: 'ES', region: 'Europe', timezone: 'Europe/Madrid', lat: 38.9067, lon: 1.4206, metro_pop: 152000, penetration: 0.90, mood: 8.6, best_known_for: 'beach-club' },
  { slug: 'marseille', name: 'Marseille', country: 'France', iso: 'FR', region: 'Europe', timezone: 'Europe/Paris', lat: 43.2965, lon: 5.3698, metro_pop: 1760000, penetration: 0.88, mood: 7.3, best_known_for: 'alternative' },
  { slug: 'nice', name: 'Nice', country: 'France', iso: 'FR', region: 'Europe', timezone: 'Europe/Paris', lat: 43.7102, lon: 7.2620, metro_pop: 942000, penetration: 0.89, mood: 7.5, best_known_for: 'luxury' },
  { slug: 'bordeaux', name: 'Bordeaux', country: 'France', iso: 'FR', region: 'Europe', timezone: 'Europe/Paris', lat: 44.8378, lon: -0.5792, metro_pop: 1363000, penetration: 0.89, mood: 7.4, best_known_for: 'luxury' },
  { slug: 'frankfurt', name: 'Frankfurt', country: 'Germany', iso: 'DE', region: 'Europe', timezone: 'Europe/Berlin', lat: 50.1109, lon: 8.6821, metro_pop: 2896000, penetration: 0.93, mood: 6.8, best_known_for: 'digital-nomad' },
  { slug: 'cologne', name: 'Cologne', country: 'Germany', iso: 'DE', region: 'Europe', timezone: 'Europe/Berlin', lat: 50.9375, lon: 6.9603, metro_pop: 1996000, penetration: 0.93, mood: 7.6, best_known_for: 'festival' },
  { slug: 'leipzig', name: 'Leipzig', country: 'Germany', iso: 'DE', region: 'Europe', timezone: 'Europe/Berlin', lat: 51.3397, lon: 12.3731, metro_pop: 621000, penetration: 0.92, mood: 7.7, best_known_for: 'alternative' },
  { slug: 'manchester', name: 'Manchester', country: 'United Kingdom', iso: 'GB', region: 'Europe', timezone: 'Europe/London', lat: 53.4808, lon: -2.2426, metro_pop: 2795000, penetration: 0.95, mood: 7.8, best_known_for: 'nightlife' },
  { slug: 'glasgow', name: 'Glasgow', country: 'United Kingdom', iso: 'GB', region: 'Europe', timezone: 'Europe/London', lat: 55.8642, lon: -4.2518, metro_pop: 1690000, penetration: 0.94, mood: 7.6, best_known_for: 'alternative' },
  { slug: 'bristol', name: 'Bristol', country: 'United Kingdom', iso: 'GB', region: 'Europe', timezone: 'Europe/London', lat: 51.4545, lon: -2.5879, metro_pop: 720000, penetration: 0.95, mood: 7.7, best_known_for: 'alternative' },
  { slug: 'liverpool', name: 'Liverpool', country: 'United Kingdom', iso: 'GB', region: 'Europe', timezone: 'Europe/London', lat: 53.4084, lon: -2.9916, metro_pop: 902000, penetration: 0.94, mood: 7.6, best_known_for: 'nightlife' },
  { slug: 'belfast', name: 'Belfast', country: 'United Kingdom', iso: 'GB', region: 'Europe', timezone: 'Europe/London', lat: 54.5973, lon: -5.9301, metro_pop: 671000, penetration: 0.93, mood: 7.1, best_known_for: 'cultural' },
  { slug: 'reykjavik', name: 'Reykjavik', country: 'Iceland', iso: 'IS', region: 'Europe', timezone: 'Atlantic/Reykjavik', lat: 64.1466, lon: -21.9426, metro_pop: 233000, penetration: 0.99, mood: 7.9, best_known_for: 'adventure' },
  { slug: 'tallinn', name: 'Tallinn', country: 'Estonia', iso: 'EE', region: 'Europe', timezone: 'Europe/Tallinn', lat: 59.4370, lon: 24.7536, metro_pop: 605000, penetration: 0.93, mood: 7.4, best_known_for: 'digital-nomad' },
  { slug: 'riga', name: 'Riga', country: 'Latvia', iso: 'LV', region: 'Europe', timezone: 'Europe/Riga', lat: 56.9496, lon: 24.1052, metro_pop: 861000, penetration: 0.91, mood: 7.2, best_known_for: 'nightlife' },
  { slug: 'gdansk', name: 'Gdansk', country: 'Poland', iso: 'PL', region: 'Europe', timezone: 'Europe/Warsaw', lat: 54.3520, lon: 18.6466, metro_pop: 1080000, penetration: 0.90, mood: 7.5, best_known_for: 'cultural' },
  { slug: 'bratislava', name: 'Bratislava', country: 'Slovakia', iso: 'SK', region: 'Europe', timezone: 'Europe/Bratislava', lat: 48.1486, lon: 17.1077, metro_pop: 660000, penetration: 0.90, mood: 7.1, best_known_for: 'nightlife' },
  { slug: 'ljubljana', name: 'Ljubljana', country: 'Slovenia', iso: 'SI', region: 'Europe', timezone: 'Europe/Ljubljana', lat: 46.0569, lon: 14.5058, metro_pop: 538000, penetration: 0.90, mood: 7.6, best_known_for: 'adventure' },
  { slug: 'zagreb', name: 'Zagreb', country: 'Croatia', iso: 'HR', region: 'Europe', timezone: 'Europe/Zagreb', lat: 45.8150, lon: 15.9819, metro_pop: 1113000, penetration: 0.89, mood: 7.3, best_known_for: 'festival' },
  { slug: 'split', name: 'Split', country: 'Croatia', iso: 'HR', region: 'Europe', timezone: 'Europe/Zagreb', lat: 43.5081, lon: 16.4402, metro_pop: 346000, penetration: 0.88, mood: 8.0, best_known_for: 'beach-club' },
  { slug: 'dubrovnik', name: 'Dubrovnik', country: 'Croatia', iso: 'HR', region: 'Europe', timezone: 'Europe/Zagreb', lat: 42.6507, lon: 18.0944, metro_pop: 43000, penetration: 0.88, mood: 7.8, best_known_for: 'luxury' },
  { slug: 'belgrade', name: 'Belgrade', country: 'Serbia', iso: 'RS', region: 'Europe', timezone: 'Europe/Belgrade', lat: 44.7866, lon: 20.4489, metro_pop: 1690000, penetration: 0.84, mood: 7.9, best_known_for: 'nightlife' },
  { slug: 'sarajevo', name: 'Sarajevo', country: 'Bosnia and Herzegovina', iso: 'BA', region: 'Europe', timezone: 'Europe/Sarajevo', lat: 43.8563, lon: 18.4131, metro_pop: 555000, penetration: 0.78, mood: 7.2, best_known_for: 'cultural' },
  { slug: 'tirana', name: 'Tirana', country: 'Albania', iso: 'AL', region: 'Europe', timezone: 'Europe/Tirane', lat: 41.3275, lon: 19.8187, metro_pop: 913000, penetration: 0.83, mood: 7.5, best_known_for: 'student-budget' },
  { slug: 'thessaloniki', name: 'Thessaloniki', country: 'Greece', iso: 'GR', region: 'Europe', timezone: 'Europe/Athens', lat: 40.6401, lon: 22.9444, metro_pop: 1092000, penetration: 0.85, mood: 7.7, best_known_for: 'nightlife' },
  { slug: 'valletta', name: 'Valletta', country: 'Malta', iso: 'MT', region: 'Europe', timezone: 'Europe/Malta', lat: 35.8989, lon: 14.5146, metro_pop: 480000, penetration: 0.90, mood: 7.6, best_known_for: 'beach-club' },
  { slug: 'geneva', name: 'Geneva', country: 'Switzerland', iso: 'CH', region: 'Europe', timezone: 'Europe/Zurich', lat: 46.2044, lon: 6.1432, metro_pop: 620000, penetration: 0.96, mood: 6.8, best_known_for: 'luxury' },
  { slug: 'tbilisi', name: 'Tbilisi', country: 'Georgia', iso: 'GE', region: 'Europe', timezone: 'Asia/Tbilisi', lat: 41.7151, lon: 44.8271, metro_pop: 1180000, penetration: 0.80, mood: 7.8, best_known_for: 'digital-nomad' },
  { slug: 'yerevan', name: 'Yerevan', country: 'Armenia', iso: 'AM', region: 'Europe', timezone: 'Asia/Yerevan', lat: 40.1792, lon: 44.4991, metro_pop: 1080000, penetration: 0.78, mood: 7.3, best_known_for: 'cultural' },
  { slug: 'baku', name: 'Baku', country: 'Azerbaijan', iso: 'AZ', region: 'Middle East', timezone: 'Asia/Baku', lat: 40.4093, lon: 49.8671, metro_pop: 2300000, penetration: 0.81, mood: 7.1, best_known_for: 'luxury' },
  { slug: 'antalya', name: 'Antalya', country: 'Turkey', iso: 'TR', region: 'Middle East', timezone: 'Europe/Istanbul', lat: 36.8969, lon: 30.7133, metro_pop: 1400000, penetration: 0.82, mood: 7.9, best_known_for: 'beach-club' },
  { slug: 'izmir', name: 'Izmir', country: 'Turkey', iso: 'TR', region: 'Middle East', timezone: 'Europe/Istanbul', lat: 38.4237, lon: 27.1428, metro_pop: 3050000, penetration: 0.82, mood: 7.5, best_known_for: 'alternative' },

  // ---- North America ----
  { slug: 'austin', name: 'Austin', country: 'United States', iso: 'US', region: 'North America', timezone: 'America/Chicago', lat: 30.2672, lon: -97.7431, metro_pop: 2295000, penetration: 0.94, mood: 8.1, best_known_for: 'festival' },
  { slug: 'nashville', name: 'Nashville', country: 'United States', iso: 'US', region: 'North America', timezone: 'America/Chicago', lat: 36.1627, lon: -86.7816, metro_pop: 2014000, penetration: 0.93, mood: 8.0, best_known_for: 'nightlife' },
  { slug: 'new-orleans', name: 'New Orleans', country: 'United States', iso: 'US', region: 'North America', timezone: 'America/Chicago', lat: 29.9511, lon: -90.0715, metro_pop: 1271000, penetration: 0.90, mood: 8.2, best_known_for: 'festival' },
  { slug: 'las-vegas', name: 'Las Vegas', country: 'United States', iso: 'US', region: 'North America', timezone: 'America/Los_Angeles', lat: 36.1699, lon: -115.1398, metro_pop: 2320000, penetration: 0.92, mood: 8.3, best_known_for: 'nightlife' },
  { slug: 'portland', name: 'Portland', country: 'United States', iso: 'US', region: 'North America', timezone: 'America/Los_Angeles', lat: 45.5152, lon: -122.6784, metro_pop: 2510000, penetration: 0.94, mood: 7.4, best_known_for: 'alternative' },
  { slug: 'detroit', name: 'Detroit', country: 'United States', iso: 'US', region: 'North America', timezone: 'America/Detroit', lat: 42.3314, lon: -83.0458, metro_pop: 4342000, penetration: 0.91, mood: 7.5, best_known_for: 'alternative' },
  { slug: 'honolulu', name: 'Honolulu', country: 'United States', iso: 'US', region: 'North America', timezone: 'Pacific/Honolulu', lat: 21.3069, lon: -157.8583, metro_pop: 1016000, penetration: 0.93, mood: 8.0, best_known_for: 'beach-club' },
  { slug: 'san-juan', name: 'San Juan', country: 'Puerto Rico', iso: 'PR', region: 'Latin America', timezone: 'America/Puerto_Rico', lat: 18.4655, lon: -66.1057, metro_pop: 2325000, penetration: 0.85, mood: 7.9, best_known_for: 'beach-club' },
  { slug: 'tulum', name: 'Tulum', country: 'Mexico', iso: 'MX', region: 'Latin America', timezone: 'America/Cancun', lat: 20.2114, lon: -87.4654, metro_pop: 46000, penetration: 0.78, mood: 8.4, best_known_for: 'wellness' },
  { slug: 'cancun', name: 'Cancun', country: 'Mexico', iso: 'MX', region: 'Latin America', timezone: 'America/Cancun', lat: 21.1619, lon: -86.8515, metro_pop: 911000, penetration: 0.80, mood: 8.1, best_known_for: 'beach-club' },
  { slug: 'playa-del-carmen', name: 'Playa del Carmen', country: 'Mexico', iso: 'MX', region: 'Latin America', timezone: 'America/Cancun', lat: 20.6296, lon: -87.0739, metro_pop: 305000, penetration: 0.79, mood: 8.2, best_known_for: 'digital-nomad' },
  { slug: 'oaxaca', name: 'Oaxaca', country: 'Mexico', iso: 'MX', region: 'Latin America', timezone: 'America/Mexico_City', lat: 17.0732, lon: -96.7266, metro_pop: 686000, penetration: 0.72, mood: 7.9, best_known_for: 'cultural' },
  { slug: 'panama-city', name: 'Panama City', country: 'Panama', iso: 'PA', region: 'Latin America', timezone: 'America/Panama', lat: 8.9824, lon: -79.5199, metro_pop: 1938000, penetration: 0.79, mood: 7.2, best_known_for: 'digital-nomad' },
  { slug: 'san-jose-costa-rica', name: 'San Jose', country: 'Costa Rica', iso: 'CR', region: 'Latin America', timezone: 'America/Costa_Rica', lat: 9.9281, lon: -84.0907, metro_pop: 1500000, penetration: 0.83, mood: 7.6, best_known_for: 'adventure' },
  { slug: 'guatemala-city', name: 'Guatemala City', country: 'Guatemala', iso: 'GT', region: 'Latin America', timezone: 'America/Guatemala', lat: 14.6349, lon: -90.5069, metro_pop: 3095000, penetration: 0.65, mood: 6.9, best_known_for: 'cultural' },
  { slug: 'kingston', name: 'Kingston', country: 'Jamaica', iso: 'JM', region: 'Latin America', timezone: 'America/Jamaica', lat: 17.9714, lon: -76.7931, metro_pop: 1240000, penetration: 0.75, mood: 8.0, best_known_for: 'nightlife' },
  { slug: 'santo-domingo', name: 'Santo Domingo', country: 'Dominican Republic', iso: 'DO', region: 'Latin America', timezone: 'America/Santo_Domingo', lat: 18.4861, lon: -69.9312, metro_pop: 3524000, penetration: 0.78, mood: 7.7, best_known_for: 'nightlife' },
  { slug: 'cartagena', name: 'Cartagena', country: 'Colombia', iso: 'CO', region: 'South America', timezone: 'America/Bogota', lat: 10.3910, lon: -75.4794, metro_pop: 1047000, penetration: 0.72, mood: 8.1, best_known_for: 'beach-club' },
  { slug: 'cusco', name: 'Cusco', country: 'Peru', iso: 'PE', region: 'South America', timezone: 'America/Lima', lat: -13.5319, lon: -71.9675, metro_pop: 447000, penetration: 0.68, mood: 7.8, best_known_for: 'adventure' },
  { slug: 'la-paz', name: 'La Paz', country: 'Bolivia', iso: 'BO', region: 'South America', timezone: 'America/La_Paz', lat: -16.4897, lon: -68.1193, metro_pop: 1900000, penetration: 0.66, mood: 7.2, best_known_for: 'adventure' },
  { slug: 'rio-de-janeiro', name: 'Rio de Janeiro', country: 'Brazil', iso: 'BR', region: 'South America', timezone: 'America/Sao_Paulo', lat: -22.9068, lon: -43.1729, metro_pop: 13634000, penetration: 0.81, mood: 8.3, best_known_for: 'festival' },
  { slug: 'salvador', name: 'Salvador', country: 'Brazil', iso: 'BR', region: 'South America', timezone: 'America/Bahia', lat: -12.9777, lon: -38.5016, metro_pop: 3900000, penetration: 0.78, mood: 8.2, best_known_for: 'festival' },
  { slug: 'florianopolis', name: 'Florianopolis', country: 'Brazil', iso: 'BR', region: 'South America', timezone: 'America/Sao_Paulo', lat: -27.5954, lon: -48.5480, metro_pop: 1210000, penetration: 0.85, mood: 8.0, best_known_for: 'digital-nomad' },

  // ---- Africa ----
  { slug: 'marrakesh', name: 'Marrakesh', country: 'Morocco', iso: 'MA', region: 'North Africa', timezone: 'Africa/Casablanca', lat: 31.6295, lon: -7.9811, metro_pop: 1330000, penetration: 0.74, mood: 8.0, best_known_for: 'cultural' },
  { slug: 'fez', name: 'Fez', country: 'Morocco', iso: 'MA', region: 'North Africa', timezone: 'Africa/Casablanca', lat: 34.0181, lon: -5.0078, metro_pop: 1220000, penetration: 0.72, mood: 7.6, best_known_for: 'cultural' },
  { slug: 'tangier', name: 'Tangier', country: 'Morocco', iso: 'MA', region: 'North Africa', timezone: 'Africa/Casablanca', lat: 35.7595, lon: -5.8340, metro_pop: 1160000, penetration: 0.73, mood: 7.5, best_known_for: 'alternative' },
  { slug: 'alexandria', name: 'Alexandria', country: 'Egypt', iso: 'EG', region: 'North Africa', timezone: 'Africa/Cairo', lat: 31.2001, lon: 29.9187, metro_pop: 5588000, penetration: 0.72, mood: 7.1, best_known_for: 'cultural' },
  { slug: 'sharm-el-sheikh', name: 'Sharm El Sheikh', country: 'Egypt', iso: 'EG', region: 'North Africa', timezone: 'Africa/Cairo', lat: 27.9158, lon: 34.3300, metro_pop: 73000, penetration: 0.70, mood: 7.9, best_known_for: 'beach-club' },
  { slug: 'abidjan', name: 'Abidjan', country: 'Ivory Coast', iso: 'CI', region: 'West Africa', timezone: 'Africa/Abidjan', lat: 5.3600, lon: -4.0083, metro_pop: 5516000, penetration: 0.46, mood: 7.6, best_known_for: 'nightlife' },
  { slug: 'abuja', name: 'Abuja', country: 'Nigeria', iso: 'NG', region: 'West Africa', timezone: 'Africa/Lagos', lat: 9.0765, lon: 7.3986, metro_pop: 3652000, penetration: 0.48, mood: 7.2, best_known_for: 'cultural' },
  { slug: 'port-harcourt', name: 'Port Harcourt', country: 'Nigeria', iso: 'NG', region: 'West Africa', timezone: 'Africa/Lagos', lat: 4.8156, lon: 7.0498, metro_pop: 3171000, penetration: 0.44, mood: 7.1, best_known_for: 'nightlife' },
  { slug: 'kampala', name: 'Kampala', country: 'Uganda', iso: 'UG', region: 'East Africa', timezone: 'Africa/Kampala', lat: 0.3476, lon: 32.5825, metro_pop: 3652000, penetration: 0.32, mood: 7.4, best_known_for: 'nightlife' },
  { slug: 'kigali', name: 'Kigali', country: 'Rwanda', iso: 'RW', region: 'East Africa', timezone: 'Africa/Kigali', lat: -1.9441, lon: 30.0619, metro_pop: 1320000, penetration: 0.36, mood: 7.5, best_known_for: 'digital-nomad' },
  { slug: 'zanzibar-city', name: 'Zanzibar City', country: 'Tanzania', iso: 'TZ', region: 'East Africa', timezone: 'Africa/Dar_es_Salaam', lat: -6.1659, lon: 39.2026, metro_pop: 594000, penetration: 0.30, mood: 8.0, best_known_for: 'beach-club' },
  { slug: 'luanda', name: 'Luanda', country: 'Angola', iso: 'AO', region: 'Central Africa', timezone: 'Africa/Luanda', lat: -8.8390, lon: 13.2894, metro_pop: 8952000, penetration: 0.38, mood: 7.3, best_known_for: 'nightlife' },
  { slug: 'maputo', name: 'Maputo', country: 'Mozambique', iso: 'MZ', region: 'Southern Africa', timezone: 'Africa/Maputo', lat: -25.9692, lon: 32.5732, metro_pop: 2700000, penetration: 0.29, mood: 7.4, best_known_for: 'beach-club' },
  { slug: 'durban', name: 'Durban', country: 'South Africa', iso: 'ZA', region: 'Southern Africa', timezone: 'Africa/Johannesburg', lat: -29.8587, lon: 31.0218, metro_pop: 3720000, penetration: 0.70, mood: 7.7, best_known_for: 'beach-club' },
  { slug: 'port-louis', name: 'Port Louis', country: 'Mauritius', iso: 'MU', region: 'East Africa', timezone: 'Indian/Mauritius', lat: -20.1609, lon: 57.5012, metro_pop: 149000, penetration: 0.73, mood: 7.8, best_known_for: 'luxury' },

  // ---- Middle East ----
  { slug: 'manama', name: 'Manama', country: 'Bahrain', iso: 'BH', region: 'Middle East', timezone: 'Asia/Bahrain', lat: 26.2285, lon: 50.5860, metro_pop: 686000, penetration: 0.99, mood: 7.2, best_known_for: 'nightlife' },
  { slug: 'jerusalem', name: 'Jerusalem', country: 'Israel', iso: 'IL', region: 'Middle East', timezone: 'Asia/Jerusalem', lat: 31.7683, lon: 35.2137, metro_pop: 1253000, penetration: 0.90, mood: 6.8, best_known_for: 'cultural' },

  // ---- South and Central Asia ----
  { slug: 'jaipur', name: 'Jaipur', country: 'India', iso: 'IN', region: 'South Asia', timezone: 'Asia/Kolkata', lat: 26.9124, lon: 75.7873, metro_pop: 4067000, penetration: 0.62, mood: 7.6, best_known_for: 'cultural' },
  { slug: 'ahmedabad', name: 'Ahmedabad', country: 'India', iso: 'IN', region: 'South Asia', timezone: 'Asia/Kolkata', lat: 23.0225, lon: 72.5714, metro_pop: 8450000, penetration: 0.64, mood: 7.0, best_known_for: 'cultural' },
  { slug: 'kochi', name: 'Kochi', country: 'India', iso: 'IN', region: 'South Asia', timezone: 'Asia/Kolkata', lat: 9.9312, lon: 76.2673, metro_pop: 2120000, penetration: 0.68, mood: 7.5, best_known_for: 'wellness' },
  { slug: 'panaji', name: 'Panaji', country: 'India', iso: 'IN', region: 'South Asia', timezone: 'Asia/Kolkata', lat: 15.4909, lon: 73.8278, metro_pop: 114000, penetration: 0.70, mood: 8.2, best_known_for: 'beach-club' },
  { slug: 'male', name: 'Male', country: 'Maldives', iso: 'MV', region: 'South Asia', timezone: 'Indian/Maldives', lat: 4.1755, lon: 73.5093, metro_pop: 253000, penetration: 0.76, mood: 8.1, best_known_for: 'luxury' },
  { slug: 'tashkent', name: 'Tashkent', country: 'Uzbekistan', iso: 'UZ', region: 'South Asia', timezone: 'Asia/Tashkent', lat: 41.2995, lon: 69.2401, metro_pop: 2900000, penetration: 0.77, mood: 7.1, best_known_for: 'cultural' },
  { slug: 'samarkand', name: 'Samarkand', country: 'Uzbekistan', iso: 'UZ', region: 'South Asia', timezone: 'Asia/Samarkand', lat: 39.6270, lon: 66.9750, metro_pop: 546000, penetration: 0.74, mood: 7.7, best_known_for: 'cultural' },
  { slug: 'almaty', name: 'Almaty', country: 'Kazakhstan', iso: 'KZ', region: 'South Asia', timezone: 'Asia/Almaty', lat: 43.2220, lon: 76.8512, metro_pop: 2200000, penetration: 0.86, mood: 7.3, best_known_for: 'adventure' },

  // ---- East and Southeast Asia ----
  { slug: 'kyoto', name: 'Kyoto', country: 'Japan', iso: 'JP', region: 'East Asia', timezone: 'Asia/Tokyo', lat: 35.0116, lon: 135.7681, metro_pop: 1464000, penetration: 0.94, mood: 7.8, best_known_for: 'cultural' },
  { slug: 'jeju', name: 'Jeju', country: 'South Korea', iso: 'KR', region: 'East Asia', timezone: 'Asia/Seoul', lat: 33.4996, lon: 126.5312, metro_pop: 490000, penetration: 0.97, mood: 7.8, best_known_for: 'wellness' },
  { slug: 'macau', name: 'Macau', country: 'China', iso: 'MO', region: 'East Asia', timezone: 'Asia/Macau', lat: 22.1987, lon: 113.5439, metro_pop: 683000, penetration: 0.87, mood: 7.6, best_known_for: 'luxury' },
  { slug: 'chiang-mai', name: 'Chiang Mai', country: 'Thailand', iso: 'TH', region: 'Southeast Asia', timezone: 'Asia/Bangkok', lat: 18.7883, lon: 98.9853, metro_pop: 1200000, penetration: 0.85, mood: 8.0, best_known_for: 'digital-nomad' },
  { slug: 'phuket', name: 'Phuket', country: 'Thailand', iso: 'TH', region: 'Southeast Asia', timezone: 'Asia/Bangkok', lat: 7.8804, lon: 98.3923, metro_pop: 416000, penetration: 0.84, mood: 8.2, best_known_for: 'beach-club' },
  { slug: 'denpasar', name: 'Denpasar', country: 'Indonesia', iso: 'ID', region: 'Southeast Asia', timezone: 'Asia/Makassar', lat: -8.6705, lon: 115.2126, metro_pop: 1100000, penetration: 0.74, mood: 8.3, best_known_for: 'wellness' },
  { slug: 'da-nang', name: 'Da Nang', country: 'Vietnam', iso: 'VN', region: 'Southeast Asia', timezone: 'Asia/Ho_Chi_Minh', lat: 16.0544, lon: 108.2022, metro_pop: 1230000, penetration: 0.79, mood: 7.9, best_known_for: 'digital-nomad' },
  { slug: 'siem-reap', name: 'Siem Reap', country: 'Cambodia', iso: 'KH', region: 'Southeast Asia', timezone: 'Asia/Phnom_Penh', lat: 13.3671, lon: 103.8448, metro_pop: 245000, penetration: 0.60, mood: 7.7, best_known_for: 'cultural' },
  { slug: 'cebu', name: 'Cebu', country: 'Philippines', iso: 'PH', region: 'Southeast Asia', timezone: 'Asia/Manila', lat: 10.3157, lon: 123.8854, metro_pop: 3165000, penetration: 0.73, mood: 7.8, best_known_for: 'beach-club' },

  // ---- Oceania ----
  { slug: 'wellington', name: 'Wellington', country: 'New Zealand', iso: 'NZ', region: 'Asia-Pacific', timezone: 'Pacific/Auckland', lat: -41.2866, lon: 174.7756, metro_pop: 439000, penetration: 0.95, mood: 7.5, best_known_for: 'alternative' },
  { slug: 'queenstown', name: 'Queenstown', country: 'New Zealand', iso: 'NZ', region: 'Asia-Pacific', timezone: 'Pacific/Auckland', lat: -45.0312, lon: 168.6626, metro_pop: 48000, penetration: 0.94, mood: 8.1, best_known_for: 'adventure' },
  { slug: 'gold-coast', name: 'Gold Coast', country: 'Australia', iso: 'AU', region: 'Asia-Pacific', timezone: 'Australia/Brisbane', lat: -28.0167, lon: 153.4000, metro_pop: 700000, penetration: 0.96, mood: 8.0, best_known_for: 'beach-club' },
  { slug: 'cairns', name: 'Cairns', country: 'Australia', iso: 'AU', region: 'Asia-Pacific', timezone: 'Australia/Brisbane', lat: -16.9186, lon: 145.7781, metro_pop: 153000, penetration: 0.95, mood: 7.8, best_known_for: 'adventure' },
];

// Best Known For for the ORIGINAL 151. Anything not named here falls to
// the regional default below, so every one of the 250 ends up with a
// category and none is left blank.
const EXISTING_CATEGORY = {
  tokyo: 'cultural', delhi: 'cultural', shanghai: 'luxury', 'sao-paulo': 'nightlife',
  'mexico-city': 'cultural', cairo: 'cultural', mumbai: 'nightlife', beijing: 'cultural',
  osaka: 'festival', nyc: 'nightlife', london: 'nightlife', paris: 'luxury',
  toronto: 'cultural', sydney: 'beach-club', berlin: 'alternative', dubai: 'luxury',
  singapore: 'luxury', 'hong-kong': 'nightlife', bangkok: 'nightlife', istanbul: 'cultural',
  medellin: 'digital-nomad', bogota: 'alternative', 'buenos-aires': 'nightlife',
  santiago: 'adventure', lima: 'cultural', moscow: 'cultural', seoul: 'nightlife',
  ankara: 'cultural', nairobi: 'adventure', lagos: 'nightlife', 'los-angeles': 'beach-club',
  chicago: 'festival', miami: 'beach-club', houston: 'cultural', vancouver: 'adventure',
  montreal: 'festival', 'san-francisco': 'digital-nomad', guadalajara: 'cultural',
  atlanta: 'nightlife', seattle: 'alternative', 'washington-dc': 'cultural',
  phoenix: 'wellness', boston: 'student-budget', monterrey: 'cultural', dallas: 'nightlife',
  minneapolis: 'alternative', denver: 'adventure', philadelphia: 'cultural',
  'san-diego': 'beach-club', havana: 'cultural', madrid: 'nightlife', barcelona: 'beach-club',
  rome: 'cultural', milan: 'luxury', amsterdam: 'nightlife', warsaw: 'alternative',
  stockholm: 'digital-nomad', vienna: 'cultural', prague: 'student-budget',
  budapest: 'nightlife', zurich: 'luxury', munich: 'festival', lisbon: 'digital-nomad',
  brussels: 'cultural', oslo: 'adventure', copenhagen: 'wellness', helsinki: 'wellness',
  athens: 'cultural', bucharest: 'nightlife', kyiv: 'alternative', dublin: 'nightlife',
  lyon: 'cultural', rotterdam: 'alternative', krakow: 'student-budget', hamburg: 'nightlife',
  edinburgh: 'festival', seville: 'festival', porto: 'digital-nomad', sofia: 'student-budget',
  vilnius: 'student-budget', bangalore: 'digital-nomad', hyderabad: 'cultural',
  dhaka: 'cultural', karachi: 'cultural', kolkata: 'cultural', guangzhou: 'cultural',
  shenzhen: 'digital-nomad', chengdu: 'nightlife', wuhan: 'student-budget',
  taipei: 'nightlife', 'kuala-lumpur': 'cultural', jakarta: 'nightlife', manila: 'nightlife',
  'ho-chi-minh': 'nightlife', hanoi: 'cultural', melbourne: 'alternative',
  auckland: 'adventure', lahore: 'cultural', colombo: 'beach-club', yangon: 'cultural',
  kathmandu: 'adventure', chennai: 'cultural', pune: 'student-budget', tianjin: 'cultural',
  chongqing: 'nightlife', nanjing: 'cultural', perth: 'beach-club', brisbane: 'beach-club',
  'phnom-penh': 'student-budget', busan: 'beach-club', nagoya: 'cultural',
  fukuoka: 'festival', surabaya: 'cultural', 'xi-an': 'cultural', harbin: 'festival',
  adelaide: 'festival', ulaanbaatar: 'adventure', sapporo: 'festival',
  vientiane: 'student-budget', tehran: 'cultural', caracas: 'cultural',
  guayaquil: 'adventure', quito: 'adventure', fortaleza: 'beach-club',
  'belo-horizonte': 'nightlife', 'porto-alegre': 'cultural', recife: 'festival',
  cali: 'nightlife', montevideo: 'beach-club', curitiba: 'wellness',
  johannesburg: 'alternative', 'cape-town': 'adventure', kinshasa: 'nightlife',
  'addis-ababa': 'cultural', accra: 'nightlife', 'dar-es-salaam': 'beach-club',
  casablanca: 'nightlife', dakar: 'festival', algiers: 'cultural', tunis: 'cultural',
  riyadh: 'luxury', doha: 'luxury', 'abu-dhabi': 'luxury', amman: 'cultural',
  'tel-aviv': 'nightlife', beirut: 'nightlife', muscat: 'adventure',
  'kuwait-city': 'luxury', jeddah: 'cultural', baghdad: 'cultural',
  'milton-keynes': 'student-budget',
};

const REGION_DEFAULT = {
  Europe: 'cultural', 'North America': 'nightlife', 'Latin America': 'festival',
  'South America': 'festival', 'East Asia': 'cultural', 'Southeast Asia': 'beach-club',
  'South Asia': 'cultural', 'Asia-Pacific': 'adventure', 'Middle East': 'cultural',
  'North Africa': 'cultural', 'West Africa': 'nightlife', 'East Africa': 'adventure',
  'Southern Africa': 'adventure', 'Central Africa': 'nightlife',
};

module.exports = { NEW_CITIES, EXISTING_CATEGORY, REGION_DEFAULT };
