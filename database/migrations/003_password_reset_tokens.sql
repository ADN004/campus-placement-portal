-- Self-service password reset for students and super admins.
--
-- Two nullable columns on users back the "forgot password" flow:
--   reset_password_token   — SHA-256 HASH of the emailed token (raw token is
--                            never stored; a DB read leak can't be used to reset)
--   reset_password_expires — validity cutoff (~1 hour); expired tokens are dead
--
-- Only students and super admins use this flow. Placement officers keep the
-- existing super-admin-initiated reset (they log in by phone, and their real
-- email is optional). Absent/NULL columns = no reset in progress.
--
-- Idempotent — safe to re-apply. Also present in database/schema.sql.

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token);
