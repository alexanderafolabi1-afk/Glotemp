-- Admin push notifications: the same Web Push mechanism as the consumer
-- feature (20260818110000_push_notifications_schema.sql) -- same VAPID
-- keypair, same encryption, same "no paid service" constraint -- but a
-- separate subscription table, separate log, separate sender
-- (push-admin-send), because the two have genuinely different shapes.
--
-- WHY A NEW TABLE, NOT A SCOPE COLUMN ON push_subscriptions
-- Checked first. push_subscriptions has no city/topic column of its own
-- to add a scope to -- the "what this subscription is about" lives
-- entirely in push_notification_log's shape: primary key
-- (user_id, city_slug, sent_date), one cap slot per city per day. Admin
-- notifications aren't city-scoped at all (a new sign-up, a lead
-- replying, an X-content reminder have no city_slug), and they need
-- batching-across-triggers in one run rather than a once-a-day-per-city
-- cap. Bending city_slug into an admin event-type column, or writing
-- fake per-day caps for events that aren't daily, would make the
-- consumer table's clean semantics worse to save one table. A second,
-- purpose-shaped table is the smaller change.
--
-- No new VAPID key: the keypair identifies the SENDING server to the
-- push service, not which subscriber it's for, so push-admin-send reuses
-- get_vapid_private_key() and the same public key already hardcoded in
-- push-send/index.ts -- generating a second keypair would add nothing.

-- ===== ADMIN_PUSH_SUBSCRIPTIONS =====
-- One row per admin's browser subscription. is_admin() is checked in
-- every policy, not just auth.uid() = user_id -- unlike push_subscriptions
-- (open to any authenticated user for their own city-watch pushes), this
-- table exists specifically for admins, so a non-admin authenticated
-- user must never be able to read, create or delete a row here even if
-- they somehow captured their own user_id in one.
create table if not exists admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  constraint admin_push_subscriptions_user_endpoint_unique unique (user_id, endpoint)
);

create index if not exists idx_admin_push_subscriptions_user_id on admin_push_subscriptions(user_id);

alter table admin_push_subscriptions enable row level security;

drop policy if exists "admin_push_subscriptions_select_own" on admin_push_subscriptions;
create policy "admin_push_subscriptions_select_own" on admin_push_subscriptions
  for select to authenticated using (auth.uid() = user_id and is_admin());

drop policy if exists "admin_push_subscriptions_insert_own" on admin_push_subscriptions;
create policy "admin_push_subscriptions_insert_own" on admin_push_subscriptions
  for insert to authenticated with check (auth.uid() = user_id and is_admin());

drop policy if exists "admin_push_subscriptions_delete_own" on admin_push_subscriptions;
create policy "admin_push_subscriptions_delete_own" on admin_push_subscriptions
  for delete to authenticated using (auth.uid() = user_id and is_admin());

grant select, insert, delete on admin_push_subscriptions to authenticated;

-- ===== ADMIN_NOTIFICATION_LOG =====
-- One row per (trigger kind, specific thing) an admin push has already
-- covered. The primary key IS the cap, same pattern as
-- push_notification_log: push-admin-send inserts before including an
-- item in a push and skips it on a unique-violation, so "notify each
-- real event exactly once" is enforced by the schema, not by
-- application logic that could drift or double-fire on an overlapping
-- run.
--
-- ref_key's shape depends on kind:
--   signup                    -> profiles.user_id
--   reaction                  -> reactions.id
--   milestone_checkin_threshold -> '<city_slug>:<threshold>'
--   milestone_lead_replied     -> outreach_leads.id
--   milestone_tier             -> '<user_id>:<tier>'  (keeper/founder only)
--   x_content_reminder         -> the London calendar date, 'YYYY-MM-DD'
create table if not exists admin_notification_log (
  kind text not null,
  ref_key text not null,
  created_at timestamptz not null default now(),
  primary key (kind, ref_key)
);

alter table admin_notification_log enable row level security;
-- Deliberately no policies: RLS with zero policies denies all access to
-- anon/authenticated by default, and service-role (push-admin-send)
-- bypasses RLS entirely -- same as push_notification_log.

-- ===== SERVICE-ROLE-ONLY AGGREGATES =====
-- push-admin-send runs as service_role, which has no auth.uid() (there is
-- no signed-in user in a cron-triggered edge function call) -- so the
-- existing is_admin()-gated admin_* RPCs (admin_checkins_by_city,
-- admin_contributor_tier_counts, ...) would reject it: is_admin() reads
-- auth.uid(), gets null, and returns false. These two are the
-- service-role equivalents: same aggregation, same underlying
-- admin_contributor_tier() function for tier logic (not reimplemented),
-- just gated by role instead of by a signed-in admin session, exactly
-- like get_vapid_private_key() already is for the VAPID secret.
create or replace function checkin_counts_by_city()
returns table (city_slug text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select city_slug, count(*) from observations group by city_slug;
$$;

revoke all on function checkin_counts_by_city() from public, anon, authenticated;
grant execute on function checkin_counts_by_city() to service_role;

create or replace function contributor_tiers_for_notify()
returns table (user_id uuid, display_name text, tier text)
language sql
stable
security definer
set search_path = public
as $$
  select agg.user_id, coalesce(p.display_name, 'Someone'), agg.tier
  from (
    select
      d.user_id,
      admin_contributor_tier(
        count(*)::integer,
        count(distinct d.checkin_date)::integer,
        count(distinct date_trunc('week', d.checkin_date))::integer
      ) as tier
    from daily_checkins d
    group by d.user_id
  ) agg
  join profiles p on p.user_id = agg.user_id
  where agg.tier in ('keeper', 'founder');
$$;

revoke all on function contributor_tiers_for_notify() from public, anon, authenticated;
grant execute on function contributor_tiers_for_notify() to service_role;

-- ===== BACKFILL SEED =====
-- Marks everything that ALREADY meets a trigger's condition as of this
-- migration as already-notified, so the first run of push-admin-send
-- reports genuinely new events only, not a replay of the site's whole
-- history as a burst of "new" milestones and sign-ups the moment this
-- ships.
insert into admin_notification_log (kind, ref_key)
select 'signup', user_id::text from profiles
on conflict do nothing;

insert into admin_notification_log (kind, ref_key)
select 'reaction', id::text from reactions
on conflict do nothing;

insert into admin_notification_log (kind, ref_key)
select 'milestone_checkin_threshold', o.city_slug || ':' || t.threshold
from (select city_slug, count(*) as n from observations group by city_slug) o
cross join (values (5),(10),(25),(50),(100),(250),(500),(1000)) as t(threshold)
where o.n >= t.threshold
on conflict do nothing;

insert into admin_notification_log (kind, ref_key)
select 'milestone_lead_replied', id::text from outreach_leads where status = 'replied'
on conflict do nothing;

insert into admin_notification_log (kind, ref_key)
select 'milestone_tier', user_id::text || ':' || tier
from contributor_tiers_for_notify()
on conflict do nothing;

-- ===== SCHEDULE =====
-- Every 15 minutes, offset to avoid push-send (hourly at :10) and the
-- music jobs (5,20,35,50). Fast enough that a genuine new sign-up or a
-- reply lands in an admin's hand within 15 minutes; the X-content
-- reminder and every milestone are additionally gated so this frequency
-- alone cannot make them fire more than once (see push-admin-send).
do $$
begin
  perform cron.unschedule('push-admin-send-15min');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.schedule('push-admin-send-15min', '3,18,33,48 * * * *',
    $c$select invoke_edge_function('push-admin-send');$c$);
exception when others then
  raise notice 'pg_cron unavailable, push-admin-send-15min not scheduled: %', sqlerrm;
end $$;
