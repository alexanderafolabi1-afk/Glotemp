-- Outreach/leads tracker for /admin. A simple status board for the
-- sponsor-outreach targets already identified (Rwanda Development Board,
-- London & Partners, Heathrow, etc.) -- not a CRM rebuild, just somewhere
-- to record who's been contacted and what happened.
--
-- RLS rather than a security-definer RPC per row, unlike the admin_*
-- aggregate functions elsewhere in this project: those exist specifically
-- to keep a browser from ever reading a raw table of user data (profiles,
-- analytics_events). This table holds no user data at all -- organisation
-- names and outreach notes the admin types in themselves -- so a plain
-- is_admin()-gated policy is the right amount of machinery, not four
-- hand-written RPCs for basic CRUD on a handful of rows.
create table if not exists outreach_leads (
  id uuid primary key default gen_random_uuid(),
  org_name text not null,
  contact_name text,
  contact_email text,
  category text,
  status text not null default 'not_contacted'
    check (status in ('not_contacted', 'contacted', 'replied', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table outreach_leads is
  'Admin-only sponsor/partner outreach tracker. No public read path, no client-side reference anywhere outside /admin.';

alter table outreach_leads enable row level security;

drop policy if exists outreach_leads_admin_select on outreach_leads;
create policy outreach_leads_admin_select on outreach_leads
  for select to authenticated
  using (is_admin());

drop policy if exists outreach_leads_admin_insert on outreach_leads;
create policy outreach_leads_admin_insert on outreach_leads
  for insert to authenticated
  with check (is_admin());

drop policy if exists outreach_leads_admin_update on outreach_leads;
create policy outreach_leads_admin_update on outreach_leads
  for update to authenticated
  using (is_admin())
  with check (is_admin());

create or replace function touch_outreach_lead_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_outreach_leads_updated_at on outreach_leads;
create trigger trg_outreach_leads_updated_at
  before update on outreach_leads
  for each row execute function touch_outreach_lead_updated_at();

-- The leads already identified in conversation with the site owner, so
-- the board isn't empty on first load. Real outreach status (contacted/
-- replied/closed) is for the admin to update by hand as it happens --
-- everything starts 'not_contacted' since none of this has been sent yet.
insert into outreach_leads (org_name, category, notes) values
  ('Rwanda Development Board', 'Tourism board', 'Identified as a potential sponsor/partner lead for city-of-the-week style placement.'),
  ('London & Partners', 'Tourism board', 'City promotion agency for London; potential partner for check-in reward vouchers.'),
  ('Heathrow', 'Travel/transport', 'Airport partner candidate for traveller-facing perks (lounge, transit vouchers).');
