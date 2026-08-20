-- Second bug caught in the same verification pass: get_my_stars()'s
-- RETURNS TABLE output column is itself named referral_code, which
-- PL/pgSQL exposes as an implicit variable inside the function body --
-- so `select referral_code into v_code from profiles ...` was ambiguous
-- between that variable and profiles.referral_code, and errored on every
-- call. Fixed by qualifying the column reference.
create or replace function get_my_stars()
returns table (
  checkin_stars integer,
  referral_stars integer,
  total_stars integer,
  referral_code text
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

  return query select
    coalesce(v_checkin_days, 0),
    coalesce(v_referral_bonus, 0),
    coalesce(v_checkin_days, 0) + coalesce(v_referral_bonus, 0),
    v_code;
end;
$$;
