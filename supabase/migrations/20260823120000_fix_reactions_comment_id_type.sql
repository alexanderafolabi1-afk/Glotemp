-- Fixes a real, previously undiscovered bug: reactions have never once
-- successfully saved in production.
--
-- reactions was created outside the migrations folder (via the Studio
-- UI), which defaults a new table's columns to bigint. comment_id was
-- left at that default. But every real caller -- app.js's
-- `GlotempReactions.barHTML(obs.id)`, glotemp-checkin.js's
-- `barHTML(row.id)`, and glotemp-reactions.js's own POST body
-- (`comment_id: id`) -- passes an observations.id, which is a uuid. A
-- uuid string cannot cast to bigint; every insert has been failing at
-- the database level since this shipped. Confirmed live: `select
-- count(*) from reactions` returns 0, and there is no foreign key on
-- comment_id at all, so nothing was ever silently linking it to
-- anything either.
--
-- There is no city_comments-based comment entity live to reconcile
-- this against -- `city_comments` does not exist in this database
-- (confirmed via information_schema; the table tempo-economy.js still
-- references was apparently never created, or was dropped, and that
-- file's comment feature has been talking to nothing this whole time).
-- The only real "thing a reaction reacts to" in the current, live
-- check-in flow is an observations row. This migration makes the
-- column match that reality: uuid, with a real foreign key.
--
-- Safe as a plain type change: the table has zero rows to convert.
alter table reactions alter column comment_id type uuid using comment_id::text::uuid;

alter table reactions
  add constraint reactions_comment_id_fkey
  foreign key (comment_id) references observations(id) on delete cascade;

-- No new index needed: idx_reactions_comment(comment_id, type), added by
-- 20260821140000_reaction_rate_limit.sql, already covers comment_id
-- lookups as a leftmost prefix.
