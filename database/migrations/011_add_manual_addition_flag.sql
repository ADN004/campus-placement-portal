-- Migration 011: Add manual addition tracking to job_applications
-- This allows tracking students manually added to jobs (didn't apply but got selected)

-- Add is_manual_addition column to track manually added students
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS is_manual_addition BOOLEAN DEFAULT FALSE;

-- Add index for filtering manual additions
CREATE INDEX IF NOT EXISTS idx_job_applications_manual_addition
ON job_applications(is_manual_addition);

-- Add index for querying manual additions by job
CREATE INDEX IF NOT EXISTS idx_job_applications_job_manual
ON job_applications(job_id, is_manual_addition)
WHERE is_manual_addition = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN job_applications.is_manual_addition IS
'Indicates if this student was manually added to the job (did not apply through regular process). Used for tracking students added after drive completion or when eligibility criteria were relaxed.';
