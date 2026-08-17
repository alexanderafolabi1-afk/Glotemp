-- GDELT rate-limits per source IP, and every Supabase edge function on
-- this project shares egress IPs. The first version of the scheduled
-- refresh let a new cron tick fire every 5 minutes regardless of whether
-- the previous batch (which can run long once GDELT starts 429-ing and
-- each city retries with backoff) had finished, so multiple invocations
-- ended up hammering GDELT concurrently and 429s cascaded across nearly
-- every city. An advisory lock makes overlapping runs impossible: a
-- second invocation that can't acquire the lock exits immediately
-- instead of adding to the pile-up.

create or replace function city_news_try_lock()
returns boolean
language sql
as $$
  select pg_try_advisory_lock(hashtext('city_news_refresh'));
$$;

create or replace function city_news_unlock()
returns void
language sql
as $$
  select pg_advisory_unlock(hashtext('city_news_refresh'));
$$;
