-- Fixes a real bug caught during verification of 20260821090000_referral_stars.sql,
-- before any client code shipped against it: profiles.display_name is
-- NOT NULL. `insert into profiles (user_id, referral_code) values (...)
-- on conflict (user_id) do update ...` still has to build a valid
-- candidate row to test for conflict, and a row missing display_name
-- fails that NOT NULL check even when the row already exists and the
-- statement was always going to take the DO UPDATE branch. Confirmed
-- live: the exact same failure hit a genuine pre-existing profile row.
--
-- Fix: UPDATE-only, no insert branch. A profiles row cannot exist
-- without display_name, so ensure_referral_code()/mark_installed()
-- require a profiles row to already exist (the app itself already
-- requires this before a visitor is meaningfully "signed up" -- see
-- glotemp-auth.js's mandatory profile-setup modal) rather than trying to
-- half-create one. claim_referral() gets an explicit up-front check
-- instead of letting a missing profile surface as a foreign-key
-- exception -- consistent with its own stated rule that an invite link
-- landing before someone is a real member yet is a silent no-op, not an
-- error.
create or replace function ensure_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_result text;
  i int;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select referral_code into v_result from profiles where user_id = auth.uid();
  if v_result is not null then
    return v_result;
  end if;
  if not found then
    raise exception 'no profile yet -- complete sign-up first';
  end if;

  for i in 1..5 loop
    v_code := upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8));
    begin
      update profiles set referral_code = v_code
      where user_id = auth.uid() and referral_code is null
      returning referral_code into v_result;
      if v_result is not null then
        return v_result;
      end if;
      -- referral_code got set by a concurrent call between the select
      -- above and this update -- use whatever it ended up as.
      select referral_code into v_result from profiles where user_id = auth.uid();
      if v_result is not null then
        return v_result;
      end if;
    exception when unique_violation then
      -- code collision on the unique index -- retry with a new one
    end;
  end loop;

  raise exception 'could not allocate a referral code';
end;
$$;

create or replace function mark_installed()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  update profiles set installed_at = coalesce(installed_at, now())
  where user_id = auth.uid();

  if not found then
    raise exception 'no profile yet -- complete sign-up first';
  end if;

  perform try_complete_referral(auth.uid());
end;
$$;

create or replace function claim_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  if not exists (select 1 from profiles where user_id = auth.uid()) then
    return false;
  end if;

  if exists (select 1 from referrals where invited_user_id = auth.uid()) then
    return false;
  end if;

  select user_id into v_inviter from profiles where referral_code = p_code;
  if v_inviter is null or v_inviter = auth.uid() then
    return false;
  end if;

  insert into referrals (code, inviter_user_id, invited_user_id)
  values (p_code, v_inviter, auth.uid());

  perform try_complete_referral(auth.uid());
  return true;
exception when unique_violation then
  return false;
end;
$$;
