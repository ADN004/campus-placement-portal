-- State Placement Cell Database Schema
-- PostgreSQL Database Schema for 60 Polytechnic Colleges in Kerala

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. REGIONS TABLE
-- ============================================
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    region_name VARCHAR(100) NOT NULL UNIQUE,
    region_code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. COLLEGES TABLE
-- ============================================
CREATE TABLE colleges (
    id SERIAL PRIMARY KEY,
    college_name VARCHAR(255) NOT NULL UNIQUE,
    college_code VARCHAR(50) NOT NULL UNIQUE,
    region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_colleges_region ON colleges(region_id);
CREATE INDEX idx_colleges_active ON colleges(is_active);

-- ============================================
-- 3. USERS TABLE (All user types)
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'placement_officer', 'super_admin')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================
-- 4. PLACEMENT OFFICERS TABLE
-- ============================================
CREATE TABLE placement_officers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    officer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    designation VARCHAR(100),
    officer_email VARCHAR(255),
    college_email VARCHAR(255),
    appointed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    appointed_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(college_id, is_active)
);

CREATE INDEX idx_po_user ON placement_officers(user_id);
CREATE INDEX idx_po_college ON placement_officers(college_id);
CREATE INDEX idx_po_phone ON placement_officers(phone_number);

-- ============================================
-- 5. PLACEMENT OFFICER HISTORY TABLE
-- ============================================
CREATE TABLE placement_officer_history (
    id SERIAL PRIMARY KEY,
    college_id INTEGER NOT NULL REFERENCES colleges(id),
    officer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    designation VARCHAR(100),
    officer_email VARCHAR(255),
    appointed_date TIMESTAMP,
    removed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removed_by INTEGER REFERENCES users(id),
    removal_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_history_college ON placement_officer_history(college_id);

-- ============================================
-- 6. PRN RANGES TABLE
-- ============================================
CREATE TABLE prn_ranges (
    id SERIAL PRIMARY KEY,
    range_start VARCHAR(50),
    range_end VARCHAR(50),
    single_prn VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    added_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (range_start IS NOT NULL AND range_end IS NOT NULL AND single_prn IS NULL) OR
        (range_start IS NULL AND range_end IS NULL AND single_prn IS NOT NULL)
    )
);

CREATE INDEX idx_prn_ranges_active ON prn_ranges(is_active);
CREATE INDEX idx_prn_single ON prn_ranges(single_prn);

-- ============================================
-- 7. STUDENTS TABLE
-- ============================================
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prn VARCHAR(50) NOT NULL UNIQUE,
    region_id INTEGER NOT NULL REFERENCES regions(id),
    college_id INTEGER NOT NULL REFERENCES colleges(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_number VARCHAR(20) NOT NULL,
    cgpa DECIMAL(3,2) NOT NULL CHECK (cgpa >= 0 AND cgpa <= 10),
    date_of_birth DATE NOT NULL,
    backlog_count VARCHAR(50) NOT NULL,
    backlog_details TEXT,
    registration_status VARCHAR(50) DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    blacklisted_date TIMESTAMP,
    blacklisted_by INTEGER REFERENCES users(id),
    approved_date TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_prn ON students(prn);
CREATE INDEX idx_students_college ON students(college_id);
CREATE INDEX idx_students_region ON students(region_id);
CREATE INDEX idx_students_status ON students(registration_status);
CREATE INDEX idx_students_blacklist ON students(is_blacklisted);
CREATE INDEX idx_students_cgpa ON students(cgpa);

-- ============================================
-- 8. WHITELIST REQUESTS TABLE
-- ============================================
CREATE TABLE whitelist_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    requested_by INTEGER NOT NULL REFERENCES users(id),
    request_reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by INTEGER REFERENCES users(id),
    review_comment TEXT,
    reviewed_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_whitelist_student ON whitelist_requests(student_id);
CREATE INDEX idx_whitelist_status ON whitelist_requests(status);
CREATE INDEX idx_whitelist_requested_by ON whitelist_requests(requested_by);

-- ============================================
-- 9. JOBS TABLE
-- ============================================
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_description TEXT,
    job_description TEXT NOT NULL,
    job_location VARCHAR(255),
    salary_package VARCHAR(100),
    application_form_url TEXT NOT NULL,
    application_start_date TIMESTAMP NOT NULL,
    application_deadline TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_active ON jobs(is_active);
CREATE INDEX idx_jobs_company ON jobs(company_name);
CREATE INDEX idx_jobs_deadline ON jobs(application_deadline);

-- ============================================
-- 10. JOB ELIGIBILITY CRITERIA TABLE
-- ============================================
CREATE TABLE job_eligibility_criteria (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    criteria_type VARCHAR(50) NOT NULL CHECK (criteria_type IN ('min_cgpa', 'max_backlogs', 'specific_branches', 'age_limit', 'specific_colleges', 'specific_regions')),
    criteria_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eligibility_job ON job_eligibility_criteria(job_id);
CREATE INDEX idx_eligibility_type ON job_eligibility_criteria(criteria_type);

-- ============================================
-- 11. JOB APPLICATIONS TABLE
-- ============================================
CREATE TABLE job_applications (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    application_status VARCHAR(50) DEFAULT 'submitted' CHECK (application_status IN ('submitted', 'under_review', 'shortlisted', 'rejected', 'selected')),
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, student_id)
);

CREATE INDEX idx_applications_job ON job_applications(job_id);
CREATE INDEX idx_applications_student ON job_applications(student_id);
CREATE INDEX idx_applications_status ON job_applications(application_status);

-- ============================================
-- 12. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'general' CHECK (notification_type IN ('general', 'job_posted', 'application_deadline', 'approval', 'rejection')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('all', 'specific_regions', 'specific_colleges', 'specific_students')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_target ON notifications(target_type);
CREATE INDEX idx_notifications_active ON notifications(is_active);

-- ============================================
-- 13. NOTIFICATION RECIPIENTS TABLE
-- ============================================
CREATE TABLE notification_recipients (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notification_id, user_id)
);

CREATE INDEX idx_notif_recipients_notification ON notification_recipients(notification_id);
CREATE INDEX idx_notif_recipients_user ON notification_recipients(user_id);
CREATE INDEX idx_notif_recipients_read ON notification_recipients(is_read);

-- ============================================
-- 14. NOTIFICATION TARGETS TABLE
-- ============================================
CREATE TABLE notification_targets (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    target_entity_type VARCHAR(50) NOT NULL CHECK (target_entity_type IN ('region', 'college')),
    target_entity_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notif_targets_notification ON notification_targets(notification_id);
CREATE INDEX idx_notif_targets_entity ON notification_targets(target_entity_type, target_entity_id);

-- ============================================
-- 15. ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action_type VARCHAR(100) NOT NULL,
    action_description TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    metadata JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_type ON activity_logs(action_type);
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);

-- ============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_colleges_updated_at BEFORE UPDATE ON colleges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_placement_officers_updated_at BEFORE UPDATE ON placement_officers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prn_ranges_updated_at BEFORE UPDATE ON prn_ranges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whitelist_requests_updated_at BEFORE UPDATE ON whitelist_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS ON TABLES
-- ============================================

COMMENT ON TABLE regions IS 'Stores 5 regions in Kerala for polytechnic colleges';
COMMENT ON TABLE colleges IS 'Stores all 60 polytechnic colleges with region mapping';
COMMENT ON TABLE users IS 'Central users table for all user types (students, officers, super admin)';
COMMENT ON TABLE placement_officers IS 'Placement officers data - one per college';
COMMENT ON TABLE placement_officer_history IS 'Historical record of all placement officer changes';
COMMENT ON TABLE prn_ranges IS 'Valid PRN ranges and single PRNs for student registration validation';
COMMENT ON TABLE students IS 'Student profiles with registration status and blacklist info';
COMMENT ON TABLE whitelist_requests IS 'Requests from placement officers to whitelist blacklisted students';
COMMENT ON TABLE jobs IS 'Job postings created by super admin';
COMMENT ON TABLE job_eligibility_criteria IS 'Multiple eligibility criteria per job';
COMMENT ON TABLE job_applications IS 'Student job applications tracking';
COMMENT ON TABLE notifications IS 'Notification messages sent by admin/officers';
COMMENT ON TABLE notification_recipients IS 'Maps notifications to individual users';
COMMENT ON TABLE notification_targets IS 'Maps notifications to regions/colleges';
COMMENT ON TABLE activity_logs IS 'Audit trail of all important actions';
