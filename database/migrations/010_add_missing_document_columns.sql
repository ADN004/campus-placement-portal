-- Migration 010: Add missing document columns to students table
-- This ensures extended profile document updates sync properly to the main profile

-- Add has_aadhar_card and has_passport columns to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS has_aadhar_card BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_passport BOOLEAN DEFAULT FALSE;

-- Sync existing data from student_extended_profiles to students table
UPDATE students s
SET
  has_aadhar_card = COALESCE(ep.has_aadhar_card, FALSE),
  has_passport = COALESCE(ep.has_passport, FALSE)
FROM student_extended_profiles ep
WHERE s.id = ep.student_id
  AND (ep.has_aadhar_card IS NOT NULL OR ep.has_passport IS NOT NULL);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_students_aadhar ON students(has_aadhar_card);
CREATE INDEX IF NOT EXISTS idx_students_passport ON students(has_passport);

-- Recalculate profile completion for all students
DO $$
DECLARE
  student_record RECORD;
BEGIN
  FOR student_record IN SELECT id FROM students LOOP
    PERFORM calculate_profile_completion(student_record.id);
  END LOOP;
END $$;
