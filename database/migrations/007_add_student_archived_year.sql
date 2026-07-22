-- 007: Stamp the academic year onto students at year-end reset.
-- The academic year reset deactivates every student account (they can no
-- longer log in) but keeps their records for PO/SA reference. This column
-- records WHICH passed-out batch each archived student belongs to, so the
-- archived-students view can be filtered/exported per year. NULL = a current,
-- still-active student (never archived).
-- Idempotent: safe to run where this already exists.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS archived_academic_year VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_students_archived_year ON students(archived_academic_year);
