-- Public "suggest a city" queue: anyone can submit a city for inclusion,
-- no account required. Admin reviews every submission by hand -- this
-- table only ever records the review DECISION (status), it never
-- triggers anything automatically. Actually adding a city to the live
-- roster is still the same manual step it always was (a row in
-- cities-data.js + a regenerated page), on purpose: "no auto-approval"
-- means exactly that, not "auto-approval behind a status flag."
--
-- RLS shape follows curated_listings' own precedent for this exact
-- pattern (public submits, admin reviews) rather than outreach_leads':
-- outreach_leads is populated only by the admin themselves, so it never
-- needed a public INSERT policy. This table does.
create table if not exists city_applications (
  id uuid primary key default gen_random_uuid(),
  city_name text not null,
  country text not null,
  contact_email text not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

comment on table city_applications is
  'Public city-suggestion queue. Anyone can insert; only an admin can read or update. Approving here is a review decision, not a publish action -- a city still has to be added to cities-data.js by hand.';

alter table city_applications enable row level security;

drop policy if exists city_applications_public_insert on city_applications;
create policy city_applications_public_insert on city_applications
  for insert to anon, authenticated
  with check (
    length(trim(city_name)) > 0
    and length(trim(city_name)) <= 120
    and length(trim(country)) > 0
    and length(trim(country)) <= 120
    and length(trim(contact_email)) > 0
    and length(contact_email) <= 320
    and (note is null or length(note) <= 1000)
    and status = 'pending'
  );

drop policy if exists city_applications_admin_select on city_applications;
create policy city_applications_admin_select on city_applications
  for select to authenticated
  using (is_admin());

drop policy if exists city_applications_admin_update on city_applications;
create policy city_applications_admin_update on city_applications
  for update to authenticated
  using (is_admin())
  with check (is_admin());

create or replace function touch_city_application_reviewed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status and new.status != 'pending' then
    new.reviewed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_city_applications_reviewed_at on city_applications;
create trigger trg_city_applications_reviewed_at
  before update on city_applications
  for each row execute function touch_city_application_reviewed_at();
