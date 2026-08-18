-- Push notifications: VAPID keypair (self-owned, free, generated locally
-- with Node's crypto -- no third-party push service, no cost) plus the
-- two tables needed to send and rate-limit real pushes.
--
-- city_watchers requires an authenticated user_id (references
-- profiles(user_id), RLS is `to authenticated` only, no anonymous path) --
-- push_subscriptions matches that exactly, for consistency and because a
-- push subscription is meaningless without a city_watchers row to key
-- notifications off in the first place.

select vault.create_secret(
  '7ySRiMMWBgYOLEzFZvtzIqrtbwfHqy21nHhOX2mGIVI',
  'vapid_private_key',
  'VAPID private key (P-256 raw scalar, base64url) for Web Push. Self-generated, free -- not from any paid provider.'
)
where not exists (select 1 from vault.secrets where name = 'vapid_private_key');

-- ===== PUSH_SUBSCRIPTIONS =====
-- One row per browser subscription (a user with two devices/browsers
-- gets two rows). Not world-readable -- unlike city_watchers, the
-- endpoint/keys here are credentials for pushing to that exact device.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_unique unique (user_id, endpoint)
);

create index if not exists idx_push_subscriptions_user_id on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on push_subscriptions;
create policy "push_subscriptions_select_own" on push_subscriptions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on push_subscriptions;
create policy "push_subscriptions_insert_own" on push_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on push_subscriptions;
create policy "push_subscriptions_delete_own" on push_subscriptions
  for delete to authenticated using (auth.uid() = user_id);

grant select, insert, delete on push_subscriptions to authenticated;

-- ===== PUSH_NOTIFICATION_LOG =====
-- One row per (user, city, day) a notification was actually sent.
-- The primary key IS the cap: the sender inserts before pushing and
-- skips on a unique-violation, so "one notification per city per day"
-- is enforced by the schema, not by application logic that could drift.
-- No RLS/grants to anon/authenticated -- only the service-role sender
-- touches this table.
create table if not exists push_notification_log (
  user_id uuid not null references profiles(user_id) on delete cascade,
  city_slug text not null,
  sent_date date not null default current_date,
  metric text,
  created_at timestamptz not null default now(),
  primary key (user_id, city_slug, sent_date)
);

alter table push_notification_log enable row level security;
-- Deliberately no policies: RLS with zero policies denies all access to
-- anon/authenticated by default, and service-role bypasses RLS entirely.

-- ===== VAPID KEY ACCESS =====
-- PostgREST only exposes the `public` schema, not `vault` -- push-send
-- reads the private key through this RPC instead, same shape as
-- invoke_edge_function()'s own vault read. security definer + a narrow
-- grant (service_role only) is what keeps this from being a public read
-- of a private key.
create or replace function get_vapid_private_key()
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key' limit 1;
$$;

revoke all on function get_vapid_private_key() from public, anon, authenticated;
grant execute on function get_vapid_private_key() to service_role;
