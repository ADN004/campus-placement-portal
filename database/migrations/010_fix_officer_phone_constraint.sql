-- 010: A phone number is unique among SERVING officers, not for all time.
--
-- placement_officers.phone_number was globally UNIQUE. But an officer's phone
-- number is also their login id, and Remove is a soft delete (the row stays
-- with is_active = FALSE), so a retired officer keeps holding their number
-- forever. Re-appointing that person later — or reusing a shared office
-- number — then failed with:
--   duplicate key value violates unique constraint
--   "placement_officers_phone_number_key"
--
-- Same shape as 009: a constraint that should only apply to serving officers
-- was applied to history too. Replace the table-wide unique with a partial
-- unique index over active rows. Two serving officers still cannot share a
-- number; retired rows keep their historical number harmlessly.
--
-- (users.email — which also stores the phone — is NOT touched: addPlacementOfficer
--  already reuses an existing user account for a returning officer, so that
--  uniqueness is not a blocker.)
--
-- Idempotent: safe to re-run.

ALTER TABLE placement_officers
  DROP CONSTRAINT IF EXISTS placement_officers_phone_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS placement_officers_one_active_phone
  ON placement_officers (phone_number)
  WHERE is_active = TRUE;
