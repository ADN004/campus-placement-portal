-- Add new fields to jobs table for enhanced targeting and eligibility

-- Add no_of_vacancies column (replaces job_type)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS no_of_vacancies INTEGER;

-- Add eligibility criteria columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_cgpa DECIMAL(3,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS max_backlogs INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS allowed_branches JSONB;

-- Add targeting columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_type VARCHAR(50) DEFAULT 'all' CHECK (target_type IN ('all', 'region', 'college', 'specific'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_regions JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_colleges JSONB;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_target_type ON jobs(target_type);

-- Add comments
COMMENT ON COLUMN jobs.no_of_vacancies IS 'Number of vacancies for this job posting (optional)';
COMMENT ON COLUMN jobs.min_cgpa IS 'Minimum CGPA requirement for eligibility';
COMMENT ON COLUMN jobs.max_backlogs IS 'Maximum allowed backlogs';
COMMENT ON COLUMN jobs.allowed_branches IS 'JSON array of allowed branch names';
COMMENT ON COLUMN jobs.target_type IS 'Target audience type: all, region, college, or specific';
COMMENT ON COLUMN jobs.target_regions IS 'JSON array of target region IDs';
COMMENT ON COLUMN jobs.target_colleges IS 'JSON array of target college IDs';
