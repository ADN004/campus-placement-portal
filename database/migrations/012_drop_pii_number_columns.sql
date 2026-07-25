-- 012: Remove the unused Aadhaar / PAN / passport NUMBER columns.
--
-- The application only records WHETHER a student holds each document (the
-- has_pan_card / has_aadhar_card / has_passport flags), never the number
-- itself. These number columns were never populated by any real flow — verified
-- as entirely NULL in every environment — and there is no UI to collect them.
-- Storing government ID numbers (Aadhaar in particular) is a privacy liability
-- we deliberately avoid, so the columns are removed rather than kept as dead,
-- schema-bloating vestige.
--
-- (This supersedes the short-lived 007_widen_pii_columns / encryption work,
-- which was reverted once it was confirmed the numbers are never stored.)
--
-- Idempotent — IF EXISTS. Also reflected in database/schema.sql.

ALTER TABLE student_extended_profiles DROP COLUMN IF EXISTS pan_number;
ALTER TABLE student_extended_profiles DROP COLUMN IF EXISTS aadhar_number;
ALTER TABLE student_extended_profiles DROP COLUMN IF EXISTS passport_number;
