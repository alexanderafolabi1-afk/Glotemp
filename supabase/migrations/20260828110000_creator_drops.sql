-- Part 4, Hyper-Local Creator Drops. Genuinely new -- no existing table
-- this extends. Two tables, same two-step shape as offers/partner_leads
-- (20260825000000_partner_offers.sql): a public submission queue an
-- admin reviews by hand, and a separate live table an admin (or a
-- future admin panel form) writes into directly -- approving a
-- submission is a review decision, never an automatic publish, same
-- rule city_applications and partner_leads already hold to.
--
-- Both tables start, and stay, completely empty until a real creator
-- submits real work and a person reviews it -- no seed rows, same as
-- outreach_leads and partner_leads.

-- ===== SUBMISSIONS =====
create table if not exists creator_drop_submissions (
  id uuid primary key default gen_random_uuid(),
  creator_name text not null,
  creator_url text not null,
  city_slug text,
  city_as_entered text not null,
  content_type text not null
    check (content_type in ('video', 'audio', 'photo', 'writing', 'event', 'other')),
  content_url text not null,
  proposed_starts_at date,
  proposed_ends_at date,
  contact_email text not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

comment on table creator_drop_submissions is
  'Public "attach your real work to a city" submission queue. Anyone can insert; only an admin can read or update. Approving here is a review decision, not a publish action -- a real creator_drops row is still a separate manual step, same as city_applications never auto-adds a city.';

create index if not exists idx_creator_drop_submissions_status on creator_drop_submissions(status, created_at desc);

alter table creator_drop_submissions enable row level security;

drop policy if exists creator_drop_submissions_public_insert on creator_drop_submissions;
create policy creator_drop_submissions_public_insert on creator_drop_submissions
  for insert to anon, authenticated
  with check (
    length(trim(creator_name)) > 0 and length(trim(creator_name)) <= 160
    and length(trim(creator_url)) > 0 and length(creator_url) <= 500
    and length(trim(city_as_entered)) > 0 and length(city_as_entered) <= 120
    and length(trim(content_url)) > 0 and length(content_url) <= 500
    and length(trim(contact_email)) > 0 and length(contact_email) <= 320
    and (note is null or length(note) <= 1000)
    and status = 'pending'
  );

drop policy if exists creator_drop_submissions_admin_select on creator_drop_submissions;
create policy creator_drop_submissions_admin_select on creator_drop_submissions
  for select to authenticated
  using (is_admin());

drop policy if exists creator_drop_submissions_admin_update on creator_drop_submissions;
create policy creator_drop_submissions_admin_update on creator_drop_submissions
  for update to authenticated
  using (is_admin())
  with check (is_admin());

create or replace function touch_creator_drop_submission_reviewed_at()
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

drop trigger if exists trg_creator_drop_submissions_reviewed_at on creator_drop_submissions;
create trigger trg_creator_drop_submissions_reviewed_at
  before update on creator_drop_submissions
  for each row execute function touch_creator_drop_submission_reviewed_at();

-- ===== LIVE DROPS =====
-- Same "anyone reads active rows within their date window, nobody
-- outside staff writes" shape as offers.
create table if not exists creator_drops (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null,
  creator_name text not null,
  creator_url text not null,
  content_type text not null
    check (content_type in ('video', 'audio', 'photo', 'writing', 'event', 'other')),
  content_url text not null,
  title text not null,
  description text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table creator_drops is
  'Real creator work attached to a city for a real time window. Written only by staff (service role / future admin form) after reviewing a creator_drop_submissions row by hand -- never auto-populated from a submission, and never seeded.';

create index if not exists idx_creator_drops_city_active on creator_drops(city_slug, active);

alter table creator_drops enable row level security;

drop policy if exists creator_drops_select_active on creator_drops;
create policy creator_drops_select_active on creator_drops
  for select using (
    active = true
    and now() >= starts_at
    and (ends_at is null or now() <= ends_at)
  );

grant select on creator_drops to anon, authenticated;
