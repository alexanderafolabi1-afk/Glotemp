-- Real three-tier city status: Listed / Verified / Anchor, gated on real
-- data depth already present in `readings`, never an arbitrary distinction.
--
-- Listed: every city with a page (baseline Pulse data). No check needed
-- here -- it's the "else" branch below, and is deliberately never called
-- out with its own badge on the page (see city-tier.js): the point of
-- this tier is that it's the open, unearned default, not an achievement.
--
-- Verified: at least one reading from a "deeper" source beyond the
-- baseline Pulse/mood signal. github_activity, remotive_jobs and
-- hipolabs_universities are the three named in the brief that created
-- this. Checked live against `readings` before writing this function:
-- only github_activity has ever produced rows (9 cities). remotive_jobs
-- and hipolabs_universities are wired up and scheduled but have not
-- written a row yet (hipolabs' cron had the same malformed net.http_post
-- bug already fixed for remotive/github elsewhere -- fixed in this same
-- session, see the hipolabs-education-weekly cron.schedule update).
-- Verified will grow automatically as those two start producing real
-- rows; nothing here needs to change for that.
--
-- Anchor: a Verified city that ALSO has a real structural-base entry.
-- The brief called for "a Eurostat/OECD structural-base entry," matching
-- the eligibility check already built for the (never-shipped) Top 20
-- leaderboard -- neither exists anywhere in this project: no
-- Eurostat/OECD source was ever built, and the leaderboard itself was
-- only ever investigated (UN-Habitat CPI coverage, live-mover audit),
-- never turned into a saved eligibility function or a shipped UI. There
-- is nothing real to reuse.
--
-- STAND-IN, DISCLOSED: `world_bank` (world-bank-finance edge function,
-- finance vertical) is real structural economic data already in this
-- project and is used here in place of the originally-planned
-- Eurostat/OECD source. If a real Eurostat/OECD pipeline is ever built,
-- swap the source name below for it -- the rest of this function's logic
-- does not need to change. Note also that world_bank's own cron
-- (world-bank-daily) has the same malformed net.http_post bug as the
-- hipolabs job did; its 18 cities of data are a one-time historical
-- snapshot from before that job broke, not a live-updating feed. That
-- bug is outside this migration's scope (not one of the three sources
-- named in the brief) and is left unfixed here, but is worth knowing
-- when reading Anchor's real count.
--
-- Thresholds and source names are intentionally not exposed to the
-- client -- same private-methodology approach as the (unbuilt) Top 20
-- leaderboard and the admin-only Temp-Reporter tiers. The client gets
-- only the resulting label.
create or replace function public.city_tier(p_city_slug text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from readings deep
      where deep.city_slug = p_city_slug
        and deep.source in ('github_activity', 'remotive_jobs', 'hipolabs_universities')
    ) and exists (
      select 1
      from readings structural
      where structural.city_slug = p_city_slug
        and structural.source = 'world_bank'
    ) then 'anchor'
    when exists (
      select 1
      from readings deep
      where deep.city_slug = p_city_slug
        and deep.source in ('github_activity', 'remotive_jobs', 'hipolabs_universities')
    ) then 'verified'
    else 'listed'
  end;
$$;

grant execute on function public.city_tier(text) to anon, authenticated;
