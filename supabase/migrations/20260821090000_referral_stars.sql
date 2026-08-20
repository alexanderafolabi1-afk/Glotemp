-- Referral stars, on the Option C foundation: a real, additive star total
-- (distinct check-in days + a one-time bonus per completed invite), shown
-- privately to the user themselves, layered on top of -- never a shortcut
-- around -- the Voice/Keeper/Founder day/week consistency gates already
-- shipped in 20260820160000_admin_contributor_tier_thresholds.sql. That
-- function and its thresholds are UNTOUCHED by this migration.
--
-- tempo-economy.js's reporters/total_stars/getRank() system is dead code
-- (confirmed: no `reporters` or `city_comments` table exists in this
-- database, and nothing in the codebase calls awardStars/getUserStars/
-- getTopReporters). This does not resurrect it, rename into it, or reuse
-- its table/column names. Built entirely fresh on the real auth.uid()
-- identity every other live table already uses.

-- ===== 1. referral code + install flag on profiles =====
alter table profiles
  add column if not exists referral_code text,
  add column if not exists installed_at timestamptz;

create unique index if not exists profiles_referral_code_key
  on profiles (referral_code) where referral_code is not null;

comment on column profiles.referral_code is
  'Short public per-user invite code, e.g. glo-temp.com/?ref=CODE. Lazily created by ensure_referral_code(); public by design (profiles is already publicly readable) -- sharing it is the point.';
comment on column profiles.installed_at is
  'Set by mark_installed() the first time this signed-in user''s browser fires the native appinstalled event. Distinct from the anonymous install counter in analytics_events -- this one is per-user and only exists to gate the referral install+checkin bonus.';

-- Generates (once) and returns the caller's own referral code. Upserts
-- rather than a bare UPDATE so it also works for a signed-in user who
-- has not completed profile setup yet and has no profiles row at all --
-- the first thing they get is a code, name/city can follow.
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

  for i in 1..5 loop
    v_code := upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8));
    begin
      insert into profiles (user_id, referral_code)
      values (auth.uid(), v_code)
      on conflict (user_id) do update
        set referral_code = coalesce(profiles.referral_code, excluded.referral_code)
      returning referral_code into v_result;
      return v_result;
    exception when unique_violation then
      -- referral_code collision on the unique index -- retry with a new one
    end;
  end loop;

  raise exception 'could not allocate a referral code';
end;
$$;

grant execute on function ensure_referral_code() to authenticated;

-- ===== 2. the invite itself =====
-- One row per successfully-claimed invite. No public insert/update policy
-- -- every write goes through claim_referral() / try_complete_referral()
-- below, which is where the actual validation (no self-referral, one
-- invite per invited person, ever) lives.
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  inviter_user_id uuid not null references profiles(user_id) on delete cascade,
  invited_user_id uuid not null references profiles(user_id) on delete cascade unique,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  stars_each integer
);

comment on table referrals is
  'One row per claimed invite. invited_user_id is unique -- a person can be credited to exactly one inviter, ever. completed_at is set only once BOTH sides of the bonus condition are met (installed_at is not null AND at least one daily_checkins row) -- see try_complete_referral(). stars_each snapshots the bonus actually awarded, so a later change to the constant never rewrites history.';

alter table referrals enable row level security;

drop policy if exists referrals_participant_select on referrals;
create policy referrals_participant_select on referrals
  for select to authenticated
  using (auth.uid() = inviter_user_id or auth.uid() = invited_user_id);

-- Checks whether an invited person's bonus condition is now met, and
-- awards it exactly once. Called from claim_referral() (in case install
-- or check-in already happened before the code was claimed -- unlikely
-- but not impossible if someone reinstalls) and from a trigger on
-- daily_checkins and from mark_installed(), since completion can be
-- reached from either direction and this is the one place that decides
-- it, idempotently (completed_at is null is the guard).
create or replace function try_complete_referral(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref_id uuid;
  v_installed boolean;
  v_checked_in boolean;
begin
  select id into v_ref_id from referrals
  where invited_user_id = p_user_id and completed_at is null;

  if v_ref_id is null then
    return;
  end if;

  select (installed_at is not null) into v_installed from profiles where user_id = p_user_id;
  select exists(select 1 from daily_checkins where user_id = p_user_id) into v_checked_in;

  if coalesce(v_installed, false) and coalesce(v_checked_in, false) then
    -- The bonus value. 5 stars a side -- roughly a Keeper-level check-in
    -- count in one event, a meaningful invite incentive without dwarfing
    -- the habit the tier ladder is actually measuring. Chosen, not
    -- derived (there is no referral history yet to derive it from);
    -- revisit alongside the tier thresholds once there's real data.
    update referrals set completed_at = now(), stars_each = 5 where id = v_ref_id;
  end if;
end;
$$;

-- Records that the caller's browser fired appinstalled.
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

  insert into profiles (user_id, installed_at)
  values (auth.uid(), now())
  on conflict (user_id) do update
    set installed_at = coalesce(profiles.installed_at, excluded.installed_at);

  perform try_complete_referral(auth.uid());
end;
$$;

grant execute on function mark_installed() to authenticated;

-- Claims an invite code for the signed-in caller. Returns true if the
-- claim was recorded, false if it could not be (no such code, the code
-- is the caller's own, or the caller has already been claimed by
-- someone). Never raises for those cases -- an invalid/expired/reused
-- referral link landing on the site is a normal, silent no-op, not an
-- error the visitor should see.
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

grant execute on function claim_referral(text) to authenticated;

-- A check-in can complete a referral that was claimed before the invited
-- person installed, or before they checked in -- either order is
-- possible, so both mark_installed() and this trigger call the same
-- idempotent completion check.
create or replace function trg_referral_on_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform try_complete_referral(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_daily_checkin_referral on daily_checkins;
create trigger trg_daily_checkin_referral
  after insert on daily_checkins
  for each row execute function trg_referral_on_checkin();

-- ===== 3. the private star total =====
-- Self-scoped by auth.uid() -- no is_admin() gate needed or wanted, since
-- this can only ever return the CALLER's own numbers. This is the only
-- place "stars" are computed for display; nothing public-facing calls it.
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

  select referral_code into v_code from profiles where user_id = auth.uid();

  return query select
    coalesce(v_checkin_days, 0),
    coalesce(v_referral_bonus, 0),
    coalesce(v_checkin_days, 0) + coalesce(v_referral_bonus, 0),
    v_code;
end;
$$;

grant execute on function get_my_stars() to authenticated;
