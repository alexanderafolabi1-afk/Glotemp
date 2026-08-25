-- Partner Offers layer. Sits alongside the monthly draw, not instead of
-- it: local businesses (hotels, restaurants, bars, clubs, cabs, cinemas,
-- gyms, tours) give Glotemp users in their city something to unlock and
-- redeem. Offers map to the same 12 verticals every other reading on this
-- site already uses (readings.vertical, GlotempVerticalStyle.VERTICALS),
-- so a city's offers sit naturally under its existing Food/Entertainment/
-- Sport/Property/etc. pages -- no new taxonomy invented here.
--
-- Three tables:
--   offers          -- what a partner is giving, one row per offer.
--   offer_unlocks   -- one row per (offer, user) unlock -- the code, and
--                      whether it has been redeemed. This is the whole
--                      "track unlocks and redemptions per offer" ledger;
--                      admin_offer_performance() below just aggregates it.
--   partner_leads   -- the enquiry queue behind "Offer something to this
--                      city ->", same public-submits/admin-reviews shape
--                      as city_applications.
--
-- Two RPCs carry all the logic that needs to run with elevated privilege:
--   unlock_offer(uuid)      -- authenticated only, issues (or returns an
--                               existing) code for one user on one offer.
--   redeem_offer_code(text) -- callable with no login (a partner's staff
--                               have no Glotemp account), looks up a code
--                               and marks it redeemed on first use. Never
--                               returns anything beyond a status and a
--                               timestamp -- it cannot be used to browse
--                               other users' codes, only to check one a
--                               customer is showing on their screen.
--
-- Deliberately NOT touched here: cities-data.js, any mood/reading table,
-- any ranking or band computation. Nothing in this file can affect a
-- city's reading, ranking or band -- offers are a redemption layer next
-- to that data, not a part of it.

create extension if not exists "pgcrypto";

-- ===== OFFERS =====
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null,
  partner_url text,
  city_slug text not null,
  vertical text not null,
  title text not null,
  detail text,
  terms text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_unlocks integer check (max_unlocks is null or max_unlocks > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table offers is
  'One row per partner offer. title is the short line shown under the partner name on the offers panel ("what they are giving"); detail is a longer optional description; terms is the plain-language HOW IT WORKS text (what it is, where it is valid, when it expires, one per person) shown in full on request, never buried.';

create index if not exists idx_offers_city_vertical_active
  on offers(city_slug, vertical, active);

alter table offers enable row level security;

-- "Anyone reads active offers within their date window." No insert/update/
-- delete policy for anon or authenticated: offers are written by staff
-- with the service role key (or a future admin panel), the same way
-- readings are -- there is deliberately no public write path onto this
-- table.
drop policy if exists "offers_select_active" on offers;
create policy "offers_select_active" on offers
  for select using (
    active = true
    and now() >= starts_at
    and (ends_at is null or now() <= ends_at)
  );

grant select on offers to anon, authenticated;

-- ===== OFFER UNLOCKS =====
create table if not exists offer_unlocks (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  unlocked_at timestamptz not null default now(),
  redeemed_at timestamptz,
  unique (offer_id, user_id)
);

comment on table offer_unlocks is
  'One row per user who has unlocked one offer. code is single-use: redeem_offer_code() sets redeemed_at the first time it is checked and every check after that reports already_used. unique(offer_id, user_id) is what makes an unlock idempotent per user -- calling unlock_offer() again just returns the same code.';

create index if not exists idx_offer_unlocks_user on offer_unlocks(user_id);
create index if not exists idx_offer_unlocks_offer on offer_unlocks(offer_id);

alter table offer_unlocks enable row level security;

-- "Authenticated users insert only their own unlock." In practice all
-- inserts go through unlock_offer() (security definer, below), but the
-- policy holds regardless of entry point.
drop policy if exists "offer_unlocks_insert_own" on offer_unlocks;
create policy "offer_unlocks_insert_own" on offer_unlocks
  for insert to authenticated with check (auth.uid() = user_id);

-- "Nobody reads other users' codes." Own rows only -- this is what powers
-- "the user's saved offers live on their profile", and it's also why
-- redeem_offer_code() below has to be security definer: a partner's
-- front-of-house staff have no Glotemp account, so without it they could
-- never look up a code at all, let alone someone else's.
drop policy if exists "offer_unlocks_select_own" on offer_unlocks;
create policy "offer_unlocks_select_own" on offer_unlocks
  for select to authenticated using (auth.uid() = user_id);

grant select, insert on offer_unlocks to authenticated;

-- ===== PARTNER LEADS =====
-- Same public-submits/admin-reviews shape as city_applications.
create table if not exists partner_leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  city_slug text,
  vertical text,
  contact_email text not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

comment on table partner_leads is
  'Public "offer something to this city" enquiry queue. Anyone can insert; only an admin can read or update. A lead becoming a real offer is still a manual step (a row in offers), same as a city_applications row is never auto-published.';

alter table partner_leads enable row level security;

drop policy if exists partner_leads_public_insert on partner_leads;
create policy partner_leads_public_insert on partner_leads
  for insert to anon, authenticated
  with check (
    length(trim(business_name)) > 0
    and length(trim(business_name)) <= 160
    and length(trim(contact_email)) > 0
    and length(contact_email) <= 320
    and (city_slug is null or length(city_slug) <= 120)
    and (vertical is null or length(vertical) <= 40)
    and (note is null or length(note) <= 1000)
    and status = 'pending'
  );

drop policy if exists partner_leads_admin_select on partner_leads;
create policy partner_leads_admin_select on partner_leads
  for select to authenticated
  using (is_admin());

drop policy if exists partner_leads_admin_update on partner_leads;
create policy partner_leads_admin_update on partner_leads
  for update to authenticated
  using (is_admin())
  with check (is_admin());

create or replace function touch_partner_lead_reviewed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status and new.status != 'pending' then
    new.reviewed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_partner_leads_reviewed_at on partner_leads;
create trigger trg_partner_leads_reviewed_at
  before update on partner_leads
  for each row execute function touch_partner_lead_reviewed_at();

-- ===== RPC: unlock_offer =====
-- Authenticated only. Idempotent per (offer, user): a second call just
-- returns the code already issued, never a new one and never an error.
create or replace function unlock_offer(p_offer_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_offer offers%rowtype;
  v_existing offer_unlocks%rowtype;
  v_code text;
  v_count int;
  v_attempt int := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_offer from offers where id = p_offer_id;
  if not found then
    raise exception 'offer_not_found';
  end if;
  if not v_offer.active then
    raise exception 'offer_inactive';
  end if;
  if now() < v_offer.starts_at or (v_offer.ends_at is not null and now() > v_offer.ends_at) then
    raise exception 'offer_expired';
  end if;

  select * into v_existing from offer_unlocks where offer_id = p_offer_id and user_id = v_uid;
  if found then
    return json_build_object('code', v_existing.code, 'redeemed', v_existing.redeemed_at is not null);
  end if;

  if v_offer.max_unlocks is not null then
    select count(*) into v_count from offer_unlocks where offer_id = p_offer_id;
    if v_count >= v_offer.max_unlocks then
      raise exception 'offer_full';
    end if;
  end if;

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4)) || '-' ||
              upper(substr(md5(random()::text || clock_timestamp()::text || v_attempt::text), 1, 4));
    begin
      insert into offer_unlocks (offer_id, user_id, code) values (p_offer_id, v_uid, v_code);
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 5 then
        raise exception 'code_generation_failed';
      end if;
    end;
  end loop;

  return json_build_object('code', v_code, 'redeemed', false);
end;
$$;

grant execute on function unlock_offer(uuid) to authenticated;

-- ===== RPC: redeem_offer_code =====
-- No auth required -- this is the entire "partner page", staff type a
-- code, this is what checks it. Marks redeemed on the first valid check;
-- every check after that reports already_used. Never returns the user_id
-- or anything else about who unlocked it.
create or replace function redeem_offer_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row offer_unlocks%rowtype;
begin
  select * into v_row from offer_unlocks where code = upper(trim(p_code));
  if not found then
    return json_build_object('status', 'not_found');
  end if;
  if v_row.redeemed_at is not null then
    return json_build_object('status', 'already_used', 'redeemed_at', v_row.redeemed_at);
  end if;
  update offer_unlocks set redeemed_at = now() where id = v_row.id;
  return json_build_object('status', 'valid');
end;
$$;

grant execute on function redeem_offer_code(text) to anon, authenticated;

-- ===== RPC: admin_offer_performance =====
-- "Track unlocks and redemptions per offer so a partner can see what it
-- earned them." Partners have no Glotemp login, so this is admin-facing
-- (is_admin(), same gate as admin_overview() etc.) -- an admin relays the
-- numbers, the same hands-on review step every other partner-facing queue
-- on this site already goes through.
create or replace function admin_offer_performance()
returns table(
  offer_id uuid, partner_name text, title text, city_slug text, vertical text,
  active boolean, unlock_count bigint, redemption_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not_authorized';
  end if;
  return query
    select o.id, o.partner_name, o.title, o.city_slug, o.vertical, o.active,
           count(u.id) as unlock_count,
           count(u.redeemed_at) as redemption_count
    from offers o
    left join offer_unlocks u on u.offer_id = o.id
    group by o.id
    order by o.created_at desc;
end;
$$;

grant execute on function admin_offer_performance() to authenticated;
