-- Portal settings: small key-value store for deployment-level policies.
--
-- First consumer: 'single_college_require_job_approval' (boolean) — in a
-- single-college deployment the super admin can require approval for
-- placement officers' own-college job posts (which are otherwise
-- auto-approved). Absent row = false = long-standing behavior.
--
-- Idempotent — safe to re-apply. Also present in database/schema.sql.

CREATE TABLE IF NOT EXISTS portal_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSONB NOT NULL DEFAULT 'null'::jsonb,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
