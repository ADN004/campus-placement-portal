-- Add sample placement data for testing the placement poster feature
-- This updates existing job applications with placement packages and selection status

BEGIN;

-- First, let's check which applications we have
DO $$
DECLARE
    application_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO application_count FROM job_applications;
    RAISE NOTICE 'Total job applications found: %', application_count;
END $$;

-- Update some existing applications to be "selected" with placement packages
-- This will create realistic placement data
UPDATE job_applications ja
SET
    application_status = 'selected',
    placement_package = (3.5 + (RANDOM() * 8))::DECIMAL(5,2), -- Random LPA between 3.5 and 11.5
    joining_date = CURRENT_DATE + ((RANDOM() * 60)::INTEGER || ' days')::INTERVAL, -- Random joining date within next 60 days
    placement_location = (ARRAY['Bengaluru', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Delhi'])[FLOOR(1 + RANDOM() * 6)]
WHERE ja.id IN (
    -- Select the first 15 applications across different students and companies
    SELECT DISTINCT ON (s.id) ja2.id
    FROM job_applications ja2
    JOIN students s ON ja2.student_id = s.id
    JOIN jobs j ON ja2.job_id = j.id
    WHERE s.registration_status = 'approved'
      AND s.is_blacklisted = FALSE
      AND ja2.application_status != 'rejected'
    ORDER BY s.id, RANDOM()
    LIMIT 15
);

-- Show what we updated
SELECT
    COUNT(*) as selected_count,
    MIN(placement_package) as min_package,
    MAX(placement_package) as max_package,
    AVG(placement_package)::DECIMAL(5,2) as avg_package
FROM job_applications
WHERE application_status = 'selected'
  AND placement_package IS NOT NULL;

-- Show sample of placed students
SELECT
    s.student_name,
    s.branch,
    j.company_name,
    ja.placement_package as lpa,
    ja.joining_date,
    ja.placement_location
FROM job_applications ja
JOIN students s ON ja.student_id = s.id
JOIN jobs j ON ja.job_id = j.id
WHERE ja.application_status = 'selected'
  AND ja.placement_package IS NOT NULL
ORDER BY ja.placement_package DESC
LIMIT 10;

COMMIT;

SELECT '✅ Sample placement data created successfully!' as status;
