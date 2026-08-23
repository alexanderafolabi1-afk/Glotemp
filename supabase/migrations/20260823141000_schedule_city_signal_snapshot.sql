-- Schedule the daily city-signal-snapshot collector.
--
-- Once a day is enough: it aggregates real user check-ins (observations)
-- and real deeper-source readings, neither of which change fast enough
-- to need polling. 04:47 sits clear of every other job on this project's
-- cron -- every multiple of 5 minutes is already taken by
-- city-news-refresh's */5 schedule, :12/:42 by wiki-attention-revisions,
-- and hour 4 otherwise only has wiki-attention-pageviews-daily (:05) and
-- glotemp-music-events (:25).
do $$
begin
  perform cron.unschedule('city-signal-snapshot-daily');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.schedule('city-signal-snapshot-daily', '47 4 * * *',
    $c$select invoke_edge_function('city-signal-snapshot');$c$);
exception when others then
  raise notice 'pg_cron unavailable, city-signal-snapshot-daily not scheduled: %', sqlerrm;
end $$;
