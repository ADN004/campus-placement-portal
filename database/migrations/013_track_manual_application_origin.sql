-- Records which applications an officer created by hand.
--
-- is_manual_addition cannot answer this. The manual-add path sets it on two
-- different things: a row it inserts for a student who never applied, and a row
-- the student submitted themselves that the officer is marking selected. Only
-- the first is the officer's to take back; deleting the second would destroy a
-- student's own application.
--
-- Deliberately not backfilled. Existing is_manual_addition rows could be either
-- kind, and guessing wrong here means deleting real applications, so older
-- manual additions simply stay non-removable.

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS created_by_officer INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_applications_created_by_officer
  ON job_applications (created_by_officer)
  WHERE created_by_officer IS NOT NULL;

COMMENT ON COLUMN job_applications.created_by_officer IS
  'User id of the officer who created this application by hand. NULL when the student applied themselves. Only non-NULL rows may be removed from the applicants page.';
