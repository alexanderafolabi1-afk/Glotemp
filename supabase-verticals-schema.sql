-- Glotemp Multi-Vertical Platform Schema
-- Historical readings table: stores all data points, never deletes
-- Schema: city, vertical, metric, value, source, confidence, fetched_at

CREATE TABLE IF NOT EXISTS readings (
  id BIGSERIAL PRIMARY KEY,
  city_slug TEXT NOT NULL,
  vertical TEXT NOT NULL, -- 'pulse', 'tech', 'finance', etc.
  metric TEXT NOT NULL,
  value FLOAT8,
  label TEXT, -- Human-readable label if not numeric
  source TEXT NOT NULL, -- 'gdelt_sentiment', 'github_api', 'world_bank', etc.
  source_url TEXT,
  confidence FLOAT8 DEFAULT 0.5, -- 0-1 scale
  fetched_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  INDEX (city_slug, vertical),
  INDEX (vertical, fetched_at),
  INDEX (source, fetched_at)
);

-- Latest readings view: most recent value for each city×vertical×metric
CREATE OR REPLACE VIEW latest_readings AS
  SELECT DISTINCT ON (city_slug, vertical, metric)
    city_slug, vertical, metric, value, label, source, source_url, confidence, fetched_at
  FROM readings
  ORDER BY city_slug, vertical, metric, fetched_at DESC;

-- Vertical rankings: aggregated scores for ranking pages
CREATE TABLE IF NOT EXISTS vertical_rankings (
  id BIGSERIAL PRIMARY KEY,
  vertical TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  rank INT NOT NULL,
  score FLOAT8,
  signal_volume INT DEFAULT 0, -- Number of data points included
  momentum FLOAT8, -- Change since last week
  calculated_at TIMESTAMP DEFAULT now(),
  UNIQUE (vertical, city_slug)
);

-- Enable RLS
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_rankings ENABLE ROW LEVEL SECURITY;

-- Public read-only access (anon users can read all data)
CREATE POLICY readings_read ON readings
  FOR SELECT USING (true);

CREATE POLICY rankings_read ON vertical_rankings
  FOR SELECT USING (true);

-- Public write (for Supabase edge functions to insert readings)
CREATE POLICY readings_insert ON readings
  FOR INSERT WITH CHECK (true);
