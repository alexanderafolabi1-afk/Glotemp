-- Session-scoped advisory locks (city_news_try_lock/unlock, added in the
-- previous migration) don't reliably hold across PostgREST/RPC calls
-- under connection pooling -- the connection that acquires the lock is
-- not guaranteed to be the same one PostgREST hands back for the unlock
-- call, so the lock could leak or never actually exclude anything.
-- Replaced with a plain row-level mutex: a single atomic UPDATE claims
-- the lock (or is a no-op if someone else holds it), which is safe under
-- any pooling mode because it's one statement, not a session state.
drop function if exists city_news_try_lock();
drop function if exists city_news_unlock();

alter table city_news_cursor add column if not exists locked_at timestamptz;
