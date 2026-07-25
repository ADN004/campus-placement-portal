-- 011: "Send back for correction" for approved students.
--
-- Post-approval, a placement officer can no longer reject a student, so a wrong
-- or inappropriate photo / detail entered at registration had no correction
-- path (the photo is otherwise write-once). This lets a PO/SA flag an approved
-- student for correction: the student stays approved (keeps login and job
-- applications), sees the note, may re-upload their photo and edit their
-- registration details, and clears the flag when done — no re-approval.
--
--   correction_requested       – a correction is currently outstanding
--   correction_note            – what the staff member asked to be fixed
--   correction_photo_required  – the photo was taken down and must be re-uploaded
--   correction_requested_at/by – audit
--
-- Idempotent: safe to re-run.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS correction_requested BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correction_note TEXT,
  ADD COLUMN IF NOT EXISTS correction_photo_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correction_requested_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS correction_requested_by INTEGER REFERENCES users(id);
