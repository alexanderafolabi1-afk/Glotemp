-- Glotemp: actually invoke the data-collection edge functions.
--
-- THIS IS THE ROOT CAUSE OF "readings receives no live API data".
--
-- The twelve collector functions are correct, and since the PR-101-era
-- commit they fail loudly (HTTP 502 + logs) rather than silently. But
-- nothing in this repository ever called them: there was no
-- supabase/config.toml, no .github/workflows, no pg_cron schedule, and no
-- other trigger. They have never run on a schedule, so they have written
-- zero rows. Fixing error handling could not fix that -- a function that
-- is never invoked cannot report anything at all.
--
-- This schedules each one from pg_cron via pg_net. Staggered across the
-- hour so twelve functions never hit their upstream APIs (and the shared
-- free Overpass endpoint) simultaneously.
--
-- SECRET HANDLING: the key is read from Supabase Vault at call time and is
-- never written into this file. Store it once, from the SQL editor:
--
--   select vault.create_secret(
--     '<SUPABASE_SERVICE_ROLE_KEY>', 'glotemp_service_role_key',
--     'Used by pg_cron to invoke collector edge functions');
--
-- Until that secret exists the schedule is created but each call is a
-- no-op that raises a warning, rather than firing unauthenticated.

-- Guarded: an unguarded `create extension` aborts the whole file wherever
-- the extension is unavailable (local dev, plain Postgres, branch DBs) --
-- which is precisely how the first migration in this repo broke the chain.
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron unavailable: %', sqlerrm;
end $$;

do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net unavailable: %', sqlerrm;
end $$;

-- Invoke one edge function by name. Kept as a function so the cron
-- entries stay readable and the auth/secret logic lives in exactly one
-- place.
create or replace function invoke_edge_function(fn_name text)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_key text;
  v_url text;
begin
  begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'glotemp_service_role_key'
    limit 1;
  exception when others then
    v_key := null;
  end;

  if v_key is null then
    raise warning 'invoke_edge_function(%): vault secret glotemp_service_role_key not set; skipping', fn_name;
    return;
  end if;

  v_url := 'https://hnysztednzqfzbmiqqgl.supabase.co/functions/v1/' || fn_name;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function invoke_edge_function(text) from public, anon, authenticated;

-- Re-schedulable: unschedule first so re-applying this migration does not
-- stack duplicate jobs.
do $$
declare
  j record;
  sched text;
  fns text[] := array[
    'gdelt-sentiment','github-tech-activity','world-bank-finance','remotive-work-data',
    'overpass-property','overpass-food','hipolabs-education','sportsdb-sport',
    'ticketmaster-entertainment','gdelt-fashion','waqi-health','transitland-transport'
  ];
  i int;
begin
  for j in select jobname from cron.job where jobname like 'glotemp-%' loop
    perform cron.unschedule(j.jobname);
  end loop;

  -- Every 6 hours, staggered 4 minutes apart so the twelve never collide.
  for i in 1 .. array_length(fns, 1) loop
    sched := format('%s */6 * * *', (i - 1) * 4);
    perform cron.schedule(
      'glotemp-' || fns[i],
      sched,
      format('select invoke_edge_function(%L);', fns[i])
    );
  end loop;

  -- Aggregation runs after the collectors have had time to land.
  perform cron.schedule('glotemp-aggregate-city-mood', '50 */6 * * *',
                        'select invoke_edge_function(''aggregate-city-mood'');');
  -- Tonight is heavier (sequential Overpass with backoff): once daily.
  perform cron.schedule('glotemp-tonight-layer', '30 3 * * *',
                        'select invoke_edge_function(''tonight-layer'');');
exception when undefined_table or undefined_function or insufficient_privilege then
  -- pg_cron is not available in this environment (local dev, a plain
  -- Postgres, a branch DB without the extension). Skip rather than abort
  -- the migration chain -- the same mistake that broke the first
  -- migration in this repo.
  raise notice 'pg_cron unavailable; edge function schedule not created';
end $$;
