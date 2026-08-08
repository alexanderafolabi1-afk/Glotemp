-- Glotemp: create the `readings` table and repair the broken first migration.
--
-- TWO REPO-LEVEL BUGS ARE FIXED HERE.
--
-- 1. `readings` had no migration at all. Twelve edge functions insert into
--    it and every page on the site reads from it, but nothing in version
--    control ever created it. It exists in the live project only because
--    someone made it by hand, which means any fresh environment (a branch
--    database, a local `supabase start`, a rebuild) comes up without it and
--    every edge function insert fails with 42P01. This adds the table with
--    exactly the shape all twelve functions write.
--
-- 2. 20260807000000_create_city_mood_schema.sql uses `create policy if not
--    exists` (ten times) and `drop trigger if not exists`. Neither is valid
--    PostgreSQL in any version. `supabase db push` runs each migration file
--    in a transaction, so that file raises a syntax error and rolls back
--    ENTIRELY -- reporters, city_comments and city_pulse_cache are never
--    created either, and the migration chain stops there. That file is
--    corrected in place alongside this one; the policies it intended are
--    (re)created idempotently at the bottom of this file so the intent
--    survives regardless of which migration state a given environment is in.

create extension if not exists "pgcrypto";

-- ===== READINGS =====
-- Column set is the union of what all twelve edge functions insert:
--   city_slug, vertical, metric, value, label, source, source_url,
--   confidence, fetched_at
-- `value` is nullable on purpose: the client checks `reading.value !== null`
-- to distinguish "measured nothing" from "measured zero".
create table if not exists readings (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null,
  vertical text not null,
  metric text not null,
  value double precision,
  label text,
  source text not null,
  source_url text,
  confidence double precision check (confidence is null or (confidence >= 0 and confidence <= 1)),
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Indexes match the actual query shapes in the client:
--   ?vertical=eq.X&order=fetched_at.desc
--   ?city_slug=eq.X&vertical=eq.Y&order=fetched_at.desc
--   ?select=source,confidence  (the About page split)
create index if not exists idx_readings_city_vertical_fetched
  on readings(city_slug, vertical, fetched_at desc);
create index if not exists idx_readings_vertical_fetched
  on readings(vertical, fetched_at desc);
create index if not exists idx_readings_fetched_at on readings(fetched_at desc);
create index if not exists idx_readings_source on readings(source);

alter table readings enable row level security;

-- World-readable. Writes come only from edge functions using the service
-- role key, which bypasses RLS -- so there is deliberately no insert
-- policy for anon/authenticated.
drop policy if exists "readings_select_all" on readings;
create policy "readings_select_all" on readings
  for select using (true);

grant select on readings to anon, authenticated;

-- ===== REPAIR OF THE FIRST MIGRATION'S INTENT =====
-- Tables first, in case 20260807000000 aborted before creating them.
create table if not exists reporters (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz default now(),
  last_check_in timestamptz default now(),
  total_contributions int default 0,
  updated_at timestamptz default now()
);

create table if not exists city_comments (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  reporter_id uuid references reporters(id) on delete set null,
  sentiment double precision check (sentiment >= -1 and sentiment <= 1),
  intensity int check (intensity >= 1 and intensity <= 10),
  scene text,
  context text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists city_pulse_cache (
  city text primary key,
  mood_score double precision default 7.0,
  comment_count int default 0,
  sentiment_distribution jsonb default '{"positive":0,"neutral":0,"negative":0}',
  top_scenes jsonb default '{}',
  last_aggregated timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_city_comments_city_created_at on city_comments(city, created_at);

alter table reporters enable row level security;
alter table city_comments enable row level security;
alter table city_pulse_cache enable row level security;

-- drop-then-create: the supported idiom, replacing the invalid
-- `create policy if not exists` the original file used.
drop policy if exists "reporters_select" on reporters;
create policy "reporters_select" on reporters for select using (true);
drop policy if exists "reporters_insert" on reporters;
create policy "reporters_insert" on reporters for insert with check (true);
drop policy if exists "reporters_update" on reporters;
create policy "reporters_update" on reporters for update using (true) with check (true);

drop policy if exists "city_comments_select" on city_comments;
create policy "city_comments_select" on city_comments for select using (true);
drop policy if exists "city_comments_insert" on city_comments;
create policy "city_comments_insert" on city_comments for insert with check (true);
drop policy if exists "city_comments_update" on city_comments;
create policy "city_comments_update" on city_comments for update using (true) with check (true);

drop policy if exists "city_pulse_cache_select" on city_pulse_cache;
create policy "city_pulse_cache_select" on city_pulse_cache for select using (true);
drop policy if exists "city_pulse_cache_insert" on city_pulse_cache;
create policy "city_pulse_cache_insert" on city_pulse_cache for insert with check (true);
drop policy if exists "city_pulse_cache_update" on city_pulse_cache;
create policy "city_pulse_cache_update" on city_pulse_cache for update using (true) with check (true);

grant select, insert on city_comments to anon;
grant select, insert on reporters to anon;
grant select on city_pulse_cache to anon;

-- ===== VERIFICATION HELPER =====
-- The exact check requested: readings grouped by source, with today's row
-- counts and latest timestamp. A healthy system shows source names other
-- than 'seed' with rows_today > 0.
create or replace view readings_by_source as
  select
    source,
    count(*)                                                        as rows_total,
    count(*) filter (where fetched_at >= current_date)              as rows_today,
    max(fetched_at)                                                 as latest
  from readings
  group by source
  order by latest desc nulls last;

grant select on readings_by_source to anon, authenticated;
