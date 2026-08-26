-- Self-serve counterpart to admin_issue_api_key (20260816160000). That
-- function is deliberately admin-only -- it exists for sponsor/partner
-- outreach, gated behind is_admin(). This one is the opposite case: any
-- real person on the public developers page, with no admin involved, one
-- key per email, free plan, capped low enough that an abused key costs
-- nothing but a few database rows.
create or replace function request_api_key(
  p_email text,
  p_label text default 'Self-serve'
)
returns table (id uuid, api_key text, key_prefix text, monthly_limit int)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
  v_prefix text;
  v_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_existing uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;

  -- One live key per email. Doesn't stop someone using several email
  -- addresses, but stops the one-click "click again for another key"
  -- case, and the 500/month cap on a free key bounds the damage of the
  -- rest.
  select ak.id into v_existing from api_keys ak
  where ak.contact_email = v_email and ak.revoked_at is null
  limit 1;

  if v_existing is not null then
    raise exception 'key_already_issued';
  end if;

  v_key := 'glo_live_' || encode(extensions.gen_random_bytes(32), 'hex');
  v_prefix := left(v_key, 17);

  insert into api_keys (key_hash, key_prefix, label, contact_email, plan, monthly_limit)
  values (
    encode(extensions.digest(v_key, 'sha256'), 'hex'),
    v_prefix,
    coalesce(nullif(trim(p_label), ''), 'Self-serve'),
    v_email,
    'free',
    500
  )
  returning api_keys.id into v_id;

  return query select v_id, v_key, v_prefix, 500;
end;
$$;

-- Callable by anyone, signed in or not -- this is the public signup
-- path. api_keys itself stays unreachable directly (RLS, no policies);
-- this function is the only door in for a non-admin.
grant execute on function request_api_key(text, text) to anon, authenticated;
