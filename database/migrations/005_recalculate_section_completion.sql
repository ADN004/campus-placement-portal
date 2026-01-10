-- Migration: Recalculate Section Completion with Fixed Logic
-- Description: Recalculates all section completion percentages to properly show partial completion

-- Delete all existing section completion records so they get recalculated with the fixed logic
DELETE FROM profile_section_completion;

-- Recreate section completion records for all students
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
ON CONFLICT (student_id, section_name) DO NOTHING;

-- The completion percentages will be properly calculated when students next view their profiles
-- or when they save any section (the backend will call updateSectionCompletion with the fixed logic)

COMMENT ON TABLE profile_section_completion IS 'Tracks completion status of each extended profile section with partial completion percentages';
