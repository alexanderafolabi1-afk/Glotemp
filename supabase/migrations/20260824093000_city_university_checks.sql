-- Tracks which cities the wikidata-universities collector has actually
-- checked, independent of whether it found anything real. Without this,
-- loadAlreadyCovered() (in supabase/functions/wikidata-universities)
-- could only see cities with at least one real row in city_universities,
-- so a city with a genuine zero result (a small town with no real
-- university within RADIUS_KM -- a real, expected finding, not a
-- failure) was never marked as done and got re-queried on every single
-- run, wasting time that should go toward cities not yet checked at all.
create table if not exists city_university_checks (
  city_slug text primary key references city_points(city_slug) on delete cascade,
  checked_at timestamptz not null default now(),
  found_count integer not null default 0
);

alter table city_university_checks enable row level security;
-- Internal collector bookkeeping only -- no client ever reads this.
