-- Server-side aggregation for the two global attention boards (Most
-- Watched, Currently Spiking) so the browser never pulls raw rows for
-- 300 cities -- it calls one RPC and gets back the already-ranked list.
--
-- most_watched_cities: sums real Wikipedia pageviews over the trailing
-- 7 days per city. Requires at least 5 of those 7 days to actually be
-- stored, so a city that only just started being tracked doesn't show
-- up with an artificially low weekly total.
create or replace function most_watched_cities(p_limit int default 20)
returns table (
  city_slug text,
  name text,
  country text,
  total_views bigint,
  days_counted int
)
language sql stable security definer set search_path = public
as $$
  select
    cp.city_slug,
    cp.name,
    cp.country,
    sum(pv.views)::bigint as total_views,
    count(pv.date)::int as days_counted
  from city_pageviews pv
  join city_points cp on cp.city_slug = pv.city_slug
  where pv.date >= (current_date - 7)
  group by cp.city_slug, cp.name, cp.country
  having count(pv.date) >= 5
  order by total_views desc
  limit p_limit;
$$;

grant execute on function most_watched_cities(int) to anon, authenticated;

-- spiking_cities: each city's latest edit-activity check, filtered down
-- to only the ones currently flagged as a spike (is_spike computed by
-- wiki-attention at write time, against that city's own rolling
-- baseline -- not recomputed here).
create or replace function spiking_cities(p_limit int default 20)
returns table (
  city_slug text,
  name text,
  country text,
  revisions_1h int,
  baseline_avg numeric,
  checked_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    latest.city_slug,
    latest.name,
    latest.country,
    latest.revisions_1h,
    latest.baseline_avg,
    latest.checked_at
  from (
    select distinct on (cea.city_slug)
      cea.city_slug, cp.name, cp.country, cea.revisions_1h,
      cea.baseline_avg, cea.checked_at, cea.is_spike
    from city_edit_activity cea
    join city_points cp on cp.city_slug = cea.city_slug
    order by cea.city_slug, cea.checked_at desc
  ) latest
  where latest.is_spike
  order by latest.checked_at desc
  limit p_limit;
$$;

grant execute on function spiking_cities(int) to anon, authenticated;
