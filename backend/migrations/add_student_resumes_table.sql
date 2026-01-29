-- Migration: Add Student Resumes Table
-- Purpose: Store resume content for students
-- Date: 2026-01-28

-- ============================================
-- STUDENT RESUMES TABLE
-- ============================================
-- Stores resume content that students can customize (skills, projects, experience, etc.)
-- Officers and admins can download the student's resume as PDF

CREATE TABLE IF NOT EXISTS student_resumes (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,

    -- Career Objective
    career_objective TEXT,

    -- Skills (stored as JSON array for flexibility)
    technical_skills JSONB DEFAULT '[]'::jsonb,
    soft_skills JSONB DEFAULT '[]'::jsonb,
    languages_known JSONB DEFAULT '[]'::jsonb,

    -- Projects (JSON array with project details)
    projects JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"title": "Project Name", "description": "...", "technologies": "React, Node.js", "duration": "3 months"}]

    -- Work Experience / Internships
    work_experience JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"company": "ABC Corp", "role": "Intern", "duration": "June 2025 - Aug 2025", "description": "..."}]

    -- Extra Certifications (beyond what's in extended profile)
    certifications JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"name": "AWS Certified", "issuer": "Amazon", "year": "2025"}]

    -- Achievements & Awards
    achievements JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"title": "Best Project Award", "description": "...", "year": "2025"}]

    -- Extracurricular Activities
    extracurricular_activities JSONB DEFAULT '[]'::jsonb,

    -- Declaration text (customizable)
    declaration_text TEXT DEFAULT 'I hereby declare that the above-mentioned information is true to the best of my knowledge.',

    -- Custom sections (for any additional info students want to add)
    custom_sections JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"title": "Volunteer Work", "content": "..."}]

    -- Tracking
    has_custom_content BOOLEAN DEFAULT FALSE,
    last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_student_resumes_student_id ON student_resumes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_resumes_has_custom ON student_resumes(has_custom_content);

-- Trigger for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_student_resumes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.last_modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_student_resumes_timestamp ON student_resumes;
CREATE TRIGGER trigger_update_student_resumes_timestamp
    BEFORE UPDATE ON student_resumes
    FOR EACH ROW
    EXECUTE FUNCTION update_student_resumes_timestamp();

-- Auto-create resume record when student is created
CREATE OR REPLACE FUNCTION create_student_resume_record()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO student_resumes (student_id)
    VALUES (NEW.id)
    ON CONFLICT (student_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_student_resume ON students;
CREATE TRIGGER trigger_create_student_resume
    AFTER INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION create_student_resume_record();

-- Comment on table
COMMENT ON TABLE student_resumes IS 'Stores resume content for students. Officers and admins can download the student resume as PDF.';
