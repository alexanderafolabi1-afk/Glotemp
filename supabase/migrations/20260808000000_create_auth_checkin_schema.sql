-- Glotemp: authenticated human check-in layer
-- profiles / city_watchers / observations, all keyed to Supabase Auth users.
--
-- Idempotent: safe to re-run. Note that PostgreSQL has no
-- `create policy if not exists`, so every policy is dropped first --
-- an earlier migration in this repo used that non-existent syntax and
-- would abort on apply; do not copy that pattern.

create extension if not exists "pgcrypto";

-- ===== PROFILES =====
-- One row per authenticated user, captured on first sign-in.
-- home_city is a city slug from the 150 in cities-data.js.
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  home_city text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_home_city on profiles(home_city);

-- ===== CITY_WATCHERS =====
create table if not exists city_watchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  city_slug text not null,
  created_at timestamptz not null default now(),
  constraint city_watchers_user_city_unique unique (user_id, city_slug)
);

create index if not exists idx_city_watchers_city_slug on city_watchers(city_slug);
create index if not exists idx_city_watchers_user_id on city_watchers(user_id);

-- ===== OBSERVATIONS =====
-- user_id references profiles (not auth.users directly) so PostgREST can
-- resolve `observations?select=...,profiles(display_name)` as an embedded
-- join -- the feed and per-city lists both rely on that embed to show a
-- display name without a second round trip.
create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  city_slug text not null,
  mode text not null check (mode in ('eat', 'drink', 'watch', 'move', 'make')),
  intensity int not null check (intensity between 1 and 10),
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists idx_observations_city_created on observations(city_slug, created_at desc);
create index if not exists idx_observations_created_at on observations(created_at desc);
create index if not exists idx_observations_user_id on observations(user_id);

-- ===== ROW LEVEL SECURITY =====
-- Same shape on all three: world-readable, owner-writable.
alter table profiles enable row level security;
alter table city_watchers enable row level security;
alter table observations enable row level security;

drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_all" on profiles
  for select using (true);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "city_watchers_select_all" on city_watchers;
create policy "city_watchers_select_all" on city_watchers
  for select using (true);

drop policy if exists "city_watchers_insert_own" on city_watchers;
create policy "city_watchers_insert_own" on city_watchers
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "city_watchers_update_own" on city_watchers;
create policy "city_watchers_update_own" on city_watchers
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Unwatching is a real product action, and the spec's read/insert/update
-- rule would otherwise strand rows the owner can never remove.
drop policy if exists "city_watchers_delete_own" on city_watchers;
create policy "city_watchers_delete_own" on city_watchers
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "observations_select_all" on observations;
create policy "observations_select_all" on observations
  for select using (true);

drop policy if exists "observations_insert_own" on observations;
create policy "observations_insert_own" on observations
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "observations_update_own" on observations;
create policy "observations_update_own" on observations
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ===== GRANTS =====
-- anon reads only; every write path requires an authenticated session.
grant select on profiles, city_watchers, observations to anon;
grant select, insert, update on profiles to authenticated;
grant select, insert, update, delete on city_watchers to authenticated;
grant select, insert, update on observations to authenticated;

-- ===== WATCHER COUNTS =====
-- City pages need a watcher count without pulling every row. PostgREST
-- exposes this as /rest/v1/rpc/city_watcher_count?city_slug=eq...
create or replace function city_watcher_count(p_city_slug text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from city_watchers where city_slug = p_city_slug;
$$;

grant execute on function city_watcher_count(text) to anon, authenticated;
