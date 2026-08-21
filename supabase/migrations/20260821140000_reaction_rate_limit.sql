-- Server-side rate limit on reactions: 60 an hour, per user.
--
-- WHAT THIS DOES NOT DO
-- It does not create the reactions table and it does not touch its RLS
-- policies. Both already exist. Everything here is additive: one
-- function and one BEFORE INSERT trigger.
--
-- WHY THE CLIENT CANNOT BE THE LIMIT
-- glotemp-reactions.js talks to PostgREST directly with the caller's own
-- JWT. Anything enforced only in that file is enforced only for people
-- who use that file, which is not the set of people who can POST to the
-- table. This has to be in the database to mean anything.
--
-- HOW THE HOUR IS COUNTED, AND THE ONE THING IT MISSES
-- The count is of the caller's reaction rows created in the last hour.
-- Removing a reaction deletes its row, so a user who repeatedly taps and
-- untaps the same reaction is not fully counted by this: each new tap
-- inserts a row, but the removed ones are gone and cannot be counted.
-- Catching that would need an append-only log of reaction events, which
-- would mean a new table -- explicitly out of scope here. For the
-- behaviour the limit exists to stop (one account blanketing the site
-- with reactions) counting live rows is exact, because every one of
-- those reactions has to still be there to have had any effect.

create or replace function enforce_reaction_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  -- security definer, so this sees the user's own rows regardless of the
  -- select policy the caller is subject to. A rate limit that could be
  -- dodged by not being allowed to see your own history would be no
  -- rate limit at all.
  select count(*) into recent
  from reactions
  where user_id = new.user_id
    and created_at >= now() - interval '1 hour';

  if recent >= 60 then
    -- The client matches on this text to show a specific message rather
    -- than a generic failure, so keep the words "rate limit" in it.
    raise exception 'Reaction rate limit reached: 60 reactions an hour.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function enforce_reaction_rate_limit() is
  'Blocks a 61st reaction row from one user inside a rolling hour. Additive to the existing reactions table; creates nothing.';

-- Attached only if the table is there, so this migration applies cleanly
-- against a database where reactions has not been created yet rather
-- than failing the whole run.
do $$
begin
  if to_regclass('public.reactions') is null then
    raise notice 'reactions table not present: rate limit trigger not attached';
    return;
  end if;

  execute 'drop trigger if exists trg_reaction_rate_limit on reactions';
  execute 'create trigger trg_reaction_rate_limit
             before insert on reactions
             for each row execute function enforce_reaction_rate_limit()';
end;
$$;

-- An hour-window count per user is the only thing this reads; without
-- the index it is a scan of the whole table on every single insert.
do $$
begin
  if to_regclass('public.reactions') is not null then
    execute 'create index if not exists idx_reactions_user_created
               on reactions (user_id, created_at desc)';
    -- The read path: counts for the comments currently on screen.
    execute 'create index if not exists idx_reactions_comment
               on reactions (comment_id, type)';
  end if;
end;
$$;
