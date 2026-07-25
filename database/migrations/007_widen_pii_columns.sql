-- 007: Widen the government-ID columns to hold ciphertext (C-3).
--
-- pan_number, aadhar_number and passport_number are being encrypted at rest
-- (AES-256-GCM, self-describing "enc:v1:..." format — see backend/utils/
-- piiCrypto.js). Ciphertext is much longer than the raw numbers, so the old
-- VARCHAR(10/12/20) limits no longer fit. Widen to TEXT.
--
-- Widening is backward-compatible: existing plaintext still fits, and code that
-- has not yet been updated keeps working. This migration only changes capacity;
-- it does NOT encrypt anything. The one-time backfill
-- (backend/scripts/encryptExistingPii.mjs) encrypts existing rows separately,
-- after the encrypting code is deployed and verified.
--
-- Idempotent — re-applying TYPE TEXT on a TEXT column is a no-op. Also present
-- in database/schema.sql.

ALTER TABLE student_extended_profiles ALTER COLUMN pan_number TYPE TEXT;
ALTER TABLE student_extended_profiles ALTER COLUMN aadhar_number TYPE TEXT;
ALTER TABLE student_extended_profiles ALTER COLUMN passport_number TYPE TEXT;
