-- Schedule the attention layer, staggered against the music jobs and
-- every other collector already on this project's cron.
--
-- pageviews: daily at 04:05. Wikipedia's Pageviews API itself only
-- publishes daily-granularity counts -- polling faster than the data
-- actually refreshes would just re-fetch the same numbers. Placed just
-- before glotemp-music-events (04:25) and clear of glotemp-music-
-- stations (Mon 03:40) / glotemp-music-artists (Tue 03:55).
--
-- revisions: every 30 minutes, at :12 and :42. "Something is happening"
-- needs to be caught within a reasonable window of it happening, but
-- MediaWiki's own revisions API is a lightweight single-page lookup per
-- city (not a 90-day backfill like pageviews), so this is cheap to run
-- often. :12/:42 sit clear of city-news-refresh (*/5), glotemp-music-
-- nowplaying (5,20,35,50), push-send-hourly (:10), and github-tech-hourly
-- (:30).
do $$
begin
  perform cron.unschedule('wiki-attention-pageviews-daily');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.unschedule('wiki-attention-revisions');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.schedule('wiki-attention-pageviews-daily', '5 4 * * *',
    $c$select invoke_edge_function('wiki-attention?job=pageviews&limit=500');$c$);
exception when others then
  raise notice 'pg_cron unavailable, wiki-attention-pageviews-daily not scheduled: %', sqlerrm;
end $$;

do $$
begin
  perform cron.schedule('wiki-attention-revisions', '12,42 * * * *',
    $c$select invoke_edge_function('wiki-attention?job=revisions&limit=500');$c$);
exception when others then
  raise notice 'pg_cron unavailable, wiki-attention-revisions not scheduled: %', sqlerrm;
end $$;
