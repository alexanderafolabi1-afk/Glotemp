-- Index the sort the boards actually use: coalesce(published_at, fetched_at).
--
-- WHY THE OLD INDEXES NO LONGER MATCH THE QUERY
-- published_at used to be filled with GDELT's `seendate`, which is when
-- GDELT's crawler saw an article, not when anyone published it -- and
-- GDELT crawls in fifteen-minute windows, which is why every stored row
-- landed on an exact quarter hour and freshness could not be checked.
-- The edge function no longer writes it: GDELT's ArtList response has no
-- publication-date field at all, so published_at is null for every row
-- it produces, and city_news.fetched_at carries recency instead.
--
-- Both existing indexes lead on published_at, so against a column that
-- is now uniformly null they sort nothing useful. This adds the
-- expression index for the ordering every consumer moved to. The old
-- indexes are left in place: a feed that does carry a real publish date
-- can still be added, and dropping an index is not something to do in
-- the same change that stops writing the column.

create index if not exists idx_city_news_city_coalesced
  on city_news (city_slug, (coalesce(published_at, fetched_at)) desc);

create index if not exists idx_city_news_city_scope_coalesced
  on city_news (city_slug, scope, (coalesce(published_at, fetched_at)) desc);

comment on column city_news.published_at is
  'The feed''s own publication date, or null when the feed does not supply one. Never the run time and never a crawl timestamp. GDELT ArtList supplies no publication date, so rows from it are null here and rely on fetched_at.';

-- The 72-hour purge has to move to the same expression, or it will
-- delete every GDELT row immediately: those rows have published_at null,
-- and the previous version treated a null date as unshowable and swept
-- it up. That was correct when published_at was the only signal; with
-- fetched_at present it would wipe the table on the first run.
create or replace function purge_stale_city_news()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from city_news
  where coalesce(published_at, fetched_at) is null
     or coalesce(published_at, fetched_at) < now() - interval '72 hours';
  get diagnostics removed = row_count;
  if removed > 0 then
    raise notice 'purge_stale_city_news: removed % row(s)', removed;
  end if;
  return removed;
end;
$$;

comment on function purge_stale_city_news() is
  'Deletes city_news rows whose coalesce(published_at, fetched_at) is older than 72 hours, or absent. Runs hourly so a stalled refresh job cannot leave stale headlines on a city page.';

revoke all on function purge_stale_city_news() from public;
