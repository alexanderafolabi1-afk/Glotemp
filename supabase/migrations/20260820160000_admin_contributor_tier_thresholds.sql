-- Final thresholds for the private admin-only contributor tiers (Voice /
-- Keeper / Founder), fixed by the site owner, replacing the provisional
-- total_daily_checkins + longest_streak formula from
-- 20260820150000_admin_contributor_tiers.sql:
--   Voice:   1+ check-in
--   Keeper:  5+ check-ins across at least 3 different days
--   Founder: 15+ check-ins across at least 4 different weeks
--
-- "across at least N different days/weeks" can't be read off
-- profiles.total_daily_checkins/longest_streak -- neither carries week
-- distribution -- so this queries daily_checkins directly instead: per
-- user, count(*) (total check-ins), count(distinct checkin_date)
-- (distinct days -- daily_checkins holds at most one row per user per
-- day already, so in practice this equals count(*), but it's computed
-- explicitly rather than assumed, since the brief names "days" on its
-- own terms), and count(distinct date_trunc('week', checkin_date))
-- (distinct ISO weeks -- date_trunc buckets by the week's Monday, which
-- is correct across year boundaries, unlike a bare extract(week)).
--
-- REVIEW TRIGGER, NOT A BLOCKER NOW -- so this doesn't become a repeated
-- blind guess
-- These thresholds were fixed without a real usage distribution to check
-- them against (6 profiles existed at the time, every one at zero
-- check-ins -- see the prior migration's own note). Revisit once there
-- is roughly 60 days of real daily_checkins data. A HEALTHY distribution
-- at that point looks roughly like: most users sitting at Voice or no
-- tier at all, a meaningful minority reaching Keeper, and a small,
-- genuinely dedicated group at Founder -- a steep drop-off at each step,
-- not three roughly-even bands. If admin_contributor_tier_counts() comes
-- back close to even across the three, or with most people already at
-- Founder, or almost nobody past Voice, that is the signal these
-- constants are miscalibrated -- an actual comparison against real
-- numbers next time, not a guess from scratch again.
drop function if exists admin_contributor_tier(integer, integer);
drop function if exists admin_top_contributors(text, int);

create or replace function admin_contributor_tier(
  p_total_checkins integer,
  p_distinct_days integer,
  p_distinct_weeks integer
)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_total_checkins, 0) >= 15 and coalesce(p_distinct_weeks, 0) >= 4
      then 'founder'
    when coalesce(p_total_checkins, 0) >= 5 and coalesce(p_distinct_days, 0) >= 3
      then 'keeper'
    when coalesce(p_total_checkins, 0) >= 1
      then 'voice'
    else null
  end;
$$;

comment on function admin_contributor_tier(integer, integer, integer) is
  'Private admin-only tier (voice/keeper/founder). Voice: 1+ check-in. Keeper: 5+ check-ins across >=3 distinct days. Founder: 15+ check-ins across >=4 distinct weeks. Fixed by the site owner 2026-08-20 without a real usage distribution -- review once ~60 days of real daily_checkins data exists; see this migration''s header for what a healthy distribution should look like. Never exposed publicly; profiles.reporter_tier is the separate, public-facing tier.';

-- Aggregate-only counts per tier, same is_admin()-gated security-definer
-- pattern as admin_overview.
create or replace function admin_contributor_tier_counts()
returns table (
  tier text,
  members bigint
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
  with agg as (
    select
      user_id,
      count(*)::integer as total_checkins,
      count(distinct checkin_date)::integer as distinct_days,
      count(distinct date_trunc('week', checkin_date))::integer as distinct_weeks
    from daily_checkins
    group by user_id
  )
  select t.tier, count(*)::bigint
  from (
    select admin_contributor_tier(agg.total_checkins, agg.distinct_days, agg.distinct_weeks) as tier
    from agg
  ) t
  where t.tier is not null
  group by t.tier;
end;
$$;

grant execute on function admin_contributor_tier_counts() to authenticated;

-- Top contributors within a tier (or every tiered contributor, if
-- p_tier is null) -- curated, capped listing via a function, same shape
-- as admin_checkins_by_city, not a raw table read. display_name only.
create or replace function admin_top_contributors(p_tier text default null, max_rows int default 20)
returns table (
  display_name text,
  tier text,
  total_checkins integer,
  distinct_days integer,
  distinct_weeks integer
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
  with agg as (
    select
      user_id,
      count(*)::integer as total_checkins,
      count(distinct checkin_date)::integer as distinct_days,
      count(distinct date_trunc('week', checkin_date))::integer as distinct_weeks
    from daily_checkins
    group by user_id
  )
  select
    coalesce(p.display_name, 'Unnamed'),
    admin_contributor_tier(agg.total_checkins, agg.distinct_days, agg.distinct_weeks),
    agg.total_checkins,
    agg.distinct_days,
    agg.distinct_weeks
  from agg
  join profiles p on p.user_id = agg.user_id
  where admin_contributor_tier(agg.total_checkins, agg.distinct_days, agg.distinct_weeks) is not null
    and (p_tier is null or admin_contributor_tier(agg.total_checkins, agg.distinct_days, agg.distinct_weeks) = p_tier)
  order by agg.total_checkins desc, agg.distinct_weeks desc
  limit greatest(max_rows, 1);
end;
$$;

grant execute on function admin_top_contributors(text, int) to authenticated;
