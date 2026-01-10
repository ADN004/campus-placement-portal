-- Migration: Add height and weight criteria to jobs
-- Date: 2025-12-09
-- Description: Adds min_height, max_height, min_weight, max_weight columns to jobs table

-- Add height criteria columns (in cm)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_height INTEGER CHECK (min_height >= 140 AND min_height <= 220);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS max_height INTEGER CHECK (max_height >= 140 AND max_height <= 220);

-- Add weight criteria columns (in kg)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_weight DECIMAL(5,2) CHECK (min_weight >= 30 AND min_weight <= 150);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS max_weight DECIMAL(5,2) CHECK (max_weight >= 30 AND max_weight <= 150);

-- Add check constraints to ensure min <= max
ALTER TABLE jobs ADD CONSTRAINT check_height_range
  CHECK (min_height IS NULL OR max_height IS NULL OR min_height <= max_height);

ALTER TABLE jobs ADD CONSTRAINT check_weight_range
  CHECK (min_weight IS NULL OR max_weight IS NULL OR min_weight <= max_weight);
