-- Real admin access, replacing a PIN that was a constant in client-side
-- JavaScript on a public page.
--
-- Two parts:
--   1. is_admin on profiles, defaulting to false, so nobody is an admin
--      until deliberately made one.
--   2. security definer functions that return AGGREGATES ONLY, and refuse
--      to run for anyone who is not an admin.
--
-- Why functions rather than a read policy on analytics_events: a read
-- policy would let an admin's browser pull every raw row. The dashboard
-- only ever needs counts, so counts are all that can be fetched. There is
-- no endpoint that returns the raw table to a browser.
--
-- Idempotent. PostgreSQL has no `create policy if not exists`, so policies
-- are dropped first; do not replace that with the syntax that does not
-- exist.

-- ===== 1. the flag =====
alter table if exists profiles
  add column if not exists is_admin boolean not null default false;

comment on column profiles.is_admin is
  'Grants access to the admin dashboard. Set by hand in the SQL editor; there is no interface that can grant it.';

-- ===== 2. the guard =====
-- Used by every function below. security definer so it can read profiles
-- regardless of the caller's own row-level permissions, and search_path is
-- pinned so the function cannot be redirected by a caller-set path.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from profiles p where p.user_id = auth.uid()),
    false
  );
$$;

grant execute on function is_admin() to authenticated;

-- ===== 3. the numbers =====

-- Headline counts over a window, in one round trip.
create or replace function admin_overview(days int default 7)
returns table (
  metric text,
  value bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorised';
  end if;

  return query
  with win as (select now() - make_interval(days => greatest(days, 1)) as since)
  select 'checkins'::text,        count(*)::bigint from analytics_events, win
    where event = 'checkin' and created_at >= win.since
  union all
  select 'cities_active'::text,   count(distinct city_slug)::bigint from analytics_events, win
    where event = 'checkin' and created_at >= win.since and city_slug is not null
  union all
  select 'installs'::text,        count(*)::bigint from analytics_events, win
    where event = 'install' and created_at >= win.since
  union all
  select 'prompt_shown'::text,    count(*)::bigint from analytics_events, win
    where event = 'install_prompt_shown' and created_at >= win.since
  union all
  select 'prompt_dismissed'::text, count(*)::bigint from analytics_events, win
    where event = 'install_prompt_dismissed' and created_at >= win.since
  union all
  select 'sessions'::text,        count(*)::bigint from analytics_events, win
    where event = 'session' and created_at >= win.since
  union all
  -- The one that separates a home-screen launch from a browser tab.
  select 'sessions_standalone'::text, count(*)::bigint from analytics_events, win
    where event = 'session' and display_mode = 'standalone' and created_at >= win.since
  union all
  select 'signed_up'::text,       count(*)::bigint from profiles, win
    where created_at >= win.since;
end;
$$;

grant execute on function admin_overview(int) to authenticated;

-- Check-ins per city, busiest first. This is the number the whole model
-- rests on, so it is readable one city at a time rather than only in total.
create or replace function admin_checkins_by_city(days int default 7, max_rows int default 50)
returns table (
  city_slug text,
  checkins bigint,
  last_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorised';
  end if;

  return query
  select e.city_slug, count(*)::bigint, max(e.created_at)
  from analytics_events e
  where e.event = 'checkin'
    and e.city_slug is not null
    and e.created_at >= now() - make_interval(days => greatest(days, 1))
  group by e.city_slug
  order by count(*) desc, max(e.created_at) desc
  limit greatest(max_rows, 1);
end;
$$;

grant execute on function admin_checkins_by_city(int, int) to authenticated;

-- Daily totals, so a trend is visible rather than a single number.
create or replace function admin_daily(days int default 14)
returns table (
  day date,
  checkins bigint,
  sessions bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorised';
  end if;

  return query
  select d::date,
         count(*) filter (where e.event = 'checkin')::bigint,
         count(*) filter (where e.event = 'session')::bigint
  from generate_series(
         (now() - make_interval(days => greatest(days, 1)))::date,
         now()::date,
         '1 day'
       ) d
  left join analytics_events e on e.created_at::date = d::date
  group by d
  order by d;
end;
$$;

grant execute on function admin_daily(int) to authenticated;
