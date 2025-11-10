-- Add name and branch columns to students table

-- Check if columns exist and add them if they don't
DO $$
BEGIN
    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'students' AND column_name = 'name'
    ) THEN
        ALTER TABLE students ADD COLUMN name VARCHAR(255);
        RAISE NOTICE 'Added name column to students table';
    END IF;

    -- Add branch column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'students' AND column_name = 'branch'
    ) THEN
        ALTER TABLE students ADD COLUMN branch VARCHAR(255);
        RAISE NOTICE 'Added branch column to students table';
    END IF;
END $$;

-- Update existing students with placeholder values if needed
UPDATE students SET name = 'Update Required' WHERE name IS NULL;
UPDATE students SET branch = 'Not Specified' WHERE branch IS NULL;

-- Add NOT NULL constraints after updating existing records
ALTER TABLE students ALTER COLUMN name SET NOT NULL;
ALTER TABLE students ALTER COLUMN branch SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
