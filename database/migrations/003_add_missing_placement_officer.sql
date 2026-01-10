-- Migration: Add missing placement officer for SNPC Kanhangad
-- Date: 2025-12-09
-- Description: Adds Gokul as placement officer for SNPC Kanhangad

-- Officer 42: SNPC Kanhangad
INSERT INTO users (email, password_hash, role) VALUES ('8281502677', '$2b$10$k9J/YZH7xW5xK5LqWfZ5wOh2vKZz8Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'placement_officer');

INSERT INTO placement_officers (user_id, college_id, officer_name, phone_number, designation, officer_email, college_email)
VALUES (
    (SELECT id FROM users WHERE email = '8281502677'),
    (SELECT id FROM colleges WHERE college_name = 'SNPC Kanhangad'),
    'Gokul', '8281502677', 'Placement Officer', NULL, NULL
);
