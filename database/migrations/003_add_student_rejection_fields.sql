-- Rejection flow: store why and when a registration was rejected, so the
-- student sees the reason at login and can re-register with corrected data.
-- Idempotent — safe to re-apply (fresh installs get these via schema.sql).

ALTER TABLE students ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
