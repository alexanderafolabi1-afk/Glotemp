-- Seed observations for Glotemp homepage
-- source='seed' allows filtering or purging in one query:
--   DELETE FROM city_comments WHERE source = 'seed';

-- Add source column if not present
alter table city_comments add column if not exists source text default null;
alter table city_comments add column if not exists language_lens text default null;

-- Clear any previous seed data before re-inserting
delete from city_comments where source = 'seed';

-- Insert seed observations spread across 40+ cities over the last 48 hours
insert into city_comments (city, sentiment, intensity, scene, language_lens, context, created_at, source) values
  ('tokyo', 0.85, 9, 'street', 'local', '渋谷のスクランブル交差点はいつもより人が多い。エネルギーが充電されている。', '2026-08-07 07:00:00+00', 'seed'),
  ('tokyo', 0.7, 7, 'cafe', 'visitor', 'Perfect matcha in Shimokitazawa. The neighbourhood hums quietly.', '2026-08-07 03:00:00+00', 'seed'),
  ('tokyo', 0.9, 9, 'nightlife', 'visitor', 'Shibuya at 23h — the city never stops. Charged.', '2026-08-06 22:00:00+00', 'seed'),
  ('tokyo', 0.6, 6, 'transit', 'local', '山手線は混雑しているが、秩序がある。普通の朝だ。', '2026-08-06 14:00:00+00', 'seed'),
  ('nyc', 0.8, 8, 'street', 'visitor', 'Financial district buzzing, suits moving fast. Energy is high.', '2026-08-07 06:00:00+00', 'seed'),
  ('nyc', 0.5, 5, 'home', 'local', 'Quiet Sunday in Brooklyn. Warm, relaxed.', '2026-08-07 01:00:00+00', 'seed'),
  ('nyc', 0.75, 8, 'cafe', 'diaspora', 'Harlem on a Saturday afternoon — music from every window.', '2026-08-06 18:00:00+00', 'seed'),
  ('nyc', 0.4, 4, 'transit', 'local', 'Subway delayed again. People managing calmly enough.', '2026-08-06 10:00:00+00', 'seed'),
  ('london', 0.55, 6, 'street', 'visitor', 'Drizzle on Oxford Street but the pubs are warm inside.', '2026-08-07 05:00:00+00', 'seed'),
  ('london', 0.7, 7, 'work', 'local', 'City desks are busy. Post-market close energy.', '2026-08-07 02:00:00+00', 'seed'),
  ('london', 0.65, 7, 'cafe', 'diaspora', 'Borough Market on a Saturday — the place is alive.', '2026-08-06 17:00:00+00', 'seed'),
  ('paris', 0.8, 8, 'street', 'visitor', 'Place du Marais en soirée — conversations et vin, partout.', '2026-08-07 04:00:00+00', 'seed'),
  ('paris', 0.6, 6, 'transit', 'local', 'Métro ligne 4 bondée mais calme. Ambiance ordinaire.', '2026-08-06 23:00:00+00', 'seed'),
  ('paris', 0.75, 8, 'cafe', 'visitor', 'Café de Flore at dusk — everyone is animated, warm.', '2026-08-06 12:00:00+00', 'seed'),
  ('berlin', 0.7, 7, 'nightlife', 'visitor', 'Kreuzberg is waking up. It will be loud by midnight.', '2026-08-07 03:00:00+00', 'seed'),
  ('berlin', 0.8, 8, 'street', 'local', 'Mauerpark Sonntag — Flohmärkte und Lachen überall.', '2026-08-06 21:00:00+00', 'seed'),
  ('berlin', 0.55, 6, 'work', 'local', 'Ruhiger Montag in Mitte. Normale Arbeitsenergie.', '2026-08-06 02:00:00+00', 'seed'),
  ('mumbai', 0.75, 8, 'street', 'local', 'बांद्रा की सड़कें गुलजार हैं। शाम को ऊर्जा चरम पर है।', '2026-08-07 06:00:00+00', 'seed'),
  ('mumbai', 0.6, 6, 'transit', 'local', 'Local train rush hour — the city breathes in sync.', '2026-08-07 00:00:00+00', 'seed'),
  ('mumbai', 0.8, 8, 'nightlife', 'visitor', 'Marine Drive at night — the whole city gathers here.', '2026-08-06 16:00:00+00', 'seed'),
  ('medellin', 0.9, 9, 'street', 'local', 'El Poblado en la noche, lleno de vida y música. La ciudad vibra.', '2026-08-07 05:00:00+00', 'seed'),
  ('medellin', 0.8, 8, 'cafe', 'visitor', 'Coffee shops in Laureles — the best in the world, honestly.', '2026-08-06 20:00:00+00', 'seed'),
  ('bangkok', 0.85, 9, 'street', 'visitor', 'Chatuchak on Sunday morning — a beautiful chaos.', '2026-08-07 04:00:00+00', 'seed'),
  ('bangkok', 0.7, 7, 'nightlife', 'visitor', 'Khao San Road is noisy and warm, tourists and locals mixing.', '2026-08-06 14:00:00+00', 'seed'),
  ('singapore', 0.8, 8, 'work', 'local', 'CBD at 9am — efficient, clean, focused energy.', '2026-08-07 07:00:00+00', 'seed'),
  ('singapore', 0.75, 8, 'street', 'visitor', 'Gardens by the Bay at dusk — spectacular and calm.', '2026-08-06 23:00:00+00', 'seed'),
  ('sao-paulo', 0.65, 7, 'street', 'local', 'Paulistanos nas ruas do Ibirapuera — domingo tranquilo.', '2026-08-07 02:00:00+00', 'seed'),
  ('sao-paulo', 0.75, 8, 'nightlife', 'local', 'Vila Madalena à noite — arte, música, vida urbana plena.', '2026-08-06 18:00:00+00', 'seed'),
  ('seoul', 0.7, 7, 'street', 'local', '홍대 거리는 토요일 오후에 항상 활기차다. 좋은 에너지.', '2026-08-07 03:00:00+00', 'seed'),
  ('seoul', 0.8, 8, 'cafe', 'visitor', 'Bukchon Hanok Village — serene, slow, beautiful.', '2026-08-06 12:00:00+00', 'seed'),
  ('delhi', 0.6, 6, 'transit', 'local', 'मेट्रो में सामान्य भीड़। लोग थके हुए लेकिन शांत हैं।', '2026-08-07 05:00:00+00', 'seed'),
  ('delhi', 0.75, 8, 'street', 'visitor', 'Chandni Chowk in the evening — overwhelming and alive.', '2026-08-06 22:00:00+00', 'seed'),
  ('melbourne', 0.8, 8, 'cafe', 'local', 'Fitzroy laneways on a Sunday — coffee culture at its finest.', '2026-08-07 01:00:00+00', 'seed'),
  ('melbourne', 0.7, 7, 'street', 'visitor', 'CBD quiet for once. Post-footy weekend wind-down.', '2026-08-06 08:00:00+00', 'seed'),
  ('toronto', 0.65, 7, 'street', 'local', 'Kensington Market on a lazy Saturday. Easygoing.', '2026-08-07 00:00:00+00', 'seed'),
  ('toronto', 0.7, 7, 'cafe', 'diaspora', 'Distillery District busy with tourists and locals alike.', '2026-08-06 16:00:00+00', 'seed'),
  ('istanbul', 0.65, 7, 'street', 'visitor', 'Kapalıçarşı hâlâ kalabalık. Eski enerji hâlâ burada.', '2026-08-07 02:00:00+00', 'seed'),
  ('istanbul', 0.7, 7, 'cafe', 'local', 'Boğaz kenarında çay ve muhabbet. Her zamanki gibi.', '2026-08-06 20:00:00+00', 'seed'),
  ('dubai', 0.85, 9, 'work', 'visitor', 'DIFC at 8am — polished, fast, ambitious.', '2026-08-07 06:00:00+00', 'seed'),
  ('dubai', 0.8, 8, 'street', 'visitor', 'Downtown fountains at night — grand and glowing.', '2026-08-06 22:00:00+00', 'seed'),
  ('sydney', 0.85, 9, 'street', 'local', 'Bondi on a warm Sunday — the whole city is here.', '2026-08-07 05:00:00+00', 'seed'),
  ('sydney', 0.7, 7, 'cafe', 'visitor', 'Surry Hills brunch crowd — animated and relaxed.', '2026-08-06 17:00:00+00', 'seed'),
  ('nairobi', 0.7, 7, 'street', 'local', 'Westlands on Friday evening — the week ends with energy.', '2026-08-07 03:00:00+00', 'seed'),
  ('nairobi', 0.6, 6, 'work', 'local', 'Tech workers at iHub, focused and collaborative.', '2026-08-06 10:00:00+00', 'seed'),
  ('lagos', 0.75, 8, 'street', 'local', 'Victoria Island traffic heavy but the music plays.', '2026-08-07 04:00:00+00', 'seed'),
  ('lagos', 0.8, 8, 'nightlife', 'local', 'Lekki Friday night — Afrobeats everywhere.', '2026-08-06 21:00:00+00', 'seed'),
  ('buenos-aires', 0.7, 7, 'cafe', 'local', 'Palermo Soho — mate, libros y conversación. Domingo perfecto.', '2026-08-07 01:00:00+00', 'seed'),
  ('buenos-aires', 0.75, 8, 'street', 'visitor', 'La Boca on a Saturday — tango in the street, life is loud.', '2026-08-06 19:00:00+00', 'seed'),
  ('moscow', 0.45, 5, 'street', 'local', 'Центр города в воскресенье — немного людей, тихо.', '2026-08-06 23:00:00+00', 'seed'),
  ('moscow', 0.5, 5, 'transit', 'local', 'Метро переполнено в понедельник утром. Обычный день.', '2026-08-05 23:00:00+00', 'seed'),
  ('cairo', 0.6, 6, 'street', 'local', 'وسط البلد مكتظ كالعادة. الحياة تسير ببطء لكنها مستمرة.', '2026-08-07 02:00:00+00', 'seed'),
  ('cairo', 0.65, 7, 'cafe', 'visitor', 'Coffee at a rooftop in Zamalek — city spread below.', '2026-08-06 14:00:00+00', 'seed'),
  ('los-angeles', 0.75, 8, 'street', 'visitor', 'Venice Beach on a Sunday — sun, skaters, positive energy.', '2026-08-07 04:00:00+00', 'seed'),
  ('los-angeles', 0.6, 6, 'work', 'local', 'Downtown LA quiet this weekend. The city breathes.', '2026-08-06 12:00:00+00', 'seed'),
  ('barcelona', 0.85, 9, 'street', 'visitor', 'La Barceloneta a las 8pm — todo el mundo en la playa.', '2026-08-07 05:00:00+00', 'seed'),
  ('barcelona', 0.8, 8, 'nightlife', 'visitor', 'El Born neighbourhood buzzing — cocktails and Catalan music.', '2026-08-06 22:00:00+00', 'seed'),
  ('hong-kong', 0.65, 7, 'street', 'local', 'Mong Kok on a Saturday — crowds, neon, relentless pace.', '2026-08-07 03:00:00+00', 'seed'),
  ('hong-kong', 0.7, 7, 'cafe', 'visitor', 'Central coffee shop — city hustle visible through the glass.', '2026-08-06 17:00:00+00', 'seed'),
  ('kyiv', 0.55, 6, 'street', 'local', 'Хрещатик у неділю — люди гуляють, музиканти грають.', '2026-08-07 00:00:00+00', 'seed'),
  ('kyiv', 0.6, 6, 'cafe', 'visitor', 'Coffee in Podil — the neighbourhood holds its rhythm.', '2026-08-06 10:00:00+00', 'seed'),
  ('santiago', 0.65, 7, 'street', 'local', 'Providencia tranquila pero viva. Domingo soleado.', '2026-08-07 01:00:00+00', 'seed'),
  ('bogota', 0.7, 7, 'street', 'visitor', 'La Candelaria on a Sunday morning — quiet and beautiful.', '2026-08-06 23:00:00+00', 'seed'),
  ('lima', 0.65, 7, 'cafe', 'local', 'Miraflores en el atardecer — vista al mar, tranquilidad.', '2026-08-07 02:00:00+00', 'seed'),
  ('accra', 0.75, 8, 'street', 'local', 'Osu is buzzing tonight. Highlife from every bar.', '2026-08-07 03:00:00+00', 'seed'),
  ('casablanca', 0.6, 6, 'street', 'local', 'أحياء المدينة في حركة. يوم جمعة عادي.', '2026-08-06 18:00:00+00', 'seed'),
  ('taipei', 0.8, 8, 'street', 'visitor', 'Shilin night market — a beautiful sensory overload.', '2026-08-07 02:00:00+00', 'seed'),
  ('taipei', 0.75, 7, 'cafe', 'local', '大安區的咖啡廳安靜而舒適。週末的平靜節奏。', '2026-08-06 12:00:00+00', 'seed'),
  ('johannesburg', 0.65, 7, 'street', 'local', 'Sandton City area — finance and fashion mix.', '2026-08-07 00:00:00+00', 'seed'),
  ('lisbon', 0.8, 8, 'street', 'visitor', 'Alfama at sunset — fado music, golden light, magic.', '2026-08-07 03:00:00+00', 'seed'),
  ('lisbon', 0.75, 8, 'cafe', 'local', 'Bairro Alto a tarde — tranquilo antes da noite.', '2026-08-06 16:00:00+00', 'seed'),
  ('kuala-lumpur', 0.75, 8, 'street', 'visitor', 'KLCC park at sunset — twin towers glowing, city alive.', '2026-08-07 04:00:00+00', 'seed'),
  ('jakarta', 0.65, 7, 'transit', 'local', 'Jakarta traffic — but the spirit of the city persists.', '2026-08-07 02:00:00+00', 'seed'),
  ('manila', 0.7, 7, 'street', 'local', 'BGC on a weekend — a different Manila, bright and young.', '2026-08-07 00:00:00+00', 'seed');

-- Refresh city_pulse_cache for seeded cities
select update_city_mood_cache(city) from (select distinct city from city_comments where source = 'seed') t;
