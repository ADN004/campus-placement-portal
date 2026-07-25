import { query } from '../config/database.js';
import logActivity from '../middleware/activityLogger.js';
import { uploadImage, deleteImage } from '../config/cloudinary.js';
import { validateImageSize } from '../utils/photoValidation.js';

/**
 * "Send back for correction" — the post-approval alternative to rejection.
 *
 * A placement officer / super admin flags an approved student for correction
 * with a note. The student stays approved (login + job applications intact),
 * so they can fix their registration details and, if the staff member took
 * their photo down, upload a new one. When done they clear the flag — no
 * re-approval. See migration 011.
 */

// @desc    Flag an approved student for correction (optionally taking their
//          photo down immediately)
// @route   POST /api/placement-officer/students/:id/request-correction
//          POST /api/super-admin/students/:id/request-correction
// @access  Private (Placement Officer for own college / Super Admin)
// @body    { note, require_photo }
export const requestStudentCorrection = async (req, res) => {
  try {
    const studentId = req.params.id;
    const note = (req.body.note || '').trim();
    const requirePhoto = req.body.require_photo === true || req.body.require_photo === 'true';

    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Please describe what the student needs to correct.',
      });
    }

    const studentResult = await query(
      `SELECT s.id, s.college_id, s.student_name, s.registration_status,
              s.photo_cloudinary_id, u.email AS user_email
       FROM students s JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [studentId]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const student = studentResult.rows[0];

    // A placement officer may only correct students of their own college
    if (req.user.role === 'placement_officer') {
      const officer = await query(
        'SELECT college_id FROM placement_officers WHERE user_id = $1',
        [req.user.id]
      );
      if (officer.rows.length === 0 || officer.rows[0].college_id !== student.college_id) {
        return res.status(403).json({ success: false, message: 'You can only correct students of your own college.' });
      }
    }

    // Correction is a post-approval tool; a pending/rejected student is handled
    // with approve/reject instead.
    if (student.registration_status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Send-back-for-correction applies to approved students only (this one is ${student.registration_status}).`,
      });
    }

    // Take the photo down immediately when requested (e.g. inappropriate image)
    if (requirePhoto && student.photo_cloudinary_id) {
      try {
        await deleteImage(student.photo_cloudinary_id);
      } catch (e) {
        console.error('Correction: failed to delete photo from Cloudinary:', e.message);
        // proceed — we still clear the DB reference below so it stops showing
      }
    }

    const photoTakedown = requirePhoto
      ? `photo_url = NULL, photo_cloudinary_id = NULL,
         photo_deleted_at = CURRENT_TIMESTAMP, photo_deleted_by = $3,`
      : '';

    await query(
      `UPDATE students SET
         correction_requested = TRUE,
         correction_note = $1,
         correction_photo_required = $2,
         correction_requested_at = CURRENT_TIMESTAMP,
         correction_requested_by = $3,
         ${photoTakedown}
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [note, requirePhoto, req.user.id, studentId]
    );

    await logActivity(
      req.user.id,
      'REQUEST_STUDENT_CORRECTION',
      `Requested correction for ${student.student_name}${requirePhoto ? ' (photo taken down)' : ''} — ${note}`,
      'student',
      studentId,
      { require_photo: requirePhoto },
      req
    );

    // Tell the student (non-fatal — the in-app banner shows regardless)
    try {
      const { sendCorrectionRequestEmail } = await import('../config/emailService.js');
      await sendCorrectionRequestEmail(student.user_email, student.student_name, note, requirePhoto);
    } catch (e) {
      console.error('Correction email failed (non-fatal):', e.message);
    }

    res.status(200).json({
      success: true,
      message: `Correction requested. ${student.student_name} has been notified${requirePhoto ? ' and their photo was taken down' : ''}.`,
    });
  } catch (error) {
    console.error('Request student correction error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error requesting correction' });
  }
};

// @desc    Student uploads a new photo — only while a correction requires it
// @route   POST /api/students/photo
// @access  Private (Student)
// @body    { photo_base64 }
export const reuploadStudentPhoto = async (req, res) => {
  try {
    const { photo_base64 } = req.body;
    if (!photo_base64) {
      return res.status(400).json({ success: false, message: 'Please provide a photo.' });
    }

    const studentResult = await query(
      'SELECT id, prn, correction_photo_required FROM students WHERE user_id = $1',
      [req.user.id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    const student = studentResult.rows[0];

    // Photos are otherwise write-once — only a staff correction opens re-upload
    if (!student.correction_photo_required) {
      return res.status(400).json({
        success: false,
        message: 'A new photo can only be uploaded when your placement officer has asked you to.',
      });
    }

    const photoValidation = validateImageSize(photo_base64);
    if (!photoValidation.valid) {
      return res.status(400).json({ success: false, message: photoValidation.message });
    }

    let uploadResult;
    try {
      uploadResult = await uploadImage(photo_base64, `students/${student.prn}`, `photo_${Date.now()}`);
    } catch (uploadError) {
      console.error('Correction photo upload error:', uploadError);
      return res.status(400).json({ success: false, message: 'Failed to upload photo. Please try again.' });
    }

    await query(
      `UPDATE students SET
         photo_url = $1, photo_cloudinary_id = $2,
         photo_deleted_at = NULL, photo_deleted_by = NULL,
         correction_photo_required = FALSE,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [uploadResult.url, uploadResult.publicId, student.id]
    );

    res.status(200).json({
      success: true,
      message: 'Your new photo has been uploaded.',
      data: { photo_url: uploadResult.url },
    });
  } catch (error) {
    console.error('Reupload student photo error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error uploading photo' });
  }
};

// @desc    Student marks their correction as done
// @route   POST /api/students/correction/resolve
// @access  Private (Student)
export const resolveStudentCorrection = async (req, res) => {
  try {
    const studentResult = await query(
      'SELECT id, correction_requested, correction_photo_required FROM students WHERE user_id = $1',
      [req.user.id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    const student = studentResult.rows[0];

    if (!student.correction_requested) {
      return res.status(400).json({ success: false, message: 'You have no pending correction.' });
    }
    if (student.correction_photo_required) {
      return res.status(400).json({
        success: false,
        message: 'Please upload your new photo before marking this as done.',
      });
    }

    await query(
      `UPDATE students SET
         correction_requested = FALSE,
         correction_note = NULL,
         correction_requested_at = NULL,
         correction_requested_by = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [student.id]
    );

    await logActivity(req.user.id, 'RESOLVE_STUDENT_CORRECTION', 'Student marked their correction as done', 'student', student.id, {}, req);

    res.status(200).json({ success: true, message: 'Thanks — your corrections have been saved.' });
  } catch (error) {
    console.error('Resolve student correction error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error resolving correction' });
  }
};

// @desc    Current correction state for the logged-in student (drives the banner)
// @route   GET /api/students/correction-status
// @access  Private (Student)
export const getCorrectionStatus = async (req, res) => {
  try {
    const result = await query(
      `SELECT correction_requested, correction_note, correction_photo_required, correction_requested_at
       FROM students WHERE user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get correction status error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching correction status' });
  }
};
