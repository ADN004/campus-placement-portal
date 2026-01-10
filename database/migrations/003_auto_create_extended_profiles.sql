-- Migration: Auto-create Extended Profiles for New Students
-- Description: Adds trigger to automatically create extended profile records when students register
-- This fixes the 404 error when new students try to access their extended profile

-- First, create extended profiles for any existing students who don't have one
INSERT INTO student_extended_profiles (student_id)
SELECT s.id
FROM students s
LEFT JOIN student_extended_profiles ep ON s.id = ep.student_id
WHERE ep.id IS NULL
ON CONFLICT (student_id) DO NOTHING;

-- Create trigger function to auto-create extended profile for new students
CREATE OR REPLACE FUNCTION create_student_extended_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Create extended profile record for the new student
    -- Explicitly set document fields to NULL so COALESCE works with student table values
    INSERT INTO student_extended_profiles (
        student_id,
        has_driving_license,
        has_pan_card,
        has_aadhar_card,
        has_passport
    )
    VALUES (
        NEW.id,
        NULL,  -- Allow COALESCE to fall back to student.has_driving_license
        NULL,  -- Allow COALESCE to fall back to student.has_pan_card
        NULL,  -- Allow COALESCE to fall back to student.has_aadhar_card (always NULL in student table)
        NULL   -- Allow COALESCE to fall back to student.has_passport (always NULL in student table)
    )
    ON CONFLICT (student_id) DO NOTHING;

    -- Create section completion tracking records
    INSERT INTO profile_section_completion (student_id, section_name, is_completed, completion_percentage)
    VALUES
        (NEW.id, 'academic_extended', false, 0),
        (NEW.id, 'physical_details', false, 0),
        (NEW.id, 'family_details', false, 0),
        (NEW.id, 'personal_details', false, 0),
        (NEW.id, 'document_verification', false, 0),
        (NEW.id, 'education_preferences', false, 0)
    ON CONFLICT (student_id, section_name) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after a new student is inserted
CREATE TRIGGER trigger_create_extended_profile
    AFTER INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION create_student_extended_profile();

-- Also create section completion records for existing students who don't have them
INSERT INTO profile_section_completion (student_id, section_name, is_completed, completion_percentage)
SELECT
    s.id,
    section,
    false,
    0
FROM students s
CROSS JOIN (
    VALUES
        ('academic_extended'),
        ('physical_details'),
        ('family_details'),
        ('personal_details'),
        ('document_verification'),
        ('education_preferences')
) AS sections(section)
LEFT JOIN profile_section_completion psc
    ON s.id = psc.student_id AND psc.section_name = section
WHERE psc.id IS NULL
ON CONFLICT (student_id, section_name) DO NOTHING;

-- Add comment
COMMENT ON FUNCTION create_student_extended_profile() IS 'Automatically creates extended profile and section tracking when a new student is registered';
