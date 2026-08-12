-- Glotemp: sponsorship credit placements.
--
-- Not an ad-server table -- a small register of paid sponsorship credits
-- ("the strip") that render on matching city/vertical pages. The client
-- queries this table directly with the anon key (same pattern as
-- `readings`), so the row shape and RLS policy together are the entire
-- access-control surface: a public caller must never be able to see an
-- inactive or out-of-window placement, and must never be able to write.
create table if not exists advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  tagline text,
  logo_path text not null,
  tier text not null,
  city_slug text,
  vertical text,
  format text not null default 'credit',
  start_date date not null,
  end_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Matches the client's query shape: city_slug=eq.X&vertical=eq.Y
create index if not exists idx_advertisers_city_vertical
  on advertisers(city_slug, vertical);

alter table advertisers enable row level security;

-- Public read is scoped to exactly the rows that should be visible on the
-- live site right now: active, and today falls within the placement's
-- flight window. There is deliberately no insert/update/delete policy for
-- anon/authenticated -- placements are managed with the service role key
-- (migrations, dashboard, or a future internal tool), never from the
-- client.
drop policy if exists "advertisers_select_current" on advertisers;
create policy "advertisers_select_current" on advertisers
  for select
  using (
    active = true
    and current_date between start_date and end_date
  );

grant select on advertisers to anon, authenticated;
