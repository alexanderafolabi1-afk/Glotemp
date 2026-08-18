-- remotive-work-daily and github-tech-hourly were scheduled with a
-- malformed net.http_post call: the headers jsonb object was passed
-- positionally as `params` (arg 3), and the bare string 'application/json'
-- was passed where `headers` (arg 4, jsonb) was expected -- which isn't
-- valid JSON on its own, so every scheduled run has failed at the SQL
-- level before the HTTP request was ever made:
--   ERROR: invalid input syntax for type json
--   LINE 5: 'application/json'
-- On top of that, the Authorization header carried a literal, never
-- substituted 'YOUR_SERVICE_ROLE_KEY' placeholder, so even a syntactically
-- correct call would have failed auth next. Net effect: neither function
-- has ever written a single row to `readings` via its schedule.
--
-- invoke_edge_function(text) (20260818050000) already exists, is already
-- proven working in production (the four glotemp-music-* jobs use it),
-- and pulls the real key from vault.decrypted_secrets rather than a
-- hardcoded literal. Repointing these two jobs at it is the minimal fix --
-- no change to either edge function's own code or metrics in this
-- migration.
do $$
begin
  perform cron.unschedule('remotive-work-daily');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.unschedule('github-tech-hourly');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.schedule('remotive-work-daily', '0 3 * * *',
    $c$select invoke_edge_function('remotive-work-data');$c$);
exception when others then
  raise notice 'pg_cron unavailable, remotive-work-daily not scheduled: %', sqlerrm;
end $$;

do $$
begin
  perform cron.schedule('github-tech-hourly', '30 * * * *',
    $c$select invoke_edge_function('github-tech-activity');$c$);
exception when others then
  raise notice 'pg_cron unavailable, github-tech-hourly not scheduled: %', sqlerrm;
end $$;
