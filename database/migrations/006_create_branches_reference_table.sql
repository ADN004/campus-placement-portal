-- Migration: Create Branches Reference Table
-- Date: 2025-12-27
-- Description: Creates a reference table for all branches with standardized short names

-- ============================================
-- CREATE BRANCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    branch_name VARCHAR(255) NOT NULL UNIQUE,
    short_name VARCHAR(10) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_short_name ON branches(short_name);
CREATE INDEX IF NOT EXISTS idx_branches_display_order ON branches(display_order);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_branches_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_branches_timestamp
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_branches_timestamp();

-- ============================================
-- INSERT ALL KERALA POLYTECHNIC BRANCHES WITH SHORT NAMES
-- ============================================
INSERT INTO branches (branch_name, short_name, display_order) VALUES
('Architecture', 'AR', 1),
('Automobile Engineering', 'AE', 2),
('Biomedical Engineering', 'BME', 3),
('Chemical Engineering', 'CHEM', 4),
('Civil Engineering', 'CE', 5),
('Civil Engineering (Hearing Impaired)', 'CE(HI)', 6),
('Commercial Practice', 'CP', 7),
('Computer Application and Business Management', 'CABM', 8),
('Computer Applications', 'CA', 9),
('Computer Engineering', 'COE', 10),
('Computer Engineering (Hearing Impaired)', 'COE(HI)', 11),
('Computer Hardware Engineering', 'CHE', 12),
('Computer Science and Engineering', 'CSE', 13),
('Cyber Forensics and Information Security', 'CFIS', 14),
('Electrical and Electronics Engineering', 'EEE', 15),
('Electronics and Communication Engineering', 'ECE', 16),
('Electronics Engineering', 'ELE', 17),
('Information Technology', 'IT', 18),
('Instrumentation Engineering', 'INE', 19),
('Mechanical Engineering', 'ME', 20),
('Polymer Technology', 'POLY', 21),
('Printing Technology', 'PRT', 22),
('Robotic Process Automation', 'RPA', 23),
('Textile Technology', 'TEX', 24),
('Tool and Die Engineering', 'TDE', 25),
('Wood and Paper Technology', 'WPT', 26)
ON CONFLICT (branch_name) DO UPDATE SET
    short_name = EXCLUDED.short_name,
    display_order = EXCLUDED.display_order;

-- Add comment for documentation
COMMENT ON TABLE branches IS 'Reference table for all engineering branches with standardized short names';
COMMENT ON COLUMN branches.branch_name IS 'Full name of the branch (must match exactly with data in colleges.branches and students.branch)';
COMMENT ON COLUMN branches.short_name IS 'Standardized short name for exports and posters (2-4 letters, excluding brackets)';
COMMENT ON COLUMN branches.is_active IS 'Whether this branch is currently active in the system';
COMMENT ON COLUMN branches.display_order IS 'Order in which branches should be displayed in dropdowns';
