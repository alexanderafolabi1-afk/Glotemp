-- Seed Finance vertical data: Cost of living, currency stability, inflation, economic growth
-- Simulates aggregated data from World Bank, Frankfurter FX API, Alpha Vantage
-- Run after supabase-verticals-schema.sql
-- NOTE: Using city slugs from cities-data.js (30 available cities)

INSERT INTO readings (city_slug, vertical, metric, value, label, source, source_url, confidence, fetched_at)
VALUES
  -- Tokyo: Economic data (cost of living index, 100 = baseline)
  ('tokyo', 'finance', 'cost_of_living_index', 129.6, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('tokyo', 'finance', 'inflation_rate', 2.5, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('tokyo', 'finance', 'forex_stability', 7.1, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- New York (nyc): Economic data
  ('nyc', 'finance', 'cost_of_living_index', 168.2, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('nyc', 'finance', 'inflation_rate', 3.1, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('nyc', 'finance', 'forex_stability', 8.7, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- London: Economic data
  ('london', 'finance', 'cost_of_living_index', 145.3, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('london', 'finance', 'inflation_rate', 3.9, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('london', 'finance', 'forex_stability', 7.2, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- Berlin: Economic data
  ('berlin', 'finance', 'cost_of_living_index', 98.4, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('berlin', 'finance', 'inflation_rate', 2.4, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('berlin', 'finance', 'forex_stability', 7.8, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- Singapore: Economic data
  ('singapore', 'finance', 'cost_of_living_index', 142.8, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('singapore', 'finance', 'inflation_rate', 2.1, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('singapore', 'finance', 'forex_stability', 8.9, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- Toronto: Economic data
  ('toronto', 'finance', 'cost_of_living_index', 112.4, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('toronto', 'finance', 'inflation_rate', 2.7, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('toronto', 'finance', 'forex_stability', 7.4, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- Seoul: Economic data
  ('seoul', 'finance', 'cost_of_living_index', 115.2, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('seoul', 'finance', 'inflation_rate', 2.8, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('seoul', 'finance', 'forex_stability', 6.9, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- São Paulo: Economic data
  ('sao-paulo', 'finance', 'cost_of_living_index', 67.3, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('sao-paulo', 'finance', 'inflation_rate', 5.8, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('sao-paulo', 'finance', 'forex_stability', 5.2, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- Dubai: Economic data
  ('dubai', 'finance', 'cost_of_living_index', 134.7, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('dubai', 'finance', 'inflation_rate', 1.5, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('dubai', 'finance', 'forex_stability', 9.1, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- Mexico City: Economic data
  ('mexico-city', 'finance', 'cost_of_living_index', 52.6, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('mexico-city', 'finance', 'inflation_rate', 4.2, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('mexico-city', 'finance', 'forex_stability', 5.8, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp)
ON CONFLICT DO NOTHING;

-- Verify insert
SELECT COUNT(*) as finance_data_count FROM readings WHERE vertical = 'finance';
