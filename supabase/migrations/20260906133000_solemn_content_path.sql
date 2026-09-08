-- PART 3: current/solemn content, structurally separated from the
-- growth-engine queue. The structural rule the brief asked for is
-- literal here, not a convention someone could forget to follow:
-- solemn_content_queue's only content column is `message`. There is no
-- cta_text, cta_url, button_label, swipe_prompt or any column shaped
-- like one -- nothing exists for a human or an automation to fill a
-- call-to-action into, ever. The two relief-organisation columns live
-- on solemn_situations (below), as fixed reference data the automation
-- reads to (a) put the same two real organisations in the authored
-- message text and (b) know what "still active" means -- never as a
-- separate promotional field on a post.
--
-- Fully automated, no manual-review step anywhere in this path by
-- design: solemn-next-post (the edge function reading this) requires no
-- human approval before a due row posts, same shape as social-next-post
-- but on its own tables, its own weekly cadence, and its own Make
-- scenario -- so a mistake in the growth-engine path can never touch
-- this one and vice versa.
create table if not exists solemn_situations (
  id uuid primary key default gen_random_uuid(),
  situation_key text not null unique,
  label text not null,
  started_at date not null,
  -- The taper mechanism the brief asked for: a real, checked cutoff
  -- rather than a cadence that runs forever unwatched. Checked on every
  -- solemn-next-post poll (see that function) -- once today passes this
  -- date, the situation is flipped inactive automatically and no further
  -- row is ever surfaced, without a human having to remember to turn it
  -- off. An honest estimate, documented per-situation, not a promise --
  -- if the real situation resolves sooner, or runs longer, this date is
  -- the one thing a human should come back and adjust.
  cutoff_estimate_date date not null,
  relief_org_1_name text not null,
  relief_org_1_url text not null,
  relief_org_2_name text not null,
  relief_org_2_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists solemn_content_queue (
  id uuid primary key default gen_random_uuid(),
  situation_key text not null references solemn_situations(situation_key),
  sequence_number int not null,
  -- THE ONLY CONTENT COLUMN. No cta/link/button field exists on this
  -- table, structurally, so there is nothing to ever fill one in with --
  -- see the header comment.
  message text not null,
  next_due_at timestamptz not null,
  posted_instagram_at timestamptz,
  posted_instagram_id text,
  posted_facebook_at timestamptz,
  posted_facebook_id text,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (situation_key, sequence_number)
);

create index if not exists idx_solemn_content_queue_due
  on solemn_content_queue (next_due_at)
  where posted_instagram_at is null or posted_facebook_at is null;

-- Service-role only: RLS enabled, zero policies -- same convention as
-- social_content_queue and every other internal-automation table in
-- this project. Anon/authenticated get no access at all.
alter table solemn_situations enable row level security;
alter table solemn_content_queue enable row level security;

-- The real, live situation: Rasuwa/Nuwakot flooding along the Bhote
-- Koshi River, active search and rescue as of 2026-09-06. Cutoff
-- estimated at ~8 weeks out (2026-11-01) -- a conservative, documented
-- estimate matching how long major flood/landslide search-and-rescue
-- operations typically run before response shifts to recovery, not a
-- guess dressed up as certainty. A human should revisit this date if
-- the real situation resolves faster, or needs longer.
insert into solemn_situations
  (situation_key, label, started_at, cutoff_estimate_date, relief_org_1_name, relief_org_1_url, relief_org_2_name, relief_org_2_url, active)
values
  ('nepal-flooding-2026', 'Nepal flooding — Rasuwa/Nuwakot, Bhote Koshi River', '2026-09-06', '2026-11-01',
   'Nepal Red Cross Society', 'https://www.nrcs.org/',
   'UNICEF', 'https://www.unicef.org/emergencies',
   true)
on conflict (situation_key) do nothing;

-- Seven messages: today's exact acknowledgment, then six weekly
-- follow-ups (~6 weeks of real runway, safely inside the cutoff
-- estimate above). Never a specific casualty/rescue figure in any of
-- them -- this path is fully automated and unreviewed at post time, so
-- nothing here states a number this pipeline cannot verify at the
-- moment it actually posts. Every message points to the same two real
-- organisations by name; none of them carry a CTA field, because none
-- exists on this table.
insert into solemn_content_queue (situation_key, sequence_number, message, next_due_at) values
  ('nepal-flooding-2026', 1,
   'Rasuwa, Nuwakot, and the communities along the Bhote Koshi River are living through something none of us can fully imagine right now. Search and rescue is still underway. Glo-temp exists because we believe every place, and every person in it, matters enough to pay attention to. Right now, that means looking toward Nepal, not away from it.

If you''re able, the Nepal Red Cross Society and UNICEF are both on the ground providing real, immediate relief. Links in bio.',
   now()),
  ('nepal-flooding-2026', 2,
   'One week on, search and rescue around Rasuwa, Nuwakot, and the Bhote Koshi River is still active. We''re continuing to hold space for Nepal here, because a place doesn''t stop mattering once it leaves the headlines.

The Nepal Red Cross Society and UNICEF are still on the ground. If you''re able to help, links in bio.',
   now() + interval '7 days'),
  ('nepal-flooding-2026', 3,
   'Two weeks in, and the communities along the Bhote Koshi River are still working through what this has meant for them. Recovery takes longer than attention usually does — we''re trying not to look away early.

The Nepal Red Cross Society and UNICEF remain on the ground providing real relief. Links in bio.',
   now() + interval '14 days'),
  ('nepal-flooding-2026', 4,
   'Rasuwa and Nuwakot are still very much on our minds. However this unfolds from here, it deserves more than a single news cycle''s worth of attention.

If you''re able to support the response, the Nepal Red Cross Society and UNICEF are both doing real work on the ground. Links in bio.',
   now() + interval '21 days'),
  ('nepal-flooding-2026', 5,
   'A month on from the flooding along the Bhote Koshi River, the work of rebuilding continues, even as the news cycle moves elsewhere. Glo-temp exists because every place matters enough to keep paying attention to, not just at the start.

The Nepal Red Cross Society and UNICEF are still providing real relief on the ground. Links in bio.',
   now() + interval '28 days'),
  ('nepal-flooding-2026', 6,
   'Still thinking about Rasuwa, Nuwakot, and the communities along the Bhote Koshi River. Long recoveries need long attention spans — we''re trying to offer ours.

The Nepal Red Cross Society and UNICEF continue their work on the ground. If you''re able to help, links in bio.',
   now() + interval '35 days'),
  ('nepal-flooding-2026', 7,
   'As the response in Nepal moves from emergency rescue toward longer-term recovery, we''re keeping the Nepal Red Cross Society and UNICEF''s work linked in bio for anyone still able to support it. Rasuwa, Nuwakot, and the communities along the Bhote Koshi River remain in our thoughts.',
   now() + interval '42 days')
on conflict (situation_key, sequence_number) do nothing;
