-- Marks a PRN range as closed by an academic-year reset.
--
-- "Disabled" was one flag doing two jobs: "paused by a person, resume when
-- ready", and "this academic year is finished". Only the first should ever come
-- back, and nothing distinguished them — so an officer could open last year's
-- range, press Enable, and reactivate an entire passed-out batch. The accounts
-- came back, the students returned to the current list, and the endpoint
-- cheerfully reported "N students reactivated".
--
-- Non-NULL means the range belongs to a finished year and is closed for good.
-- The value is the academic year it was closed for, so the page can group them
-- and say which intake they belonged to.
--
-- Deliberately separate from `year`: that is the year an officer typed when
-- creating the range, which may be blank or wrong. This one is written by the
-- reset itself and is the fact the guard depends on.

ALTER TABLE prn_ranges
  ADD COLUMN IF NOT EXISTS closed_for_year VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_prn_ranges_closed_for_year
  ON prn_ranges (closed_for_year)
  WHERE closed_for_year IS NOT NULL;

COMMENT ON COLUMN prn_ranges.closed_for_year IS
  'Academic year this range was closed by, set by the year-end reset. Non-NULL means it can never be re-enabled: re-enabling would reactivate that year''s archived students.';
