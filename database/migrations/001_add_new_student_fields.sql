-- Migration: Add new student fields for enhanced registration
-- Date: 2025-12-09
-- Description: Adds age, gender, height, weight, semester CGPAs, address, licenses, photo URL, email verification, and update tracking fields

-- ============================================
-- ADD NEW COLUMNS TO STUDENTS TABLE
-- ============================================

-- Personal Information
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS height INTEGER CHECK (height >= 140 AND height <= 220); -- in cm
ALTER TABLE students ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2) CHECK (weight >= 30 AND weight <= 150); -- in kg
ALTER TABLE students ADD COLUMN IF NOT EXISTS complete_address TEXT;

-- Academic Information (Semester-wise CGPA)
ALTER TABLE students ADD COLUMN IF NOT EXISTS cgpa_sem1 DECIMAL(3,2) CHECK (cgpa_sem1 >= 0 AND cgpa_sem1 <= 10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS cgpa_sem2 DECIMAL(3,2) CHECK (cgpa_sem2 >= 0 AND cgpa_sem2 <= 10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS cgpa_sem3 DECIMAL(3,2) CHECK (cgpa_sem3 >= 0 AND cgpa_sem3 <= 10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS cgpa_sem4 DECIMAL(3,2) CHECK (cgpa_sem4 >= 0 AND cgpa_sem4 <= 10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS cgpa_sem5 DECIMAL(3,2) DEFAULT 0 CHECK (cgpa_sem5 >= 0 AND cgpa_sem5 <= 10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS cgpa_sem6 DECIMAL(3,2) DEFAULT 0 CHECK (cgpa_sem6 >= 0 AND cgpa_sem6 <= 10);

-- Rename existing cgpa column to programme_cgpa for clarity
ALTER TABLE students RENAME COLUMN cgpa TO programme_cgpa;

-- Branch information
ALTER TABLE students ADD COLUMN IF NOT EXISTS branch VARCHAR(100);

-- Documents
ALTER TABLE students ADD COLUMN IF NOT EXISTS has_driving_license BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS has_pan_card BOOLEAN DEFAULT FALSE;

-- Photo Storage (Cloudinary URL)
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_cloudinary_id VARCHAR(255); -- For deletion purposes

-- Email Verification
ALTER TABLE students ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- Semester CGPA Update Tracking (one-time update only)
ALTER TABLE students ADD COLUMN IF NOT EXISTS sem5_cgpa_updated BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sem6_cgpa_updated BOOLEAN DEFAULT FALSE;

-- ============================================
-- CREATE INDEXES FOR NEW COLUMNS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_students_gender ON students(gender);
CREATE INDEX IF NOT EXISTS idx_students_height ON students(height);
CREATE INDEX IF NOT EXISTS idx_students_weight ON students(weight);
CREATE INDEX IF NOT EXISTS idx_students_email_verified ON students(email_verified);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN students.student_name IS 'Full name of the student - cannot be updated after registration';
COMMENT ON COLUMN students.age IS 'Age calculated from date of birth - cannot be updated';
COMMENT ON COLUMN students.gender IS 'Gender - cannot be updated after registration';
COMMENT ON COLUMN students.height IS 'Height in centimeters (140-220)';
COMMENT ON COLUMN students.weight IS 'Weight in kilograms (30-150)';
COMMENT ON COLUMN students.complete_address IS 'Complete postal address of the student';
COMMENT ON COLUMN students.cgpa_sem1 IS 'CGPA of Semester 1 - cannot be updated after registration';
COMMENT ON COLUMN students.cgpa_sem2 IS 'CGPA of Semester 2 - cannot be updated after registration';
COMMENT ON COLUMN students.cgpa_sem3 IS 'CGPA of Semester 3 - cannot be updated after registration';
COMMENT ON COLUMN students.cgpa_sem4 IS 'CGPA of Semester 4 - cannot be updated after registration';
COMMENT ON COLUMN students.cgpa_sem5 IS 'CGPA of Semester 5 - can be updated once';
COMMENT ON COLUMN students.cgpa_sem6 IS 'CGPA of Semester 6 - can be updated once';
COMMENT ON COLUMN students.programme_cgpa IS 'Programme CGPA up to 4th Sem - cannot be updated after registration';
COMMENT ON COLUMN students.branch IS 'Branch/Department - cannot be updated after registration';
COMMENT ON COLUMN students.has_driving_license IS 'Whether student has a valid driving license';
COMMENT ON COLUMN students.has_pan_card IS 'Whether student has a PAN card';
COMMENT ON COLUMN students.photo_url IS 'Cloudinary URL of student photograph';
COMMENT ON COLUMN students.photo_cloudinary_id IS 'Cloudinary public ID for photo deletion';
COMMENT ON COLUMN students.email_verified IS 'Whether email has been verified';
COMMENT ON COLUMN students.email_verification_token IS 'Token for email verification';
COMMENT ON COLUMN students.email_verified_at IS 'Timestamp of email verification';
COMMENT ON COLUMN students.sem5_cgpa_updated IS 'Tracks if Semester 5 CGPA has been updated (one-time only)';
COMMENT ON COLUMN students.sem6_cgpa_updated IS 'Tracks if Semester 6 CGPA has been updated (one-time only)';
