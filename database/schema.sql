-- State Placement Cell Database Schema
-- PostgreSQL Database Schema for 60 Polytechnic Colleges in Kerala
-- CONSOLIDATED SCHEMA - All migrations merged into single file
-- Last Updated: 2026-01-15

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
    branches JSONB DEFAULT '[]'::jsonb,
    logo_url TEXT,
    logo_cloudinary_id VARCHAR(255),
    logo_uploaded_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_colleges_region ON colleges(region_id);
CREATE INDEX idx_colleges_active ON colleges(is_active);
CREATE INDEX idx_colleges_branches ON colleges USING GIN (branches);
CREATE INDEX idx_colleges_has_logo ON colleges(logo_url) WHERE logo_url IS NOT NULL;

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
    photo_url TEXT,
    photo_cloudinary_id VARCHAR(255),
    photo_uploaded_at TIMESTAMP,
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
    is_enabled BOOLEAN DEFAULT TRUE,
    disabled_reason TEXT,
    disabled_date TIMESTAMP,
    disabled_by INTEGER REFERENCES users(id),
    description TEXT,
    added_by INTEGER REFERENCES users(id),
    created_by_role VARCHAR(50) NOT NULL DEFAULT 'super_admin' CHECK (created_by_role IN ('super_admin', 'placement_officer')),
    college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE,
    year VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (range_start IS NOT NULL AND range_end IS NOT NULL AND single_prn IS NULL) OR
        (range_start IS NULL AND range_end IS NULL AND single_prn IS NOT NULL)
    ),
    CONSTRAINT check_prn_range_creator_college CHECK (
        (created_by_role = 'super_admin' AND college_id IS NULL) OR
        (created_by_role = 'placement_officer' AND college_id IS NOT NULL)
    )
);

CREATE INDEX idx_prn_ranges_active ON prn_ranges(is_active);
CREATE INDEX idx_prn_single ON prn_ranges(single_prn);
CREATE INDEX idx_prn_ranges_creator_role ON prn_ranges(created_by_role);
CREATE INDEX idx_prn_ranges_college ON prn_ranges(college_id);
CREATE INDEX idx_prn_ranges_enabled ON prn_ranges(is_enabled);
CREATE INDEX idx_prn_ranges_year ON prn_ranges(year);

-- ============================================
-- 7. STUDENTS TABLE (Enhanced with all fields)
-- ============================================
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prn VARCHAR(50) NOT NULL UNIQUE,
    region_id INTEGER NOT NULL REFERENCES regions(id),
    college_id INTEGER NOT NULL REFERENCES colleges(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_number VARCHAR(20) NOT NULL,

    -- Personal Information
    student_name VARCHAR(255),
    age INTEGER,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
    height INTEGER CHECK (height >= 140 AND height <= 220),
    weight DECIMAL(5,2) CHECK (weight >= 30 AND weight <= 150),
    complete_address TEXT,
    date_of_birth DATE NOT NULL,

    -- Academic Information
    branch VARCHAR(100),
    programme_cgpa DECIMAL(3,2) NOT NULL CHECK (programme_cgpa >= 0 AND programme_cgpa <= 10),
    cgpa_sem1 DECIMAL(3,2) CHECK (cgpa_sem1 >= 0 AND cgpa_sem1 <= 10),
    cgpa_sem2 DECIMAL(3,2) CHECK (cgpa_sem2 >= 0 AND cgpa_sem2 <= 10),
    cgpa_sem3 DECIMAL(3,2) CHECK (cgpa_sem3 >= 0 AND cgpa_sem3 <= 10),
    cgpa_sem4 DECIMAL(3,2) CHECK (cgpa_sem4 >= 0 AND cgpa_sem4 <= 10),
    cgpa_sem5 DECIMAL(3,2) DEFAULT 0 CHECK (cgpa_sem5 >= 0 AND cgpa_sem5 <= 10),
    cgpa_sem6 DECIMAL(3,2) DEFAULT 0 CHECK (cgpa_sem6 >= 0 AND cgpa_sem6 <= 10),
    sem5_cgpa_updated BOOLEAN DEFAULT FALSE,
    sem6_cgpa_updated BOOLEAN DEFAULT FALSE,
    backlog_count VARCHAR(50) NOT NULL,
    backlog_details TEXT,

    -- Documents
    has_driving_license BOOLEAN DEFAULT FALSE,
    has_pan_card BOOLEAN DEFAULT FALSE,
    has_aadhar_card BOOLEAN DEFAULT FALSE,
    has_passport BOOLEAN DEFAULT FALSE,

    -- Photo Storage
    photo_url TEXT,
    photo_cloudinary_id VARCHAR(255),
    photo_deleted_at TIMESTAMP,
    photo_deleted_by INTEGER REFERENCES users(id),

    -- Email Verification
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verified_at TIMESTAMP,
    verification_email_sent_count INTEGER DEFAULT 0,
    last_verification_email_sent_at TIMESTAMP,

    -- Registration Status
    registration_status VARCHAR(50) DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
    approved_date TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),

    -- Blacklist Status
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    blacklisted_date TIMESTAMP,
    blacklisted_by INTEGER REFERENCES users(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student indexes
CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_prn ON students(prn);
CREATE INDEX idx_students_college ON students(college_id);
CREATE INDEX idx_students_region ON students(region_id);
CREATE INDEX idx_students_status ON students(registration_status);
CREATE INDEX idx_students_blacklist ON students(is_blacklisted);
CREATE INDEX idx_students_cgpa ON students(programme_cgpa);
CREATE INDEX idx_students_gender ON students(gender);
CREATE INDEX idx_students_height ON students(height);
CREATE INDEX idx_students_weight ON students(weight);
CREATE INDEX idx_students_email_verified ON students(email_verified);
CREATE INDEX idx_students_branch ON students(branch);
CREATE INDEX idx_students_created_at ON students(created_at DESC);
CREATE INDEX idx_students_name ON students(student_name);
CREATE INDEX idx_students_email_search ON students(email);
CREATE INDEX idx_students_mobile ON students(mobile_number);
CREATE INDEX idx_students_aadhar ON students(has_aadhar_card);
CREATE INDEX idx_students_passport ON students(has_passport);

-- Composite indexes for common query patterns
CREATE INDEX idx_students_status_blacklist ON students(registration_status, is_blacklisted);
CREATE INDEX idx_students_college_status ON students(college_id, registration_status) WHERE is_blacklisted = FALSE;
CREATE INDEX idx_students_region_status ON students(region_id, registration_status) WHERE is_blacklisted = FALSE;
CREATE INDEX idx_students_cgpa_backlog ON students(programme_cgpa, backlog_count) WHERE registration_status = 'approved' AND is_blacklisted = FALSE;
CREATE INDEX idx_students_college_status_blacklist ON students(college_id, registration_status, is_blacklisted);
CREATE INDEX idx_students_region_status_blacklist ON students(region_id, registration_status, is_blacklisted);
CREATE INDEX idx_students_branch_status ON students(branch, registration_status) WHERE branch IS NOT NULL;
CREATE INDEX idx_students_cgpa_range ON students(programme_cgpa) WHERE programme_cgpa >= 6.0;

-- Partial indexes for common queries
CREATE INDEX idx_students_approved_only ON students(created_at DESC) WHERE registration_status = 'approved' AND is_blacklisted = FALSE;
CREATE INDEX idx_students_pending_only ON students(created_at DESC) WHERE registration_status = 'pending' AND is_blacklisted = FALSE;
CREATE INDEX idx_students_blacklisted_only ON students(created_at DESC) WHERE is_blacklisted = TRUE;

-- Trigram indexes for search
CREATE INDEX idx_students_prn_trgm ON students USING gin(prn gin_trgm_ops);
CREATE INDEX idx_students_name_trgm ON students USING gin(student_name gin_trgm_ops);

-- Other indexes
CREATE INDEX idx_students_photo_deleted ON students(photo_deleted_at);
CREATE INDEX idx_students_verification_sent ON students(last_verification_email_sent_at);
CREATE INDEX idx_students_registration_date ON students(created_at DESC);
CREATE INDEX idx_students_approved_date ON students(approved_date DESC) WHERE approved_date IS NOT NULL;

-- ============================================
-- 8. STUDENT EXTENDED PROFILES TABLE
-- ============================================
CREATE TABLE student_extended_profiles (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,

    -- Academic Extended Details
    sslc_marks DECIMAL(5,2),
    sslc_year INTEGER,
    sslc_board VARCHAR(100),
    twelfth_marks DECIMAL(5,2),
    twelfth_year INTEGER,
    twelfth_board VARCHAR(100),

    -- Physical Details
    height_cm INTEGER,
    weight_kg DECIMAL(5,2),
    physically_handicapped BOOLEAN DEFAULT NULL,
    handicap_details TEXT,

    -- Personal Details
    district VARCHAR(100),
    permanent_address TEXT,
    interests_hobbies TEXT,

    -- Family Details
    father_name VARCHAR(200),
    father_occupation VARCHAR(200),
    father_annual_income DECIMAL(12,2),
    mother_name VARCHAR(200),
    mother_occupation VARCHAR(200),
    mother_annual_income DECIMAL(12,2),
    siblings_count INTEGER,
    siblings_details TEXT,

    -- Document Status
    has_driving_license BOOLEAN DEFAULT NULL,
    has_pan_card BOOLEAN DEFAULT NULL,
    pan_number VARCHAR(10),
    has_aadhar_card BOOLEAN DEFAULT NULL,
    aadhar_number VARCHAR(12),
    has_passport BOOLEAN DEFAULT NULL,
    passport_number VARCHAR(20),

    -- Education Preferences
    interested_in_btech BOOLEAN DEFAULT NULL,
    interested_in_mtech BOOLEAN DEFAULT NULL,
    not_interested_in_higher_education BOOLEAN DEFAULT FALSE,
    preferred_study_mode VARCHAR(50),

    -- Other Details (JSON for flexibility)
    additional_certifications JSONB DEFAULT '[]'::jsonb,
    achievements JSONB DEFAULT '[]'::jsonb,
    extracurricular JSONB DEFAULT '[]'::jsonb,

    -- Profile Completion Tracking
    profile_completion_percentage INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_extended_profile_student ON student_extended_profiles(student_id);
CREATE INDEX idx_extended_profile_completion ON student_extended_profiles(profile_completion_percentage);

-- ============================================
-- 9. PROFILE SECTION COMPLETION TABLE
-- ============================================
CREATE TABLE profile_section_completion (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    section_name VARCHAR(100) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completion_percentage INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, section_name)
);

CREATE INDEX idx_section_completion_student ON profile_section_completion(student_id);

-- ============================================
-- 10. WHITELIST REQUESTS TABLE
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
CREATE INDEX idx_whitelist_requests_reviewed_date ON whitelist_requests(reviewed_date DESC);
CREATE INDEX idx_whitelist_requests_created_date ON whitelist_requests(created_at DESC);

-- ============================================
-- 11. JOBS TABLE
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

    -- Height/Weight criteria
    min_height INTEGER CHECK (min_height >= 140 AND min_height <= 220),
    max_height INTEGER CHECK (max_height >= 140 AND max_height <= 220),
    min_weight DECIMAL(5,2) CHECK (min_weight >= 30 AND min_weight <= 150),
    max_weight DECIMAL(5,2) CHECK (max_weight >= 30 AND max_weight <= 150),

    -- Soft delete
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by INTEGER REFERENCES users(id),
    deletion_reason TEXT,

    -- Placement officer tracking (for officer-created jobs)
    placement_officer_id INTEGER REFERENCES placement_officers(id) ON DELETE SET NULL,
    is_auto_approved BOOLEAN DEFAULT FALSE,
    source_job_request_id INTEGER, -- Will be FK after job_requests table is created

    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_height_range CHECK (min_height IS NULL OR max_height IS NULL OR min_height <= max_height),
    CONSTRAINT check_weight_range CHECK (min_weight IS NULL OR max_weight IS NULL OR min_weight <= max_weight)
);

CREATE INDEX idx_jobs_active ON jobs(is_active);
CREATE INDEX idx_jobs_company ON jobs(company_name);
CREATE INDEX idx_jobs_deadline ON jobs(application_deadline);
CREATE INDEX idx_jobs_deleted ON jobs(is_deleted);
CREATE INDEX idx_jobs_placement_officer ON jobs(placement_officer_id);
CREATE INDEX idx_jobs_auto_approved ON jobs(is_auto_approved);

-- ============================================
-- 12. JOB DRIVES TABLE
-- ============================================
CREATE TABLE job_drives (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    drive_date DATE NOT NULL,
    drive_time TIME NOT NULL,
    drive_location VARCHAR(500) NOT NULL,
    additional_instructions TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_drives_job ON job_drives(job_id);

-- ============================================
-- 13. DELETED JOBS HISTORY TABLE
-- ============================================
CREATE TABLE deleted_jobs_history (
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

CREATE INDEX idx_deleted_jobs_company ON deleted_jobs_history(company_name);
CREATE INDEX idx_deleted_jobs_deleted_by ON deleted_jobs_history(deleted_by);
CREATE INDEX idx_deleted_jobs_deleted_at ON deleted_jobs_history(deleted_at DESC);

-- ============================================
-- 14. JOB ELIGIBILITY CRITERIA TABLE
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
-- 15. JOB REQUIREMENT TEMPLATES TABLE
-- ============================================
CREATE TABLE job_requirement_templates (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    min_cgpa DECIMAL(3,2),
    max_backlogs INTEGER,
    allowed_branches JSONB DEFAULT '[]'::jsonb,
    requires_academic_extended BOOLEAN DEFAULT FALSE,
    requires_physical_details BOOLEAN DEFAULT FALSE,
    requires_family_details BOOLEAN DEFAULT FALSE,
    requires_document_verification BOOLEAN DEFAULT FALSE,
    requires_education_preferences BOOLEAN DEFAULT FALSE,
    specific_field_requirements JSONB DEFAULT '{}'::jsonb,
    custom_fields JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_requirements_job ON job_requirement_templates(job_id);

-- ============================================
-- 16. COMPANY REQUIREMENT TEMPLATES TABLE
-- ============================================
CREATE TABLE company_requirement_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(200) NOT NULL UNIQUE,
    company_name VARCHAR(200),
    description TEXT,
    min_cgpa DECIMAL(3,2),
    max_backlogs INTEGER,
    allowed_branches JSONB DEFAULT '[]'::jsonb,
    requires_academic_extended BOOLEAN DEFAULT FALSE,
    requires_physical_details BOOLEAN DEFAULT FALSE,
    requires_family_details BOOLEAN DEFAULT FALSE,
    requires_document_verification BOOLEAN DEFAULT FALSE,
    requires_education_preferences BOOLEAN DEFAULT FALSE,
    specific_field_requirements JSONB DEFAULT '{}'::jsonb,
    custom_fields JSONB DEFAULT '[]'::jsonb,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 17. JOB APPLICATIONS TABLE
-- ============================================
CREATE TABLE job_applications (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    application_status VARCHAR(50) DEFAULT 'submitted' CHECK (application_status IN ('submitted', 'under_review', 'shortlisted', 'rejected', 'selected')),
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Review tracking
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,

    -- Placement tracking
    placement_package DECIMAL(10,2),
    joining_date DATE,
    placement_location VARCHAR(255),
    placement_notes TEXT,

    -- Manual addition tracking
    is_manual_addition BOOLEAN DEFAULT FALSE,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, student_id)
);

CREATE INDEX idx_applications_job ON job_applications(job_id);
CREATE INDEX idx_applications_student ON job_applications(student_id);
CREATE INDEX idx_applications_status ON job_applications(application_status);
CREATE INDEX idx_applications_status_updated ON job_applications(application_status, updated_at DESC);
CREATE INDEX idx_applications_reviewed_by ON job_applications(reviewed_by);
CREATE INDEX idx_job_applications_manual_addition ON job_applications(is_manual_addition);
CREATE INDEX idx_job_applications_job_manual ON job_applications(job_id, is_manual_addition) WHERE is_manual_addition = TRUE;

-- ============================================
-- 18. JOB APPLICATIONS EXTENDED TABLE
-- ============================================
CREATE TABLE job_applications_extended (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL UNIQUE REFERENCES job_applications(id) ON DELETE CASCADE,
    tier2_snapshot JSONB DEFAULT '{}'::jsonb,
    custom_field_responses JSONB DEFAULT '{}'::jsonb,
    meets_requirements BOOLEAN DEFAULT FALSE,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_applications_extended_application ON job_applications_extended(application_id);

-- ============================================
-- 19. JOB REQUESTS TABLE
-- ============================================
CREATE TABLE job_requests (
    id SERIAL PRIMARY KEY,
    placement_officer_id INTEGER NOT NULL REFERENCES placement_officers(id) ON DELETE CASCADE,
    college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    job_type VARCHAR(50) DEFAULT 'Full-time',
    location VARCHAR(255),
    salary_range VARCHAR(100),
    application_deadline TIMESTAMP,
    application_form_url TEXT,
    min_cgpa DECIMAL(3,2),
    max_backlogs INTEGER,
    allowed_branches JSONB,
    target_type VARCHAR(50) DEFAULT 'specific' CHECK (target_type IN ('all', 'specific')),
    target_regions JSONB,
    target_colleges JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
    reviewed_by INTEGER REFERENCES users(id),
    review_comment TEXT,
    reviewed_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_requests_po ON job_requests(placement_officer_id);
CREATE INDEX idx_job_requests_college ON job_requests(college_id);
CREATE INDEX idx_job_requests_status ON job_requests(status);
CREATE INDEX idx_job_requests_created ON job_requests(created_at DESC);

-- ============================================
-- 20. JOB REQUEST REQUIREMENT TEMPLATES TABLE
-- ============================================
CREATE TABLE job_request_requirement_templates (
    id SERIAL PRIMARY KEY,
    job_request_id INTEGER NOT NULL REFERENCES job_requests(id) ON DELETE CASCADE,
    min_cgpa DECIMAL(3,2),
    max_backlogs INTEGER,
    allowed_branches JSONB DEFAULT '[]'::jsonb,
    requires_academic_extended BOOLEAN DEFAULT FALSE,
    requires_physical_details BOOLEAN DEFAULT FALSE,
    requires_family_details BOOLEAN DEFAULT FALSE,
    requires_personal_details BOOLEAN DEFAULT FALSE,
    requires_document_verification BOOLEAN DEFAULT FALSE,
    requires_education_preferences BOOLEAN DEFAULT FALSE,
    specific_field_requirements JSONB DEFAULT '{}'::jsonb,
    custom_fields JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_job_request_requirements_unique ON job_request_requirement_templates(job_request_id);
CREATE INDEX idx_job_request_requirements_job_request ON job_request_requirement_templates(job_request_id);

-- ============================================
-- 21. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'general' CHECK (notification_type IN ('general', 'job_posted', 'application_deadline', 'approval', 'rejection')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('all', 'specific_regions', 'specific_colleges', 'specific_students')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_target ON notifications(target_type);
CREATE INDEX idx_notifications_active ON notifications(is_active);
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- ============================================
-- 22. NOTIFICATION RECIPIENTS TABLE
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
-- 23. NOTIFICATION TARGETS TABLE
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
-- 23.5 ADMIN NOTIFICATIONS TABLE
-- ============================================
-- Table to store notifications specifically for super admins (job auto-approvals, system alerts, etc.)
CREATE TABLE admin_notifications (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('job_auto_approved', 'job_request', 'system', 'alert')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50), -- 'job', 'job_request', 'student', etc.
    related_entity_id INTEGER,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by_college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_notifications_type ON admin_notifications(notification_type);
CREATE INDEX idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_entity ON admin_notifications(related_entity_type, related_entity_id);

-- ============================================
-- 24. ACTIVITY LOGS TABLE
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
-- 25. BRANCHES REFERENCE TABLE
-- ============================================
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    branch_name VARCHAR(255) NOT NULL UNIQUE,
    short_name VARCHAR(10) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branches_active ON branches(is_active);
CREATE INDEX idx_branches_short_name ON branches(short_name);
CREATE INDEX idx_branches_display_order ON branches(display_order);

-- ============================================
-- 26. BRANCH MAPPINGS TABLE
-- ============================================
CREATE TABLE branch_mappings (
    id SERIAL PRIMARY KEY,
    branch_name VARCHAR(255) NOT NULL UNIQUE,
    normalized_name VARCHAR(255) NOT NULL,
    branch_category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branch_mappings_normalized ON branch_mappings(normalized_name);

-- ============================================
-- 27. ARCHIVED STUDENTS TABLE
-- ============================================
CREATE TABLE archived_students (
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

CREATE INDEX idx_archived_students_prn ON archived_students(prn);
CREATE INDEX idx_archived_students_range ON archived_students(prn_range_id);
CREATE INDEX idx_archived_students_archived_at ON archived_students(archived_at DESC);

-- ============================================
-- 28. STUDENT RESUMES TABLE
-- ============================================
-- Stores custom resume content that students can modify
-- Officers can choose to download either system-generated or custom version

CREATE TABLE student_resumes (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,

    -- Career Objective
    career_objective TEXT,

    -- Skills (stored as JSON array for flexibility)
    technical_skills JSONB DEFAULT '[]'::jsonb,
    soft_skills JSONB DEFAULT '[]'::jsonb,
    languages_known JSONB DEFAULT '[]'::jsonb,

    -- Projects (JSON array with project details)
    projects JSONB DEFAULT '[]'::jsonb,

    -- Work Experience / Internships
    work_experience JSONB DEFAULT '[]'::jsonb,

    -- Extra Certifications
    certifications JSONB DEFAULT '[]'::jsonb,

    -- Achievements & Awards
    achievements JSONB DEFAULT '[]'::jsonb,

    -- Extracurricular Activities
    extracurricular_activities JSONB DEFAULT '[]'::jsonb,

    -- Declaration text
    declaration_text TEXT DEFAULT 'I hereby declare that the above-mentioned information is true to the best of my knowledge.',

    -- Custom sections
    custom_sections JSONB DEFAULT '[]'::jsonb,

    -- Tracking
    has_custom_content BOOLEAN DEFAULT FALSE,
    last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_resumes_student_id ON student_resumes(student_id);
CREATE INDEX idx_student_resumes_has_custom ON student_resumes(has_custom_content);

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
CREATE TRIGGER update_job_requests_updated_at BEFORE UPDATE ON job_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Extended profile timestamp trigger
CREATE OR REPLACE FUNCTION update_extended_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_extended_profile_timestamp
    BEFORE UPDATE ON student_extended_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_extended_profile_timestamp();

-- Branches timestamp trigger
CREATE OR REPLACE FUNCTION update_branches_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_branches_timestamp
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_branches_timestamp();

-- Job drives timestamp trigger
CREATE OR REPLACE FUNCTION update_job_drives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_drives_updated_at
    BEFORE UPDATE ON job_drives
    FOR EACH ROW
    EXECUTE FUNCTION update_job_drives_updated_at();

-- Student resumes timestamp trigger
CREATE OR REPLACE FUNCTION update_student_resumes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.last_modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_resumes_timestamp
    BEFORE UPDATE ON student_resumes
    FOR EACH ROW
    EXECUTE FUNCTION update_student_resumes_timestamp();

-- ============================================
-- STUDENT AGE AUTO-UPDATE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_student_age()
RETURNS TRIGGER AS $$
BEGIN
    NEW.age = DATE_PART('year', AGE(CURRENT_DATE, NEW.date_of_birth));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_age
    BEFORE INSERT OR UPDATE OF date_of_birth
    ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_student_age();

-- ============================================
-- AUTO-CREATE EXTENDED PROFILE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION create_student_extended_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO student_extended_profiles (
        student_id,
        has_driving_license,
        has_pan_card,
        has_aadhar_card,
        has_passport
    )
    VALUES (
        NEW.id,
        NULL,
        NULL,
        NULL,
        NULL
    )
    ON CONFLICT (student_id) DO NOTHING;

    INSERT INTO profile_section_completion (student_id, section_name, is_completed, completion_percentage)
    VALUES
        (NEW.id, 'academic_extended', false, 0),
        (NEW.id, 'physical_details', false, 0),
        (NEW.id, 'family_details', false, 0),
        (NEW.id, 'personal_details', false, 0),
        (NEW.id, 'document_verification', false, 0),
        (NEW.id, 'education_preferences', false, 0)
    ON CONFLICT (student_id, section_name) DO NOTHING;

    -- Also create resume record for the student
    INSERT INTO student_resumes (student_id)
    VALUES (NEW.id)
    ON CONFLICT (student_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_extended_profile
    AFTER INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION create_student_extended_profile();

-- ============================================
-- PROFILE COMPLETION CALCULATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_student_id integer)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    v_completion INTEGER;
    v_total_sections INTEGER := 6;
    v_completed_sections INTEGER := 0;
    v_profile RECORD;
    v_student RECORD;

    v_academic_complete BOOLEAN := FALSE;
    v_physical_complete BOOLEAN := FALSE;
    v_personal_complete BOOLEAN := FALSE;
    v_family_complete BOOLEAN := FALSE;
    v_document_complete BOOLEAN := FALSE;
    v_education_complete BOOLEAN := FALSE;

    v_academic_pct INTEGER := 0;
    v_physical_pct INTEGER := 0;
    v_personal_pct INTEGER := 0;
    v_family_pct INTEGER := 0;
    v_document_pct INTEGER := 0;
    v_education_pct INTEGER := 0;
BEGIN
    SELECT * INTO v_profile FROM student_extended_profiles WHERE student_id = p_student_id;
    IF NOT FOUND THEN RETURN 0; END IF;

    SELECT * INTO v_student FROM students WHERE id = p_student_id;

    -- 1. ACADEMIC EXTENDED SECTION (5 fields)
    DECLARE
        v_academic_filled INTEGER := 0;
        v_academic_total INTEGER := 5;
    BEGIN
        IF v_profile.sslc_marks IS NOT NULL THEN v_academic_filled := v_academic_filled + 1; END IF;
        IF v_profile.sslc_year IS NOT NULL THEN v_academic_filled := v_academic_filled + 1; END IF;
        IF v_profile.sslc_board IS NOT NULL THEN v_academic_filled := v_academic_filled + 1; END IF;
        IF v_profile.twelfth_marks IS NOT NULL THEN v_academic_filled := v_academic_filled + 1; END IF;
        IF v_profile.twelfth_year IS NOT NULL THEN v_academic_filled := v_academic_filled + 1; END IF;

        v_academic_pct := ROUND((v_academic_filled::DECIMAL / v_academic_total::DECIMAL) * 100);
        v_academic_complete := v_academic_filled > 0;
    END;

    -- 2. PHYSICAL DETAILS SECTION (3 fields)
    DECLARE
        v_physical_filled INTEGER := 0;
        v_physical_total INTEGER := 3;
    BEGIN
        IF COALESCE(v_profile.height_cm, v_student.height) IS NOT NULL THEN v_physical_filled := v_physical_filled + 1; END IF;
        IF COALESCE(v_profile.weight_kg, v_student.weight) IS NOT NULL THEN v_physical_filled := v_physical_filled + 1; END IF;
        IF v_profile.physically_handicapped IS NOT NULL THEN v_physical_filled := v_physical_filled + 1; END IF;

        v_physical_pct := ROUND((v_physical_filled::DECIMAL / v_physical_total::DECIMAL) * 100);
        v_physical_complete := v_physical_filled > 0;
    END;

    -- 3. PERSONAL DETAILS SECTION (3 fields)
    DECLARE
        v_personal_filled INTEGER := 0;
        v_personal_total INTEGER := 3;
    BEGIN
        IF v_profile.district IS NOT NULL THEN v_personal_filled := v_personal_filled + 1; END IF;
        IF COALESCE(v_profile.permanent_address, v_student.complete_address) IS NOT NULL THEN v_personal_filled := v_personal_filled + 1; END IF;
        IF v_profile.interests_hobbies IS NOT NULL THEN v_personal_filled := v_personal_filled + 1; END IF;

        v_personal_pct := ROUND((v_personal_filled::DECIMAL / v_personal_total::DECIMAL) * 100);
        v_personal_complete := v_personal_filled > 0;
    END;

    -- 4. FAMILY DETAILS SECTION (8 fields)
    DECLARE
        v_family_filled INTEGER := 0;
        v_family_total INTEGER := 8;
    BEGIN
        IF v_profile.father_name IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.father_occupation IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.father_annual_income IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.mother_name IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.mother_occupation IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.mother_annual_income IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.siblings_count IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;
        IF v_profile.siblings_details IS NOT NULL THEN v_family_filled := v_family_filled + 1; END IF;

        v_family_pct := ROUND((v_family_filled::DECIMAL / v_family_total::DECIMAL) * 100);
        v_family_complete := v_family_filled > 0;
    END;

    -- 5. DOCUMENT VERIFICATION SECTION (4 documents)
    DECLARE
        v_document_filled INTEGER := 0;
        v_document_total INTEGER := 4;
    BEGIN
        IF COALESCE(v_profile.has_driving_license, v_student.has_driving_license) = TRUE THEN v_document_filled := v_document_filled + 1; END IF;
        IF COALESCE(v_profile.has_pan_card, v_student.has_pan_card) = TRUE THEN v_document_filled := v_document_filled + 1; END IF;
        IF v_profile.has_aadhar_card = TRUE THEN v_document_filled := v_document_filled + 1; END IF;
        IF v_profile.has_passport = TRUE THEN v_document_filled := v_document_filled + 1; END IF;

        v_document_pct := ROUND((v_document_filled::DECIMAL / v_document_total::DECIMAL) * 100);
        v_document_complete := v_document_filled > 0;
    END;

    -- 6. EDUCATION PREFERENCES SECTION
    DECLARE
        v_has_preference BOOLEAN := FALSE;
    BEGIN
        v_has_preference :=
            v_profile.interested_in_btech = TRUE OR
            v_profile.interested_in_mtech = TRUE OR
            v_profile.not_interested_in_higher_education = TRUE;

        IF v_has_preference THEN
            v_education_pct := 100;
            v_education_complete := TRUE;
        ELSE
            v_education_pct := 0;
            v_education_complete := FALSE;
        END IF;
    END;

    -- Count completed sections
    IF v_academic_complete THEN v_completed_sections := v_completed_sections + 1; END IF;
    IF v_physical_complete THEN v_completed_sections := v_completed_sections + 1; END IF;
    IF v_personal_complete THEN v_completed_sections := v_completed_sections + 1; END IF;
    IF v_family_complete THEN v_completed_sections := v_completed_sections + 1; END IF;
    IF v_document_complete THEN v_completed_sections := v_completed_sections + 1; END IF;
    IF v_education_complete THEN v_completed_sections := v_completed_sections + 1; END IF;

    v_completion := ROUND((v_completed_sections::DECIMAL / v_total_sections::DECIMAL) * 100);

    UPDATE student_extended_profiles
    SET profile_completion_percentage = v_completion, last_updated = CURRENT_TIMESTAMP
    WHERE student_id = p_student_id;

    INSERT INTO profile_section_completion (student_id, section_name, is_completed, completion_percentage)
    VALUES
        (p_student_id, 'academic_extended', v_academic_complete, v_academic_pct),
        (p_student_id, 'physical_details', v_physical_complete, v_physical_pct),
        (p_student_id, 'personal_details', v_personal_complete, v_personal_pct),
        (p_student_id, 'family_details', v_family_complete, v_family_pct),
        (p_student_id, 'document_verification', v_document_complete, v_document_pct),
        (p_student_id, 'education_preferences', v_education_complete, v_education_pct)
    ON CONFLICT (student_id, section_name)
    DO UPDATE SET
        is_completed = EXCLUDED.is_completed,
        completion_percentage = EXCLUDED.completion_percentage,
        last_updated = CURRENT_TIMESTAMP;

    RETURN v_completion;
END;
$function$;

-- ============================================
-- BATCH AGE UPDATE FUNCTION (for cron jobs)
-- ============================================

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

-- ============================================
-- MATERIALIZED VIEW FOR ACTIVE STUDENTS
-- ============================================

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

CREATE OR REPLACE FUNCTION refresh_active_students_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY active_students_view;
END;
$$ LANGUAGE plpgsql;

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
COMMENT ON TABLE student_extended_profiles IS 'Tier 2: Extended student profile data (optional fields)';
COMMENT ON TABLE profile_section_completion IS 'Tracks completion status of each extended profile section';
COMMENT ON TABLE whitelist_requests IS 'Requests from placement officers to whitelist blacklisted students';
COMMENT ON TABLE jobs IS 'Job postings created by super admin';
COMMENT ON TABLE job_drives IS 'Stores drive schedule information for each job posting';
COMMENT ON TABLE deleted_jobs_history IS 'Historical record of all deleted job postings for audit purposes';
COMMENT ON TABLE job_eligibility_criteria IS 'Multiple eligibility criteria per job';
COMMENT ON TABLE job_requirement_templates IS 'Defines what data each job requires from students';
COMMENT ON TABLE company_requirement_templates IS 'Reusable templates for common companies';
COMMENT ON TABLE job_applications IS 'Student job applications tracking';
COMMENT ON TABLE job_applications_extended IS 'Tier 2 & 3 data for each job application';
COMMENT ON TABLE job_requests IS 'Job posting requests from placement officers to super admin';
COMMENT ON TABLE job_request_requirement_templates IS 'Stores extended requirements for job requests';
COMMENT ON TABLE notifications IS 'Notification messages sent by admin/officers';
COMMENT ON TABLE notification_recipients IS 'Maps notifications to individual users';
COMMENT ON TABLE notification_targets IS 'Maps notifications to regions/colleges';
COMMENT ON TABLE activity_logs IS 'Audit trail of all important actions';
COMMENT ON TABLE branches IS 'Reference table for all engineering branches with standardized short names';
COMMENT ON TABLE branch_mappings IS 'Normalized branch names for handling variations across colleges';
COMMENT ON TABLE archived_students IS 'Archived student data from disabled PRN ranges';
COMMENT ON TABLE student_resumes IS 'Stores custom resume content for students. Officers can download either system-standard or student-modified version.';
COMMENT ON MATERIALIZED VIEW active_students_view IS 'Optimized view for active, approved, non-blacklisted students';
COMMENT ON FUNCTION update_student_age() IS 'Automatically calculates and updates student age based on date_of_birth';
COMMENT ON FUNCTION create_student_extended_profile() IS 'Automatically creates extended profile and section tracking when a new student is registered';
COMMENT ON FUNCTION calculate_profile_completion IS 'Calculates profile completion percentage - counts only truly filled fields';
COMMENT ON FUNCTION update_all_student_ages() IS 'Batch updates all student ages (run daily via cron job)';
COMMENT ON FUNCTION refresh_active_students_view() IS 'Refreshes the materialized view for active students';
