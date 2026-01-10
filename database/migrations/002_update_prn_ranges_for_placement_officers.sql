-- Migration: Update PRN ranges to support placement officer management
-- Date: 2025-12-09
-- Description: Adds creator_role and college_id fields to track who created the PRN range

-- ============================================
-- ADD NEW COLUMNS TO PRN_RANGES TABLE
-- ============================================

-- Track creator role (super_admin or placement_officer)
ALTER TABLE prn_ranges ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50)
    CHECK (created_by_role IN ('super_admin', 'placement_officer'));

-- Track college_id for placement officer ranges (NULL for super admin ranges)
ALTER TABLE prn_ranges ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE;

-- ============================================
-- UPDATE EXISTING RECORDS
-- ============================================

-- Set all existing PRN ranges to super_admin (as they were created before this feature)
UPDATE prn_ranges
SET created_by_role = 'super_admin'
WHERE created_by_role IS NULL;

-- Make created_by_role NOT NULL after setting existing values
ALTER TABLE prn_ranges ALTER COLUMN created_by_role SET NOT NULL;

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_prn_ranges_creator_role ON prn_ranges(created_by_role);
CREATE INDEX IF NOT EXISTS idx_prn_ranges_college ON prn_ranges(college_id);

-- ============================================
-- ADD CHECK CONSTRAINT
-- ============================================

-- If created by placement_officer, college_id must be set
-- If created by super_admin, college_id must be NULL
ALTER TABLE prn_ranges ADD CONSTRAINT check_prn_range_creator_college
    CHECK (
        (created_by_role = 'super_admin' AND college_id IS NULL) OR
        (created_by_role = 'placement_officer' AND college_id IS NOT NULL)
    );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN prn_ranges.created_by_role IS 'Role of the user who created this PRN range (super_admin or placement_officer)';
COMMENT ON COLUMN prn_ranges.college_id IS 'College ID for placement officer created ranges (NULL for super admin ranges)';
