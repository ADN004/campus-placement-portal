-- 009: One ACTIVE placement officer per college — not one of each state.
--
-- placement_officers carried UNIQUE(college_id, is_active). The intent was
-- "a college has at most one active officer", but a composite unique on the
-- pair ALSO caps a college at one INACTIVE officer. Removing an officer sets
-- is_active = FALSE, so the second removal for any college failed with:
--   duplicate key value violates unique constraint
--   "placement_officers_college_id_is_active_key"
-- The same UPDATE runs when appointing a replacement, so once a college had
-- one removed officer it could neither remove nor replace anyone again.
--
-- A partial unique index expresses the real rule and leaves the inactive
-- (historical) rows unconstrained.
-- Idempotent: safe to re-run.

ALTER TABLE placement_officers
  DROP CONSTRAINT IF EXISTS placement_officers_college_id_is_active_key;

CREATE UNIQUE INDEX IF NOT EXISTS placement_officers_one_active_per_college
  ON placement_officers (college_id)
  WHERE is_active = TRUE;
