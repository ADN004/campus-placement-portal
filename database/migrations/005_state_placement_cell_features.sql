-- Migration: State Placement Cell Feature Enhancements
-- Date: 2025-12-16
-- Description: Comprehensive migration for production-ready state-level placement portal
-- Features: PRN toggle, officer photos, job deletion history, age auto-update, enhanced filtering

-- ============================================
-- 1. PRN RANGES - ADD ON/OFF TOGGLE
-- ============================================

-- Add is_enabled field to control PRN range access
ALTER TABLE prn_ranges ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;

-- Add reason for disabling
ALTER TABLE prn_ranges ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

-- Add disabled date tracking
ALTER TABLE prn_ranges ADD COLUMN IF NOT EXISTS disabled_date TIMESTAMP;

-- Add disabled by tracking
ALTER TABLE prn_ranges ADD COLUMN IF NOT EXISTS disabled_by INTEGER REFERENCES users(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_prn_ranges_enabled ON prn_ranges(is_enabled);

COMMENT ON COLUMN prn_ranges.is_enabled IS 'Toggle to enable/disable PRN range access (for graduated batches)';
COMMENT ON COLUMN prn_ranges.disabled_reason IS 'Reason for disabling the PRN range';
COMMENT ON COLUMN prn_ranges.disabled_date IS 'Timestamp when the PRN range was disabled';
COMMENT ON COLUMN prn_ranges.disabled_by IS 'User who disabled the PRN range';

-- ============================================
-- 2. PLACEMENT OFFICERS - ADD PROFILE PHOTO
-- ============================================

-- Add photo fields for placement officers
ALTER TABLE placement_officers ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE placement_officers ADD COLUMN IF NOT EXISTS photo_cloudinary_id VARCHAR(255);

-- Track photo upload date
ALTER TABLE placement_officers ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMP;

COMMENT ON COLUMN placement_officers.photo_url IS 'Cloudinary URL of placement officer photograph (stored in separate folder from students)';
COMMENT ON COLUMN placement_officers.photo_cloudinary_id IS 'Cloudinary public ID for photo deletion (placement_officers folder)';
COMMENT ON COLUMN placement_officers.photo_uploaded_at IS 'Timestamp when photo was last uploaded/updated';

-- ============================================
-- 3. JOBS - ADD SOFT DELETE AND HISTORY
-- ============================================

-- Add soft delete flag to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create index for deleted jobs
CREATE INDEX IF NOT EXISTS idx_jobs_deleted ON jobs(is_deleted);

-- Create deleted jobs history table for super admin
CREATE TABLE IF NOT EXISTS deleted_jobs_history (
    id SERIAL PRIMARY KEY,
    original_job_id INTEGER NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_description TEXT,
    job_description TEXT NOT NULL,
    job_location VARCHAR(255),
    salary_package VARCHAR(100),
    application_form_url TEXT NOT NULL,
    application_start_date TIMESTAMP NOT NULL,
    application_deadline TIMESTAMP NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    job_created_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_by INTEGER NOT NULL REFERENCES users(id),
    deletion_reason TEXT,
    application_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deleted_jobs_company ON deleted_jobs_history(company_name);
CREATE INDEX IF NOT EXISTS idx_deleted_jobs_deleted_by ON deleted_jobs_history(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deleted_jobs_deleted_at ON deleted_jobs_history(deleted_at DESC);

COMMENT ON TABLE deleted_jobs_history IS 'Historical record of all deleted job postings for audit purposes';
COMMENT ON COLUMN deleted_jobs_history.original_job_id IS 'Original ID from jobs table before deletion';
COMMENT ON COLUMN deleted_jobs_history.application_count IS 'Number of applications received before deletion';
COMMENT ON COLUMN deleted_jobs_history.metadata IS 'Additional job metadata (eligibility criteria, etc.)';

-- ============================================
-- 4. STUDENTS - ENHANCE AGE AUTO-UPDATE
-- ============================================

-- Create function to auto-update age based on date of birth
CREATE OR REPLACE FUNCTION update_student_age()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate age from date_of_birth
    NEW.age = DATE_PART('year', AGE(CURRENT_DATE, NEW.date_of_birth));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update age on insert and update
DROP TRIGGER IF EXISTS trigger_update_student_age ON students;
CREATE TRIGGER trigger_update_student_age
    BEFORE INSERT OR UPDATE OF date_of_birth
    ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_student_age();

COMMENT ON FUNCTION update_student_age() IS 'Automatically calculates and updates student age based on date_of_birth';

-- ============================================
-- 5. STUDENTS - ADD PHOTO DELETION TRACKING
-- ============================================

-- Add photo deletion tracking
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_deleted_at TIMESTAMP;
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_deleted_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_students_photo_deleted ON students(photo_deleted_at);

COMMENT ON COLUMN students.photo_deleted_at IS 'Timestamp when student photo was deleted (for storage management)';
COMMENT ON COLUMN students.photo_deleted_by IS 'Super admin who deleted the photo';

-- ============================================
-- 6. EMAIL VERIFICATION - ADD RESEND TRACKING
-- ============================================

-- Add email verification resend tracking
ALTER TABLE students ADD COLUMN IF NOT EXISTS verification_email_sent_count INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_verification_email_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_students_verification_sent ON students(last_verification_email_sent_at);

COMMENT ON COLUMN students.verification_email_sent_count IS 'Number of times verification email has been sent';
COMMENT ON COLUMN students.last_verification_email_sent_at IS 'Timestamp of last verification email sent';

-- ============================================
-- 7. WHITELIST REQUESTS - ADD HISTORY VIEW FIELDS
-- ============================================

-- These fields already exist, just adding indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whitelist_requests_reviewed_date ON whitelist_requests(reviewed_date DESC);
CREATE INDEX IF NOT EXISTS idx_whitelist_requests_created_date ON whitelist_requests(created_at DESC);

-- ============================================
-- 8. CREATE VIEW FOR ACTIVE NON-BLACKLISTED STUDENTS
-- ============================================

-- Create materialized view for better performance on large datasets
CREATE MATERIALIZED VIEW IF NOT EXISTS active_students_view AS
SELECT
    s.*,
    u.email as user_email,
    u.is_active as user_is_active,
    c.college_name,
    c.college_code,
    r.region_name,
    r.region_code
FROM students s
JOIN users u ON s.user_id = u.id
JOIN colleges c ON s.college_id = c.id
JOIN regions r ON s.region_id = r.id
WHERE s.is_blacklisted = FALSE
  AND u.is_active = TRUE
  AND s.registration_status = 'approved';

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_students_view_id ON active_students_view(id);
CREATE INDEX IF NOT EXISTS idx_active_students_view_college ON active_students_view(college_id);
CREATE INDEX IF NOT EXISTS idx_active_students_view_region ON active_students_view(region_id);
CREATE INDEX IF NOT EXISTS idx_active_students_view_branch ON active_students_view(branch);
CREATE INDEX IF NOT EXISTS idx_active_students_view_cgpa ON active_students_view(programme_cgpa);

COMMENT ON MATERIALIZED VIEW active_students_view IS 'Optimized view for active, approved, non-blacklisted students';

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_active_students_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY active_students_view;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. OPTIMIZE BRANCH NAMES FOR FILTERING
-- ============================================

-- Create normalized branches table for better filtering
CREATE TABLE IF NOT EXISTS branch_mappings (
    id SERIAL PRIMARY KEY,
    branch_name VARCHAR(255) NOT NULL UNIQUE,
    normalized_name VARCHAR(255) NOT NULL,
    branch_category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert all standard branch names
INSERT INTO branch_mappings (branch_name, normalized_name, branch_category) VALUES
('Architecture', 'ARCHITECTURE', 'Design'),
('Automobile Engineering', 'AUTOMOBILE_ENGINEERING', 'Mechanical'),
('Biomedical Engineering', 'BIOMEDICAL_ENGINEERING', 'Electronics'),
('Bio-Medical Engineering', 'BIOMEDICAL_ENGINEERING', 'Electronics'),
('Chemical Engineering', 'CHEMICAL_ENGINEERING', 'Chemical'),
('Civil Engineering', 'CIVIL_ENGINEERING', 'Civil'),
('Civil Engineering (Hearing Impaired)', 'CIVIL_ENGINEERING_HI', 'Civil'),
('Commercial Practice', 'COMMERCIAL_PRACTICE', 'Commerce'),
('Computer Application and Business Management', 'CABM', 'Computer'),
('Computer Applications', 'COMPUTER_APPLICATIONS', 'Computer'),
('Computer Engineering', 'COMPUTER_ENGINEERING', 'Computer'),
('Computer Engineering (Hearing Impaired)', 'COMPUTER_ENGINEERING_HI', 'Computer'),
('Computer Hardware Engineering', 'COMPUTER_HARDWARE_ENGINEERING', 'Computer'),
('Computer Science and Engineering', 'COMPUTER_SCIENCE_ENGINEERING', 'Computer'),
('Cyber Forensics and Information Security', 'CYBER_FORENSICS', 'Computer'),
('Electrical and Electronics Engineering', 'ELECTRICAL_ELECTRONICS', 'Electrical'),
('Electrical & Electronics Engineering', 'ELECTRICAL_ELECTRONICS', 'Electrical'),
('Electronics and Communication Engineering', 'ELECTRONICS_COMMUNICATION', 'Electronics'),
('Electronics & Communication Engineering', 'ELECTRONICS_COMMUNICATION', 'Electronics'),
('Electronics Engineering', 'ELECTRONICS_ENGINEERING', 'Electronics'),
('Information Technology', 'INFORMATION_TECHNOLOGY', 'Computer'),
('Instrumentation Engineering', 'INSTRUMENTATION_ENGINEERING', 'Electronics'),
('Mechanical Engineering', 'MECHANICAL_ENGINEERING', 'Mechanical'),
('Polymer Technology', 'POLYMER_TECHNOLOGY', 'Chemical'),
('Printing Technology', 'PRINTING_TECHNOLOGY', 'Printing'),
('Robotic Process Automation', 'ROBOTIC_PROCESS_AUTOMATION', 'Computer'),
('Textile Technology', 'TEXTILE_TECHNOLOGY', 'Textile'),
('Tool and Die Engineering', 'TOOL_DIE_ENGINEERING', 'Mechanical'),
('Tool & Die Engineering', 'TOOL_DIE_ENGINEERING', 'Mechanical'),
('Wood and Paper Technology', 'WOOD_PAPER_TECHNOLOGY', 'Wood')
ON CONFLICT (branch_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_branch_mappings_normalized ON branch_mappings(normalized_name);

COMMENT ON TABLE branch_mappings IS 'Normalized branch names for handling variations across colleges';

-- ============================================
-- 10. ADD PERFORMANCE INDEXES FOR PRODUCTION
-- ============================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_students_college_status_blacklist ON students(college_id, registration_status, is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_students_region_status_blacklist ON students(region_id, registration_status, is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_students_branch_status ON students(branch, registration_status) WHERE branch IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_cgpa_range ON students(programme_cgpa) WHERE programme_cgpa >= 6.0;

-- Index for PRN range queries
CREATE INDEX IF NOT EXISTS idx_students_prn_prefix ON students(LEFT(prn, 6));

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_students_registration_date ON students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_approved_date ON students(approved_date DESC) WHERE approved_date IS NOT NULL;

COMMENT ON INDEX idx_students_college_status_blacklist IS 'Optimized for filtering students by college, status, and blacklist';
COMMENT ON INDEX idx_students_prn_prefix IS 'Optimized for PRN range-based queries';

-- ============================================
-- 11. ADD BATCH PROCESSING SUPPORT
-- ============================================

-- Create function for bulk age updates (run daily via cron)
CREATE OR REPLACE FUNCTION update_all_student_ages()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE students
    SET age = DATE_PART('year', AGE(CURRENT_DATE, date_of_birth))
    WHERE age != DATE_PART('year', AGE(CURRENT_DATE, date_of_birth));

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_all_student_ages() IS 'Batch updates all student ages (run daily via cron job)';

-- ============================================
-- 12. ADD DATA ARCHIVAL SUPPORT
-- ============================================

-- Create archived students table for disabled PRN ranges
CREATE TABLE IF NOT EXISTS archived_students (
    id SERIAL PRIMARY KEY,
    original_student_id INTEGER NOT NULL,
    prn VARCHAR(50) NOT NULL,
    prn_range_id INTEGER NOT NULL,
    student_data JSONB NOT NULL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_by INTEGER REFERENCES users(id),
    archive_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archived_students_prn ON archived_students(prn);
CREATE INDEX IF NOT EXISTS idx_archived_students_range ON archived_students(prn_range_id);
CREATE INDEX IF NOT EXISTS idx_archived_students_archived_at ON archived_students(archived_at DESC);

COMMENT ON TABLE archived_students IS 'Archived student data from disabled PRN ranges (for historical access and export)';
COMMENT ON COLUMN archived_students.student_data IS 'Complete student data in JSONB format for flexible querying';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

SELECT
    'State Placement Cell migration completed successfully!' AS message,
    (SELECT COUNT(*) FROM students WHERE is_blacklisted = FALSE) AS active_students,
    (SELECT COUNT(*) FROM prn_ranges WHERE is_enabled = TRUE) AS active_prn_ranges,
    (SELECT COUNT(*) FROM jobs WHERE is_deleted = FALSE AND is_active = TRUE) AS active_jobs;
