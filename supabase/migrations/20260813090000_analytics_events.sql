-- Measurement events: installs, standalone launches, prompt outcomes and
-- check-ins by city.
--
-- Cloudflare Web Analytics covers visitors but has no custom-event API, so
-- these land here instead. Per-city check-in counts belong in the database
-- regardless: that figure is business data to be queried, not a traffic
-- metric.
--
-- NOTHING HERE IDENTIFIES ANYONE. No user id, no session id, no IP column,
-- no cookie behind it. That is what keeps this outside the scope of the
-- consent banner.
--
-- Idempotent. PostgreSQL has no `create policy if not exists`, so the
-- policies are dropped first; do not replace that with the syntax that
-- does not exist.

create table if not exists analytics_events (
  id bigserial primary key,
  event text not null check (char_length(event) between 1 and 60),
  city_slug text,
  display_mode text check (display_mode is null or display_mode in ('browser', 'standalone', 'minimal-ui')),
  path text,
  props jsonb,
  created_at timestamptz not null default now()
);

-- The two read patterns: counts per event over time, and check-ins per city.
create index if not exists idx_analytics_events_event_created
  on analytics_events (event, created_at desc);
create index if not exists idx_analytics_events_city_created
  on analytics_events (city_slug, created_at desc)
  where city_slug is not null;

alter table analytics_events enable row level security;

-- Anonymous visitors must be able to write, since that is the whole point,
-- but nobody may read the table from the client. Reading is for the
-- dashboard/SQL editor with the service role.
drop policy if exists "analytics_events_insert_anon" on analytics_events;
create policy "analytics_events_insert_anon" on analytics_events
  for insert to anon, authenticated with check (true);

grant insert on analytics_events to anon, authenticated;
grant usage, select on sequence analytics_events_id_seq to anon, authenticated;

comment on table analytics_events is
  'Cookieless product events. No identifiers by design; see glotemp-analytics.js.';
