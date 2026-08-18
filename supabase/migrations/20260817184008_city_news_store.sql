-- Local press headlines, fetched server-side on a schedule and stored.
-- Replaces the old design where the browser called an edge function that
-- called GDELT live, per page load -- that chain had no client-side
-- timeout, so a slow/stalled GDELT response hung the section forever
-- ("Reading the local press..." with no way out). Reads now come straight
-- off this table: fast, and bounded by a client-side timeout regardless.

create table if not exists city_news (
  id bigint generated always as identity primary key,
  city_slug text not null,
  title text not null,
  url text not null,
  domain text,
  language text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (city_slug, url)
);

create index if not exists idx_city_news_city_published
  on city_news (city_slug, published_at desc nulls last);

alter table city_news enable row level security;

drop policy if exists "City news is publicly readable" on city_news;
create policy "City news is publicly readable" on city_news
  for select to anon, authenticated using (true);

-- No insert/update/delete policy for anon/authenticated: only the
-- scheduled edge function writes, using the service role key, which
-- bypasses RLS entirely.

-- Single-row cursor so the scheduled refresh can rotate through all 300
-- cities in fixed-size batches without needing wall-clock math in the
-- cron expression itself, and without skipping/repeating a city if a run
-- is ever late or missed.
create table if not exists city_news_cursor (
  id smallint primary key default 1,
  batch_index int not null default 0,
  updated_at timestamptz not null default now(),
  constraint city_news_cursor_singleton check (id = 1)
);
insert into city_news_cursor (id, batch_index) values (1, 0)
  on conflict (id) do nothing;

-- Every 5 minutes, hand the function the next batch of cities to refresh.
-- 300 cities / 15 per batch = 20 batches -> a full cycle every ~100
-- minutes, comfortably inside the 48-hour window the section shows.
--
-- The sibling ingestion jobs (gdelt-sentiment-hourly, waqi-health-hourly,
-- etc.) all call net.http_post positionally with a bare text literal
-- ('application/json') in the headers slot, which is not valid jsonb and
-- makes every single one of those jobs fail on every run (confirmed via
-- cron.job_run_details). This job uses named arguments and a real jsonb
-- headers object so it does not repeat that bug.
select cron.schedule(
  'city-news-refresh',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://hnysztednzqfzbmiqqgl.supabase.co/functions/v1/city-news',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 60000
  );
  $$
);
