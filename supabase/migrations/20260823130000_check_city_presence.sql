-- A mandatory, pre-post location check for check-ins -- distinct from
-- verify_presence (20260816180000_lightweight_verification.sql), which
-- stays exactly as it was: an OPTIONAL signal offered only after a
-- successful post, that upgrades a reading's weight but never blocks it.
--
-- This one blocks. It reuses the same city_points table and km_between()
-- Haversine helper verify_presence already checks against -- same
-- 60km-radius data, same distance math -- but can't reuse verify_presence
-- itself: that function stamps an EXISTING observation row by id, and
-- this has to answer "would this be allowed" BEFORE any row exists, so
-- the client can refuse to post at all rather than post-then-flag.
--
-- PRIVACY, SAME RULE AS verify_presence: read-only, writes nothing. No
-- table anywhere holds the lat/lon this function is called with -- it
-- computes a distance and returns a verdict, and the position is gone
-- the moment this statement finishes.
create or replace function check_city_presence(
  p_city_slug text,
  p_lat numeric,
  p_lon numeric
)
returns table (allowed boolean, distance_km numeric, reason text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_point city_points%rowtype;
  v_km numeric;
begin
  if p_lat is null or p_lon is null
     or p_lat < -90 or p_lat > 90 or p_lon < -180 or p_lon > 180 then
    return query select false, null::numeric, 'bad_position'::text;
    return;
  end if;

  select * into v_point from city_points where city_slug = p_city_slug;
  if not found then
    -- Fails closed: a city this function cannot check is a city it does
    -- not vouch for, not a free pass. See generate-city-pages.js /
    -- cities-data.js for the source of truth this should never actually
    -- drift from -- confirmed in sync for all 300 current cities at the
    -- time this migration was written.
    return query select false, null::numeric, 'city_not_mapped'::text;
    return;
  end if;

  v_km := km_between(v_point.lat, v_point.lon, p_lat, p_lon);

  if v_km > v_point.radius_km then
    return query select false, v_km, 'too_far'::text;
    return;
  end if;

  return query select true, v_km, 'ok'::text;
end;
$$;

grant execute on function check_city_presence(text, numeric, numeric) to authenticated;
