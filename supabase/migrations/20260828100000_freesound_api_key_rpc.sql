-- Part 3, Global Audio-Stream Integration: real key so the new
-- freesound-search edge function can call Freesound.org server-side.
-- Same pattern as get_vapid_private_key() (20260818110000) -- the key
-- itself lives in vault.secrets (name 'freesound_api_key'), PostgREST
-- never exposes the vault schema directly, and only service_role can
-- execute this RPC, so a browser calling PostgREST directly can never
-- read the key out through it.
create or replace function get_freesound_api_key()
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'freesound_api_key' limit 1;
$$;

revoke all on function get_freesound_api_key() from public, anon, authenticated;
grant execute on function get_freesound_api_key() to service_role;
