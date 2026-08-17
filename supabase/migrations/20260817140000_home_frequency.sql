-- Home Frequency: a private, sign-in-gated daily ritual. Pick one city to
-- keep, and once a day get a short, quiet "letter from the city" -- its
-- live Pulse, the time and sky there, one radio station, one line of what
-- the local press is reporting, and a place to leave yourself a note.
-- Fully private: nobody else's Home Frequency, streak, or note is ever
-- readable, which is the point -- this is a companion, not a leaderboard.
--
-- Same streak shape as daily_checkins/record_daily_checkin: current_streak
-- resets on a missed day, longest_streak never does. Changing which city
-- is "home" does not reset the streak -- the ritual being tracked is
-- coming back daily, not staying loyal to one city forever.

-- ===== 1. profile fields =====
alter table profiles
  add column if not exists home_frequency_city text,
  add column if not exists home_frequency_pref text not null default 'morning',
  add column if not exists home_frequency_streak integer not null default 0,
  add column if not exists home_frequency_longest_streak integer not null default 0,
  add column if not exists home_frequency_last_opened date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_home_frequency_pref_check'
  ) then
    alter table profiles
      add constraint profiles_home_frequency_pref_check
      check (home_frequency_pref in ('morning', 'evening'));
  end if;
end $$;

comment on column profiles.home_frequency_city is
  'The one city a signed-in user has chosen to keep. Nothing here is public.';

-- ===== 2. the private note =====
create table if not exists home_frequency_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  note_date date not null,
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_frequency_notes_user_date_unique unique (user_id, note_date)
);

create index if not exists idx_home_frequency_notes_user_date
  on home_frequency_notes(user_id, note_date desc);

alter table home_frequency_notes enable row level security;

drop policy if exists "home_frequency_notes_select_own" on home_frequency_notes;
create policy "home_frequency_notes_select_own" on home_frequency_notes
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "home_frequency_notes_insert_own" on home_frequency_notes;
create policy "home_frequency_notes_insert_own" on home_frequency_notes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "home_frequency_notes_update_own" on home_frequency_notes;
create policy "home_frequency_notes_update_own" on home_frequency_notes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on home_frequency_notes to authenticated;

-- ===== 3. RPC: one call opens today's letter, optionally changes the
-- city/preference, optionally saves today's note, and always returns the
-- current streak state. =====
create or replace function open_home_frequency(
  p_city_slug text default null,
  p_preference text default null,
  p_note text default null
)
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
  v_city text;
  v_pref text;
  v_note text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_preference is not null and p_preference not in ('morning', 'evening') then
    raise exception 'invalid_preference';
  end if;

  v_note := nullif(trim(p_note), '');
  if v_note is not null and char_length(v_note) > 280 then
    raise exception 'note_too_long';
  end if;

  select home_frequency_city, home_frequency_pref, home_frequency_last_opened,
         home_frequency_streak, home_frequency_longest_streak
    into v_city, v_pref, v_last, v_current, v_longest
  from profiles
  where user_id = v_uid
  for update;

  if not found then
    raise exception 'profile_missing';
  end if;

  if p_city_slug is not null and length(trim(p_city_slug)) > 0 then
    v_city := trim(p_city_slug);
  end if;
  if p_preference is not null then
    v_pref := p_preference;
  end if;

  if v_last is null then
    v_current := 1;
  elsif v_last = v_today then
    v_current := greatest(coalesce(v_current, 1), 1);
  elsif v_last = v_today - 1 then
    v_current := coalesce(v_current, 0) + 1;
  else
    v_current := 1;
  end if;
  v_longest := greatest(coalesce(v_longest, 0), v_current);

  update profiles
  set
    home_frequency_city = v_city,
    home_frequency_pref = coalesce(v_pref, 'morning'),
    home_frequency_streak = v_current,
    home_frequency_longest_streak = v_longest,
    home_frequency_last_opened = v_today
  where user_id = v_uid;

  if v_note is not null then
    insert into home_frequency_notes (user_id, note_date, note)
    values (v_uid, v_today, v_note)
    on conflict (user_id, note_date)
    do update set note = excluded.note, updated_at = now();
  end if;

  return json_build_object(
    'city_slug', v_city,
    'preference', coalesce(v_pref, 'morning'),
    'streak', v_current,
    'longest_streak', v_longest,
    'note', v_note
  );
end;
$$;

grant execute on function open_home_frequency(text, text, text) to authenticated;
