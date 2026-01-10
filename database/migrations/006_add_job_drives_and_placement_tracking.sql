-- Migration: Add Job Drives and Placement Tracking
-- Description: Creates job_drives table and extends job_applications with placement and review tracking fields
-- Date: 2025-12-28

-- Create job_drives table for scheduling drives per job
CREATE TABLE IF NOT EXISTS job_drives (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    drive_date DATE NOT NULL,
    drive_time TIME NOT NULL,
    drive_location VARCHAR(500) NOT NULL,
    additional_instructions TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add placement tracking fields to job_applications table
ALTER TABLE job_applications
    ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS review_notes TEXT,
    ADD COLUMN IF NOT EXISTS placement_package DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS joining_date DATE,
    ADD COLUMN IF NOT EXISTS placement_location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS placement_notes TEXT;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_job_drives_job ON job_drives(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status_updated ON job_applications(application_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_reviewed_by ON job_applications(reviewed_by);

-- Create trigger to update updated_at timestamp for job_drives
CREATE OR REPLACE FUNCTION update_job_drives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_drives_updated_at
    BEFORE UPDATE ON job_drives
    FOR EACH ROW
    EXECUTE FUNCTION update_job_drives_updated_at();

-- Comments for documentation
COMMENT ON TABLE job_drives IS 'Stores drive schedule information for each job posting';
COMMENT ON COLUMN job_drives.drive_date IS 'Date of the placement drive';
COMMENT ON COLUMN job_drives.drive_time IS 'Time of the placement drive';
COMMENT ON COLUMN job_drives.drive_location IS 'Location where the drive will be conducted';
COMMENT ON COLUMN job_drives.additional_instructions IS 'Any additional instructions for students';

COMMENT ON COLUMN job_applications.reviewed_by IS 'User ID of super admin who reviewed the application';
COMMENT ON COLUMN job_applications.reviewed_at IS 'Timestamp when the application was reviewed';
COMMENT ON COLUMN job_applications.review_notes IS 'Notes added by reviewer during status update';
COMMENT ON COLUMN job_applications.placement_package IS 'Package offered in LPA (Lakhs Per Annum)';
COMMENT ON COLUMN job_applications.joining_date IS 'Date when the student is expected to join';
COMMENT ON COLUMN job_applications.placement_location IS 'Location of placement/job';
COMMENT ON COLUMN job_applications.placement_notes IS 'Additional notes about the placement';
