# Complete Deployment Guide for Glotemp Edge Functions & Seed Data

Follow these exact steps. Copy-paste commands as written.

---

## Part 1: Install Supabase CLI

### Step 1.1 — Install Node.js (if you don't have it)
Check if you have Node.js:
```bash
node --version
```

If this returns a version number (like `v18.0.0`), skip to Step 1.2.

If it says "command not found", install Node.js:
- Go to https://nodejs.org/
- Download LTS version
- Install it
- Verify: `node --version`

### Step 1.2 — Install Supabase CLI
```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

This should print a version number like `1.173.0` or higher.

---

## Part 2: Link Your Supabase Project

### Step 2.1 — Authenticate with Supabase
```bash
supabase login
```

This will open a browser tab asking you to log in to Supabase. Do it.

### Step 2.2 — Link to your project
From the Glotemp repository directory, run:
```bash
supabase link --project-ref hnysztednzqfzbmiqqgl
```

It will ask: "Do you want to proceed?" 

Type `y` and press Enter.

---

## Part 3: Deploy All 12 Edge Functions

Each function is deployed individually. Copy-paste each command exactly:

### Step 3.1 — Deploy Pulse (Sentiment)
```bash
supabase functions deploy gdelt-sentiment
```

Wait for it to complete (you'll see `✓ Function deployed successfully`).

### Step 3.2 — Deploy Tech
```bash
supabase functions deploy github-tech-activity
```

### Step 3.3 — Deploy Finance
```bash
supabase functions deploy world-bank-finance
```

### Step 3.4 — Deploy Work
```bash
supabase functions deploy remotive-work-data
```

### Step 3.5 — Deploy Education
```bash
supabase functions deploy hipolabs-education
```

### Step 3.6 — Deploy Sport
```bash
supabase functions deploy sportsdb-sport
```

### Step 3.7 — Deploy Entertainment
```bash
supabase functions deploy ticketmaster-entertainment
```

### Step 3.8 — Deploy Health
```bash
supabase functions deploy waqi-health
```

### Step 3.9 — Deploy Transport
```bash
supabase functions deploy transitland-transport
```

### Step 3.10 — Deploy Property
```bash
supabase functions deploy overpass-property
```

### Step 3.11 — Deploy Fashion
```bash
supabase functions deploy gdelt-fashion
```

### Step 3.12 — Deploy Food
```bash
supabase functions deploy overpass-food
```

**All 12 functions are now deployed.** ✅

---

## Part 4: Run the Seed Data Script

### Step 4.1 — Open Supabase Dashboard
Go to: https://app.supabase.com

Select your project: `Glotemp` (or the one with ID starting with `hnysztednzqfzbmiqqgl`)

### Step 4.2 — Open SQL Editor
In the left sidebar, click: **SQL Editor**

### Step 4.3 — Create New Query
Click the blue **+ New** button

### Step 4.4 — Paste the Seed Script
Copy the entire contents of: `/home/user/Glotemp/supabase-seed-all-verticals.sql`

Paste it into the SQL editor (the white text area).

### Step 4.5 — Run the Query
Click the blue **Run** button (or press `Ctrl+Enter`).

**Wait 30-60 seconds for the query to complete.**

You should see output at the bottom that says:
```
Successfully inserted 600+ rows
```

---

## Part 5: Trigger All Edge Functions

### Step 5.1 — Open Supabase Dashboard
Go to: https://app.supabase.com/project/hnysztednzqfzbmiqqgl/functions

### Step 5.2 — Trigger Each Function

**For each function listed below:**

1. Click the function name
2. Click the **Execute** button (or tab "Invocations")
3. Click **Send Request**
4. Wait 5-10 seconds for result

**Functions to trigger (in order):**
- gdelt-sentiment
- github-tech-activity
- world-bank-finance
- remotive-work-data
- hipolabs-education
- sportsdb-sport
- ticketmaster-entertainment
- waqi-health
- transitland-transport
- overpass-property
- gdelt-fashion
- overpass-food

Each should return:
```json
{
  "success": true,
  "cities": 15
}
```

(The city count varies per function, but "success": true means it worked.)

---

## Part 6: Verification Queries

### Step 6.1 — Open SQL Editor Again
https://app.supabase.com/project/hnysztednzqfzbmiqqgl/editor

Click **+ New** for a new query.

### Step 6.2 — Run Verification Query #1: Seed Data Count

Paste this:
```sql
SELECT COUNT(*) as total_seed_readings 
FROM readings 
WHERE source = 'seed';
```

Click **Run**.

**Expected output:** A single number like `600` or `630` (600+ rows)

**Success:** If you see a number ≥ 600

---

### Step 6.3 — Run Verification Query #2: Real Data by Vertical

Paste this (new query):
```sql
SELECT 
  vertical, 
  COUNT(*) as reading_count, 
  COUNT(DISTINCT city_slug) as city_count,
  ROUND(AVG(confidence), 2) as avg_confidence,
  MAX(fetched_at) as latest_fetch
FROM readings
WHERE source != 'seed'
GROUP BY vertical
ORDER BY reading_count DESC;
```

Click **Run**.

**Expected output:** A table showing each vertical with row counts and confidence scores

**Success criteria:**
- All 12 verticals appear in the results
- `reading_count` > 0 for each vertical
- `avg_confidence` is between 0.5 and 1.0
- `latest_fetch` is today's date/time

**Example output:**
```
vertical        reading_count  city_count  avg_confidence  latest_fetch
pulse           20             20          0.82            2026-08-07 14:32:00
tech            10             10          0.75            2026-08-07 14:28:00
finance         20             20          0.85            2026-08-07 14:25:00
...
```

---

### Step 6.4 — Run Verification Query #3: Cities with Complete Coverage

Paste this (new query):
```sql
SELECT 
  city_slug, 
  COUNT(DISTINCT vertical) as vertical_count
FROM readings
GROUP BY city_slug
HAVING COUNT(DISTINCT vertical) = 12
ORDER BY city_slug;
```

Click **Run**.

**Expected output:** Cities that have data across all 12 verticals

**Success criteria:**
- At least 10-15 cities appear (showing complete 12-vertical coverage)
- Each shows `vertical_count` = 12

**Example output:**
```
city_slug       vertical_count
bangkok         12
berlin          12
delhi           12
dubai           12
...
```

---

### Step 6.5 — Run Verification Query #4: Data Quality Check

Paste this (new query):
```sql
SELECT 
  source,
  COUNT(*) as total_readings,
  ROUND(AVG(confidence), 2) as avg_confidence,
  MIN(confidence) as min_confidence,
  MAX(confidence) as max_confidence
FROM readings
GROUP BY source
ORDER BY total_readings DESC;
```

Click **Run**.

**Expected output:** Breakdown by data source showing confidence distribution

**Success criteria:**
- `seed` source has 600+ readings
- Other sources (gdelt_sentiment, github_activity, etc.) each have 10-20 readings
- Confidence scores are 0.5 or higher
- No NULL values in confidence

---

## Part 7: What Success Looks Like

After all steps complete, you should have:

✅ **12 edge functions deployed** to Supabase

✅ **600+ seed rows** inserted into the readings table

✅ **Real data** fetched from 12 different APIs (GDELT, GitHub, World Bank, etc.)

✅ **All 12 verticals** have readings:
- Pulse (sentiment from news)
- Tech (developer activity from GitHub)
- Finance (inflation & COL from World Bank)
- Work (remote job data from Remotive)
- Education (universities from Hipolabs)
- Sport (sports data from TheSportsDB)
- Entertainment (events from Ticketmaster)
- Health (air quality from WAQI)
- Transport (transit data from Transitland)
- Property (housing from Overpass/OSM)
- Fashion (brand mentions from GDELT)
- Food (restaurants from Overpass/OSM)

✅ **Multiple cities** (15-20 per vertical) have observation data

---

## Part 8: Reporting Back

After completing all steps, run these queries one more time and copy the **complete output** (tables included):

1. Query #2 (Real Data by Vertical) - Copy the entire table
2. Query #4 (Data Quality Check) - Copy the entire table

Paste these results back to me. I'll use them to know:
- Which verticals have strong real data (high confidence)
- Which have synthetic fallback data (lower confidence)
- Total coverage across all cities
- Data freshness timestamps

---

## Troubleshooting

### "supabase command not found"
- You need to restart your terminal after installing the CLI
- Close your terminal completely, open a new one, try again

### "Authentication failed"
- Run `supabase logout` then `supabase login` again
- Make sure you're using the correct Supabase account

### "Function deployment failed"
- Check the error message in the terminal
- The most common issue is file not found - make sure you're in the `/home/user/Glotemp` directory
- Run `ls supabase/functions/` to verify all 12 function folders exist

### SQL Query fails with "permission denied"
- You need to be authenticated as the project owner
- Go to Supabase Dashboard and make sure you're on the right project
- Try logging out and logging back in: `supabase logout && supabase login`

### Queries return 0 rows
- The seed script may not have run yet, or functions haven't executed
- Wait 2-3 minutes after triggering functions for data to appear
- Refresh the dashboard page
- Re-run the verification queries

### "Relations does not exist: readings"
- This means the database schema hasn't been created yet
- Run the schema migration first: `supabase-verticals-schema.sql`
- Go to SQL Editor → New → Paste schema file → Run

---

## Next: Tell Me Results

Once you complete all verification queries, copy the output and I'll:
1. Analyze which verticals returned real vs. synthetic data
2. Build the remaining 9 frontend pages
3. Create dynamic city profiles for all 150 cities
4. Generate sitemap.xml
5. Integrate everything and commit to the branch
