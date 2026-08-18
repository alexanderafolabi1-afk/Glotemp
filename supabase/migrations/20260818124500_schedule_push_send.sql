-- Schedule push-send hourly, offset to minute 10 so it doesn't cluster
-- with the other :00/:05-anchored jobs.
--
-- Reasoning for the interval: the only fully-working live-mover source
-- right now is github_activity, which itself only refreshes hourly
-- (github-tech-hourly). A "significant move" can only newly become true
-- when a fresh reading lands that's >=20h newer than the prior one and
-- crosses the 15% threshold -- so checking faster than the fastest real
-- source refreshes buys nothing, just re-scans readings that haven't
-- changed. Checking hourly matches that real cadence: a genuinely new
-- move gets caught within an hour of appearing, and every other check
-- in between is a cheap no-op query, not wasted work on a slow path.
-- world_bank/ticketmaster (daily, once ticketmaster's key exists) and
-- any future hourly source both fit inside this same interval without
-- needing a faster schedule.
--
-- The daily send cap doesn't depend on this interval at all -- it's the
-- push_notification_log(user_id, city_slug, sent_date) primary key, so
-- running this every 5 minutes instead of hourly would still only ever
-- produce one send per city per user per day; hourly is chosen for
-- efficiency (fewer no-op scans), not because a faster schedule would
-- risk duplicate sends.
do $$
begin
  perform cron.unschedule('push-send-hourly');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.schedule('push-send-hourly', '10 * * * *',
    $c$select invoke_edge_function('push-send');$c$);
exception when others then
  raise notice 'pg_cron unavailable, push-send-hourly not scheduled: %', sqlerrm;
end $$;
