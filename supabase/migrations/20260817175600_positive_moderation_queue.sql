-- Step 3: Positive-only filter + moderation queue
-- Hard-block toxic language at write; soft-hide negative content for public reads.
-- observation_id is bigint (observations.id is a bigint identity column, not uuid) --
-- the original draft of this migration declared it uuid and could never be applied;
-- this corrected version is what actually shipped to the live database.

alter table observations
  add column if not exists moderation_status text not null default 'visible'
    check (moderation_status in ('visible', 'auto_hidden', 'flagged', 'removed', 'approved')),
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz;

create index if not exists idx_observations_moderation_status
  on observations(moderation_status);

create table if not exists moderation_queue (
  id uuid primary key default gen_random_uuid(),
  observation_id bigint references observations(id) on delete cascade,
  daily_checkin_id uuid references daily_checkins(id) on delete cascade,
  source text not null check (source in ('observation', 'daily_checkin', 'user_flag')),
  reason text not null,
  snippet text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'removed', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(user_id) on delete set null,
  constraint moderation_queue_has_target check (
    observation_id is not null or daily_checkin_id is not null
  )
);

create index if not exists idx_moderation_queue_status on moderation_queue(status);
create index if not exists idx_moderation_queue_created on moderation_queue(created_at desc);

alter table moderation_queue enable row level security;

drop policy if exists "moderation_queue_insert_authenticated" on moderation_queue;
create policy "moderation_queue_insert_authenticated" on moderation_queue
  for insert to authenticated with check (true);

grant insert on moderation_queue to authenticated;

create or replace function moderate_observation_text(p_text text)
returns json
language plpgsql
immutable
as $$
declare
  lower_text text := lower(coalesce(p_text, ''));
  hard text[] := array[
    'nigger','nigga','faggot','fag','retard','retarded','chink','spic','kike','gook','tranny','coon',
    'kill yourself','kys','rape you','i will kill','going to kill'
  ];
  soft text[] := array[
    'everything sucks','this city is dead','hate this place','worst day ever','i hate this',
    'want to die','kill myself','nothing matters','life is pointless','this place is trash',
    'absolute dump','horrible city','disgusting city'
  ];
  w text;
begin
  if lower_text = '' then
    return json_build_object('action', 'allow', 'reason', null);
  end if;

  foreach w in array hard loop
    if position(w in lower_text) > 0 then
      return json_build_object('action', 'block', 'reason', 'hard_block');
    end if;
  end loop;

  foreach w in array soft loop
    if position(w in lower_text) > 0 then
      return json_build_object('action', 'auto_hide', 'reason', 'negative_language');
    end if;
  end loop;

  return json_build_object('action', 'allow', 'reason', null);
end;
$$;

grant execute on function moderate_observation_text(text) to authenticated;
grant execute on function moderate_observation_text(text) to anon;

create or replace function flag_observation(p_observation_id bigint, p_reason text default 'user_flag')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_note text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select note into v_note from observations where id = p_observation_id;
  if not found then
    raise exception 'not_found';
  end if;

  update observations
  set moderation_status = case
      when moderation_status = 'removed' then 'removed'
      else 'flagged'
    end,
    moderation_reason = coalesce(p_reason, 'user_flag'),
    moderated_at = now()
  where id = p_observation_id;

  insert into moderation_queue (observation_id, source, reason, snippet, status)
  values (p_observation_id, 'user_flag', coalesce(p_reason, 'user_flag'), left(coalesce(v_note, ''), 200), 'pending');

  return json_build_object('ok', true);
end;
$$;

grant execute on function flag_observation(bigint, text) to authenticated;

create or replace function resolve_moderation_item(
  p_queue_id uuid,
  p_decision text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_obs bigint;
  v_status text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_decision not in ('approved', 'removed', 'dismissed') then
    raise exception 'invalid_decision';
  end if;

  select observation_id into v_obs
  from moderation_queue
  where id = p_queue_id and status = 'pending'
  for update;

  if not found then
    raise exception 'not_found_or_resolved';
  end if;

  update moderation_queue
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by = v_uid
  where id = p_queue_id;

  if v_obs is not null then
    if p_decision = 'approved' then
      v_status := 'approved';
    elsif p_decision = 'removed' then
      v_status := 'removed';
    else
      v_status := 'visible';
    end if;

    update observations
    set moderation_status = v_status,
        moderated_at = now()
    where id = v_obs;
  end if;

  return json_build_object('ok', true, 'decision', p_decision);
end;
$$;

grant execute on function resolve_moderation_item(uuid, text) to authenticated;
