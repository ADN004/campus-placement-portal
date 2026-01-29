-- Create job_requests table for placement officers to request job postings

CREATE TABLE IF NOT EXISTS job_requests (
    id SERIAL PRIMARY KEY,
    placement_officer_id INTEGER NOT NULL REFERENCES placement_officers(id) ON DELETE CASCADE,
    college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    no_of_vacancies INTEGER,
    location VARCHAR(255),
    salary_range VARCHAR(100),
    application_deadline TIMESTAMP,
    application_form_url TEXT,
    min_cgpa DECIMAL(3,2),
    max_backlogs INTEGER,
    allowed_branches JSONB,
    target_type VARCHAR(50) DEFAULT 'specific' CHECK (target_type IN ('all', 'specific')),
    target_regions JSONB,
    target_colleges JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by INTEGER REFERENCES users(id),
    review_comment TEXT,
    reviewed_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_requests_po ON job_requests(placement_officer_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_college ON job_requests(college_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON job_requests(status);
CREATE INDEX IF NOT EXISTS idx_job_requests_created ON job_requests(created_at DESC);

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_job_requests_updated_at
    BEFORE UPDATE ON job_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE job_requests IS 'Job posting requests from placement officers to super admin';
