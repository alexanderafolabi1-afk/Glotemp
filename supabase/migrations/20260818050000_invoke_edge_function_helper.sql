-- The vault-backed cron invoker (20260808150000) was written to fix
-- collector scheduling generally, but only the DO block scheduling the
-- original twelve data-collectors was ever authored in that file -- the
-- helper function itself was never applied to this database at all
-- (confirmed: `to_regproc('invoke_edge_function(text)')` returned null).
-- That is why 20260818040000's music-cron DO block silently no-op'd its
-- guard clause and scheduled nothing.
--
-- This applies only the helper (extensions + invoke_edge_function itself),
-- not 20260808150000's twelve-function reschedule DO block: those twelve
-- collectors already run today under a separate, hand-created set of cron
-- jobs (gdelt-sentiment-hourly, sportsdb-sport-daily, etc., calling
-- net.http_post directly). Applying that block too would schedule a
-- second, duplicate cron job per collector under the glotemp- prefix --
-- doubling the outbound request rate against GDELT, Overpass, WAQI and
-- the rest for no benefit, which is a real spike, not a hypothetical one.
-- Out of scope for the music fix and not done here.
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

-- Now that the helper actually exists, re-run 20260818040000's music
-- schedule so the four glotemp-music-* jobs get created instead of
-- silently skipped. Same jobs, same cadence -- this is not a new
-- schedule decision, just making the one already written take effect.
do $$
declare
  jobs text[][] := array[
    ['glotemp-music-nowplaying', '5,20,35,50 * * * *', 'music-sync?job=nowplaying&limit=40'],
    ['glotemp-music-events',     '25 4 * * *',          'music-sync?job=events&limit=40'],
    ['glotemp-music-stations',   '40 3 * * 1',          'music-sync?job=stations&limit=500'],
    ['glotemp-music-artists',    '55 3 * * 2',          'music-sync?job=artists&limit=25']
  ];
  i int;
begin
  for i in 1 .. array_length(jobs, 1) loop
    begin
      perform cron.unschedule(jobs[i][1]);
    exception when others then
      null;
    end;
    begin
      perform cron.schedule(jobs[i][1], jobs[i][2],
        format('select invoke_edge_function(%L);', jobs[i][3]));
    exception when others then
      raise notice 'pg_cron unavailable, music job % not scheduled: %', jobs[i][1], sqlerrm;
    end;
  end loop;
end $$;
