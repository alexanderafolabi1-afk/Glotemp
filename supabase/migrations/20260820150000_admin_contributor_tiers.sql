-- Private, admin-only contributor tiers: Voice / Keeper / Founder.
--
-- NOT the public Temp-Reporter system (profiles.reporter_tier /
-- glotemp-reporter.js -- temp_reporter / senior_reporter /
-- chief_correspondent). That tier is shown publicly next to names on
-- check-ins. This one is the opposite: computed here, visible only in
-- /admin, never returned by any public-facing query or RPC, never
-- attached to a display name anywhere a visitor can see it. Two
-- deliberately separate systems so a change to one can never leak into
-- the other.
--
-- Built entirely on columns the platform already maintains
-- (total_daily_checkins, longest_streak) -- no new per-user table, no
-- parallel counter to keep in sync. longest_streak rather than
-- current_streak for the same reason the public tier uses it: a missed
-- day resetting current_streak to 0 would be a punitive thing to key a
-- private classification on.
--
-- THRESHOLDS ARE PROVISIONAL, NOT DATA-DERIVED -- SAID PLAINLY
-- The actual live distribution at the time this migration was written:
-- 6 profiles total, every one at total_daily_checkins = 0 and
-- longest_streak = 0. There is no real usage yet to derive a percentile
-- or distribution-based cutoff from, and the brief for this migration was
-- explicit that thresholds must come from real data, not invented round
-- numbers. These three constants are therefore a starting heuristic only
-- -- loosely following the order of magnitude already established by
-- profiles.reporter_tier's own streak thresholds (7 / 30 / 90 days) since
-- that is this product's only real precedent for "how much habitual
-- check-in activity earns which level of recognition" -- and are named
-- constants specifically so they are easy to find and revise once there
-- is an actual distribution to look at. Revisit them then.
create or replace function admin_contributor_tier(
  p_total_daily_checkins integer,
  p_longest_streak integer
)
returns text
language sql
immutable
as $$
  select case
    when greatest(coalesce(p_longest_streak, 0), 0) >= 30 or coalesce(p_total_daily_checkins, 0) >= 30
      then 'founder'
    when greatest(coalesce(p_longest_streak, 0), 0) >= 7 or coalesce(p_total_daily_checkins, 0) >= 7
      then 'keeper'
    when coalesce(p_total_daily_checkins, 0) >= 1
      then 'voice'
    else null
  end;
$$;

comment on function admin_contributor_tier(integer, integer) is
  'Private admin-only tier (voice/keeper/founder) from total_daily_checkins + longest_streak. Provisional starter thresholds -- see this migration''s header. Never exposed publicly; profiles.reporter_tier is the separate, public-facing tier.';

-- Aggregate-only counts per tier, same is_admin()-gated security-definer
-- pattern as admin_overview -- see 20260814090000_admin_role_and_stats.sql.
-- Returns counts, not rows: how many people are in each private tier
-- right now, nothing that identifies who.
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
  select t.tier, count(*)::bigint
  from (
    select admin_contributor_tier(p.total_daily_checkins, p.longest_streak) as tier
    from profiles p
  ) t
  where t.tier is not null
  group by t.tier;
end;
$$;

grant execute on function admin_contributor_tier_counts() to authenticated;

-- Top contributors within a tier (or every tiered contributor, if
-- p_tier is null) -- a curated, capped listing via a function, the same
-- shape as admin_checkins_by_city, not a raw table read. display_name
-- only; no email, no user_id exposed.
create or replace function admin_top_contributors(p_tier text default null, max_rows int default 20)
returns table (
  display_name text,
  tier text,
  total_daily_checkins integer,
  longest_streak integer,
  current_streak integer
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
  select
    coalesce(p.display_name, 'Unnamed'),
    admin_contributor_tier(p.total_daily_checkins, p.longest_streak),
    coalesce(p.total_daily_checkins, 0),
    coalesce(p.longest_streak, 0),
    coalesce(p.current_streak, 0)
  from profiles p
  where admin_contributor_tier(p.total_daily_checkins, p.longest_streak) is not null
    and (p_tier is null or admin_contributor_tier(p.total_daily_checkins, p.longest_streak) = p_tier)
  order by coalesce(p.total_daily_checkins, 0) desc, coalesce(p.longest_streak, 0) desc
  limit greatest(max_rows, 1);
end;
$$;

grant execute on function admin_top_contributors(text, int) to authenticated;
