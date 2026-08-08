-- Glotemp Tonight: the thirteenth layer.
-- Five modes (eat / drink / watch / move / make), each with its own
-- reading AND its own time-of-day curve. The curve is stored, not just a
-- daily number, so the interface can answer "is this good *now*" rather
-- than "is this good today".
--
-- Provenance is first-class: every row records which sources produced it
-- and whether any component is modelled rather than measured, because the
-- interface has to label modelled figures as modelled.

create extension if not exists "pgcrypto";

create table if not exists tonight_readings (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null,
  mode text not null check (mode in ('eat', 'drink', 'watch', 'move', 'make')),

  -- 0-10 headline reading for this city x mode.
  reading numeric not null check (reading >= 0 and reading <= 10),

  -- 24 floats, index = hour 0-23 in the city's LOCAL time, each 0-10.
  -- Checked for length here so a malformed write can never reach the UI.
  curve jsonb not null check (jsonb_typeof(curve) = 'array' and jsonb_array_length(curve) = 24),

  -- Supporting counts. Null means "this source had nothing for this
  -- city x mode", which is materially different from zero.
  venue_count int,
  event_count int,
  -- OurAirports-derived. Always surfaced as "scheduled seat capacity" --
  -- never as arrivals, never as passengers.
  seat_capacity int,
  weather_viable boolean,

  -- [{ name, url, kind: 'live' | 'modelled' }]
  sources jsonb not null default '[]'::jsonb,
  -- True when ANY component of reading/curve is derived rather than
  -- measured. The interface reads this to print the "modelled" label.
  modelled boolean not null default false,

  computed_at timestamptz not null default now(),
  constraint tonight_readings_city_mode_unique unique (city_slug, mode)
);

create index if not exists idx_tonight_city on tonight_readings(city_slug);
create index if not exists idx_tonight_mode on tonight_readings(mode);
create index if not exists idx_tonight_reading on tonight_readings(reading desc);

-- World-readable; writes only ever happen from edge functions using the
-- service role key, which bypasses RLS. No anon/authenticated write
-- policy exists on purpose -- Tonight is a published-data table, not a
-- user-contributed one.
alter table tonight_readings enable row level security;

drop policy if exists "tonight_readings_select_all" on tonight_readings;
create policy "tonight_readings_select_all" on tonight_readings
  for select using (true);

grant select on tonight_readings to anon, authenticated;
