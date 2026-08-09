-- The other end of the date-of-birth window.
--
-- 015 added dob_on_or_before, which is how a company words a minimum age
-- ("born on or before 01/01/2005" — you must be at least this old). They also
-- word the opposite: "born on or after 01/01/2005" is a maximum age, and some
-- state it as a plain "minimum age 18" instead. One bound could only express
-- the first of the three.
--
-- Two optional bounds now, exactly like min_height and max_height: either, both
-- or neither. Both NULL is the default and admits everyone. A plain minimum or
-- maximum age is converted to a date on the way in, by the form, so what is
-- stored is always the fixed cutoff rather than a number of years that would
-- mean something different next birthday.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS dob_on_or_after DATE;

ALTER TABLE job_requests
  ADD COLUMN IF NOT EXISTS dob_on_or_after DATE;

-- An impossible window — born after 2008 and before 2004 — admits nobody, and
-- is a transposition rather than an intention. Refused at the database as well
-- as in the form, the same way check_height_range already guards its pair.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_jobs_dob_window') THEN
    ALTER TABLE jobs ADD CONSTRAINT check_jobs_dob_window
      CHECK (dob_on_or_after IS NULL OR dob_on_or_before IS NULL
             OR dob_on_or_after <= dob_on_or_before);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_job_requests_dob_window') THEN
    ALTER TABLE job_requests ADD CONSTRAINT check_job_requests_dob_window
      CHECK (dob_on_or_after IS NULL OR dob_on_or_before IS NULL
             OR dob_on_or_after <= dob_on_or_before);
  END IF;
END $$;

COMMENT ON COLUMN jobs.dob_on_or_after IS
  'Earliest permitted date of birth — a maximum age. NULL means no upper age limit. A student qualifies when date_of_birth >= this date.';
