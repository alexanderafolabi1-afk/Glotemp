# Phase 3: Edge Functions for Automated Data Fetching

After Phase 2 (data seeding), Phase 3 automates continuous data fetching from external APIs and populates the `readings` table via Supabase Edge Functions.

## Overview

Edge Functions run serverless code on Supabase's infrastructure. They will:
- Fetch data from APIs (GitHub, World Bank, GDELT, Frankfurter)
- Transform and validate data
- Insert into `readings` table
- Run on schedules (hourly, daily, 6-hourly)

## Architecture

```
┌─────────────────────────────────────────┐
│       Supabase Edge Functions           │
├─────────────────────────────────────────┤
│  1. GitHub Activity Fetcher (Hourly)    │
│  2. World Bank Data Fetcher (Daily)     │
│  3. GDELT Sentiment Fetcher (6-hourly)  │
│  4. FX Rates Fetcher (Hourly)           │
└─────────────────────────────────────────┘
         ↓ (all write to)
┌─────────────────────────────────────────┐
│   Supabase Postgres (readings table)    │
└─────────────────────────────────────────┘
         ↓ (read by)
┌─────────────────────────────────────────┐
│  Frontend (verticals-engine.js)         │
│  Fetches latest_readings view           │
└─────────────────────────────────────────┘
```

## Edge Function Templates

### 1. GitHub Activity Fetcher

**Purpose:** Fetch GitHub activity by city
**Schedule:** Hourly
**Source:** GitHub API
**Metrics:** Pull requests, commits, repository activity

```typescript
// functions/github-activity-fetcher/index.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const githubToken = Deno.env.get('GITHUB_TOKEN')!;

// City slug to GitHub location query mapping
const cityMap = {
  'san-francisco': 'San Francisco',
  'new-york': 'New York',
  'london': 'London',
  'berlin': 'Berlin',
  'singapore': 'Singapore',
  'tokyo': 'Tokyo',
  'toronto': 'Toronto',
  'austin': 'Austin',
  'sao-paulo': 'São Paulo',
  'bangalore': 'Bangalore',
};

async function fetchGitHubActivity(city: string, location: string) {
  const query = `location:"${location}" created:>${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`;
  
  const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=100`, {
    headers: { 'Authorization': `token ${githubToken}` }
  });
  
  const data = await response.json();
  
  // Insert aggregated metrics
  await supabase.from('readings').insert({
    city_slug: city,
    vertical: 'tech',
    metric: 'github_activity_prs',
    value: data.total_count, // Approximation; real implementation would aggregate PRs
    label: 'GitHub PRs/week',
    source: 'github_activity',
    source_url: 'https://github.com/search',
    confidence: 0.85,
    fetched_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  try {
    for (const [city, location] of Object.entries(cityMap)) {
      await fetchGitHubActivity(city, location);
    }
    return new Response(JSON.stringify({ success: true, cities: Object.keys(cityMap).length }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

**Setup:**
```bash
# Create function
supabase functions new github-activity-fetcher

# Set environment variables in Supabase dashboard
# GITHUB_TOKEN = your GitHub personal access token
# SUPABASE_URL = your project URL
# SUPABASE_SERVICE_ROLE_KEY = service role key

# Deploy
supabase functions deploy github-activity-fetcher

# Schedule hourly
# Use Supabase Cron Extension or external scheduler (e.g., GitHub Actions, AWS EventBridge)
```

---

### 2. World Bank Data Fetcher

**Purpose:** Fetch economic indicators
**Schedule:** Daily
**Source:** World Bank Open Data API
**Metrics:** GDP, inflation, economic growth

```typescript
// functions/world-bank-fetcher/index.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Country code mapping
const countryMap = {
  'san-francisco': 'US',
  'new-york': 'US',
  'london': 'GB',
  'berlin': 'DE',
  'singapore': 'SG',
  'tokyo': 'JP',
  'toronto': 'CA',
  'austin': 'US',
  'sao-paulo': 'BR',
  'bangalore': 'IN',
};

// Indicator codes
const indicators = {
  'inflation_rate': 'FP.CPI.TOTL.ZG',      // Inflation (annual %)
  'gdp_growth': 'NY.GDP.MKTP.KD.ZG',       // GDP growth (annual %)
};

async function fetchIndicator(city: string, country: string, indicatorKey: string, indicatorCode: string) {
  const response = await fetch(
    `https://api.worldbank.org/v2/country/${country}/indicator/${indicatorCode}?format=json&per_page=1`
  );
  
  const data = await response.json();
  const latestValue = data[1]?.[0]?.value;
  
  if (latestValue) {
    await supabase.from('readings').insert({
      city_slug: city,
      vertical: 'finance',
      metric: indicatorKey,
      value: parseFloat(latestValue),
      label: indicatorKey === 'inflation_rate' ? 'Annual Inflation %' : 'GDP Growth %',
      source: 'world_bank',
      source_url: `https://data.worldbank.org/indicator/${indicatorCode}`,
      confidence: 0.9,
      fetched_at: new Date().toISOString(),
    });
  }
}

Deno.serve(async (req) => {
  try {
    for (const [city, country] of Object.entries(countryMap)) {
      for (const [key, code] of Object.entries(indicators)) {
        await fetchIndicator(city, country, key, code);
      }
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

**Setup:**
```bash
supabase functions new world-bank-fetcher
supabase functions deploy world-bank-fetcher

# No API key needed; World Bank data is public
# Schedule daily via cron
```

---

### 3. GDELT Sentiment Fetcher

**Purpose:** Fetch sentiment analysis from news mentions
**Schedule:** 6-hourly
**Source:** GDELT (Global Database of Events, Language, and Tone)
**Metrics:** Sentiment score, tone

```typescript
// functions/gdelt-sentiment-fetcher/index.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// City keywords for GDELT search
const cityKeywords = {
  'san-francisco': ['San Francisco', 'SF Bay Area', 'Silicon Valley'],
  'new-york': ['New York', 'NYC', 'Manhattan'],
  'london': ['London', 'City of London'],
  'berlin': ['Berlin', 'Brandenburg'],
  'singapore': ['Singapore'],
  'tokyo': ['Tokyo', 'Edo'],
  'toronto': ['Toronto', 'Greater Toronto'],
  'austin': ['Austin', 'Austin Texas'],
  'sao-paulo': ['São Paulo', 'SP Brazil'],
  'bangalore': ['Bangalore', 'Bengaluru'],
};

async function fetchGDELTSentiment(city: string, keywords: string[]) {
  // GDELT API: query news mentions and extract sentiment
  // Simplified version; real implementation would parse GDELT feed
  
  for (const keyword of keywords) {
    const response = await fetch(
      `https://api.gdeltproject.org/api/v2/news/news?query=${encodeURIComponent(keyword)}&maxrecords=100&format=json`
    );
    
    const data = await response.json();
    
    // Calculate average tone from articles
    if (data.articles && data.articles.length > 0) {
      const avgTone = data.articles.reduce((sum, article) => sum + (article.tone || 0), 0) / data.articles.length;
      
      // Convert tone (-100 to +100) to 0-10 scale
      const sentimentScore = (avgTone + 100) / 20;
      
      await supabase.from('readings').insert({
        city_slug: city,
        vertical: 'pulse',
        metric: 'sentiment_score',
        value: sentimentScore,
        label: 'GDELT Sentiment',
        source: 'gdelt_sentiment',
        source_url: 'https://www.gdeltproject.org',
        confidence: 0.7,
        fetched_at: new Date().toISOString(),
      });
      
      break; // Only use first successful keyword
    }
  }
}

Deno.serve(async (req) => {
  try {
    for (const [city, keywords] of Object.entries(cityKeywords)) {
      await fetchGDELTSentiment(city, keywords);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

**Setup:**
```bash
supabase functions new gdelt-sentiment-fetcher
supabase functions deploy gdelt-sentiment-fetcher

# GDELT API is free and public
# Schedule 6-hourly
```

---

### 4. Frankfurter FX Rates Fetcher

**Purpose:** Fetch currency exchange rates
**Schedule:** Hourly (market hours)
**Source:** Frankfurter API
**Metrics:** Currency stability, exchange rates

```typescript
// functions/fx-rates-fetcher/index.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// City to currency mapping
const cityCurrencies = {
  'san-francisco': 'USD',
  'new-york': 'USD',
  'london': 'GBP',
  'berlin': 'EUR',
  'singapore': 'SGD',
  'tokyo': 'JPY',
  'toronto': 'CAD',
  'austin': 'USD',
  'sao-paulo': 'BRL',
  'bangalore': 'INR',
};

async function fetchFXRates(city: string, currency: string) {
  const response = await fetch(`https://api.frankfurter.app/latest?base=${currency}`);
  const data = await response.json();
  
  // Calculate volatility as stability score (inverse of 7-day volatility)
  // Simplified: using static value; real implementation tracks time series
  const stabilityScore = 7.5; // Placeholder
  
  await supabase.from('readings').insert({
    city_slug: city,
    vertical: 'finance',
    metric: 'currency_stability',
    value: stabilityScore,
    label: `${currency} Stability Score`,
    source: 'frankfurter_fx',
    source_url: 'https://www.frankfurter.app',
    confidence: 0.8,
    fetched_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  try {
    for (const [city, currency] of Object.entries(cityCurrencies)) {
      await fetchFXRates(city, currency);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

**Setup:**
```bash
supabase functions new fx-rates-fetcher
supabase functions deploy fx-rates-fetcher

# Frankfurter API is free
# Schedule hourly
```

---

## Scheduling Edge Functions

### Option 1: Supabase Cron Extension

```sql
-- Enable pg_cron extension in Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule GitHub fetcher (hourly)
SELECT cron.schedule('github-activity-hourly', '0 * * * *', 
  'SELECT invoke_function(''github-activity-fetcher'')');

-- Schedule World Bank fetcher (daily at 2 AM UTC)
SELECT cron.schedule('world-bank-daily', '0 2 * * *', 
  'SELECT invoke_function(''world-bank-fetcher'')');

-- Schedule GDELT fetcher (6-hourly)
SELECT cron.schedule('gdelt-sentiment-6h', '0 0,6,12,18 * * *', 
  'SELECT invoke_function(''gdelt-sentiment-fetcher'')');

-- Schedule FX fetcher (hourly, business hours only)
SELECT cron.schedule('fx-rates-hourly', '0 * * * 1-5', 
  'SELECT invoke_function(''fx-rates-fetcher'')');
```

### Option 2: GitHub Actions (Free Alternative)

```yaml
# .github/workflows/fetch-vertical-data.yml
name: Fetch Vertical Data

on:
  schedule:
    - cron: '0 * * * *'  # GitHub activity (hourly)
    - cron: '0 2 * * *'  # World Bank (daily)
    - cron: '0 */6 * * *' # GDELT (6-hourly)

jobs:
  fetch-data:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch GitHub activity
        run: |
          curl -X POST https://<your-project>.supabase.co/functions/v1/github-activity-fetcher \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"

      - name: Fetch World Bank data
        run: |
          curl -X POST https://<your-project>.supabase.co/functions/v1/world-bank-fetcher \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"

      - name: Fetch GDELT sentiment
        run: |
          curl -X POST https://<your-project>.supabase.co/functions/v1/gdelt-sentiment-fetcher \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

---

## Implementation Checklist

### Preparation
- [ ] Review Supabase Edge Functions documentation
- [ ] Verify API access for GitHub, World Bank, GDELT, Frankfurter
- [ ] Set up GitHub token (for GitHub API auth)
- [ ] Plan cron schedule based on API rate limits

### GitHub Activity Fetcher
- [ ] Create `functions/github-activity-fetcher/index.ts`
- [ ] Test locally with `supabase functions serve`
- [ ] Deploy with `supabase functions deploy`
- [ ] Schedule hourly
- [ ] Verify data in `readings` table

### World Bank Fetcher
- [ ] Create `functions/world-bank-fetcher/index.ts`
- [ ] Test locally
- [ ] Deploy
- [ ] Schedule daily
- [ ] Verify data

### GDELT Sentiment Fetcher
- [ ] Create `functions/gdelt-sentiment-fetcher/index.ts`
- [ ] Test locally
- [ ] Deploy
- [ ] Schedule 6-hourly
- [ ] Verify data

### FX Rates Fetcher
- [ ] Create `functions/fx-rates-fetcher/index.ts`
- [ ] Test locally
- [ ] Deploy
- [ ] Schedule hourly (business hours)
- [ ] Verify data

### Monitoring
- [ ] Check Supabase function logs for errors
- [ ] Monitor `readings` table growth
- [ ] Set up alerts for failed invocations
- [ ] Test data appears on `/verticals/pulse`, `/verticals/tech`, `/verticals/finance`

---

## Expected Behavior After Implementation

### Hourly (GitHub + FX)
```
10:00 UTC: GitHub fetcher runs → 10 new readings (github_activity)
10:00 UTC: FX fetcher runs → 10 new readings (forex_stability)
```

### 6-Hourly (GDELT)
```
00:00, 06:00, 12:00, 18:00 UTC: GDELT fetcher runs → up to 10 new readings (sentiment)
```

### Daily (World Bank)
```
02:00 UTC: World Bank fetcher runs → 20 new readings (inflation + gdp_growth)
```

## Data Freshness

| Vertical | Metric | Refresh Rate | Confidence |
|----------|--------|--------------|-----------|
| Pulse | GDELT Sentiment | 6-hourly | 0.7–0.8 |
| Pulse | Pulse Story | Manual | 1.0 |
| Tech | GitHub Activity | Hourly | 0.85–0.9 |
| Tech | Job Postings | Daily | 0.8–0.85 |
| Finance | World Bank | Daily | 0.9 |
| Finance | FX Rates | Hourly | 0.8–0.85 |

---

## Next After Edge Functions

1. **Ranking Algorithm** — Aggregate readings into `vertical_rankings` table
   - Average scores weighted by confidence
   - Calculate momentum (week-over-week change)
   - Publish only if signal_volume > threshold

2. **Dynamic City Profiles** — Render `/cities/<slug>` with all 12 verticals
   - Load from template
   - Fetch vertical data for that city
   - Display in tabs

3. **Remaining 9 Verticals** — Repeat pattern for:
   - Work (LinkedIn, Indeed data)
   - Property & Cost (Zillow, AirBnB data)
   - Education (QS World Rankings)
   - Sport (ESPN, local sports data)
   - Entertainment (Bandsintown, Eventbrite)
   - Fashion (runway data, boutique locations)
   - Food (restaurant reviews, Michelin stars)
   - Health & Environment (air quality, fitness trends)
   - Transport (transit stats, bike share data)

---

🚀 **Ready to implement.** Edge functions enable fully automated, continuously-updated rankings for all verticals.
