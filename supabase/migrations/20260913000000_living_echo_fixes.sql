-- Living Echo: correctness fixes.
-- All existing rows unaffected. RPCs replaced in-place.

-- 1. Allow synthetic rows to omit user_id.
--    NULL is exempt from FK checks; all organic rows retain their user_id.
alter table observations alter column user_id drop not null;

-- 2. Fix admin_living_echo_overview:
--    - Query observations (not city_comments)
--    - Include auto_fade_threshold so the dashboard slider can hydrate correctly
create or replace function admin_living_echo_overview()
returns table (
  metric text,
  value  bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;

  return query
  select 'total_synthetic'::text, count(*)::bigint
    from observations where is_synthetic = true
  union all
  select 'total_organic'::text, count(*)::bigint
    from observations where coalesce(is_synthetic, false) = false
  union all
  select 'cities_at_threshold'::text,
    count(*)::bigint
    from city_generation_state where current_count >= 25
  union all
  select 'system_paused'::text,
    case when is_paused then 1 else 0 end::bigint
    from living_echo_global_state where id = 1
  union all
  select 'auto_fade_threshold'::text,
    auto_fade_threshold::bigint
    from living_echo_global_state where id = 1;
end;
$$;

grant execute on function admin_living_echo_overview() to authenticated;

-- 3. Fix admin_living_echo_cities:
--    - Query observations using city_slug (not city_comments.city)
create or replace function admin_living_echo_cities(
  p_limit  int default 100,
  p_offset int default 0
)
returns table (
  city_id       text,
  target_count  int,
  current_count int,
  synthetic_ct  bigint,
  organic_ct    bigint,
  last_run_at   timestamp with time zone,
  status        text,
  tier          text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;

  return query
  select
    g.city_id,
    g.target_count,
    g.current_count,
    coalesce((
      select count(*) from observations o
      where o.city_slug = g.city_id and o.is_synthetic = true
    ), 0) as synthetic_ct,
    coalesce((
      select count(*) from observations o
      where o.city_slug = g.city_id and coalesce(o.is_synthetic, false) = false
    ), 0) as organic_ct,
    g.last_run_at,
    g.status,
    g.tier
  from city_generation_state g
  order by g.current_count asc, g.city_id
  limit p_limit offset p_offset;
end;
$$;

grant execute on function admin_living_echo_cities(int, int) to authenticated;
