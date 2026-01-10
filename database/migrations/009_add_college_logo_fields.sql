-- Migration: Add College Logo Fields
-- Description: Adds logo storage fields to colleges table for placement poster branding
-- Date: 2026-01-02
-- Related Feature: Placement Poster PDF Generation

-- ============================================
-- ADD LOGO FIELDS TO COLLEGES TABLE
-- ============================================

-- Add logo URL field (Cloudinary)
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add Cloudinary public ID for deletion management
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS logo_cloudinary_id VARCHAR(255);

-- Track when logo was uploaded
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS logo_uploaded_at TIMESTAMP;

-- ============================================
-- CREATE INDEX FOR PERFORMANCE
-- ============================================

-- Index for colleges with logos (for filtering/reporting)
CREATE INDEX IF NOT EXISTS idx_colleges_has_logo ON colleges(logo_url) WHERE logo_url IS NOT NULL;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN colleges.logo_url IS 'Cloudinary URL of college logo (used in placement posters and official documents)';
COMMENT ON COLUMN colleges.logo_cloudinary_id IS 'Cloudinary public ID for logo deletion (colleges_logos folder)';
COMMENT ON COLUMN colleges.logo_uploaded_at IS 'Timestamp when logo was last uploaded/updated';

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify columns were added successfully
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'colleges' AND column_name = 'logo_url'
    ) THEN
        RAISE NOTICE '✅ Migration 009: College logo fields added successfully';
    ELSE
        RAISE EXCEPTION '❌ Migration 009 failed: logo_url column not found';
    END IF;
END $$;
