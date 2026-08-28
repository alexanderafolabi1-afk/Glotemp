-- Part 1, Pulse Streaks: extends get_my_stars() (never a new, parallel
-- RPC) with a real, self-scoped count of distinct cities this user has
-- actually checked into. Same privacy scope as every other field this
-- function already returns: security definer, gated on auth.uid(),
-- never queryable for anyone but the caller -- private, not a public
-- leaderboard or streak display (that is a separate decision, not made
-- here).
--
-- CREATE OR REPLACE FUNCTION cannot change a function's RETURNS TABLE
-- column list, so the old signature is dropped first. The one existing
-- caller (glotemp-auth.js's getMyStars()) already reads the return row
-- as a plain object keyed by column name, so adding a column is
-- additive from the client's point of view.
drop function if exists get_my_stars();

create function get_my_stars()
returns table (
  checkin_stars integer,
  referral_stars integer,
  total_stars integer,
  referral_code text,
  cities_checked_into integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_checkin_days integer;
  v_referral_bonus integer;
  v_code text;
  v_cities integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select count(distinct checkin_date) into v_checkin_days
  from daily_checkins where user_id = auth.uid();

  select coalesce(sum(stars_each), 0) into v_referral_bonus
  from referrals
  where completed_at is not null
    and (inviter_user_id = auth.uid() or invited_user_id = auth.uid());

  select p.referral_code into v_code from profiles p where p.user_id = auth.uid();

  select count(distinct city_slug) into v_cities
  from observations where user_id = auth.uid();

  return query select
    coalesce(v_checkin_days, 0),
    coalesce(v_referral_bonus, 0),
    coalesce(v_checkin_days, 0) + coalesce(v_referral_bonus, 0),
    v_code,
    coalesce(v_cities, 0);
end;
$$;
