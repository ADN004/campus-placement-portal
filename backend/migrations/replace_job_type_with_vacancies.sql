-- Migration: Replace job_type with no_of_vacancies
-- Date: 2026-01-29
-- Description: Replace the job_type field (Full-time/Internship) with no_of_vacancies (optional integer)

-- ============================================
-- STEP 1: Add no_of_vacancies column to jobs table
-- ============================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS no_of_vacancies INTEGER;

-- Add comment for the new column
COMMENT ON COLUMN jobs.no_of_vacancies IS 'Number of vacancies for this job posting (optional)';

-- ============================================
-- STEP 2: Add no_of_vacancies column to job_requests table
-- ============================================
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS no_of_vacancies INTEGER;

-- Add comment for the new column
COMMENT ON COLUMN job_requests.no_of_vacancies IS 'Number of vacancies for this job request (optional)';

-- ============================================
-- STEP 3: Drop job_type column from jobs table (if exists)
-- ============================================
ALTER TABLE jobs DROP COLUMN IF EXISTS job_type;

-- ============================================
-- STEP 4: Drop job_type column from job_requests table (if exists)
-- ============================================
ALTER TABLE job_requests DROP COLUMN IF EXISTS job_type;

-- ============================================
-- STEP 5: Drop the job_type index if it exists
-- ============================================
DROP INDEX IF EXISTS idx_jobs_type;

-- ============================================
-- Migration Complete
-- ============================================
