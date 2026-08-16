-- Lightweight verification for readings.
--
-- TWO SIGNALS, BOTH OPTIONAL
--   1. presence  someone pressed "I am here" and their browser's
--                geolocation put them inside the city. Explicit consent
--                every time; the browser prompts, and the page asks first.
--   2. standing  account age and contribution count. Costs the reader
--                nothing and needs no permission.
--
-- WHAT IS DELIBERATELY NOT STORED
-- No latitude, no longitude, no accuracy circle, no track. The check
-- happens inside verify_presence and only its VERDICT survives: a boolean
-- method and a coarse distance bucket. Storing the coordinates would turn
-- a mood site into a location history, which is a different product with
-- a different risk profile, and nothing here needs them after the moment
-- of the check.
--
-- HOW HONEST THIS IS
-- Browser geolocation can be spoofed by anyone willing to open dev tools.
-- This raises the cost of a fake reading; it does not make one impossible,
-- and nothing downstream should be described as proof. That is why the
-- weight is 2 and not 20: it tilts an aggregate, it does not decide it.
--
-- WEIGHTING RULE, EXACTLY AS SPECIFIED
-- Weighting engages only if verification data exists in the window. With
-- no verified rows, every row weighs 1 and the result is the plain mean
-- the site produces today. Existing readings are therefore unchanged
-- until somebody actually verifies something.
--
-- Idempotent. PostgreSQL has no `create policy if not exists`, so policies
-- are dropped first; do not replace that with the syntax that does not
-- exist.

-- ===== 1. the columns =====
alter table if exists observations
  add column if not exists verified_at timestamptz,
  add column if not exists verify_method text,
  add column if not exists verify_distance_km numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'observations_verify_method_check'
  ) then
    alter table observations
      add constraint observations_verify_method_check
      check (verify_method is null or verify_method in ('presence', 'standing'));
  end if;
end $$;

create index if not exists idx_observations_verified
  on observations(city_slug, verified_at) where verified_at is not null;

comment on column observations.verify_method is
  'presence = geolocation put them in the city at the time of posting. standing = account age and contribution count. Null = unverified, which is the default and carries no penalty.';
comment on column observations.verify_distance_km is
  'Coarse distance from the city centre, rounded. Never the raw position.';

-- ===== 2. standing =====
-- Deliberately cheap thresholds. This is a badge that says "not an account
-- made ten seconds ago", not a loyalty tier.
create or replace function user_standing(p_user_id uuid default auth.uid())
returns table (
  account_age_days int,
  contributions bigint,
  qualifies boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    greatest(0, extract(day from now() - p.created_at)::int),
    (select count(*) from observations o where o.user_id = p.user_id),
    (
      extract(day from now() - p.created_at)::int >= 7
      and (select count(*) from observations o where o.user_id = p.user_id) >= 3
    )
  from profiles p
  where p.user_id = p_user_id;
$$;

grant execute on function user_standing(uuid) to authenticated;

-- ===== 3. presence =====
-- Haversine. earthdistance would need two more extensions for a single
-- call, and this is exact enough for a "are you in this city" question.
create or replace function km_between(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
returns numeric
language sql
immutable
as $$
  select round((6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lon2 - lon1) / 2), 2)
  )))::numeric, 1);
$$;

-- City centres, so a browser cannot claim a city it is nowhere near by
-- also supplying its own idea of where that city is.
create table if not exists city_points (
  city_slug text primary key,
  lat numeric not null,
  lon numeric not null,
  radius_km int not null default 60
);

alter table city_points enable row level security;

drop policy if exists "city_points_select_all" on city_points;
create policy "city_points_select_all" on city_points for select using (true);

-- Verify and stamp in one call. Returns the verdict; the caller never
-- gets to set verified_at itself.
create or replace function verify_presence(
  p_observation_id uuid,
  p_lat numeric,
  p_lon numeric
)
returns table (verified boolean, distance_km numeric, reason text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_obs observations%rowtype;
  v_point city_points%rowtype;
  v_km numeric;
begin
  select * into v_obs from observations where id = p_observation_id;
  if not found then
    return query select false, null::numeric, 'no_such_observation'::text;
    return;
  end if;

  -- Only your own reading, and only your own. Without this, anyone could
  -- stamp anyone else's row by guessing an id.
  if v_obs.user_id is distinct from auth.uid() then
    return query select false, null::numeric, 'not_yours'::text;
    return;
  end if;

  if p_lat is null or p_lon is null
     or p_lat < -90 or p_lat > 90 or p_lon < -180 or p_lon > 180 then
    return query select false, null::numeric, 'bad_position'::text;
    return;
  end if;

  select * into v_point from city_points where city_slug = v_obs.city_slug;
  if not found then
    return query select false, null::numeric, 'city_not_mapped'::text;
    return;
  end if;

  v_km := km_between(v_point.lat, v_point.lon, p_lat, p_lon);

  if v_km > v_point.radius_km then
    return query select false, v_km, 'too_far'::text;
    return;
  end if;

  -- The verdict is written, the position is not.
  update observations
     set verified_at = now(),
         verify_method = 'presence',
         verify_distance_km = v_km
   where id = p_observation_id;

  return query select true, v_km, 'ok'::text;
end;
$$;

grant execute on function verify_presence(uuid, numeric, numeric) to authenticated;

-- Standing needs no position, so it can be stamped on its own.
create or replace function verify_standing(p_observation_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select qualifies into v_ok from user_standing(auth.uid());
  if not coalesce(v_ok, false) then return false; end if;

  update observations
     set verified_at = now(), verify_method = 'standing'
   where id = p_observation_id
     and user_id = auth.uid()
     -- Presence is the stronger signal. Standing must never overwrite it.
     and (verify_method is null or verify_method = 'standing');

  return found;
end;
$$;

grant execute on function verify_standing(uuid) to authenticated;

-- ===== 4. weighting =====
create or replace function observation_weight(p_method text)
returns numeric
language sql
immutable
as $$
  select case p_method
    when 'presence' then 2.0    -- raises the cost of a fake, does not prove
    when 'standing' then 1.5
    else 1.0
  end::numeric;
$$;

-- The aggregate. Falls back to the plain mean whenever the window holds
-- no verified rows, which is the current behaviour exactly.
create or replace function city_reading_weighted(p_city_slug text, p_hours int default 24)
returns table (
  city_slug text,
  observations bigint,
  verified bigint,
  intensity numeric,
  weighting text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hours int := least(greatest(coalesce(p_hours, 24), 1), 168);
begin
  return query
  with recent as (
    select o.intensity as i, o.verify_method as vm
    from observations o
    where o.city_slug = p_city_slug
      and o.created_at >= now() - make_interval(hours => v_hours)
  ),
  counted as (
    select count(*)::bigint as n,
           count(*) filter (where r.vm is not null)::bigint as v,
           round(avg(r.i)::numeric, 2) as plain,
           case when sum(observation_weight(r.vm)) > 0
                then round((sum(r.i * observation_weight(r.vm)) / sum(observation_weight(r.vm)))::numeric, 2)
           end as weighted
    from recent r
  )
  select p_city_slug,
         c.n,
         c.v,
         -- The specified rule, written out rather than left implicit.
         case when c.v = 0 then c.plain else c.weighted end,
         case when c.v = 0 then 'equal' else 'weighted' end
  from counted c;
end;
$$;

grant execute on function city_reading_weighted(text, int) to anon, authenticated;

-- ===== 5. seed the city points from the cities the site already knows =====
-- Only the slugs already present in observations plus anything already
-- here; the full list is loaded by the app, and a missing city simply
-- returns city_not_mapped rather than falsely verifying.
insert into city_points (city_slug, lat, lon, radius_km) values
  ('tokyo', 35.6762, 139.6503, 60),
  ('delhi', 28.7041, 77.1025, 60),
  ('shanghai', 31.2304, 121.4737, 60),
  ('sao-paulo', -23.5505, -46.6333, 60),
  ('mexico-city', 19.4326, -99.1332, 60),
  ('cairo', 30.0444, 31.2357, 60),
  ('mumbai', 19.076, 72.8777, 60),
  ('beijing', 39.9042, 116.4074, 60),
  ('osaka', 34.6937, 135.5023, 60),
  ('nyc', 40.7128, -74.006, 60),
  ('london', 51.5074, -0.1278, 60),
  ('paris', 48.8566, 2.3522, 60),
  ('toronto', 43.6532, -79.3832, 60),
  ('sydney', -33.8688, 151.2093, 60),
  ('berlin', 52.52, 13.405, 60),
  ('dubai', 25.2048, 55.2708, 60),
  ('singapore', 1.3521, 103.8198, 60),
  ('hong-kong', 22.3193, 114.1694, 60),
  ('bangkok', 13.7563, 100.5018, 60),
  ('istanbul', 41.0082, 28.9784, 60),
  ('medellin', 6.2442, -75.5812, 60),
  ('bogota', 4.711, -74.0721, 60),
  ('buenos-aires', -34.6037, -58.3816, 60),
  ('santiago', -33.4489, -70.6693, 60),
  ('lima', -12.0464, -77.0428, 60),
  ('moscow', 55.7558, 37.6173, 60),
  ('seoul', 37.5665, 126.978, 60),
  ('ankara', 39.9334, 32.8597, 60),
  ('nairobi', -1.2864, 36.8172, 60),
  ('lagos', 6.5244, 3.3792, 60),
  ('los-angeles', 34.0522, -118.2437, 60),
  ('chicago', 41.8781, -87.6298, 60),
  ('miami', 25.7617, -80.1918, 60),
  ('houston', 29.7604, -95.3698, 60),
  ('vancouver', 49.2827, -123.1207, 60),
  ('montreal', 45.5017, -73.5673, 60),
  ('san-francisco', 37.7749, -122.4194, 60),
  ('guadalajara', 20.6597, -103.3496, 60),
  ('atlanta', 33.749, -84.388, 60),
  ('seattle', 47.6062, -122.3321, 60),
  ('washington-dc', 38.9072, -77.0369, 60),
  ('phoenix', 33.4484, -112.074, 60),
  ('boston', 42.3601, -71.0589, 60),
  ('monterrey', 25.6866, -100.3161, 60),
  ('dallas', 32.7767, -96.797, 60),
  ('minneapolis', 44.9778, -93.265, 60),
  ('denver', 39.7392, -104.9903, 60),
  ('philadelphia', 39.9526, -75.1652, 60),
  ('san-diego', 32.7157, -117.1611, 60),
  ('havana', 23.1136, -82.3666, 60),
  ('madrid', 40.4168, -3.7038, 60),
  ('barcelona', 41.3851, 2.1734, 60),
  ('rome', 41.9028, 12.4964, 60),
  ('milan', 45.4642, 9.19, 60),
  ('amsterdam', 52.3676, 4.9041, 60),
  ('warsaw', 52.2297, 21.0122, 60),
  ('stockholm', 59.3293, 18.0686, 60),
  ('vienna', 48.2082, 16.3738, 60),
  ('prague', 50.0755, 14.4378, 60),
  ('budapest', 47.4979, 19.0402, 60),
  ('zurich', 47.3769, 8.5417, 60),
  ('munich', 48.1351, 11.582, 60),
  ('lisbon', 38.7169, -9.1399, 60),
  ('brussels', 50.8503, 4.3517, 60),
  ('oslo', 59.9139, 10.7522, 60),
  ('copenhagen', 55.6761, 12.5683, 60),
  ('helsinki', 60.1699, 24.9384, 60),
  ('athens', 37.9838, 23.7275, 60),
  ('bucharest', 44.4268, 26.1025, 60),
  ('kyiv', 50.4501, 30.5234, 60),
  ('dublin', 53.3498, -6.2603, 60),
  ('lyon', 45.764, 4.8357, 60),
  ('rotterdam', 51.9225, 4.4792, 60),
  ('krakow', 50.0647, 19.945, 60),
  ('hamburg', 53.5753, 10.0153, 60),
  ('edinburgh', 55.9533, -3.1883, 60),
  ('seville', 37.3891, -5.9845, 60),
  ('porto', 41.1579, -8.6291, 60),
  ('sofia', 42.6977, 23.3219, 60),
  ('vilnius', 54.6872, 25.2797, 60),
  ('bangalore', 12.9716, 77.5946, 60),
  ('hyderabad', 17.385, 78.4867, 60),
  ('dhaka', 23.8103, 90.4125, 60),
  ('karachi', 24.8607, 67.0011, 60),
  ('kolkata', 22.5726, 88.3639, 60),
  ('guangzhou', 23.1291, 113.2644, 60),
  ('shenzhen', 22.5431, 114.0579, 60),
  ('chengdu', 30.5728, 104.0668, 60),
  ('wuhan', 30.5928, 114.3052, 60),
  ('taipei', 25.033, 121.5654, 60),
  ('kuala-lumpur', 3.139, 101.6869, 60),
  ('jakarta', -6.2088, 106.8456, 60),
  ('manila', 14.5995, 120.9842, 60),
  ('ho-chi-minh', 10.8231, 106.6297, 60),
  ('hanoi', 21.0285, 105.8542, 60),
  ('melbourne', -37.8136, 144.9631, 60),
  ('auckland', -36.8485, 174.7633, 60),
  ('lahore', 31.5204, 74.3587, 60),
  ('colombo', 6.9271, 79.8612, 60),
  ('yangon', 16.8661, 96.1951, 60),
  ('kathmandu', 27.7172, 85.324, 60),
  ('chennai', 13.0827, 80.2707, 60),
  ('pune', 18.5204, 73.8567, 60),
  ('tianjin', 39.3434, 117.3616, 60),
  ('chongqing', 29.563, 106.5516, 60),
  ('nanjing', 32.0603, 118.7969, 60),
  ('perth', -31.9505, 115.8605, 60),
  ('brisbane', -27.4698, 153.0251, 60),
  ('phnom-penh', 11.5564, 104.9282, 60),
  ('busan', 35.1796, 129.0756, 60),
  ('nagoya', 35.1815, 136.9066, 60),
  ('fukuoka', 33.5904, 130.4017, 60),
  ('surabaya', -7.2575, 112.7521, 60),
  ('xi-an', 34.3416, 108.9398, 60),
  ('harbin', 45.8038, 126.535, 60),
  ('adelaide', -34.9285, 138.6007, 60),
  ('ulaanbaatar', 47.8864, 106.9057, 60),
  ('sapporo', 43.0618, 141.3545, 60),
  ('vientiane', 17.9757, 102.6331, 60),
  ('tehran', 35.6892, 51.389, 60),
  ('caracas', 10.4806, -66.9036, 60),
  ('guayaquil', -2.1894, -79.8891, 60),
  ('quito', -0.1807, -78.4678, 60),
  ('fortaleza', -3.7172, -38.5434, 60),
  ('belo-horizonte', -19.9167, -43.9345, 60),
  ('porto-alegre', -30.0277, -51.2287, 60),
  ('recife', -8.0578, -34.8829, 60),
  ('cali', 3.4516, -76.532, 60),
  ('montevideo', -34.9011, -56.1645, 60),
  ('curitiba', -25.4195, -49.2646, 60),
  ('johannesburg', -26.2041, 28.0473, 60),
  ('cape-town', -33.9249, 18.4241, 60),
  ('kinshasa', -4.4419, 15.2663, 60),
  ('addis-ababa', 9.03, 38.74, 60),
  ('accra', 5.6037, -0.187, 60),
  ('dar-es-salaam', -6.7924, 39.2083, 60),
  ('casablanca', 33.5731, -7.5898, 60),
  ('dakar', 14.6928, -17.4467, 60),
  ('algiers', 36.7372, 3.0863, 60),
  ('tunis', 36.8065, 10.1815, 60),
  ('riyadh', 24.7136, 46.6753, 60),
  ('doha', 25.2854, 51.531, 60),
  ('abu-dhabi', 24.4539, 54.3773, 60),
  ('amman', 31.9454, 35.9284, 60),
  ('tel-aviv', 32.0853, 34.7818, 60),
  ('beirut', 33.8886, 35.4955, 60),
  ('muscat', 23.588, 58.3829, 60),
  ('kuwait-city', 29.3759, 47.9774, 60),
  ('jeddah', 21.4858, 39.1925, 60),
  ('baghdad', 33.3152, 44.3661, 60),
  ('milton-keynes', 52.0406, -0.7594, 60)
on conflict (city_slug) do nothing;
