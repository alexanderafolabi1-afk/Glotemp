-- Seed Tech vertical data: GitHub activity, job postings, startup signals
-- Simulates aggregated data from GitHub API, job boards, and GDELT tech themes
-- Run after supabase-verticals-schema.sql

INSERT INTO readings (city_slug, vertical, metric, value, label, source, source_url, confidence, fetched_at)
VALUES
  -- San Francisco: GitHub activity (pulls/week)
  ('san-francisco', 'tech', 'github_activity_prs', 4850, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22San+Francisco%22', 0.9, '2026-08-07'::timestamp),
  ('san-francisco', 'tech', 'job_postings_count', 1240, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('san-francisco', 'tech', 'startup_density', 8.2, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- New York: GitHub activity
  ('new-york', 'tech', 'github_activity_prs', 3200, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22New+York%22', 0.9, '2026-08-07'::timestamp),
  ('new-york', 'tech', 'job_postings_count', 980, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('new-york', 'tech', 'startup_density', 5.1, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

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

  -- Tokyo: GitHub activity
  ('tokyo', 'tech', 'github_activity_prs', 2650, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22Tokyo%22', 0.9, '2026-08-07'::timestamp),
  ('tokyo', 'tech', 'job_postings_count', 480, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('tokyo', 'tech', 'startup_density', 3.2, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- Toronto: GitHub activity
  ('toronto', 'tech', 'github_activity_prs', 1650, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22Toronto%22', 0.9, '2026-08-07'::timestamp),
  ('toronto', 'tech', 'job_postings_count', 420, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('toronto', 'tech', 'startup_density', 5.8, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- Austin: GitHub activity
  ('austin', 'tech', 'github_activity_prs', 1920, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22Austin%22', 0.9, '2026-08-07'::timestamp),
  ('austin', 'tech', 'job_postings_count', 650, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('austin', 'tech', 'startup_density', 5.5, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- São Paulo: GitHub activity
  ('sao-paulo', 'tech', 'github_activity_prs', 980, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22São+Paulo%22', 0.9, '2026-08-07'::timestamp),
  ('sao-paulo', 'tech', 'job_postings_count', 320, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('sao-paulo', 'tech', 'startup_density', 4.1, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp),

  -- Bangalore: GitHub activity
  ('bangalore', 'tech', 'github_activity_prs', 3100, 'GitHub PRs/week', 'github_activity', 'https://github.com/search?q=location%3A%22Bangalore%22', 0.9, '2026-08-07'::timestamp),
  ('bangalore', 'tech', 'job_postings_count', 890, 'Engineering job postings', 'job_boards', 'https://www.linkedin.com', 0.85, '2026-08-07'::timestamp),
  ('bangalore', 'tech', 'startup_density', 6.3, 'Startups per 100k residents', 'crunchbase', 'https://www.crunchbase.com', 0.8, '2026-08-07'::timestamp)
ON CONFLICT DO NOTHING;

-- Verify insert
SELECT COUNT(*) as tech_data_count FROM readings WHERE vertical = 'tech';
