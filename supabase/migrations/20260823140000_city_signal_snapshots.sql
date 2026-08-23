-- Daily signal history, per city -- so a real "Why" line can say "pulse
-- moved from X to Y" instead of describing only the current instant.
--
-- WHICH SIGNALS. Checked live against this project's actual database
-- before writing this (not just the migration files, which describe an
-- earlier schema -- city_comments/city_pulse_cache/reporters -- that was
-- since replaced by observations/profiles and was never live at the time
-- of writing this):
--
--   "pulse reading": readings.vertical='pulse' exists but its only
--   source is 'seed' (120 one-time rows from Aug 4-7, launch data,
--   completely stale) -- gdelt-sentiment-hourly has been cron-scheduled
--   for weeks and has written zero rows (a separate, pre-existing bug:
--   its cron command uses a literal 'YOUR_SERVICE_ROLE_KEY' placeholder
--   instead of invoke_edge_function's real vault-backed secret, same
--   shape as the previously-disclosed hipolabs/world_bank cron bugs).
--   Not fixed here, out of scope. The genuinely live, currently-updating
--   per-city human signal is `observations` (real user mood check-ins:
--   mood, intensity 1-10, created_at) -- that is what "pulse" means
--   below: observation_count and avg_intensity, both real aggregates of
--   real submitted rows, never a synthetic sentiment score.
--
--   "deeper sources": readings rows with vertical<>'pulse' and
--   source<>'seed' -- i.e. the collectors that are actually still
--   writing (github_activity: 9 cities, updating today; world_bank: 18
--   cities, one-time Aug 8 snapshot; remotive_jobs: 1 city, just
--   started; ticketmaster: 20 cities). Snapshotted per city, whichever
--   verticals that city actually has -- never padded with cities that
--   have none.
--
-- SHAPE. One row per (city_slug, snapshot_date), same append-only,
-- upserted-on-conflict shape as city_pageviews and city_edit_activity --
-- a real trend needs real history, not the latest value standing in for
-- one.
create table if not exists city_signal_snapshots (
  city_slug text not null references city_points(city_slug) on delete cascade,
  snapshot_date date not null,
  observation_count integer not null default 0,
  avg_intensity numeric,
  mood_counts jsonb not null default '{}'::jsonb,
  deeper_signals jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  primary key (city_slug, snapshot_date)
);

create index if not exists idx_city_signal_snapshots_slug_date
  on city_signal_snapshots(city_slug, snapshot_date desc);

alter table city_signal_snapshots enable row level security;

-- World-readable, same as city_pageviews/city_edit_activity/readings.
-- Writes come only from the scheduled edge function using the service
-- role key, which bypasses RLS -- no insert policy for anon/authenticated.
drop policy if exists "city_signal_snapshots_select_all" on city_signal_snapshots;
create policy "city_signal_snapshots_select_all" on city_signal_snapshots
  for select using (true);

grant select on city_signal_snapshots to anon, authenticated;
