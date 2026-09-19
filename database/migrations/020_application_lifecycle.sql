-- The application lifecycle becomes a process instead of five labels.
--
-- Three separate problems are fixed together because they are the same problem:
-- nothing in the system knew *why* an application held the status it held.
--
--   1. 'submitted' and 'under_review' were two names for one state. Nothing ever
--      moved a row from the first to the second except an officer clicking a
--      button labelled "Mark under review", which told the student nothing they
--      did not already know. Every application now begins at 'under_review'.
--
--   2. 'rejected' meant three different things -- an officer said no, the
--      student failed the eligibility check at the moment of applying, or (from
--      this migration on) the round moved past them. A student who was never
--      eligible and a student who interviewed and was not chosen are not in the
--      same position, and the Super Admin undoing a mistake needs to know which
--      of the three they are looking at.
--
--   3. There was no record of a status ever having changed. reviewed_by and
--      reviewed_at hold only the most recent write, so an accidental bulk
--      rejection of three hundred people was unrecoverable: the previous
--      statuses were simply gone.
--
-- Rollback safety: 'submitted' stays in the CHECK constraint even though
-- nothing writes it any more. Removing it would mean that rolling back to the
-- previous image -- which writes 'submitted' on every application -- would fail
-- every insert with a constraint violation. The value is migrated away and
-- treated as a synonym for 'under_review' by every reader.

-- ============================================================
-- 1. Collapse 'submitted' into 'under_review'
-- ============================================================

UPDATE job_applications
   SET application_status = 'under_review'
 WHERE application_status = 'submitted';

ALTER TABLE job_applications
  ALTER COLUMN application_status SET DEFAULT 'under_review';

-- ============================================================
-- 2. Why a row holds the status it holds
-- ============================================================

-- 'student_apply'    the row was created by a student applying
-- 'eligibility_fail' born rejected: failed the criteria check at apply time
-- 'officer'          a human (officer or Super Admin) set it deliberately
-- 'manual_addition'  an officer created the row already at its final status
-- 'system_cascade'   the round moved on and this application did not
-- 'reverted'         a Super Admin put it back to an earlier stage
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS status_source VARCHAR(20) NOT NULL DEFAULT 'officer';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_applications_status_source_check'
  ) THEN
    ALTER TABLE job_applications
      ADD CONSTRAINT job_applications_status_source_check
      CHECK (status_source IN (
        'student_apply', 'eligibility_fail', 'officer',
        'manual_addition', 'system_cascade', 'reverted'
      ));
  END IF;
END $$;

-- Existing rows, classified as well as the surviving evidence allows. A row
-- nobody ever reviewed is still sitting where the student left it; one with a
-- reviewer was acted on by that person. Rows that were born rejected cannot be
-- told apart from rows an officer rejected -- reviewed_by was never set on the
-- first kind, which is exactly what distinguishes them.
UPDATE job_applications
   SET status_source = CASE
     WHEN created_by_officer IS NOT NULL             THEN 'manual_addition'
     WHEN reviewed_by IS NULL AND application_status = 'rejected'
                                                     THEN 'eligibility_fail'
     WHEN reviewed_by IS NULL                        THEN 'student_apply'
     ELSE 'officer'
   END;

-- ============================================================
-- 3. The audit trail that makes any of this reversible
-- ============================================================

-- Every status change, forever. This is what the Super Admin's "put it back"
-- reads, what an accidental cascade is undone from, and what lets the first
-- backfill sweep be rolled back as a single batch.
CREATE TABLE IF NOT EXISTS application_status_events (
    id BIGSERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    source VARCHAR(20) NOT NULL,
    -- NULL when the system did it rather than a person.
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    -- Every row written by one cascade run, or one bulk click, shares this.
    -- Undoing a mistake means undoing a batch, not hunting for rows by time.
    batch_id UUID,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_status_events_application
  ON application_status_events (application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_events_batch
  ON application_status_events (batch_id) WHERE batch_id IS NOT NULL;

-- ============================================================
-- 4. The cascade, as a visible countdown rather than a surprise
-- ============================================================

-- When an officer shortlists somebody, the other applicants are not going
-- forward -- but saying so the same second would reject everyone they had not
-- got round to marking yet. So the job gets a due date instead, shown on the
-- page, and any further marking pushes it back. The sweep only acts on rows
-- that are still due when it runs.
--
-- scope_college_id is the blast radius. A host officer or the Super Admin sees
-- every college on the job and cascades across all of them (NULL). An officer
-- of a joint college sees only their own students and can only ever cascade
-- within their own college -- rejecting someone they cannot see on their own
-- screen is not a thing the system will do.
CREATE TABLE IF NOT EXISTS job_cascade_schedule (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    -- 'shortlist': remaining under_review are dropped.
    -- 'select':    remaining shortlisted are dropped.
    stage VARCHAR(20) NOT NULL CHECK (stage IN ('shortlist', 'select')),
    -- NULL = the whole job, every college.
    scope_college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE,

    due_at TIMESTAMP NOT NULL,
    -- Reset to CURRENT_TIMESTAMP by every human marking on this job and scope;
    -- due_at is derived from it, so "three days of nobody touching this" is a
    -- fact about this column rather than a scan of the audit trail.
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMP,
    cancelled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    executed_at TIMESTAMP,
    -- The batch written when it ran, so one run can be undone whole.
    executed_batch_id UUID,
    affected_count INTEGER,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One live schedule per job, stage and scope. COALESCE because NULL never
-- equals NULL in a unique index, which would otherwise allow any number of
-- duplicate whole-job rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cascade_unique_live
  ON job_cascade_schedule (job_id, stage, COALESCE(scope_college_id, 0))
  WHERE cancelled_at IS NULL AND executed_at IS NULL;

-- The sweep's only query.
CREATE INDEX IF NOT EXISTS idx_cascade_due
  ON job_cascade_schedule (due_at)
  WHERE cancelled_at IS NULL AND executed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cascade_job
  ON job_cascade_schedule (job_id);

-- ============================================================
-- 5. How long the grace period is
-- ============================================================

-- Super-Admin-editable rather than a constant, because the right number is an
-- administrative decision about how fast colleges actually respond, not an
-- engineering one. Five days: a full working week of slack, on the view that
-- rejecting somebody who was still in the running is a worse error than a
-- tidy-up that takes an extra two days.
INSERT INTO portal_settings (setting_key, setting_value)
VALUES ('application_cascade_days', '5'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Whether the sweep runs at all. A switch that can be thrown without a deploy
-- is worth having for a rule that rejects people automatically.
INSERT INTO portal_settings (setting_key, setting_value)
VALUES ('application_cascade_enabled', 'true'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
