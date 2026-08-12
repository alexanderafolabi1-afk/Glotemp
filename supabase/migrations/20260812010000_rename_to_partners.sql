-- Renames the sponsorship-credit placement table and its RLS policy/index
-- away from ad-industry vocabulary (advertisers/sponsor). An ad blocker's
-- cosmetic and network filter lists match on exactly these substrings --
-- "advertis-", "sponsor" -- in element ids/classes and request URLs, which
-- is why the credit strip was silently disappearing for visitors running
-- one. The rename is purely of identifiers; no row, no column, and no
-- behaviour changes.
alter table advertisers rename to partners;

alter index idx_advertisers_city_vertical rename to idx_partners_city_vertical;

drop policy if exists "advertisers_select_current" on partners;
create policy "partners_select_current" on partners
  for select
  using (
    active = true
    and current_date between start_date and end_date
  );
