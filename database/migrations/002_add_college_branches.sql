-- Migration: Add branches column to colleges table
-- Date: 2025-12-10
-- Description: Add a JSONB column to store array of branches for each college

-- Add branches column to colleges table
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS branches JSONB DEFAULT '[]'::jsonb;

-- Add index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_colleges_branches ON colleges USING GIN (branches);

-- Update colleges with their respective branches based on the provided PDFs

-- THIRUVANANTHAPURAM DISTRICT
UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Textile Technology", "Computer Engineering"]'::jsonb
WHERE college_name = 'CPC Thiruvananthapuram' OR college_code = 'CPC001';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Instrumentation Engineering", "Commercial Practice", "Computer Engineering (Hearing Impaired)"]'::jsonb
WHERE college_name = 'WPC Kaimanom' OR college_code = 'WPC001';

UPDATE colleges SET branches = '["Electronics Engineering", "Instrumentation Engineering", "Electronics & Communication Engineering", "Computer Engineering", "Computer Application & Business Management"]'::jsonb
WHERE college_name = 'GPC Neyyattinkara' OR college_code = 'GPC001';

UPDATE colleges SET branches = '["Computer Engineering", "Electronics Engineering", "Computer Hardware Engineering"]'::jsonb
WHERE college_name = 'GPC Nedumangad' OR college_code = 'GPC002';

UPDATE colleges SET branches = '["Mechanical Engineering", "Automobile Engineering", "Computer Hardware Engineering", "Electrical & Electronics Engineering"]'::jsonb
WHERE college_name = 'GPC Attingal' OR college_code = 'GPC003';

-- KOLLAM DISTRICT
UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Electrical & Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%Punalur%';

UPDATE colleges SET branches = '["Mechanical Engineering", "Electronics & Communication Engineering", "Computer Hardware Engineering"]'::jsonb
WHERE college_name LIKE '%Ezhukone%';

UPDATE colleges SET branches = '["Civil Engineering", "Electronics Engineering", "Automobile Engineering", "Computer Engineering"]'::jsonb
WHERE college_name LIKE '%Vennikulam%';

-- PATHANAMTHITTA DISTRICT
UPDATE colleges SET branches = '["Mechanical Engineering", "Architecture", "Polymer Technology"]'::jsonb
WHERE college_name LIKE '%Adoor%';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Biomedical Engineering"]'::jsonb
WHERE college_name LIKE '%Vechoochira%';

-- ALAPPUZHA DISTRICT
UPDATE colleges SET branches = '["Computer Hardware Engineering", "Instrumentation Engineering", "Mechanical Engineering", "Electronics & Communication Engineering", "Computer Engineering"]'::jsonb
WHERE college_name LIKE '%Cherthala%';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Commercial Practice"]'::jsonb
WHERE college_name LIKE '%WPC%Kayamkulam%' OR college_name LIKE '%Women%Kayamkulam%';

-- KOTTAYAM DISTRICT
UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Polymer Technology", "Commercial Practice"]'::jsonb
WHERE college_name LIKE '%Nattakam%' OR college_name LIKE '%Kottayam%' AND college_name NOT LIKE '%Pala%' AND college_name NOT LIKE '%Kaduthuruthy%';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Instrumentation Engineering", "Electrical & Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%Pala%' AND college_name NOT LIKE '%Palakkad%';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Computer Hardware Engineering"]'::jsonb
WHERE college_name LIKE '%Kaduthuruthy%';

UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Computer Engineering"]'::jsonb
WHERE college_name LIKE '%Muttom%';

-- IDUKKI DISTRICT
UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Computer Application & Business Management"]'::jsonb
WHERE college_name LIKE '%Vandiperiyar%' OR college_name LIKE '%Kumily%';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Computer Hardware Engineering"]'::jsonb
WHERE college_name LIKE '%Nedumkandam%';

UPDATE colleges SET branches = '["Computer Engineering", "Mechanical Engineering", "Information Technology"]'::jsonb
WHERE college_name LIKE '%Purappuzha%' OR college_name LIKE '%Thodupuzha%';

UPDATE colleges SET branches = '["Biomedical Engineering", "Computer Engineering", "Cyber Forensics and Information Security", "Mechanical Engineering", "Electronics & Communication Engineering"]'::jsonb
WHERE college_name LIKE '%Painavu%';

-- ERNAKULAM DISTRICT
UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Automobile Engineering", "Chemical Engineering", "Computer Engineering", "Electronics & Communication Engineering", "Civil Engineering (Hearing Impaired)"]'::jsonb
WHERE college_name LIKE '%Kalamassery%';

UPDATE colleges SET branches = '["Architecture", "Electronics Engineering", "Computer Engineering", "Commercial Practice"]'::jsonb
WHERE college_name LIKE '%WPC%Ernakulam%' OR college_name LIKE '%Women%Ernakulam%';

UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electronics Engineering", "Computer Engineering"]'::jsonb
WHERE college_name LIKE '%Kothamangalam%';

UPDATE colleges SET branches = '["Mechanical Engineering", "Electronics & Communication Engineering", "Computer Engineering"]'::jsonb
WHERE college_name LIKE '%Perumbavoor%';

-- THRISSUR DISTRICT
UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Computer Engineering"]'::jsonb
WHERE college_name LIKE '%Maharajah%' OR college_name LIKE '%MTI%';

UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Computer Engineering"]'::jsonb
WHERE college_name LIKE '%Sree Rama%' OR college_name LIKE '%Thriprayar%';

UPDATE colleges SET branches = '["Instrumentation Engineering", "Textile Technology", "Polymer Technology"]'::jsonb
WHERE college_name LIKE '%Koratty%';

UPDATE colleges SET branches = '["Tool & Die Engineering", "Electronics & Communication Engineering", "Computer Engineering"]'::jsonb
WHERE college_name LIKE '%Kunnamkulam%';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Civil Engineering", "Commercial Practice"]'::jsonb
WHERE college_name LIKE '%WPC%Thrissur%' OR college_name LIKE '%Women%Thrissur%';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Computer Hardware Engineering", "Civil Engineering", "Mechanical Engineering"]'::jsonb
WHERE college_name LIKE '%Chelakkara%';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Hardware Engineering", "Bio-Medical Engineering", "Computer Engineering", "Robotic Process Automation", "Electrical and Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%Mala%' OR college_name LIKE '%Kallettumkara%';

-- PALAKKAD DISTRICT
UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electronics Engineering", "Computer Hardware Engineering", "Instrumentation Engineering", "Electrical & Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%GPC%Palakkad%' AND college_name NOT LIKE '%Shoranur%';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Printing Technology"]'::jsonb
WHERE college_name LIKE '%Shoranur%' OR college_name LIKE '%Printing%';

UPDATE colleges SET branches = '["Civil Engineering"]'::jsonb
WHERE college_name LIKE '%Kuzhalmanam%';

-- MALAPPURAM DISTRICT
UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%Perintalmanna%';

UPDATE colleges SET branches = '["Electronics Engineering", "Electronics & Communication Engineering", "Computer Engineering"]'::jsonb
WHERE college_name LIKE '%Thirurangadi%';

UPDATE colleges SET branches = '["Electronics Engineering", "Instrumentation Engineering", "Electronics & Communication Engineering", "Computer Application & Business Management"]'::jsonb
WHERE college_name LIKE '%WPC%Kottakkal%' OR college_name LIKE '%Women%Kottakkal%';

UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Instrumentation Engineering"]'::jsonb
WHERE college_name LIKE '%Karuvambrum%' OR college_name LIKE '%Manjeri%';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Hardware Engineering", "Computer Engineering", "Electrical & Electronics Engineering", "Computer Engineering (Hearing Impaired)"]'::jsonb
WHERE college_name LIKE '%Karunagappally%';

UPDATE colleges SET branches = '["Computer Engineering", "Computer Hardware Engineering", "Electrical & Electronics Engineering", "Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%Mattakkara%';

-- KOZHIKODE DISTRICT
UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Chemical Engineering", "Computer Engineering", "Tool & Die Engineering", "Computer Engineering (Hearing Impaired)"]'::jsonb
WHERE college_name LIKE '%Kerala Government%Kozhikode%' OR (college_name LIKE '%Kozhikode%' AND college_name NOT LIKE '%Women%');

UPDATE colleges SET branches = '["Electronics Engineering", "Commercial Practice"]'::jsonb
WHERE college_name LIKE '%WPC%Kozhikode%' OR college_name LIKE '%Women%Kozhikode%';

-- WAYANAD DISTRICT
UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%Meenangadi%';

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Computer Hardware Engineering"]'::jsonb
WHERE college_name LIKE '%Meppadi%';

UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Computer Engineering"]'::jsonb
WHERE college_name LIKE '%Nallornadu%' OR college_name LIKE '%Dwaraka%' OR college_name LIKE '%Mananthavady%';

-- KANNUR DISTRICT
UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Textile Technology", "Wood & Paper Technology"]'::jsonb
WHERE college_name LIKE '%GPC%Kannur%' AND college_name NOT LIKE '%Mattannur%' AND college_name NOT LIKE '%Naduvil%';

UPDATE colleges SET branches = '["Mechanical Engineering", "Electronics Engineering", "Civil Engineering", "Electrical & Electronics Engineering", "Instrumentation Engineering"]'::jsonb
WHERE college_name LIKE '%Mattannur%';

UPDATE colleges SET branches = '["Electronics & Communication Engineering", "Instrumentation Engineering", "Computer Engineering", "Computer Application & Business Management"]'::jsonb
WHERE college_name LIKE '%WPC%Payyannur%' OR college_name LIKE '%Women%Payyannur%';

UPDATE colleges SET branches = '["Automobile Engineering", "Civil Engineering", "Electrical & Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%Naduvil%';

UPDATE colleges SET branches = '["Computer Hardware Engineering", "Computer Engineering", "Electronics and Communication Engineering", "Electrical and Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%Kallyassery%' OR college_name LIKE '%E K Nayanar%';

-- KASARAGOD DISTRICT
UPDATE colleges SET branches = '["Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Computer Engineering", "Civil Engineering"]'::jsonb
WHERE college_name LIKE '%GPC%Kasaragod%' OR (college_name LIKE '%Kasaragod%' AND college_name NOT LIKE '%Thrikkaripur%');

UPDATE colleges SET branches = '["Electronics Engineering", "Computer Engineering", "Computer Application & Business Management", "Biomedical Engineering"]'::jsonb
WHERE college_name LIKE '%Thrikkaripur%' OR college_name LIKE '%EKNM%';

-- AIDED COLLEGES
UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electrical and Electronics Engineering", "Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%Sree Narayana%Kottiyam%';

UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Computer Engineering", "Electronics & Communication Engineering"]'::jsonb
WHERE college_name LIKE '%N.S.S.%Pandalam%' OR college_name LIKE '%NSS%Pandalam%';

UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electronics & Electronics Engineering", "Automobile Engineering", "Computer Engineering", "Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%Carmel%Alappuzha%';

UPDATE colleges SET branches = '["Mechanical Engineering", "Electronics & Communication Engineering"]'::jsonb
WHERE college_name LIKE '%Thiagarajar%';

UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Electronics & Communication Engineering", "Electronics Engineering", "Automobile Engineering", "Computer Engineering"]'::jsonb
WHERE college_name LIKE '%S.S.M.%Tirur%' OR college_name LIKE '%SSM%Tirur%';

UPDATE colleges SET branches = '["Civil Engineering", "Mechanical Engineering", "Automobile Engineering"]'::jsonb
WHERE college_name LIKE '%Swamy Nithyananda%Kanhangad%';

-- IHRD COLLEGES
UPDATE colleges SET branches = '["Computer Science and Engineering", "Computer Applications", "Electrical and Electronics Engineering", "Electronics and Communication Engineering", "Automobile Engineering"]'::jsonb
WHERE college_name LIKE '%Poonjar%';

UPDATE colleges SET branches = '["Computer Hardware Engineering", "Biomedical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering"]'::jsonb
WHERE college_name LIKE '%Vadakara%';

-- Add comment to document the migration
COMMENT ON COLUMN colleges.branches IS 'JSONB array of branch/department names offered by the college';
