-- Real per-university records for the Education vertical's campus layer.
--
-- WHY NOT hipolabs-education. Checked before writing this: that
-- collector never stored a single real university (name, coordinates) --
-- only a city-level count, plus two metrics that are Math.random()
-- regardless of any real input (international_students,
-- education_quality_score). Its API is also currently fully
-- unreachable: every request to universities.hipolabs.com gets
-- "Connection refused" at the TCP level, confirmed by re-invoking the
-- function directly and reading its logs, not just by memory of an
-- earlier round. Even reachable, it has no per-university names or
-- coordinates to give -- it was never going to satisfy "real name, real
-- city tie, real coordinates if available". Not fixed here (a dead
-- third-party domain isn't a code bug), left as a known discrepancy.
--
-- SOURCE USED INSTEAD: Wikidata's free, keyless SPARQL endpoint
-- (query.wikidata.org), same Wikimedia infrastructure family the
-- already-working wiki-attention collector reaches successfully. A
-- geo-radius query against each city's own real, already-stored
-- city_points.lat/lon finds real Wikidata entities that are instances of
-- university (Q3918) with a real P625 coordinate -- so every row this
-- produces has a real name AND a real coordinate by construction; there
-- is no separate "name only" tier to fabricate, and a city with nothing
-- real found simply gets no rows, not a placeholder.
create table if not exists city_universities (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null references city_points(city_slug) on delete cascade,
  -- Globally unique across Wikidata, not just within one city --
  -- university Qxxxxxx ids never collide, so this alone is enough to
  -- upsert instead of needing a composite key.
  wikidata_id text not null unique,
  name text not null,
  lat double precision,
  lon double precision,
  website text,
  fetched_at timestamptz not null default now()
);

create index if not exists idx_city_universities_city on city_universities(city_slug);

alter table city_universities enable row level security;

-- World-readable, same as every other collector-fed table. Writes come
-- only from the scheduled edge function using the service role key.
drop policy if exists "city_universities_select_all" on city_universities;
create policy "city_universities_select_all" on city_universities
  for select using (true);

grant select on city_universities to anon, authenticated;

-- ===== PART 2: student ambassador contributions =====
-- One nullable, optional column on the EXISTING observations table --
-- not a new submission table, not a new moderation path. A check-in
-- tagged with a real university still goes through the exact same
-- location check (check_city_presence), the exact same client and
-- server-side moderation (moderate_observation_text,
-- flag_observation, resolve_moderation_item, moderation_queue), and the
-- exact same review flow as every other check-in, because it IS every
-- other check-in -- this column is the only thing that's new.
alter table observations
  add column if not exists campus_wikidata_id text
    references city_universities(wikidata_id) on delete set null;

create index if not exists idx_observations_campus on observations(campus_wikidata_id)
  where campus_wikidata_id is not null;
