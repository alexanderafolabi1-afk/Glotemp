-- Daily personal check-in ritual + streak tracking (Step 2)
-- One check-in per calendar day per authenticated user.
-- Complements (does not replace) per-city observations.

-- ===== PROFILE STREAK FIELDS =====
alter table profiles
  add column if not exists current_streak integer not null default 0,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists last_daily_checkin date,
  add column if not exists total_daily_checkins integer not null default 0;

-- ===== DAILY_CHECKINS =====
create table if not exists daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  checkin_date date not null,
  mood text not null check (mood in ('charged', 'warm', 'steady', 'restrained', 'low')),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  constraint daily_checkins_user_date_unique unique (user_id, checkin_date)
);

create index if not exists idx_daily_checkins_user_id on daily_checkins(user_id);
create index if not exists idx_daily_checkins_checkin_date on daily_checkins(checkin_date desc);

alter table daily_checkins enable row level security;

drop policy if exists "daily_checkins_select_own" on daily_checkins;
create policy "daily_checkins_select_own" on daily_checkins
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "daily_checkins_insert_own" on daily_checkins;
create policy "daily_checkins_insert_own" on daily_checkins
  for insert to authenticated with check (auth.uid() = user_id);

grant select, insert on daily_checkins to authenticated;

-- ===== RPC: record_daily_checkin =====
create or replace function record_daily_checkin(p_mood text, p_note text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (timezone('utc', now()))::date;
  v_last date;
  v_current int;
  v_longest int;
  v_total int;
  v_note text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_mood is null or p_mood not in ('charged', 'warm', 'steady', 'restrained', 'low') then
    raise exception 'invalid_mood';
  end if;

  v_note := nullif(trim(p_note), '');
  if v_note is not null and char_length(v_note) > 280 then
    raise exception 'note_too_long';
  end if;

  if exists (
    select 1 from daily_checkins
    where user_id = v_uid and checkin_date = v_today
  ) then
    raise exception 'already_checked_in_today';
  end if;

  insert into daily_checkins (user_id, checkin_date, mood, note)
  values (v_uid, v_today, p_mood, v_note);

  select last_daily_checkin, current_streak, longest_streak, total_daily_checkins
    into v_last, v_current, v_longest, v_total
  from profiles
  where user_id = v_uid
  for update;

  if not found then
    raise exception 'profile_missing';
  end if;

  if v_last is null then
    v_current := 1;
  elsif v_last = v_today - 1 then
    v_current := coalesce(v_current, 0) + 1;
  elsif v_last = v_today then
    v_current := greatest(coalesce(v_current, 1), 1);
  else
    v_current := 1;
  end if;

  v_longest := greatest(coalesce(v_longest, 0), v_current);
  v_total := coalesce(v_total, 0) + 1;

  update profiles
  set
    current_streak = v_current,
    longest_streak = v_longest,
    last_daily_checkin = v_today,
    total_daily_checkins = v_total
  where user_id = v_uid;

  return json_build_object(
    'current_streak', v_current,
    'longest_streak', v_longest,
    'total_daily_checkins', v_total,
    'checkin_date', v_today,
    'mood', p_mood
  );
end;
$$;

grant execute on function record_daily_checkin(text, text) to authenticated;
