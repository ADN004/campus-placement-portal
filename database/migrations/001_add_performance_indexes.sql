-- Performance Optimization Indexes for 20k+ Students
-- Created: 2025-12-18

-- Students table - critical indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);
CREATE INDEX IF NOT EXISTS idx_students_email_search ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_mobile ON students(mobile_number);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_students_status_blacklist ON students(registration_status, is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_students_college_status ON students(college_id, registration_status) WHERE is_blacklisted = FALSE;
CREATE INDEX IF NOT EXISTS idx_students_region_status ON students(region_id, registration_status) WHERE is_blacklisted = FALSE;
CREATE INDEX IF NOT EXISTS idx_students_cgpa_backlog ON students(programme_cgpa, backlog_count) WHERE registration_status = 'approved' AND is_blacklisted = FALSE;

-- Partial indexes for common queries (more efficient for filtered queries)
CREATE INDEX IF NOT EXISTS idx_students_approved_only ON students(created_at DESC) WHERE registration_status = 'approved' AND is_blacklisted = FALSE;
CREATE INDEX IF NOT EXISTS idx_students_pending_only ON students(created_at DESC) WHERE registration_status = 'pending' AND is_blacklisted = FALSE;
CREATE INDEX IF NOT EXISTS idx_students_blacklisted_only ON students(created_at DESC) WHERE is_blacklisted = TRUE;

-- Full-text search index for student search (prn, name, email)
CREATE INDEX IF NOT EXISTS idx_students_prn_trgm ON students USING gin(prn gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON students USING gin(student_name gin_trgm_ops);

-- Enable pg_trgm extension if not already enabled (for ILIKE performance)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Analyze tables to update statistics for query planner
ANALYZE students;
ANALYZE colleges;
ANALYZE regions;
ANALYZE users;

-- Add comments
COMMENT ON INDEX idx_students_created_at IS 'Index for sorting students by creation date (newest first)';
COMMENT ON INDEX idx_students_status_blacklist IS 'Composite index for filtering by status and blacklist';
COMMENT ON INDEX idx_students_college_status IS 'Partial index for college-filtered queries on non-blacklisted students';
COMMENT ON INDEX idx_students_approved_only IS 'Partial index for approved students queries';
COMMENT ON INDEX idx_students_prn_trgm IS 'Trigram index for fast PRN search with ILIKE';
COMMENT ON INDEX idx_students_name_trgm IS 'Trigram index for fast name search with ILIKE';
