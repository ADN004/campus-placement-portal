-- Migration: Add year column to prn_ranges table
-- This allows placement officers and super admins to categorize PRN ranges by year

-- Add year column to store the academic year (e.g., 2023, 2024, 2025)
ALTER TABLE prn_ranges
ADD COLUMN IF NOT EXISTS year VARCHAR(10);

-- Add index on year column for faster filtering
CREATE INDEX IF NOT EXISTS idx_prn_ranges_year ON prn_ranges(year);

-- Add comment to document the column
COMMENT ON COLUMN prn_ranges.year IS 'Academic year for the PRN range (e.g., 2023, 2024)';
