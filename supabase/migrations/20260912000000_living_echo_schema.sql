-- Living Echo: autonomous synthetic comment generation engine.
--
-- 100% ADDITIVE: no existing table, column, policy, function or index
-- is altered. All new objects are isolated under new names.
-- The one partial exception is city_comments -- two optional columns are
-- appended with nullable defaults, so every existing row stays valid and
-- every existing query that doesn't name these columns is unaffected.

-- ===== 1. EXTEND city_comments (nullable, safe) =====
-- is_synthetic: false for all organic rows (default null = organic for
--   backwards compat; the dashboard treats null and false identically).
-- persona_id:   FK to bot_personas, null for all organic rows.
alter table city_comments
  add column if not exists is_synthetic boolean default false,
  add column if not exists persona_id   uuid default null;

-- Back-fill: ensure existing rows stay as organic.
update city_comments set is_synthetic = false where is_synthetic is null;

-- ===== 2. BOT_PERSONAS =====
-- Persistent virtual user profiles. Archetype drives the mix ratio logic
-- in the generation engine (60% Resident / 40% Tourist target).
create table if not exists bot_personas (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  avatar_url    text,
  archetype     text not null check (archetype in ('Resident', 'Tourist')),
  tone          text not null,
  language_style text not null,
  home_city_id  text references city_pulse_cache(city) on delete set null,
  created_at    timestamp with time zone default now()
);

create index if not exists idx_bot_personas_archetype on bot_personas(archetype);
create index if not exists idx_bot_personas_home_city  on bot_personas(home_city_id);

-- RLS: readable by authenticated admin users only.
alter table bot_personas enable row level security;
drop policy if exists "bot_personas_select" on bot_personas;
create policy "bot_personas_select" on bot_personas
  for select using (is_admin());
drop policy if exists "bot_personas_insert" on bot_personas;
create policy "bot_personas_insert" on bot_personas
  for insert with check (is_admin());
drop policy if exists "bot_personas_update" on bot_personas;
create policy "bot_personas_update" on bot_personas
  for update using (is_admin()) with check (is_admin());

-- ===== 3. CITY_GENERATION_STATE =====
-- One row per city. Tracks density targets and current fulfilment.
-- status: 'active' | 'paused'
create table if not exists city_generation_state (
  id            uuid primary key default uuid_generate_v4(),
  city_id       text not null unique,
  target_count  int  not null default 25 check (target_count >= 25),
  current_count int  not null default 0,
  last_run_at   timestamp with time zone,
  status        text not null default 'active' check (status in ('active', 'paused')),
  tier          text not null default 'tier3' check (tier in ('tier1', 'tier2', 'tier3')),
  created_at    timestamp with time zone default now(),
  updated_at    timestamp with time zone default now()
);

create index if not exists idx_city_gen_state_status  on city_generation_state(status);
create index if not exists idx_city_gen_state_city_id on city_generation_state(city_id);

-- RLS: admin only.
alter table city_generation_state enable row level security;
drop policy if exists "city_gen_state_select" on city_generation_state;
create policy "city_gen_state_select" on city_generation_state
  for select using (is_admin());
drop policy if exists "city_gen_state_insert" on city_generation_state;
create policy "city_gen_state_insert" on city_generation_state
  for insert with check (is_admin());
drop policy if exists "city_gen_state_update" on city_generation_state;
create policy "city_gen_state_update" on city_generation_state
  for update using (is_admin()) with check (is_admin());

-- ===== 4. LIVING_ECHO_GLOBAL_STATE =====
-- Single-row config table: global pause toggle + auto-fade threshold.
create table if not exists living_echo_global_state (
  id              int primary key default 1 check (id = 1),  -- enforces singleton
  is_paused       boolean not null default false,
  auto_fade_threshold int not null default 15
    check (auto_fade_threshold between 0 and 100),
  updated_at      timestamp with time zone default now()
);

alter table living_echo_global_state enable row level security;
drop policy if exists "le_global_select" on living_echo_global_state;
create policy "le_global_select" on living_echo_global_state
  for select using (is_admin());
drop policy if exists "le_global_update" on living_echo_global_state;
create policy "le_global_update" on living_echo_global_state
  for update using (is_admin()) with check (is_admin());
drop policy if exists "le_global_insert" on living_echo_global_state;
create policy "le_global_insert" on living_echo_global_state
  for insert with check (is_admin());

-- Ensure the singleton row exists.
insert into living_echo_global_state (id, is_paused, auto_fade_threshold)
values (1, false, 15)
on conflict (id) do nothing;

-- ===== 5. LIVING_ECHO_LOG =====
-- Activity stream for the admin dashboard. Written by the edge function.
create table if not exists living_echo_log (
  id         uuid primary key default uuid_generate_v4(),
  city_id    text not null,
  persona_id uuid references bot_personas(id) on delete set null,
  comment_id uuid references city_comments(id) on delete cascade,
  context    text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_le_log_created_at on living_echo_log(created_at desc);
create index if not exists idx_le_log_city_id    on living_echo_log(city_id);

alter table living_echo_log enable row level security;
drop policy if exists "le_log_select" on living_echo_log;
create policy "le_log_select" on living_echo_log
  for select using (is_admin());
drop policy if exists "le_log_insert" on living_echo_log;
create policy "le_log_insert" on living_echo_log
  for insert with check (true);  -- edge function uses service role; this allows anon too safely

-- ===== 6. ADMIN RPCs =====

-- 6a. Global health metrics for the dashboard header.
create or replace function admin_living_echo_overview()
returns table (
  metric text,
  value  bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;

  return query
  select 'total_synthetic'::text, count(*)::bigint
    from city_comments where is_synthetic = true
  union all
  select 'total_organic'::text, count(*)::bigint
    from city_comments where coalesce(is_synthetic, false) = false
  union all
  select 'cities_at_threshold'::text,
    count(*)::bigint
    from city_generation_state where current_count >= 25
  union all
  select 'system_paused'::text,
    case when is_paused then 1 else 0 end::bigint
    from living_echo_global_state where id = 1;
end;
$$;

grant execute on function admin_living_echo_overview() to authenticated;

-- 6b. Per-city density table.
create or replace function admin_living_echo_cities(
  p_limit  int default 100,
  p_offset int default 0
)
returns table (
  city_id       text,
  target_count  int,
  current_count int,
  synthetic_ct  bigint,
  organic_ct    bigint,
  last_run_at   timestamp with time zone,
  status        text,
  tier          text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;

  return query
  select
    g.city_id,
    g.target_count,
    g.current_count,
    coalesce((select count(*) from city_comments c
              where c.city = g.city_id and c.is_synthetic = true), 0) as synthetic_ct,
    coalesce((select count(*) from city_comments c
              where c.city = g.city_id and coalesce(c.is_synthetic, false) = false), 0) as organic_ct,
    g.last_run_at,
    g.status,
    g.tier
  from city_generation_state g
  order by g.current_count desc, g.city_id
  limit p_limit offset p_offset;
end;
$$;

grant execute on function admin_living_echo_cities(int, int) to authenticated;

-- 6c. Live activity stream (latest N entries).
create or replace function admin_living_echo_stream(p_limit int default 50)
returns table (
  id          uuid,
  city_id     text,
  persona_name text,
  persona_archetype text,
  context     text,
  created_at  timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;

  return query
  select
    l.id,
    l.city_id,
    coalesce(p.name, 'Unknown'),
    coalesce(p.archetype, '—'),
    l.context,
    l.created_at
  from living_echo_log l
  left join bot_personas p on p.id = l.persona_id
  order by l.created_at desc
  limit p_limit;
end;
$$;

grant execute on function admin_living_echo_stream(int) to authenticated;

-- 6d. Global pause toggle.
create or replace function admin_living_echo_set_pause(p_paused boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;
  update living_echo_global_state set is_paused = p_paused, updated_at = now() where id = 1;
end;
$$;

grant execute on function admin_living_echo_set_pause(boolean) to authenticated;

-- 6e. Auto-fade threshold update.
create or replace function admin_living_echo_set_autofade(p_threshold int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;
  update living_echo_global_state
    set auto_fade_threshold = p_threshold, updated_at = now()
  where id = 1;
end;
$$;

grant execute on function admin_living_echo_set_autofade(int) to authenticated;

-- 6f. Manual boost: mark a city active and raise target.
create or replace function admin_living_echo_boost_city(
  p_city_id    text,
  p_extra      int default 10
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;
  update city_generation_state
    set target_count = target_count + p_extra,
        status       = 'active',
        updated_at   = now()
  where city_id = p_city_id;
end;
$$;

grant execute on function admin_living_echo_boost_city(text, int) to authenticated;

-- 6g. Pause / resume a single city.
create or replace function admin_living_echo_set_city_status(
  p_city_id text,
  p_status  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'not authorised'; end if;
  if p_status not in ('active', 'paused') then raise exception 'invalid status'; end if;
  update city_generation_state
    set status = p_status, updated_at = now()
  where city_id = p_city_id;
end;
$$;

grant execute on function admin_living_echo_set_city_status(text, text) to authenticated;

-- ===== 7. SEED initial city_generation_state rows =====
-- Tiers follow the spec: Tier 1 = rank 1–30, Tier 2 = 31–100, Tier 3 = rest.
-- Targets are seeded as the midpoint of each tier's range; the engine adjusts.
insert into city_generation_state (city_id, target_count, tier, status, current_count)
values
  -- Tier 1 (top metros) -- targets 45–80
  ('tokyo',          62, 'tier1', 'active', 0),
  ('delhi',          58, 'tier1', 'active', 0),
  ('shanghai',       55, 'tier1', 'active', 0),
  ('sao-paulo',      57, 'tier1', 'active', 0),
  ('mexico-city',    56, 'tier1', 'active', 0),
  ('cairo',          50, 'tier1', 'active', 0),
  ('mumbai',         59, 'tier1', 'active', 0),
  ('beijing',        54, 'tier1', 'active', 0),
  ('osaka',          52, 'tier1', 'active', 0),
  ('nyc',            68, 'tier1', 'active', 0),
  ('london',         65, 'tier1', 'active', 0),
  ('paris',          60, 'tier1', 'active', 0),
  ('toronto',        48, 'tier1', 'active', 0),
  ('sydney',         47, 'tier1', 'active', 0),
  ('berlin',         52, 'tier1', 'active', 0),
  ('dubai',          63, 'tier1', 'active', 0),
  ('singapore',      61, 'tier1', 'active', 0),
  ('hong-kong',      55, 'tier1', 'active', 0),
  ('bangkok',        58, 'tier1', 'active', 0),
  ('istanbul',       54, 'tier1', 'active', 0),
  ('seoul',          57, 'tier1', 'active', 0),
  ('moscow',         50, 'tier1', 'active', 0),
  ('lagos',          52, 'tier1', 'active', 0),
  ('nairobi',        48, 'tier1', 'active', 0),
  ('bogota',         49, 'tier1', 'active', 0),
  ('buenos-aires',   53, 'tier1', 'active', 0),
  ('los-angeles',    64, 'tier1', 'active', 0),
  ('chicago',        55, 'tier1', 'active', 0),
  ('miami',          58, 'tier1', 'active', 0),
  ('san-francisco',  60, 'tier1', 'active', 0),
  -- Tier 2 (regional hubs) -- targets 28–42
  ('amsterdam',      35, 'tier2', 'active', 0),
  ('barcelona',      38, 'tier2', 'active', 0),
  ('rome',           36, 'tier2', 'active', 0),
  ('madrid',         37, 'tier2', 'active', 0),
  ('vienna',         33, 'tier2', 'active', 0),
  ('zurich',         31, 'tier2', 'active', 0),
  ('stockholm',      32, 'tier2', 'active', 0),
  ('oslo',           30, 'tier2', 'active', 0),
  ('copenhagen',     31, 'tier2', 'active', 0),
  ('milan',          36, 'tier2', 'active', 0),
  ('lisbon',         34, 'tier2', 'active', 0),
  ('prague',         33, 'tier2', 'active', 0),
  ('budapest',       31, 'tier2', 'active', 0),
  ('warsaw',         32, 'tier2', 'active', 0),
  ('athens',         33, 'tier2', 'active', 0),
  ('johannesburg',   38, 'tier2', 'active', 0),
  ('cape-town',      36, 'tier2', 'active', 0),
  ('accra',          34, 'tier2', 'active', 0),
  ('addis-ababa',    30, 'tier2', 'active', 0),
  ('casablanca',     31, 'tier2', 'active', 0),
  ('karachi',        40, 'tier2', 'active', 0),
  ('dhaka',          39, 'tier2', 'active', 0),
  ('lahore',         37, 'tier2', 'active', 0),
  ('colombo',        30, 'tier2', 'active', 0),
  ('kathmandu',      28, 'tier2', 'active', 0),
  ('manila',         40, 'tier2', 'active', 0),
  ('jakarta',        41, 'tier2', 'active', 0),
  ('kuala-lumpur',   39, 'tier2', 'active', 0),
  ('ho-chi-minh-city', 38, 'tier2', 'active', 0),
  ('hanoi',          35, 'tier2', 'active', 0),
  ('taipei',         40, 'tier2', 'active', 0),
  ('melbourne',      42, 'tier2', 'active', 0),
  ('auckland',       32, 'tier2', 'active', 0),
  ('houston',        37, 'tier2', 'active', 0),
  ('seattle',        36, 'tier2', 'active', 0),
  ('atlanta',        35, 'tier2', 'active', 0),
  ('vancouver',      37, 'tier2', 'active', 0),
  ('montreal',       35, 'tier2', 'active', 0),
  ('medellin',       33, 'tier2', 'active', 0),
  ('santiago',       36, 'tier2', 'active', 0),
  ('lima',           35, 'tier2', 'active', 0),
  ('guadalajara',    32, 'tier2', 'active', 0),
  ('washington-dc',  39, 'tier2', 'active', 0)
on conflict (city_id) do nothing;

-- ===== 8. SEED initial bot_personas =====
insert into bot_personas (name, archetype, tone, language_style) values
  -- Residents
  ('Marcus T.',       'Resident', 'casual-local',    'en-US slang, short sentences'),
  ('Yuki H.',         'Resident', 'informative',     'ja-influenced English, polite'),
  ('Amara O.',        'Resident', 'warm-community',  'Nigerian English, expressive'),
  ('Luis F.',         'Resident', 'dry-humor',       'Lat-Am Spanish cadence'),
  ('Priya S.',        'Resident', 'analytical',      'Indian English, measured'),
  ('Chen W.',         'Resident', 'terse-observer',  'minimal, factual'),
  ('Fatima A.',       'Resident', 'warm-community',  'Arabic-inflected English'),
  ('Dmitri K.',       'Resident', 'philosophical',   'Russian cadence, formal'),
  ('Mei L.',          'Resident', 'upbeat',          'Mandarin-cadence English'),
  ('Kofi A.',         'Resident', 'storytelling',    'West African English, vivid'),
  -- Tourists
  ('Sarah M.',        'Tourist',  'enthusiastic',    'en-GB, exclamatory'),
  ('Jake P.',         'Tourist',  'skeptical-guide', 'en-US, comparing to home'),
  ('Valentina R.',    'Tourist',  'food-focused',    'Italian-tinged English'),
  ('Björn E.',        'Tourist',  'tech-mindful',    'Scandinavian English, precise'),
  ('Hana C.',         'Tourist',  'culture-curious', 'Korean-inflected English'),
  ('Antoine D.',      'Tourist',  'romantic',        'French-cadence English'),
  ('Aisha B.',        'Tourist',  'budget-traveller','direct, practical'),
  ('Omar S.',         'Tourist',  'spontaneous',     'Egyptian Arabic cadence'),
  ('Yolanda V.',      'Tourist',  'photography-fan', 'Spanish cadence, visual'),
  ('Tom H.',          'Tourist',  'business-traveller','UK English, efficient')
on conflict do nothing;

-- ===== 9. CRON: schedule the living-echo edge function =====
-- Fires every 12 minutes. Uses the same invoke_edge_function() helper
-- that all other scheduled edge functions on this project use
-- (see 20260818050000_invoke_edge_function_helper.sql), which reads the
-- service role key from the vault secret glotemp_service_role_key.
-- Uses DO + exception so the migration never aborts if pg_cron is
-- temporarily unavailable (same pattern as existing migrations).
do $$
begin
  perform cron.schedule(
    'living-echo-run',
    '*/12 * * * *',
    $cron$select invoke_edge_function('living-echo')$cron$
  );
exception when others then
  raise notice 'living-echo cron not scheduled: %', sqlerrm;
end $$;
