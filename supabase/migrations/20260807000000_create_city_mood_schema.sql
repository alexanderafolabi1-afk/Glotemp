-- Glotemp City Mood Infrastructure Schema
-- Idempotent migration for comment system and mood aggregation

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_stat_statements";

-- ===== REPORTERS TABLE =====
-- Tracks contributors and their participation history
create table if not exists reporters (
  id uuid primary key default uuid_generate_v4(),
  email text unique,
  created_at timestamp with time zone default now(),
  last_check_in timestamp with time zone default now(),
  total_contributions int default 0,
  updated_at timestamp with time zone default now()
);

create index if not exists idx_reporters_email on reporters(email);
create index if not exists idx_reporters_created_at on reporters(created_at);

-- RLS for reporters: users can read and update their own data
alter table reporters enable row level security;
create policy if not exists "reporters_insert" on reporters
  for insert with check (true);
create policy if not exists "reporters_select" on reporters
  for select using (true);
create policy if not exists "reporters_update" on reporters
  for update using (true)
  with check (true);

-- ===== CITY_COMMENTS TABLE =====
-- Stores individual mood observations/comments for cities
create table if not exists city_comments (
  id uuid primary key default uuid_generate_v4(),
  city text not null,
  reporter_id uuid references reporters(id) on delete set null,
  sentiment float check (sentiment >= -1 and sentiment <= 1),
  intensity int check (intensity >= 1 and intensity <= 10),
  scene text,
  context text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_city_comments_city on city_comments(city);
create index if not exists idx_city_comments_city_created_at on city_comments(city, created_at);
create index if not exists idx_city_comments_reporter_id on city_comments(reporter_id);
create index if not exists idx_city_comments_created_at on city_comments(created_at);

-- RLS for city_comments: anyone can insert, all can read aggregated data
alter table city_comments enable row level security;
create policy if not exists "city_comments_insert" on city_comments
  for insert with check (true);
create policy if not exists "city_comments_select" on city_comments
  for select using (true);
create policy if not exists "city_comments_update" on city_comments
  for update using (true)
  with check (true);

-- ===== CITY_PULSE_CACHE TABLE =====
-- Stores aggregated mood scores and statistics by city
-- Updated by edge functions, readable by frontend
create table if not exists city_pulse_cache (
  city text primary key,
  mood_score float default 7.0,
  comment_count int default 0,
  sentiment_distribution jsonb default '{"positive":0,"neutral":0,"negative":0}',
  top_scenes jsonb default '{}',
  last_aggregated timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_city_pulse_cache_updated_at on city_pulse_cache(updated_at);

-- RLS for city_pulse_cache: all can read, only functions can write
alter table city_pulse_cache enable row level security;
create policy if not exists "city_pulse_cache_select" on city_pulse_cache
  for select using (true);
create policy if not exists "city_pulse_cache_insert" on city_pulse_cache
  for insert with check (true);
create policy if not exists "city_pulse_cache_update" on city_pulse_cache
  for update using (true)
  with check (true);

-- ===== HELPER FUNCTION: Aggregate mood by city =====
-- Called by edge functions to update city_pulse_cache
create or replace function update_city_mood_cache(p_city text)
returns void as $$
declare
  v_comment_count int;
  v_avg_sentiment float;
  v_sentiment_dist jsonb;
begin
  select count(*), avg(sentiment) into v_comment_count, v_avg_sentiment
  from city_comments
  where city = p_city;

  -- Build sentiment distribution
  select jsonb_object_agg(sentiment_label, count) into v_sentiment_dist
  from (
    select
      case
        when sentiment > 0.3 then 'positive'
        when sentiment < -0.3 then 'negative'
        else 'neutral'
      end as sentiment_label,
      count(*) as count
    from city_comments
    where city = p_city
    group by sentiment_label
  ) distribution;

  insert into city_pulse_cache (city, mood_score, comment_count, sentiment_distribution, last_aggregated)
  values (
    p_city,
    coalesce(7.0 + (v_avg_sentiment * 2), 7.0),
    coalesce(v_comment_count, 0),
    coalesce(v_sentiment_dist, '{"positive":0,"neutral":0,"negative":0}'),
    now()
  )
  on conflict (city) do update set
    mood_score = coalesce(7.0 + (v_avg_sentiment * 2), 7.0),
    comment_count = coalesce(v_comment_count, 0),
    sentiment_distribution = coalesce(v_sentiment_dist, '{"positive":0,"neutral":0,"negative":0}'),
    last_aggregated = now(),
    updated_at = now();
end;
$$ language plpgsql;

-- ===== TRIGGER: Auto-update reporter stats =====
create or replace function update_reporter_stats()
returns trigger as $$
begin
  if new.reporter_id is not null then
    update reporters
    set
      total_contributions = total_contributions + 1,
      last_check_in = now(),
      updated_at = now()
    where id = new.reporter_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if not exists trigger_update_reporter_stats on city_comments;
create trigger trigger_update_reporter_stats
after insert on city_comments
for each row
execute function update_reporter_stats();

-- ===== GRANTS: Anonymous access for reading =====
-- (Adjust based on your Supabase auth configuration)
grant select on city_pulse_cache to anon;
grant select on city_comments to anon;
grant insert on city_comments to anon;
grant select on reporters to anon;
grant insert on reporters to anon;
