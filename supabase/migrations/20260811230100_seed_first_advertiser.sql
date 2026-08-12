-- First sponsorship credit: Drinks Store by Mr Kay, on the Lagos food and
-- Lagos entertainment vertical pages only. Two rows because the strip's
-- match is an exact (city_slug, vertical) pair -- one row per vertical,
-- not a list column -- to keep the client query a plain equality filter.
insert into advertisers
  (name, url, tagline, logo_path, tier, city_slug, vertical, format, start_date, end_date, active)
values
  ('Drinks Store by Mr Kay', 'https://mrkaydrinks.com', 'Nigeria''s premier supplier of luxury drinks',
   '/assets/mrkay.png', 'city_vertical', 'lagos', 'food', 'credit', '2026-08-11', '2027-02-11', true),
  ('Drinks Store by Mr Kay', 'https://mrkaydrinks.com', 'Nigeria''s premier supplier of luxury drinks',
   '/assets/mrkay.png', 'city_vertical', 'lagos', 'entertainment', 'credit', '2026-08-11', '2027-02-11', true);
