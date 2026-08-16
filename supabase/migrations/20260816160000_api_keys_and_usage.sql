-- Selling access to the city readings.
--
-- Three parts:
--   1. api_keys      -- who may call, and how much
--   2. api_requests  -- what they actually called, so usage can be billed
--                       and abuse can be seen
--   3. admin functions to issue, list and revoke, plus the usage numbers
--
-- The key itself is NEVER stored. Only a sha256 hash of it, and a short
-- visible prefix so a row can be told apart in a list. That means a
-- database leak does not hand anyone a working key, and it means nobody,
-- including whoever runs this, can recover a key after it is issued. The
-- full key is returned exactly once, by the issue function, and after
-- that it exists only wherever the customer put it.
--
-- Idempotent. PostgreSQL has no `create policy if not exists`, so
-- policies are dropped first; do not replace that with the syntax that
-- does not exist.

create extension if not exists pgcrypto with schema extensions;

-- ===== 1. the keys =====
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  -- sha256 of the key, hex. Unique so a lookup is a single index hit.
  key_hash text not null unique,
  -- First few characters, shown in the admin so a row is identifiable.
  -- Not enough to reconstruct the key.
  key_prefix text not null,
  label text not null check (char_length(label) between 1 and 80),
  contact_email text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'growth', 'scale')),
  -- Calls allowed per calendar month. Null means no ceiling.
  monthly_limit int,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

create index if not exists idx_api_keys_active on api_keys(revoked_at) where revoked_at is null;

comment on table api_keys is
  'API access. The key is stored only as a sha256 hash; it is shown once at issue and cannot be recovered.';

-- ===== 2. the usage =====
create table if not exists api_requests (
  id bigserial primary key,
  key_id uuid not null references api_keys(id) on delete cascade,
  path text not null,
  status int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_requests_key_created on api_requests(key_id, created_at desc);
create index if not exists idx_api_requests_created on api_requests(created_at desc);

-- Neither table is reachable from a browser. No policy grants anon or
-- authenticated anything, and RLS is on, so the only paths in are the
-- security definer functions below and the service role used by the edge
-- function.
alter table api_keys enable row level security;
alter table api_requests enable row level security;

-- ===== 3. admin surface =====

-- Issue a key. Returns the full key ONCE. Generating it here rather than
-- in the browser keeps it out of any client-side history, and means the
-- plaintext never travels anywhere except this one response.
create or replace function admin_issue_api_key(
  p_label text,
  p_contact_email text default null,
  p_plan text default 'free',
  p_monthly_limit int default 1000
)
returns table (id uuid, api_key text, key_prefix text)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
  v_prefix text;
  v_id uuid;
begin
  if not is_admin() then
    raise exception 'not authorised';
  end if;

  -- 32 bytes of randomness, hex. "live" is in the name so a test key can
  -- be introduced later without the two being confusable.
  v_key := 'glo_live_' || encode(extensions.gen_random_bytes(32), 'hex');
  v_prefix := left(v_key, 17);

  insert into api_keys (key_hash, key_prefix, label, contact_email, plan, monthly_limit)
  values (
    encode(extensions.digest(v_key, 'sha256'), 'hex'),
    v_prefix,
    p_label,
    p_contact_email,
    coalesce(p_plan, 'free'),
    p_monthly_limit
  )
  returning api_keys.id into v_id;

  return query select v_id, v_key, v_prefix;
end;
$$;

grant execute on function admin_issue_api_key(text, text, text, int) to authenticated;

-- List keys with this month's usage. No hash is returned: there is no
-- reason for a browser to hold it, even an admin's.
create or replace function admin_api_keys()
returns table (
  id uuid,
  key_prefix text,
  label text,
  contact_email text,
  plan text,
  monthly_limit int,
  calls_this_month bigint,
  last_used_at timestamptz,
  created_at timestamptz,
  revoked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorised';
  end if;

  return query
  select k.id, k.key_prefix, k.label, k.contact_email, k.plan, k.monthly_limit,
         coalesce(u.calls, 0)::bigint,
         k.last_used_at, k.created_at, k.revoked_at
  from api_keys k
  left join (
    select r.key_id, count(*) as calls
    from api_requests r
    where r.created_at >= date_trunc('month', now())
    group by r.key_id
  ) u on u.key_id = k.id
  order by k.revoked_at nulls first, k.created_at desc;
end;
$$;

grant execute on function admin_api_keys() to authenticated;

-- Revoke. Kept as a row rather than deleted, so the usage history behind
-- it survives for billing and for seeing what happened.
create or replace function admin_revoke_api_key(p_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorised';
  end if;

  update api_keys set revoked_at = now() where id = p_id and revoked_at is null;
  return found;
end;
$$;

grant execute on function admin_revoke_api_key(uuid) to authenticated;

-- Headline API numbers for the dashboard.
create or replace function admin_api_overview(days int default 30)
returns table (metric text, value bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorised';
  end if;

  return query
  with win as (select now() - make_interval(days => greatest(days, 1)) as since)
  select 'keys_active'::text, count(*)::bigint from api_keys where revoked_at is null
  union all
  select 'keys_revoked'::text, count(*)::bigint from api_keys where revoked_at is not null
  union all
  select 'calls'::text, count(*)::bigint from api_requests, win where created_at >= win.since
  union all
  select 'calls_ok'::text, count(*)::bigint from api_requests, win
    where created_at >= win.since and status < 400
  union all
  select 'calls_rejected'::text, count(*)::bigint from api_requests, win
    where created_at >= win.since and status >= 400
  union all
  select 'paying_keys'::text, count(*)::bigint from api_keys
    where revoked_at is null and plan <> 'free';
end;
$$;

grant execute on function admin_api_overview(int) to authenticated;

-- ===== 4. the gate the edge function calls =====
-- Takes a key, returns whether it may proceed and why not if it may not,
-- and records the call. security definer so the edge function needs no
-- direct table rights. One round trip rather than four.
create or replace function api_authorise(p_key text, p_path text)
returns table (allowed boolean, key_id uuid, plan text, reason text)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_key api_keys%rowtype;
  v_used bigint;
  v_status int;
  v_reason text;
begin
  select * into v_key from api_keys
  where key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex');

  if not found then
    -- Nothing to attribute the call to, so nothing is logged. Logging
    -- unknown keys would let anyone fill this table by guessing.
    return query select false, null::uuid, null::text, 'invalid_key'::text;
    return;
  end if;

  if v_key.revoked_at is not null then
    v_reason := 'revoked';
    v_status := 403;
  elsif v_key.monthly_limit is not null then
    -- Aliased because this function has an OUT parameter also called
    -- key_id, and an unqualified reference resolves to that instead of
    -- the column.
    select count(*) into v_used from api_requests r
    where r.key_id = v_key.id and r.created_at >= date_trunc('month', now());
    if v_used >= v_key.monthly_limit then
      v_reason := 'monthly_limit_reached';
      v_status := 429;
    end if;
  end if;

  if v_reason is null then
    v_status := 200;
  end if;

  insert into api_requests (key_id, path, status) values (v_key.id, p_path, v_status);
  update api_keys set last_used_at = now() where id = v_key.id;

  return query select (v_reason is null), v_key.id, v_key.plan, v_reason;
end;
$$;

-- Only the service role calls this. Never granted to anon or
-- authenticated: a browser that could call it could brute-force keys.
revoke all on function api_authorise(text, text) from public;

-- ===== 5. the product =====
-- The reading a customer is paying for: how a city feels now, from the
-- observations already being collected.
create or replace function api_city_reading(p_city_slug text, p_hours int default 24)
returns table (
  city_slug text,
  observations bigint,
  intensity numeric,
  band text,
  top_mode text,
  window_hours int,
  as_of timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hours int := least(greatest(coalesce(p_hours, 24), 1), 168);
begin
  -- Every column below is qualified. This function's OUT parameters
  -- include intensity and city_slug, and an unqualified reference
  -- resolves to the parameter rather than the column.
  return query
  with recent as (
    select o.intensity as i, o.mode as m
    from observations o
    where o.city_slug = p_city_slug
      and o.created_at >= now() - make_interval(hours => v_hours)
  ),
  agg as (
    select count(*)::bigint as n, round(avg(r.i)::numeric, 2) as avg_i from recent r
  ),
  top as (
    select r.m as m from recent r group by r.m order by count(*) desc, r.m limit 1
  )
  select p_city_slug,
         agg.n,
         agg.avg_i,
         case
           when agg.n = 0 then 'unknown'
           when agg.avg_i >= 8 then 'charged'
           when agg.avg_i >= 6.5 then 'warm'
           when agg.avg_i >= 4.5 then 'steady'
           when agg.avg_i >= 3 then 'restrained'
           else 'low'
         end,
         (select t.m from top t),
         v_hours,
         now()
  from agg;
end;
$$;

revoke all on function api_city_reading(text, int) from public;
