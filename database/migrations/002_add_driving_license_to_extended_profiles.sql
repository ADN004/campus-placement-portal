-- Migration: Add Driving License to Extended Profiles
-- Description: Adds driving license field to student_extended_profiles table

-- Add driving license field to student_extended_profiles table
ALTER TABLE student_extended_profiles
ADD COLUMN IF NOT EXISTS has_driving_license BOOLEAN DEFAULT NULL;

-- Set existing false values to NULL so COALESCE works properly with student table
UPDATE student_extended_profiles
SET has_driving_license = NULL,
    has_pan_card = NULL
WHERE has_driving_license = false OR has_pan_card = false;

-- Add comments for documentation
COMMENT ON COLUMN student_extended_profiles.has_driving_license IS 'Whether student has a valid driving license (merged from registration if not set, NULL allows COALESCE fallback)';
