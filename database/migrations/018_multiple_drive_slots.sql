-- A job can be run in more than one place.
--
-- job_drives held job_id UNIQUE, so a job had exactly one date, one time and
-- one venue. A drive that the whole state applies to is not held in one hall:
-- there are five regions, and an officer needs to publish a venue in each. The
-- rule that made that impossible was a database constraint, not a UI limit.
--
-- Kept in job_drives rather than moved to a new table. Every reader already
-- selects from here -- the student dashboard, the job list, the applications
-- screen, both officer paths and the Super Admin's -- and a new table would
-- mean rewriting all of them for no gain. Dropping the constraint turns each
-- existing row into that job's first slot with nothing to move.
--
-- Additive on purpose, so a rollback to the previous image is safe: the old
-- code writes and reads exactly one row per job, which is still valid here.

ALTER TABLE job_drives DROP CONSTRAINT IF EXISTS job_drives_job_id_key;

-- Slots share one set of instructions unless an officer overrides a particular
-- one. The shared text is copied onto every slot that uses it, so
-- additional_instructions stays a per-row column and every existing reader --
-- the notification sentence, the calendar invitation, all three student screens
-- -- keeps working without knowing this column exists. The flag is only how the
-- composer tells, on reopening, which slots to show as edited.
ALTER TABLE job_drives
  ADD COLUMN IF NOT EXISTS has_custom_instructions BOOLEAN NOT NULL DEFAULT FALSE;

-- When students were last told about this job's drive. Adding a sixth venue a
-- week later means the people already notified are holding a message that is
-- now incomplete; without this there is no way to know they were ever told.
-- Stamped on every slot of the job, since a drive is notified as one event.
ALTER TABLE job_drives
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP;

-- Slots are read as a job's list in chronological order, which is now the hot
-- path on every screen that shows a drive.
CREATE INDEX IF NOT EXISTS idx_job_drives_job_when
  ON job_drives (job_id, drive_date, drive_time, id);
