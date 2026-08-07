-- Comprehensive Glotemp Platform Seed Data
-- 600+ observation rows across 60+ cities, staggered over 72 hours
-- Multiple languages, realistic timestamps, all 12 verticals
-- Source: 'seed' for all

-- Cities to seed (60 selected from cities-data.js)
-- Strategy: 10 readings per city × 60 cities = 600 base rows
-- Additional variation in timestamps (72-hour window)

WITH cities_to_seed AS (
  SELECT * FROM (VALUES
    ('tokyo'), ('nyc'), ('london'), ('paris'), ('berlin'),
    ('dubai'), ('singapore'), ('hong-kong'), ('toronto'), ('sydney'),
    ('bangkok'), ('shanghai'), ('delhi'), ('mumbai'), ('sao-paulo'),
    ('mexico-city'), ('cairo'), ('seoul'), ('medellin'), ('buenos-aires'),
    ('moscow'), ('istanbul'), ('bogota'), ('lima'), ('santiago'),
    ('nairobi'), ('lagos'), ('ankara'), ('osaka'), ('beijing'),
    ('barcelona'), ('amsterdam'), ('dubai'), ('zurich'), ('frankfurt'),
    ('hong-kong'), ('mumbai'), ('bangalore'), ('auckland'), ('toronto'),
    ('vancouver'), ('mexico-city'), ('buenos-aires'), ('bangkok'), ('ho-chi-minh'),
    ('kuala-lumpur'), ('jakarta'), ('manila'), ('hanoi'), ('phnom-penh'),
    ('ho-chi-minh'), ('bangkok'), ('phuket'), ('bali'), ('chiang-mai'),
    ('tokyo'), ('osaka'), ('kyoto'), ('yokohama'), ('kobe')
  ) AS t(slug)
)
INSERT INTO readings (city_slug, vertical, metric, value, label, source, source_url, confidence, fetched_at)
SELECT
  -- PULSE: Mood readings (0-10 scale)
  cities_to_seed.slug, 'pulse', 'mood_reading',
  6.5 + RANDOM() * 3, -- Values 6.5-9.5
  'Ambient mood reading',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.75 + RANDOM() * 0.25, -- Confidence 0.75-1.0
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'pulse', 'event_energy',
  7 + RANDOM() * 2.5, -- Values 7-9.5
  'Event and social energy',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.7 + RANDOM() * 0.3,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
-- TECH: Developer activity (GitHub-like scale)
SELECT
  cities_to_seed.slug, 'tech', 'developer_activity',
  500 + RANDOM() * 2500, -- 500-3000 PRs/week equivalent
  'Developer activity (PRs/week)',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.8 + RANDOM() * 0.2,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'tech', 'job_openings',
  50 + RANDOM() * 400, -- 50-450 tech jobs
  'Tech job openings',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.75 + RANDOM() * 0.25,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'tech', 'startup_activity',
  10 + RANDOM() * 40, -- 10-50 active startups
  'Startup formation activity',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.7 + RANDOM() * 0.3,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
-- FINANCE: Economic indicators
SELECT
  cities_to_seed.slug, 'finance', 'cost_of_living',
  50 + RANDOM() * 150, -- COL index 50-200
  'Cost of Living Index',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.85 + RANDOM() * 0.15,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'finance', 'inflation_rate',
  1.5 + RANDOM() * 5, -- 1.5-6.5% inflation
  'Annual inflation %',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.8 + RANDOM() * 0.2,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'finance', 'currency_strength',
  5 + RANDOM() * 5, -- 5-10 scale
  'Currency stability',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.75 + RANDOM() * 0.25,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
-- WORK: Job market & environment
SELECT
  cities_to_seed.slug, 'work', 'remote_work_adoption',
  30 + RANDOM() * 50, -- 30-80% remote adoption
  'Remote work adoption rate',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.7 + RANDOM() * 0.3,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'work', 'salary_competitiveness',
  60 + RANDOM() * 40, -- 60-100 scale
  'Average salary competitiveness',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.75 + RANDOM() * 0.25,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'work', 'work_culture_score',
  6 + RANDOM() * 3, -- 6-9 scale
  'Work-life balance perception',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.7 + RANDOM() * 0.3,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
-- PROPERTY: Real estate & housing
SELECT
  cities_to_seed.slug, 'property', 'median_rent',
  400 + RANDOM() * 2600, -- $400-3000/month
  'Median monthly rent (1BR)',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.8 + RANDOM() * 0.2,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'property', 'property_appreciation',
  -5 + RANDOM() * 15, -- -5% to +10% YoY
  'Annual property appreciation %',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.65 + RANDOM() * 0.35,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'property', 'housing_availability',
  20 + RANDOM() * 60, -- 20-80 availability score
  'New housing starts',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.7 + RANDOM() * 0.3,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
-- EDUCATION: Schools & universities
SELECT
  cities_to_seed.slug, 'education', 'university_count',
  3 + RANDOM() * 50, -- 3-53 universities
  'Number of universities',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.8 + RANDOM() * 0.2,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'education', 'international_students',
  10 + RANDOM() * 40, -- 10-50% international
  'International student percentage',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.75 + RANDOM() * 0.25,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'education', 'education_quality_score',
  6 + RANDOM() * 3.5, -- 6-9.5 scale
  'Overall education quality',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.7 + RANDOM() * 0.3,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
-- SPORT: Sports infrastructure & culture
SELECT
  cities_to_seed.slug, 'sport', 'sports_venues',
  10 + RANDOM() * 100, -- 10-110 major venues
  'Major sports venues and facilities',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.75 + RANDOM() * 0.25,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'sport', 'active_participation',
  25 + RANDOM() * 50, -- 25-75% participation
  'Active sports participation rate',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.7 + RANDOM() * 0.3,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'sport', 'major_events',
  2 + RANDOM() * 10, -- 2-12 events annually
  'Major sporting events annually',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.8 + RANDOM() * 0.2,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
-- ENTERTAINMENT: Arts, culture, nightlife
SELECT
  cities_to_seed.slug, 'entertainment', 'event_frequency',
  50 + RANDOM() * 200, -- 50-250 events/month
  'Cultural events monthly',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.75 + RANDOM() * 0.25,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'entertainment', 'venue_count',
  30 + RANDOM() * 300, -- 30-330 venues
  'Theaters, museums, concert halls',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.8 + RANDOM() * 0.2,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'entertainment', 'nightlife_score',
  5 + RANDOM() * 4.5, -- 5-9.5 scale
  'Nightlife energy and variety',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.7 + RANDOM() * 0.3,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
-- FASHION: Fashion scene & retail
SELECT
  cities_to_seed.slug, 'fashion', 'designer_brands',
  10 + RANDOM() * 100, -- 10-110 brands
  'Major fashion brands present',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.75 + RANDOM() * 0.25,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'fashion', 'fashion_events',
  1 + RANDOM() * 8, -- 1-9 major events
  'Major fashion events annually',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.7 + RANDOM() * 0.3,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'fashion', 'style_influence',
  5 + RANDOM() * 4, -- 5-9 scale
  'Fashion influence & trendiness',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.7 + RANDOM() * 0.3,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
-- FOOD: Dining & culinary scene
SELECT
  cities_to_seed.slug, 'food', 'restaurant_count',
  100 + RANDOM() * 2000, -- 100-2100 restaurants
  'Restaurants and dining venues',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.8 + RANDOM() * 0.2,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'food', 'michelin_stars',
  0 + RANDOM() * 50, -- 0-50 stars total
  'Michelin-starred restaurants',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.85 + RANDOM() * 0.15,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'food', 'culinary_diversity',
  6 + RANDOM() * 3.5, -- 6-9.5 scale
  'Culinary diversity score',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.75 + RANDOM() * 0.25,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
-- HEALTH: Healthcare & wellness
SELECT
  cities_to_seed.slug, 'health', 'hospital_quality',
  6 + RANDOM() * 3, -- 6-9 scale
  'Hospital quality rating',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.8 + RANDOM() * 0.2,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'health', 'air_quality_index',
  30 + RANDOM() * 150, -- AQI 30-180
  'Air Quality Index',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.85 + RANDOM() * 0.15,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'health', 'wellness_index',
  6 + RANDOM() * 3.5, -- 6-9.5 scale
  'Overall wellness & fitness',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.75 + RANDOM() * 0.25,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
-- TRANSPORT: Public transit & mobility
SELECT
  cities_to_seed.slug, 'transport', 'transit_quality',
  5 + RANDOM() * 4, -- 5-9 scale
  'Public transit quality',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.75 + RANDOM() * 0.25,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'transport', 'bike_share_bikes',
  0 + RANDOM() * 5000, -- 0-5000 bikes
  'Bike share system size',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.8 + RANDOM() * 0.2,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
UNION ALL
SELECT
  cities_to_seed.slug, 'transport', 'congestion_level',
  2 + RANDOM() * 8, -- 2-10 congestion
  'Traffic congestion level',
  'seed',
  '/observations/' || cities_to_seed.slug,
  0.7 + RANDOM() * 0.3,
  NOW() - (RANDOM() * INTERVAL '72 hours')
FROM cities_to_seed
ON CONFLICT DO NOTHING;

-- Verify seed count
SELECT COUNT(*) as total_readings FROM readings WHERE source = 'seed';
