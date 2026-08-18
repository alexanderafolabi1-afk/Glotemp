-- Attention layer: two free, keyless Wikimedia sources.
--
-- city_points previously had no name/country/wikipedia_title -- the
-- Wikipedia integration (city-wiki.js) has always derived the article
-- title client-side, per page load, guessing cityName then
-- "cityName, country" as a fallback, and never persisted it anywhere.
-- There was no stored title to reuse. Backfilled name/country from
-- cities-data.js in the prior migration; wikipedia_title is resolved
-- and cached here by wiki-attention's own first run per city (via the
-- REST summary endpoint's canonical title), so every run after that
-- genuinely does reuse a stored title rather than re-deriving it.

-- ===== CITY_PAGEVIEWS =====
-- Daily, append-only. One row per (city, date), never overwritten after
-- the day closes -- a sparkline needs real history, not the latest
-- snapshot standing in for a trend.
create table if not exists city_pageviews (
  city_slug text not null references city_points(city_slug) on delete cascade,
  date date not null,
  views bigint not null,
  fetched_at timestamptz not null default now(),
  primary key (city_slug, date)
);

create index if not exists idx_city_pageviews_slug_date on city_pageviews(city_slug, date desc);

alter table city_pageviews enable row level security;
drop policy if exists "city_pageviews_select_all" on city_pageviews;
create policy "city_pageviews_select_all" on city_pageviews for select using (true);
grant select on city_pageviews to anon, authenticated;

-- ===== CITY_EDIT_ACTIVITY =====
-- One row per check, per city -- a rolling log, not a single mutable
-- "current status" row, so a spike's actual shape (built up over how
-- many checks, how fast it decayed) stays inspectable afterward.
create table if not exists city_edit_activity (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null references city_points(city_slug) on delete cascade,
  checked_at timestamptz not null default now(),
  revisions_1h int not null,
  baseline_avg numeric not null,
  is_spike boolean not null
);

create index if not exists idx_city_edit_activity_slug_time on city_edit_activity(city_slug, checked_at desc);
-- The "currently spiking" board reads this shape constantly: latest row
-- per city where is_spike is true. A partial index on exactly that
-- predicate keeps that query cheap without a full table scan as the log
-- grows.
create index if not exists idx_city_edit_activity_spikes on city_edit_activity(checked_at desc) where is_spike;

alter table city_edit_activity enable row level security;
drop policy if exists "city_edit_activity_select_all" on city_edit_activity;
create policy "city_edit_activity_select_all" on city_edit_activity for select using (true);
grant select on city_edit_activity to anon, authenticated;
