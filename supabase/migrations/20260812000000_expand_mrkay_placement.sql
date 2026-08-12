-- Extend the Drinks Store by Mr Kay placement from two Lagos verticals
-- (food, entertainment) to every Lagos vertical except health and
-- education. Same fields as the original two rows -- one row per
-- vertical, since the strip's match is an exact (city_slug, vertical)
-- pair, not a list column.
insert into advertisers
  (name, url, tagline, logo_path, tier, city_slug, vertical, format, start_date, end_date, active)
values
  ('Drinks Store by Mr Kay', 'https://mrkaydrinks.com', 'Nigeria''s premier supplier of luxury drinks', '/assets/mrkay.png', 'city_vertical', 'lagos', 'pulse',         'credit', '2026-08-11', '2027-02-11', true),
  ('Drinks Store by Mr Kay', 'https://mrkaydrinks.com', 'Nigeria''s premier supplier of luxury drinks', '/assets/mrkay.png', 'city_vertical', 'lagos', 'tech',          'credit', '2026-08-11', '2027-02-11', true),
  ('Drinks Store by Mr Kay', 'https://mrkaydrinks.com', 'Nigeria''s premier supplier of luxury drinks', '/assets/mrkay.png', 'city_vertical', 'lagos', 'finance',       'credit', '2026-08-11', '2027-02-11', true),
  ('Drinks Store by Mr Kay', 'https://mrkaydrinks.com', 'Nigeria''s premier supplier of luxury drinks', '/assets/mrkay.png', 'city_vertical', 'lagos', 'work',          'credit', '2026-08-11', '2027-02-11', true),
  ('Drinks Store by Mr Kay', 'https://mrkaydrinks.com', 'Nigeria''s premier supplier of luxury drinks', '/assets/mrkay.png', 'city_vertical', 'lagos', 'property',      'credit', '2026-08-11', '2027-02-11', true),
  ('Drinks Store by Mr Kay', 'https://mrkaydrinks.com', 'Nigeria''s premier supplier of luxury drinks', '/assets/mrkay.png', 'city_vertical', 'lagos', 'sport',         'credit', '2026-08-11', '2027-02-11', true),
  ('Drinks Store by Mr Kay', 'https://mrkaydrinks.com', 'Nigeria''s premier supplier of luxury drinks', '/assets/mrkay.png', 'city_vertical', 'lagos', 'fashion',       'credit', '2026-08-11', '2027-02-11', true),
  ('Drinks Store by Mr Kay', 'https://mrkaydrinks.com', 'Nigeria''s premier supplier of luxury drinks', '/assets/mrkay.png', 'city_vertical', 'lagos', 'transport',     'credit', '2026-08-11', '2027-02-11', true);
