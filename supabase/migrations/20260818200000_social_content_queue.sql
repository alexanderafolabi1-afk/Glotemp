-- Social content queue: the 30-day / 90-post Instagram+Facebook launch
-- calendar, stored as data instead of a spreadsheet a human re-uploads.
-- Make (social-next-post edge function) reads from this; nothing here
-- is ever exposed to the browser.
--
-- day_number is 1-30, matching the calendar's own day numbering, not a
-- calendar date -- social-next-post maps day_number to an actual date
-- via a CAMPAIGN_START_DATE env var set once when the campaign goes
-- live (see that function's header comment).
--
-- posted_instagram_*/posted_facebook_* are separate, not one shared
-- posted_at/post_id: every row posts to both networks, and a retry
-- must only re-attempt whichever one actually failed. A shared column
-- would either re-post to the network that already succeeded (if
-- gated on "both must succeed before marking") or silently skip the
-- network that failed (if marked as soon as either succeeds) -- both
-- wrong. The `platform` column is kept for descriptive/reporting
-- purposes (every current row is 'instagram', matching the calendar
-- brief) but no longer gates posting on its own.
create table if not exists social_content_queue (
  id uuid primary key default gen_random_uuid(),
  day_number int not null check (day_number between 1 and 30),
  slot_number int not null check (slot_number between 1 and 3),
  scheduled_time time not null,
  platform text not null default 'instagram',
  format text,
  theme text,
  caption text not null,
  image_search_term text,
  posted_instagram_at timestamptz,
  posted_instagram_id text,
  posted_facebook_at timestamptz,
  posted_facebook_id text,
  created_at timestamptz not null default now(),
  unique (day_number, slot_number)
);

create index if not exists idx_social_content_queue_due
  on social_content_queue (scheduled_time)
  where posted_instagram_at is null or posted_facebook_at is null;

-- Service-role only: RLS enabled, zero policies. Matches api_keys /
-- push_notification_log elsewhere in this project -- anon and
-- authenticated get no access at all; only the service-role key
-- (edge functions) bypasses RLS.
alter table social_content_queue enable row level security;
