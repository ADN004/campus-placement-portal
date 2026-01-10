-- State Placement Cell - Seed Data
-- This file populates initial data: Regions, Colleges, Placement Officers, and Super Admin

-- ============================================
-- 1. INSERT REGIONS (5 regions)
-- ============================================
INSERT INTO regions (region_name, region_code) VALUES
('SOUTH REGION', 'SOUTH'),
('SOUTH-CENTRAL REGION', 'SOUTH_CENTRAL'),
('CENTRAL REGION', 'CENTRAL'),
('NORTH-CENTRAL REGION', 'NORTH_CENTRAL'),
('NORTH REGION', 'NORTH');

-- ============================================
-- 2. INSERT COLLEGES (60 colleges) WITH BRANCHES
-- ============================================
-- Note: Branches are stored as JSONB arrays for easy querying and updating
-- All branches are pre-configured based on official college documentation

-- SOUTH REGION (14 colleges) - region_id = 1
INSERT INTO colleges (college_name, college_code, region_id, branches) VALUES
('WPC Kaimanom', 'WPC_KAI', 1, '["Electronics Engineering", "Computer Engineering", "Instrumentation Engineering", "Commercial Practice", "Computer Engineering (Hearing Impaired)"]'::jsonb),
('CPC Thiruvananthapuram', 'CPC_TVM', 1, '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Textile Technology", "Computer Engineering"]'::jsonb),
('GPC Neyyattinkara', 'GPC_NTA', 1, '["Electronics Engineering", "Instrumentation Engineering", "Electronics & Communication Engineering", "Computer Engineering", "Computer Application & Business Management"]'::jsonb),
('GPC Nedumangad', 'GPC_NDM', 1, '["Computer Engineering", "Electronics Engineering", "Computer Hardware Engineering"]'::jsonb),
('GPC Attingal', 'GPC_ATL', 1, '["Mechanical Engineering", "Automobile Engineering", "Computer Hardware Engineering", "Electrical & Electronics Engineering"]'::jsonb),
('GPC Punalur', 'GPC_PNR', 1, '["Electronics Engineering", "Computer Engineering", "Electrical & Electronics Engineering"]'::jsonb),
('GPC Ezhukone', 'GPC_EZH', 1, '["Mechanical Engineering", "Electronics & Communication Engineering", "Computer Hardware Engineering"]'::jsonb),
('SNPC KOTTIYAM', 'SNPC_KTM', 1, '["Civil Engineering", "Mechanical Engineering", "Electrical and Electronics Engineering", "Electronics Engineering"]'::jsonb),
('GPC Vennikulam', 'GPC_VNK', 1, '["Civil Engineering", "Electronics Engineering", "Automobile Engineering", "Computer Engineering"]'::jsonb),
('GPC Adoor', 'GPC_ADR', 1, '["Mechanical Engineering", "Architecture", "Polymer Technology"]'::jsonb),
('GPC Vechoochira', 'GPC_VCH', 1, '["Electronics Engineering", "Computer Engineering", "Biomedical Engineering"]'::jsonb),
('WPC Kayamkulam', 'WPC_KYM', 1, '["Electronics Engineering", "Computer Engineering", "Commercial Practice"]'::jsonb),
('NSS Pandalam', 'NSS_PDM', 1, '["Civil Engineering", "Mechanical Engineering", "Computer Engineering", "Electronics & Communication Engineering"]'::jsonb),
('MPC (IHRD) karunagappally', 'MPC_KRG', 1, '["Electronics Engineering", "Computer Hardware Engineering", "Computer Engineering", "Electrical & Electronics Engineering", "Computer Engineering (Hearing Impaired)"]'::jsonb);

-- SOUTH-CENTRAL REGION (16 colleges) - region_id = 2
INSERT INTO colleges (college_name, college_code, region_id, branches) VALUES
('GPC Kalamassery', 'GPC_KLM', 2, '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Automobile Engineering", "Chemical Engineering", "Computer Engineering", "Electronics & Communication Engineering", "Civil Engineering (Hearing Impaired)"]'::jsonb),
('GPC Cherthala', 'GPC_CHL', 2, '["Computer Hardware Engineering", "Instrumentation Engineering", "Mechanical Engineering", "Electronics & Communication Engineering", "Computer Engineering"]'::jsonb),
('GPC Kottayam', 'GPC_KTM', 2, '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Polymer Technology", "Commercial Practice"]'::jsonb),
('GPC Pala', 'GPC_PLA', 2, '["Electronics Engineering", "Computer Engineering", "Instrumentation Engineering", "Electrical & Electronics Engineering"]'::jsonb),
('GPC Kaduthuruthy', 'GPC_KDT', 2, '["Electronics Engineering", "Computer Engineering", "Computer Hardware Engineering"]'::jsonb),
('GPC Muttom', 'GPC_MTM', 2, '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Computer Engineering"]'::jsonb),
('GPC Vandiperiyar', 'GPC_VDP', 2, '["Electronics Engineering", "Computer Engineering", "Computer Application & Business Management"]'::jsonb),
('GPC Nedumkandam', 'GPC_NDK', 2, '["Electronics Engineering", "Computer Engineering", "Computer Hardware Engineering"]'::jsonb),
('GPC Purapuzha', 'GPC_PRP', 2, '["Computer Engineering", "Mechanical Engineering", "Information Technology"]'::jsonb),
('WPC Ernakulam', 'WPC_EKM', 2, '["Architecture", "Electronics Engineering", "Computer Engineering", "Commercial Practice"]'::jsonb),
('GPC Kothamangalam', 'GPC_KTG', 2, '["Civil Engineering", "Mechanical Engineering", "Electronics Engineering", "Computer Engineering"]'::jsonb),
('GPC Perumbavoor', 'GPC_PBV', 2, '["Mechanical Engineering", "Electronics & Communication Engineering", "Computer Engineering"]'::jsonb),
('Carmel Poly Alapuzha', 'CRM_APZ', 2, '["Civil Engineering", "Mechanical Engineering", "Electronics & Electronics Engineering", "Automobile Engineering", "Computer Engineering", "Electronics Engineering"]'::jsonb),
('MPC (IHRD) Painavu, Idukki', 'MPC_PIN', 2, '["Biomedical Engineering", "Computer Engineering", "Cyber Forensics and Information Security", "Mechanical Engineering", "Electronics & Communication Engineering"]'::jsonb),
('MPC (IHRD) Mattakkara', 'MPC_MTK', 2, '["Computer Engineering", "Computer Hardware Engineering", "Electrical & Electronics Engineering", "Electronics Engineering"]'::jsonb),
('CE (IHRD) Poojar, Kottayam', 'CE_PJR', 2, '["Computer Science and Engineering", "Computer Applications", "Electrical and Electronics Engineering", "Electronics and Communication Engineering", "Automobile Engineering"]'::jsonb);

-- CENTRAL REGION (12 colleges) - region_id = 3
INSERT INTO colleges (college_name, college_code, region_id, branches) VALUES
('GPC Palakkad', 'GPC_PKD', 3, '["Civil Engineering", "Mechanical Engineering", "Electronics Engineering", "Computer Hardware Engineering", "Instrumentation Engineering", "Electrical & Electronics Engineering"]'::jsonb),
('MTI Thrissur', 'MTI_TSR', 3, '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Computer Engineering"]'::jsonb),
('SRGPC Thriprayar', 'SRGPC_TPR', 3, '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Computer Engineering"]'::jsonb),
('GPC Koratty', 'GPC_KRT', 3, '["Instrumentation Engineering", "Textile Technology", "Polymer Technology"]'::jsonb),
('GPC Kunnamkulam', 'GPC_KNK', 3, '["Tool & Die Engineering", "Electronics & Communication Engineering", "Computer Engineering"]'::jsonb),
('WPC Thrissur', 'WPC_TSR', 3, '["Electronics Engineering", "Computer Engineering", "Civil Engineering", "Commercial Practice"]'::jsonb),
('GPC Chelakkara', 'GPC_CHK', 3, '["Electronics Engineering", "Computer Engineering", "Computer Hardware Engineering", "Civil Engineering", "Mechanical Engineering"]'::jsonb),
('IPT&GPC Shoranur', 'IPT_SRN', 3, '["Electronics Engineering", "Computer Engineering", "Printing Technology"]'::jsonb),
('GPC Perinthalmanna', 'GPC_PTM', 3, '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering"]'::jsonb),
('TPC Alagappanagar', 'TPC_ALP', 3, '["Mechanical Engineering", "Electronics & Communication Engineering"]'::jsonb),
('KMMPC Mala', 'KMMPC_MLA', 3, '["Electronics Engineering", "Computer Hardware Engineering", "Bio-Medical Engineering", "Computer Engineering", "Robotic Process Automation", "Electrical and Electronics Engineering"]'::jsonb),
('MPC (IHRD) Kuzhalmannam', 'MPC_KZM', 3, '["Civil Engineering"]'::jsonb);

-- NORTH-CENTRAL REGION (9 colleges) - region_id = 4
INSERT INTO colleges (college_name, college_code, region_id, branches) VALUES
('KGPT Kozhikkode', 'KGPT_KKD', 4, '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Chemical Engineering", "Computer Engineering", "Tool & Die Engineering", "Computer Engineering (Hearing Impaired)"]'::jsonb),
('WPC Kozhikode', 'WPC_KKD', 4, '["Electronics Engineering", "Commercial Practice"]'::jsonb),
('GPC Thirurangadi', 'GPC_TRG', 4, '["Electronics Engineering", "Electronics & Communication Engineering", "Computer Engineering"]'::jsonb),
('GPC Mananthavady', 'GPC_MNV', 4, '["Civil Engineering", "Mechanical Engineering", "Computer Engineering"]'::jsonb),
('GPC Meenangadi', 'GPC_MNG', 4, '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering"]'::jsonb),
('GPC Meppadi', 'GPC_MPD', 4, '["Electronics Engineering", "Computer Engineering", "Computer Hardware Engineering"]'::jsonb),
('WPC Kottakkal', 'WPC_KTK', 4, '["Electronics Engineering", "Instrumentation Engineering", "Electronics & Communication Engineering", "Computer Application & Business Management"]'::jsonb),
('GPC Manjeri', 'GPC_MJR', 4, '["Civil Engineering", "Mechanical Engineering", "Instrumentation Engineering"]'::jsonb),
('SSM Tirur', 'SSM_TRR', 4, '["Civil Engineering", "Mechanical Engineering", "Electronics & Communication Engineering", "Electronics Engineering", "Automobile Engineering", "Computer Engineering"]'::jsonb);

-- NORTH REGION (9 colleges) - region_id = 5
INSERT INTO colleges (college_name, college_code, region_id, branches) VALUES
('GPC Kasargod', 'GPC_KSD', 5, '["Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Computer Engineering", "Civil Engineering"]'::jsonb),
('RWPC Payyannur', 'RWPC_PYN', 5, '["Electronics & Communication Engineering", "Instrumentation Engineering", "Computer Engineering", "Computer Application & Business Management"]'::jsonb),
('GPC Kannur', 'GPC_KNR', 5, '["Civil Engineering", "Mechanical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering", "Textile Technology", "Wood & Paper Technology"]'::jsonb),
('GPC Mattannur', 'GPC_MTR', 5, '["Mechanical Engineering", "Electronics Engineering", "Civil Engineering", "Electrical & Electronics Engineering", "Instrumentation Engineering"]'::jsonb),
('EKNMGPC Thrikkaripur', 'EKNMGPC_TKR', 5, '["Electronics Engineering", "Computer Engineering", "Computer Application & Business Management", "Biomedical Engineering"]'::jsonb),
('GPC Naduvil', 'GPC_NDV', 5, '["Automobile Engineering", "Civil Engineering", "Electrical & Electronics Engineering"]'::jsonb),
('SNPC Kanhangad', 'SNPC_KNH', 5, '["Civil Engineering", "Mechanical Engineering", "Automobile Engineering"]'::jsonb),
('MPC (IHRD) Vadakara', 'MPC_VDK', 5, '["Computer Hardware Engineering", "Biomedical Engineering", "Electrical & Electronics Engineering", "Electronics Engineering"]'::jsonb),
('EKNMMPC Kalyasseri', 'EKNMMPC_KLS', 5, '["Computer Hardware Engineering", "Computer Engineering", "Electronics and Communication Engineering", "Electrical and Electronics Engineering"]'::jsonb);

-- ============================================
-- 3. CREATE SUPER ADMIN USER
-- ============================================
-- Password: y9eshszbrr (hashed with bcrypt)
-- Note: The actual hash will be generated by the application
INSERT INTO users (email, password_hash, role, is_active) VALUES
('adityanche@gmail.com', '$2b$10$placeholder_hash_will_be_generated', 'super_admin', TRUE);

-- ============================================
-- 4. INSERT PLACEMENT OFFICERS (60 officers)
-- ============================================
-- First, create user accounts for all placement officers
-- Default password for all: "123" (will be hashed)

-- Helper: Get college_id by name for placement officer insertion

-- Officer 1: Carmel Poly Alapuzha
INSERT INTO users (email, password_hash, role) VALUES ('9497219788', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9497219788'),
    (SELECT id FROM colleges WHERE college_name = 'Carmel Poly Alapuzha'),
    'Sreeji Sreenivas', '9497219788', 'Lr in ME', 'placement@carmelpoly.in', 'carmelpolytechnic@gmail.com'
);

-- Officer 2: CPC Thiruvananthapuram
INSERT INTO users (email, password_hash, role) VALUES ('9744328621', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9744328621'),
    (SELECT id FROM colleges WHERE college_name = 'CPC Thiruvananthapuram'),
    'Praveen P', '9744328621', 'Lr in ME', 'placementcptc@cpt.ac.in', 'principal.cptc@gmail.com'
);

-- Officer 3: EKNMGPC Thrikkaripur
INSERT INTO users (email, password_hash, role) VALUES ('9746358965', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9746358965'),
    (SELECT id FROM colleges WHERE college_name = 'EKNMGPC Thrikkaripur'),
    'Sreejesh K V', '9746358965', 'Lr in EL', 'kvsreejeshkv@gmail.com', 'gptctkr@gmail.com'
);

-- Officer 4: GPC Adoor
INSERT INTO users (email, password_hash, role) VALUES ('9495434664', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9495434664'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Adoor'),
    'ARUN GOPINATH', '9495434664', 'Lr in ME', 'arungopinath38@gmail.com', 'gptcadr@gmail.com'
);

-- Officer 5: GPC Attingal
INSERT INTO users (email, password_hash, role) VALUES ('9946454242', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9946454242'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Attingal'),
    'Vinod M S', '9946454242', 'Lr in ME', 'vinodmsmech@gmail.com', 'gptcatl@gmail.com'
);

-- Officer 6: GPC Chelakkara
INSERT INTO users (email, password_hash, role) VALUES ('9496350122', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9496350122'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Chelakkara'),
    'SREEDEV M S', '9496350122', 'Lr in CE', 'placement@gpcchelakkara.ac.in', 'gptcchelakkara@gmail.com'
);

-- Officer 7: GPC Cherthala
INSERT INTO users (email, password_hash, role) VALUES ('9496468536', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9496468536'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Cherthala'),
    'Dr. Manoop M', '9496468536', 'Lr in ME', 'placementcellgptccherthala@gmail.com', 'gpccherthala@gmail.com'
);

-- Officer 8: GPC Ezhukone
INSERT INTO users (email, password_hash, role) VALUES ('9809998995', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9809998995'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Ezhukone'),
    'Anzil N S', '9809998995', 'Lr in ME', 'placement.gptcezhukone@gmail.com', 'gptcezhukone@gmail.com'
);

-- Officer 9: GPC Kaduthuruthy
INSERT INTO users (email, password_hash, role) VALUES ('8891465696', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '8891465696'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Kaduthuruthy'),
    'Felix P Benedict', '8891465696', 'Lr in EL', 'felixpb1992@gmail.com', 'gpckdy@yahoo.com'
);

-- Officer 10: GPC Kalamassery
INSERT INTO users (email, password_hash, role) VALUES ('9539094940', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9539094940'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Kalamassery'),
    'Prashanth K Nair', '9539094940', 'Lr in Chemical', 'placementgpk@gmail.com', 'gptckalamassery1951@gmail.com'
);

-- Officer 11: GPC Kannur
INSERT INTO users (email, password_hash, role) VALUES ('8019980166', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '8019980166'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Kannur'),
    'PADIAL SIVA KRISHNA', '8019980166', 'Lr in Textile', 'tpo@gptckannur.ac.in', 'kannurgptc@gmail.com'
);

-- Officer 12: GPC Kasargod
INSERT INTO users (email, password_hash, role) VALUES ('7010204974', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '7010204974'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Kasargod'),
    'SUNIL KUMAR S', '7010204974', 'Lr in EEE', 'sunilksgpcksd@gmail.com', 'placementgpckasaragod@gmail.com'
);

-- Officer 13: GPC Koratty
INSERT INTO users (email, password_hash, role) VALUES ('8547522976', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '8547522976'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Koratty'),
    'Raina ram. M', '8547522976', 'Lr in polymer', 'raina.ram.m@gmail.com', 'prlgpckty@ymail.com'
);

-- Officer 14: GPC Kothamangalam
INSERT INTO users (email, password_hash, role) VALUES ('9495762698', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9495762698'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Kothamangalam'),
    'Ajeesh MV', '9495762698', 'Lr in ME', 'ajeeshmv@gmail.com', 'polytechnickothamangalam@gmail.com'
);

-- Officer 15: GPC Kottayam
INSERT INTO users (email, password_hash, role) VALUES ('8075457530', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '8075457530'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Kottayam'),
    'LORDSON DEVASIA', '8075457530', 'Lr in EEE', 'lordsondevasia.gptc@gmail.com', 'kottayampolyemail@yahoo.in'
);

-- Officer 16: GPC Kunnamkulam
INSERT INTO users (email, password_hash, role) VALUES ('9495636705', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9495636705'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Kunnamkulam'),
    'Sijo Varghese C', '9495636705', 'Prof, English', 'sijovarghese079@gmail.com', 'polykkm@yahoo.co.in'
);

-- Officer 17: GPC Mananthavady
INSERT INTO users (email, password_hash, role) VALUES ('9847728067', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9847728067'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Mananthavady'),
    'Shafeeque T P', '9847728067', 'Lr in ME', 'shafmangad@gmail.com', 'gptcmndy76@gmail.com'
);

-- Officer 18: GPC Manjeri
INSERT INTO users (email, password_hash, role) VALUES ('9400531962', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9400531962'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Manjeri'),
    'Jaseer K T', '9400531962', 'Lr in CE', 'cgpcmanjeri@gmail.com', 'gptcmanjeri@gmail.com'
);

-- Officer 19: GPC Mattannur
INSERT INTO users (email, password_hash, role) VALUES ('9947866774', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9947866774'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Mattannur'),
    'Roshan PP', '9947866774', 'Lr in IE', 'roshankannookkara@gmail.com', 'gptcmattanur@gmail.com'
);

-- Officer 20: GPC Meenangadi
INSERT INTO users (email, password_hash, role) VALUES ('9947954348', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9947954348'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Meenangadi'),
    'Emmanuel Tom', '9947954348', 'Lr in EL', 'placementgptcmgdi@gmail.com', 'gptc24wayanad@gmail.com'
);

-- Officer 21: GPC Meppadi
INSERT INTO users (email, password_hash, role) VALUES ('9745887743', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9745887743'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Meppadi'),
    'Sangeetha Mary', '9745887743', 'Lr in CM', 'sangeethamary88@gmail.com', 'gptcmepadi@rediffmail.com'
);

-- Officer 22: GPC Muttom
INSERT INTO users (email, password_hash, role) VALUES ('8113835712', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '8113835712'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Muttom'),
    'Athira Sasidharan', '8113835712', 'Lecturer', 'placement@gpcmuttom.ac.in', 'gptcmuttom@yahoo.co.in'
);

-- Officer 23: GPC Naduvil
INSERT INTO users (email, password_hash, role) VALUES ('6282572757', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '6282572757'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Naduvil'),
    'Shithin P V', '6282572757', 'Lr in EEE', 'shithingpcn@gmail.com', 'gptcnaduvil@gmail.com'
);

-- Officer 24: GPC Nedumangad
INSERT INTO users (email, password_hash, role) VALUES ('9496546606', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9496546606'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Nedumangad'),
    'RENJITHA P', '9496546606', 'Lr in CM', 'renjithapharikumar@gmail.com', 'gptcnedumangad@gmail.com'
);

-- Officer 25: GPC Nedumkandam
INSERT INTO users (email, password_hash, role) VALUES ('8301057696', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '8301057696'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Nedumkandam'),
    'Arya Raj S', '8301057696', 'Lr in CM', 'aryarajsgptc@gmail.com', 'gptcnedumkandam@yahoo.co.in'
);

-- Officer 26: GPC Neyyattinkara
INSERT INTO users (email, password_hash, role) VALUES ('8289919319', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '8289919319'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Neyyattinkara'),
    'SAJINA K', '8289919319', 'Lr in CM', 'sajinavijesh22@gmail.com', 'gptcnta@gmail.com'
);

-- Officer 27: GPC Pala
INSERT INTO users (email, password_hash, role) VALUES ('9495750490', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9495750490'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Pala'),
    'GEO P G', '9495750490', 'Lr in EL', 'placement.gptcp@gmail.com', 'info@gptcpala.org'
);

-- Officer 28: GPC Palakkad
INSERT INTO users (email, password_hash, role) VALUES ('9895868338', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9895868338'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Palakkad'),
    'Venugopalan. K', '9895868338', 'Lr in EL', 'placement@gptcpalakkad.ac.in', 'info@gptcpalakkad.ac.in'
);

-- Officer 29: GPC Perinthalmanna
INSERT INTO users (email, password_hash, role) VALUES ('8714121009', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '8714121009'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Perinthalmanna'),
    'Nidhin Roy V', '8714121009', 'Lr in ME', 'cgpcpmna@gmail.com', 'polypmna@gptcperinthalmanna.in'
);

-- Officer 30: GPC Perumbavoor
INSERT INTO users (email, password_hash, role) VALUES ('9946328240', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9946328240'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Perumbavoor'),
    'ELDOSE MATHEW', '9946328240', 'Lr in ME', 'eldosemace@gmail.com', 'eldosemace@gmail.com'
);

-- Officer 31: GPC Punalur
INSERT INTO users (email, password_hash, role) VALUES ('9846571634', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9846571634'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Punalur'),
    'Bini B', '9846571634', 'Lr in EL', 'binipoulose@gmail.com', 'placementcellgptcpunalur@gmail.com'
);

-- Officer 32: GPC Purapuzha
INSERT INTO users (email, password_hash, role) VALUES ('9895864787', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9895864787'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Purapuzha'),
    'Shiju K', '9895864787', 'Lr in IT', 'placement@gpcpurapuzha.ac.in', 'info@gpcpurapuzha.ac.in'
);

-- Officer 33: GPC Thirurangadi
INSERT INTO users (email, password_hash, role) VALUES ('9400080193', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9400080193'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Thirurangadi'),
    'Shafeena PK', '9400080193', 'Lr in EL', 'shafeenapk@gmail.com', 'gptctgdi@gmail.com'
);

-- Officer 34: GPC Vandiperiyar
INSERT INTO users (email, password_hash, role) VALUES ('9497331227', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9497331227'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Vandiperiyar'),
    'Heaba Fatima Ibrahim', '9497331227', 'Lr in CABM', 'hebas.ibm@gmail.com', 'gptckumily@rediffmail.com'
);

-- Officer 35: GPC Vechoochira
INSERT INTO users (email, password_hash, role) VALUES ('9496096832', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9496096832'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Vechoochira'),
    'Anju Mohan', '9496096832', 'Lr in CM', 'placementcell.gptcv@gmail.com', 'gptcvchr@gmail.com'
);

-- Officer 36: GPC Vennikulam
INSERT INTO users (email, password_hash, role) VALUES ('9497272544', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9497272544'),
    (SELECT id FROM colleges WHERE college_name = 'GPC Vennikulam'),
    'Arun P S', '9497272544', 'Lr in EL', 'arunps.lecturer@gmail.com', 'gpcvennikulam@gmail.com'
);

-- Officer 37: IPT&GPC Shoranur
INSERT INTO users (email, password_hash, role) VALUES ('9605251688', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9605251688'),
    (SELECT id FROM colleges WHERE college_name = 'IPT&GPC Shoranur'),
    'Girish C', '9605251688', 'Lr in EEE', 'girishc@iptgptc.ac.in', 'placement@iptgptc.ac.in'
);

-- Officer 38: KGPT Kozhikkode
INSERT INTO users (email, password_hash, role) VALUES ('9567333259', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9567333259'),
    (SELECT id FROM colleges WHERE college_name = 'KGPT Kozhikkode'),
    'VARADAN S S', '9567333259', 'Lr in Tool and Die', 'kgptcplacement@gmail.com', 'kgptc1946@gmail.com'
);

-- Officer 39: MTI Thrissur
INSERT INTO users (email, password_hash, role) VALUES ('9496346097', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9496346097'),
    (SELECT id FROM colleges WHERE college_name = 'MTI Thrissur'),
    'Manasa P S', '9496346097', 'Lr in CE', 'manasaps@mtithrissur.ac.in', 'placement@mtithrissur.ac.in'
);

-- Officer 40: NSS Pandalam
INSERT INTO users (email, password_hash, role) VALUES ('7907500569', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '7907500569'),
    (SELECT id FROM colleges WHERE college_name = 'NSS Pandalam'),
    'Ganesh J G', '7907500569', 'Lr in ME', 'nssptcplacement@gmail.com', 'nsspolytechniccollege@gmail.com'
);

-- Officer 41: RWPC Payyannur
INSERT INTO users (email, password_hash, role) VALUES ('9496836037', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9496836037'),
    (SELECT id FROM colleges WHERE college_name = 'RWPC Payyannur'),
    'SARATH S', '9496836037', 'Lr in EL', 'placements@grwpcpnr.ac.in', 'rwpcpnr@yahoo.co.in'
);

-- Officer 42: SNPC Kanhangad
INSERT INTO users (email, password_hash, role) VALUES ('8281502677', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '8281502677'),
    (SELECT id FROM colleges WHERE college_name = 'SNPC Kanhangad'),
    'Gokul', '8281502677', 'Placement Officer', NULL, NULL
);

-- Officer 43: SNPC KOTTIYAM
INSERT INTO users (email, password_hash, role) VALUES ('9497579941', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9497579941'),
    (SELECT id FROM colleges WHERE college_name = 'SNPC KOTTIYAM'),
    'Bharathan S S', '9497579941', 'Lr in ME', 'snpolyplacementcell@gmail.com', 'snpoly2006@yahoo.com'
);

-- Officer 44: SRGPC Thriprayar
INSERT INTO users (email, password_hash, role) VALUES ('9496366062', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9496366062'),
    (SELECT id FROM colleges WHERE college_name = 'SRGPC Thriprayar'),
    'Saloop T S', '9496366062', 'Lr in ME', 'placementsro@gmail.com', 'srpolyoffice@gmail.com'
);

-- Officer 45: SSM Tirur
INSERT INTO users (email, password_hash, role) VALUES ('9496364319', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9496364319'),
    (SELECT id FROM colleges WHERE college_name = 'SSM Tirur'),
    'Dr.FAHID K V', '9496364319', 'Prof English', 'fahid@ssmpoly.ac.in', 'ssmtirur@gmail.com'
);

-- Officer 46: TPC Alagappanagar
INSERT INTO users (email, password_hash, role) VALUES ('9496346413', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9496346413'),
    (SELECT id FROM colleges WHERE college_name = 'TPC Alagappanagar'),
    'Dr. Silan Tharakan S', '9496346413', 'Lr in ME', 'tpcplacementcell@gmail.com', 'tpcalagappanagar@gmail.com'
);

-- Officer 47: WPC Ernakulam
INSERT INTO users (email, password_hash, role) VALUES ('9495391695', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9495391695'),
    (SELECT id FROM colleges WHERE college_name = 'WPC Ernakulam'),
    'Aji. K', '9495391695', 'Lr in EL', 'ajiharikumar@gmail.com', 'sjwptc@gmail.com'
);

-- Officer 48: WPC Kaimanom
INSERT INTO users (email, password_hash, role) VALUES ('9846014331', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9846014331'),
    (SELECT id FROM colleges WHERE college_name = 'WPC Kaimanom'),
    'Deepthi P Divakaran', '9846014331', 'Lr in CM', 'deepthirajesh02@gmail.com', 'wptctvm@yahoo.co.in'
);

-- Officer 49: WPC Kayamkulam
INSERT INTO users (email, password_hash, role) VALUES ('8281276872', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '8281276872'),
    (SELECT id FROM colleges WHERE college_name = 'WPC Kayamkulam'),
    'VIJU SHANKAR', '8281276872', 'Lr in CM', 'vijushankar@gmail.com', 'wptckylm@gmail.com'
);

-- Officer 50: WPC Kottakkal
INSERT INTO users (email, password_hash, role) VALUES ('9946824184', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9946824184'),
    (SELECT id FROM colleges WHERE college_name = 'WPC Kottakkal'),
    'Hawazin S Khaleel', '9946824184', 'Lr in EL', 'hawazin.gptc@gmail.com', 'gwptckottakkal@gmail.com'
);

-- Officer 51: WPC Kozhikode
INSERT INTO users (email, password_hash, role) VALUES ('9947073507', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9947073507'),
    (SELECT id FROM colleges WHERE college_name = 'WPC Kozhikode'),
    'Bijin .E', '9947073507', 'Lr in EL', 'bijingptc@gmail.com', 'placementcellwpckozhikode@gmail.com'
);

-- Officer 52: WPC Thrissur
INSERT INTO users (email, password_hash, role) VALUES ('9008015773', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9008015773'),
    (SELECT id FROM colleges WHERE college_name = 'WPC Thrissur'),
    'Gowrimol D', '9008015773', 'Lr in CM', 'placement@gwpctsr.ac.in', 'principal@gwpctsr.ac.in'
);

-- Officer 53: MPC (IHRD) Vadakara
INSERT INTO users (email, password_hash, role) VALUES ('9778397278', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9778397278'),
    (SELECT id FROM colleges WHERE college_name = 'MPC (IHRD) Vadakara'),
    'SAJITHA.V', '9778397278', 'Lr in EL', 'Sajithu2012@gmail.com', 'Placement.mptcv@gmail.com'
);

-- Officer 54: MPC (IHRD) Mattakkara
INSERT INTO users (email, password_hash, role) VALUES ('7012279711', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '7012279711'),
    (SELECT id FROM colleges WHERE college_name = 'MPC (IHRD) Mattakkara'),
    'Anisha P', '7012279711', 'Lr in EL', 'placementmptcmattakkara@gmail.com', 'mptmattakkara.ihrd@gmail.com'
);

-- Officer 55: KMMPC Mala
INSERT INTO users (email, password_hash, role) VALUES ('7736706281', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '7736706281'),
    (SELECT id FROM colleges WHERE college_name = 'KMMPC Mala'),
    'RANTHIDEV C S', '7736706281', 'Lr in EL', 'placementkkmmmptc@gmail.com', 'mptmala.ihrd@gmail.com'
);

-- Officer 56: EKNMMPC Kalyasseri
INSERT INTO users (email, password_hash, role) VALUES ('9656474011', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9656474011'),
    (SELECT id FROM colleges WHERE college_name = 'EKNMMPC Kalyasseri'),
    'Navas C', '9656474011', 'Lr in EL', 'kareebnavas@gmail.com', 'ekpolyplacement2025@gmail.com'
);

-- Officer 57: MPC (IHRD) karunagappally
INSERT INTO users (email, password_hash, role) VALUES ('9961481828', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9961481828'),
    (SELECT id FROM colleges WHERE college_name = 'MPC (IHRD) karunagappally'),
    'Manoj G', '9961481828', 'Lr in EL', 'cgpumptc@gmail.com', 'mptkarunagappally.ihrd@gmail.com'
);

-- Officer 58: MPC (IHRD) Painavu, Idukki
INSERT INTO users (email, password_hash, role) VALUES ('9847137030', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9847137030'),
    (SELECT id FROM colleges WHERE college_name = 'MPC (IHRD) Painavu, Idukki'),
    'Romy Oommen Roy', '9847137030', 'Lr in CM', 'cgpcmptcpainavu@gmail.com', 'mptpainavu.ihrd@gmail.com'
);

-- Officer 59: CE (IHRD) Poojar, Kottayam
INSERT INTO users (email, password_hash, role) VALUES ('9400858312', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9400858312'),
    (SELECT id FROM colleges WHERE college_name = 'CE (IHRD) Poojar, Kottayam'),
    'FLOWER ABRAHAM MUNDACKAL', '9400858312', 'AP in EL', 'cgpucepoonjar@gmail.com', 'cepoonjar.ihrd@gmail.com'
);

-- Officer 60: MPC (IHRD) Kuzhalmannam
INSERT INTO users (email, password_hash, role) VALUES ('9605295570', '$2b$10$placeholder', 'placement_officer');
INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '9605295570'),
    (SELECT id FROM colleges WHERE college_name = 'MPC (IHRD) Kuzhalmannam'),
    'Sukanya S', '9605295570', 'Lr in CM', 'ssukanyaswaminathan@gmail.com', 'mrpc.academic1@gmail.com'
);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
SELECT 'Database seeded successfully!' AS message,
       (SELECT COUNT(*) FROM regions) AS regions_count,
       (SELECT COUNT(*) FROM colleges) AS colleges_count,
       (SELECT COUNT(*) FROM placement_officers) AS officers_count,
       (SELECT COUNT(*) FROM users WHERE role = 'super_admin') AS super_admin_count;
