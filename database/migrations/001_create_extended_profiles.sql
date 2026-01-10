-- Migration: Create Extended Profile System
-- Description: Adds support for student extended profiles (Tier 2 data)

-- Create student_extended_profiles table
CREATE TABLE IF NOT EXISTS student_extended_profiles (
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
    physically_handicapped BOOLEAN DEFAULT FALSE,
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
    siblings_count INTEGER DEFAULT 0,
    siblings_details TEXT,

    -- Document Status
    has_pan_card BOOLEAN DEFAULT FALSE,
    pan_number VARCHAR(10),
    has_aadhar_card BOOLEAN DEFAULT FALSE,
    aadhar_number VARCHAR(12),
    has_passport BOOLEAN DEFAULT FALSE,
    passport_number VARCHAR(20),

    -- Education Preferences
    interested_in_btech BOOLEAN DEFAULT FALSE,
    interested_in_mtech BOOLEAN DEFAULT FALSE,
    preferred_study_mode VARCHAR(50), -- 'full-time', 'part-time', 'distance'

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

-- Create indexes
CREATE INDEX idx_extended_profile_student ON student_extended_profiles(student_id);
CREATE INDEX idx_extended_profile_completion ON student_extended_profiles(profile_completion_percentage);

-- Create trigger to update updated_at
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

-- Create job_requirement_templates table (for defining what each job needs)
CREATE TABLE IF NOT EXISTS job_requirement_templates (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

    -- Tier 1 Requirements (always included, but can specify specific validations)
    min_cgpa DECIMAL(3,2),
    max_backlogs INTEGER,
    allowed_branches JSONB DEFAULT '[]'::jsonb, -- Array of allowed branches

    -- Tier 2 Requirements (optional extended profile fields)
    requires_academic_extended BOOLEAN DEFAULT FALSE,
    requires_physical_details BOOLEAN DEFAULT FALSE,
    requires_family_details BOOLEAN DEFAULT FALSE,
    requires_document_verification BOOLEAN DEFAULT FALSE,
    requires_education_preferences BOOLEAN DEFAULT FALSE,

    -- Specific field requirements (JSON for granular control)
    specific_field_requirements JSONB DEFAULT '{}'::jsonb,
    /* Example:
    {
        "height_cm": {"required": true, "min": 155},
        "weight_kg": {"required": true, "min": 45},
        "sslc_marks": {"required": true, "min": 60},
        "has_pan_card": {"required": true},
        "interested_in_btech": {"required": true}
    }
    */

    -- Custom company-specific fields
    custom_fields JSONB DEFAULT '[]'::jsonb,
    /* Example:
    [
        {
            "field_name": "sitttr_internship_applied",
            "field_label": "Have you applied for SITTTR internship?",
            "field_type": "boolean",
            "required": true,
            "options": null
        },
        {
            "field_name": "regional_preference",
            "field_label": "Regional Preference",
            "field_type": "select",
            "required": true,
            "options": ["South", "North", "Central", "East", "West"]
        }
    ]
    */

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_requirements_job ON job_requirement_templates(job_id);

-- Create job_applications_extended table (stores Tier 2 & 3 data for applications)
CREATE TABLE IF NOT EXISTS job_applications_extended (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL UNIQUE REFERENCES job_applications(id) ON DELETE CASCADE,

    -- Snapshot of Tier 2 data at time of application (for audit trail)
    tier2_snapshot JSONB DEFAULT '{}'::jsonb,

    -- Custom field responses (Tier 3)
    custom_field_responses JSONB DEFAULT '{}'::jsonb,
    /* Example:
    {
        "sitttr_internship_applied": true,
        "regional_preference": "South",
        "father_phone": "9876543210"
    }
    */

    -- Validation status
    meets_requirements BOOLEAN DEFAULT FALSE,
    validation_errors JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_applications_extended_application ON job_applications_extended(application_id);

-- Create requirement_templates table (reusable templates for common companies)
CREATE TABLE IF NOT EXISTS company_requirement_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(200) NOT NULL UNIQUE,
    company_name VARCHAR(200),
    description TEXT,

    -- Template configuration (same structure as job_requirement_templates)
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

-- Create profile_section_completion table (track which sections are completed)
CREATE TABLE IF NOT EXISTS profile_section_completion (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    section_name VARCHAR(100) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completion_percentage INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(student_id, section_name)
);

CREATE INDEX idx_section_completion_student ON profile_section_completion(student_id);

-- Insert default section tracking for existing students
INSERT INTO profile_section_completion (student_id, section_name, is_completed, completion_percentage)
SELECT
    id,
    section,
    false,
    0
FROM students
CROSS JOIN (
    VALUES
        ('academic_extended'),
        ('physical_details'),
        ('family_details'),
        ('document_verification'),
        ('education_preferences')
) AS sections(section)
ON CONFLICT (student_id, section_name) DO NOTHING;

-- Create function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(p_student_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_completion INTEGER;
    v_total_fields INTEGER := 0;
    v_filled_fields INTEGER := 0;
    v_profile RECORD;
BEGIN
    SELECT * INTO v_profile
    FROM student_extended_profiles
    WHERE student_id = p_student_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Academic Extended (5 fields)
    v_total_fields := v_total_fields + 5;
    IF v_profile.sslc_marks IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.sslc_year IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.twelfth_marks IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.twelfth_year IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.sslc_board IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Physical Details (3 fields)
    v_total_fields := v_total_fields + 3;
    IF v_profile.height_cm IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.weight_kg IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.physically_handicapped IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Personal Details (3 fields)
    v_total_fields := v_total_fields + 3;
    IF v_profile.district IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.permanent_address IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.interests_hobbies IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Family Details (8 fields)
    v_total_fields := v_total_fields + 8;
    IF v_profile.father_name IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.father_occupation IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.father_annual_income IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.mother_name IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.mother_occupation IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.mother_annual_income IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.siblings_count IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.siblings_details IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Document Status (6 fields)
    v_total_fields := v_total_fields + 6;
    IF v_profile.has_pan_card IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.pan_number IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.has_aadhar_card IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.aadhar_number IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.has_passport IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.passport_number IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Education Preferences (3 fields)
    v_total_fields := v_total_fields + 3;
    IF v_profile.interested_in_btech IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.interested_in_mtech IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;
    IF v_profile.preferred_study_mode IS NOT NULL THEN v_filled_fields := v_filled_fields + 1; END IF;

    -- Calculate percentage
    IF v_total_fields > 0 THEN
        v_completion := ROUND((v_filled_fields::DECIMAL / v_total_fields::DECIMAL) * 100);
    ELSE
        v_completion := 0;
    END IF;

    -- Update the profile completion percentage
    UPDATE student_extended_profiles
    SET profile_completion_percentage = v_completion
    WHERE student_id = p_student_id;

    RETURN v_completion;
END;
$$ LANGUAGE plpgsql;

-- Create extended profiles for all existing students
INSERT INTO student_extended_profiles (student_id)
SELECT id FROM students
ON CONFLICT (student_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE student_extended_profiles IS 'Tier 2: Extended student profile data (optional fields)';
COMMENT ON TABLE job_requirement_templates IS 'Defines what data each job requires from students';
COMMENT ON TABLE job_applications_extended IS 'Tier 2 & 3 data for each job application';
COMMENT ON TABLE company_requirement_templates IS 'Reusable templates for common companies';
COMMENT ON TABLE profile_section_completion IS 'Tracks completion status of profile sections';
