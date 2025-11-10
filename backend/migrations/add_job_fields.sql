-- Add new fields to jobs table for enhanced targeting and eligibility

-- Add job_type column
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(50) DEFAULT 'Full-time';

-- Add eligibility criteria columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_cgpa DECIMAL(3,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS max_backlogs INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS allowed_branches JSONB;

-- Add targeting columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_type VARCHAR(50) DEFAULT 'all' CHECK (target_type IN ('all', 'region', 'college', 'specific'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_regions JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_colleges JSONB;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_target_type ON jobs(target_type);

-- Add comment
COMMENT ON COLUMN jobs.job_type IS 'Type of job: Full-time, Internship, etc.';
COMMENT ON COLUMN jobs.min_cgpa IS 'Minimum CGPA requirement for eligibility';
COMMENT ON COLUMN jobs.max_backlogs IS 'Maximum allowed backlogs';
COMMENT ON COLUMN jobs.allowed_branches IS 'JSON array of allowed branch names';
COMMENT ON COLUMN jobs.target_type IS 'Target audience type: all, region, college, or specific';
COMMENT ON COLUMN jobs.target_regions IS 'JSON array of target region IDs';
COMMENT ON COLUMN jobs.target_colleges IS 'JSON array of target college IDs';
