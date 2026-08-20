-- Admin analytics: cookieless, aggregate-only, no personal data retained.
--
-- LAWFULNESS
-- Nothing here is a cookie or a device identifier, so PECR's consent rule
-- for terminal-equipment storage is not engaged. Nothing here identifies a
-- person: the IP address is used once, in memory, inside the collector
-- edge function, to derive a two-letter country, and is then discarded --
-- it is never sent to the database and there is no column that could hold
-- it. There is no visitor id, no session id, no fingerprint and no
-- cross-page linkage, so no visitor profile can be constructed from this
-- table even in principle.
--
-- The referrer is stored as a bare host ("news.ycombinator.com"), never a
-- full URL, so a referring page's own query string cannot leak in.
--
-- WHY THESE COLUMNS ARE NULLABLE
-- analytics_events already exists and already carries rows. Adding NOT
-- NULL columns would either fail or require backfilling values nobody
-- measured. Every column below is nullable and every aggregate treats null
-- as "not recorded", which is honest about rows written before this ran.

alter table analytics_events add column if not exists country char(2);
alter table analytics_events add column if not exists referrer_host text;
alter table analytics_events add column if not exists device text
  check (device is null or device in ('mobile', 'tablet', 'desktop'));

-- Belt and braces: make it structurally impossible to store an address,
-- so a future careless insert cannot quietly start collecting one.
alter table analytics_events drop column if exists ip;
alter table analytics_events drop column if exists ip_address;

comment on column analytics_events.country is
  'Two-letter country derived from the request IP inside the collector and then discarded. The address itself is never stored.';
comment on column analytics_events.referrer_host is
  'Bare referring host only. Never a path and never a query string.';

create index if not exists idx_analytics_events_pageview
  on analytics_events (created_at desc)
  where event = 'page_view';

-- ---------------------------------------------------------------------
-- Everything below is admin-only. is_admin() already exists.
-- ---------------------------------------------------------------------

-- Visitors per day. "Visitors" here means page views, deliberately: with
-- no identifier of any kind there is no way to count people, and inventing
-- a number that looks like unique visitors would be a lie.
create or replace function admin_traffic_daily(days int default 30)
returns table (day date, views bigint)
language sql
security definer
set search_path = public
as $$
  select d::date as day,
         coalesce(count(a.id), 0) as views
  from generate_series(
         (now() at time zone 'UTC')::date - (greatest(days, 1) - 1),
         (now() at time zone 'UTC')::date,
         interval '1 day') as d
  left join analytics_events a
    on a.event = 'page_view'
   and (a.created_at at time zone 'UTC')::date = d::date
  where is_admin()
  group by d
  order by d;
$$;

create or replace function admin_traffic_totals()
returns table (metric text, value bigint)
language sql
security definer
set search_path = public
as $$
  select * from (
    values
      ('today', (select count(*) from analytics_events
                 where event = 'page_view'
                   and (created_at at time zone 'UTC')::date = (now() at time zone 'UTC')::date)),
      ('week',  (select count(*) from analytics_events
                 where event = 'page_view' and created_at >= now() - interval '7 days')),
      ('month', (select count(*) from analytics_events
                 where event = 'page_view' and created_at >= now() - interval '30 days')),
      ('prev_week', (select count(*) from analytics_events
                 where event = 'page_view'
                   and created_at >= now() - interval '14 days'
                   and created_at <  now() - interval '7 days'))
  ) as t(metric, value)
  where is_admin();
$$;

-- Top pages, referrers and countries. One shape, three groupings, so the
-- dashboard renders them all through the same list component.
create or replace function admin_traffic_top(dimension text, days int default 30, max_rows int default 8)
returns table (label text, count bigint)
language sql
security definer
set search_path = public
as $$
  select
    case dimension
      when 'path' then coalesce(nullif(path, ''), '/')
      when 'referrer' then coalesce(nullif(referrer_host, ''), 'direct')
      when 'country' then coalesce(nullif(country, ''), 'unknown')
      when 'device' then coalesce(nullif(device, ''), 'unknown')
    end as label,
    count(*) as count
  from analytics_events
  where is_admin()
    and event = 'page_view'
    and created_at >= now() - make_interval(days => greatest(days, 1))
    and dimension in ('path', 'referrer', 'country', 'device')
  group by 1
  having case dimension
      when 'path' then coalesce(nullif(path, ''), '/')
      when 'referrer' then coalesce(nullif(referrer_host, ''), 'direct')
      when 'country' then coalesce(nullif(country, ''), 'unknown')
      when 'device' then coalesce(nullif(device, ''), 'unknown')
    end is not null
  order by count desc
  limit greatest(max_rows, 1);
$$;

-- Signups per day, and where each one came from. profiles.created_at is
-- the signup moment; the country and landing path come from the page_view
-- closest before it, which is the only join available without storing a
-- visitor id -- and it is explicitly approximate, which is why the
-- dashboard labels the column "likely".
create or replace function admin_signups_daily(days int default 30)
returns table (day date, signups bigint)
language sql
security definer
set search_path = public
as $$
  select d::date as day,
         coalesce(count(p.id), 0) as signups
  from generate_series(
         (now() at time zone 'UTC')::date - (greatest(days, 1) - 1),
         (now() at time zone 'UTC')::date,
         interval '1 day') as d
  left join profiles p
    on (p.created_at at time zone 'UTC')::date = d::date
  where is_admin()
  group by d
  order by d;
$$;

create or replace function admin_signup_sources(days int default 30, max_rows int default 20)
returns table (created_at timestamptz, country char(2), path text)
language sql
security definer
set search_path = public
as $$
  select p.created_at,
         nearest.country,
         nearest.path
  from profiles p
  left join lateral (
    select a.country, a.path
    from analytics_events a
    where a.event = 'page_view'
      and a.created_at <= p.created_at
      and a.created_at >= p.created_at - interval '30 minutes'
    order by a.created_at desc
    limit 1
  ) as nearest on true
  where is_admin()
    and p.created_at >= now() - make_interval(days => greatest(days, 1))
  order by p.created_at desc
  limit greatest(max_rows, 1);
$$;

-- ---------------------------------------------------------------------
-- System: are the scheduled jobs actually running?
-- ---------------------------------------------------------------------
-- Reads pg_cron's own run log. Wrapped in a block that degrades to an
-- empty set where pg_cron is not installed, so this migration applies on a
-- database that does not have it rather than failing outright.
create or replace function admin_job_health(max_rows int default 20)
returns table (
  jobname text,
  schedule text,
  active boolean,
  last_run timestamptz,
  last_status text,
  failures_24h bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    return;
  end if;

  if to_regclass('cron.job') is null then
    return;   -- pg_cron absent: no rows, and the panel says so
  end if;

  return query
  select j.jobname::text,
         j.schedule::text,
         j.active,
         latest.start_time,
         latest.status::text,
         coalesce(fails.n, 0)
  from cron.job j
  left join lateral (
    select r.start_time, r.status
    from cron.job_run_details r
    where r.jobid = j.jobid
    order by r.start_time desc
    limit 1
  ) as latest on true
  left join lateral (
    select count(*) as n
    from cron.job_run_details r
    where r.jobid = j.jobid
      and r.status <> 'succeeded'
      and r.start_time >= now() - interval '24 hours'
  ) as fails on true
  order by coalesce(fails.n, 0) desc, j.jobname
  limit greatest(max_rows, 1);
end;
$$;

revoke all on function admin_traffic_daily(int) from public;
revoke all on function admin_traffic_totals() from public;
revoke all on function admin_traffic_top(text, int, int) from public;
revoke all on function admin_signups_daily(int) from public;
revoke all on function admin_signup_sources(int, int) from public;
revoke all on function admin_job_health(int) from public;

grant execute on function admin_traffic_daily(int) to authenticated;
grant execute on function admin_traffic_totals() to authenticated;
grant execute on function admin_traffic_top(text, int, int) to authenticated;
grant execute on function admin_signups_daily(int) to authenticated;
grant execute on function admin_signup_sources(int, int) to authenticated;
grant execute on function admin_job_health(int) to authenticated;
