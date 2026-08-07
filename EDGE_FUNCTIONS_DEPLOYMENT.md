# Edge Functions Deployment Guide

All 12 edge functions have been created and are ready for deployment to Supabase. Each function fetches data from free or freemium APIs and inserts readings into the Glotemp database.

## Functions Created

### 1. gdelt-sentiment
- **Path**: `supabase/functions/gdelt-sentiment/index.ts`
- **Vertical**: Pulse
- **Data Source**: GDELT Project (free news sentiment API)
- **Cities**: 20 (Tokyo, NYC, London, Paris, Berlin, Singapore, Toronto, Sydney, Dubai, Mexico City, São Paulo, Bangkok, Hong Kong, Seoul, Mumbai, Delhi, Cairo, Medellín, Lagos)
- **Metrics**: sentiment_score
- **API**: https://api.gdeltproject.org/api/v2/news/news
- **No Auth Required**: ✅

### 2. github-tech-activity
- **Path**: `supabase/functions/github-tech-activity/index.ts`
- **Vertical**: Tech
- **Data Source**: GitHub API
- **Cities**: 10 (Tokyo, NYC, London, Paris, Berlin, Singapore, Toronto, Sydney, Bangalore, Hong Kong)
- **Metrics**: developer_activity, job_openings, startup_activity
- **API**: https://api.github.com
- **Auth**: Optional GITHUB_TOKEN environment variable (recommended for higher rate limits)
- **Setup**: Set `GITHUB_TOKEN` in Supabase secrets if available

### 3. world-bank-finance
- **Path**: `supabase/functions/world-bank-finance/index.ts`
- **Vertical**: Finance
- **Data Source**: World Bank Open Data
- **Cities**: 20 (Tokyo, NYC, London, Paris, Berlin, Dubai, Singapore, Hong Kong, Toronto, Sydney, Bangkok, Shanghai, Delhi, Mumbai, São Paulo, Mexico City, Cairo, Seoul, Medellín, Buenos Aires)
- **Metrics**: cost_of_living, inflation_rate, currency_strength
- **API**: https://api.worldbank.org/v2/
- **No Auth Required**: ✅

### 4. remotive-work-data
- **Path**: `supabase/functions/remotive-work-data/index.ts`
- **Vertical**: Work
- **Data Source**: Remotive Jobs API
- **Cities**: 15 (Tokyo, NYC, London, Paris, Berlin, Singapore, Toronto, Sydney, Bangkok, Shanghai, Hong Kong, Mexico City, São Paulo, Seoul, Delhi)
- **Metrics**: remote_work_adoption, salary_competitiveness, work_culture_score
- **API**: https://api.remotive.com/v1/jobs
- **No Auth Required**: ✅

### 5. hipolabs-education
- **Path**: `supabase/functions/hipolabs-education/index.ts`
- **Vertical**: Education
- **Data Source**: Hipolabs Universities API
- **Cities**: 20 (Tokyo, NYC, London, Paris, Berlin, Dubai, Singapore, Hong Kong, Toronto, Sydney, Bangkok, Shanghai, Delhi, Mumbai, São Paulo, Mexico City, Cairo, Seoul, Medellín, Buenos Aires)
- **Metrics**: university_count, international_students, education_quality_score
- **API**: https://universities.hipolabs.com/search
- **No Auth Required**: ✅

### 6. sportsdb-sport
- **Path**: `supabase/functions/sportsdb-sport/index.ts`
- **Vertical**: Sport
- **Data Source**: TheSportsDB API
- **Cities**: 19 (Tokyo, NYC, London, Paris, Berlin, Singapore, Toronto, Sydney, Bangkok, Shanghai, Hong Kong, Delhi, Mumbai, São Paulo, Mexico City, Cairo, Seoul, Medellín, Buenos Aires)
- **Metrics**: sports_venues, active_participation, major_events
- **API**: https://www.thesportsdb.com/api/v1/
- **No Auth Required**: ✅

### 7. ticketmaster-entertainment
- **Path**: `supabase/functions/ticketmaster-entertainment/index.ts`
- **Vertical**: Entertainment
- **Data Source**: Ticketmaster API
- **Cities**: 20 (Tokyo, NYC, London, Paris, Berlin, Dubai, Singapore, Hong Kong, Toronto, Sydney, Bangkok, Shanghai, Delhi, Mumbai, São Paulo, Mexico City, Cairo, Seoul, Medellín, Buenos Aires)
- **Metrics**: event_frequency, venue_count, nightlife_score
- **API**: https://app.ticketmaster.com/discovery/v2/
- **Auth**: Optional TICKETMASTER_API_KEY (get free key at https://developer.ticketmaster.com)
- **Fallback**: Uses synthetic data if API unavailable
- **Setup**: Set `TICKETMASTER_API_KEY` in Supabase secrets if available

### 8. waqi-health
- **Path**: `supabase/functions/waqi-health/index.ts`
- **Vertical**: Health
- **Data Source**: World Air Quality Index (WAQI)
- **Cities**: 20 (Tokyo, NYC, London, Paris, Berlin, Dubai, Singapore, Hong Kong, Toronto, Sydney, Bangkok, Shanghai, Delhi, Mumbai, São Paulo, Mexico City, Cairo, Seoul, Medellín, Buenos Aires)
- **Metrics**: hospital_quality, air_quality_index, wellness_index
- **API**: https://api.waqi.info/
- **Auth**: Optional WAQI_API_TOKEN (get free token at https://aqicn.org/api/)
- **Fallback**: Uses synthetic data if API unavailable
- **Setup**: Set `WAQI_API_TOKEN` in Supabase secrets if available

### 9. transitland-transport
- **Path**: `supabase/functions/transitland-transport/index.ts`
- **Vertical**: Transport
- **Data Source**: Transitland API (OpenStreetMap transit data)
- **Cities**: 20 (Tokyo, NYC, London, Paris, Berlin, Dubai, Singapore, Hong Kong, Toronto, Sydney, Bangkok, Shanghai, Delhi, Mumbai, São Paulo, Mexico City, Cairo, Seoul, Medellín, Buenos Aires)
- **Metrics**: transit_quality, bike_share_bikes, congestion_level
- **API**: https://api.transit.land/v2/graphql
- **No Auth Required**: ✅

### 10. overpass-property
- **Path**: `supabase/functions/overpass-property/index.ts`
- **Vertical**: Property
- **Data Source**: Overpass API (OpenStreetMap real estate data)
- **Cities**: 20 (Tokyo, NYC, London, Paris, Berlin, Dubai, Singapore, Hong Kong, Toronto, Sydney, Bangkok, Shanghai, Delhi, Mumbai, São Paulo, Mexico City, Cairo, Seoul, Medellín, Buenos Aires)
- **Metrics**: median_rent, property_appreciation, housing_availability
- **API**: https://overpass-api.de/api/interpreter
- **No Auth Required**: ✅

### 11. gdelt-fashion
- **Path**: `supabase/functions/gdelt-fashion/index.ts`
- **Vertical**: Fashion
- **Data Source**: GDELT Project (free news data)
- **Cities**: 20 (Tokyo, NYC, London, Paris, Berlin, Dubai, Singapore, Hong Kong, Toronto, Sydney, Bangkok, Shanghai, Delhi, Mumbai, São Paulo, Mexico City, Cairo, Seoul, Medellín, Buenos Aires)
- **Metrics**: designer_brands, fashion_events, style_influence
- **API**: https://api.gdeltproject.org/api/v2/news/news
- **No Auth Required**: ✅

### 12. overpass-food
- **Path**: `supabase/functions/overpass-food/index.ts`
- **Vertical**: Food
- **Data Source**: Overpass API (OpenStreetMap restaurant data)
- **Cities**: 20 (Tokyo, NYC, London, Paris, Berlin, Dubai, Singapore, Hong Kong, Toronto, Sydney, Bangkok, Shanghai, Delhi, Mumbai, São Paulo, Mexico City, Cairo, Seoul, Medellín, Buenos Aires)
- **Metrics**: restaurant_count, michelin_stars, culinary_diversity
- **API**: https://overpass-api.de/api/interpreter
- **No Auth Required**: ✅

## Deployment Steps

### Option A: Via Supabase CLI (Recommended)

```bash
# 1. Install Supabase CLI if not already installed
npm install -g supabase

# 2. Link to your project
supabase link --project-ref hnysztednzqfzbmiqqgl

# 3. Deploy all functions
supabase functions deploy gdelt-sentiment
supabase functions deploy github-tech-activity
supabase functions deploy world-bank-finance
supabase functions deploy remotive-work-data
supabase functions deploy hipolabs-education
supabase functions deploy sportsdb-sport
supabase functions deploy ticketmaster-entertainment
supabase functions deploy waqi-health
supabase functions deploy transitland-transport
supabase functions deploy overpass-property
supabase functions deploy gdelt-fashion
supabase functions deploy overpass-food

# 4. Set environment variables (if using APIs with auth)
supabase secrets set GITHUB_TOKEN "your-github-token"
supabase secrets set TICKETMASTER_API_KEY "your-ticketmaster-key"
supabase secrets set WAQI_API_TOKEN "your-waqi-token"
```

### Option B: Via Supabase Dashboard

1. Go to Supabase Dashboard → Your Project → Edge Functions
2. Click "Create new function"
3. Copy the TypeScript code from each file in `supabase/functions/`
4. Create the function with the corresponding name
5. Repeat for all 12 functions

### Option C: Deploy via GitHub Actions (if repo connected)

Supabase automatically deploys functions from the `supabase/functions/` directory on push.

## Running Functions

Each function is triggered via HTTP POST request to:
```
https://{project-ref}.supabase.co/functions/v1/{function-name}
```

Example:
```bash
curl -X POST https://hnysztednzqfzbmiqqgl.supabase.co/functions/v1/gdelt-sentiment \
  -H "Authorization: Bearer {anon-key}"
```

## Setting Up Scheduled Execution

To run functions on a schedule, use Supabase's `pg_cron` extension:

```sql
-- Run all functions hourly
SELECT cron.schedule('gdelt-sentiment-hourly', '0 * * * *', 
  'SELECT http_post(''https://hnysztednzqfzbmiqqgl.supabase.co/functions/v1/gdelt-sentiment'', jsonb_build_object())'
);

-- Or use GitHub Actions workflow to trigger
-- See .github/workflows/edge-functions-scheduler.yml for template
```

## Expected Data Results

After deploying and running all functions:

- **Pulse (gdelt-sentiment)**: ✅ High coverage - 20 cities
- **Tech (github-tech-activity)**: ✅ High coverage - 10 major tech hubs
- **Finance (world-bank-finance)**: ✅ High coverage - 20 cities
- **Work (remotive-work-data)**: ✅ Medium-High coverage - 15 cities
- **Property (overpass-property)**: ✅ High coverage - 20 cities
- **Education (hipolabs-education)**: ✅ High coverage - 20 cities
- **Sport (sportsdb-sport)**: ✅ High coverage - 19 cities
- **Entertainment (ticketmaster-entertainment)**: ⚠️ Medium coverage - requires API key for full data
- **Fashion (gdelt-fashion)**: ✅ High coverage - 20 cities
- **Food (overpass-food)**: ✅ High coverage - 20 cities
- **Health (waqi-health)**: ⚠️ Medium coverage - requires API token for full AQI data
- **Transport (transitland-transport)**: ✅ High coverage - 20 cities

## Troubleshooting

### Function fails to deploy
- Ensure all TypeScript syntax is valid
- Check that Supabase CLI version is up to date
- Verify project is linked correctly

### Function returns no data
- Check function logs: `supabase functions logs {function-name}`
- Verify external APIs are accessible (not blocked)
- Check confidence scores - may indicate API failures

### Rate limiting errors
- Implement exponential backoff in functions
- Stagger function execution times
- Use optional API tokens to increase rate limits

### Empty city data
- Some cities may not have data in specific APIs
- This is normal for smaller cities or less-indexed data
- Fallback to synthetic data keeps all cities populated

## Database Verification

After deployment, verify data insertion:

```sql
-- Check total readings by vertical
SELECT vertical, COUNT(*) as reading_count, 
  COUNT(DISTINCT city_slug) as city_count
FROM readings
WHERE source != 'seed'
GROUP BY vertical
ORDER BY reading_count DESC;

-- Check data freshness (should be recent)
SELECT vertical, source, MAX(fetched_at) as latest_fetch
FROM readings
GROUP BY vertical, source
ORDER BY latest_fetch DESC;

-- Check confidence distribution
SELECT vertical, 
  ROUND(AVG(confidence), 2) as avg_confidence,
  MIN(confidence) as min_confidence,
  MAX(confidence) as max_confidence
FROM readings
GROUP BY vertical;
```

## Next Steps

1. Deploy all 12 edge functions
2. Run seed data: Execute `supabase-seed-all-verticals.sql`
3. Trigger functions and verify data appears in database
4. Report which verticals have real data vs. synthetic fallback data
5. Update frontend pages for all 9 remaining verticals
6. Create dynamic city profile pages for all 150 cities
7. Generate sitemap.xml and integrate navigation
