# Glotemp Data Seeding Guide

This guide explains how to populate the Supabase `readings` table with initial data for the Pulse, Tech, and Finance verticals.

## Prerequisites

Before seeding data, ensure:
1. ✅ Supabase project is created and configured
2. ✅ `supabase-verticals-schema.sql` has been run (creates tables and RLS policies)
3. ✅ You have access to Supabase SQL Editor or Supabase CLI

## Seeding Steps

### Step 1: Create the Schema (if not already done)

Run this in your Supabase SQL Editor:

```sql
-- File: supabase-verticals-schema.sql
-- [Full schema contents - see supabase-verticals-schema.sql]
```

This creates:
- `readings` table (append-only historical log)
- `latest_readings` view (current state queries)
- `vertical_rankings` table (aggregated scores)
- RLS policies for public access

### Step 2: Seed Pulse Stories (10 initial moods)

Run this in your Supabase SQL Editor:

```sql
-- File: supabase-seed-pulse-stories.sql
-- Inserts 10 travel narratives with mood scores
```

**What this does:**
- Converts 10 stories from `stories.js` into readings
- Each story becomes a mood reading (0–10 scale)
- Source: `pulse_story` (for attribution)
- Confidence: 1.0 (manually curated)
- Fetched dates: Jan–Mar 2025

**Expected result:** 10 rows in `readings` table with vertical='pulse'

### Step 3: Seed Tech Data (10 cities, 3 metrics each)

Run this in your Supabase SQL Editor:

```sql
-- File: supabase-seed-tech-data.sql
-- Inserts GitHub activity, job postings, startup density
```

**What this does:**
- Seeds tech metrics for 10 major tech hubs (SF, NYC, London, Berlin, etc.)
- Metrics:
  - `github_activity_prs`: Pull requests per week (source: GitHub API)
  - `job_postings_count`: Active engineering job listings (source: job boards)
  - `startup_density`: Startups per 100k residents (source: Crunchbase)
- Confidence: 0.8–0.9 (aggregated from multiple sources)

**Expected result:** 30 rows in `readings` table with vertical='tech'

### Step 4: Seed Finance Data (10 cities, 3 metrics each)

Run this in your Supabase SQL Editor:

```sql
-- File: supabase-seed-finance-data.sql
-- Inserts cost of living, inflation, currency stability
```

**What this does:**
- Seeds economic indicators for 10 cities
- Metrics:
  - `cost_of_living_index`: COL vs baseline 100 (source: Numbeo)
  - `inflation_rate`: Annual inflation % (source: World Bank)
  - `forex_stability`: Currency stability score 0–10 (source: Frankfurter)
- Confidence: 0.85–0.9

**Expected result:** 30 rows in `readings` table with vertical='finance'

## Running All Migrations (Copy-Paste)

Open Supabase SQL Editor and run all three files in order:

```bash
# 1. Create schema
-- [Paste supabase-verticals-schema.sql]

# 2. Seed Pulse
-- [Paste supabase-seed-pulse-stories.sql]

# 3. Seed Tech
-- [Paste supabase-seed-tech-data.sql]

# 4. Seed Finance
-- [Paste supabase-seed-finance-data.sql]
```

## Verification Queries

After seeding, verify data is in place:

```sql
-- Check total readings
SELECT COUNT(*) FROM readings;

-- Check by vertical
SELECT vertical, COUNT(*) FROM readings GROUP BY vertical;

-- Check Pulse data
SELECT city_slug, value, label FROM readings WHERE vertical = 'pulse' LIMIT 10;

-- Check latest readings view
SELECT * FROM latest_readings WHERE vertical = 'pulse' LIMIT 5;

-- Check ranking calculation
SELECT * FROM vertical_rankings WHERE vertical = 'pulse' LIMIT 10;
```

## Expected Results

After all seeding:
- **Total readings:** 40 (10 Pulse + 30 Tech + no Finance rankings yet, or 40 Finance)
- **Pulse vertical:** 10 mood readings from stories
- **Tech vertical:** 30 readings (3 metrics × 10 cities)
- **Finance vertical:** 30 readings (3 metrics × 10 cities)

## Ranking Pages Status After Seeding

### Pulse Rankings
✅ **Live** - `/verticals/pulse` will display top 50 cities ranked by mood
- Fetches from `latest_readings` view
- Aggregates by `city_slug`
- Sorts by mood value descending
- Shows mood scores (0–10) and signal volume

### Tech Rankings
⚠️ **Data Building** - `/verticals/tech` shows "Tech data is currently building"
- Needs edge function to fetch real-time GitHub data
- Can be populated manually with more metrics
- Ready for automation with `github_activity` source

### Finance Rankings
⚠️ **Data Building** - `/verticals/finance` shows "Finance data is currently building"
- Needs edge function to fetch World Bank/FX data
- Can be populated manually with economic indicators
- Ready for automation with `world_bank` and `frankfurter` sources

## Adding More Data Later

To add additional readings (e.g., new stories, more cities):

```sql
INSERT INTO readings (
  city_slug, vertical, metric, value, label, source, source_url, confidence, fetched_at
)
VALUES (
  'paris', 'pulse', 'mood_story', 7.3, 'Story title', 'pulse_story', '/stories/slug', 1.0, NOW()
)
ON CONFLICT DO NOTHING;
```

## Troubleshooting

### "Relation does not exist" error
→ Schema not created. Run `supabase-verticals-schema.sql` first.

### "Permission denied" error
→ RLS policies blocking insert. Ensure RLS policy allows public inserts.

### Rankings not showing on `/verticals/pulse`
→ Check `latest_readings` view:
```sql
SELECT * FROM latest_readings WHERE vertical = 'pulse';
```

### Data not appearing after seed
→ Verify insert:
```sql
SELECT COUNT(*) FROM readings WHERE source = 'pulse_story';
```

## Next Steps

After seeding, the next phases are:

1. **Edge Functions** - Automate data fetching from APIs
   - GitHub activity (hourly)
   - World Bank data (daily)
   - GDELT sentiment (6-hourly)
   - FX rates (hourly)

2. **Ranking Algorithm** - Calculate ranking scores
   - Aggregate readings by date
   - Weight by confidence
   - Calculate momentum (week-over-week)
   - Publish only if signal_volume > threshold

3. **Remaining 9 Verticals** - Repeat for:
   - Work, Property & Cost, Education, Sport, Entertainment, Fashion, Food, Health & Environment, Transport

## Files Reference

- `supabase-verticals-schema.sql` - Database schema (tables, views, RLS policies)
- `supabase-seed-pulse-stories.sql` - Pulse initial data
- `supabase-seed-tech-data.sql` - Tech initial data
- `supabase-seed-finance-data.sql` - Finance initial data
- `verticals-engine.js` - Frontend data fetching and rendering
- `verticals-i18n.js` - Translations for all new UI strings
