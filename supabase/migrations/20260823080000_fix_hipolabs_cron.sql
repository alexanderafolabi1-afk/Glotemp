-- hipolabs-education-weekly has the exact same malformed net.http_post
-- call already diagnosed and fixed for remotive-work-daily and
-- github-tech-hourly in 20260818090000_fix_remotive_github_cron.sql: the
-- headers jsonb object was passed positionally as `params` (arg 3), and
-- the bare string 'application/json' was passed where `headers` (arg 4,
-- jsonb) was expected, which isn't valid JSON on its own:
--   ERROR: invalid input syntax for type json
--   LINE 5: 'application/json'
-- Confirmed live: this job has failed with that exact error on every run
-- (2026-08-09, 2026-08-16), and hipolabs_universities has zero rows in
-- readings as a direct result. That earlier migration fixed the other two
-- jobs but missed this one. Same fix, same reasoning: repoint at
-- invoke_edge_function(text), already proven working in production.
do $$
begin
  perform cron.unschedule('hipolabs-education-weekly');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.schedule('hipolabs-education-weekly', '0 9 * * 0',
    $c$select invoke_edge_function('hipolabs-education');$c$);
exception when others then
  raise notice 'pg_cron unavailable, hipolabs-education-weekly not scheduled: %', sqlerrm;
end $$;
