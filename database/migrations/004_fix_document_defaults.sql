-- Migration: Fix Document Field Defaults
-- Description: Set document fields to NULL for existing profiles so COALESCE works properly
-- This ensures that document verification checkboxes show values from student registration

-- Set existing false values to NULL so COALESCE falls back to student table values
UPDATE student_extended_profiles
SET
    has_driving_license = NULL,
    has_pan_card = NULL,
    has_aadhar_card = NULL,
    has_passport = NULL
WHERE
    has_driving_license = false
    OR has_pan_card = false
    OR has_aadhar_card = false
    OR has_passport = false;

-- Alter default values to NULL instead of FALSE for future records
ALTER TABLE student_extended_profiles
    ALTER COLUMN has_pan_card SET DEFAULT NULL,
    ALTER COLUMN has_aadhar_card SET DEFAULT NULL,
    ALTER COLUMN has_passport SET DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN student_extended_profiles.has_pan_card IS 'Whether student has a PAN card (NULL allows COALESCE fallback to student table)';
COMMENT ON COLUMN student_extended_profiles.has_aadhar_card IS 'Whether student has an Aadhar card (NULL allows COALESCE fallback to student table)';
COMMENT ON COLUMN student_extended_profiles.has_passport IS 'Whether student has a passport (NULL allows COALESCE fallback to student table)';

-- Recalculate section completion for all students to reflect registration data
DO $$
DECLARE
    student_record RECORD;
BEGIN
    FOR student_record IN SELECT id FROM students LOOP
        -- Update physical_details section
        PERFORM * FROM student_extended_profiles WHERE student_id = student_record.id;
        IF FOUND THEN
            -- Recalculate completion will be done by the completion function
            PERFORM calculate_profile_completion(student_record.id);
        END IF;
    END LOOP;
END $$;
