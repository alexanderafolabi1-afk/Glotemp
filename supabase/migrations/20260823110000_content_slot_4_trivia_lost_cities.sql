-- Widens both content calendars from 3 daily slots to 4, so a new
-- recurring content type -- city trivia and lost/mythical cities -- can
-- be mixed into the existing 30-day rotation without touching any of
-- the 180 rows already scheduled across social_content_queue and
-- x_content_calendar (both check (slot_number between 1 and 3), both
-- fully seeded at 90 rows each; there is no unused slot to insert into
-- otherwise, and the day_number range itself is a genuine campaign
-- window, not something to extend).
--
-- Purely additive: existing rows and their unique(day_number,
-- slot_number) keys are untouched, this only raises the ceiling the
-- CHECK allows so slot_number = 4 becomes valid. The actual slot-4
-- content is inserted by the two migrations that follow this one.
alter table social_content_queue drop constraint if exists social_content_queue_slot_number_check;
alter table social_content_queue add constraint social_content_queue_slot_number_check
  check (slot_number between 1 and 4);

alter table x_content_calendar drop constraint if exists x_content_calendar_slot_number_check;
alter table x_content_calendar add constraint x_content_calendar_slot_number_check
  check (slot_number between 1 and 4);
