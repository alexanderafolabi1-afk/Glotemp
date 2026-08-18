-- The music layer.
--
-- NOT LAST.FM. Its API terms are non-commercial only and this site
-- carries advertising, so it is excluded by licence, not by preference.
-- Every source below is free for commercial use:
--   ICY/Shoutcast metadata  the stations' own public streams
--   MusicBrainz             CC0, no licence restriction at all
--   Ticketmaster Discovery  already in this stack, commercial terms
--
-- ONE CORRECTION TO THE BRIEF
-- Radio Browser stations were NOT already stored per city. city-radio.js
-- queries Radio Browser from each visitor's browser and keeps nothing, so
-- there was no station list on the server to poll. city_stations below is
-- that missing piece, filled server side on a schedule; without it the
-- now-playing poller would have had nothing to iterate.
--
-- WHY THE ARCHIVE IS THE POINT
-- now_playing is append only and never trimmed. Each row is one station's
-- metadata at one moment. Nobody else is assembling what a given city's
-- radio actually played, hour by hour, across a hundred and fifty cities,
-- and that series is the thing a chart, a trend and eventually a licence
-- are all built from. The boards are derived views over it, never stored
-- results, so a change of method reruns over the whole history.
--
-- Idempotent. PostgreSQL has no `create policy if not exists`, so policies
-- are dropped first; do not replace that with the syntax that does not
-- exist.

-- ===== 1. the stations to poll =====
create table if not exists city_stations (
  station_uuid text primary key,
  city_slug text not null,
  name text not null,
  stream_url text not null,
  homepage text,
  codec text,
  bitrate int,
  -- A stream that has never yielded metadata is not broken, it simply
  -- does not send any. Tracking both lets the poller spend its budget on
  -- stations that actually talk, without deleting the quiet ones.
  last_meta_at timestamptz,
  -- Stamped on every poll whether or not the station spoke. Ordering the
  -- poller by this is what makes the whole set rotate; ordering by
  -- last_meta_at instead would starve the quiet stations forever and the
  -- talkative ones would be polled every run.
  last_polled_at timestamptz,
  fail_count int not null default 0,
  added_at timestamptz not null default now()
);

alter table city_stations add column if not exists last_polled_at timestamptz;

create index if not exists idx_city_stations_city on city_stations(city_slug);
create index if not exists idx_city_stations_rotation on city_stations(last_polled_at nulls first);

-- ===== 2. the archive =====
create table if not exists now_playing (
  id bigserial primary key,
  city_slug text not null,
  station_uuid text not null,
  station_name text not null,
  -- raw is kept verbatim alongside the parse. Stream titles are messy and
  -- the split heuristic will improve; keeping the original means the whole
  -- history can be re-parsed later instead of being stuck with today's
  -- guess.
  raw text not null,
  artist text,
  title text,
  -- Lowercased, punctuation-folded artist. Grouping on the display form
  -- would split "Burna Boy" from "BURNA BOY" into two chart entries.
  artist_key text,
  seen_at timestamptz not null default now()
);

create index if not exists idx_now_playing_city_seen on now_playing(city_slug, seen_at desc);
create index if not exists idx_now_playing_artist_seen on now_playing(artist_key, seen_at desc) where artist_key is not null;
create index if not exists idx_now_playing_seen on now_playing(seen_at desc);

-- The same station repeating the same track every poll would inflate the
-- chart into a measure of poll frequency rather than airplay. One row per
-- station per track per hour is the unit.
-- The zone is pinned to UTC on purpose. date_trunc over a timestamptz is
-- only STABLE, because its result depends on the session TimeZone, and
-- Postgres refuses to index a non-immutable expression. Fixing the zone
-- makes it immutable, and it also makes the hour bucket mean the same
-- thing whichever connection writes the row.
create unique index if not exists uq_now_playing_play
  on now_playing(station_uuid, raw, (date_trunc('hour', seen_at at time zone 'UTC')));

-- ===== 3. cached third-party reads =====
create table if not exists city_artists (
  city_slug text not null,
  mbid text not null,
  name text not null,
  begin_year int,
  genre text,
  fetched_at timestamptz not null default now(),
  primary key (city_slug, mbid)
);

create table if not exists city_music_events (
  event_id text primary key,
  city_slug text not null,
  artist text not null,
  venue text,
  starts_at timestamptz,
  url text,
  fetched_at timestamptz not null default now()
);

create index if not exists idx_city_music_events_city on city_music_events(city_slug, starts_at);

-- Nothing here is reachable from a browser directly. RLS is on with no
-- select policy, so the security definer functions below are the only
-- way in and the client cannot pull the raw archive.
alter table city_stations enable row level security;
alter table now_playing enable row level security;
alter table city_artists enable row level security;
alter table city_music_events enable row level security;

-- ===== 4. what the page asks for =====

-- The centrepiece. Most recent distinct station readings for a city.
create or replace function music_now_playing(p_city_slug text, p_limit int default 6)
returns table (
  station_name text,
  artist text,
  title text,
  raw text,
  seen_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (n.station_uuid)
         n.station_name, n.artist, n.title, n.raw, n.seen_at
  from now_playing n
  where n.city_slug = p_city_slug
    -- Older than this is not "now". The section renders nothing rather
    -- than presenting a stale track as current.
    and n.seen_at >= now() - interval '3 hours'
  order by n.station_uuid, n.seen_at desc
  limit greatest(coalesce(p_limit, 6), 1);
$$;

grant execute on function music_now_playing(text, int) to anon, authenticated;

-- The rotation board. Airplay only: a count of distinct plays, and the
-- change in rank against the week before. No editorial input, no paid
-- input; partners cannot reach this function at all.
create or replace function music_rotation(p_city_slug text, p_limit int default 10)
returns table (
  artist text,
  plays bigint,
  prev_plays bigint,
  movement int,
  is_new boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with cur as (
    select artist_key, min(artist) as artist, count(*)::bigint as plays
    from now_playing
    where city_slug = p_city_slug and artist_key is not null
      and seen_at >= now() - interval '7 days'
    group by artist_key
  ),
  prev as (
    select artist_key, count(*)::bigint as plays
    from now_playing
    where city_slug = p_city_slug and artist_key is not null
      and seen_at >= now() - interval '14 days'
      and seen_at <  now() - interval '7 days'
    group by artist_key
  ),
  cur_ranked as (select c.*, row_number() over (order by c.plays desc, c.artist) as rnk from cur c),
  prev_ranked as (select p.*, row_number() over (order by p.plays desc) as rnk from prev p)
  select cr.artist,
         cr.plays,
         coalesce(pr.plays, 0),
         -- Positive means climbing. Null previous rank is a new entry
         -- rather than an infinite climb.
         case when pr.rnk is null then 0 else (pr.rnk - cr.rnk)::int end,
         pr.rnk is null
  from cur_ranked cr
  left join prev_ranked pr on pr.artist_key = cr.artist_key
  where cr.rnk <= greatest(coalesce(p_limit, 10), 1)
  order by cr.rnk;
$$;

grant execute on function music_rotation(text, int) to anon, authenticated;

-- Rising, globally. An artist breaking in one city becomes visible
-- everywhere, and the cities driving it are named so the claim is
-- checkable rather than asserted.
create or replace function music_rising(p_limit int default 10)
returns table (
  artist text,
  plays bigint,
  prev_plays bigint,
  growth numeric,
  cities bigint,
  driving_cities text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with cur as (
    select artist_key, min(artist) as artist, count(*)::bigint as plays,
           count(distinct city_slug)::bigint as cities
    from now_playing
    where artist_key is not null and seen_at >= now() - interval '7 days'
    group by artist_key
  ),
  prev as (
    select artist_key, count(*)::bigint as plays
    from now_playing
    where artist_key is not null
      and seen_at >= now() - interval '14 days'
      and seen_at <  now() - interval '7 days'
    group by artist_key
  ),
  top_cities as (
    select artist_key, array_agg(city_slug order by n desc) as cities
    from (
      select artist_key, city_slug, count(*) as n,
             row_number() over (partition by artist_key order by count(*) desc) as r
      from now_playing
      where artist_key is not null and seen_at >= now() - interval '7 days'
      group by artist_key, city_slug
    ) s
    where s.r <= 3
    group by artist_key
  )
  select c.artist, c.plays, coalesce(p.plays, 0),
         -- +1 on the denominator so a debut is a finite, comparable
         -- number instead of a division by zero.
         round((c.plays::numeric / (coalesce(p.plays, 0) + 1)), 2),
         c.cities,
         tc.cities
  from cur c
  left join prev p on p.artist_key = c.artist_key
  left join top_cities tc on tc.artist_key = c.artist_key
  -- A single play in a single city is noise, not a break.
  where c.plays >= 3
  order by (c.plays::numeric / (coalesce(p.plays, 0) + 1)) desc, c.plays desc
  limit greatest(coalesce(p_limit, 10), 1);
$$;

grant execute on function music_rising(int) to anon, authenticated;

create or replace function music_from_city(p_city_slug text, p_limit int default 8)
returns table (name text, begin_year int, genre text)
language sql
stable
security definer
set search_path = public
as $$
  select a.name, a.begin_year, a.genre
  from city_artists a
  where a.city_slug = p_city_slug
  order by a.begin_year nulls last, a.name
  limit greatest(coalesce(p_limit, 8), 1);
$$;

grant execute on function music_from_city(text, int) to anon, authenticated;

create or replace function music_events(p_city_slug text, p_limit int default 8)
returns table (artist text, venue text, starts_at timestamptz, url text)
language sql
stable
security definer
set search_path = public
as $$
  select e.artist, e.venue, e.starts_at, e.url
  from city_music_events e
  where e.city_slug = p_city_slug
    and e.starts_at >= now()
    and e.starts_at <= now() + interval '30 days'
  order by e.starts_at
  limit greatest(coalesce(p_limit, 8), 1);
$$;

grant execute on function music_events(text, int) to anon, authenticated;

-- ===== 5. the writer the poller calls =====
-- Parsing lives here so the whole archive can be re-parsed by replacing
-- one function, rather than being fixed at whatever the poller believed
-- on the day it ran.
create or replace function music_normalise_artist(p_artist text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(lower(btrim(coalesce(p_artist, ''))), '[^a-z0-9]+', '', 'g'),
    ''
  );
$$;

create or replace function record_now_playing(
  p_city_slug text,
  p_station_uuid text,
  p_station_name text,
  p_raw text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_raw text := btrim(coalesce(p_raw, ''));
  v_artist text;
  v_title text;
  v_pos int;
begin
  -- Junk that is not a track. Stations announce themselves in the same
  -- field, and letting those through would put the station name at the
  -- top of its own city's chart.
  if v_raw = '' or length(v_raw) < 3 or length(v_raw) > 300 then
    return false;
  end if;

  v_pos := position(' - ' in v_raw);
  if v_pos > 1 then
    v_artist := btrim(substring(v_raw from 1 for v_pos - 1));
    v_title := btrim(substring(v_raw from v_pos + 3));
  else
    v_artist := null;
    v_title := v_raw;
  end if;

  insert into now_playing (city_slug, station_uuid, station_name, raw, artist, title, artist_key, seen_at)
  values (p_city_slug, p_station_uuid, p_station_name, v_raw, v_artist, v_title,
          music_normalise_artist(v_artist), now())
  on conflict do nothing;

  update city_stations
     set last_meta_at = now(), fail_count = 0
   where station_uuid = p_station_uuid;

  return true;
end;
$$;

-- Service role only. A browser able to call this could write the charts.
revoke all on function record_now_playing(text, text, text, text) from public;
revoke all on function music_normalise_artist(text) from public;

-- ===== 6. the schedule =====
-- Reuses invoke_edge_function from 20260808150000, which concatenates its
-- argument onto the functions base URL, so a query string passes straight
-- through and no second invoker is needed. The service key still comes
-- from Vault and is never written here.
--
-- nowplaying runs often because the archive's value is its density: a
-- track that charts for two hours must be caught while it plays. The
-- other three change on the order of days, so they run on the order of
-- days.
do $$
declare
  jobs text[][] := array[
    ['glotemp-music-nowplaying', '*/10 * * * *',  'music-sync?job=nowplaying&limit=40'],
    ['glotemp-music-events',     '25 4 * * *',    'music-sync?job=events&limit=40'],
    ['glotemp-music-stations',   '40 3 * * 1',    'music-sync?job=stations&limit=60'],
    ['glotemp-music-artists',    '55 3 * * 2',    'music-sync?job=artists&limit=25']
  ];
  i int;
begin
  if to_regproc('invoke_edge_function(text)') is null then
    raise notice 'invoke_edge_function missing; music schedule skipped';
    return;
  end if;

  for i in 1 .. array_length(jobs, 1) loop
    begin
      perform cron.unschedule(jobs[i][1]);
    exception when others then
      null;  -- not scheduled yet, which is the normal first run
    end;
    begin
      perform cron.schedule(jobs[i][1], jobs[i][2],
        format('select invoke_edge_function(%L);', jobs[i][3]));
    exception when others then
      raise notice 'pg_cron unavailable, music job % not scheduled: %', jobs[i][1], sqlerrm;
    end;
  end loop;
end $$;
