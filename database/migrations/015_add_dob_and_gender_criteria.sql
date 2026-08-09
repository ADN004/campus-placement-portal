-- Two more eligibility criteria on a job: a date-of-birth cutoff and a gender
-- requirement. Both optional, both enforced exactly like CGPA and branch once
-- set.
--
-- dob_on_or_before, not "minimum age in years". A company states this as
-- "born on or before 01/01/2005", and storing it that way means it identifies
-- one fixed set of students forever. An age in years does not: it only means
-- something relative to a date, and it drifts — a student blocked on Monday
-- qualifies on Friday because they had a birthday, and an eligible-students
-- list exported at the start of a drive is wrong by the end of it. The cutoff
-- expresses a minimum age exactly and cannot drift.
--
-- students.date_of_birth is NOT NULL, so unlike height and weight there is no
-- "student has not filled this in" case to decide.
--
-- gender_requirement defaults to 'all', so every job that exists today keeps
-- admitting everybody. 'male' and 'female' mean only students recorded as that
-- gender: students recorded 'Other', and any with no gender recorded, are not
-- eligible for a gendered drive. They remain eligible for every 'all' job,
-- which is the default and the overwhelming majority.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS dob_on_or_before DATE,
  ADD COLUMN IF NOT EXISTS gender_requirement VARCHAR(10) NOT NULL DEFAULT 'all';

ALTER TABLE job_requests
  ADD COLUMN IF NOT EXISTS dob_on_or_before DATE,
  ADD COLUMN IF NOT EXISTS gender_requirement VARCHAR(10) NOT NULL DEFAULT 'all';

-- Named so a failed re-run is obvious, and added separately from the column so
-- the migration stays idempotent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_jobs_gender_requirement') THEN
    ALTER TABLE jobs ADD CONSTRAINT check_jobs_gender_requirement
      CHECK (gender_requirement IN ('all', 'male', 'female'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_job_requests_gender_requirement') THEN
    ALTER TABLE job_requests ADD CONSTRAINT check_job_requests_gender_requirement
      CHECK (gender_requirement IN ('all', 'male', 'female'));
  END IF;
END $$;

COMMENT ON COLUMN jobs.dob_on_or_before IS
  'Latest permitted date of birth. NULL means no age requirement. A student qualifies when date_of_birth <= this date.';
COMMENT ON COLUMN jobs.gender_requirement IS
  '''all'' (default), ''male'' or ''female''. A gendered value admits only students recorded as exactly that gender.';
