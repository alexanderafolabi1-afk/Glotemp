-- Seed Tech vertical data: GitHub activity, job postings, startup signals
-- Simulates aggregated data from GitHub API, job boards, and GDELT tech themes
-- Run after supabase-verticals-schema.sql
-- NOTE: Using city slugs from cities-data.js (30 available cities)

INSERT INTO readings (city_slug, vertical, metric, value, label, source, source_url, confidence, fetched_at)
VALUES
  -- Tokyo: GitHub activity (pulls/week)
  ('tokyo', 'tech', 'github_activity_prs', 2650, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22Tokyo%22', 0.9, '2026-08-07'::timestamp),
  ('tokyo', 'tech', 'job_postings_count', 480, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('tokyo', 'tech', 'startup_density', 3.2, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- New York (nyc): GitHub activity
  ('nyc', 'tech', 'github_activity_prs', 3200, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22New+York%22', 0.9, '2026-08-07'::timestamp),
  ('nyc', 'tech', 'job_postings_count', 980, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('nyc', 'tech', 'startup_density', 5.1, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- London: GitHub activity
  ('london', 'tech', 'github_activity_prs', 2840, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22London%22', 0.9, '2026-08-07'::timestamp),
  ('london', 'tech', 'job_postings_count', 750, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('london', 'tech', 'startup_density', 4.3, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- Berlin: GitHub activity
  ('berlin', 'tech', 'github_activity_prs', 1850, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22Berlin%22', 0.9, '2026-08-07'::timestamp),
  ('berlin', 'tech', 'job_postings_count', 620, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('berlin', 'tech', 'startup_density', 6.7, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- Singapore: GitHub activity
  ('singapore', 'tech', 'github_activity_prs', 2100, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22Singapore%22', 0.9, '2026-08-07'::timestamp),
  ('singapore', 'tech', 'job_postings_count', 540, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('singapore', 'tech', 'startup_density', 7.4, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- Toronto: GitHub activity
  ('toronto', 'tech', 'github_activity_prs', 1650, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22Toronto%22', 0.9, '2026-08-07'::timestamp),
  ('toronto', 'tech', 'job_postings_count', 420, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('toronto', 'tech', 'startup_density', 5.8, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- Seoul: GitHub activity
  ('seoul', 'tech', 'github_activity_prs', 2200, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22Seoul%22', 0.9, '2026-08-07'::timestamp),
  ('seoul', 'tech', 'job_postings_count', 580, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('seoul', 'tech', 'startup_density', 6.1, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- São Paulo: GitHub activity
  ('sao-paulo', 'tech', 'github_activity_prs', 980, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22São+Paulo%22', 0.9, '2026-08-07'::timestamp),
  ('sao-paulo', 'tech', 'job_postings_count', 320, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('sao-paulo', 'tech', 'startup_density', 4.1, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- Hong Kong: GitHub activity
  ('hong-kong', 'tech', 'github_activity_prs', 1950, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22Hong+Kong%22', 0.9, '2026-08-07'::timestamp),
  ('hong-kong', 'tech', 'job_postings_count', 410, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('hong-kong', 'tech', 'startup_density', 5.5, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp)
ON CONFLICT DO NOTHING;

-- Verify insert
SELECT COUNT(*) as tech_data_count FROM readings WHERE vertical = 'tech';
