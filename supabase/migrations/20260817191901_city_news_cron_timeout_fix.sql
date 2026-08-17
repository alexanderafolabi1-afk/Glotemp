-- The scheduled job's own pg_net call was given only 60 seconds to
-- finish. Live testing showed a single city can legitimately take up to
-- ~90s once GDELT starts 429-ing (3 attempts, each up to a 20s timeout,
-- separated by 6s/12s backoff), and a batch of several such cities adds
-- up fast. When the caller (pg_net) hits its own timeout and disconnects,
-- Supabase tears the function down mid-run -- its finally block never
-- gets to release the row lock, which then sits held until the 12-minute
-- staleness window expires on its own. 60s all but guaranteed that on
-- every run that hit any rate limiting at all.
select cron.schedule(
  'city-news-refresh',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://hnysztednzqfzbmiqqgl.supabase.co/functions/v1/city-news',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 280000
  );
  $$
);
