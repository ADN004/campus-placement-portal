-- Track whether an account is still on the shared default password ('123').
--
-- Used to warn signed-in users that their account is trivially accessible
-- (PRNs and officer phone numbers are not secret, so a known default password
-- means anyone can sign in). The warning is informational — users are not
-- forced to change it.
--
-- The value is determined at LOGIN, where the plaintext password is briefly
-- available: it is folded into the existing last_login update, so it costs no
-- extra query. That makes it self-correcting — existing accounts are evaluated
-- on their next sign-in (no risky backfill), and if a super admin resets an
-- officer back to the default, the flag flips back on that officer's next
-- login. changePassword and resetPassword clear it immediately.
--
-- NULL = not yet determined (never logged in since this shipped).
--
-- Idempotent — safe to re-apply. Also present in database/schema.sql.

ALTER TABLE users ADD COLUMN IF NOT EXISTS using_default_password BOOLEAN;
