-- 004: PRN range exceptions
-- PRNs inside a range's start–end that must NOT be able to register.
-- Officers previously noted these in the free-text description
-- ("EXCEPT 2401133557"), which enforced nothing. Stored as a JSONB array
-- of PRN strings and enforced by validate-prn and student registration.
-- Idempotent: safe to run on databases where this already exists.

ALTER TABLE prn_ranges
  ADD COLUMN IF NOT EXISTS excepted_prns JSONB NOT NULL DEFAULT '[]'::jsonb;
