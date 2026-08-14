-- Rebuild of the per-city check-in/comment composer: readings now carry a
-- five-band mood plus an optional 280-char comment, posted either under the
-- signer's display name or anonymously. mode/intensity were the old
-- Eat/Drink/Watch/Move/Make + 1-10 slider shape the new composer no longer
-- collects, so they become optional rather than being dropped outright
-- (0 rows exist in production at the time this ran, so this is a pure
-- widening, not a backfill).

alter table observations add column if not exists mood text
  check (mood in ('charged', 'warm', 'steady', 'restrained', 'low'));

alter table observations add column if not exists is_anonymous boolean not null default false;

alter table observations alter column mode drop not null;
alter table observations alter column intensity drop not null;

alter table observations alter column mood set not null;

alter table observations drop constraint if exists observations_note_check;
alter table observations add constraint observations_note_check
  check (note is null or char_length(note) <= 280);

-- ===== COMMENT_REJECTIONS =====
-- Every submit blocked by client-side moderation (profanity/slurs/
-- harassment/threats) is logged here rather than just shown an inline
-- message and discarded, so rejections are auditable.
create table if not exists comment_rejections (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(user_id) on delete cascade,
  city_slug text not null,
  reason text not null,
  attempted_text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_comment_rejections_created_at on comment_rejections(created_at desc);
create index if not exists idx_comment_rejections_user_id on comment_rejections(user_id);

alter table comment_rejections enable row level security;

drop policy if exists "comment_rejections_insert_own" on comment_rejections;
create policy "comment_rejections_insert_own" on comment_rejections
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "comment_rejections_select_own" on comment_rejections;
create policy "comment_rejections_select_own" on comment_rejections
  for select to authenticated using (auth.uid() = user_id);

grant select, insert on comment_rejections to authenticated;
