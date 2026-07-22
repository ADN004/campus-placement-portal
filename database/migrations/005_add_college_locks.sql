-- 005: Per-college registration / PRN-range locks
-- The super admin can freeze a college's student registration and/or a
-- college's placement officer from adding/editing PRN ranges, e.g. once a
-- deadline has passed. Presence of a row = that (college, lock_type) is
-- locked; unlocking deletes the row. Only NEW registrations are blocked —
-- already-approved students keep logging in. Enforced in registerStudent
-- (registration) and the PO add/update/delete PRN-range endpoints.
-- Idempotent: safe to run where this already exists.

CREATE TABLE IF NOT EXISTS college_locks (
    id SERIAL PRIMARY KEY,
    college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    lock_type VARCHAR(30) NOT NULL CHECK (lock_type IN ('registration', 'prn_ranges')),
    locked_by INTEGER NOT NULL REFERENCES users(id),
    reason TEXT,
    -- Allow-list of PRNs that may still register despite a 'registration' lock
    -- (an escape hatch for specific stragglers). Unused for 'prn_ranges' locks.
    allowed_prns JSONB NOT NULL DEFAULT '[]'::jsonb,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (college_id, lock_type)
);

CREATE INDEX IF NOT EXISTS idx_college_locks_lookup ON college_locks(college_id, lock_type);
