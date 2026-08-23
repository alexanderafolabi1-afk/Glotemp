-- Schedule the campus-layer university collector.
--
-- Daily is generous for something that mostly skips already-covered
-- cities (see the function's own comment on why), but Wikidata's query
-- service is free and this collector is polite to it (a real UA,
-- REQUEST_GAP_MS between cities, a bounded per-query radius) -- daily
-- keeps forward progress on cities still uncovered without hammering
-- anything. 05:37 sits clear of every other job on this project's cron:
-- every multiple of 5 minutes is already taken by city-news-refresh's
-- */5 schedule, and hour 5 otherwise only has overpass-food-daily
-- (:00).
do $$
begin
  perform cron.unschedule('wikidata-universities-daily');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.schedule('wikidata-universities-daily', '37 5 * * *',
    $c$select invoke_edge_function('wikidata-universities');$c$);
exception when others then
  raise notice 'pg_cron unavailable, wikidata-universities-daily not scheduled: %', sqlerrm;
end $$;
