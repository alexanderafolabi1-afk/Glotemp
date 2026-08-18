-- Temp-Reporter status: a quiet, premium recognition tier for people who
-- check in consistently, built entirely on top of what the platform
-- already tracks (profiles.longest_streak, profiles.total_daily_checkins,
-- and every observation a person has posted). No new user action, no
-- points to chase, no leaderboard -- a tier is earned once and kept, the
-- same "graceful acknowledgement" register as verify_method's "Established"
-- badge, not a game.
--
-- WHY longest_streak, NOT current_streak
-- current_streak resets the day someone misses a check-in. Tying status to
-- it would strip a badge the moment life gets in the way, which reads as
-- punitive, not premium. longest_streak is a permanent personal-best, so
-- once a tier is earned it stays -- consistent with "graceful public
-- acknowledgement" rather than a leash.
--
-- WHY A MAINTAINED COUNTER, NOT A LIVE COUNT AT READ TIME
-- The check-in list embeds profiles(display_name, ...) via PostgREST,
-- which needs real columns, not a per-row function call. total_contributions
-- is kept in sync by triggers on the two tables a contribution can land in,
-- so reads stay a plain column lookup.

-- ===== 1. the counter =====
alter table profiles
  add column if not exists total_contributions integer not null default 0;

-- Backfill once from what already exists. Triggers take over from here.
update profiles p
set total_contributions =
  coalesce((select count(*) from observations o where o.user_id = p.user_id), 0)
  + coalesce(p.total_daily_checkins, 0)
where true;

create or replace function bump_contribution_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    update profiles set total_contributions = total_contributions + 1 where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bump_contrib_observations on observations;
create trigger trg_bump_contrib_observations
  after insert on observations
  for each row execute function bump_contribution_count();

drop trigger if exists trg_bump_contrib_daily on daily_checkins;
create trigger trg_bump_contrib_daily
  after insert on daily_checkins
  for each row execute function bump_contribution_count();

-- ===== 2. the tier =====
-- Three quiet tiers. Thresholds are an "or" of streak-discipline and
-- raw volume, so both a patient daily ritual and a highly active city
-- contributor earn recognition on their own terms.
alter table profiles
  add column if not exists reporter_tier text generated always as (
    case
      when greatest(coalesce(longest_streak, 0), 0) >= 90 or coalesce(total_contributions, 0) >= 200
        then 'chief_correspondent'
      when greatest(coalesce(longest_streak, 0), 0) >= 30 or coalesce(total_contributions, 0) >= 50
        then 'senior_reporter'
      when greatest(coalesce(longest_streak, 0), 0) >= 7 or coalesce(total_contributions, 0) >= 10
        then 'temp_reporter'
      else null
    end
  ) stored;

comment on column profiles.reporter_tier is
  'Quiet, permanent recognition tier derived from longest_streak and total_contributions. Null = no tier yet, which carries no penalty.';
comment on column profiles.total_contributions is
  'observations + daily_checkins ever posted by this user. Maintained by triggers on both tables; never decremented.';
