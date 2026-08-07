-- Seed Finance vertical data: Cost of living, currency stability, inflation, economic growth
-- Simulates aggregated data from World Bank, Frankfurter FX API, Alpha Vantage
-- Run after supabase-verticals-schema.sql

INSERT INTO readings (city_slug, vertical, metric, value, label, source, source_url, confidence, fetched_at)
VALUES
  -- San Francisco: Economic data (cost of living index, 100 = baseline)
  ('san-francisco', 'finance', 'cost_of_living_index', 174.5, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('san-francisco', 'finance', 'inflation_rate', 3.2, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('san-francisco', 'finance', 'forex_stability', 8.5, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- New York: Economic data
  ('new-york', 'finance', 'cost_of_living_index', 168.2, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('new-york', 'finance', 'inflation_rate', 3.1, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('new-york', 'finance', 'forex_stability', 8.7, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

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

  -- Tokyo: Economic data
  ('tokyo', 'finance', 'cost_of_living_index', 129.6, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('tokyo', 'finance', 'inflation_rate', 2.5, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('tokyo', 'finance', 'forex_stability', 7.1, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- Toronto: Economic data
  ('toronto', 'finance', 'cost_of_living_index', 112.4, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('toronto', 'finance', 'inflation_rate', 2.7, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('toronto', 'finance', 'forex_stability', 7.4, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- Austin: Economic data
  ('austin', 'finance', 'cost_of_living_index', 89.2, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('austin', 'finance', 'inflation_rate', 3.3, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('austin', 'finance', 'forex_stability', 8.6, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- São Paulo: Economic data
  ('sao-paulo', 'finance', 'cost_of_living_index', 67.3, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('sao-paulo', 'finance', 'inflation_rate', 5.8, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('sao-paulo', 'finance', 'forex_stability', 5.2, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

  -- Bangalore: Economic data
  ('bangalore', 'finance', 'cost_of_living_index', 45.8, 'Cost of Living Index', 'numbeo', 'https://www.numbeo.com', 0.85, '2026-08-07'::timestamp),
  ('bangalore', 'finance', 'inflation_rate', 6.3, 'Annual Inflation %', 'world_bank', 'https://data.worldbank.org', 0.9, '2026-08-07'::timestamp),
  ('bangalore', 'finance', 'forex_stability', 6.1, 'Currency Stability Score (0-10)', 'frankfurter', 'https://www.frankfurter.app', 0.8, '2026-08-07'::timestamp),

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
