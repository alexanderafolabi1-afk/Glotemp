-- City news: a scope column, a 72-hour horizon, and a purge that makes
-- "nothing older than 72 hours" true even when the refresh job is down.
--
-- WHY THE PURGE EXISTS
-- The refresh job already deletes and replaces a city's rows each time
-- it reaches that city. But it reaches each city on a rotation, and it
-- deliberately does NOT delete when GDELT fails to answer -- a failed
-- call must not erase a city's last good headlines. Both of those are
-- correct, and together they mean rows can outlive the window if the
-- job stalls: the section would then show a real headline with a real
-- date from four days ago, which is exactly the "news is stale"
-- complaint.
--
-- So the horizon is enforced in three independent places, and all three
-- have to fail before anything stale reaches a reader:
--   1. the fetch asks GDELT for timespan=3d
--   2. the client queries published_at >= now() - 72h
--   3. this job deletes anything past 72h, hourly, whatever else happens
-- Belt, braces, and a second pair of braces, because the failure mode
-- here is silent and the reader cannot tell a stale headline from a
-- fresh one without reading the date.

alter table city_news
  add column if not exists scope text not null default 'local'
  check (scope in ('local', 'global'));

comment on column city_news.scope is
  'local = the city''s own outlets and stories naming the city. global = wider stories reaching this city, found by querying its country. Both are real fetched articles; neither is generated.';

-- The client orders by published_at desc within a scope, and filters on
-- the 72-hour window, so this is the index that query actually wants.
create index if not exists idx_city_news_city_scope_published
  on city_news (city_slug, scope, published_at desc nulls last);

-- A row with no publication date cannot be shown to be fresh, so it
-- cannot be shown at all. Dropping them here keeps them from
-- accumulating invisibly.
create or replace function purge_stale_city_news()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from city_news
  where published_at is null
     or published_at < now() - interval '72 hours';
  get diagnostics removed = row_count;
  if removed > 0 then
    raise notice 'purge_stale_city_news: removed % row(s)', removed;
  end if;
  return removed;
end;
$$;

comment on function purge_stale_city_news() is
  'Deletes city_news rows older than 72 hours, or with no publication date. Runs hourly so a stalled refresh job cannot leave stale headlines on a city page.';

revoke all on function purge_stale_city_news() from public;

-- Hourly, at :47 -- clear of city-news-refresh (*/5), wiki-attention
-- (:12/:42) and the other scheduled jobs, per the spacing convention
-- the other schedule migrations in this directory follow.
do $$
begin
  if to_regclass('cron.job') is null then
    raise notice 'pg_cron not installed: purge not scheduled';
    return;
  end if;
  perform cron.unschedule('city-news-purge-stale')
    where exists (select 1 from cron.job where jobname = 'city-news-purge-stale');
  perform cron.schedule(
    'city-news-purge-stale',
    '47 * * * *',
    $cron$ select purge_stale_city_news(); $cron$
  );
end;
$$;

-- One immediate pass, so deploying this fixes today's stale rows rather
-- than waiting for the next :47.
select purge_stale_city_news();
